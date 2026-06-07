import * as esbuild from 'esbuild';

const isWatch = process.argv.includes('--watch');
const isProduction = process.argv.includes('--production');

/** @type {esbuild.BuildOptions} */
const buildOptions = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  sourcemap: !isProduction,
  minify: isProduction,
  logLevel: 'info',
};

import * as fs from 'node:fs/promises';
import * as path from 'node:path';

async function copyWasmFiles() {
  const distDir = path.resolve('dist');
  await fs.mkdir(distDir, { recursive: true });

  const treeSitterWasm = path.resolve('node_modules/web-tree-sitter/tree-sitter.wasm');
  const cppWasm = path.resolve('node_modules/tree-sitter-wasms/out/tree-sitter-cpp.wasm');

  await fs.copyFile(treeSitterWasm, path.join(distDir, 'tree-sitter.wasm'));
  await fs.copyFile(cppWasm, path.join(distDir, 'tree-sitter-cpp.wasm'));
  console.log('[esbuild] Copied WASM files to dist/');
}

if (isWatch) {
  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();
  await copyWasmFiles();
  console.log('[esbuild] Watching for changes...');
} else {
  await esbuild.build(buildOptions);
  await copyWasmFiles();
}
