import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const hasInstalledThree = fs.existsSync(
  path.resolve(__dirname, 'node_modules/three/build/three.module.js')
);

export default defineConfig({
  base: './',
  root: '.',
  publicDir: 'public',
  resolve: {
    alias: {
      three: path.resolve(__dirname, 'src/vendor/three.ts')
    }
  },
  server: {
    port: 5173,
    host: '127.0.0.1',
    open: false
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    target: 'es2022'
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    globals: true
  }
});
