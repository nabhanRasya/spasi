import * as U from '../../lib/core/text.js';
import * as C from '../../lib/core/composer.js';
import * as tags from '../../lib/core/tags.js';
import { Link } from '../../router.jsx';
import { Icon } from '../Icon.jsx';
import Modal from '../Modal.jsx';
import { toggleTheme } from '../../hooks/useTheme.js';

/* ---------- draf ---------- */
export function DraftsDialog({ open, onClose, drafts, currentId, onOpen, onDelete, onNew }) {
  return (
    <Modal open={open} onClose={onClose} className="sheet" labelledBy="dd-h" id="dlg-drafts">
      <div className="dlg-in">
        <div className="dlg-h">
          <h2 id="dd-h">Draf</h2>
          <button className="x" type="button" onClick={onClose}>
            tutup
          </button>
        </div>
        <div>
          <button className="btn solid" type="button" id="draft-new" onClick={onNew}>
            + draf baru
          </button>
        </div>
        <ul className="dr" id="dr-list">
          {drafts.map((d) => {
            const cur = d.id === currentId;
            return (
              <li key={d.id} aria-current={cur ? 'true' : undefined}>
                <button className="open" type="button" onClick={() => onOpen(d.id)}>
                  <b>{d.title || 'Tanpa judul'}</b>
                  <span className="mono">
                    {U.words(d.html)} kata · {U.ago(d.updated)}
                    {d.sourceSlug ? ' · mengedit tulisan terbit' : ''}
                    {cur ? ' · sedang dibuka' : ''}
                  </span>
                </button>
                {cur ? (
                  <span />
                ) : (
                  <button
                    className="tgl"
                    type="button"
                    aria-label={'Hapus draf ' + (d.title || 'tanpa judul')}
                    onClick={() => onDelete(d.id)}
                  >
                    hapus
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        <p className="mono" id="dr-empty" hidden={drafts.length > 0}>
          Belum ada draf tersimpan. Mulailah menulis, nanti muncul di sini.
        </p>
        <p className="mono" style={{ marginTop: 'auto' }}>
          draf tersimpan otomatis di perangkat ini.
        </p>
        <button
          className="tgl"
          type="button"
          id="btn-theme2"
          style={{ alignSelf: 'flex-start' }}
          onClick={toggleTheme}
        >
          ganti tema
        </button>
      </div>
    </Modal>
  );
}

/* ---------- wajib masuk untuk menerbitkan ---------- */
export function GateDialog({ open, onClose, info }) {
  const next = encodeURIComponent(info.next || '/tulis');
  return (
    <Modal open={open} onClose={onClose} className="modal gate" labelledBy="dg-h" id="dlg-gate">
      <div className="gate-in">
        <div className="gate-t">
          <div className="dlg-h">
            <span className="mono">terbitkan</span>
            <button className="x" type="button" onClick={onClose}>
              tutup
            </button>
          </div>
          <h2 id="dg-h">Masuk dulu untuk menerbitkan.</h2>
          <p className="gate-p">
            Tulisanmu aman, sudah tersimpan sebagai draf. Setelah masuk kamu kembali ke sini dan
            tinggal menerbitkannya.
          </p>
          <div className="gate-b">
            <Link className="btn solid" id="gate-login" to={'/masuk?next=' + next}>
              masuk <Icon name="arrow-right" />
            </Link>
            <Link className="btn" id="gate-signup" to={'/daftar?next=' + next}>
              buat akun
            </Link>
          </div>
        </div>
        <figure className="wfp" aria-label="Pratinjau wireframe halaman baca">
          <div className="wfp-page" aria-hidden="true">
            <div className="wfp-prog" />
            <div className="wfp-top">
              <i className="b w3" />
              <span className="sp" />
              <i className="b w2" />
              <i className="b w2" />
            </div>
            <p className="mono wfp-meta" id="g-meta">
              {info.meta || 'topik · tanggal'}
            </p>
            <h3 className="wfp-title" id="g-title">
              {info.title || 'Judul tulisanmu'}
            </h3>
            <i className="b w10" />
            <i className="b w8" />
            <div className="wfp-by">
              <i className="av" />
              <div>
                <i className="b w4" />
                <i className="b w3 sm" />
              </div>
            </div>
            <i className="b w10" />
            <i className="b w10" />
            <i className="b w9" />
            <i className="b w10" />
            <i className="b w6" />
            <div className="wfp-q" />
            <i className="b w10" />
            <i className="b w9" />
            <i className="b w10" />
            <i className="b w7" />
            <div className="wfp-lock">
              <Icon name="lock" />
              <span className="mono">terbit setelah masuk</span>
            </div>
          </div>
          <figcaption className="mono">pratinjau halaman baca</figcaption>
        </figure>
      </div>
    </Modal>
  );
}

/* ---------- pintasan ---------- */
export function KeysDialog({ open, onClose }) {
  const rows = [
    ['tambah blok', <span className="kbd">/</span>],
    [
      'judul bagian',
      <>
        <span className="kbd">##</span> lalu spasi
      </>
    ],
    [
      'kutipan',
      <>
        <span className="kbd">&gt;</span> lalu spasi
      </>
    ],
    [
      'daftar',
      <>
        <span className="kbd">-</span> lalu spasi
      </>
    ],
    [
      'pemisah',
      <>
        <span className="kbd">---</span> lalu Enter
      </>
    ],
    [
      'tebal / miring',
      <>
        <span className="kbd">Ctrl/⌘ B</span> <span className="kbd">Ctrl/⌘ I</span>
      </>
    ],
    ['tautan', <span className="kbd">Ctrl/⌘ K</span>],
    [
      'gambar',
      <>
        <span className="kbd">/</span> lalu “gambar”, atau tempel &amp; seret
      </>
    ],
    ['simpan sekarang', <span className="kbd">Ctrl/⌘ S</span>],
    ['terbitkan', <span className="kbd">Ctrl/⌘ Enter</span>],
    ['keluar dari pratinjau', <span className="kbd">Esc</span>],
    ['buka pintasan ini', <span className="kbd">Ctrl/⌘ /</span>]
  ];
  return (
    <Modal open={open} onClose={onClose} className="modal" labelledBy="dk-h" id="dlg-keys">
      <div className="dlg-in">
        <div className="dlg-h">
          <h2 id="dk-h">Pintasan</h2>
          <button className="x" type="button" onClick={onClose}>
            tutup
          </button>
        </div>
        <table className="sc">
          <tbody>
            {rows.map(([a, b]) => (
              <tr key={a}>
                <td>{a}</td>
                <td>{b}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mono">
          Setiap ketikan tersimpan otomatis. Kamu tak perlu menekan tombol simpan.
        </p>
      </div>
    </Modal>
  );
}

/* ---------- terbitkan ---------- */
/** pub = { tag, excerpt, name, anon, errTag, errName, title, minutes, existing, done } (state dipegang halaman) */
export function PublishDialog({ open, onClose, pub, setPub, onSubmit, tagChoices = [] }) {
  const author = C.authorLabel(pub.anon, pub.name);
  const patch = (p) => setPub({ ...pub, ...p });
  if (pub.done) {
    const { old, post } = pub.done;
    return (
      <Modal open={open} onClose={onClose} className="sheet" labelledBy="dp-h" id="dlg-pub">
        <div className="dlg-in">
          <div className="dlg-h">
            <span className="mono">{old ? 'diperbarui' : 'terbit'}</span>
            <button className="x" type="button" onClick={onClose}>
              tutup
            </button>
          </div>
          <div className="done">
            <h2 id="dp-h">{old ? 'Sudah diperbarui.' : 'Sudah terbit.'}</h2>
            <p>“{post.title}” sekarang bisa dibaca di beranda. Terima kasih sudah menuliskannya.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 var(--s3)' }}>
              <Link className="cta pri" to={'/tulisan/' + encodeURIComponent(post.slug)} autoFocus>
                lihat tulisan <span>→</span>
              </Link>
              <Link className="cta" to="/tulis?new=1">
                tulis yang lain <span>→</span>
              </Link>
            </div>
          </div>
        </div>
      </Modal>
    );
  }
  return (
    <Modal open={open} onClose={onClose} className="sheet" labelledBy="dp-h" id="dlg-pub">
      <form
        className="dlg-in"
        id="pub-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <div className="dlg-h">
          <h2 id="dp-h">{pub.existing ? 'Perbarui tulisan?' : 'Siap terbit?'}</h2>
          <button className="x" type="button" onClick={onClose}>
            tutup
          </button>
        </div>

        <div className="pcard">
          <p className="mono" id="pc-meta">
            {(tags.normalize(pub.tag) || 'tanpa tag') + ' · ' + author}
          </p>
          <h3 id="pc-title">{pub.title}</h3>
          <p className="mono" id="pc-sub">
            {pub.minutes} menit baca
          </p>
        </div>

        <fieldset className={'field' + (pub.errTag ? ' bad' : '')} id="f-tag">
          <legend className="mono">tag (opsional)</legend>
          <div className="pick" id="pick" role="group" aria-label="Tag yang sudah ada">
            {tagChoices.map((t) => (
              <button
                key={t}
                className="chip"
                type="button"
                aria-pressed={t === tags.normalize(pub.tag)}
                data-tag={t}
                // menekan tag yang sedang dipilih = melepasnya (tulisan tanpa tag)
                onClick={() => patch({ tag: t === tags.normalize(pub.tag) ? '' : t, errTag: '' })}
              >
                {t}
              </button>
            ))}
          </div>
          <input
            className="inp"
            id="tag-in"
            type="text"
            maxLength={tags.MAX_LEN + 1}
            autoComplete="off"
            placeholder="Pilih di atas, atau ketik tag baru. Kosongkan bila tanpa tag."
            aria-describedby="e-tag"
            value={pub.tag}
            onChange={(e) => patch({ tag: e.target.value, errTag: '' })}
          />
          <p className="err-msg" id="e-tag" role="alert">
            {pub.errTag}
          </p>
        </fieldset>

        <div className="field" id="f-ex">
          <label className="mono" htmlFor="ex">
            Ringkasan tulisan
          </label>
          <textarea
            className="inp"
            id="ex"
            rows={3}
            maxLength={160}
            value={pub.excerpt}
            onChange={(e) => patch({ excerpt: e.target.value })}
          />
          <span className="mono cnt-r" id="ex-n">
            {pub.excerpt.length}/160
          </span>
        </div>

        <div className={'field' + (pub.errName ? ' bad' : '')} id="f-name">
          <label className="mono" htmlFor="name">
            Nama penulis
          </label>
          <input
            className="inp"
            id="name"
            type="text"
            maxLength={40}
            autoComplete="nickname"
            placeholder="Nama yang ingin ditampilkan"
            value={pub.name}
            disabled={pub.anon}
            onChange={(e) => patch({ name: e.target.value, errName: '' })}
          />
          <p className="err-msg" id="e-name" role="alert">
            {pub.errName}
          </p>
          <label className="chk">
            <input
              type="checkbox"
              id="anon"
              checked={pub.anon}
              onChange={(e) => patch({ anon: e.target.checked, errName: '' })}
            />{' '}
            terbitkan sebagai anonim
          </label>
        </div>

        <p className="mono">Tulisanmu akan muncul di beranda dan bisa kamu edit lagi nanti.</p>

        <div className="dlg-f">
          <button className="btn" type="button" onClick={onClose}>
            kembali menulis
          </button>
          <button className="btn solid" type="submit" id="pub-go">
            {pub.existing ? 'perbarui tulisan' : 'terbitkan sekarang'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
