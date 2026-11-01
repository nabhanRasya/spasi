/* Kanal galat dari lapisan data ke tampilan. Penyimpanan jarak jauh bisa gagal tanpa ada pemanggil yang
   menunggu (suka, simpan, tanggapan optimistis); ToastProvider mendaftar di sini dan menampilkannya.
   Pesan yang datang sebelum ada pendengar (mis. saat boot) ditahan dan diantar ketika pendengar mendaftar. */
let handler = null;
const queued = [];

export const onStoreError = (fn) => {
  handler = fn;
  queued.splice(0).forEach((m) => fn(m));
  return () => {
    if (handler === fn) handler = null;
  };
};

export const reportError = (message) => {
  if (handler) handler(message);
  else if (queued.length < 3) queued.push(message);
};
