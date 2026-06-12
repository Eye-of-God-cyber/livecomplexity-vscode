const Parser = require('tree-sitter');
const CPP = require('tree-sitter-cpp');

const parser = new Parser();
parser.setLanguage(CPP);

const sourceCode = `void solve() { parent[x] = parent[parent[x]]; }`;
const tree = parser.parse(sourceCode);

function printAST(node, depth = 0) {
  let indent = '  '.repeat(depth);
  let fields = '';
  if (node.parent) {
    for (let i = 0; i < node.parent.childCount; i++) {
      if (node.parent.child(i).id === node.id) {
        let fieldName = node.parent.currentFieldName();
        // tree-sitter node API doesn't have currentFieldName, let's just print children
      }
    }
  }
  
  let out = `${indent}${node.type}`;
  if (node.childCount === 0) out += ` "${node.text}"`;
  console.log(out);
  for (let i = 0; i < node.childCount; i++) {
    printAST(node.child(i), depth + 1);
  }
}

printAST(tree.rootNode);
