import { useEffect, useMemo, useRef, useState } from 'react';
import { auth, comments, drafts, saved, posts } from '../lib/services/store/index.js';
import * as U from '../lib/core/text.js';
import * as account from '../lib/core/account.js';
import useStore from '../hooks/useStore.js';
import { usePageStyles, useBody, useTitle, useNoIndex } from '../hooks/usePage.js';
import { Link, navigate, useLocation } from '../router.jsx';
import Layout from '../components/Layout.jsx';
import { Icon } from '../components/Icon.jsx';
import { useToast } from '../components/Toasts.jsx';
import { joinDot } from '../components/bits.jsx';
import pages from '../styles/pages.css?inline';
import akun from '../styles/akun.css?inline';

const TABS = ['tulisan', 'draf', 'tersimpan', 'pengaturan'];
const href = (s) => '/tulisan/' + encodeURIComponent(s);

function Card({ title, to, meta, children }) {
  return (
    <li className="card">
      <div className="c-main">
        <Link className="c-t" to={to}>
          {title}
        </Link>
        <p className="mono c-m">{meta}</p>
      </div>
      <div className="c-ac">{children}</div>
    </li>
  );
}

/* aksi hapus dengan konfirmasi eksplisit (batal / hapus), bukan sekadar menunggu waktu */
function Remover({ id, label, asking, setAsking, onDelete, delRef }) {
  return asking === id ? (
    <>
      <span className="mono ask">hapus?</span>
      <button className="pill" type="button" onClick={() => setAsking('')}>
        batal
      </button>
      <button className="pill warn" type="button" ref={delRef} onClick={() => onDelete(id)}>
        ya, hapus
      </button>
    </>
  ) : (
    <button
      className="ic-btn"
      type="button"
      aria-label={'Hapus: ' + label}
      onClick={() => setAsking(id)}
    >
      <Icon name="trash" />
    </button>
  );
}

function Empty({ title, text, to, cta }) {
  return (
    <div className="empty-c">
      <h2>{title}</h2>
      <p>{text}</p>
      <Link className="pill solid" to={to}>
        {cta}
      </Link>
    </div>
  );
}

/** Halaman akun: tab (tulisan, draf, tersimpan, pengaturan), kartu, konfirmasi hapus. Wajib masuk. */
export default function Akun() {
  usePageStyles([pages, akun]);
  useBody('compact acct');
  useTitle('Akun saya — Spasi');
  useNoIndex();
  const ver = useStore(),
    toast = useToast();
  const me = auth.user();
  const { hash } = useLocation();
  const [asking, setAsking] = useState('');
  const mine = useMemo(() => posts.all().filter((p) => p.mine), [ver]); // eslint-disable-line react-hooks/exhaustive-deps
  const draftList = drafts.all(),
    savedList = saved
      .all()
      .map((slug) => posts.find(slug))
      .filter(Boolean);

  // tab aktif dari #hash; tanpa hash: tulisan, kecuali baru ada draf
  const fromHash = hash.slice(1);
  const tab =
    TABS.indexOf(fromHash) > -1 ? fromHash : mine.length || !draftList.length ? 'tulisan' : 'draf';
  const show = (name, focus) => {
    setAsking('');
    navigate('#' + name, { replace: true });
    if (focus)
      requestAnimationFrame(() => {
        const b = document.getElementById('t-' + name);
        if (b) b.focus();
      });
  };
  useEffect(() => {
    setAsking('');
  }, [tab]);
  useEffect(() => {
    const b = document.getElementById('t-' + tab);
    if (b && b.scrollIntoView) b.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  }, [tab]);

  const [name, setName] = useState(me ? me.name : '');
  const nmRef = useRef(null),
    delRef = useRef(null),
    focusedName = useRef(false);
  useEffect(() => {
    if (me && !focusedName.current) setName(me.name);
  }, [me && me.name]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (asking && delRef.current) delRef.current.focus();
  }, [asking]);
  useEffect(() => {
    if (!me) navigate('/masuk?next=/akun', { replace: true });
  }, [me]);
  if (!me) return null;

  const since = auth.since();
  const onTabKey = (e) => {
    // panah kiri/kanan, Home, End
    const i = TABS.indexOf(tab),
      n =
        e.key === 'ArrowRight'
          ? i + 1
          : e.key === 'ArrowLeft'
            ? i - 1
            : e.key === 'Home'
              ? 0
              : e.key === 'End'
                ? TABS.length - 1
                : null;
    if (n === null) return;
    e.preventDefault();
    show(TABS[(n + TABS.length) % TABS.length], true);
  };
  const saveName = (e) => {
    e.preventDefault();
    const n = account.normalizeName(name);
    if (!n) {
      toast('Nama tidak boleh kosong.', { err: true });
      nmRef.current.focus();
      return;
    }
    auth.rename(n);
    nmRef.current.blur();
    toast('Nama diperbarui.');
  };
  const del = (key) => {
    const kind = key.split(':')[0],
      id = key.slice(kind.length + 1);
    setAsking('');
    if (kind === 'acc') {
      auth.remove();
      navigate('/');
      return;
    }
    if (kind === 'post') {
      posts.remove(id);
      toast('Tulisan dihapus.');
    } else {
      drafts.remove(id);
      toast('Draf dihapus.');
    }
    const p = document.getElementById('p-' + tab);
    if (p) p.focus();
  };
  const rm = (id, label) => (
    <Remover
      id={id}
      label={label}
      asking={asking}
      setAsking={setAsking}
      onDelete={del}
      delRef={delRef}
    />
  );
  const counts = { tulisan: mine.length, draf: draftList.length, tersimpan: savedList.length };

  return (
    <Layout active="akun">
      <main id="main" className="col">
        <section className="a-top" aria-label="Ringkasan akun">
          <span className="av-l" id="a-av" aria-hidden="true">
            {me.name.charAt(0)}
          </span>
          <div className="a-id">
            <h1 id="a-h1">{me.name}</h1>
            <p className="mono" id="a-mail">
              {me.email}
            </p>
          </div>
          <div className="a-act">
            <Link className="pill solid" to="/tulis">
              <Icon name="plus" />
              tulis baru
            </Link>
            <button
              className="pill"
              id="logout"
              type="button"
              onClick={() => {
                auth.logout();
                navigate('/');
              }}
            >
              <Icon name="log-out" />
              keluar
            </button>
          </div>
        </section>

        <div
          className="tabs"
          role="tablist"
          aria-label="Bagian akun"
          id="tabs"
          onKeyDown={onTabKey}
        >
          {TABS.map((t) => (
            <button
              key={t}
              className="tab"
              role="tab"
              type="button"
              id={'t-' + t}
              aria-controls={'p-' + t}
              aria-selected={tab === t}
              tabIndex={tab === t ? 0 : -1}
              data-tab={t}
              onClick={() => show(t)}
            >
              {t}
              {counts[t] !== undefined && (
                <>
                  {' '}
                  <b id={'n-' + t}>{counts[t]}</b>
                </>
              )}
            </button>
          ))}
        </div>

        <section
          className="panel"
          role="tabpanel"
          id="p-tulisan"
          aria-labelledby="t-tulisan"
          tabIndex={0}
          hidden={tab !== 'tulisan'}
        >
          <ul className="cards" id="l-mine">
            {mine.map((p) => {
              const c = p.commentCount != null ? p.commentCount : comments.list(p.slug).length, // server: hitungan dari tulisan (tanpa memuat tiap tanggapan)
                key = 'post:' + p.slug;
              const meta = (
                <>
                  {joinDot([
                    p.tag && (
                      <span className="tg" key="t">
                        {p.tag}
                      </span>
                    ),
                    U.dayShort(p.ts),
                    p.minutes + ' menit',
                    c ? c + ' tanggapan' : null
                  ])}
                  {p.author === 'Anonim' && (
                    <>
                      {' '}
                      <span className="badge">anonim</span>
                    </>
                  )}
                </>
              );
              return (
                <Card key={p.slug} title={p.title} to={href(p.slug)} meta={meta}>
                  {asking !== key && (
                    <Link className="pill" to={'/tulis?edit=' + encodeURIComponent(p.slug)}>
                      edit
                    </Link>
                  )}
                  {rm(key, p.title)}
                </Card>
              );
            })}
          </ul>
          {!mine.length && (
            <Empty
              title="Belum ada tulisan."
              text="Tulisan yang kamu terbitkan akan muncul di sini, lengkap dengan jumlah tanggapannya."
              to="/tulis"
              cta="mulai menulis"
            />
          )}
        </section>

        <section
          className="panel"
          role="tabpanel"
          id="p-draf"
          aria-labelledby="t-draf"
          tabIndex={0}
          hidden={tab !== 'draf'}
        >
          <ul className="cards" id="l-dr">
            {draftList.map((d) => {
              const t = d.title || 'Tanpa judul',
                key = 'draft:' + d.id,
                to = '/tulis?id=' + encodeURIComponent(d.id);
              return (
                <Card
                  key={d.id}
                  title={t}
                  to={to}
                  meta={U.words(d.html || '') + ' kata · diubah ' + U.ago(d.updated)}
                >
                  {asking !== key && (
                    <Link className="pill solid" to={to}>
                      lanjutkan
                    </Link>
                  )}
                  {rm(key, t)}
                </Card>
              );
            })}
          </ul>
          {!draftList.length && (
            <Empty
              title="Tidak ada draf."
              text="Tulisan yang belum selesai tersimpan otomatis dan akan muncul di sini."
              to="/tulis"
              cta="tulis sesuatu"
            />
          )}
        </section>

        <section
          className="panel"
          role="tabpanel"
          id="p-tersimpan"
          aria-labelledby="t-tersimpan"
          tabIndex={0}
          hidden={tab !== 'tersimpan'}
        >
          <ul className="cards" id="l-sv">
            {savedList.map((p) => (
              <Card
                key={p.slug}
                title={p.title}
                to={href(p.slug)}
                meta={joinDot([
                  p.tag && (
                    <span className="tg" key="t">
                      {p.tag}
                    </span>
                  ),
                  p.author,
                  p.minutes + ' menit'
                ])}
              >
                <button
                  className="pill"
                  type="button"
                  onClick={() => {
                    saved.remove(p.slug);
                    toast('Dilepas dari simpanan.');
                  }}
                >
                  lepas
                </button>
              </Card>
            ))}
          </ul>
          {!savedList.length && (
            <Empty
              title="Belum ada yang disimpan."
              text="Tekan “simpan” pada tulisan yang ingin kamu baca lagi nanti."
              to="/baca"
              cta="jelajahi tulisan"
            />
          )}
        </section>

        <section
          className="panel"
          role="tabpanel"
          id="p-pengaturan"
          aria-labelledby="t-pengaturan"
          tabIndex={0}
          hidden={tab !== 'pengaturan'}
        >
          <div className="set">
            <h2>Nama tampilan</h2>
            <p>
              Dipakai pada sapaan dan tulisan baru. Tulisan lama tetap memakai nama saat terbit.
            </p>
            <form id="nm-form" noValidate onSubmit={saveName}>
              <label className="sr" htmlFor="nm">
                Nama tampilan
              </label>
              <input
                id="nm"
                ref={nmRef}
                maxLength={30}
                autoComplete="name"
                spellCheck="false"
                placeholder="Namamu"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={() => {
                  focusedName.current = true;
                }}
                onBlur={() => {
                  focusedName.current = false;
                  setName(auth.user().name);
                }}
              />
              <button
                className="pill solid"
                id="nm-save"
                type="submit"
                disabled={!account.canRename(name, me.name)}
              >
                simpan
              </button>
            </form>
          </div>
          <div className="set">
            <h2>Email</h2>
            <p id="set-mail">{me.email}</p>
            <p className="mono" id="set-since">
              {since
                ? 'bergabung ' +
                  new Date(since).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
                : ''}
            </p>
          </div>
          <div className="set danger">
            <h2>Hapus akun</h2>
            <p>
              Akunmu, semua tulisan yang kamu terbitkan, dan tanggapanmu akan dihapus dari perangkat
              ini. Tindakan ini tidak bisa dibatalkan.
            </p>
            <div className="c-ac" id="acc-act">
              {asking === 'acc' ? (
                <>
                  <span className="mono ask">yakin?</span>
                  <button className="pill" type="button" onClick={() => setAsking('')}>
                    batal
                  </button>
                  <button
                    className="pill warn"
                    type="button"
                    ref={delRef}
                    onClick={() => del('acc')}
                  >
                    ya, hapus akun
                  </button>
                </>
              ) : (
                <button className="pill warn" type="button" onClick={() => setAsking('acc')}>
                  hapus akun…
                </button>
              )}
            </div>
          </div>
        </section>
        <div style={{ height: 'var(--s5)' }} />
      </main>
    </Layout>
  );
}
