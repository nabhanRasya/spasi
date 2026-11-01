import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import seoPlugin from './build/seo-plugin.js';

/* Pilih implementasi "store" saat build:
     (kosong) / VITE_SPASI_BACKEND=local  → localStorage (bawaan; tanpa server)
     VITE_SPASI_BACKEND=pocketbase        → PocketBase (lihat backend/README.md)
   src/lib/services/store/index.js hanya meneruskan ke './local.js'; plugin ini mengalihkannya ke remote/index.js. */
function storeBackend(mode) {
  const useRemote = mode === 'pocketbase';
  const root = path.resolve('src/lib/services/store');
  return {
    name: 'spasi-store-backend',
    enforce: 'pre',
    resolveId(source, importer) {
      if (!useRemote || !importer) return null;
      if (path.resolve(importer) === path.join(root, 'index.js') && source === './local.js') {
        return path.join(root, 'remote', 'index.js');
      }
      return null;
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const backend = env.VITE_SPASI_BACKEND || 'local';
  return {
    plugins: [storeBackend(backend), react(), seoPlugin()],
    server: {
      // satu domain saat pengembangan: /api dan /_ (panel admin) diteruskan ke PocketBase lokal
      proxy: backend === 'pocketbase' ? { '/api': 'http://127.0.0.1:8090', '/_': 'http://127.0.0.1:8090' } : undefined
    }
  };
});
