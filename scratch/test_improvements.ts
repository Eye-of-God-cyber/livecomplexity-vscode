import { initParser, parseOneOff } from '../src/parser/treeSitter';
import { analyzeFunctions } from '../src/engine/inference';
import * as path from 'path';

const distDir = path.join(__dirname, '../dist');

async function testImprovements() {
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

  console.log('\n=== TASK 1: FENWICK FP FIX ===');
  check('Valid Fenwick point update i+=i&(-i)', 'void f(int i, int n){ for(;i<=n;i+=i&(-i)){} }', 'f', 'O(log n)');
  check('Valid Fenwick prefix query i-=i&(-i)', 'int f(int i){ int s=0; for(;i>0;i-=i&(-i)) s++; return s; }', 'f', 'O(log n)');
  check('Valid Fenwick wrapped negation i+=i&(-(i))', 'void f(int i, int n){ for(;i<=n;i+=i&(-(i))){} }', 'f', 'O(log n)');
  check('Valid Fenwick reversed (-i)&i', 'void f(int i, int n){ for(;i<=n;i+=(-i)&i){} }', 'f', 'O(log n)');
  check('FP: x+=y&(-y)', 'void f(int x, int y, int n){ for(;x<=n;x+=y&(-y)){} }', 'f', 'O(n)');
  check('FP: i+=j&k', 'void f(int i, int j, int k, int n){ for(;i<=n;i+=j&k){} }', 'f', 'O(n)');

  console.log('\n=== TASK 2: QUEUE CONDITION SUPPORT ===');
  check('while(!q.empty())', 'void bfs(){ queue<int> q; q.push(1); while(!q.empty()){ q.pop(); } }', 'bfs', 'O(n)');
  check('while(q.size())', 'void bfs(){ queue<int> q; q.push(1); while(q.size()){ q.pop(); } }', 'bfs', 'O(n)');
  check('while(q.empty()) -> still linear fallback', 'void f(){ while(q.empty()){ q.pop(); } }', 'f', 'O(n)');
  check('while(stk.top()) -> still linear fallback', 'void f(){ while(stk.top()){ stk.pop(); } }', 'f', 'O(n)');

  console.log('\n=== TASK 3: DIVISION UPDATE FIX ===');
  check('x /= 2 (log)', 'void f(int x){ while(x){ x/=2; } }', 'f', 'O(log n)');
  check('x /= 3 (log)', 'void f(int x){ while(x){ x/=3; } }', 'f', 'O(log n)');
  check('x = x / 2 (log)', 'void f(int x){ while(x){ x=x/2; } }', 'f', 'O(log n)');
  check('x /= y (linear)', 'void f(int x, int y){ while(x){ x/=y; } }', 'f', 'O(n)');
  check('x /= k (linear)', 'void f(int x, int k){ while(x){ x/=k; } }', 'f', 'O(n)');
  check('x = x / y (linear)', 'void f(int x, int y){ while(x){ x=x/y; } }', 'f', 'O(n)');

  console.log('\n=== TASK 4: FORMATTER COMPLETENESS ===');
  check('O(n^2 sqrt n)', 'void f(int n){ for(int i=0;i<n;i++) for(int j=0;j<n;j++) for(int k=1;k*k<=n;k++){} }', 'f', 'O(n² sqrt n)');
  check('O(n sqrt n log n)', 'void f(int n){ for(int j=1;j*j<=n;j++) sort(all(v)); }', 'f', 'O(n sqrt n log n)');
  
}

testImprovements().catch(console.error);
