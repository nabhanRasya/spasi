/* Pembuat id pendek untuk data lokal. Saat pindah ke database, id dibuat oleh server (UUID / bigserial). */
export function newId(prefix) {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}
