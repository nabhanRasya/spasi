import { useRef } from 'react';
import useMagnetic from '../hooks/useMagnetic.js';
import { Link } from '../../router.jsx';
import Scramble from './Scramble.jsx';

export default function Cta({ href, label, primary }) {
  const ref = useRef(null);
  useMagnetic(ref);
  return (
    <Link ref={ref} className={'cta' + (primary ? ' pri' : '')} to={href}>
      <Scramble text={label} /> <span aria-hidden="true">-&gt;</span>
    </Link>
  );
}
