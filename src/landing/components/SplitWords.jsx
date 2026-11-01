/* Splits text into words that rise out of a mask.
   parts: [{ t, em }]    mode: 'scroll' (reveals as it enters the viewport) | 'load' (plays once on load)
   base:  seconds of delay before a 'load' sequence starts */
export default function SplitWords({ parts, mode = 'scroll', base, className = '' }) {
  let n = 0;
  const out = [];
  parts.forEach((p, pi) => {
    p.t.split(/(\s+)/).forEach((tok, ti) => {
      if (tok === '') return;
      if (/^\s+$/.test(tok)) {
        out.push(' ');
        return;
      }
      const i = n++;
      out.push(
        <span className="w" key={pi + '-' + ti} style={{ '--i': i }}>
          <span className={'wi' + (p.em ? ' em' : '')}>{tok}</span>
        </span>
      );
    });
  });
  return (
    <span
      className={`sw sw-${mode} ${className}`.trim()}
      style={base != null ? { '--base': base + 's' } : undefined}
    >
      {out}
    </span>
  );
}
