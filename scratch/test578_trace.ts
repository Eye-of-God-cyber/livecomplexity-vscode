import Parser from 'web-tree-sitter';
import fs from 'fs';
import path from 'path';
import { analyzeFunctions } from '../src/engine/inference';
import { extractFunctionLoops } from '../src/parser/astUtils';

async function run() {
  await Parser.init();
  const parser = new Parser();
  const wasmPath = path.resolve(__dirname, '../node_modules/tree-sitter-wasms/out/tree-sitter-cpp.wasm');
  const lang = await Parser.Language.load(wasmPath);
  parser.setLanguage(lang);

  const code = `int test578(int n, int m) { int lim = n; int s = 0; { int lim = m; int a = lim; for(int i=0; i<a; i++) s++; } return s; }`;
  const tree = parser.parse(code);
  const fnNode = tree.rootNode.descendantsOfType('function_definition')[0];
  const loops = extractFunctionLoops(fnNode);
  console.log(loops[0].boundVariables);
}
run().catch(console.error);
