const fs = require('fs');
const path = require('path');
const Parser = require('web-tree-sitter');

async function main() {
  await Parser.init();
  const parser = new Parser();
  const Lang = await Parser.Language.load(path.join(__dirname, 'dist/tree-sitter-cpp.wasm'));
  parser.setLanguage(Lang);

  const code = `
void do_sort(vector<int>& a)
{
    sort(all(a));
    sort(v.begin(), v.end());
    lower_bound(v.begin(), v.end(), 5);
}
  `;

  const tree = parser.parse(code);

  function printNode(node, indent = '') {
    let result = `${indent}${node.type} [${node.startPosition.row}, ${node.startPosition.column}] - [${node.endPosition.row}, ${node.endPosition.column}]`;
    if (node.childCount === 0) {
      result += ` "${node.text}"`;
    }
    console.log(result);
    for (let i = 0; i < node.childCount; i++) {
      printNode(node.child(i), indent + '  ');
    }
  }

  printNode(tree.rootNode);
}

main().catch(console.error);
