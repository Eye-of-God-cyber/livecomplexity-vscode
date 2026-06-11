import { initParser, parseOneOff } from '../src/parser/treeSitter';
import { classifyLoop } from '../src/parser/loopClassifier';
import { resolve } from 'path';

const cases = [
  { label: 'for-shl-literal',  code: `void f(int n){ for(int i=1;i<n;i<<=1){} }` },
  { label: 'for-shr-literal',  code: `void f(int n){ for(int i=n;i>1;i>>=1){} }` },
  { label: 'while-mul-2',      code: `void f(int n){ int i=1; while(i<n){ i*=2; } }` },
  { label: 'for-imulk',        code: `void f(int n,int k){ for(int i=1;i<n;i=i*k){} }` },
  { label: 'for-shl-70',       code: `void f(int n){ for(int i=1;i<n;i<<=1){} }` },
  { label: 'for-shr-71',       code: `void f(int n){ for(int i=n;i>0;i>>=1){} }` },
];

async function main() {
  await initParser(resolve('./dist'));
  for (const { label, code } of cases) {
    const tree = parseOneOff(code);
    if (!tree) { console.log(`[${label}] PARSE FAIL`); continue; }
    const loops = [
      ...tree.rootNode.descendantsOfType('for_statement'),
      ...tree.rootNode.descendantsOfType('while_statement'),
    ];
    for (const loop of loops) {
      const result = classifyLoop(loop);
      console.log(`[${label}] classification=${result.classification} confidence=${result.confidence}`);
    }
  }
}
main().catch(console.error);
