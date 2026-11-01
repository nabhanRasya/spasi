/// <reference path="../pb_data/types.d.ts" />
/* Aturan tulisan. Sanitasi HTML + hitung kata dilakukan di Go (main.go); sisanya di sini. */

onRecordCreateRequest((e) => {
  const lib = require(`${__hooks}/lib.js`);
  const admin = e.hasSuperuserAuth();
  if (!admin && !(e.auth && e.auth.getBool('verified'))) {
    throw new ForbiddenError('Verifikasi email dulu sebelum menerbitkan.');
  }

  const base = lib.slugify(e.record.getString('slug') || e.record.getString('title'));
  let slug = base;
  for (let n = 2; lib.slugTaken(slug); n++) slug = base + '-' + n;
  e.record.set('slug', slug);
  e.record.set('tag', lib.normalizeTag(e.record.getString('tag')));

  if (!admin) {
    const anon = e.record.getBool('anon');
    const name = e.record.getString('author_name') || e.auth.getString('pen_name') || e.auth.getString('name');
    e.record.set('author_name', anon ? 'Anonim' : name.slice(0, 30));
  }
  if (!e.record.getString('published_at')) e.record.set('published_at', new DateTime());
  e.next();
}, 'posts');

onRecordUpdateRequest((e) => {
  const lib = require(`${__hooks}/lib.js`);
  e.record.set('tag', lib.normalizeTag(e.record.getString('tag')));
  if (!e.hasSuperuserAuth()) {
    const anon = e.record.getBool('anon');
    const name = e.record.getString('author_name') || e.auth.getString('pen_name') || e.auth.getString('name');
    e.record.set('author_name', anon ? 'Anonim' : name.slice(0, 30));
  }
  e.next();
}, 'posts');

onRecordAfterCreateSuccess((e) => {
  require(`${__hooks}/lib.js`).linkMedia(e.record);
  e.next();
}, 'posts');

onRecordAfterUpdateSuccess((e) => {
  require(`${__hooks}/lib.js`).linkMedia(e.record);
  e.next();
}, 'posts');

/* ---------- suka ---------- */
onRecordAfterCreateSuccess((e) => {
  require(`${__hooks}/lib.js`).recount(e.record.getString('post'), 'likes', 'like_count');
  e.next();
}, 'likes');

onRecordAfterDeleteSuccess((e) => {
  require(`${__hooks}/lib.js`).recount(e.record.getString('post'), 'likes', 'like_count');
  e.next();
}, 'likes');

/* ---------- tanggapan ---------- */
onRecordCreateRequest((e) => {
  if (!e.auth || !e.auth.getBool('verified')) {
    throw new ForbiddenError('Verifikasi email dulu sebelum menanggapi.');
  }
  const text = e.record.getString('body').replace(/\n{3,}/g, '\n\n').trim();
  e.record.set('body', text);
  e.record.set('author_name', (e.auth.getString('pen_name') || e.auth.getString('name')).slice(0, 30));
  e.next();
}, 'comments');

onRecordAfterCreateSuccess((e) => {
  require(`${__hooks}/lib.js`).recount(e.record.getString('post'), 'comments', 'comment_count');
  e.next();
}, 'comments');

onRecordAfterDeleteSuccess((e) => {
  require(`${__hooks}/lib.js`).recount(e.record.getString('post'), 'comments', 'comment_count');
  e.next();
}, 'comments');

/* ---------- laporan: >= 3 pelapor berbeda pada satu komentar -> sembunyikan ---------- */
onRecordAfterCreateSuccess((e) => {
  const commentId = e.record.getString('comment');
  if (commentId) {
    const rows = arrayOf(new DynamicModel({ n: 0 }));
    $app
      .db()
      .newQuery('SELECT COUNT(DISTINCT reporter) AS n FROM reports WHERE comment = {:c}')
      .bind({ c: commentId })
      .all(rows);
    if (rows.length && rows[0].n >= 3) {
      const c = $app.findRecordById('comments', commentId);
      c.set('hidden', true);
      $app.save(c);
      require(`${__hooks}/lib.js`).recount(c.getString('post'), 'comments', 'comment_count');
    }
  }
  e.next();
}, 'reports');

/* ---------- gambar: batas unggah 60 per akun per hari ---------- */
onRecordCreateRequest((e) => {
  if (!e.hasSuperuserAuth()) {
    const rows = arrayOf(new DynamicModel({ n: 0 }));
    $app
      .db()
      .newQuery("SELECT COUNT(*) AS n FROM media WHERE owner = {:o} AND created > datetime('now', '-1 day')")
      .bind({ o: e.auth.id })
      .all(rows);
    if (rows.length && rows[0].n >= 60) throw new BadRequestError('Batas unggah harian tercapai.');
  }
  e.next();
}, 'media');

/* ---------- bersihkan media yatim (tanpa tulisan, lebih tua dari sehari) ---------- */
cronAdd('media-gc', '17 3 * * *', () => {
  const stale = $app.findRecordsByFilter('media', "post = '' && created < @yesterday", '', 200, 0);
  stale.forEach((r) => $app.delete(r));
});
