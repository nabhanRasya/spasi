import { useRef } from 'react';
import { content } from '../content.js';
import AsciiCanvas from './AsciiCanvas.jsx';
import SplitWords from './SplitWords.jsx';
import Nav from './Nav.jsx';
import Cta from './Cta.jsx';

const rectOf = (el, pad) => ({
  x0: el.offsetLeft - pad,
  y0: el.offsetTop - pad,
  x1: el.offsetLeft + el.offsetWidth + pad,
  y1: el.offsetTop + el.offsetHeight + pad
});

export default function Hero() {
  const c = content.hero,
    ref = useRef(null);

  /* The h1 is an invisible sizer: the moth is drawn around its centre, and the
     copy and nav are kept quiet so the text stays readable over the field. */
  const ctx = (S) => {
    const hero = ref.current,
      mk = hero.querySelector('.mark-wrap'),
      H = S.H;
    return {
      voidRect: {
        cx: mk.offsetLeft / H,
        cy: mk.offsetTop / H,
        rx: (mk.offsetWidth / 2 / H) * 1.3,
        ry: (mk.offsetHeight / 2 / H) * 1.95,
        hw: mk.offsetWidth / 2 / H
      },
      quiet: [rectOf(hero.querySelector('.hero-copy'), 8), rectOf(hero.querySelector('.nav'), 0)]
    };
  };

  return (
    <header className="hero" id="atas" ref={ref}>
      <AsciiCanvas scene="hero" className="field" id="f-hero" ctx={ctx} />
      <Nav />
      <h1 className="mark-wrap">
        <span className="sr">{content.title}</span>
      </h1>

      <div className="hero-copy">
        <p className="mono fx-up" style={{ '--i': 0, '--base': '1.8s' }}>
          {c.eyebrow}
        </p>
        <p className="lead">
          <SplitWords parts={[{ t: c.lead }]} mode="load" base={2} />
        </p>
        <p className="sub fx-up" style={{ '--i': 0, '--base': '2.7s' }}>
          {c.sub}
        </p>
        <div className="row fx-up" style={{ '--i': 0, '--base': '2.9s' }}>
          {c.ctas.map((b) => (
            <Cta key={b.label} {...b} />
          ))}
        </div>
      </div>

      <p className="mono rail" aria-hidden="true">
        {c.rail}
      </p>
      <div className="hero-meta" aria-hidden="true">
        <span className="mono">{c.scroll}</span>
        <i className="drip" />
      </div>
    </header>
  );
}
