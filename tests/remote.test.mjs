/* Tes lapisan data PocketBase (src/lib/services/store/remote/) dengan SDK palsu di memori: tanpa server, tanpa npm.
   Menyalin src/lib ke folder sementara dan memasang paket 'pocketbase' tiruan di sana.  Jalankan: npm run test:remote */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'spasi-remote-'));
fs.cpSync(path.join(ROOT, 'src', 'lib'), path.join(tmp, 'src', 'lib'), { recursive: true });
fs.mkdirSync(path.join(tmp, 'node_modules', 'pocketbase'), { recursive: true });
fs.writeFileSync(path.join(tmp, 'package.json'), '{"type":"module"}');
fs.writeFileSync(
  path.join(tmp, 'node_modules', 'pocketbase', 'package.json'),
  '{"name":"pocketbase","type":"module","main":"index.js","exports":"./index.js"}'
);
fs.writeFileSync(
  path.join(tmp, 'node_modules', 'pocketbase', 'index.js'),
  `
let seq = 0;
const nid = () => 'id' + String(++seq).padStart(6, '0');
const err = (status, response) => Object.assign(new Error('pb ' + status), { status, response });
const match = (r, expr) => expr.split(' && ').every((c) => { const m = /^(\\w+) = "(.*)"$/.exec(c.trim()); return m ? String(r[m[1]]) === m[2] : true; });
export default class PocketBase {
  constructor() {
    this.db = { users: [], posts: [], likes: [], saves: [], comments: [], drafts: [], reads: [] };
    this.calls = [];
    const self = this;
    this.authStore = {
      record: null, isValid: false,
      clear() { this.record = null; this.isValid = false; },
      onChange() {}
    };
  }
  autoCancellation() {}
  filter(expr, params) { return expr.replace(/\\{:(\\w+)\\}/g, (_, k) => JSON.stringify(params[k])); }
  collection(name) {
    const pb = this, rows = () => pb.db[name];
    const pick = (r, fields) => (fields ? Object.fromEntries(fields.split(',').filter((f) => f in r).map((f) => [f, r[f]])) : { ...r });
    return {
      async getList(page, per, o = {}) { const items = rows().slice().reverse().slice(0, per).map((r) => pick(r, o.fields)); return { items, totalItems: items.length }; },
      async getFullList(o = {}) { return rows().filter((r) => !o.filter || match(r, o.filter)).map((r) => pick(r, o.fields)); },
      async getFirstListItem(f, o = {}) { const r = rows().find((x) => match(x, f)); if (!r) throw err(404, {}); return pick(r, o.fields); },
      async create(data) {
        pb.calls.push(['create', name, data]);
        if (name === 'users') {
          if (rows().some((u) => u.email === data.email)) throw err(400, { data: { email: { code: 'validation_not_unique' } } });
        }
        if ((name === 'likes' || name === 'saves') && rows().some((r) => r.user === data.user && r.post === data.post)) throw err(400, { data: {} });
        const r = { id: nid(), created: '2026-10-30 10:00:00.000Z', updated: '2026-10-30 10:00:00.000Z', ...data };
        if (name === 'posts') {
          let slug = data.slug, n = 2;
          while (rows().some((p) => p.slug === slug)) slug = data.slug + '-' + n++; // seperti hook server
          Object.assign(r, { slug, published_at: '2026-10-30 10:00:00.000Z', words: 3, like_count: 0, comment_count: 0, featured: false });
        }
        if (name === 'comments') r.author_name = pb.authStore.record.name;
        rows().push(r);
        return { ...r };
      },
      async update(id, data) {
        const r = rows().find((x) => x.id === id); if (!r) throw err(404, {});
        Object.assign(r, data);
        if (name === 'users' && pb.authStore.record && pb.authStore.record.id === id) pb.authStore.record = { ...r };
        return { ...r };
      },
      async delete(id) { const i = rows().findIndex((x) => x.id === id); if (i < 0) throw err(404, {}); rows().splice(i, 1); },
      async authWithPassword(email, password) {
        const u = rows().find((x) => x.email === email && x.password === password);
        if (!u) throw err(400, { message: 'Failed to authenticate.' });
        pb.authStore.record = { ...u }; pb.authStore.isValid = true; return { record: u };
      },
      async authRefresh() { return {}; },
      async requestVerification() { return true; },
      async subscribe() { return () => {}; }
    };
  }
}
`
);

globalThis.localStorage = (() => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
})();

const L = (f) => import(path.join(tmp, 'src', 'lib', f));
const { pb } = await L('services/store/remote/pb.js');
const store = await L('services/store/remote/index.js');
const { onStoreError } = await L('services/notify.js');

const errors = [];
onStoreError((m) => errors.push(m));
const tick = () => new Promise((r) => setTimeout(r, 5));

let passed = 0;
const t = async (name, fn) => {
  try {
    await fn();
    passed++;
    console.log('  ok  ' + name);
  } catch (e) {
    console.log('  GAGAL  ' + name + '\n' + (e.stack || e));
    process.exitCode = 1;
  }
};

console.log('store (PocketBase palsu)');
const other = { id: 'u_other', email: 'b@x.id', name: 'Budi', password: 'x', created: '2026-10-01 00:00:00.000Z' };
pb.db.users.push(other);
pb.db.posts.push(
  { id: 'p1', slug: 'satu', title: 'Satu', tag: 'esai', excerpt: 'e1', author: 'u_other', author_name: 'Budi', words: 120, like_count: 4, comment_count: 1, published_at: '2026-10-08 01:00:00.000Z', body: '<p>isi satu</p>' },
  { id: 'p2', slug: 'dua', title: 'Dua', tag: '', excerpt: 'e2', author: 'u_other', author_name: 'Anonim', words: 10, like_count: 0, comment_count: 0, published_at: '2026-10-09 01:00:00.000Z', body: '<p>isi dua</p>' }
);

await store.boot();

await t('boot memuat ringkasan tulisan tanpa isi, terbaru dulu', () => {
  const all = store.posts.all();
  assert.deepEqual(all.map((p) => p.slug), ['dua', 'satu']);
  assert.equal(all[1].hasBody, false);
  assert.equal(all[1].likeCount, 4);
  assert.equal(all[1].minutes, 1);
  assert.equal(all[1].mine, false);
});

await t('load memuat isi lengkap satu kali', async () => {
  assert.equal(store.posts.status('satu'), 'idle');
  await store.posts.load('satu');
  assert.equal(store.posts.find('satu').hasBody, true);
  assert.equal(store.posts.find('satu').body, '<p>isi satu</p>');
  await store.posts.load('tidak-ada');
  assert.equal(store.posts.status('tidak-ada'), 'missing');
});

await t('tamu: suka/simpan ditolak dengan pesan, tidak berubah', () => {
  assert.equal(store.likes.toggle('satu'), false);
  assert.equal(store.saved.toggle('satu'), false);
  assert.equal(errors.length, 2);
  assert.match(errors[0], /Masuk dulu/);
  assert.equal(store.comments.add('satu', 'halo'), null);
});

await t('daftar: email ganda → "exists"; sandi salah → "bad"', async () => {
  await assert.rejects(store.auth.signup('Lain', 'B@x.id ', 'rahasia123'), { message: 'exists' });
  await assert.rejects(store.auth.login('b@x.id', 'salah'), { message: 'bad' });
});

await t('daftar lalu masuk; auth.user() stabil dan berisi nama/email', async () => {
  await store.auth.signup('Sari', 'Sari@X.id ', 'rahasia123');
  const u = store.auth.user();
  assert.equal(u.email, 'sari@x.id');
  assert.equal(u.name, 'Sari');
  assert.equal(store.auth.user(), u); // objek sama → aman jadi dependensi efek React
});

await t('suka optimistis: hitungan naik seketika, server menyusul, bisa dibatalkan', async () => {
  assert.equal(store.likes.toggle('satu'), true);
  assert.equal(store.posts.find('satu').likeCount, 5);
  assert.equal(store.likes.has('satu'), true);
  await tick();
  assert.equal(pb.db.likes.length, 1);
  assert.equal(store.likes.toggle('satu'), false);
  assert.equal(store.posts.find('satu').likeCount, 4);
  await tick();
  assert.equal(pb.db.likes.length, 0);
});

await t('suka–batal cepat berturut-turut tetap konsisten (operasi berurutan)', async () => {
  store.likes.toggle('dua');
  store.likes.toggle('dua');
  store.likes.toggle('dua');
  await tick();
  await tick();
  assert.equal(store.likes.has('dua'), true);
  assert.equal(pb.db.likes.filter((l) => l.post === 'p2').length, 1);
  store.likes.toggle('dua');
  await tick();
  await tick();
  assert.equal(pb.db.likes.length, 0);
});

await t('simpan: toggle, urutan, dan muat ulang dari server', async () => {
  assert.equal(store.saved.toggle('satu'), true);
  assert.equal(store.saved.toggle('dua'), true);
  await tick();
  assert.deepEqual(store.saved.all(), ['satu', 'dua']);
  assert.equal(pb.db.saves.length, 2);
  await store.saved.load();
  assert.deepEqual(store.saved.all(), ['satu', 'dua']);
});

await t('terbit: slug final dari server (judul kembar → -2), mine = true', async () => {
  const mk = (title) => ({ slug: 'catatan', title, tag: 'esai', author: 'Sari', excerpt: 'x', body: '<p>satu dua tiga</p>' });
  const a = await store.posts.publish(mk('Catatan'));
  const b = await store.posts.publish(mk('Catatan'));
  assert.equal(a.slug, 'catatan');
  assert.equal(b.slug, 'catatan-2');
  assert.equal(a.mine, true);
  assert.equal(store.posts.find('catatan-2').owner, 'sari@x.id');
  const sent = pb.calls.filter((c) => c[0] === 'create' && c[1] === 'posts').pop()[2];
  assert.equal(sent.anon, false);
  assert.equal(sent.author, store.auth.user().id);
});

await t('terbit anonim: anon = true; mengedit memakai update dan slug tetap', async () => {
  const anon = await store.posts.publish({ slug: 'rahasia', title: 'Rahasia', tag: '', author: 'Anonim', excerpt: 'x', body: '<p>a</p>' });
  assert.equal(pb.db.posts.find((p) => p.slug === 'rahasia').anon, true);
  const edited = await store.posts.publish({ ...anon, title: 'Rahasia baru', body: '<p>b</p>' }, true);
  assert.equal(edited.slug, 'rahasia');
  assert.equal(store.posts.find('rahasia').title, 'Rahasia baru');
  assert.equal(pb.db.posts.filter((p) => p.slug.startsWith('rahasia')).length, 1);
});

await t('tanggapan optimistis: muncul seketika, id sementara diganti id asli, tanpa ganda', async () => {
  const c = store.comments.add('satu', 'bagus sekali');
  assert.match(c.id, /^tmp-/);
  assert.equal(store.comments.list('satu').some((x) => x.text === 'bagus sekali'), true);
  await tick();
  const list = store.comments.list('satu').filter((x) => x.text === 'bagus sekali');
  assert.equal(list.length, 1);
  assert.doesNotMatch(list[0].id, /^tmp-/);
  assert.equal(list[0].email, 'sari@x.id'); // dipakai Post.jsx untuk tombol hapus milik sendiri
  store.comments.remove('satu', list[0].id);
  await tick();
  assert.equal(pb.db.comments.length, 0);
});

await t('draf: tersimpan lokal; masuk menarik draf akun yang belum ada di perangkat', async () => {
  const id = store.drafts.newId();
  assert.equal(store.drafts.save({ id, title: 'Draf', html: '<p>x</p>' }), true);
  assert.equal(store.drafts.all().length, 1);
  pb.db.drafts.push({ id: 'dr1', owner: store.auth.user().id, client_id: 'd_remote', title: 'Dari akun', body: '<p>y</p>', tag: '', excerpt: '', source_post: '', updated: '2026-10-30 09:00:00.000Z' });
  const { adoptDrafts } = await L('services/store/remote/drafts.js');
  await adoptDrafts();
  assert.deepEqual(store.drafts.all().map((d) => d.id).sort(), [id, 'd_remote'].sort());
  assert.equal(store.drafts.find('d_remote').html, '<p>y</p>');
  assert.equal(pb.db.drafts.some((d) => d.client_id === id), true); // draf perangkat terunggah
});

await t('keluar: penanda dan draf lokal dibersihkan, tulisan publik tetap', async () => {
  store.auth.logout();
  assert.equal(store.auth.user(), null);
  assert.deepEqual(store.likes.all(), []);
  assert.deepEqual(store.saved.all(), []);
  assert.equal(store.drafts.all().length, 0);
  assert.equal(store.posts.find('catatan').mine, false);
  assert.equal(store.posts.all().length >= 4, true);
});

await t('hapus akun: pemilik dikeluarkan dan galat server dilaporkan', async () => {
  await store.auth.login('sari@x.id', 'rahasia123');
  const before = errors.length;
  await store.auth.remove();
  assert.equal(store.auth.user(), null);
  assert.equal(pb.db.users.some((u) => u.email === 'sari@x.id'), false);
  assert.equal(errors.length, before);
});

console.log(`\n${passed} lulus${process.exitCode ? ', ADA YANG GAGAL' : ', 0 gagal'}`);
fs.rmSync(tmp, { recursive: true, force: true });
