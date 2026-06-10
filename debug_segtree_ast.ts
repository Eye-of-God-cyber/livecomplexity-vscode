import { initParser, parseOneOff } from './src/parser/treeSitter';
import { resolve } from 'path';

async function main() {
  await initParser(resolve('./dist'));
  
  const cases = [
    // Pattern 1: Classic segtree update
    `for (i += n; i > 0; i >>= 1) { tree[i] += val; }`,
    // Pattern 2: Classic segtree query (range)
    `for (l += n, r += n; l < r; l >>= 1, r >>= 1) { if (l&1) ans += tree[l++]; }`,
    // Pattern 3: while x >>= 1
    `while (x > 0) { x >>= 1; }`,
    // Pattern 4: while idx >>= 1
    `while (idx > 1) { idx >>= 1; }`,
    // Pattern 5: while node
    `while (node) { node >>= 1; }`,
    // Compare: Fenwick
    `for (i = x; i <= n; i += i & -i) { tree[i] += val; }`,
    // Compare: Binary Search
    `while (lo < hi) { int mid = (lo+hi)/2; if(cond) hi = mid; else lo = mid+1; }`,
    // Compare: bitmask
    `for (int mask = 0; mask < (1 << n); mask++) { }`,
  ];

  for (const code of cases) {
    console.log('=== CODE:', code.slice(0, 60), '...');
    const tree = parseOneOff('void f() { ' + code + ' }');
    const root = tree!.rootNode;
    
    // Find the first loop
    const loops = [
      ...root.descendantsOfType('for_statement'),
      ...root.descendantsOfType('while_statement'),
    ];
    if (loops.length > 0) {
      const loop = loops[0];
      console.log('  Loop type:', loop.type);
      // For for_statement
      const init = loop.childForFieldName('initializer');
      const cond = loop.childForFieldName('condition');
      const update = loop.childForFieldName('update');
      if (init) console.log('  init:', init.type, ':', init.text);
      if (cond) console.log('  cond:', cond.type, ':', cond.text);
      if (update) console.log('  update:', update.type, ':', update.text);
      // For while
      const wcond = loop.childForFieldName('condition');
      if (wcond) console.log('  while_cond:', wcond.type, ':', wcond.text);
      // Body
      const body = loop.childForFieldName('body');
      if (body) {
        const assignments = body.descendantsOfType('assignment_expression');
        for (const a of assignments) {
          console.log('  body assignment:', a.text, '| op:', a.childForFieldName('operator')?.text);
        }
        const exprs = body.descendantsOfType('update_expression');
        for (const e of exprs) {
          console.log('  body update:', e.text);
        }
      }
    }
    console.log('---');
  }
}
main().catch(console.error);
