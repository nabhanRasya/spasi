# Laporan bug & refactor — Spasi

Semua temuan di bawah diuji ulang setelah perbaikan: `npm test` (54 tes), `npm run build`, dan uji asap
di jsdom yang merender 14 rute (24 pemeriksaan). Kolom **Bukti** menjelaskan seberapa pasti temuannya:

- **Diuji** = bug direproduksi dulu di kode asli, lalu dipastikan hilang setelah perbaikan.
- **Baca kode** = terlihat jelas dari kode, tetapi tidak bisa direproduksi di jsdom (butuh peramban sungguhan).

## A. Bug yang diperbaiki

| # | Tingkat | Masalah | Lokasi lama | Bukti |
|---|---|---|---|---|
| 1 | **Tinggi** | **Tulisan baru berjudul sama menimpa tulisan lain**, bahkan milik akun lain. `publish()` menganggap slug yang sudah ada sebagai "edit". Contoh: A menerbitkan "Catatan", lalu B menerbitkan "Catatan" → tulisan A hilang. | `services/store.js` `posts.publish` | Diuji |
| 2 | **Tinggi** | **Tulisan milik akun lain dirender tanpa sanitasi** (`post.mine ? sanitize(body) : body`). Di localStorage cuma terjadi pada perangkat bersama, tetapi begitu ada database, setiap tulisan orang lain menjadi stored XSS. | `pages/Post.jsx` | Diuji |
| 3 | **Tinggi** | Sanitizer mem-parse HTML dengan `elemen.innerHTML = html` pada dokumen hidup. Peramban langsung memuat `<img src=x onerror=…>` walau elemennya belum dipasang, jadi skrip jalan **sebelum** dibersihkan. Diganti `DOMParser` (dokumen mati). | `services/html.js` | Baca kode |
| 4 | Sedang | **Tanggal bergeser sehari di WIB**: tulisan yang terbit jam 00.00–06.59 WIB tampil bertanggal kemarin (`toISOString()` memakai UTC). | `core/text.js` `isoDay` | Diuji |
| 5 | Rendah | Setelah masuk/daftar, aplikasi menavigasi **dua kali** (efek + `.then`), riwayat berisi entri ganda sehingga tombol Kembali "macet". | `pages/Auth.jsx` | Diuji |
| 6 | Rendah | `Modal` memanggil `onClose` juga saat induk yang menutupnya, jadi efek samping tertutup dijalankan dua kali. | `components/Modal.jsx` | Diuji |
| 7 | Rendah | `feed.counts` menghasilkan `NaN` untuk topik yang tidak ada di daftar `TAGS`. | `core/feed.js` | Diuji |
| 8 | Rendah | `useBody('a  b')` (spasi ganda) melempar `SyntaxError` dan menjatuhkan halaman. | `hooks/usePage.js` | Diuji |
| 9 | Rendah | `ai.generate` mengabaikan `signal` yang sudah dibatalkan sebelum dipanggil. | `services/ai.js` | Diuji |
| 10 | Rendah | Gambar yang selesai diproses **setelah** pindah halaman memanggil editor yang sudah dilepas → `TypeError`. | `editor/engine.js`, `pages/Write.jsx` | Baca kode |
| 11 | Rendah | Tombol **"urungkan"** pada simpanan memakai `toggle`; bila tulisan sudah disimpan lagi, "urungkan" malah menghapusnya. Kini memakai `saved.add/remove` yang idempoten. | `pages/Tersimpan.jsx` | Baca kode |
| 12 | Rendah | Penghitung kata tidak memisahkan `<figcaption>` dari paragraf berikutnya (kata menempel, hitungan kurang). | `services/html.js` | Diuji |

### Performa

- `posts.all()` mem-parse **DOM** tiap tulisan di setiap pemanggilan (hitung kata). Kini `words()` memakai regex murni (hasilnya sama persis dengan versi DOM pada contoh uji) dan bisa dites di Node.
- `Home` membaca & mem-parse daftar simpanan dari localStorage **sekali per tulisan** per render. Kini sekali per render (`Set`).

## B. Dicatat, sengaja tidak diubah

Ini keputusan produk atau baru benar-benar bisa diselesaikan dengan backend (lihat `PANDUAN-DATABASE.md`).

| Hal | Mengapa penting | Rencana |
|---|---|---|
| Autentikasi di peramban: hash SHA-256 tanpa salt acak, sesi hanya objek di localStorage | Siapa pun yang membuka DevTools bisa menyamar jadi pengguna lain | Pindah ke server (panduan §6) |
| Draf, suka, simpan, dan jejak baca milik **perangkat**, bukan akun | Pengguna lain di perangkat yang sama melihat draf itu. Ini disengaja (boleh menulis dulu, masuk belakangan), jadi tidak diubah | Per-akun di database; gabungkan data tamu saat masuk |
| Angka suka palsu (`likeCount` dari hash slug) | Pembaca mengira itu hitungan nyata | Hitungan dari database |
| Gambar AI kini lewat Puter.js (pihak ketiga, model "User-Pays": pengguna bisa diminta masuk akun Puter) | Deskripsi dikirim ke Puter; bergantung pada layanan mereka | Untuk produksi: endpoint backend sendiri (`VITE_SPASI_AI_ENDPOINT`, sudah didukung) |
| `sitemap.xml` hanya berisi 3 halaman; `siteUrl` masih `https://spasi.id` | Tulisan tidak terindeks; domain salah bila lupa diganti | Sitemap dinamis dari database; isi `seo.config.js` |
| Dua komponen `Scramble` (`components/` dan `landing/components/`) dengan API berbeda | Duplikasi | Satukan saat landing dirapikan |
| Hitungan kata di editor (`plainWords`, tanpa keterangan gambar) beda tipis dengan `words()` (termasuk keterangan) | Angka "kata" di editor dan di halaman baca bisa selisih | Pilih satu aturan |

## C. Perubahan lanjutan

- Kartu profil penulis di atas kolom tanggapan dihapus (baris "selesai · N menit baca" tetap ada).
- Pembuat gambar AI diganti dari Pollinations ke **Puter.js** (`services/ai.js`). Skrip Puter dimuat malas (lazy) saat gambar pertama dibuat, jadi tidak membebani halaman lain. Model bisa dipilih lewat `VITE_SPASI_PUTER_MODEL`.

- **Spasi di atas komentar** dirapatkan: bagian penutup "selesai · N menit baca" dihapus dan jarak bawah isi tulisan dikecilkan, jadi garis pemisah komentar langsung menyusul isi. (Nilai jaraknya `--s2` di `styles/article.css`: `.art-grid` dan `.cmts`; mudah diubah bila terasa terlalu rapat. Saya tidak bisa melihat tampilannya di peramban.)
- **Tag opsional & buatan penulis.** Tulisan boleh tanpa tag; di dialog terbit penulis memilih dari usulan atau mengetik tag baru (otomatis dinormalkan: huruf kecil, tanpa simbol, 2–24 karakter; `semua`/`tersimpan` ditolak). Tidak ada daftar tag terpisah: tag ada selama ada tulisan yang memakainya. Aturannya ada di `lib/core/tags.js` (murni, diuji).
- **Slider tag di beranda**: tag bawaan + tag buatan penulis terbanyak (maks. 8), tag yang sedang dipilih selalu tampil, dan tombol **"lainnya →"** di ujung menuju halaman baru **`/tag`** (daftar semua tag, dikelompokkan "dibuat penulis" dan "topik bawaan", dengan pencarian dan jumlah tulisan). Tag di halaman tulisan kini tautan ke daftar yang tersaring.

## D. Ringkasan refactor

**Satu perubahan besar: `window.Spasi` (namespace global + IIFE) → ES module.**

- Dulu: urutan impor di `lib/index.js` menentukan hasil, dependensi tersembunyi, dan setiap berkas menulis `S.xxx`. Dua hook (`useReadProgress`, `useTextSize`) mengimpor nama yang **tidak pernah ada** — tinggal menunggu ada yang mengimpornya hingga build gagal.
- Kini: tiap berkas mengimpor persis yang dipakainya (`import { posts, auth } from '…/store/index.js'`). Editor dan IDE bisa "lompat ke definisi".
- `services/store.js` (142 baris, 9 objek) dipecah per topik di `services/store/` (`posts`, `drafts`, `marks`, `auth`, `comments`, …). **Nama & bentuk data tidak berubah**, jadi pemanggil nyaris tak berubah. Inilah titik yang nanti diganti saat pakai database.
- `auth`, `images`, `ai` memakai `async/await` (bukan rantai `.then`); `html.js` dipecah jadi fungsi kecil bernama.
- Kode dirapikan dengan Prettier (`npm run format`): dulu banyak baris berisi 5–10 pernyataan sekaligus.
- Dihapus: `hooks/useTextSize.js`, `hooks/useReveal.js` (tak terpakai), `hooks/useReadProgress.js` lama (rusak, diganti versi yang dulu tertanam di `Post.jsx`).
- Tes dipindah ke ES module (`tests/core.test.mjs`) dan ditambah dari 41 menjadi 54 (zona waktu, `counts`, `words`, dan `store` dengan localStorage palsu).

Yang **tidak** diubah: tampilan (CSS), perilaku halaman, router buatan sendiri, mesin editor `contenteditable`, algoritma `sky.js`/`moth.js`.

## E. Perbaikan lanjutan

- **`noindex` untuk halaman privat**: hook `useNoIndex()` (`hooks/usePage.js`) mengganti `<meta name="robots">` menjadi `noindex,nofollow` selama `/akun`, `/tulis`, `/masuk`, `/daftar`, `/tersimpan`, dan halaman 404 tampil, lalu mengembalikannya. Catatan: ini berlaku setelah JS berjalan; untuk jaminan penuh tambahkan header `X-Robots-Tag` di server/hosting.
