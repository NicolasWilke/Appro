/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { fileURLToPath } from 'node:url';

// mode "artifact": un único HTML autocontenido para la demo navegable.
// Producción (mode por defecto): bundle normal con assets separados.
export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === 'artifact' ? [viteSingleFile()] : [])],
  base: './',
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: { outDir: mode === 'artifact' ? 'dist-artifact' : 'dist' },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
}));
