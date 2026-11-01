import { content } from '../landing/content.js';
import { usePageStyles, useTitle } from '../hooks/usePage.js';
import { useGrid } from '../components/Layout.jsx';
import Intro from '../landing/components/Intro.jsx';
import { Grain, Progress, Reticle } from '../landing/components/Overlays.jsx';
import Hero from '../landing/components/Hero.jsx';
import Manifesto from '../landing/components/Manifesto.jsx';
import Marquee from '../landing/components/Marquee.jsx';
import Trio from '../landing/components/Trio.jsx';
import Reading from '../landing/components/Reading.jsx';
import Closing from '../landing/components/Closing.jsx';
import Footer from '../landing/components/Footer.jsx';
import tokens from '../landing/styles/tokens.css?inline';
import base from '../landing/styles/base.css?inline';
import overlays from '../landing/styles/overlays.css?inline';
import hero from '../landing/styles/hero.css?inline';
import sections from '../landing/styles/sections.css?inline';
import footer from '../landing/styles/footer.css?inline';
import motion from '../landing/styles/motion.css?inline';

/* Halaman depan. CSS-nya hanya dipasang selama halaman ini tampil (nama kelasnya bentrok dengan blog);
   garis grid (tombol g) dan tema memakai milik aplikasi, bukan salinan sendiri. */
export default function Landing() {
  usePageStyles([tokens, base, overlays, hero, sections, footer, motion]);
  useTitle(content.title);
  const grid = useGrid();
  return (
    <>
      <a className="skip" href="#main">
        Lewati ke konten
      </a>
      <Intro />
      <Grain />
      <Progress />
      <Reticle />
      <div className="page">
        <main id="main">
          <Hero />
          <Manifesto />
          <Marquee text={content.inside.marquee} />
          <Trio />
          <Marquee text={content.inside.marquee} reverse filled />
          <Reading />
          <Closing />
        </main>
      </div>
      <Footer gridOn={grid.on} onGrid={grid.toggle} />
    </>
  );
}
