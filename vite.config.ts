/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  // `/` on the site's own domain; GitHub Pages serves it under the repository's name (BASE_PATH=/chai-mama/).
  base: process.env.BASE_PATH || '/',
  plugins: [
    react(),
    {
      // Static hosts without rewrites (GitHub Pages) answer /shop and /about with 404.html: the same app.
      name: 'chai:spa-404',
      apply: 'build',
      writeBundle(options) {
        const dir = options.dir ?? 'dist';
        copyFileSync(join(dir, 'index.html'), join(dir, '404.html'));
      },
    },
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: true,
  },
  build: {
    target: 'es2022',
    sourcemap: false,
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
  },
});
