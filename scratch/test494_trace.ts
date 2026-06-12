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

  const code = `int test494(int n, int m) {
    (void)n;
    int s = 0;
    for (int lim = m, i = 0; i < lim; i++) s++;
    return s;
}`;
  const tree = parser.parse(code);
  const result = const { extractFunctionLoops, buildAliasRegistry } = require('../src/parser/astUtils'); const fnNode = tree.rootNode.descendantsOfType('function_definition')[0]; const aliasMap = buildAliasRegistry(fnNode); console.log('AliasMap size:', aliasMap.size); console.log(Array.from(aliasMap.entries())); console.log(JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
}

run().catch(console.error);
