/* Semua teks halaman ada di sini. Ubah copy cukup di file ini.
   parts: potongan teks; { em: true } artinya dicetak miring. */

export const content = {
  title: 'spasi — ruang bagi kata dan cerita',

  nav: {
    links: [
      { label: 'baca', href: '/baca' },
      { label: 'tulis', href: '/tulis' },
      { label: 'tentang', href: '/tentang', optional: true },
      { label: 'masuk', href: '/masuk', account: true }
    ]
  },

  hero: {
    eyebrow: 'ruang bagi kata dan cerita',
    lead: 'Ada yang lebih mudah ditulis.',
    sub: 'Di tengah hari yang ramai, tulis isi pikiranmu atau baca cerita dari sudut pandang lain.',
    ctas: [
      { label: 'mulai menulis', href: '/tulis', primary: true },
      { label: 'baca dulu', href: '/baca' }
    ],
    rail: 'berhenti sejenak. tulis yang terasa.',
    scroll: 'gulir'
  },

  manifesto: {
    // k = indentasi baris sebagai pecahan lebar (deret rasio emas)
    lines: [
      { k: 0, parts: [{ t: 'Tak semua hal' }] },
      { k: 0.382, parts: [{ t: 'harus ' }, { t: 'diucapkan.', em: true }] },
      { k: 0.146, parts: [{ t: 'Sebagian bisa' }] },
      { k: 0.528, parts: [{ t: 'dituliskan.', em: true }] }
    ],
    aboutLabel: 'tentang spasi',
    about: [
      'Spasi adalah tempat untuk menulis isi pikiran dan membaca cerita orang lain. Tak harus sempurna—mulai saja dari yang ingin kamu sampaikan.',
      'Seperti ruang di antara kata, jeda memberi tempat untuk memahami makna. Spasi mengajakmu berhenti sejenak dan melihat apa yang sedang kamu rasakan.'
    ]
  },

  inside: {
    label: 'di dalam Spasi',
    heading: [{ t: 'Tulis yang kamu rasa. Baca yang orang lain ' }, { t: 'ceritakan.', em: true }],
    // pita teks yang berjalan di antara bagian (memakai kalimat judul di atas)
    marquee: 'Scribe quod sentis. Lege quod alii narrant.',
    scenes: [
      {
        scene: 'type',
        label: 'tulis',
        title: 'Mulai dari satu kalimat.',
        text: 'Tak perlu sempurna. Mulai dengan apa yang ingin kamu ceritakan.',
        par: '5vh'
      },
      {
        scene: 'portal',
        label: 'baca',
        title: 'Lihat dari sudut lain.',
        text: 'Baca pengalaman dan pemikiran yang bisa terasa dekat atau membuka perspektif baru.',
        par: '-4vh'
      },
      {
        scene: 'stars',
        label: 'temukan',
        title: 'Temukan bacaanmu.',
        text: 'Jelajahi tulisan sesuai minatmu dan temukan cerita yang layak dibaca.',
        par: '2vh'
      }
    ],
    // teks yang diketik sendiri di ilustrasi "tulis"
    poem: [
      'Sebelum ada kata,',
      'ada ruang kosong',
      'yang sabar menunggu.',
      '',
      'Tulislah pelan.',
      'Biarkan jeda',
      'menjadi bagian',
      'dari kalimatmu.'
    ]
  },

  reading: {
    label: 'pilihan tulisan',
    listLabel: 'Contoh tulisan',
    unit: 'menit',
    all: 'semua tulisan',
    // daftar di halaman diambil dari tulisan sungguhan (lib/services/store.js); ini hanya cadangan untuk crawler tanpa JS
    items: [{ title: 'Mulai dari yang sedang kamu pikirkan', minutes: 2 }]
  },

  closing: {
    label: 'mulai',
    heading: 'Mulai dari yang kamu rasakan.',
    ctas: [
      { label: 'mulai menulis', href: '/tulis', primary: true },
      { label: 'baca tulisan', href: '/baca' }
    ]
  },

  footer: {
    copy: '© 2026 spasi',
    about: 'tentang',
    grid: 'garis',
    gridTitle: 'Tampilkan garis sepertiga dan rasio emas (g)',
    theme: 'tema',
    themeTitle: 'Ganti tema terang atau gelap'
  }
};
