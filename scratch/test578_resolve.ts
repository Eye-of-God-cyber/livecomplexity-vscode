import Parser from 'web-tree-sitter';
import fs from 'fs';
import path from 'path';

async function run() {
  await Parser.init();
  const parser = new Parser();
  const wasmPath = path.resolve(__dirname, '../node_modules/tree-sitter-wasms/out/tree-sitter-cpp.wasm');
  const lang = await Parser.Language.load(wasmPath);
  parser.setLanguage(lang);

  const code = `int test578(int n, int m) { int lim = n; int s = 0; { int lim = m; int a = lim; for(int i=0; i<a; i++) s++; } return s; }`;
  const tree = parser.parse(code);
  const fnNode = tree.rootNode.descendantsOfType('function_definition')[0];

  const initDecls = fnNode.descendantsOfType('init_declarator');
  const aInit = initDecls.find(n => n.text === 'a = lim');
  const limRhs = aInit.childForFieldName('value');
  console.log('limRhs:', limRhs.text, limRhs.id);
  
  // trace resolveDeclarationNode
  let current = limRhs;
  let targetName = limRhs.text;
  let resolved = null;
  while(current) {
    if (current.id === fnNode.id) break;
    let parent = current.parent;
    if (!parent) break;
    
    if (parent.type === 'compound_statement' || parent.type === 'declaration_list') {
      for (let i = 0; i < parent.childCount; i++) {
        const sibling = parent.child(i);
        if (sibling.id === current.id) break;
        if (sibling.type === 'declaration') {
           const init = sibling.descendantsOfType('init_declarator');
           for (const id of init) {
             const decl = id.childForFieldName('declarator');
             if (decl && decl.text === targetName) {
               resolved = decl;
             }
           }
        }
      }
    }
    if (resolved) break;
    current = parent;
  }
  console.log('resolved to:', resolved ? resolved.text : 'null', resolved ? resolved.id : '');
}
run();
