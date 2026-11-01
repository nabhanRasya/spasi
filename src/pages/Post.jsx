import { useEffect, useMemo, useRef, useState } from 'react';
import { auth, comments, likes, saved, posts, reads } from '../lib/services/store/index.js';
import * as U from '../lib/core/text.js';
import * as reader from '../lib/core/reader.js';
import { sanitize } from '../lib/services/html.js';
import useStore from '../hooks/useStore.js';
import { textSize } from '../hooks/textSize.js';
import { usePageStyles, useBody, useTitle } from '../hooks/usePage.js';
import { useReadProgress } from '../hooks/useReadProgress.js';
import { Link, useNavigate, useParams } from '../router.jsx';
import Layout from '../components/Layout.jsx';
import { Icon } from '../components/Icon.jsx';
import Reveal from '../components/Reveal.jsx';
import { useToast } from '../components/Toasts.jsx';
import ShareDialog from '../components/ShareDialog.jsx';
import blog from '../styles/blog.css?inline';
import article from '../styles/article.css?inline';
import share from '../styles/share.css?inline';

/* ---------- tanggapan ---------- */
function Comments({ post }) {
  useStore();
  const toast = useToast();
  const me = auth.user(),
    list = comments.list(post.slug);
  const [text, setText] = useState(''),
    [armed, setArmed] = useState(''),
    armT = useRef(0),
    form = useRef(null),
    input = useRef(null);
  const nx = encodeURIComponent('/tulisan/' + encodeURIComponent(post.slug));
  useEffect(() => () => clearTimeout(armT.current), []);

  const submit = (e) => {
    e.preventDefault();
    const t = text.replace(/\n{3,}/g, '\n\n').trim();
    if (t.length < 2) {
      toast('Tulis sedikit lebih panjang.', { err: true });
      input.current.focus();
      return;
    }
    comments.add(post.slug, t);
    setText('');
    toast('Tanggapan terkirim.');
  };
  const del = (id) => {
    clearTimeout(armT.current);
    if (armed === id) {
      comments.remove(post.slug, id);
      setArmed('');
      toast('Tanggapan dihapus.');
    } else {
      setArmed(id);
      armT.current = setTimeout(() => setArmed(''), 3000);
    }
  };

  return (
    <section className="sec cmts" aria-labelledby="cm-h">
      <div className="split">
        <h2 className="mono" id="cm-h">
          tanggapan · <span id="cm-n">{list.length}</span>
        </h2>
        <div>
          <form className="cm-form" id="cm-form" ref={form} hidden={!me} onSubmit={submit}>
            <label className="sr" htmlFor="cm-in">
              Tulis tanggapan
            </label>
            <textarea
              id="cm-in"
              ref={input}
              rows={3}
              maxLength={600}
              placeholder="Tulis tanggapan yang baik dan jujur…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault();
                  form.current.requestSubmit();
                }
              }}
            />
            <div className="cm-row">
              <span className="mono" id="cm-c">
                {text.length}/600
              </span>
              <button className="btn solid" type="submit">
                kirim
              </button>
            </div>
          </form>
          <p className="cm-gate" id="cm-gate" hidden={!!me}>
            Masuk untuk menanggapi tulisan ini.{' '}
            <Link className="u" id="cm-login" to={'/masuk?next=' + nx}>
              masuk
            </Link>{' '}
            ·{' '}
            <Link className="u" id="cm-signup" to={'/daftar?next=' + nx}>
              buat akun
            </Link>
          </p>
          <ol className="cm-list" id="cm-list">
            {list.map((c) => {
              const own = me && me.email === c.email;
              return (
                <li className="cm" key={c.id}>
                  <span className="ava" aria-hidden="true">
                    {c.name.charAt(0)}
                  </span>
                  <div>
                    <p className="mono cm-h">
                      <b>{c.name}</b> · {U.ago(c.ts)}
                      {own && (
                        <>
                          {' '}
                          ·{' '}
                          <button
                            className={'tgl' + (armed === c.id ? ' armed' : '')}
                            type="button"
                            onClick={() => del(c.id)}
                          >
                            {armed === c.id ? 'yakin?' : 'hapus'}
                          </button>
                        </>
                      )}
                    </p>
                    <p className="cm-t">{c.text}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* tombol suka / simpan / salin / bagikan, dipakai di sisi kiri (rail) dan bilah bawah ponsel */
function Actions({ post, compact, onVisual, onCopy }) {
  const toast = useToast(),
    navigate = useNavigate();
  const liked = likes.has(post.slug),
    isSaved = saved.has(post.slug);
  const like = () => {
    if (likes.toggle(post.slug)) toast('Terima kasih sudah membaca.');
  };
  const save = () => {
    const was = saved.has(post.slug);
    const on = saved.toggle(post.slug);
    if (on === was) return; // tak berubah (mis. tamu di backend yang mewajibkan akun): pesannya sudah ditampilkan
    toast(
      on ? 'Disimpan. Lihat di “tersimpan”.' : 'Dihapus dari simpanan.',
      on ? { action: { label: 'lihat', run: () => navigate('/baca?tag=tersimpan') } } : {}
    );
  };
  const count = post.likeCount != null ? post.likeCount : reader.likeCount(post.slug, liked); // server: hitungan nyata
  if (compact)
    return (
      <>
        <button className="tgl" type="button" aria-pressed={liked} aria-label="Suka" onClick={like}>
          <Icon name="heart" />
        </button>
        <button
          className="tgl"
          type="button"
          aria-pressed={isSaved}
          aria-label="Simpan"
          onClick={save}
        >
          <Icon name="bookmark" />
        </button>
        <button className="tgl" type="button" aria-label="Salin tautan" onClick={onCopy}>
          <Icon name="link" />
        </button>
        <button
          className="tgl"
          type="button"
          aria-label="Bagikan sebagai gambar"
          onClick={onVisual}
        >
          <Icon name="image" />
        </button>
      </>
    );
  return (
    <>
      <button className="tgl" type="button" aria-pressed={liked} onClick={like}>
        <Icon name="heart" />
        <span className="lbl">suka</span> <span className="cnt">{count}</span>
      </button>
      <button className="tgl" type="button" aria-pressed={isSaved} onClick={save}>
        <Icon name="bookmark" />
        <span className="lbl">{isSaved ? 'tersimpan' : 'simpan'}</span>
      </button>
      <button className="tgl" type="button" onClick={onCopy}>
        <Icon name="link" />
        <span className="lbl">salin tautan</span>
      </button>
      <button className="tgl" type="button" onClick={onVisual}>
        <Icon name="image" />
        <span className="lbl">bagikan visual</span>
      </button>
    </>
  );
}

function Article({ post }) {
  useStore();
  const toast = useToast();
  const proseRef = useRef(null);
  const [sharing, setSharing] = useState(false);
  const body = useMemo(() => ({ __html: sanitize(post.body) }), [post.slug, post.body]); // objek stabil: lihat catatan di pages/Write.jsx
  const [g, remeasure] = useReadProgress(proseRef, post.minutes, true);
  const related = useMemo(() => reader.related(posts.all(), post, 2), [post.slug]); // eslint-disable-line react-hooks/exhaustive-deps

  useTitle(post.title + ' — Spasi', post.excerpt);
  useEffect(() => {
    reads.add(post.slug);
  }, [post.slug]);

  const copyLink = () => {
    const url = location.href,
      ok = () => toast('Tautan disalin.');
    const fallback = () => {
      const t = document.createElement('textarea');
      t.value = url;
      t.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(t);
      t.select();
      try {
        document.execCommand('copy');
        ok();
      } catch (e) {
        toast('Salin dari bilah alamat ya.', { err: true });
      }
      t.remove();
    };
    if (navigator.clipboard && window.isSecureContext)
      navigator.clipboard.writeText(url).then(ok, fallback);
    else fallback();
  };
  const resize = (arg) => {
    const cur = textSize.get(),
      now = textSize.set(reader.nextSize(cur, arg, textSize.max));
    remeasure();
    if (now === cur) toast(reader.sizeLimitMessage(arg));
  };
  const ini = U.initial(post.author);

  return (
    <>
      <div className="progress" aria-hidden="true" />
      <div id="art">
        <header className="sec art-head">
          <Link className="cta back" to="/baca">
            <span>
              <Icon name="arrow-left" />
            </span>{' '}
            semua tulisan
          </Link>
          <p className="mono" id="a-meta">
            {post.tag && (
              <>
                <Link to={'/baca?tag=' + encodeURIComponent(post.tag)}>{post.tag}</Link> ·{' '}
              </>
            )}
            {U.dayLong(post.ts)}
          </p>
          <h1 className="art-title" id="a-title">
            {post.title}
          </h1>
          <p className="art-dek" id="a-dek" hidden={!post.excerpt}>
            {post.excerpt}
          </p>
          <div className="byline">
            <span className="ava" aria-hidden="true">
              {ini}
            </span>
            <div>
              <p className="who" id="a-who">
                {post.author === 'Anonim' ? (
                  'Anonim'
                ) : (
                  <Link className="u" to={'/baca?a=' + encodeURIComponent(post.author)}>
                    {post.author}
                  </Link>
                )}
              </p>
              <p className="mono" id="a-sub">
                {post.minutes} menit baca · {post.words} kata
              </p>
            </div>
          </div>
        </header>

        <div className="sec split art-grid">
          <aside className="rail" aria-label="Alat membaca">
            <div className="rail-g prog-l">
              <p className="mono">progres baca</p>
              <div className="prog-bar" aria-hidden="true">
                <i id="rail-bar" />
              </div>
              <p className="mono" id="rail-txt">
                {g.rail}
              </p>
            </div>
            <div className="rail-g" role="group" aria-label="Aksi">
              <p className="mono">tulisan ini</p>
              <Actions post={post} onVisual={() => setSharing(true)} onCopy={copyLink} />
              {post.mine && (
                <Link
                  className="tgl"
                  id="edit-link"
                  to={'/tulis?edit=' + encodeURIComponent(post.slug)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '.7em' }}
                >
                  <Icon name="pencil" />
                  edit tulisan
                </Link>
              )}
            </div>
            <div className="rail-g">
              <p className="mono">ukuran teks</p>
              <div className="sizes">
                <button
                  className="btn"
                  type="button"
                  aria-label="Perkecil teks"
                  onClick={() => resize('-1')}
                >
                  A
                </button>
                <button
                  className="btn"
                  type="button"
                  aria-label="Perbesar teks"
                  onClick={() => resize('1')}
                >
                  A
                </button>
              </div>
            </div>
          </aside>
          <article
            className="prose"
            id="isi"
            ref={proseRef}
            tabIndex={-1}
            dangerouslySetInnerHTML={body}
          />
        </div>

        <Comments post={post} />

        <section className="more" aria-labelledby="more-h">
          <div className="more-h">
            <h2 className="mono" id="more-h">
              lanjut baca
            </h2>
          </div>
          <ol className="posts" id="more-list">
            {related.map((p, i) => (
              <Reveal as="li" key={p.slug} style={{ '--i': i }}>
                <Link className="post" to={'/tulisan/' + encodeURIComponent(p.slug)}>
                  <div className="pm">
                    {p.tag && <p className="mono tg">{p.tag}</p>}
                    <p className="mono">{p.author}</p>
                    <p className="mono">{p.minutes} menit baca</p>
                  </div>
                  <div>
                    <h2 className="pt">{p.title}</h2>
                    <p className="pe">{p.excerpt}</p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </ol>
        </section>

        <section className="sec cta-end">
          <p className="mono">giliranmu</p>
          <h2>
            Punya cerita untuk <em>ditulis?</em>
          </h2>
          <Link className="cta pri" to="/tulis">
            mulai menulis <span>→</span>
          </Link>
        </section>
      </div>

      <div
        className={'m-bar' + (g.offscreen ? ' off' : '')}
        id="m-bar"
        role="group"
        aria-label="Alat membaca"
      >
        <p className="mono" id="m-txt">
          {g.mini}
        </p>
        <div className="g">
          <Actions post={post} compact onVisual={() => setSharing(true)} onCopy={copyLink} />
          <button
            className="tgl"
            type="button"
            aria-label="Ganti ukuran teks"
            onClick={() => resize('cycle')}
          >
            Aa
          </button>
        </div>
      </div>

      {sharing && <ShareDialog post={post} proseRef={proseRef} onClose={() => setSharing(false)} />}
    </>
  );
}

export default function Post() {
  usePageStyles([blog, article, share]);
  useBody('', { autohide: 'true' });
  const { slug } = useParams();
  const ver = useStore();
  const post = useMemo(() => posts.find(slug), [slug, ver]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    posts.load(slug); // isi lengkap (backend server memuat ringkasan dulu); idempoten
  }, [slug]);
  const loading = !post ? posts.status(slug) === 'loading' : !post.hasBody;
  useTitle(post ? post.title + ' — Spasi' : loading ? 'Memuat… — Spasi' : 'Tidak ditemukan — Spasi');

  return (
    <Layout
      autoHide
      skipTo="#isi"
      skipLabel="Lewati ke tulisan"
      before={<div className="grain" aria-hidden="true" />}
    >
      <main id="main">
        {post && post.hasBody ? (
          <Article key={post.slug} post={post} />
        ) : loading ? (
          <div className="empty" role="status" style={{ marginTop: 'var(--s5)' }}>
            <p className="mono">memuat tulisan…</p>
          </div>
        ) : (
          <div id="missing" className="empty" style={{ marginTop: 'var(--s5)' }}>
            <h2>Tulisan ini belum bisa ditemukan.</h2>
            <p>Periksa kembali tautannya. Bisa jadi tulisan ini sudah dipindahkan.</p>
            <Link className="cta pri" to="/baca">
              kembali ke beranda <span>→</span>
            </Link>
          </div>
        )}
      </main>
    </Layout>
  );
}
