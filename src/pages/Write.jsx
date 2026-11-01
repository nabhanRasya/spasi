import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { auth, author, drafts, posts, prefs } from '../lib/services/store/index.js';
import { firstParagraphText } from '../lib/services/html.js';
import * as U from '../lib/core/text.js';
import * as C from '../lib/core/composer.js';
import * as tags from '../lib/core/tags.js';
import { TAGS } from '../lib/data/seed.js';
import useStore from '../hooks/useStore.js';
import { usePageStyles, useBody, useTitle, useNoIndex } from '../hooks/usePage.js';
import { Link, navigate, replaceSilently, useLocation } from '../router.jsx';
import { Icon } from '../components/Icon.jsx';
import { ThemeButton } from '../components/Layout.jsx';
import { useToast } from '../components/Toasts.jsx';
import ImageDialog from '../components/write/ImageDialog.jsx';
import {
  DraftsDialog,
  GateDialog,
  KeysDialog,
  PublishDialog
} from '../components/write/Dialogs.jsx';
import { createEditor } from '../editor/engine.js';
import blog from '../styles/blog.css?inline';
import article from '../styles/article.css?inline';
import editorCss from '../styles/editor.css?inline';

const hhmm = (ts) => {
  const d = new Date(ts || Date.now());
  return ('0' + d.getHours()).slice(-2) + '.' + ('0' + d.getMinutes()).slice(-2);
};
const EMPTY_HTML = { __html: '<p><br></p>' }; // objek tetap: React menulis ulang innerHTML bila identitasnya berganti
const emptyPub = {
  tag: '',
  excerpt: '',
  name: '',
  anon: false,
  errTag: '',
  errName: '',
  title: '',
  minutes: 1,
  existing: false,
  done: null
};

/** Editor tulisan. Mulai dari nol tiap alamat berganti (lihat WritePage). Mesin contenteditable ada di editor/engine.js. */
function Write() {
  usePageStyles([blog, article, editorCss]);
  useBody('ed-page hint-on');
  useTitle('Tulis — Spasi');
  useNoIndex();
  const toast = useToast();
  useStore();

  const el = {
    title: useRef(),
    ed: useRef(),
    main: useRef(),
    col: useRef(),
    slash: useRef(),
    seltb: useRef(),
    fmtbar: useRef(),
    linkpop: useRef(),
    linkIn: useRef(),
    linkOk: useRef(),
    linkOff: useRef(),
    imgtb: useRef(),
    altpop: useRef(),
    altIn: useRef(),
    altOk: useRef()
  };
  const editor = useRef(null);
  const D = useRef({
    draft: null,
    persisted: false,
    published: false,
    saveT: 0,
    previewing: false,
    status: 'idle'
  });

  const [status, setStatusS] = useState({ state: 'idle', text: 'draf baru' });
  const [stat, setStat] = useState('0 kata');
  const [previewing, setPreviewing] = useState(false),
    [pv, setPv] = useState({ meta: '', title: '', html: '' });
  const [focusMode, setFocusMode] = useState(() => prefs.focusMode.get());
  const [resume, setResume] = useState(null);
  const [dlg, setDlg] = useState(''); // '' | 'drafts' | 'gate' | 'pub' | 'keys' | 'img'
  const [imgTab, setImgTab] = useState('up');
  const [gate, setGate] = useState({});
  const [pub, setPub] = useState(emptyPub);
  const draftList = drafts.all();
  const pvHtml = useMemo(() => ({ __html: pv.html }), [pv.html]);

  const setStatus = (state, text) => {
    D.current.status = state;
    setStatusS({ state, text });
  };
  const updateStat = () => {
    const n = editor.current.plainWords();
    setStat(n + ' kata' + (n ? ' · ' + U.readMinutes(n) + ' menit' : ''));
  };

  /* ---------- simpan otomatis ---------- */
  function changed() {
    const d = D.current;
    if (d.published || !editor.current) return;
    editor.current.updateEmpty();
    updateStat();
    setResume(null);
    setStatus('saving', 'menyimpan…');
    clearTimeout(d.saveT);
    d.saveT = setTimeout(() => save(), 650);
  }
  function save(manual) {
    const d = D.current,
      ed = editor.current;
    clearTimeout(d.saveT);
    d.saveT = 0;
    if (d.published || !ed || !el.title.current) return;
    const dr = d.draft;
    dr.title = el.title.current.value.replace(/\s+/g, ' ').trim();
    dr.html = ed.getHtml();
    if (C.isEmptyDraft(dr.title, U.words(dr.html), /<img /i.test(dr.html))) {
      if (d.persisted) {
        drafts.remove(dr.id);
        d.persisted = false;
      }
      setStatus('idle', 'draf baru');
      return;
    }
    const ok = drafts.save({
      id: dr.id,
      title: dr.title,
      html: dr.html,
      sourceSlug: dr.sourceSlug,
      tag: dr.tag,
      excerpt: dr.excerpt
    });
    if (!ok) {
      setStatus(
        'error',
        ed.hasFigure()
          ? 'gagal menyimpan — penyimpanan penuh, coba kurangi gambar'
          : 'gagal menyimpan — penyimpanan penuh atau mode privat'
      );
      return;
    }
    d.persisted = true;
    setStatus('saved', 'tersimpan · ' + hhmm());
    replaceSilently('/tulis?id=' + encodeURIComponent(dr.id));
    if (manual) toast('Draf tersimpan di perangkat ini.');
  }
  const flush = () => {
    if (D.current.saveT) save();
  };

  /* ---------- pratinjau & fokus ---------- */
  function togglePreview(on) {
    const d = D.current,
      ed = editor.current;
    d.previewing = on === undefined ? !d.previewing : on;
    setPreviewing(d.previewing);
    setResume(null);
    ed.closeTransient();
    if (d.previewing) {
      save();
      const html = ed.getHtml();
      setPv({
        meta:
          'pratinjau · begini tulisanmu saat dibaca · ' +
          U.readMinutes(U.words(html)) +
          ' menit baca',
        title: el.title.current.value.trim() || 'Tanpa judul',
        html: html || '<p class="mono">belum ada isi.</p>'
      });
      scrollTo(0, 0);
    } else {
      ed.grow();
      ed.focus();
    }
  }
  useEffect(() => {
    document.body.classList.toggle('previewing', previewing);
    return () => document.body.classList.remove('previewing');
  }, [previewing]);
  useEffect(() => {
    document.body.classList.toggle('focusmode', focusMode);
    return () => document.body.classList.remove('focusmode');
  }, [focusMode]);

  /* ---------- terbitkan ---------- */
  function autoExcerpt() {
    return C.excerptFrom(firstParagraphText(editor.current.getHtml()));
  }
  function tryPublish() {
    const d = D.current,
      ed = editor.current,
      t = el.title.current;
    if (d.published) return;
    const ready = C.readiness(t.value, ed.plainWords());
    if (!ready.ok && ready.reason === 'title') {
      if (d.previewing) togglePreview(false);
      t.focus();
      t.classList.remove('shake');
      void t.offsetWidth;
      t.classList.add('shake');
      toast(ready.message, { err: true });
      return;
    }
    if (!ready.ok) {
      if (d.previewing) togglePreview(false);
      ed.focus();
      toast(ready.message, { err: true, ms: 5000 });
      return;
    }
    save();
    ed.closeTransient();
    const title = t.value.trim() || 'Tanpa judul',
      minutes = U.readMinutes(ed.plainWords());
    if (!auth.user()) {
      // wajib masuk untuk menerbitkan
      setGate({
        next: '/tulis?id=' + encodeURIComponent(d.draft.id),
        title,
        meta: [d.draft.tag, minutes + ' menit baca'].filter(Boolean).join(' · ')
      });
      setDlg('gate');
      return;
    }
    const existing = d.draft.sourceSlug && posts.find(d.draft.sourceSlug),
      ad = C.authorDefaults(existing, author.get());
    setPub({
      ...emptyPub,
      tag: d.draft.tag || '',
      excerpt: d.draft.excerpt || autoExcerpt(),
      name: ad.name,
      anon: ad.anon,
      title,
      minutes,
      existing: !!existing
    });
    setDlg('pub');
  }
  async function submitPub() {
    const d = D.current,
      v = C.validateMeta({ tag: pub.tag, anon: pub.anon, name: pub.name });
    if (v.tag || v.name) {
      setPub({ ...pub, errTag: v.tag, errName: v.name });
      requestAnimationFrame(() => {
        const b = document.getElementById(v.tag ? 'tag-in' : 'name');
        if (b) b.focus();
      });
      return;
    }
    const old = d.draft.sourceSlug && posts.find(d.draft.sourceSlug);
    let post;
    try {
      post = await posts.publish(
      C.buildPost(
        {
          title: el.title.current.value,
          tag: pub.tag,
          anon: pub.anon,
          name: pub.name,
          html: editor.current.getHtml(),
          excerpt: pub.excerpt,
          autoExcerpt: autoExcerpt(),
          ownerEmail: (auth.user() || {}).email
        },
        old,
        Date.now()
      ),
      !!old // mengedit tulisan terbit = ganti; selain itu tulisan baru (slug dijamin unik)
      );
    } catch (err) {
      // backend server bisa menolak (belum verifikasi email, jaringan, validasi); backend lokal tidak pernah gagal di sini
      toast((err && err.response && err.response.message) || (err && err.message) || 'Tulisan belum bisa diterbitkan.', { err: true, ms: 6000 });
      return;
    }
    author.set({ name: pub.anon ? author.get().name : pub.name.trim(), anon: pub.anon });
    d.published = true;
    clearTimeout(d.saveT);
    drafts.remove(d.draft.id);
    replaceSilently('/tulis?new=1');
    setStatus('saved', old ? 'diperbarui' : 'terbit');
    setPub({ ...pub, done: { old: !!old, post } });
  }

  /* ---------- draf ---------- */
  const openDraft = (id) => {
    if (id === D.current.draft.id) {
      setDlg('');
      return;
    }
    flush();
    navigate('/tulis?id=' + encodeURIComponent(id));
  };
  const deleteDraft = (id) => {
    const gone = drafts.find(id);
    drafts.remove(id);
    toast('Draf dihapus.', {
      ms: 6000,
      action: {
        label: 'urungkan',
        run: () => {
          if (gone) drafts.save(gone);
        }
      }
    });
  };

  /* ---------- gambar ---------- */
  const openImages = (tab) => {
    if (editor.current.beginImage()) {
      setImgTab(tab || 'up');
      setDlg('img');
    }
  };

  /* ---------- pintasan global & keluar ---------- */
  const latest = useRef({});
  latest.current = { save, tryPublish, togglePreview, flush };
  useEffect(() => {
    const onKey = (e) => {
      const mod = e.metaKey || e.ctrlKey,
        k = e.key.toLowerCase(),
        L = latest.current;
      if (mod && k === 's') {
        e.preventDefault();
        L.save(true);
      } else if (mod && e.key === 'Enter') {
        e.preventDefault();
        if (!document.querySelector('dialog[open]')) L.tryPublish();
      } else if (mod && e.key === '/') {
        e.preventDefault();
        setDlg((d) => (d === 'keys' ? '' : 'keys'));
      } else if (
        e.key === 'Escape' &&
        D.current.previewing &&
        !document.querySelector('dialog[open]')
      )
        L.togglePreview(false);
    };
    const onHide = () => {
      if (document.hidden) latest.current.flush();
    };
    addEventListener('keydown', onKey);
    addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      removeEventListener('keydown', onKey);
      removeEventListener('pagehide', onHide);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, []);

  /* ---------- mulai ---------- */
  useLayoutEffect(() => {
    const host = {
      changed: () => latest.current && changed(),
      toast: (m, o) => toast(m, o),
      openImages: (t) => openImages(t),
      isPreviewing: () => D.current.previewing
    };
    const ed = createEditor(
      {
        ed: el.ed.current,
        title: el.title.current,
        main: el.main.current,
        col: el.col.current,
        slash: el.slash.current,
        seltb: el.seltb.current,
        fmtbar: el.fmtbar.current,
        linkpop: el.linkpop.current,
        linkIn: el.linkIn.current,
        linkOk: el.linkOk.current,
        linkOff: el.linkOff.current,
        imgtb: el.imgtb.current,
        altpop: el.altpop.current,
        altIn: el.altIn.current,
        altOk: el.altOk.current
      },
      host
    );
    editor.current = ed;
    const d = D.current,
      params = new URLSearchParams(location.search);
    const id = params.get('id'),
      edit = params.get('edit'),
      start = params.get('start'),
      t0 = params.get('title');
    let draft = null;
    if (edit) {
      draft = drafts.all().filter((x) => x.sourceSlug === edit)[0];
      if (draft) d.persisted = true;
      else {
        const p = posts.find(edit);
        if (p && p.mine)
          draft = {
            id: drafts.newId(),
            title: p.title,
            html: p.body,
            sourceSlug: p.slug,
            tag: p.tag,
            excerpt: p.excerpt
          };
      }
    } else if (id) {
      draft = drafts.find(id);
      d.persisted = !!draft;
    }
    if (!draft) draft = { id: drafts.newId(), title: '', html: '' };
    if (t0 && !draft.title && !d.persisted) draft.title = t0;
    if (start && !d.persisted && !draft.html)
      draft.html = '<p>' + U.esc(start.replace(/…$/, '')) + ' </p>';
    d.draft = draft;

    el.title.current.value = draft.title || '';
    ed.load(draft.html);
    updateStat();
    setStatus(
      d.persisted ? 'saved' : 'idle',
      d.persisted ? 'tersimpan · ' + hhmm(draft.updated) : 'draf baru'
    );

    // saran melanjutkan draf terakhir (hanya saat membuka editor kosong tanpa parameter)
    if (!id && !edit && !start && !t0 && !params.has('new')) {
      const last = drafts.all()[0];
      if (last && (last.title || U.words(last.html)))
        setResume({ id: last.id, title: last.title || 'Tanpa judul', ago: U.ago(last.updated) });
    }
    ed.focusInitial(!!(el.title.current.value.trim() || draft.html), d.persisted);

    return () => {
      flush();
      clearTimeout(d.saveT);
      ed.dispose();
      editor.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <a className="skip" href="#title">
        Lewati ke editor
      </a>
      <header className="ed-bar" id="ed-bar">
        <Link
          className="cta back"
          to="/baca"
          id="exit"
          aria-label="Keluar ke daftar tulisan"
          onClick={(e) => {
            flush();
            if (D.current.status === 'error' && !confirm('Draf belum tersimpan. Tetap keluar?'))
              e.preventDefault();
          }}
        >
          <span>
            <Icon name="arrow-left" />
          </span>
          <span className="t">keluar</span>
        </Link>
        <div className="r">
          <ThemeButton id="btn-theme" className="tgl theme-ic" />
          <p
            className="mono status"
            id="status"
            data-state={status.state}
            role="status"
            aria-live="polite"
            title={status.text}
          >
            <i className="dot" aria-hidden="true" />
            <span className="t" id="status-t">
              {status.text}
            </span>
          </p>
          <p className="mono stat" id="stat" aria-live="off">
            {stat}
          </p>
          <button
            className="btn"
            id="btn-image"
            type="button"
            title="Tambah gambar: unggah atau buat dengan AI"
            onClick={() => openImages('up')}
          >
            <Icon name="image" />
            <span className="lbl">gambar</span>
          </button>
          <button
            className="btn"
            id="btn-drafts"
            type="button"
            onClick={() => {
              flush();
              setDlg('drafts');
            }}
          >
            draf <span id="draft-n">{draftList.length ? '· ' + draftList.length : ''}</span>
          </button>
          <button
            className="btn"
            id="btn-focus"
            type="button"
            aria-pressed={focusMode}
            title="Redupkan paragraf lain agar fokus"
            onClick={() => {
              const on = !focusMode;
              setFocusMode(on);
              prefs.focusMode.set(on);
              if (!D.current.previewing) editor.current.focus();
            }}
          >
            fokus
          </button>
          <button
            className="btn"
            id="btn-preview"
            type="button"
            aria-pressed={previewing}
            title="Lihat tampilan saat dibaca"
            onClick={() => togglePreview()}
          >
            {previewing ? 'kembali menulis' : 'pratinjau'}
          </button>
          <button
            className="btn solid"
            id="btn-publish"
            type="button"
            title="Terbitkan (Ctrl/⌘ + Enter)"
            onClick={tryPublish}
          >
            terbitkan
          </button>
        </div>
      </header>

      <main id="main" className="ed-main" ref={el.main}>
        <div className="resume" id="resume" hidden={!resume || previewing}>
          <p className="mono">
            draf terakhir · <b id="resume-t">{resume && resume.title}</b> ·{' '}
            <span id="resume-ago">{resume && resume.ago}</span>
          </p>
          <button
            className="cta pri"
            id="resume-go"
            type="button"
            onClick={() =>
              navigate('/tulis?id=' + encodeURIComponent(resume.id), { replace: true })
            }
          >
            lanjutkan <span>→</span>
          </button>
          <button
            className="tgl"
            id="resume-x"
            type="button"
            aria-label="Tutup saran draf"
            onClick={() => {
              setResume(null);
              el.title.current.focus();
            }}
          >
            tutup
          </button>
        </div>

        <div className="ed-col" id="col" ref={el.col} hidden={previewing}>
          <textarea
            className="ed-title"
            id="title"
            ref={el.title}
            rows={1}
            maxLength={120}
            placeholder="Beri judul tulisanmu"
            aria-label="Judul tulisan"
            autoComplete="off"
            spellCheck="true"
          />
          <div
            className="prose ed"
            id="editor"
            ref={el.ed}
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="true"
            aria-label="Isi tulisan"
            spellCheck="true"
            data-empty="true"
            style={{ '--ph': '"Mulai dari hal yang ada di pikiranmu…"' }}
            dangerouslySetInnerHTML={EMPTY_HTML}
          />
        </div>

        <div className="pv" id="pv" hidden={!previewing}>
          <p className="mono pv-meta" id="pv-meta">
            {pv.meta}
          </p>
          <h1 className="art-title" id="pv-title">
            {pv.title}
          </h1>
          <div className="prose" id="pv-body" dangerouslySetInnerHTML={pvHtml} />
        </div>
      </main>

      <p className="ed-hint mono" id="hint">
        <span>
          ketik <span className="kbd">/</span> untuk menambah blok
        </span>
        <span>pilih teks untuk memformat</span>
        <button
          className="tgl"
          type="button"
          id="btn-keys"
          style={{ minHeight: 32 }}
          onClick={() => setDlg('keys')}
        >
          pintasan
        </button>
      </p>

      {/* lapisan melayang: isinya diatur mesin editor (posisi, tampil/sembunyi), React hanya menyediakan elemennya */}
      <div
        className="seltb"
        id="seltb"
        ref={el.seltb}
        role="toolbar"
        aria-label="Format teks"
        hidden
      >
        <button
          type="button"
          className="b"
          data-cmd="bold"
          title="Tebal (Ctrl/⌘ B)"
          aria-label="Tebal"
        >
          B
        </button>
        <button
          type="button"
          className="i"
          data-cmd="italic"
          title="Miring (Ctrl/⌘ I)"
          aria-label="Miring"
        >
          i
        </button>
        <span className="sep" />
        <button type="button" data-cmd="h2" title="Judul bagian" aria-label="Judul bagian">
          H
        </button>
        <button type="button" data-cmd="quote" title="Kutipan" aria-label="Kutipan">
          “ ”
        </button>
        <span className="sep" />
        <button type="button" data-cmd="link" title="Tautan (Ctrl/⌘ K)" aria-label="Tautan">
          tautan
        </button>
      </div>
      <div className="linkpop" id="linkpop" ref={el.linkpop} hidden>
        <input
          id="link-in"
          ref={el.linkIn}
          type="text"
          inputMode="url"
          placeholder="tempel tautan, lalu Enter"
          aria-label="Alamat tautan"
          autoComplete="off"
          spellCheck="false"
        />
        <button type="button" id="link-ok" ref={el.linkOk}>
          ok
        </button>
        <button type="button" id="link-off" ref={el.linkOff} hidden>
          lepas
        </button>
      </div>
      <div
        className="seltb imgtb"
        id="imgtb"
        ref={el.imgtb}
        role="toolbar"
        aria-label="Gambar"
        hidden
      >
        <button type="button" data-img="alt" title="Teks pengganti untuk pembaca tunanetra">
          <Icon name="pencil" />
          teks alt
        </button>
        <span className="sep" />
        <button type="button" data-img="del" title="Hapus gambar (Backspace)">
          <Icon name="trash" />
          hapus
        </button>
      </div>
      <div className="linkpop" id="altpop" ref={el.altpop} hidden>
        <input
          id="alt-in"
          ref={el.altIn}
          type="text"
          maxLength={300}
          placeholder="jelaskan gambar ini singkat saja, lalu Enter"
          aria-label="Teks pengganti gambar"
          autoComplete="off"
        />
        <button type="button" id="alt-ok" ref={el.altOk}>
          ok
        </button>
      </div>
      <div
        className="slash"
        id="slash"
        ref={el.slash}
        role="listbox"
        aria-label="Tambah blok"
        hidden
      />
      <div className="fmtbar" id="fmtbar" ref={el.fmtbar} role="toolbar" aria-label="Format teks">
        <button type="button" className="b" data-cmd="bold" aria-label="Tebal">
          B
        </button>
        <button type="button" className="i" data-cmd="italic" aria-label="Miring">
          i
        </button>
        <button type="button" data-cmd="h2" aria-label="Judul bagian">
          H
        </button>
        <button type="button" data-cmd="quote" aria-label="Kutipan">
          “ ”
        </button>
        <button type="button" data-cmd="ul" aria-label="Daftar">
          —
        </button>
        <button type="button" data-cmd="link" aria-label="Tautan">
          ↗
        </button>
        <button type="button" data-cmd="image" aria-label="Gambar">
          <Icon name="image" />
        </button>
      </div>

      <ImageDialog
        open={dlg === 'img'}
        tab={imgTab}
        setTab={setImgTab}
        editor={editor.current}
        onClose={() => setDlg('')}
      />
      <DraftsDialog
        open={dlg === 'drafts'}
        onClose={() => setDlg('')}
        drafts={draftList}
        currentId={D.current.persisted && D.current.draft ? D.current.draft.id : ''}
        onOpen={openDraft}
        onDelete={deleteDraft}
        onNew={() => {
          flush();
          navigate('/tulis?new=1');
        }}
      />
      <GateDialog open={dlg === 'gate'} onClose={() => setDlg('')} info={gate} />
      <PublishDialog
        open={dlg === 'pub'}
        onClose={() => setDlg('')}
        pub={pub}
        setPub={setPub}
        onSubmit={submitPub}
        tagChoices={dlg === 'pub' ? tags.suggestions(tags.list(posts.all(), TAGS)) : []}
      />
      <KeysDialog open={dlg === 'keys'} onClose={() => setDlg('')} />
    </>
  );
}

export default function WritePage() {
  const { id } = useLocation();
  return <Write key={id} />;
}
