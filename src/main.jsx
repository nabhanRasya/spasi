import { createRoot } from 'react-dom/client';
import { textSize } from './hooks/textSize.js';
import App from './App.jsx';
import { boot } from './lib/services/store/index.js';
import tokens from './styles/tokens.css?inline';
import base from './styles/base.css?inline';
import mark from './styles/mark.css?inline';

/* CSS dasar dipasang sekali; CSS tiap halaman dipasang oleh usePageStyles saat halamannya tampil. */
const st = document.createElement('style');
st.textContent = tokens + '\n' + base + '\n' + mark;
document.head.appendChild(st);
textSize.apply(textSize.get());
/* Data dimuat dulu (sesi, daftar tulisan) supaya halaman pertama tidak berkedip kosong. Bila server lambat,
   aplikasi digambar setelah 4 detik dan datanya menyusul sendiri. */
const render = () => createRoot(document.getElementById('root')).render(<App />);
Promise.race([boot(), new Promise((r) => setTimeout(r, 4000))])
  .catch(() => {})
  .then(render);
