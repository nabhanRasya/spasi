import { useEffect, useRef, useState } from 'react';
import * as ai from '../../lib/services/ai.js';
import * as images from '../../lib/services/images.js';
import { Icon } from '../Icon.jsx';
import Modal from '../Modal.jsx';

function Pick({ items, value, onPick, label, id }) {
  return (
    <div className="pick" id={id} role="radiogroup" aria-label={label}>
      {items.map(([v, text]) => (
        <button
          key={v}
          className="chip"
          type="button"
          role="radio"
          aria-checked={v === value}
          aria-pressed={v === value}
          onClick={() => onPick(v)}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

/** Gambar: unggah atau buat dengan AI. `editor` = API mesin editor (sisip gambar ke tulisan). */
export default function ImageDialog({ open, tab, setTab, editor, onClose }) {
  const [status, setStatus] = useState({ text: '', err: false });
  const say = (text, err) => setStatus({ text: text || '', err: !!err });
  const [over, setOver] = useState(false);

  // AI
  const [prompt, setPrompt] = useState(''),
    [style, setStyle] = useState('ilustrasi'),
    [ratio, setRatio] = useState('4x3');
  const [res, setRes] = useState(null),
    [working, setWorking] = useState(false),
    [shown, setShown] = useState(false);
  const ctl = useRef(null),
    useBtn = useRef(null),
    aiText = useRef(null);

  const aiReset = () => {
    if (ctl.current) {
      ctl.current.abort();
      ctl.current = null;
    }
    setRes(null);
    setShown(false);
    setWorking(false);
  };
  const close = () => {
    aiReset();
    say('');
    onClose();
    if (editor) editor.focus({ preventScroll: true });
  };
  useEffect(() => {
    if (open) say('');
  }, [open, tab]);
  useEffect(
    () => () => {
      if (ctl.current) ctl.current.abort();
    },
    []
  );

  const fromDialog = (files) =>
    editor.addFiles(files, editor.anchorBlock(), say).then((n) => {
      if (n) close();
    });

  const generate = () => {
    const p = prompt.replace(/\s+/g, ' ').trim();
    if (p.length < 3) {
      say('Tulis dulu deskripsi gambarnya (minimal 3 huruf).', true);
      aiText.current.focus();
      return;
    }
    if (ctl.current) ctl.current.abort();
    const c = (ctl.current = new AbortController());
    setRes(null);
    setWorking(true);
    setShown(true);
    say('');
    ai.generate({ prompt: p, style, ratio, signal: c.signal })
      .then((b) => images.fromBlob(b))
      .then((d) => {
        if (c !== ctl.current) return;
        setRes(d);
        setWorking(false);
        say('Belum cocok? Tekan “buat ulang” untuk versi lain.');
        setTimeout(() => {
          if (useBtn.current) useBtn.current.scrollIntoView({ block: 'nearest' });
        }, 0);
      })
      .catch((e) => {
        if (c !== ctl.current || (e && e.name === 'AbortError')) return;
        setShown(false);
        setWorking(false);
        say(e && e.message ? e.message : 'Gagal membuat gambar.', true);
      });
  };
  const useResult = () => {
    if (!res) return;
    if (editor.figCount() >= images.MAX_PER_POST) {
      say('Maksimal ' + images.MAX_PER_POST + ' gambar per tulisan.', true);
      return;
    }
    editor.insertFigure(
      {
        src: res.src,
        w: res.w,
        h: res.h,
        alt: prompt.replace(/\s+/g, ' ').trim().slice(0, 300),
        ai: true,
        cap: 'Dibuat dengan AI'
      },
      editor.anchorBlock()
    );
    editor.notifyChanged();
    close();
  };

  const onTabKey = (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const t = tab === 'up' ? 'ai' : 'up';
    setTab(t);
    requestAnimationFrame(() => document.getElementById('tab-' + t).focus());
  };

  return (
    <Modal open={open} onClose={close} className="modal imgd" labelledBy="di-h" id="dlg-img">
      <div className="dlg-in">
        <div className="dlg-h">
          <h2 id="di-h">Tambah gambar</h2>
          <button className="x" type="button" onClick={close}>
            tutup
          </button>
        </div>
        <div className="tabs" role="tablist" aria-label="Sumber gambar" onKeyDown={onTabKey}>
          <button
            type="button"
            role="tab"
            id="tab-up"
            aria-selected={tab === 'up'}
            aria-controls="pn-up"
            tabIndex={tab === 'up' ? 0 : -1}
            onClick={() => setTab('up')}
          >
            unggah
          </button>
          <button
            type="button"
            role="tab"
            id="tab-ai"
            aria-selected={tab === 'ai'}
            aria-controls="pn-ai"
            tabIndex={tab === 'ai' ? 0 : -1}
            onClick={() => {
              setTab('ai');
              requestAnimationFrame(() => aiText.current && aiText.current.focus());
            }}
          >
            buat dengan AI
          </button>
        </div>

        <div role="tabpanel" id="pn-up" aria-labelledby="tab-up" hidden={tab !== 'up'}>
          <label
            className={'drop' + (over ? ' over' : '')}
            id="drop"
            htmlFor="file-in"
            onDragEnter={(e) => {
              e.preventDefault();
              setOver(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setOver(false);
              if (e.dataTransfer.files.length)
                fromDialog(Array.prototype.slice.call(e.dataTransfer.files));
            }}
          >
            <Icon name="image" />
            <b>Pilih gambar</b>
            <span className="mono">atau seret ke sini · bisa beberapa sekaligus</span>
            <span className="mono">JPG, PNG, WebP, GIF · maks 15 MB · diperkecil otomatis</span>
            <input
              type="file"
              id="file-in"
              accept="image/png,image/jpeg,image/webp,image/gif"
              multiple
              onChange={(e) => {
                const fl = Array.prototype.slice.call(e.target.files);
                e.target.value = '';
                if (fl.length) fromDialog(fl);
              }}
            />
          </label>
          <p className="mono">
            Gambar juga bisa ditempel (Ctrl/⌘ V) atau diseret langsung ke tulisan.
          </p>
        </div>

        <div role="tabpanel" id="pn-ai" aria-labelledby="tab-ai" hidden={tab !== 'ai'}>
          <div className="field">
            <label className="mono" htmlFor="ai-p">
              deskripsikan gambarnya
            </label>
            <textarea
              className="inp"
              id="ai-p"
              ref={aiText}
              rows={3}
              maxLength={400}
              placeholder="mis. jendela kamar saat hujan malam hari, lampu kota yang buram"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault();
                  generate();
                }
              }}
            />
            <span className="mono cnt-r" id="ai-n">
              {prompt.length}/400
            </span>
          </div>
          <div className="field">
            <p className="mono">gaya</p>
            <Pick
              id="ai-style"
              label="Gaya gambar"
              items={ai.STYLES.map((s) => [s[0], s[1]])}
              value={style}
              onPick={setStyle}
            />
          </div>
          <div className="field">
            <p className="mono">rasio</p>
            <Pick
              id="ai-ratio"
              label="Rasio gambar"
              items={ai.RATIOS.map((r) => [r[0], r[1]])}
              value={ratio}
              onPick={setRatio}
            />
          </div>
          <div className={'ai-out' + (working ? ' load' : '')} id="ai-out" hidden={!shown}>
            <img id="ai-img" alt="Hasil gambar AI" src={res ? res.src : undefined} />
            <p className="mono" id="ai-wait">
              sedang membuat gambar… biasanya 10–40 detik
            </p>
          </div>
          <p className="mono" id="ai-priv">
            Gambar dibuat lewat Puter (pihak ketiga); kamu mungkin diminta masuk ke akun Puter.
            Deskripsimu dikirim ke sana, jadi jangan menulis data pribadi.
          </p>
          <div className="dlg-f">
            <button
              className="btn solid"
              type="button"
              id="ai-go"
              disabled={working}
              onClick={generate}
            >
              {working ? 'membuat…' : res ? 'buat ulang' : 'buat gambar'}
            </button>
            <button
              className="btn"
              type="button"
              id="ai-use"
              ref={useBtn}
              hidden={!res}
              onClick={useResult}
            >
              pakai gambar ini
            </button>
          </div>
        </div>
        <p
          className={'mono img-st' + (status.err ? ' err' : '')}
          id="img-st"
          role="status"
          aria-live="polite"
        >
          {status.text}
        </p>
      </div>
    </Modal>
  );
}
