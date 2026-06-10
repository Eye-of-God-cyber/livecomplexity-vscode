import { initParser, parseOneOff } from './src/parser/treeSitter';
import * as path from 'node:path';

async function main() {
  await initParser(path.resolve(__dirname, './dist'));

  const code = `
  void solve() {
    fo(i,n);
    rep(i,0,n);
    FOR(i,l,r);
  }
  `;
  const tree = parseOneOff(code);
  const root = tree!.rootNode;
  const calls = root.descendantsOfType('call_expression');
  
  for (const call of calls) {
    const fn = call.childForFieldName('function');
    console.log("Call: " + fn?.text);
    const args = call.childForFieldName('arguments');
    if (args) {
      console.log("Args childCount: " + args.childCount);
      for (let i = 0; i < args.childCount; i++) {
        console.log(\`  child[\${i}]: \${args.child(i)?.type} (\${args.child(i)?.text})\`);
      }
    }
    console.log("---");
  }
}

main().catch(console.error);
