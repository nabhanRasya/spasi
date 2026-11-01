/* Impor tulisan contoh (src/lib/data/seed.js) ke PocketBase sebagai akun sistem "Spasi".
   Pakai:  PB_URL=http://127.0.0.1:8090 PB_ADMIN_EMAIL=… PB_ADMIN_PASSWORD=… npm run seed
   Idempoten: slug yang sudah ada dilewati. Butuh Node 18+ (fetch bawaan). */
import { SEED } from '../../src/lib/data/seed.js';

const BASE = (process.env.PB_URL || 'http://127.0.0.1:8090').replace(/\/+$/, '');
const { PB_ADMIN_EMAIL: adminEmail, PB_ADMIN_PASSWORD: adminPassword } = process.env;
const SYSTEM_EMAIL = process.env.PB_SEED_EMAIL || 'redaksi@spasi.local';

if (!adminEmail || !adminPassword) {
  console.error('Isi PB_ADMIN_EMAIL dan PB_ADMIN_PASSWORD (akun superuser PocketBase).');
  process.exit(1);
}

async function call(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: token } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${JSON.stringify(data)}`);
  return data;
}

const { token } = await call('/api/collections/_superusers/auth-with-password', {
  method: 'POST',
  body: { identity: adminEmail, password: adminPassword }
});

// akun sistem sebagai pemilik tulisan contoh
let owner;
const found = await call(`/api/collections/users/records?filter=${encodeURIComponent(`email="${SYSTEM_EMAIL}"`)}`, { token });
if (found.items.length) owner = found.items[0];
else {
  const password = crypto.randomUUID() + crypto.randomUUID(); // tak dipakai untuk masuk
  owner = await call('/api/collections/users/records', {
    method: 'POST',
    token,
    body: { email: SYSTEM_EMAIL, password, passwordConfirm: password, name: 'Spasi', verified: true, emailVisibility: false }
  });
}

let made = 0;
for (const p of SEED) {
  const exists = await call(`/api/collections/posts/records?filter=${encodeURIComponent(`slug="${p.slug}"`)}&fields=id`, { token });
  if (exists.items.length) continue;
  await call('/api/collections/posts/records', {
    method: 'POST',
    token,
    body: {
      slug: p.slug,
      title: p.title,
      tag: p.tag || '',
      excerpt: p.excerpt || '',
      body: p.body,
      author: owner.id,
      author_name: p.author || 'Spasi',
      anon: false,
      featured: !!p.featured,
      published_at: new Date(`${p.date}T08:00:00+07:00`).toISOString().replace('T', ' ')
    }
  });
  made++;
}
console.log(`Selesai: ${made} tulisan contoh diimpor, ${SEED.length - made} sudah ada.`);
