import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { compileProjectTree } from './ts-compiler.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const isPreview = args.includes('--preview');
const portArgIdx = args.indexOf('--port');
const port = portArgIdx !== -1 ? Number(args[portArgIdx + 1]) : (isPreview ? 4173 : 5173);

const viteBin = path.join(projectRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'vite.cmd' : 'vite');
if (fs.existsSync(viteBin) && !args.includes('--builtin')) {
  const cmdArgs = isPreview ? ['preview', '--port', String(port)] : ['--port', String(port)];
  const res = spawnSync(viteBin, cmdArgs, { cwd: projectRoot, stdio: 'inherit', shell: process.platform === 'win32' });
  process.exit(res.status ?? 0);
}

const distDir = path.join(projectRoot, 'dist');
if (!isPreview || !fs.existsSync(path.join(distDir, 'index.html'))) {
  console.log('[Server] Building TypeScript modules into dist/...');
  fs.mkdirSync(distDir, { recursive: true });
  compileProjectTree(projectRoot, distDir);
  const publicDir = path.join(projectRoot, 'public');
  if (fs.existsSync(publicDir)) {
    copyDirRecursive(publicDir, distDir);
  }
  const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8')
    .replace('/src/main.ts', './src/main.js');
  fs.writeFileSync(path.join(distDir, 'index.html'), indexHtml, 'utf8');
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  const urlPath = (req.url || '/').split('?')[0];
  let relPath = urlPath === '/' ? '/index.html' : urlPath;
  if (relPath === '/src/main.ts') relPath = '/src/main.js';
  const filePath = path.join(distDir, decodeURIComponent(relPath));

  if (!filePath.startsWith(distDir)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404);
    res.end('Not found: ' + relPath);
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`\n  OPERATION BLACKSITE Local Server ready!`);
  console.log(`  ➜  Local:   http://localhost:${port}/`);
  console.log(`  ➜  Network: http://127.0.0.1:${port}/\n`);
});

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
