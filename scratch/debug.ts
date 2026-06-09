import { initParser, parseOneOff } from '../src/parser/treeSitter';
import * as path from 'path';

const distDir = path.join(__dirname, '../dist');

async function debug() {
  await initParser(distDir);

  const gcdCode = 'int gcd(int a, int b){ while(b){ int t=a%b; a=b; b=t; } return a; }';
  const t1 = parseOneOff(gcdCode)!;
  const fn1 = t1.rootNode.descendantsOfType('function_definition')[0];
  const whileNode1 = fn1.descendantsOfType('while_statement')[0];
  
  console.log('while node children:');
  for (let i = 0; i < whileNode1.childCount; i++) {
    const ch = whileNode1.child(i);
    console.log(`  child[${i}]: type=${ch?.type}, isNamed=${ch?.isNamed}, text="${ch?.text?.slice(0,30)}"`);
  }
  
  const rawCond = whileNode1.childForFieldName('condition');
  console.log('raw condition type:', rawCond?.type, '| isNamed:', rawCond?.isNamed);
  if (rawCond) {
    for (let i = 0; i < rawCond.childCount; i++) {
      const ch = rawCond.child(i);
      console.log(`  cond child[${i}]: type=${ch?.type}, isNamed=${ch?.isNamed}, text="${ch?.text}"`);
    }
  }
  
  // Test BS
  const bsCode = 'void f(int n){ int lo=0,hi=n; while(lo<hi){ int mid=(lo+hi)/2; if(mid>0)hi=mid; else lo=mid+1; } }';
  const t2 = parseOneOff(bsCode)!;
  const fn2 = t2.rootNode.descendantsOfType('function_definition')[0];
  const while2 = fn2.descendantsOfType('while_statement')[0];
  const rawCond2 = while2.childForFieldName('condition');
  console.log('\nBS rawCond type:', rawCond2?.type, '| text:', rawCond2?.text);
  if (rawCond2) {
    for (let i = 0; i < rawCond2.childCount; i++) {
      const ch = rawCond2.child(i);
      console.log(`  cond2 child[${i}]: type=${ch?.type}, isNamed=${ch?.isNamed}, text="${ch?.text}"`);
    }
  }
  // Check if hasMidpointUpdate sees the right type
  const body2 = while2.childForFieldName('body');
  const initDecls2 = body2?.descendantsOfType('init_declarator') || [];
  console.log('BS init_declarator value types:');
  for (const d of initDecls2) {
    const val = d.childForFieldName('value');
    console.log('  val type:', val?.type, 'val text:', val?.text);
    if (val?.type === 'binary_expression') {
      const opNode = val.childForFieldName('operator');
      console.log('  val op type:', opNode?.type);
    }
  }
}

debug().catch(console.error);
