import { auth } from '../../lib/services/store/index.js';
import * as U from '../../lib/core/text.js';
import useStore from '../../hooks/useStore.js';
import { Link } from '../../router.jsx';
import { content } from '../content.js';
import Scramble from './Scramble.jsx';

/* Navigasi landing: tautan mengarah ke halaman blog; "masuk" berubah jadi nama pengguna setelah masuk. */
export default function Nav() {
  useStore();
  const me = auth.user();
  return (
    <nav className="nav" aria-label="Navigasi utama">
      <a className="home" href="#atas" aria-label="spasi, kembali ke atas">
        <span className="mark" aria-hidden="true" />
      </a>
      <ul>
        {content.nav.links.map((l) => {
          const acct = l.account && me;
          return (
            <li key={l.href} className={l.optional ? 'opt' : undefined}>
              <Link className="l u" to={acct ? '/akun' : l.href}>
                <Scramble text={acct ? U.firstName(me.name, 12) : l.label} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
