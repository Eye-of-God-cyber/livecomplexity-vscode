import { initParser, parseOneOff } from '../src/parser/treeSitter';
import { analyzeFunctions } from '../src/engine/inference';
import * as path from 'path';

const distDir = path.join(__dirname, '../dist');

async function runFalsePosAudit() {
  await initParser(distDir);

  function check(label: string, code: string, fnName: string, expected: string) {
    const tree = parseOneOff(code)!;
    const res = analyzeFunctions(tree);
    const fn = res.functions.find(f => f.name === fnName) || res.functions[res.functions.length - 1];
    const actual = fn ? fn.complexity : 'Not found';
    const pass = actual === expected;
    console.log(`[${pass ? '✅' : '❌'}] ${label} | Expected: ${expected} | Got: ${actual}`);
    return pass;
  }

  console.log('\n=== FENWICK FALSE POSITIVE AUDIT ===');
  // Valid Fenwick — should be O(log n)
  check('Fenwick update i+=i&(-i)', 'void f(int i, int n){ for(;i<=n;i+=i&(-i)){} }', 'f', 'O(log n)');
  check('Fenwick query i-=i&(-i)', 'int f(int i){ int s=0; for(;i>0;i-=i&(-i)) s++; return s; }', 'f', 'O(log n)');
  // False positive attempts — should NOT be O(log n)
  check('FP: x+=y&(-y) where x!=y (unrelated vars)', 'void f(int x, int y, int n){ for(;x<=n;x+=y&(-y)){} }', 'f', 'O(n)');  // actually this still produces log because rhs has unary
  check('FP: i+=j&k (no negation)', 'void f(int i, int j, int k, int n){ for(;i<=n;i+=j&k){} }', 'f', 'O(n)');
  check('FP: plain i+=x (linear)', 'void f(int i, int x, int n){ for(;i<=n;i+=x){} }', 'f', 'O(n)');

  console.log('\n=== BINARY SEARCH FALSE POSITIVE AUDIT ===');
  // True positives — should be O(log n)
  check('BS: while(lo<hi) with mid', 'void f(int n){ int lo=0,hi=n; while(lo<hi){ int mid=(lo+hi)/2; hi=mid; } }', 'f', 'O(log n)');
  check('BS: while(lo<=hi) with mid', 'void f(int n){ int lo=0,hi=n; while(lo<=hi){ int mid=(lo+hi)/2; lo=mid+1; } }', 'f', 'O(log n)');
  // False positive attempts — linear loops with var-vs-var condition
  check('FP: while(lo<hi) lo++ only', 'void f(int n){ int lo=0,hi=n; while(lo<hi){ lo++; } }', 'f', 'O(n)');
  check('FP: while(lo<hi) lo+=2', 'void f(int n){ int lo=0,hi=n; while(lo<hi){ lo+=2; } }', 'f', 'O(n)');
  check('FP: while(lo<hi) mid=lo+1, lo=mid (no /2)', 'void f(int n){ int lo=0,hi=n,mid; while(lo<hi){ mid=lo+1; lo=mid; } }', 'f', 'O(n)');
  check('FP: while(a<b) a++ (different names)', 'void f(int n){ int a=0,b=n; while(a<b){ a++; } }', 'f', 'O(n)');

  console.log('\n=== GCD FALSE POSITIVE AUDIT ===');
  // True positive
  check('GCD: while(b) with t=a%b', 'int f(int a, int b){ while(b){ int t=a%b; a=b; b=t; } return a; }', 'f', 'O(log n)');
  // False positive attempts — while(ident) without modulo
  check('FP: while(b) b-- only', 'void f(int b){ while(b){ b--; } }', 'f', 'O(n)');
  check('FP: while(b) b=b-1 only', 'void f(int b, int n){ while(b){ b=b-1; } }', 'f', 'O(n)');
  check('FP: while(n) n-- countdown', 'void f(int n){ while(n){ n--; } }', 'f', 'O(n)');
  check('FP: while(x) linear body', 'void f(int x, int n){ while(x){ for(int i=0;i<n;i++){} x--; } }', 'f', 'O(n)');
}

runFalsePosAudit().catch(console.error);
