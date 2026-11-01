import { usePageStyles, useBody, useTitle } from '../hooks/usePage.js';
import { Link } from '../router.jsx';
import Layout from '../components/Layout.jsx';
import { Icon } from '../components/Icon.jsx';
import pages from '../styles/pages.css?inline';

export default function Tentang() {
  usePageStyles([pages]);
  useBody('compact about');
  useTitle('Tentang — Spasi');
  return (
    <Layout>
      <main id="main" className="col doc">
        <section className="hero-s">
          <p className="mono">tentang</p>
          <h1>
            Ruang untuk <em>menulis pelan.</em>
          </h1>
          <p className="lede">
            Spasi adalah tempat membaca dan menulis tanpa keramaian: satu kolom, satu tulisan, satu
            napas.
          </p>
          <nav className="toc mono" aria-label="Isi halaman">
            <a href="#cara-kerja">cara kerja</a>
            <a href="#panduan">panduan</a>
            <a href="#privasi">privasi</a>
            <a href="#ketentuan">ketentuan</a>
          </nav>
        </section>

        <h2 id="cara-kerja">Cara kerja</h2>
        <p>
          Siapa pun bisa membaca, mencari, menyimpan, dan menyukai tulisan tanpa akun. Untuk
          menerbitkan tulisan atau memberi tanggapan, kamu perlu masuk. Draf tersimpan otomatis saat
          kamu menulis, jadi tidak ada yang hilang kalau tab tertutup.
        </p>

        <h2 id="panduan">Panduan menulis</h2>
        <ul>
          <li>Tulis dari pengalaman dan pikiranmu sendiri.</li>
          <li>
            Hormati orang lain: tanpa ujaran kebencian, pelecehan, atau membuka data pribadi orang.
          </li>
          <li>Tulisan minimal beberapa kalimat dan diberi topik agar mudah ditemukan.</li>
          <li>
            Kamu bisa menerbitkan sebagai anonim, dan mengedit atau menghapus tulisanmu kapan saja
            dari halaman akun.
          </li>
        </ul>

        <h2 id="privasi">Privasi</h2>
        <p>
          Spasi saat ini adalah prototipe. Akun, tulisan, draf, tanggapan, dan simpananmu disimpan
          di peramban ini (localStorage) dan tidak dikirim ke server. Kata sandi disimpan dalam
          bentuk hash. Menghapus data situs di peramban atau menghapus akun akan menghapus semuanya.
          Font dimuat dari Google Fonts.
        </p>

        <h2 id="ketentuan">Ketentuan</h2>
        <p>
          Kamu tetap memiliki tulisanmu. Dengan menerbitkan, kamu mengizinkan tulisan itu
          ditampilkan di Spasi. Tulisan yang melanggar panduan dapat diturunkan. Layanan diberikan
          apa adanya selama masa prototipe.
        </p>
        <p style={{ marginTop: 'var(--s4)' }}>
          <Link className="cta pri" to="/tulis">
            mulai menulis{' '}
            <span>
              <Icon name="arrow-right" />
            </span>
          </Link>
        </p>
        <div style={{ height: 'var(--s5)' }} />
      </main>
    </Layout>
  );
}
