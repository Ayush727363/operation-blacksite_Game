import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { compileProjectTree } from './ts-compiler.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const vitestBin = path.join(projectRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'vitest.cmd' : 'vitest');

if (fs.existsSync(vitestBin) && !process.argv.includes('--builtin')) {
  console.log('[Test] Running Vitest suite...');
  const res = spawnSync(vitestBin, ['run'], { cwd: projectRoot, stdio: 'inherit', shell: process.platform === 'win32' });
  process.exit(res.status ?? 0);
}

console.log('[Test] Compiling TypeScript sources & tests...');
const buildTestDir = path.join(projectRoot, 'dist');
fs.mkdirSync(buildTestDir, { recursive: true });
compileProjectTree(projectRoot, buildTestDir);

const compiledTestsDir = path.join(buildTestDir, 'tests');
const testFiles = fs.readdirSync(compiledTestsDir)
  .filter((f) => f.endsWith('.test.js'))
  .sort()
  .map((f) => path.join(compiledTestsDir, f));

console.log(`[Test] Executing ${testFiles.length} test suites...\n`);

let totalPassed = 0;
let totalFailed = 0;
let totalSuites = 0;

for (const testFile of testFiles) {
  totalSuites++;
  const suiteName = path.basename(testFile, '.js');
  globalThis.__TEST_RESULTS__ = [];
  await import(pathToFileURL(testFile).href);
  const results = globalThis.__TEST_RESULTS__ || [];
  let suiteFailed = 0;
  for (const r of results) {
    if (r.passed) {
      totalPassed++;
    } else {
      totalFailed++;
      suiteFailed++;
      console.error(`  ✗ [${suiteName}] ${r.group} > ${r.name}: ${r.error}`);
    }
  }
  if (suiteFailed === 0) {
    console.log(`  ✓ ${suiteName} (${results.length} passed)`);
  }
}

console.log(`\nTest Summary: ${totalSuites} suites, ${totalPassed} passed, ${totalFailed} failed.`);
if (totalFailed > 0) {
  process.exit(1);
}
