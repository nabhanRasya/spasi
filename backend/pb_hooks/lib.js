/* Fungsi bersama untuk hook. Handler PocketBase berjalan terisolasi, jadi semua handler memuat berkas ini
   dengan require(`${__hooks}/lib.js`). CommonJS biasa; tanpa variabel global di luar module.exports. */

const RESERVED_TAGS = ['semua', 'tersimpan'];

module.exports = {
  /** Sama dengan U.slugify di klien: huruf kecil, tanpa aksen, strip antar-kata, maks 60. */
  slugify(s) {
    const lower = String(s || '').toLowerCase();
    // goja (mesin hook) mungkin tak punya normalize(); tanpa itu, aksen dibuang oleh aturan [^a-z0-9] di bawah
    const v = (typeof lower.normalize === 'function' ? lower.normalize('NFKD') : lower)
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60)
      .replace(/-+$/g, '');
    return v || 'tanpa-judul';
  },

  /** Sama dengan tags.normalize di klien: huruf kecil, 2-24 karakter, tanpa simbol; selain itu "". */
  normalizeTag(t) {
    const v = String(t || '')
      .toLowerCase()
      .replace(/[^a-z0-9\- ]/g, '')
      .trim()
      .replace(/\s+/g, '-');
    return v.length >= 2 && v.length <= 24 && RESERVED_TAGS.indexOf(v) < 0 ? v : '';
  },

  slugTaken(slug) {
    try {
      $app.findFirstRecordByFilter('posts', 'slug = {:s}', { s: slug });
      return true;
    } catch (_) {
      return false;
    }
  },

  /** Hitung ulang penghitung (bukan +1) agar tidak pernah melenceng. */
  recount(post, table, column) {
    if (!post) return;
    $app
      .db()
      .newQuery('UPDATE posts SET ' + column + ' = (SELECT COUNT(*) FROM ' + table + ' WHERE post = {:id}' + (table === 'comments' ? ' AND hidden = FALSE' : '') + ') WHERE id = {:id}')
      .bind({ id: post })
      .execute();
  },

  /** Tautkan gambar yang dipakai di body ke media.post. */
  linkMedia(record) {
    const body = record.getString('body');
    const re = /\/api\/files\/media\/([a-z0-9]+)\//g;
    let m;
    while ((m = re.exec(body)) !== null) {
      $app
        .db()
        .newQuery('UPDATE media SET post = {:p} WHERE id = {:m} AND owner = {:o}')
        .bind({ p: record.id, m: m[1], o: record.getString('author') })
        .execute();
    }
  },

  esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  siteUrl() {
    return ($os.getenv('SPASI_SITE_URL') || 'https://spasi.id').replace(/\/+$/, '');
  },

  distDir() {
    return $os.getenv('SPASI_DIST') || __hooks + '/../../dist';
  }
};
