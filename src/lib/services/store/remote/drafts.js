/* Draf: tetap ditulis dulu ke perangkat (cepat, jalan tanpa jaringan, tanpa akun). Bila sudah masuk, tiap draf juga
   disalin ke akun (koleksi drafts, kunci = id lokal) beberapa saat setelah berhenti mengetik. Saat masuk, draf
   perangkat diunggah dan draf akun yang belum ada di perangkat diambil. Saat keluar, draf lokal dibersihkan. */
import { KEYS, ls } from '../../storage.js';
import { drafts as local } from '../drafts.js';
import { me, pb, toMs } from './pb.js';
import { state } from './state.js';

const PUSH_DELAY = 1500;
const timers = new Map();
const remoteIds = new Map(); // id lokal → id rekaman

const sourceId = (slug) => (slug && state.posts.get(slug) ? state.posts.get(slug).id : '');

async function recordId(u, clientId) {
  if (remoteIds.has(clientId)) return remoteIds.get(clientId);
  try {
    const r = await pb.collection('drafts').getFirstListItem(pb.filter('owner = {:o} && client_id = {:c}', { o: u.id, c: clientId }), { fields: 'id' });
    remoteIds.set(clientId, r.id);
    return r.id;
  } catch (e) {
    if (e && e.status === 404) return '';
    throw e;
  }
}

async function push(id) {
  timers.delete(id);
  const u = me();
  const d = local.find(id);
  if (!u || !d) return;
  const data = { title: d.title || '', body: d.html || '', tag: d.tag || '', excerpt: d.excerpt || '', source_post: sourceId(d.sourceSlug) };
  try {
    const rid = await recordId(u, id);
    if (rid) await pb.collection('drafts').update(rid, data);
    else remoteIds.set(id, (await pb.collection('drafts').create({ ...data, owner: u.id, client_id: id })).id);
  } catch {
    /* diam-diam: draf tetap aman di perangkat dan akan dicoba lagi pada simpan berikutnya */
  }
}

function save(draft) {
  const ok = local.save(draft);
  if (ok && me()) {
    clearTimeout(timers.get(draft.id));
    timers.set(draft.id, setTimeout(() => push(draft.id), PUSH_DELAY));
  }
  return ok;
}

function remove(id) {
  local.remove(id);
  clearTimeout(timers.get(id));
  timers.delete(id);
  const u = me();
  if (!u) return;
  recordId(u, id)
    .then((rid) => rid && pb.collection('drafts').delete(rid))
    .catch(() => {})
    .finally(() => remoteIds.delete(id));
}

/** Setelah masuk: unggah draf perangkat, lalu ambil draf akun yang belum ada di perangkat. */
export async function adoptDrafts() {
  const u = me();
  if (!u) return;
  await Promise.all(local.all().map((d) => push(d.id)));
  const rows = await pb.collection('drafts').getFullList({ filter: pb.filter('owner = {:o}', { o: u.id }), sort: '-updated' });
  const have = new Set(local.all().map((d) => d.id));
  const fetched = rows
    .filter((r) => !have.has(r.client_id))
    .map((r) => ({
      id: r.client_id,
      title: r.title || '',
      html: r.body || '',
      tag: r.tag || '',
      excerpt: r.excerpt || '',
      sourceSlug: r.source_post ? state.byId.get(r.source_post) || '' : '',
      updated: toMs(r.updated) || Date.now()
    }));
  rows.forEach((r) => remoteIds.set(r.client_id, r.id));
  if (fetched.length) ls.set(KEYS.drafts, local.all().concat(fetched));
}

/** Saat keluar: draf milik akun jangan tertinggal untuk pengguna berikutnya di perangkat ini. */
export function clearLocalDrafts() {
  timers.forEach(clearTimeout);
  timers.clear();
  remoteIds.clear();
  ls.remove(KEYS.drafts);
}

export const drafts = { all: local.all, find: local.find, save, remove, newId: local.newId };
