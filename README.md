# Spasi — landing + blog (React + Vite)

Satu aplikasi: landing page di `/`, blog di `/baca`. Tiap halaman adalah komponen React; logika ada di `src/lib/`.

```
npm install
npm run dev      # pengembangan
npm run build    # hasil di dist/ (arahkan semua jalur ke index.html: SPA)
npm test         # tes lapisan logika + lapisan data PocketBase (SDK tiruan), tanpa server
```

## Rute

| Jalur | Halaman | Query |
|---|---|---|
| `/` | Landing page (dimuat lazy; kode ASCII/animasi tidak ikut terunduh di halaman lain) | |
| `/baca` | Daftar tulisan | `tag`, `q`, `a` |
| `/tulisan/:slug` | Baca | |
| `/tulis` | Editor | `id`, `edit`, `start`, `title`, `new` |
| `/masuk`, `/daftar` | Masuk / daftar | `next` (hanya jalur internal) |
| `/akun` | Akun | `#tulisan` `#draf` `#tersimpan` `#pengaturan` |
| `/tersimpan`, `/tentang` | | |

Routing memakai `src/router.jsx` (History API, tanpa dependensi, API mengikuti react-router). Untuk pindah ke react-router-dom, ganti impor dan ubah `<Routes routes={…}/>` di `App.jsx`.

## Landing

`src/landing/` (komponen, mesin ASCII, `content.js` = semua teks), halamannya `src/pages/Landing.jsx`. CSS-nya hanya dipasang saat `/` tampil. Tema dan tombol garis (g) memakai milik aplikasi. Daftar "pilihan tulisan" diambil dari tulisan sungguhan.

SEO: `seo.config.js` (GANTI `siteUrl`), `build/seo.mjs`, `build/seo-plugin.js` menyuntik meta/JSON-LD/`<noscript>` ke `index.html` serta menghasilkan `robots.txt`, `sitemap.xml`, `manifest.webmanifest`. Langkah prerender lama (jsdom + React 18) dihapus; konten statis kini berupa `<noscript>`. Bila butuh prerender penuh, tambahkan lagi untuk React 19.

## Struktur

```
src/
  lib/                  logika, tanpa React. Tiap berkas = ES module; impor persis yang dipakai
    core/               MURNI (tanpa DOM/penyimpanan/URL), diuji di Node: text, tags, feed, reader, account, composer, share-model, sky, moth
    data/seed.js        topik, tulisan contoh, pemantik menulis
    services/           efek samping
      storage.js        satu-satunya pintu ke localStorage (+ event 'spasi:change')
      store/            SEMUA akses data: posts, drafts, marks (suka/simpan), auth, comments, prefs, …
      html.js           sanitasi HTML tulisan (DOMParser) · images.js · ai.js
  hooks/                useStore (render ulang saat data berubah), useTheme, usePage, useReadProgress, textSize
  components/           Layout, Toasts, Modal, Icon, Moth, Scramble, Reveal, ShareDialog, write/*
  editor/engine.js      mesin contenteditable (imperatif, dibungkus satu fungsi)
  pages/                satu berkas per halaman
  landing/              halaman depan (komponen, mesin ASCII, content.js = semua teks)
  styles/               CSS; CSS halaman dipasang hanya saat halamannya tampil
tests/core.test.mjs     54 tes, tanpa dependensi
docs/                   LAPORAN-BUG.md · PANDUAN-DATABASE.md
```

## Cara membaca kode ini

1. Mulai dari `src/App.jsx` (daftar rute) → buka berkas di `pages/`.
2. Halaman membaca data lewat `import { posts, auth, saved } from '../lib/services/store/index.js'`, memanggil
   `useStore()` agar ikut menggambar ulang saat data berubah, dan memakai fungsi murni dari `lib/core/`.
3. Aturan (validasi, filter, hitungan) ada di `lib/core/`; komponen hanya menampilkan. Mau mengubah aturan → ubah di `core/` dan tambah tesnya.

## Perintah

```
npm run dev           # pengembangan
npm run build         # hasil di dist/
npm test              # tes logika + store (tanpa peramban)
npm run format        # rapikan kode (Prettier)
```

## Catatan desain

- Data tetap di localStorage lewat `lib/services/store/`. Setiap tulisan ke penyimpanan memancarkan `spasi:change`; komponen cukup memanggil `useStore()`. **Mau pindah ke database?** Baca `docs/PANDUAN-DATABASE.md`.
- HTML dari pengguna selalu disanitasi (`services/html.js`) sebelum ditampilkan, termasuk tulisan milik akun lain. Jangan menulis `elemen.innerHTML = htmlPengguna`; gunakan `sanitize()`.
- Editor tetap contenteditable. React tidak mengelola isinya (React akan menimpanya); komponen hanya memegang status, draf, dan dialog.
- `dangerouslySetInnerHTML` selalu memakai objek stabil (useMemo/konstanta). Objek baru tiap render membuat React menulis ulang innerHTML dan menghapus ketikan.
- Tanggal selalu memakai zona waktu perangkat (`core/text.js` `isoDay`), bukan UTC.
- Tag opsional dan bebas dibuat penulis (`lib/core/tags.js`). Tag "ada" selama ada tulisan yang memakainya; halaman `/tag` menampilkan semuanya, slider beranda hanya yang teratas.
- Pilihan minggu ini = tulisan `featured` di `src/lib/data/seed.js`.
- Gambar AI memakai Puter.js (dimuat lazy, tanpa kunci API; pengguna mungkin diminta masuk akun Puter). Opsional di `.env`: `VITE_SPASI_PUTER_MODEL` untuk memilih model, atau `VITE_SPASI_AI_ENDPOINT` untuk memakai backend gambar sendiri.

## Backend (opsional)

Bawaan: data di `localStorage` (tanpa server). Untuk akun, tulisan, suka, dan tanggapan sungguhan ada backend PocketBase di
`backend/` (lihat `backend/README.md`). Aktifkan dengan `VITE_SPASI_BACKEND=pocketbase` (salin `.env.example` ke `.env.local`).
`src/lib/services/store/index.js` meneruskan ke `local.js` (localStorage) atau, saat variabel itu diset, ke `remote/` (PocketBase);
bentuk API keduanya sama, sehingga halaman hampir tidak berubah. Pada versi server, `posts.publish` dan `auth.remove` asinkron,
dan `boot()` memuat sesi + daftar tulisan sebelum aplikasi digambar.

Deploy ke Cloudflare Pages (frontend) + server API terpisah: lihat `docs/DEPLOY-CLOUDFLARE.md`.
