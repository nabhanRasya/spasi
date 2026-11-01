# Backend Spasi (PocketBase)

Satu binary PocketBase kustom (Go) + hook JavaScript + migrasi. Arsitektur lengkap dan alasannya ada di dokumen
"Arsitektur Backend Spasi (PocketBase)"; ringkasnya:

```
backend/
  main.go                 binary: sanitasi HTML (bluemonday) + hitung kata, jsvm (pb_hooks) dan migrasi tetap aktif
  go.mod                  jalankan `go mod tidy` sekali
  pb_migrations/          skema: users (+field), posts, drafts, likes, saves, reads, comments, media, reports + aturan akses
  pb_hooks/
    lib.js                fungsi bersama (slugify, normalizeTag, recount, …)
    posts.pb.js           slug unik, nama penulis, verifikasi email, penghitung suka/tanggapan, laporan, kuota unggah, cron media
    routes.pb.js          /api/spasi/tags, /sitemap.xml, /feed.xml, /tulisan/:slug (meta SEO untuk crawler)
  scripts/import-seed.mjs impor tulisan contoh dari src/lib/data/seed.js
  Caddyfile               reverse proxy produksi (HTTPS, CSP, batasi /_/, noindex halaman privat)
```

## Jalankan di komputer sendiri

Butuh Go 1.24+ dan Node 18+.

```bash
# 1. backend
cd backend
go mod tidy
go run . serve                 # http://127.0.0.1:8090  (panel admin: /_/  → buat akun superuser)
                               # migrasi di pb_migrations/ diterapkan otomatis saat start

# 2. frontend, di terminal lain, dari folder proyek
cp .env.example .env.local     # VITE_SPASI_BACKEND=pocketbase
npm install
npm run dev                    # proxy Vite meneruskan /api dan /_ ke 8090

# 3. (opsional) isi tulisan contoh
PB_ADMIN_EMAIL=you@example.com PB_ADMIN_PASSWORD=… npm run seed
```

Tanpa `.env.local`, aplikasi tetap memakai localStorage seperti sebelumnya (tanpa server).

## Yang harus diatur di panel admin (`/_/`)

1. **Settings → Mail**: SMTP (Resend/Postmark/SES). Menerbitkan tulisan dan menanggapi butuh email terverifikasi.
2. **Settings → Application**: aktifkan *rate limiting* (login/daftar ~5 per menit, pembuatan rekaman ~30 per menit) dan atur header IP tepercaya bila di belakang proxy.
3. **Collections → users → Options**: pasang templat email berbahasa Indonesia; (opsional) aktifkan Google OAuth2.
4. **Settings → Backups**: jadwal harian, simpan 7, tujuan S3/R2.

## Produksi

```bash
cd backend && CGO_ENABLED=0 go build -o spasi-backend .
./spasi-backend serve --http=127.0.0.1:8090          # dikelola systemd
```

Variabel lingkungan hook: `SPASI_SITE_URL` (mis. `https://spasi.id`, untuk sitemap/canonical) dan `SPASI_DIST`
(folder `dist/` hasil `npm run build`; bawaan `../../dist` relatif ke `pb_hooks`). `Caddyfile` memuat sisanya.

## Yang belum diuji (jujur)

Kode di folder ini ditulis tanpa bisa menjalankan Go maupun PocketBase (sandbox tanpa akses registry). Yang sudah diuji:
logika klien terhadap SDK tiruan (`npm run test:remote`) dan sintaks berkas JS. Yang **perlu Anda uji** sebelum dipakai:

- `go mod tidy && go run . serve` berhasil, dan migrasi menghasilkan sembilan koleksi.
- Nama API hook/migrasi sesuai versi PocketBase yang Anda kunci (dokumentasi yang saya cocokkan: v0.41.1):
  `new Collection`, `fields.add(new TextField …)`, `e.hasSuperuserAuth()`, `$app.findFirstRecordByFilter`, `$app.findRecordsByFilter`,
  `DynamicModel`/`arrayOf`, `e.html`/`e.string`/`e.response.header()`, `cronAdd`, filter `@yesterday`.
- Aturan akses: uji dengan dua akun (A tidak bisa mengubah/menghapus data B; tamu tidak bisa menulis).
- Sanitasi: kirim `<img src=x onerror=…>` dan `<a href="javascript:…">` lewat `POST /api/collections/posts/records`; hasilnya harus bersih.
- `GET /tulisan/<slug>` mengembalikan `index.html` dengan `<title>` dan meta tulisan (butuh `npm run build` dulu).

## Batas yang diketahui

- Daftar tulisan dimuat sekali (hingga 500 ringkasan) lalu disaring di klien. Di atas itu, pindahkan penyaringan/pencarian ke filter server.
- Token login disimpan di localStorage oleh SDK (bukan cookie HttpOnly); penangkalnya sanitasi server + CSP.
- Gambar editor masih data URI (belum diunggah ke koleksi `media`); koleksi, kuota, dan sanitizer-nya sudah siap. Pengalihan `images.js` ke unggahan adalah langkah berikutnya.
- Gambar AI masih lewat Puter.js (`services/ai.js`); rute server `/api/spasi/ai/image` belum dibuat.
