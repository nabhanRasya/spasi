/* Tes lapisan core/, data/, dan store — jalankan: npm test  (tanpa dependensi, tanpa peramban).
   Tes terakhir memastikan core/ tetap murni: tidak menyentuh DOM, URL, atau penyimpanan. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

process.env.TZ = 'Asia/Jakarta'; // tes tanggal harus sama di semua mesin (dan menjaga bug "geser sehari" tidak kembali)

const JS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'lib');
const load = (f) => import(path.join(JS, f));
const [util, tagsMod, feed, account, composer, shareModel, sky, moth, reader, seed] =
  await Promise.all(
    [
      'core/text.js',
      'core/tags.js',
      'core/feed.js',
      'core/account.js',
      'core/composer.js',
      'core/share-model.js',
      'core/sky.js',
      'core/moth.js',
      'core/reader.js',
      'data/seed.js'
    ].map(load)
  );
const S = {
  util,
  tags: tagsMod,
  feed,
  account,
  composer,
  shareModel,
  sky,
  moth,
  reader,
  data: seed
};

let pass = 0,
  fail = 0;
function test(name, fn) {
  try {
    fn();
    pass++;
    console.log('  ok  ' + name);
  } catch (e) {
    fail++;
    console.log('  GAGAL  ' + name + '\n' + String(e.stack).split('\n').slice(0, 4).join('\n'));
  }
}

const post = (o) =>
  Object.assign(
    {
      slug: 's',
      title: 'Judul',
      tag: 'esai',
      author: 'A',
      excerpt: 'ringkas',
      ts: 1760000000000,
      minutes: 1,
      featured: false,
      mine: false
    },
    o
  );

console.log('text');
test('slugify membuang aksen & simbol, memotong 60, bawaan tanpa-judul', () => {
  assert.equal(S.util.slugify('  Héllo, Dünya!! '), 'hello-dunya');
  assert.equal(S.util.slugify('???'), 'tanpa-judul');
  assert.equal(S.util.slugify('a'.repeat(100)).length, 60);
});
test('esc melepas lima karakter HTML', () =>
  assert.equal(
    S.util.esc(`<a href="x">'&'</a>`),
    '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;'
  ));
test('tanggal berbahasa Indonesia', () => {
  assert.equal(S.util.dateLong('2026-10-08'), '8 oktober 2026');
  assert.equal(S.util.dateShort('2026-09-29'), '29 sep');
});
test('ago memakai satuan yang pas', () => {
  const now = 1e12;
  assert.equal(S.util.ago(now - 10e3, now), 'baru saja');
  assert.equal(S.util.ago(now - 5 * 60e3, now), '5 menit lalu');
  assert.equal(S.util.ago(now - 3 * 3600e3, now), '3 jam lalu');
  assert.equal(S.util.ago(now - 2 * 86400e3, now), '2 hari lalu');
});
test('readMinutes minimal 1, 200 kata per menit', () => {
  assert.equal(S.util.readMinutes(0), 1);
  assert.equal(S.util.readMinutes(200), 1);
  assert.equal(S.util.readMinutes(201), 2);
});

console.log('feed');
test('parseQuery ↔ toQuery', () => {
  const f = S.feed.parseQuery('?tag=esai&q=kopi%20pagi&a=Rara');
  assert.deepEqual(f, { tag: 'esai', q: 'kopi pagi', a: 'Rara' });
  assert.equal(S.feed.toQuery(f), 'tag=esai&q=kopi+pagi&a=Rara');
  assert.equal(S.feed.toQuery(S.feed.parseQuery('')), '');
});
test('matches: topik, penulis, tersimpan, dan semua kata pencarian harus cocok', () => {
  const p = post({
    title: 'Kopi dingin',
    excerpt: 'pagi hari',
    author: 'Bimo',
    tag: 'keseharian',
    slug: 'k'
  });
  const no = () => false,
    yes = () => true;
  assert.ok(S.feed.matches(p, { tag: 'semua', q: 'kopi pagi', a: '' }, no));
  assert.ok(!S.feed.matches(p, { tag: 'semua', q: 'kopi malam', a: '' }, no));
  assert.ok(!S.feed.matches(p, { tag: 'esai', q: '', a: '' }, no));
  assert.ok(!S.feed.matches(p, { tag: 'semua', q: '', a: 'Rara' }, no));
  assert.ok(!S.feed.matches(p, { tag: 'tersimpan', q: '', a: '' }, no));
  assert.ok(S.feed.matches(p, { tag: 'tersimpan', q: '', a: '' }, yes));
});
test('view: pilihan minggu ini keluar dari daftar, hanya tanpa filter; milik sendiri tak jadi pilihan', () => {
  const a = post({ slug: 'a', featured: true }),
    b = post({ slug: 'b' }),
    c = post({ slug: 'c', featured: true, mine: true });
  const v = S.feed.view([c, a, b], { tag: 'semua', q: '', a: '' }, 10, () => false);
  assert.equal(v.feat.slug, 'a');
  assert.deepEqual(
    v.rows.map((p) => p.slug),
    ['c', 'b']
  );
  assert.equal(v.total, 2);
  assert.equal(v.shown, 3);
  const f = S.feed.view([c, a, b], { tag: 'esai', q: '', a: '' }, 10, () => false);
  assert.equal(f.feat, null);
  assert.equal(f.total, 3);
});
test('view: limit & sisa', () => {
  const ps = Array.from({ length: 13 }, (_, i) => post({ slug: 'p' + i }));
  const v = S.feed.view(ps, { tag: 'semua', q: '', a: '' }, 10, () => false);
  assert.equal(v.rows.length, 10);
  assert.equal(v.rest, 3);
});
test('chipNames menambah "tersimpan" hanya bila perlu', () => {
  const t = S.data.TAGS;
  assert.ok(!S.feed.chipNames({ tersimpan: 0 }, t, 'semua').includes('tersimpan'));
  assert.ok(S.feed.chipNames({ tersimpan: 2 }, t, 'semua').includes('tersimpan'));
  assert.ok(S.feed.chipNames({ tersimpan: 0 }, t, 'tersimpan').includes('tersimpan'));
});
test('greeting di batas jam', () => {
  const g = S.feed.greeting;
  assert.deepEqual([3, 4, 10, 11, 14, 15, 17, 18, 23].map(g), [
    'Selamat malam',
    'Selamat pagi',
    'Selamat pagi',
    'Selamat siang',
    'Selamat siang',
    'Selamat sore',
    'Selamat sore',
    'Selamat malam',
    'Selamat malam'
  ]);
});
test('welcomeSteps menghitung langkah selesai', () => {
  const w = S.feed.welcomeSteps({ reads: 1, saved: 0, drafts: 0, hasMine: true, firstSlug: 'x y' });
  assert.equal(w.done, 2);
  assert.equal(w.steps[0].href, '/tulisan/x%20y');
  assert.equal(
    S.feed.welcomeSteps({ reads: 0, saved: 0, drafts: 0, hasMine: false }).steps[0].href,
    '/baca'
  );
});
test('emptyCopy', () => {
  assert.match(S.feed.emptyCopy({ tag: 'tersimpan', q: '' }).heading, /simpan/);
  assert.equal(S.feed.emptyCopy({ tag: 'semua', q: 'a b' }).writeHref, '/tulis?title=a%20b');
});

console.log('reader');
test('likeCount stabil per slug, +1 bila disukai', () => {
  assert.equal(S.reader.likeCount('abc', false), S.reader.likeCount('abc', false));
  assert.equal(S.reader.likeCount('abc', true) - S.reader.likeCount('abc', false), 1);
});
test('related: topik sama dulu, tulisan ini tak ikut', () => {
  const ps = [
    post({ slug: 'x', tag: 'puisi' }),
    post({ slug: 'me', tag: 'esai' }),
    post({ slug: 'y', tag: 'esai' })
  ];
  assert.deepEqual(
    S.reader.related(ps, ps[1], 2).map((p) => p.slug),
    ['y', 'x']
  );
});
test('progress: awal, tengah, selesai', () => {
  const start = S.reader.progress({ top: 360, height: 3000, bottom: 3360 }, 900, 5);
  assert.equal(start.p, 0);
  assert.match(start.rail, /^0% · 5 menit lagi$/);
  assert.equal(S.reader.progress({ top: -10000, height: 3000, bottom: -7000 }, 900, 5).done, true);
  assert.equal(
    S.reader.progress({ top: -10000, height: 3000, bottom: -7000 }, 900, 5).rail,
    'selesai ✓'
  );
  assert.equal(S.reader.progress({ top: 0, height: 100, bottom: 100 }, 900, 1).p, 0); // kolom pendek: tak membagi dengan nol/negatif
});
test('nextSize: batas & putar', () => {
  const r = S.reader;
  assert.equal(r.nextSize(0, '-1', 3), 0);
  assert.equal(r.nextSize(3, '1', 3), 3);
  assert.equal(r.nextSize(3, 'cycle', 3), 0);
  assert.equal(r.nextSize(1, 'cycle', 3), 2);
});

console.log('account');
test('safeNext hanya menerima halaman relatif situs', () => {
  const n = S.account.safeNext;
  assert.equal(n('/tulis?id=d1'), '/tulis?id=d1');
  assert.equal(n('/akun'), '/akun');
  [
    'https://evil.com',
    '//evil.com',
    'javascript:alert(1)',
    '../x',
    'a/b',
    '/\\evil.com',
    '',
    null
  ].forEach((x) => assert.equal(n(x), '/baca', String(x)));
});
test('validate: urutan galat & batas kata sandi', () => {
  const v = S.account.validate;
  assert.deepEqual(v('signup', { hasName: true, name: ' ', email: 'a@b.co', pass: '12345678' }), {
    key: 'name',
    field: 'name'
  });
  assert.deepEqual(v('signup', { hasName: true, name: 'A', email: 'bukan', pass: '12345678' }), {
    key: 'email',
    field: 'email'
  });
  assert.deepEqual(v('signup', { hasName: true, name: 'A', email: 'a@b.co', pass: '1234567' }), {
    key: 'pw',
    field: 'pw'
  });
  assert.equal(v('login', { hasName: false, email: 'a@b.co', pass: 'x' }), null);
  assert.deepEqual(v('login', { hasName: false, email: 'a@b.co', pass: '' }), {
    key: 'pw',
    field: 'pw'
  });
});
test('explain memetakan kode galat ke pesan & kolom', () => {
  assert.equal(S.account.explain(new Error('exists')).field, 'email');
  assert.equal(S.account.explain(new Error('bad')).field, 'pw');
  assert.equal(S.account.explain(new Error('aneh')).message, 'Terjadi kesalahan. Coba lagi.');
  assert.equal(S.account.explain(null).field, null);
});
test('canRename', () => {
  assert.ok(!S.account.canRename('  ', 'A'));
  assert.ok(!S.account.canRename('A ', 'A'));
  assert.ok(S.account.canRename('B', 'A'));
});

console.log('composer');
test('slashQuery & filterCommands', () => {
  const c = S.composer;
  assert.equal(c.slashQuery('/'), '');
  assert.equal(c.slashQuery('/JUD'), 'jud');
  assert.equal(c.slashQuery('a/'), null);
  assert.equal(c.slashQuery('/panjangsekalikatanya'), null);
  assert.equal(c.filterCommands('').length, c.COMMANDS.length);
  assert.deepEqual(
    c.filterCommands('jud').map((i) => i.id),
    ['h2']
  );
  assert.deepEqual(c.filterCommands('zzz'), []);
});
test('markdownShortcut', () => {
  const m = S.composer.markdownShortcut;
  assert.equal(m('# '), 'h2');
  assert.equal(m('## '), 'h2');
  assert.equal(m('### '), 'h3');
  assert.equal(m('#### '), null);
  assert.equal(m('> '), 'quote');
  assert.equal(m('- '), 'ul');
  assert.equal(m('* '), 'ul');
  assert.equal(m('1. '), 'ol');
  assert.equal(m('##\u00a0'), 'h2'); // spasi tak-putus dari peramban
  assert.equal(m('halo '), null);
  assert.equal(m('-'), null);
});
test('normalizeLink', () => {
  const n = S.composer.normalizeLink;
  assert.deepEqual(n('contoh.com'), { ok: true, href: 'https://contoh.com' });
  assert.deepEqual(n('http://a.id/x'), { ok: true, href: 'http://a.id/x' });
  assert.deepEqual(n('a@b.co'), { ok: true, href: 'mailto:a@b.co' });
  assert.equal(n('localhost:3000').ok, true);
  assert.equal(n('bukan tautan').ok, false);
  assert.equal(n('').msg, 'Tulis alamatnya dulu.');
  assert.equal(n('nodot').ok, false);
  assert.equal(n('javascript:alert(1)').ok, false);
});
test('excerptFrom: pendek utuh, panjang dipotong rapi ≤151', () => {
  const e = S.composer.excerptFrom;
  assert.equal(e('  halo   dunia '), 'halo dunia');
  const long =
    'Kalimat pertama yang cukup panjang untuk diuji dengan baik sekali. ' + 'kata '.repeat(60);
  const out = e(long);
  assert.ok(out.endsWith('…'));
  assert.ok(out.length <= 151);
});
test('countWords & isEmptyDraft', () => {
  assert.equal(S.composer.countWords(['satu dua', '', '  tiga  ']), 3);
  assert.ok(S.composer.isEmptyDraft('', 0, false));
  assert.ok(!S.composer.isEmptyDraft('', 0, true));
});
test('readiness: judul dulu, lalu jumlah kata', () => {
  const r = S.composer.readiness;
  assert.equal(r('ab', 100).reason, 'title');
  assert.equal(r('abc', 39).reason, 'words');
  assert.match(r('abc', 39).message, /39 kata.*minimal 40/);
  assert.deepEqual(r('abc', 40), { ok: true });
});
test('validateMeta, authorLabel, authorDefaults', () => {
  const c = S.composer;
  // tag opsional: kosong lolos, nama penulis tetap wajib bila tidak anonim
  assert.deepEqual(c.validateMeta({ tag: '', anon: false, name: ' ' }).tag, '');
  assert.ok(c.validateMeta({ tag: '', anon: false, name: ' ' }).name);
  assert.ok(c.validateMeta({ tag: 'semua', anon: true, name: '' }).tag);
  assert.deepEqual(c.validateMeta({ tag: 'esai', anon: true, name: '' }), { tag: '', name: '' });
  assert.equal(c.authorLabel(true, 'X'), 'Anonim');
  assert.equal(c.authorLabel(false, '  '), '…');
  assert.deepEqual(c.authorDefaults({ author: 'Anonim' }, { name: 'N', anon: false }), {
    name: 'N',
    anon: true
  });
  assert.deepEqual(c.authorDefaults({ author: 'Rara' }, { name: 'N', anon: true }), {
    name: 'Rara',
    anon: false
  });
  assert.deepEqual(c.authorDefaults(null, { name: 'N', anon: true }), { name: 'N', anon: true });
});
test('buildPost: baru vs. memperbarui (slug, tanggal, pemilik tetap)', () => {
  const f = {
    title: '  Judul   Baru ',
    tag: 'esai',
    anon: false,
    name: 'Rara',
    html: '<p>x</p>',
    excerpt: '',
    autoExcerpt: 'otomatis',
    ownerEmail: 'r@x.id'
  };
  const n = S.composer.buildPost(f, null, 123);
  assert.equal(n.slug, 'judul-baru');
  assert.equal(n.title, 'Judul Baru');
  assert.equal(n.excerpt, 'otomatis');
  assert.equal(n.ts, 123);
  assert.equal(n.owner, 'r@x.id');
  const old = { slug: 'lama', owner: 'o@x.id', date: '2026-01-01', ts: 5 };
  const u = S.composer.buildPost(Object.assign({}, f, { excerpt: ' pilihan  sendiri ' }), old, 999);
  assert.deepEqual(
    [u.slug, u.owner, u.date, u.ts, u.excerpt],
    ['lama', 'o@x.id', '2026-01-01', 5, 'pilihan sendiri']
  );
});

console.log('share-model');
test('normalize menolak nilai rusak, memakai bawaan', () => {
  const n = S.shareModel.normalize({
    fmt: 'bukan',
    fit: 'x',
    imgm: 'y',
    sky: { color: 'merah', a: 999, dens: -3, moon: 'matahari', seed: 12345 }
  });
  assert.equal(n.fmt, '4x5');
  assert.equal(n.fit, 'fixed');
  assert.equal(n.imgm, 'first');
  assert.deepEqual(n.sky, {
    on: true,
    color: 'auto',
    a: 90,
    dens: 1,
    moon: 'sabit',
    shoot: true,
    seed: 345
  });
  assert.equal(S.shareModel.normalize(null).blocks, 3);
  assert.equal(
    S.shareModel.normalize({ sky: { color: '#AABBCC', on: false } }).sky.color,
    '#AABBCC'
  );
});
test('toggleElement tak pernah menyembunyikan semua elemen', () => {
  const M = S.shareModel;
  let hide = [];
  M.ELEMENTS.forEach((e) => {
    hide = M.toggleElement(hide, e[0]);
  });
  assert.equal(hide.length, M.ELEMENTS.length - 1);
  assert.deepEqual(M.toggleElement(['title'], 'title'), []);
});
test('titleFontSize mengecil untuk judul panjang, membesar di kartu lebar', () => {
  const t = S.shareModel.titleFontSize;
  assert.ok(t(10, '4x5') > t(100, '4x5'));
  assert.ok(t(10, '16x9') > t(10, '4x5'));
});
test('plan: sampul vs. sesuai urutan', () => {
  const b = [
    { h: '<p>1</p>' },
    { h: '<figure>', c: '<figure cover>', fig: true },
    { h: '<p>2</p>' }
  ];
  const M = S.shareModel;
  const a = M.plan(b, { imgm: 'first', blocks: 5 }, true);
  assert.equal(a.cover, '<figure cover>');
  assert.equal(a.total, 2);
  assert.equal(a.count, 2);
  const i = M.plan(b, { imgm: 'inline', blocks: 2 }, true);
  assert.equal(i.cover, '');
  assert.equal(i.total, 3);
  assert.equal(i.count, 2);
  assert.equal(M.plan(b, { imgm: 'first', blocks: 1 }, false).cover, '');
  assert.equal(M.plan([], { imgm: 'first', blocks: 3 }, true).total, 1);
});
test('tujuan berbagi menyusun alamat yang di-encode', () => {
  const u = S.shareModel.DESTINATIONS.x.url('Halo & selamat', 'https://a.id/p?x=1&y=2');
  assert.ok(
    u.startsWith(
      'https://twitter.com/intent/tweet?text=Halo%20%26%20selamat&url=https%3A%2F%2Fa.id%2Fp%3Fx%3D1%26y%3D2'
    )
  );
  assert.deepEqual(S.shareModel.menuKeys(false).includes('system'), false);
  assert.ok(S.shareModel.menuKeys(true).includes('system'));
});

console.log('sky & moth');
const rect = [60, 100, 400, 140];
const skyArgs = {
  W: 540,
  H: 675,
  cw: 5.4,
  LH: 11,
  rects: [rect],
  slug: 'tulisan',
  fmt: '4x5',
  sky: { dens: 3, moon: 'sabit', shoot: true, seed: 0 }
};
test('sky deterministik; benih berbeda → hasil berbeda', () => {
  const a = S.sky.build(skyArgs),
    b = S.sky.build(skyArgs);
  assert.equal(a, b);
  assert.notEqual(
    a,
    S.sky.build(Object.assign({}, skyArgs, { sky: Object.assign({}, skyArgs.sky, { seed: 1 }) }))
  );
});
test('sky tidak menimpa area teks', () => {
  const rows = S.sky.build(skyArgs).split('\n'),
    cw = 5.4,
    LH = 11;
  for (let y = Math.ceil(rect[1] / LH); y <= Math.floor(rect[3] / LH); y++)
    for (let x = Math.ceil(rect[0] / cw); x <= Math.floor(rect[2] / cw); x++)
      assert.equal(rows[y][x], ' ', `sel ${x},${y} harus kosong`);
});
test('sky: bulan & bintang jatuh bisa dimatikan', () => {
  const k = (o) =>
    S.sky.build(Object.assign({}, skyArgs, { sky: Object.assign({}, skyArgs.sky, o) }));
  assert.ok(k({}).includes('#')); // bulan sabit memakai '#'
  assert.ok(!k({ moon: 'none', shoot: false }).includes('#'));
  assert.ok(!k({ moon: 'none', shoot: false }).includes('/'));
});
test('moth: bingkai 46×20 dan berubah menurut sudut sayap', () => {
  const f = S.moth.render(S.moth.REST, 1, 0),
    lines = f.split('\n');
  assert.equal(lines.length, 20);
  assert.ok(lines.every((l) => l.length === 46));
  assert.notEqual(f, S.moth.render(1.1, 1, 0));
  assert.notEqual(f, S.moth.render(S.moth.REST, -1, 0));
});

console.log('data');
test('data contoh: slug unik, topik valid, tanggal ISO', () => {
  const d = S.data,
    slugs = d.SEED.map((p) => p.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  d.SEED.forEach((p) => {
    assert.ok(d.TAGS.includes(p.tag), p.slug);
    assert.match(p.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(p.title && p.body && p.excerpt);
  });
  assert.ok(d.PROMPTS.length > 0);
});

console.log('perbaikan bug');
test('tanggal memakai zona waktu perangkat (WIB jam 01.00 tetap tanggal yang sama)', () => {
  const ts = new Date('2026-10-15T01:00:00+07:00').getTime();
  assert.equal(S.util.isoDay(ts), '2026-10-15');
  assert.equal(S.util.dayLong(ts), '15 oktober 2026');
});
test('counts: topik di luar daftar tidak menjadi NaN', () => {
  const c = S.feed.counts([{ slug: 'a', tag: 'lama' }], S.data.TAGS, () => false);
  assert.equal(c.lama, 1);
  assert.equal(c.esai, 0);
});
test('words/stripTags: tanpa DOM, entitas & akhir blok tidak menempelkan kata', () => {
  assert.equal(S.util.words('<p>satu dua</p><p>tiga&nbsp;empat &amp; lima</p>'), 6);
  assert.equal(
    S.util.words('<figure><img alt="a>b"><figcaption>kapsi</figcaption></figure><p>lanjut</p>'),
    2
  );
  assert.equal(S.util.words(''), 0);
  assert.equal(S.util.stripTags('a<br>b'), 'a b');
});

console.log('tags');
test('normalize: huruf kecil, tanpa simbol/#, spasi rapi, maks 24', () => {
  const t = S.tags;
  assert.equal(t.normalize('  #Kopi   Pagi! '), 'kopi pagi');
  assert.equal(t.normalize('Café-Malam'), 'café-malam');
  assert.equal(t.normalize('x'.repeat(40)).length, 24);
  assert.equal(t.normalize('!!!'), '');
});
test('validate: kosong boleh; 1 huruf, "semua", "tersimpan" ditolak', () => {
  const t = S.tags;
  assert.equal(t.validate(''), '');
  assert.equal(t.validate('   '), '');
  assert.equal(t.validate('kopi'), '');
  assert.ok(t.validate('a'));
  assert.ok(t.validate('###'));
  assert.ok(t.validate('Semua'));
  assert.ok(t.validate('#tersimpan'));
});
test('list: bawaan dulu (tetap, walau 0), buatan penulis terbanyak dulu, tulisan tanpa tag diabaikan', () => {
  const posts = [
    { tag: 'kopi' },
    { tag: 'hujan' },
    { tag: 'kopi' },
    { tag: 'esai' },
    { tag: '' },
    {}
  ];
  const l = S.tags.list(posts, ['esai', 'puisi']);
  assert.deepEqual(
    l.map((e) => e.name),
    ['esai', 'puisi', 'kopi', 'hujan']
  );
  assert.deepEqual(
    l.map((e) => e.count),
    [1, 0, 2, 1]
  );
  assert.deepEqual(
    l.map((e) => e.custom),
    [false, false, true, true]
  );
});
test('slider: dibatasi, tag aktif di luar batas tetap tampil, menu bukan tag', () => {
  const entries = ['a1', 'b2', 'c3', 'd4'].map((name) => ({ name }));
  assert.deepEqual(S.tags.slider(entries, 'semua', 2), ['a1', 'b2']);
  assert.deepEqual(S.tags.slider(entries, 'd4', 2), ['a1', 'b2', 'd4']);
  assert.deepEqual(S.tags.slider(entries, 'tersimpan', 2), ['a1', 'b2']);
});
test('search: potongan nama, tanpa membedakan huruf besar/kecil', () => {
  const e = [{ name: 'kopi pagi' }, { name: 'hujan' }];
  assert.deepEqual(
    S.tags.search(e, ' KOP ').map((x) => x.name),
    ['kopi pagi']
  );
  assert.equal(S.tags.search(e, '').length, 2);
});
test('buatPost tanpa tag & feed tidak rusak oleh tulisan tanpa tag', () => {
  const post = S.composer.buildPost(
    {
      title: 'Judul',
      tag: '',
      anon: true,
      name: '',
      html: '<p>x</p>',
      excerpt: '',
      autoExcerpt: 'x'
    },
    null,
    1
  );
  assert.equal(post.tag, '');
  const c = S.feed.counts([post, { ...post, tag: 'kopi' }], ['esai'], () => false);
  assert.equal(c.kopi, 1);
  assert.equal(c.esai, 0);
  assert.equal(c[''], undefined);
  assert.ok(S.feed.matches(post, { tag: 'semua', q: 'judul', a: '' }, () => false));
  assert.equal(
    S.feed.matches(post, { tag: 'kopi', q: '', a: '' }, () => false),
    false
  );
  const rel = S.reader.related(
    [
      { slug: 'b', tag: '' },
      { slug: 'c', tag: 'x' }
    ],
    { slug: 'a', tag: '' },
    2
  );
  assert.deepEqual(
    rel.map((p) => p.slug),
    ['b', 'c']
  ); // tanpa tag ≠ "topik sama"
});

console.log('store (localStorage palsu)');
const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => void mem.set(k, String(v)),
  removeItem: (k) => void mem.delete(k)
};
globalThis.window = Object.assign(new EventTarget(), { crypto: globalThis.crypto });
const store = await load('services/store/index.js');
const reset = () => mem.clear();
const slowTest = async (name, fn) => {
  try {
    await fn();
    pass++;
    console.log('  ok  ' + name);
  } catch (e) {
    fail++;
    console.log('  GAGAL  ' + name + '\n' + String(e.stack).split('\n').slice(0, 4).join('\n'));
  }
};

await slowTest('saved: add/remove idempoten, toggle melapor keadaan baru', () => {
  reset();
  store.saved.add('a');
  store.saved.add('a');
  assert.deepEqual(store.saved.all(), ['a']);
  assert.equal(store.saved.toggle('a'), false);
  assert.equal(store.saved.toggle('a'), true);
  store.saved.remove('zzz');
  assert.deepEqual(store.saved.all(), ['a']);
});
await slowTest('posts.publish: slug baru dibuat unik; edit mengganti tulisan yang sama', () => {
  reset();
  const base = {
    title: 'T',
    tag: 'esai',
    author: 'A',
    owner: 'a@x.id',
    date: '2026-10-10',
    ts: 1760000000000,
    excerpt: 'x',
    body: '<p>isi</p>'
  };
  const p1 = store.posts.publish({ ...base, slug: 'judul' });
  const p2 = store.posts.publish({ ...base, slug: 'judul' });
  assert.equal(p1.slug, 'judul');
  assert.equal(p2.slug, 'judul-2');
  store.posts.publish({ ...p1, title: 'Baru' }, true);
  assert.equal(store.posts.find('judul').title, 'Baru');
  assert.equal(store.posts.all().filter((p) => p.slug.startsWith('judul')).length, 2);
});
await slowTest('auth: daftar → keluar → masuk; email ganda & sandi salah ditolak', async () => {
  reset();
  await store.auth.signup('Sari', 'Sari@X.id ', 'rahasia123');
  assert.equal(store.auth.user().email, 'sari@x.id');
  await assert.rejects(store.auth.signup('Lain', 'sari@x.id', 'rahasia123'), { message: 'exists' });
  store.auth.logout();
  assert.equal(store.auth.user(), null);
  await assert.rejects(store.auth.login('sari@x.id', 'salah'), { message: 'bad' });
  await store.auth.login('sari@x.id', 'rahasia123');
  assert.equal(store.auth.user().name, 'Sari');
});
await slowTest(
  'auth.remove: tulisan & tanggapan akun ikut terhapus, tulisan orang lain tetap',
  async () => {
    reset();
    await store.auth.signup('Sari', 'sari@x.id', 'rahasia123');
    const mk = (slug, owner) => ({
      slug,
      title: slug,
      tag: 'esai',
      author: 'A',
      owner,
      date: '2026-10-10',
      ts: 1,
      excerpt: 'x',
      body: '<p>b</p>'
    });
    store.posts.publish(mk('punya-sari', 'sari@x.id'));
    store.posts.publish(mk('punya-budi', 'budi@x.id'));
    store.comments.add('punya-budi', 'halo');
    store.auth.remove();
    assert.equal(store.posts.find('punya-sari'), null);
    assert.ok(store.posts.find('punya-budi'));
    assert.equal(store.comments.list('punya-budi').length, 0);
    assert.equal(store.auth.user(), null);
  }
);

console.log('kemurnian');
test('core/ & data/ tidak menyentuh DOM, URL, atau penyimpanan', () => {
  const bad =
    /\b(document|localStorage|sessionStorage|location|navigator|history|getComputedStyle|matchMedia|requestAnimationFrame|alert|fetch|XMLHttpRequest|addEventListener)\b/;
  const files = ['core', 'data'].flatMap((d) =>
    fs.readdirSync(path.join(JS, d)).map((f) => path.join(JS, d, f))
  );
  files.forEach((f) => {
    fs.readFileSync(f, 'utf8')
      .split('\n')
      .forEach((line, i) => {
        const code = line
          .replace(/\/\/.*$/, '')
          .replace(/\/\*.*?\*\//g, '')
          .replace(/'[^'\\]*(\\.[^'\\]*)*'|"[^"\\]*(\\.[^"\\]*)*"/g, "''");
        assert.ok(
          !bad.test(code),
          `${path.relative(JS, f)}:${i + 1} memakai API peramban: ${line.trim().slice(0, 80)}`
        );
      });
  });
});
test('komponen, halaman, hooks & editor React tidak memakai S.ls / localStorage langsung', () => {
  const walk = (d) =>
    fs
      .readdirSync(d, { withFileTypes: true })
      .flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  ['components', 'pages', 'hooks', 'editor']
    .flatMap((d) => walk(path.join(JS, '..', d)))
    .forEach((f) => {
      assert.ok(
        !/window\.localStorage|\blocalStorage\.|\bS\.ls\b/.test(fs.readFileSync(f, 'utf8')),
        `${path.relative(JS, f)} mengakses penyimpanan langsung`
      );
    });
});

console.log(`\n${pass} lulus, ${fail} gagal`);
process.exit(fail ? 1 : 0);
