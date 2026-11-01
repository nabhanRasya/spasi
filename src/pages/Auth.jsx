import { useEffect, useRef, useState } from 'react';
import { auth } from '../lib/services/store/index.js';
import * as account from '../lib/core/account.js';
import useStore from '../hooks/useStore.js';
import { usePageStyles, useBody, useTitle, useNoIndex } from '../hooks/usePage.js';
import { Link, navigate, useSearchParams } from '../router.jsx';
import Layout from '../components/Layout.jsx';
import { Icon } from '../components/Icon.jsx';
import authCss from '../styles/auth.css?inline';

/* Slot video 1:1. Isi alamat video di sini (opsional poster) untuk mengganti wireframe, mis. '/assets/login.mp4'. */
const VIDEO = { login: { src: '', poster: '' }, signup: { src: '', poster: '' } };

function Media({ mode }) {
  const ref = useRef(null),
    v = VIDEO[mode];
  useEffect(() => {
    if (!v.src) return;
    const m = ref.current,
      el = document.createElement('video'),
      still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.src = v.src;
    if (v.poster) el.poster = v.poster;
    el.muted = true;
    el.loop = true;
    el.playsInline = true;
    el.autoplay = !still;
    el.controls = still;
    el.setAttribute('aria-hidden', still ? 'false' : 'true');
    m.appendChild(el);
    m.classList.add('has-video');
    return () => {
      el.remove();
      m.classList.remove('has-video');
    };
  }, [v.src, v.poster]);
  return (
    <figure className="media" id="media" ref={ref}>
      <div className="wf" aria-hidden="true">
        <svg className="wf-x" viewBox="0 0 100 100" preserveAspectRatio="none">
          <line x1="0" y1="0" x2="100" y2="100" />
          <line x1="100" y1="0" x2="0" y2="100" />
        </svg>
        <div className="wf-c">
          <Icon name="circle-play" />
          <p className="mono">video ilustrasi · 1:1</p>
          <p className="mono">{mode}</p>
        </div>
        <div className="wf-bar" />
      </div>
    </figure>
  );
}

/** Masuk (mode="login") & daftar (mode="signup"). Validasi & pesan galat ada di lib/core/account.js. */
export default function Auth({ mode }) {
  usePageStyles([authCss]);
  useBody('auth', { mode });
  useTitle(mode === 'login' ? 'Masuk — Spasi' : 'Daftar — Spasi');
  useNoIndex();
  useStore();
  const signup = mode === 'signup';
  const [params] = useSearchParams();
  const NEXT = account.safeNext(params.get('next')); // hanya jalur internal (lihat core/account.js)
  const me = auth.user();
  const [f, setF] = useState({ name: '', email: '', pass: '' });
  const [err, setErr] = useState(''),
    [bad, setBad] = useState(''),
    [busy, setBusy] = useState(false),
    [show, setShow] = useState(false);
  const refs = { name: useRef(null), email: useRef(null), pw: useRef(null) };

  useEffect(() => {
    if (me) navigate(NEXT, { replace: true });
  }, [me, NEXT]); // sudah masuk: langsung ke tujuan
  if (me) return null;

  const set = (k) => (e) => {
    setF({ ...f, [k]: e.target.value });
    setBad('');
    setErr('');
  };
  const fail = (text, field) => {
    setErr(text);
    if (field) {
      setBad(field);
      refs[field].current.focus();
    }
  };
  const submit = (e) => {
    e.preventDefault();
    setErr('');
    setBad('');
    const name = signup ? account.normalizeName(f.name) : '',
      email = f.email.trim();
    const v = account.validate(mode, { hasName: signup, name, email, pass: f.pass });
    if (v) return fail(account.MSG[v.key], v.field);
    setBusy(true);
    (signup ? auth.signup(name, email, f.pass) : auth.login(email, f.pass)) // berhasil: sesi aktif → efek di atas yang mengarahkan ke tujuan (satu pintu, riwayat tidak dobel)
      .catch((x) => {
        setBusy(false);
        const why = account.explain(x);
        fail(why.message, why.field);
      });
  };
  const alt =
    (signup ? '/masuk' : '/daftar') + (NEXT !== '/baca' ? '?next=' + encodeURIComponent(NEXT) : '');
  const inv = (k) => (bad === k ? 'true' : undefined);

  return (
    <Layout active={signup ? '' : 'masuk'}>
      <main id="main" className="a-wrap">
        <section className="a-form" aria-labelledby="h1">
          <p className="mono">{signup ? 'daftar' : 'masuk'}</p>
          <h1 id="h1">
            {signup ? (
              <>
                Mulai dari <em>satu kalimat.</em>
              </>
            ) : (
              <>
                Selamat datang <em>kembali.</em>
              </>
            )}
          </h1>
          <p className="a-lede">
            {signup
              ? 'Buat akun untuk menulis, menyimpan, dan dikenali dengan namamu.'
              : 'Masuk untuk menyimpan tulisan dan melanjutkan bacaanmu.'}
          </p>
          <form id="f" noValidate onSubmit={submit}>
            {signup && (
              <div className="fld">
                <label htmlFor="name">nama</label>
                <div className="in">
                  <input
                    id="name"
                    name="name"
                    ref={refs.name}
                    type="text"
                    maxLength={30}
                    autoComplete="name"
                    placeholder="Namamu"
                    spellCheck="false"
                    value={f.name}
                    onChange={set('name')}
                    aria-invalid={inv('name')}
                  />
                </div>
              </div>
            )}
            <div className="fld">
              <label htmlFor="email">email</label>
              <div className="in">
                <input
                  id="email"
                  name="email"
                  ref={refs.email}
                  type="email"
                  autoComplete="email"
                  placeholder="kamu@contoh.com"
                  spellCheck="false"
                  value={f.email}
                  onChange={set('email')}
                  aria-invalid={inv('email')}
                />
              </div>
            </div>
            <div className="fld">
              <label htmlFor="pw">kata sandi</label>
              <div className="in pw">
                <input
                  id="pw"
                  name="password"
                  ref={refs.pw}
                  type={show ? 'text' : 'password'}
                  autoComplete={signup ? 'new-password' : 'current-password'}
                  placeholder="••••••••"
                  value={f.pass}
                  onChange={set('pass')}
                  aria-invalid={inv('pw')}
                />
                <button
                  className="eye"
                  id="eye"
                  type="button"
                  aria-label={show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  aria-pressed={show}
                  onClick={() => setShow(!show)}
                >
                  <Icon name={show ? 'eye-off' : 'eye'} />
                </button>
              </div>
              {signup && <p className="hint">minimal 8 karakter</p>}
            </div>
            <p className="err" id="err" role="alert">
              {err}
            </p>
            <button className="btn solid a-submit" id="go" type="submit" disabled={busy}>
              {busy ? 'memproses… ' : signup ? 'buat akun ' : 'masuk '}
              <Icon name="arrow-right" />
            </button>
          </form>
          <p className="a-alt">
            {signup ? 'Sudah punya akun? ' : 'Belum punya akun? '}
            <Link className="u" to={alt}>
              {signup ? 'masuk' : 'daftar'}
            </Link>
          </p>
        </section>
        <Media mode={mode} />
      </main>
    </Layout>
  );
}
