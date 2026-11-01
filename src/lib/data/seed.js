/* Data contoh: topik, tulisan awal, dan pemantik menulis. Hanya data, tanpa logika dan tanpa DOM.
   Saat pindah ke API/DB, berkas ini cukup jadi fixture untuk pengujian atau dihapus. */

export const TAGS = ['refleksi', 'keseharian', 'cerita', 'esai', 'puisi'];

export const SEED = [
  {
    slug: 'mulai-menulis-satu-kalimat-dulu',
    title: 'Mulai dari yang sedang kamu pikirkan',
    tag: 'refleksi',
    author: 'Kirana',
    date: '2026-10-08',
    featured: true,
    excerpt:
      'Tidak perlu langsung menemukan kata yang tepat. Tulis saja dulu apa yang ada di pikiranmu.',
    body:
      '<p>Halaman kosong sebenarnya tidak menuntut apa-apa darimu. Ia hanya menunggu, dengan sabar yang nyaris keterlaluan. Yang menuntut adalah bayangan di kepalamu: tentang tulisan yang rapi, yang bijak, yang pantas dibaca orang lain.</p>' +
      '<p>Beberapa bulan terakhir aku punya satu aturan kecil. Sebelum membuka dokumen, aku berjanji hanya akan menulis <em>satu kalimat</em>. Tidak lebih. Kalau setelah itu ingin berhenti, aku boleh berhenti tanpa merasa gagal.</p>' +
      '<h2>Kalimat pertama tak perlu pintar</h2>' +
      '<p>Kalimat pertamaku biasanya jelek. “Hari ini aku bingung mau menulis apa.” Itu saja. Tapi kalimat jelek punya satu kelebihan: ia ada. Dan sesuatu yang ada bisa diperbaiki, dipindah, dibuang, atau dijadikan pintu menuju kalimat kedua.</p>' +
      '<p>Hampir selalu, kalimat kedua datang lebih mudah. Ia tidak lagi harus memulai apa pun; ia hanya harus menjawab kalimat sebelumnya. Menulis ternyata lebih mirip percakapan daripada pidato.</p>' +
      '<blockquote>Yang sulit bukan menulis. Yang sulit adalah mengizinkan diri sendiri menulis dengan buruk dulu.</blockquote>' +
      '<h2>Tiga hal yang membantuku</h2>' +
      '<ul><li>Menulis di waktu yang sama setiap hari, walau hanya sepuluh menit.</li><li>Menunda membaca ulang sampai selesai satu paragraf utuh.</li><li>Menyimpan kalimat yang kubuang di berkas terpisah, supaya tidak terasa seperti kehilangan.</li></ul>' +
      '<p>Tak ada yang ajaib di sana. Tapi lama-lama aku sadar, kebiasaan menulis bukan soal bakat atau suasana hati. Ia soal kembali ke halaman yang sama, berkali-kali, sampai halaman itu terasa seperti rumah.</p>' +
      '<hr>' +
      '<p>Jadi kalau hari ini kamu belum tahu mau menulis apa, mulai saja dari satu kalimat. Tulis apa yang kamu lihat dari jendela. Tulis apa yang terasa di dada. Sisanya bisa menyusul.</p>'
  }
];

export const PROMPTS = [
  'Belakangan ini, yang paling sering kupikirkan adalah…',
  'Hal kecil hari ini yang masih kuingat adalah…',
  'Ada yang ingin kusampaikan kepadamu, tapi…',
  'Tempat yang ingin kudatangi lagi adalah…',
  'Sejujurnya, akhir-akhir ini aku…',
  'Hal yang baru kupahami setelah mengalaminya sendiri…'
];
