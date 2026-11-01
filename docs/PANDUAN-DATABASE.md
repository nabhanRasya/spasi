# Panduan lanjutan: dari localStorage ke database

Hari ini semua data ada di peramban (`localStorage`). Panduan ini menunjukkan jalan paling pendek ke aplikasi
yang datanya ada di server: akun sungguhan, tulisan yang bisa dibaca semua orang, suka & tanggapan yang nyata.

Kabar baiknya: seluruh akses data sudah terkumpul di **`src/lib/services/store/`**. Komponen tidak tahu data
disimpan di mana. Jadi migrasi = mengganti isi folder itu + sedikit penyesuaian karena data menjadi *asinkron*.

## 1. Pilih jalur

| | A. Backend-as-a-service (mis. Supabase) | B. API sendiri (Node + PostgreSQL) |
|---|---|---|
| Waktu sampai jalan | Hari | 1–2 minggu |
| Auth, penyimpanan gambar, keamanan baris | Sudah ada | Dibuat/dirakit sendiri |
| Kendali & portabilitas | Terbatas pada penyedia | Penuh |
| Cocok untuk | Prototype → rilis awal | Produk jangka panjang, aturan bisnis rumit |

Skema SQL di §2 berlaku untuk kedua jalur (keduanya PostgreSQL). Mulai dari A bukan jebakan: tabelnya bisa
dibawa ke B nanti. Bagian lain panduan ini ditulis untuk B karena paling banyak yang perlu dijelaskan.

## 2. Skema PostgreSQL

```sql
create extension if not exists citext;

create table users (
  id          uuid primary key default gen_random_uuid(),
  email       citext unique not null,
  name        text not null check (char_length(name) between 1 and 30),
  password_hash text not null,                 -- argon2id, BUKAN SHA-256 (lihat §6)
  created_at  timestamptz not null default now()
);

create table posts (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  author_id   uuid not null references users(id) on delete cascade,
  author_name text not null,                   -- nama saat terbit ("Anonim" bila anonim)
  title       text not null check (char_length(title) between 3 and 120),
  tag         text check (tag is null or (char_length(tag) between 2 and 24 and tag not in ('semua','tersimpan'))),
                                               -- OPSIONAL & dibuat bebas oleh penulis; simpan sudah dinormalkan (huruf kecil)
  excerpt     text not null default '',
  body_html   text not null,                   -- sudah disanitasi SERVER (lihat §5)
  words       int  not null default 0,
  featured    boolean not null default false,
  published_at timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  search      tsvector generated always as (
                to_tsvector('indonesian', coalesce(title,'') || ' ' || coalesce(excerpt,''))
              ) stored
);
create index posts_published_idx on posts (published_at desc);
create index posts_tag_idx       on posts (tag, published_at desc) where tag is not null;
create index posts_author_idx    on posts (author_id, published_at desc);
create index posts_search_idx    on posts using gin (search);

create table drafts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  source_post uuid references posts(id) on delete set null,   -- bila mengedit tulisan terbit
  title       text not null default '',
  html        text not null default '',
  tag         text, excerpt text,
  updated_at  timestamptz not null default now()
);
create index drafts_user_idx on drafts (user_id, updated_at desc);

create table comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references posts(id) on delete cascade,
  user_id    uuid not null references users(id) on delete cascade,
  body       text not null check (char_length(body) between 2 and 600),
  created_at timestamptz not null default now()
);
create index comments_post_idx on comments (post_id, created_at);

-- suka & simpan: satu baris per (pengguna, tulisan). Primary key mencegah suka ganda.
create table likes (
  user_id uuid references users(id) on delete cascade,
  post_id uuid references posts(id) on delete cascade,
  primary key (user_id, post_id)
);
create table saves (
  user_id uuid references users(id) on delete cascade,
  post_id uuid references posts(id) on delete cascade,
  saved_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
```

Catatan desain:
- `'indonesian'` ada di PostgreSQL bawaan; bila tidak tersedia, pakai `'simple'`.
- Jumlah suka = `select count(*) from likes where post_id = $1` (tambahkan kolom `like_count` + trigger bila lambat).
- Tulisan milik pengguna yang dihapus → `on delete cascade` membereskan komentar, suka, simpanan. Itulah "hapus akun" yang benar.
- Tag tidak punya tabel sendiri: sama seperti di aplikasi sekarang, sebuah tag "ada" selama ada tulisan yang memakainya. Daftar tag untuk slider dan halaman `/tag`: `select tag, count(*) from posts where tag is not null group by tag order by count(*) desc, tag`. Normalisasi (`core/tags.js` → `normalize`) diulang di server.
- Gambar **jangan** disimpan di kolom (lihat §5).

## 3. Kontrak API

Semua respons JSON. Kode galat konsisten: `400` validasi, `401` belum masuk, `403` bukan pemilik, `404`, `409` bentrok, `429` terlalu sering.

| Metode & jalur | Fungsi | Auth |
|---|---|---|
| `POST /api/auth/signup` · `login` · `logout` | Akun & sesi | – |
| `GET /api/me` | Pengguna yang sedang masuk | – (`null` bila tamu) |
| `GET /api/posts?tag=&q=&author=&cursor=` | Daftar tulisan (halaman 10) | – |
| `GET /api/tags` | Semua tag + jumlah tulisan (slider & halaman `/tag`) | – |
| `GET /api/posts/:slug` | Satu tulisan + jumlah suka + `liked/saved` milik saya | – |
| `POST /api/posts` | Terbitkan baru (slug unik dibuat server) | ✔ |
| `PUT /api/posts/:slug` | Edit (hanya pemilik) | ✔ |
| `DELETE /api/posts/:slug` | Hapus (hanya pemilik) | ✔ |
| `GET/PUT/DELETE /api/drafts[/:id]` | Draf milik saya | ✔ |
| `GET/POST /api/posts/:slug/comments`, `DELETE /api/comments/:id` | Tanggapan | ✔ untuk menulis/hapus |
| `PUT/DELETE /api/posts/:slug/like` · `/save` | Suka & simpan (idempoten) | ✔ |
| `POST /api/uploads` | Minta URL unggah gambar (§5) | ✔ |

Aturan yang **wajib** di server, jangan dipercayakan ke React: kepemilikan (`author_id = user.id`), validasi
panjang/format, sanitasi HTML, batas laju, dan slug unik (`409` atau tambah `-2`, `-3` seperti `posts.publish` sekarang).

## 4. Mengubah lapisan data di aplikasi

### 4.1 Prinsip

Sekarang: `posts.all()` mengembalikan data **langsung** → dipakai saat render.
Dengan server: data datang lewat jaringan → butuh status *memuat / galat / berhasil* dan cache.

Pakai **TanStack Query** (`@tanstack/react-query`) agar tidak menulis semuanya sendiri:

```bash
npm i @tanstack/react-query
```

```jsx
// main.jsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } });
createRoot(root).render(<QueryClientProvider client={queryClient}><App /></QueryClientProvider>);
```

### 4.2 Klien API kecil (menggantikan `ls`)

```js
// src/lib/services/api.js
export class ApiError extends Error {
  constructor(status, code, message) { super(message || code); this.status = status; this.code = code; }
}

export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'include',                          // kirim cookie sesi
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data?.code, data?.message);
  return data;
}
```

### 4.3 Satu modul store, versi API

Pertahankan **nama fungsi yang sama**, tetapi kini mengembalikan *Promise*:

```js
// src/lib/services/store/posts.js  (versi API)
import { api } from '../api.js';

export const posts = {
  list: ({ tag, q, author, cursor } = {}) =>
    api(`/posts?${new URLSearchParams(Object.entries({ tag, q, author, cursor }).filter(([, v]) => v))}`),
  find: (slug) => api(`/posts/${encodeURIComponent(slug)}`),
  publish: (post, replacing = false) =>
    replacing ? api(`/posts/${post.slug}`, { method: 'PUT', body: post }) : api('/posts', { method: 'POST', body: post }),
  remove: (slug) => api(`/posts/${encodeURIComponent(slug)}`, { method: 'DELETE' })
};
```

Hook yang dipakai halaman (satu berkas, `src/hooks/queries.js`):

```js
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { posts, saved, auth } from '../lib/services/store/index.js';

export const usePosts = (filter) => useQuery({ queryKey: ['posts', filter], queryFn: () => posts.list(filter) });
export const usePost  = (slug)   => useQuery({ queryKey: ['post', slug],   queryFn: () => posts.find(slug) });
export const useMe    = ()       => useQuery({ queryKey: ['me'], queryFn: auth.me, staleTime: Infinity });

export function useToggleSave(slug) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (on) => (on ? saved.add(slug) : saved.remove(slug)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['post', slug] })
  });
}
```

### 4.4 Yang berubah di komponen

| Sekarang (sinkron) | Nanti (asinkron) |
|---|---|
| `const all = useMemo(() => posts.all(), [ver])` | `const { data, isPending, error } = usePosts(filter)` |
| `useStore()` memicu render ulang | Hapus. Cache TanStack yang mengurus; setelah mutasi: `invalidateQueries` |
| `if (!post) return <Hilang />` | Tiga keadaan: `isPending` → kerangka; `error?.status === 404` → hilang; sisanya tampilkan |
| `posts.publish(...)` langsung hasilnya | `await publish.mutateAsync(...)`; tangani `409`/`400` dan tampilkan pesan |
| Filter/pencarian dikerjakan `core/feed.js` di klien | Dikerjakan SQL (`where tag = … and search @@ websearch_to_tsquery(…)`); `core/feed.js` tinggal `parseQuery/toQuery` |

Fungsi **murni** di `lib/core/` (teks, tanggal, validasi akun/editor, model kartu bagikan) tetap dipakai apa adanya
di klien, dan validasinya sebaiknya dipakai ulang di server (`composer.readiness`, `account.validate`) agar aturannya satu.

Urutan kerja yang aman (aplikasi selalu bisa dijalankan):
1. Backend + skema + `GET /posts` saja. Ganti `Home` dan `Post` ke `usePosts/usePost`. Tulisan contoh dipindah dari `seed.js` ke database.
2. Auth (§6) → `useMe`, `Auth.jsx`, `Layout.jsx`.
3. Menulis: `drafts` (autosave tiap 650 ms → `PUT /drafts/:id`) lalu `publish`.
4. Suka, simpan, tanggapan.
5. Hapus kode localStorage yang tersisa; `seed.js` jadi fixture tes.

## 5. Keamanan konten & gambar

**HTML tulisan.** Sanitasi di klien (`services/html.js`) hanya kenyamanan. Server wajib menyanitasi lagi
sebelum menyimpan, karena klien bisa dilewati. Di Node pakai `sanitize-html` dengan daftar putih yang sama:

```js
import sanitizeHtml from 'sanitize-html';
export const clean = (html) => sanitizeHtml(html, {
  allowedTags: ['p','h2','h3','blockquote','hr','ul','ol','li','strong','em','a','br','figure','figcaption','img'],
  allowedAttributes: { a: ['href'], img: ['src', 'alt', 'width', 'height'], figure: ['data-ai'] },
  allowedSchemes: ['https', 'mailto'],
  transformTags: { a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' }) }
});
```
Tambahkan juga header `Content-Security-Policy` (tanpa `unsafe-inline` untuk skrip) sebagai lapis kedua.

**Gambar.** Sekarang berupa data URI di dalam HTML (≤ ~220 KB × 6 per tulisan). Di database itu memboroskan ruang dan lambat.
Gantilah dengan unggahan ke object storage (S3 / Cloudflare R2 / Supabase Storage):

1. Klien memanggil `images.fromBlob()` (tetap: mengecilkan di peramban), lalu `POST /api/uploads` → server membalas *presigned URL*.
2. Klien `PUT` blob ke URL itu; server mencatat URL publik `https://cdn.…/abc.webp`.
3. Ubah dua tempat: `IMG_SRC` di `services/html.js` (izinkan hanya host CDN Anda), dan `fromBlob()` mengembalikan `{ src: url, w, h }`.
4. Migrasi tulisan lama: skrip sekali jalan yang menemukan `data:image/…`, mengunggahnya, dan mengganti `src`.

## 6. Autentikasi yang benar

Kode sekarang (`store/auth.js`) hanya cocok untuk demo. Untuk produksi:

- **Kata sandi:** `argon2id` (paket `argon2`) di server, bukan SHA-256 di peramban.
- **Sesi:** cookie `HttpOnly; Secure; SameSite=Lax` berisi id sesi acak (tabel `sessions`) atau JWT berumur pendek. Jangan simpan token di localStorage.
- **CSRF:** `SameSite=Lax` + cek header `Origin` pada metode selain GET.
- **Batas laju:** login, daftar, dan unggah (mis. `@fastify/rate-limit`): 5 percobaan login/menit/IP+email.
- **Email:** verifikasi email dan "lupa kata sandi" (token sekali pakai, kedaluwarsa 1 jam). Atau pakai penyedia siap pakai (Supabase Auth, Clerk, Auth.js).
- Di klien, `auth.js` menjadi tipis: `signup/login/logout` memanggil API, `user()` membaca cache `['me']`.

## 7. SEO untuk tulisan sungguhan

Aplikasi ini SPA: crawler tanpa JS hanya melihat `<noscript>`. Setelah tulisan ada di database:

- **Cepat:** endpoint `GET /sitemap.xml` dinamis dari tabel `posts`, dan `noindex` untuk `/akun`, `/tulis`, `/masuk`, `/daftar`.
- **Benar:** render di server. Dua jalur: (a) Vite SSR / prerender per tulisan, (b) pindah ke **Next.js** (App Router). `core/`, `services/html.js`, dan komponen halaman bisa dipindah hampir tanpa ubahan; yang diganti hanya `router.jsx` dan `hooks/queries.js`.
- Isi `<title>`, `description`, dan `og:*` per tulisan dari `title`/`excerpt`. Ganti `siteUrl` di `seo.config.js`.

## 8. Migrasi data pengguna yang sudah ada

Data prototype hanya ada di peramban masing-masing. Dua pilihan jujur:
- **Abaikan** (jika masih pengujian internal), atau
- Tambahkan tombol sementara "Pindahkan data ke akun" yang mengirim isi `spasi.posts`, `spasi.drafts`, `spasi.saved` ke `POST /api/import` (server memvalidasi & menyanitasi seperti biasa, lalu klien menghapus kuncinya). Kata sandi lama **tidak** bisa dipindah (hash-nya tak kompatibel); minta pengguna membuat sandi baru.

## 9. Operasional

- **Migrasi skema:** pakai alat migrasi (`node-pg-migrate`, Drizzle Kit, Prisma Migrate), simpan di git. Jangan ubah tabel manual di produksi.
- **Konfigurasi:** rahasia (URL database, kunci S3) hanya di variabel lingkungan server; klien hanya boleh melihat variabel berawalan `VITE_`.
- **Cadangan:** pencadangan otomatis harian + uji pemulihan sekali.
- **CORS:** bila API di domain lain, izinkan hanya domain situs dan `credentials: true`; lebih mudah bila satu domain (`/api` di-proxy).
- **Pengujian:** tambahkan Vitest + Testing Library untuk komponen, dan uji API dengan database tes. Tes `core/` dan `store/` yang ada sudah bisa dijalankan di Node tanpa peramban.
- **Pemantauan:** log galat server (Sentry), dan metrik dasar (latensi, 5xx).

## 10. Daftar periksa sebelum rilis

- [ ] Kata sandi di-hash dengan argon2id; sesi lewat cookie HttpOnly
- [ ] Server menyanitasi `body_html`, memvalidasi semua masukan, dan memeriksa kepemilikan di setiap `PUT/DELETE`
- [ ] Batas laju aktif pada login, daftar, unggah, komentar
- [ ] Gambar di object storage, bukan data URI
- [ ] Sitemap dinamis, `noindex` pada halaman privat, `siteUrl` benar
- [ ] CSP aktif, HTTPS wajib, cadangan database teruji
- [ ] Kebijakan privasi (`/tentang`) diperbarui: data kini disimpan di server
