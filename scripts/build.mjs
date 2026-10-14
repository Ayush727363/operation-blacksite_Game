import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { compileProjectTree, createBrowserBundle } from './ts-compiler.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const viteBin = path.join(projectRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'vite.cmd' : 'vite');

const distDir = path.join(projectRoot, 'dist');

if (fs.existsSync(viteBin) && !process.argv.includes('--builtin')) {
  console.log('[Build] Using local Vite installation...');
  const res = spawnSync(viteBin, ['build'], { cwd: projectRoot, stdio: 'inherit', shell: process.platform === 'win32' });
  if (res.status !== 0) process.exit(res.status ?? 1);
  createBrowserBundle(projectRoot, path.join(distDir, 'bundle.js'));
  console.log('[Build] Production build complete in dist/ (Vite + dist/bundle.js)');
  process.exit(0);
}
fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });

compileProjectTree(projectRoot, distDir);
createBrowserBundle(projectRoot, path.join(distDir, 'bundle.js'));

const publicDir = path.join(projectRoot, 'public');
if (fs.existsSync(publicDir)) {
  copyDirRecursive(publicDir, distDir);
}

const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8')
  .replace('<script type="module" src="/src/main.ts"></script>', '<script src="./bundle.js"></script>');
fs.writeFileSync(path.join(distDir, 'index.html'), indexHtml, 'utf8');

console.log('[Build] Production build complete in dist/ (dist/index.html + dist/bundle.js)');

function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}
