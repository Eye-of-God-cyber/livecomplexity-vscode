import Parser from 'web-tree-sitter';
import fs from 'fs';
import path from 'path';
import { analyzeFunctions } from '../src/engine/inference';

async function run() {
  await Parser.init();
  const parser = new Parser();
  const wasmPath = path.resolve(__dirname, '../node_modules/tree-sitter-wasms/out/tree-sitter-cpp.wasm');
  const lang = await Parser.Language.load(wasmPath);
  parser.setLanguage(lang);

  const code = `#define fo(i, n) for(int i=0; i<n; i++)\nvoid helper75(int wid) { int s = 0; fo(i, wid) s++; }\nint test536(int m) { helper75(m); }`;
  const tree = parser.parse(code);
  const result = analyzeFunctions(tree); console.log(JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
}

run().catch(console.error);
