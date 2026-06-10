import { initParser, parseOneOff } from './src/parser/treeSitter';
import * as path from 'node:path';

async function main() {
  await initParser(path.resolve(__dirname, './dist'));

  const code = `
  void f(ll n,ll m,ll r)
  {
      fo(i,n)
      {
      }
  }
  `;
  
  const tree = parseOneOff(code);
  const fns = tree!.rootNode.descendantsOfType('function_definition');
  for (const fn of fns) {
    const decl = fn.childForFieldName('declarator');
    if (decl && decl.type === 'function_declarator') {
      const name = decl.childForFieldName('declarator')?.text;
      if (name === 'fo') {
        const params = decl.childForFieldName('parameters');
        console.log("Params childCount: " + params?.childCount);
        for (let i = 0; i < params!.childCount; i++) {
          console.log(`  child[${i}]: ${params?.child(i)?.type} (${params?.child(i)?.text})`);
        }
      }
    }
  }
}

main().catch(console.error);
