# Deploy: frontend di Cloudflare Pages, API di server sendiri

```
pembaca ──► spasi.id  (Cloudflare Pages: dist/ + Functions untuk SEO)
               │  fetch lintas domain
               └────► api.spasi.id (server: Caddy → PocketBase + pb_data)
```

Cloudflare Pages hanya menyajikan berkas statis dan Functions. PocketBase butuh proses yang menyala terus dan disk
untuk SQLite, jadi ia berjalan di server terpisah (VPS kecil, Fly.io dengan volume, Railway, dsb.).

## 1. API (PocketBase)

1. Di server: bangun biner (`cd backend && CGO_ENABLED=0 go build -o spasi-backend .`), jalankan `./spasi-backend serve --http=127.0.0.1:8090` lewat systemd.
2. Arahkan DNS `api.spasi.id` ke server; pakai `backend/Caddyfile.api` (HTTPS otomatis).
3. Panel admin `https://api.spasi.id/_/`: **Settings → Application → Application URL** = `https://api.spasi.id`; SMTP, rate limit (Trusted proxy header `X-Forwarded-For`), backup (lihat `backend/README.md`).
4. CORS: PocketBase mengizinkan semua asal secara bawaan. Untuk membatasi: jalankan dengan `--origins=https://spasi.id`.

## 2. Frontend (Cloudflare Pages)

Dashboard Cloudflare → **Workers & Pages → Create → Pages → Connect to Git** (atau unggah lewat `wrangler pages deploy dist`).

| Pengaturan | Nilai |
| --- | --- |
| Framework preset | Vite |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | (kosong) |

**Environment variables** (Production dan Preview):

| Nama | Nilai | Dipakai oleh |
| --- | --- | --- |
| `NODE_VERSION` | `22` | build |
| `VITE_SPASI_BACKEND` | `pocketbase` | build (memilih adapter PocketBase) |
| `VITE_PB_URL` | `https://api.spasi.id` | build (alamat API untuk SDK) |
| `PB_URL` | `https://api.spasi.id` | Functions SEO saat berjalan |
| `SITE_URL` | `https://spasi.id` | Functions SEO (canonical, sitemap) |

`VITE_*` dibakukan ke dalam hasil build, jadi ubah lalu **build ulang** bila alamat API berganti. `PB_URL`/`SITE_URL` dibaca saat permintaan.

Lalu: **Custom domains → spasi.id**.

## 3. Yang sudah disiapkan di repo

- `public/_headers`: CSP, HSTS, `noindex` untuk `/akun /tulis /masuk /daftar /tersimpan`, cache berkas ber-hash.
  **Ganti `https://api.spasi.id`** di CSP (`img-src`, `connect-src`) bila domain API Anda lain.
- `functions/tulisan/[slug].js`, `functions/sitemap.xml.js`, `functions/feed.xml.js`: pengganti hook SEO PocketBase.
  Pembaca tetap menerima SPA; crawler dan pratinjau tautan menerima HTML dengan judul, meta, JSON-LD, dan isi tulisan.
- SPA fallback: Pages otomatis menyajikan `index.html` untuk jalur tak dikenal selama tidak ada `404.html`.

## 4. Yang perlu diketahui

- **Email verifikasi**: tautan bawaan PocketBase mengarah ke `https://api.spasi.id/_/#/auth/confirm-verification/…`. Jadi `/_/` di API harus tetap terbuka
  sampai aplikasi punya halaman `/verifikasi` sendiri (belum dibuat).
- **Gambar tulisan**: saat ini masih data URI. Begitu dipindah ke koleksi `media`, URL gambar harus absolut ke API
  (`https://api.spasi.id/api/files/media/…`); pola sanitizer di `backend/main.go` (`mediaSrc`) dan `IMG_SRC` di `services/html.js` perlu disesuaikan.
- **Hook `/tulisan/:slug` di PocketBase** tidak terpakai pada susunan ini (ia membaca `dist/` dari disk server). Biarkan atau hapus dari `routes.pb.js`.
- Pengujian lokal Functions: `npx wrangler pages dev dist --binding PB_URL=http://127.0.0.1:8090`.
