/* Logika beranda: filter topik, pencarian, tulisan pilihan, sapaan, langkah panduan awal.
   Murni: menerima data, mengembalikan data. Tidak menyentuh DOM, URL, maupun penyimpanan. */

export const PAGE = 10;

export function parseQuery(search) {
  // "?tag=esai&q=kopi" → { tag, q, a }
  const p = new URLSearchParams(search);
  return { tag: p.get('tag') || 'semua', q: p.get('q') || '', a: p.get('a') || '' };
}
export function toQuery(f) {
  // kebalikan parseQuery; '' bila tak ada filter
  const p = new URLSearchParams();
  if (f.tag !== 'semua') p.set('tag', f.tag);
  if (f.q) p.set('q', f.q);
  if (f.a) p.set('a', f.a);
  return p.toString();
}
export function isFiltering(f) {
  return f.tag !== 'semua' || !!f.q || !!f.a;
}

/* isSaved(slug) disuntik pemanggil supaya modul ini tak tahu cara menyimpan */
export function matches(p, f, isSaved) {
  if (f.a && p.author !== f.a) return false;
  if (f.tag === 'tersimpan') {
    if (!isSaved(p.slug)) return false;
  } else if (f.tag !== 'semua' && p.tag !== f.tag) return false;
  if (!f.q) return true;
  const hay = `${p.title} ${p.excerpt} ${p.author} ${p.tag || ''}`.toLowerCase();
  return f.q
    .toLowerCase()
    .split(/\s+/)
    .every((w) => hay.includes(w));
}

export function counts(posts, tags, isSaved) {
  const c = { semua: posts.length, tersimpan: 0 };
  tags.forEach((t) => {
    c[t] = 0;
  });
  posts.forEach((p) => {
    if (p.tag) c[p.tag] = (c[p.tag] || 0) + 1; // tag buatan penulis ikut terhitung; tulisan tanpa tag tidak
    if (isSaved(p.slug)) c.tersimpan++;
  });
  return c;
}
export function chipNames(c, tags, activeTag) {
  const names = ['semua'].concat(tags);
  if (c.tersimpan || activeTag === 'tersimpan') names.push('tersimpan');
  return names;
}

/* Hasil penyaringan siap tampil:
   feat = pilihan minggu ini (hanya tanpa filter), rows = baris yang tampil (dibatasi limit),
   total = jumlah di daftar (tanpa feat), shown = total + feat, rest = sisa yang belum tampil */
export function view(posts, f, limit, isSaved) {
  const filtering = isFiltering(f);
  let list = posts.filter((p) => matches(p, f, isSaved));
  const feat = !filtering && (posts.filter((p) => p.featured && !p.mine)[0] || null);
  if (feat) list = list.filter((p) => p.slug !== feat.slug);
  const total = list.length;
  return {
    filtering,
    feat: feat || null,
    rows: list.slice(0, limit),
    total,
    shown: total + (feat ? 1 : 0),
    rest: total - limit
  };
}

export function emptyCopy(f) {
  // teks kosong sesuai keadaan filter
  let h, p;
  if (f.tag === 'tersimpan' && !f.q) {
    h = 'Belum ada tulisan yang kamu simpan.';
    p = 'Pilih tombol “simpan” pada tulisan agar mudah dibaca lagi.';
  } else {
    h = f.q ? `Belum ada yang cocok dengan “${f.q}”.` : 'Belum ada tulisan untuk topik ini.';
    p = 'Coba kata kunci lain, atau mulai tulisan pertama di topik ini.';
  }
  return {
    heading: h,
    text: p,
    writeHref: `/tulis${f.q ? `?title=${encodeURIComponent(f.q)}` : ''}`
  };
}

export function greeting(hour) {
  return hour >= 4 && hour < 11
    ? 'Selamat pagi'
    : hour < 15 && hour >= 11
      ? 'Selamat siang'
      : hour >= 15 && hour < 18
        ? 'Selamat sore'
        : 'Selamat malam';
}

/* panduan awal: tiga langkah kecil. input = fakta sederhana, output = langkah + jumlah selesai */
export function welcomeSteps(x) {
  const first = x.firstSlug ? `/tulisan/${encodeURIComponent(x.firstSlug)}` : '/baca';
  const steps = [
    { done: x.reads > 0, t: 'Baca satu tulisan', href: first },
    { done: x.saved > 0, t: 'Simpan satu tulisan untuk nanti', href: first },
    { done: x.drafts > 0 || x.hasMine, t: 'Tulis satu kalimat pertamamu', href: '/tulis' }
  ];
  return {
    steps,
    done: steps.filter((s) => s.done).length
  };
}
