import Parser from 'web-tree-sitter';
import fs from 'fs';
import path from 'path';

async function run() {
  await Parser.init();
  const parser = new Parser();
  const wasmPath = path.resolve(__dirname, '../node_modules/tree-sitter-wasms/out/tree-sitter-cpp.wasm');
  const lang = await Parser.Language.load(wasmPath);
  parser.setLanguage(lang);

  const code = `int test467(int a, int b) {
    int total = a + b;
    int s = 0;
    fo(i, total) s++;
    return s;
}`;
  const tree = parser.parse(code);
  const fnNode = tree.rootNode.descendantsOfType('function_definition')[0];

  // We need to run the actual loop classifier
  // but let's just inspect the AST of `total = a + b` to see if there's any weirdness
  const initDecl = fnNode.descendantsOfType('init_declarator')[0];
  console.log(initDecl.text);
  console.log(initDecl.childForFieldName('value').type);
}
run();
