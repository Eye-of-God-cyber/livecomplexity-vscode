import { initParser, parseOneOff } from './src/parser/treeSitter';
import { classifyLoop } from './src/parser/loopClassifier';
import * as path from 'node:path';

async function main() {
  await initParser(path.resolve(__dirname, './dist'));

  const code = `
  #define fo(i,n) for(ll i=0;i<n;i++)
  #define rep(i,a,b) for(ll i=a;i<b;i++)
  #define FOR(i,l,r) for(ll i=l;i<=r;i++)
  
  void solve() {
    fo(j,m);
    rep(k,x,y);
    FOR(z,A,B);
  }
  `;
  
  const tree = parseOneOff(code);
  const defs = tree!.rootNode.descendantsOfType('preproc_function_def');
  
  const registry = new Map<string, { bodyText: string; boundParamIndex?: number }>();
  
  for (const def of defs) {
    const name = def.childForFieldName('name')?.text;
    const value = def.childForFieldName('value')?.text;
    const params = def.childForFieldName('parameters');
    
    if (!name || !value) continue;
    
    const dummyCode = `void _dummy() { ${value} {} }`;
    const dummyTree = parseOneOff(dummyCode);
    const loopNode = dummyTree?.rootNode.descendantsOfType('for_statement')[0];
    
    let boundParamIndex: number | undefined = undefined;
    if (loopNode) {
      const result = classifyLoop(loopNode);
      if (result.boundVar && params) {
        let paramIdx = 0;
        for (let i = 0; i < params.childCount; i++) {
          const p = params.child(i);
          if (p && p.type === 'identifier') {
            if (p.text === result.boundVar) {
              boundParamIndex = paramIdx;
              break;
            }
            paramIdx++;
          }
        }
      }
    }
    
    registry.set(name, { bodyText: value, boundParamIndex });
    console.log(`Registered ${name} -> boundParamIndex: ${boundParamIndex}`);
  }
  
  const calls = tree!.rootNode.descendantsOfType('call_expression');
  for (const call of calls) {
    const fn = call.childForFieldName('function')?.text;
    if (fn && registry.has(fn)) {
      const meta = registry.get(fn)!;
      let boundVar: string | undefined = undefined;
      
      if (meta.boundParamIndex !== undefined) {
        const args = call.childForFieldName('arguments');
        if (args) {
          let argIdx = 0;
          for (let i = 0; i < args.childCount; i++) {
            const p = args.child(i);
            if (p && p.type !== '(' && p.type !== ')' && p.type !== ',') {
              if (argIdx === meta.boundParamIndex) {
                if (p.type === 'identifier') {
                  boundVar = p.text;
                }
                break;
              }
              argIdx++;
            }
          }
        }
      }
      console.log(`Call ${fn} -> extracted boundVar: ${boundVar}`);
    }
  }
}

main().catch(console.error);
