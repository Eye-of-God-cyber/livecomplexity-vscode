import { expect, test } from 'vitest';
import Parser from 'web-tree-sitter';
import fs from 'fs';
import path from 'path';

test('parse', async () => {
  await Parser.init();
  const parser = new Parser();
  const wasmPath = path.resolve(__dirname, '../../node_modules/tree-sitter-wasms/out/tree-sitter-cpp.wasm');
  const lang = await Parser.Language.load(wasmPath);
  parser.setLanguage(lang);

  const tree = parser.parse('void f() { parent[x] = parent[parent[x]]; }');
  
  function print(n, d=0) {
     console.log(' '.repeat(d) + n.type + (n.childCount === 0 ? ' "' + n.text + '"' : '') + ' [arg=' + !!n.childForFieldName('argument') + ', idx=' + !!n.childForFieldName('index') + ', indices=' + !!n.childForFieldName('indices') + ']');
     for(let i=0; i<n.childCount; i++) print(n.child(i), d+2);
  }
  print(tree.rootNode);
});
