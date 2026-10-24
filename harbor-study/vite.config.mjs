import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  root: fileURLToPath(new URL('..', import.meta.url)),
  server: { host: '127.0.0.1', port: 5180, strictPort: true, fs: { allow: [fileURLToPath(new URL('..', import.meta.url))] } },
  build: { outDir: 'dist-harbor-study', emptyOutDir: true, rollupOptions: { input: {
    proposal: fileURLToPath(new URL('index.html', import.meta.url)),
    original: fileURLToPath(new URL('../index.html', import.meta.url)),
    catalog: fileURLToPath(new URL('../catalog.html', import.meta.url)),
  } } },
});
