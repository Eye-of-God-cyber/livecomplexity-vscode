import { initParser, parseOneOff } from './src/parser/treeSitter';
import * as path from 'node:path';

async function main() {
  await initParser(path.resolve(__dirname, './dist'));

  const code = `
  #define fo(i,n) for(ll i=0;i<n;i++)
  #define rep(i,a,b) for(ll i=a;i<b;i++)
  #define FOR(i,l,r) for(ll i=l;i<=r;i++)
  `;
  
  const tree = parseOneOff(code);
  const defs = tree!.rootNode.descendantsOfType('preproc_function_def');
  
  for (const def of defs) {
    console.log("Def: " + def.childForFieldName('name')?.text);
    const params = def.childForFieldName('parameters');
    if (params) {
      console.log("Params:");
      for (let i = 0; i < params.childCount; i++) {
        const p = params.child(i);
        if (p?.type === 'identifier') {
          console.log("  - " + p.text);
        }
      }
    }
    const val = def.childForFieldName('value');
    console.log("Value: " + val?.text);
    console.log("---");
  }
}

main().catch(console.error);
