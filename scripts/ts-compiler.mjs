import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

let ts = null;
try {
  ts = require('typescript');
} catch {
  ts = null;
}

let babelCore = null;
try {
  babelCore = require('@babel/core');
} catch {
  try {
    babelCore = require('/usr/share/nodejs/@babel/core');
  } catch {
    babelCore = null;
  }
}

/**
 * Transpiles a TypeScript source file to ES module or CommonJS JavaScript.
 */
export function transpileTypeScript(code, filename = 'module.ts', toCommonJS = false) {
  if (ts) {
    const result = ts.transpileModule(code, {
      fileName: filename,
      compilerOptions: {
        module: toCommonJS ? ts.ModuleKind.CommonJS : ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
      }
    });
    return result.outputText;
  }
  if (babelCore) {
    const presetTs = resolveBabelPreset('@babel/preset-typescript');
    const plugins = [];
    if (toCommonJS) {
      const cjsPlugin = resolveBabelPlugin('@babel/plugin-transform-modules-commonjs');
      if (cjsPlugin) plugins.push(cjsPlugin);
    }
    const result = babelCore.transformSync(code, {
      filename,
      presets: [[presetTs, { allExtensions: true, allowDeclareFields: true }]],
      plugins,
      sourceMaps: false,
      comments: false
    });
    return result?.code ?? '';
  }
  return fallbackStripTypeScript(code);
}

function resolveBabelPreset(name) {
  try {
    return require.resolve(name);
  } catch {
    return `/usr/share/nodejs/${name}`;
  }
}

function resolveBabelPlugin(name) {
  try {
    return require.resolve(name);
  } catch {
    return `/usr/share/nodejs/${name}`;
  }
}

function fallbackStripTypeScript(code) {
  return code
    .replace(/export\s+interface\s+\w+[\s\S]*?^\}/gm, '')
    .replace(/interface\s+\w+[\s\S]*?^\}/gm, '')
    .replace(/export\s+type\s+\w+\s*=[^;]+;/g, '')
    .replace(/type\s+\w+\s*=[^;]+;/g, '');
}

export function compileProjectTree(projectRoot, outRoot) {
  const srcDir = path.join(projectRoot, 'src');
  const testsDir = path.join(projectRoot, 'tests');

  compileDirRecursive(srcDir, path.join(outRoot, 'src'), projectRoot);
  if (fs.existsSync(testsDir)) {
    compileDirRecursive(testsDir, path.join(outRoot, 'tests'), projectRoot);
  }
}

/**
 * Bundles all TypeScript files under src/ into a single self-contained browser bundle (dist/bundle.js)
 * using CommonJS module registry so it runs both over HTTP and directly via file:// in Headless Chromium.
 */
export function createBrowserBundle(projectRoot, outBundlePath) {
  const srcDir = path.join(projectRoot, 'src');
  const modules = {};

  function collectRecursive(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        collectRecursive(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.ts')) {
        const relId = './' + path.relative(srcDir, fullPath).replace(/\\/g, '/').replace(/\.ts$/, '');
        const raw = fs.readFileSync(fullPath, 'utf8');
        const cjsCode = transpileTypeScript(raw, fullPath, true);
        modules[relId] = cjsCode;
      }
    }
  }

  collectRecursive(srcDir);

  let bundle = `(function() {\n  const __modules = {};\n  const __cache = {};\n`;
  for (const [id, code] of Object.entries(modules)) {
    bundle += `  __modules[${JSON.stringify(id)}] = function(exports, module, __dirname_mod) {\n`;
    bundle += `    function require(spec) {\n`;
    bundle += `      return __require(spec, __dirname_mod);\n`;
    bundle += `    }\n`;
    bundle += code + '\n';
    bundle += `  };\n`;
  }

  bundle += `
  function __resolve(spec, fromDir) {
    if (spec === 'three') return './vendor/three';
    let cleaned = spec.replace(/\\.(ts|js|mjs)$/, '');
    if (cleaned.startsWith('.')) {
      const parts = (fromDir + '/' + cleaned).split('/');
      const out = [];
      for (const p of parts) {
        if (p === '' || p === '.') continue;
        if (p === '..') out.pop();
        else out.push(p);
      }
      return './' + out.join('/');
    }
    return cleaned;
  }

  function __require(spec, fromDir) {
    const id = __resolve(spec, fromDir);
    if (__cache[id]) return __cache[id].exports;
    const fn = __modules[id];
    if (!fn) throw new Error('Module not found in bundle: ' + id + ' (from ' + spec + ')');
    const mod = { exports: {} };
    __cache[id] = mod;
    const lastSlash = id.lastIndexOf('/');
    const dir = lastSlash > 1 ? id.slice(0, lastSlash) : '.';
    fn(mod.exports, mod, dir);
    return mod.exports;
  }

  __require('./main', '.');
})();\n`;

  fs.writeFileSync(outBundlePath, bundle, 'utf8');
}

function compileDirRecursive(inDir, outDir, projectRoot) {
  fs.mkdirSync(outDir, { recursive: true });
  for (const entry of fs.readdirSync(inDir, { withFileTypes: true })) {
    const srcPath = path.join(inDir, entry.name);
    if (entry.isDirectory()) {
      compileDirRecursive(srcPath, path.join(outDir, entry.name), projectRoot);
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      const raw = fs.readFileSync(srcPath, 'utf8');
      let js = transpileTypeScript(raw, srcPath, false);
      js = rewriteImports(js, srcPath, projectRoot);
      const outPath = path.join(outDir, entry.name.replace(/\.ts$/, '.js'));
      fs.writeFileSync(outPath, js, 'utf8');
    }
  }
}

function rewriteImports(jsCode, currentFilePath, projectRoot) {
  const currentDir = path.dirname(currentFilePath);
  const vendorThreePath = path.join(projectRoot, 'src', 'vendor', 'three.ts');
  let relToThree = path.relative(currentDir, vendorThreePath).replace(/\\/g, '/').replace(/\.ts$/, '.js');
  if (!relToThree.startsWith('.')) {
    relToThree = './' + relToThree;
  }

  return jsCode.replace(
    /(from\s+['"])([^'"]+)(['"])/g,
    (match, prefix, spec, suffix) => {
      if (spec === 'three') {
        return `${prefix}${relToThree}${suffix}`;
      }
      if (spec.startsWith('.')) {
        if (spec.endsWith('.ts')) {
          return `${prefix}${spec.replace(/\.ts$/, '.js')}${suffix}`;
        }
        if (!spec.endsWith('.js') && !spec.endsWith('.mjs') && !spec.endsWith('.json')) {
          return `${prefix}${spec}.js${suffix}`;
        }
      }
      return match;
    }
  );
}
