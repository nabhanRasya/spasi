import { usePageStyles, useBody, useTitle, useNoIndex } from '../hooks/usePage.js';
import { Link } from '../router.jsx';
import Layout from '../components/Layout.jsx';
import { Icon } from '../components/Icon.jsx';
import Moth from '../components/Moth.jsx';
import pages from '../styles/pages.css?inline';

export default function NotFound() {
  usePageStyles([pages]);
  useBody('compact p404');
  useTitle('Tidak ditemukan — Spasi');
  useNoIndex();
  return (
    <Layout>
      <main id="main" className="col">
        <section className="nf">
          <Moth />
          <p className="mono">404</p>
          <h1
            className="hero-s"
            style={{
              padding: 0,
              margin: 0,
              fontWeight: 300,
              fontSize: 'clamp(2rem,1.4rem + 2.6vw,3.4rem)',
              lineHeight: 1.08,
              letterSpacing: '-.02em'
            }}
          >
            Halaman ini <em>hilang.</em>
          </h1>
          <p style={{ margin: 0, color: 'var(--mute)', maxWidth: '44ch', lineHeight: 1.6 }}>
            Tautannya mungkin salah, atau tulisannya sudah dihapus penulisnya.
          </p>
          <div className="row">
            <Link className="cta pri" to="/">
              kembali ke beranda{' '}
              <span>
                <Icon name="arrow-right" />
              </span>
            </Link>
            <Link className="cta" to="/tulis">
              tulis sesuatu{' '}
              <span>
                <Icon name="arrow-right" />
              </span>
            </Link>
          </div>
        </section>
      </main>
    </Layout>
  );
}
