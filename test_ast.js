const path = require('path');
const Parser = require('web-tree-sitter');

async function main() {
  await Parser.init({
    locateFile: () => path.join(__dirname, 'dist', 'tree-sitter.wasm')
  });
  const parser = new Parser();
  const lang = await Parser.Language.load(path.join(__dirname, 'node_modules', 'tree-sitter-wasms', 'out', 'tree-sitter-cpp.wasm'));
  parser.setLanguage(lang);
  
  const code = `
    int main() {
      for(int i=0; i<10; i++) {}
      return 0;
    }
  `;
  const tree = parser.parse(code);
  const { extractStructure } = require('./src/parser/astUtils');
  console.log(extractStructure(tree));
}

main().catch(console.error);
