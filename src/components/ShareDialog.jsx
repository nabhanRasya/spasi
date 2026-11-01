import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { prefs } from '../lib/services/store/index.js';
import * as M from '../lib/core/share-model.js';
import { Icon } from './Icon.jsx';
import { useToast } from './Toasts.jsx';
import {
  blocksFrom,
  canFiles,
  cardHtml,
  cardTheme,
  copyBlob,
  fitScale,
  fitText,
  fonts,
  fontsLoaded,
  makePng,
  MOBILE,
  paintSky,
  saveBlob,
  skyColor
} from './share/stage.js';

const FM = M.FORMATS,
  DEST = M.DESTINATIONS;

function Seg({ id, items, value, onPick }) {
  return (
    <div className="seg" id={id} role="group">
      {items.map(([v, label]) => (
        <button
          key={v}
          type="button"
          data-v={v}
          aria-pressed={v === value}
          onClick={() => onPick(v)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/** Bagikan visual: kartu bergaya halaman baca (judul kiri, tulisan kanan) → PNG. Dibuka dengan dipasang (mount), ditutup dengan dilepas. */
export default function ShareDialog({ post, proseRef, onClose }) {
  const toast = useToast();
  const dlg = useRef(null),
    stage = useRef(null),
    box = useRef(null),
    menuRef = useRef(null),
    shareBtn = useRef(null);
  const [st, setSt] = useState(() => M.normalize(prefs.share.get())); // pengaturan terakhir, sudah divalidasi
  const [status, setStatus] = useState(''),
    [busy, setBusy] = useState(false),
    [menu, setMenu] = useState(false),
    [clipped, setClipped] = useState(false);
  const [native] = useState(canFiles);

  const shown = (k) => st.hide.indexOf(k) < 0;
  const update = (fn) =>
    setSt((cur) => {
      const next = fn(cur);
      prefs.share.set(next);
      return next;
    });
  const blocks = useMemo(() => blocksFrom(proseRef.current), [post, proseRef]);
  const pl = M.plan(blocks, st, shown('img'));
  const { html, left } = useMemo(
    () => cardHtml(post, st, pl),
    [post, st.hide, st.fmt, st.imgm, st.blocks, blocks]
  ); // eslint-disable-line react-hooks/exhaustive-deps
  const htmlProp = useMemo(() => ({ __html: html }), [html]); // objek stabil agar langit malam tak terhapus saat render ulang
  const f = FM[st.fmt],
    total = pl.total,
    count = pl.count;

  /* buka sebagai dialog modal; fonts() mulai memuat lebih awal agar ekspor cepat */
  useLayoutEffect(() => {
    // sebelum pengukuran di bawah: dialog yang tertutup tidak punya ukuran
    const d = dlg.current;
    d.showModal();
    fonts();
    const first = d.querySelector('.chip-t');
    if (first) first.focus();
    return () => {
      if (d.open) d.close();
    };
  }, []);

  /* ukur ulang: ukuran isi → langit malam → skala pratinjau */
  const relayout = useCallback(() => {
    if (!stage.current || !box.current) return;
    setClipped(fitText(stage.current, st));
    paintSky(stage.current, st, post);
    fitScale(box.current, stage.current, st);
  }, [
    st.fmt,
    st.fit,
    st.sky.on,
    st.sky.dens,
    st.sky.moon,
    st.sky.shoot,
    st.sky.seed,
    st.sky.a,
    st.sky.color,
    post
  ]); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    relayout();
    const imgs = Array.prototype.slice
      .call(stage.current.querySelectorAll('img'))
      .filter((im) => !im.complete);
    imgs.forEach((im) => im.addEventListener('load', relayout));
    return () => imgs.forEach((im) => im.removeEventListener('load', relayout));
  }, [html, st.fmt, st.fit, st.sky.on, st.sky.dens, st.sky.moon, st.sky.shoot, st.sky.seed]); // eslint-disable-line react-hooks/exhaustive-deps
  const latest = useRef(relayout);
  latest.current = relayout;
  useEffect(() => {
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => latest.current());
  }, []);
  useEffect(() => {
    const h = () => fitScale(box.current, stage.current, st);
    addEventListener('resize', h);
    return () => removeEventListener('resize', h);
  }, [st.fmt]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    // kekuatan & warna langit: cukup ubah gaya, tanpa menggambar ulang
    const p = stage.current && stage.current.querySelector('.sv-sky');
    if (p) {
      p.style.opacity = st.sky.a / 100;
      p.style.color = skyColor(st);
    }
  }, [st.sky.a, st.sky.color]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (menu && menuRef.current) {
      const b = menuRef.current.querySelector('button');
      if (b) b.focus();
    }
  }, [menu]);

  /* ---------- aksi ---------- */
  const fname = () => M.fileName(post.slug),
    pageUrl = () => location.href.split('#')[0];
  const make = () => makePng(stage.current, st);
  const run = (fn, msg) => {
    if (busy) return Promise.resolve();
    setBusy(true);
    setStatus('Menyiapkan gambar…');
    return Promise.resolve()
      .then(fn)
      .then(
        (m) =>
          setStatus(
            typeof m === 'string'
              ? m
              : fontsLoaded()
                ? msg || ''
                : 'Font tidak bisa dimuat (offline?), gambar memakai font cadangan.'
          ),
        (e) => {
          if (e && e.name === 'AbortError') return setStatus('');
          setStatus('Gagal membuat gambar di peramban ini. Coba Chrome atau Firefox.');
        }
      )
      .then(() => setBusy(false));
  };
  const download = () =>
    make().then((b) => {
      saveBlob(b, fname());
    });
  const copy = () => {
    if (!(window.ClipboardItem && navigator.clipboard))
      return 'Peramban ini tidak bisa menyalin gambar.';
    const png = make(); // gambar + tautan halaman dalam satu salinan; jika peramban menolak dua jenis sekaligus, salin gambarnya saja
    return navigator.clipboard
      .write([
        new ClipboardItem({
          'image/png': png,
          'text/plain': new Blob([pageUrl()], { type: 'text/plain' })
        })
      ])
      .then(
        () => {
          toast('Gambar dan tautan disalin.');
        },
        () =>
          navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]).then(() => {
            toast('Gambar disalin.');
          })
      );
  };
  const toDest = (key) => {
    if (busy) return;
    const d = DEST[key],
      text = post.title + ' — ' + post.author;
    let win = null;
    if (key === 'stories' && st.fmt !== '9x16') update((c) => ({ ...c, fmt: '9x16' })); // Stories selalu 9:16
    if (!native && d.url) win = window.open('', '_blank'); // harus sinkron di dalam klik
    return run(() =>
      make().then((b) => {
        if (native)
          return navigator.share({
            files: [new File([b], fname(), { type: 'image/png' })],
            title: post.title,
            text: text + ' — di Spasi',
            url: pageUrl()
          });
        if (key === 'stories') {
          saveBlob(b, fname());
          if (MOBILE)
            setTimeout(() => {
              location.href = 'instagram://story-camera';
            }, 700);
          return 'Gambar diunduh. Buka Instagram → Stories → pilih gambar ini dari galeri.';
        }
        if (key === 'system') {
          saveBlob(b, fname());
          return 'Perangkat ini belum mendukung berbagi langsung, gambar diunduh.';
        }
        return copyBlob(b).then((ok) => {
          if (!ok) saveBlob(b, fname());
          if (win) win.location.href = d.url(text, pageUrl());
          else setStatus('Pop-up diblokir. Izinkan pop-up lalu coba lagi.');
          return ok
            ? 'Gambar disalin. Tempel (Ctrl/⌘+V) di jendela ' + d.label + ' yang terbuka.'
            : 'Gambar diunduh. Lampirkan di jendela ' + d.label + '.';
        });
      })
    );
  };

  const onClick = (e) => {
    if (e.target === dlg.current) return dlg.current.close(); // klik latar
    if (!e.target.closest('#shd-menu') && !e.target.closest('#shd-share')) setMenu(false);
  };
  const onKeyDown = (e) => {
    if (!menu) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setMenu(false);
      shareBtn.current.focus();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const it = Array.prototype.slice.call(menuRef.current.querySelectorAll('button')),
        i = it.indexOf(document.activeElement);
      it[(i + (e.key === 'ArrowDown' ? 1 : -1) + it.length) % it.length].focus();
    }
  };
  const toggleEl = (k) => update((c) => ({ ...c, hide: M.toggleElement(c.hide, k) })); // minimal satu elemen tetap tampil
  const sky = (patch) => update((c) => ({ ...c, sky: { ...c.sky, ...patch } }));

  const k = st.sky;
  const presetOn = (c) => c.toLowerCase() === k.color.toLowerCase();
  const customColor = !M.SKY_COLORS.some((c) => presetOn(c[0]));

  return (
    <dialog
      className={'shd' + (busy ? ' busy' : '')}
      ref={dlg}
      aria-labelledby="shd-h"
      onClick={onClick}
      onKeyDown={onKeyDown}
      onClose={() => {
        setMenu(false);
        onClose();
      }}
    >
      <div className="shd-in">
        <div className="shd-prev">
          <div className="shd-box" id="shd-box" ref={box}>
            <div
              ref={stage}
              id="sv"
              className={
                'sv' +
                (left ? '' : ' noleft') +
                (shown('body') ? '' : ' nobody') +
                (shown('logo') ? '' : ' nologo')
              }
              data-sv-theme={cardTheme(st)}
              style={{ width: f.w, height: f.h }}
              dangerouslySetInnerHTML={htmlProp}
              onClick={(e) => {
                const el = e.target.closest('[data-el]');
                if (el) toggleEl(el.dataset.el);
              }}
            />
          </div>
        </div>
        <div className="shd-ctl">
          <div className="shd-head">
            <h2 id="shd-h">Bagikan sebagai gambar</h2>
            <button
              className="tgl"
              type="button"
              aria-label="Tutup"
              onClick={() => dlg.current.close()}
            >
              <Icon name="x" />
            </button>
          </div>
          <p className="shd-p">
            Tampilannya sama dengan halaman baca. Sentuh elemen di pratinjau, atau pakai tombol di
            bawah, untuk menyembunyikannya.
          </p>

          <div className="shd-g">
            <p className="mono">elemen</p>
            <div className="shd-chips" id="shd-chips">
              {M.ELEMENTS.map(([key, label]) => (
                <button
                  key={key}
                  className="chip-t"
                  type="button"
                  data-el={key}
                  aria-pressed={shown(key)}
                  hidden={key === 'img' && !pl.hasImg}
                  onClick={() => toggleEl(key)}
                >
                  <Icon name={shown(key) ? 'eye' : 'eye-off'} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="shd-g" id="shd-len" hidden={!shown('body')}>
            <p className="mono">panjang isi (paragraf)</p>
            <div className="step">
              <button
                type="button"
                data-step="-1"
                aria-label="Kurangi paragraf"
                disabled={count <= 1}
                onClick={() => update((c) => ({ ...c, blocks: M.stepBlocks(c.blocks, -1, total) }))}
              >
                <Icon name="minus" />
              </button>
              <output id="shd-n">
                {count} / {total}
              </output>
              <button
                type="button"
                data-step="1"
                aria-label="Tambah paragraf"
                disabled={count >= total}
                onClick={() => update((c) => ({ ...c, blocks: M.stepBlocks(c.blocks, 1, total) }))}
              >
                <Icon name="plus" />
              </button>
            </div>
            <p className="mono" style={{ margin: '12px 0 8px' }}>
              ukuran huruf isi
            </p>
            <Seg
              id="shd-fit"
              items={[
                ['fixed', 'default'],
                ['auto', 'otomatis mengecil']
              ]}
              value={st.fit}
              onPick={(v) => update((c) => ({ ...c, fit: v }))}
            />
            <p className="mono shd-note" id="shd-clip" hidden={!clipped}>
              {st.fit === 'auto'
                ? 'Isi terlalu panjang meski sudah dikecilkan. Kurangi panjang isi.'
                : 'Isi melebihi halaman dan dipotong. Pilih “otomatis mengecil” atau kurangi panjang isi.'}
            </p>
          </div>

          <div className="shd-g">
            <p className="mono">format</p>
            <Seg
              id="shd-fmt"
              items={[
                ['1x1', '1:1'],
                ['4x5', '4:5'],
                ['9x16', '9:16'],
                ['16x9', '16:9']
              ]}
              value={st.fmt}
              onPick={(v) => update((c) => ({ ...c, fmt: v }))}
            />
          </div>
          <div className="shd-g" id="shd-img" hidden={!pl.hasImg || !shown('body')}>
            <p className="mono">penempatan gambar</p>
            <Seg
              id="shd-imgm"
              items={[
                ['first', 'sampul di atas isi'],
                ['inline', 'sesuai urutan']
              ]}
              value={st.imgm}
              onPick={(v) => update((c) => ({ ...c, imgm: v }))}
            />
          </div>
          <div className="shd-g">
            <p className="mono">tema</p>
            <Seg
              id="shd-theme"
              items={[
                ['auto', 'ikut halaman'],
                ['dark', 'gelap'],
                ['light', 'terang']
              ]}
              value={st.theme}
              onPick={(v) => update((c) => ({ ...c, theme: v }))}
            />
          </div>

          <div className="shd-g" id="shd-sky">
            <p className="mono">langit malam ascii</p>
            <div className="shd-chips">
              <button
                className="chip-t"
                type="button"
                id="sky-on"
                aria-pressed={k.on}
                onClick={() => sky({ on: !k.on })}
              >
                <Icon name={k.on ? 'eye' : 'eye-off'} />
                tampilkan
              </button>
            </div>
            <div id="sky-opts" hidden={!k.on}>
              <p className="mono sk-l">warna</p>
              <div className="swatches" id="sky-col" role="group" aria-label="Warna langit">
                {M.SKY_COLORS.map(([c, label]) => (
                  <button
                    key={c}
                    type="button"
                    className={'sw' + (c === 'auto' ? ' auto' : '')}
                    data-c={c}
                    aria-label={label}
                    title={label}
                    aria-pressed={presetOn(c)}
                    style={c === 'auto' ? undefined : { '--c': c }}
                    onClick={() => sky({ color: c })}
                  />
                ))}
                <label className="sw sw-c" id="sky-cw" title="warna sendiri" data-on={customColor}>
                  <input
                    type="color"
                    id="sky-c"
                    value={/^#/.test(k.color) ? k.color.toLowerCase() : '#8db7ff'}
                    aria-label="Warna sendiri"
                    onChange={(e) => sky({ color: e.target.value })}
                  />
                </label>
              </div>
              <div className="rng">
                <label className="mono" htmlFor="sky-a">
                  kekuatan
                </label>
                <output className="mono" id="sky-a-o">
                  {k.a}%
                </output>
                <input
                  type="range"
                  id="sky-a"
                  min="10"
                  max="90"
                  step="5"
                  value={k.a}
                  onChange={(e) => sky({ a: +e.target.value })}
                />
              </div>
              <div className="rng">
                <label className="mono" htmlFor="sky-d">
                  jumlah bintang
                </label>
                <output className="mono" id="sky-d-o">
                  {k.dens}/5
                </output>
                <input
                  type="range"
                  id="sky-d"
                  min="1"
                  max="5"
                  step="1"
                  value={k.dens}
                  onChange={(e) => sky({ dens: +e.target.value })}
                />
              </div>
              <p className="mono sk-l">bulan</p>
              <Seg
                id="sky-moon"
                items={[
                  ['sabit', 'sabit'],
                  ['purnama', 'purnama'],
                  ['none', 'tanpa']
                ]}
                value={k.moon}
                onPick={(v) => sky({ moon: v })}
              />
              <div className="shd-chips" style={{ marginTop: 10 }}>
                <button
                  className="chip-t"
                  type="button"
                  id="sky-shoot"
                  aria-pressed={k.shoot}
                  onClick={() => sky({ shoot: !k.shoot })}
                >
                  bintang jatuh
                </button>
                <button
                  className="chip-t"
                  type="button"
                  id="sky-seed"
                  onClick={() => sky({ seed: (k.seed + 1) % 1000 })}
                >
                  <Icon name="refresh" />
                  acak ulang
                </button>
              </div>
              <p className="mono shd-note">
                Langit otomatis menjauhi tulisan, jadi teks tetap terbaca.
              </p>
            </div>
          </div>

          <div className="shd-act">
            <div
              className="shd-menu"
              id="shd-menu"
              ref={menuRef}
              role="menu"
              aria-label="Bagikan ke"
              hidden={!menu}
            >
              {M.menuKeys(native).map((key) => (
                <Fragment key={key}>
                  {key === 'system' && <hr />}
                  <button
                    type="button"
                    role="menuitem"
                    data-dest={key}
                    onClick={() => {
                      setMenu(false);
                      toDest(key);
                    }}
                  >
                    <Icon name={DEST[key].icon} />
                    <span>
                      {DEST[key].label}
                      <small>{M.menuNote(key, native)}</small>
                    </span>
                  </button>
                </Fragment>
              ))}
            </div>
            <button
              className="pill solid"
              type="button"
              id="shd-share"
              ref={shareBtn}
              aria-haspopup="menu"
              aria-expanded={menu}
              onClick={() => setMenu((v) => !v)}
            >
              <Icon name="share" />
              bagikan
              <Icon name="chevron-down" className="chev" />
            </button>
            <button
              className="pill"
              type="button"
              id="shd-dl"
              onClick={() => run(download, 'Gambar diunduh.')}
            >
              <Icon name="download" />
              unduh png
            </button>
            <button className="pill" type="button" id="shd-cp" onClick={() => run(copy)}>
              <Icon name="copy" />
              salin
            </button>
          </div>
          <p className="mono shd-st" id="shd-st" role="status" aria-live="polite">
            {status}
          </p>
        </div>
      </div>
    </dialog>
  );
}
