import { initParser, parseOneOff } from './src/parser/treeSitter';
import { resolve } from 'path';

function walk(n: any, depth = 0, maxDepth = 5) {
  if (depth > maxDepth) return;
  const indent = '  '.repeat(depth);
  const namedFields: string[] = [];
  for (const f of ['left','right','operator','function','arguments','condition','body','declarator','value','index','argument']) {
    const ch = n.childForFieldName(f);
    if (ch) namedFields.push(`${f}=${ch.type}("${ch.text.slice(0,25)}")`);
  }
  console.log(`${indent}[${n.type}] "${n.text.slice(0,40).replace(/\n/g,'\\n')}" ${namedFields.length?'{'+namedFields.join(', ')+'}':''}`);
  for (let i = 0; i < n.childCount; i++) walk(n.child(i), depth+1, maxDepth);
}

async function main() {
  await initParser(resolve('./dist'));

  // ─── Pattern A: 1 << j ───────────────────────────────────────────────────
  console.log('\n' + '='.repeat(60));
  console.log('Pattern A: 1 << j');
  console.log('='.repeat(60));
  {
    const t = parseOneOff('void f(){ int x = 1 << j; }')!;
    const b = t.rootNode.descendantsOfType('binary_expression')[0];
    walk(b);
  }

  // ─── Pattern B: i + (1 << j) ─────────────────────────────────────────────
  console.log('\n' + '='.repeat(60));
  console.log('Pattern B: i + (1 << j) <= n');
  console.log('='.repeat(60));
  {
    const t = parseOneOff('void f(){ if(i + (1 << j) <= n) {} }')!;
    const b = t.rootNode.descendantsOfType('binary_expression');
    for (const n of b) { if (n.text.includes('1 <<')) { walk(n); break; } }
    // also show the outer comparison
    const ifs = t.rootNode.descendantsOfType('if_statement');
    for (const stmt of ifs) {
      let cond = stmt.childForFieldName('condition');
      if (cond?.type === 'condition_clause') {
        for (let i = 0; i < cond.childCount; i++) {
          const ch = cond.child(i);
          if (ch && ch.type !== '(' && ch.type !== ')') { cond = ch; break; }
        }
      }
      console.log('\nouter comparison:');
      walk(cond);
    }
  }

  // ─── Pattern C: j++ update in for loop ───────────────────────────────────
  console.log('\n' + '='.repeat(60));
  console.log('Pattern C: for(j=1; (1<<j)<=n; j++) header');
  console.log('='.repeat(60));
  {
    const t = parseOneOff('void f(){ for(int j=1;(1<<j)<=n;j++) {} }')!;
    const fors = t.rootNode.descendantsOfType('for_statement');
    for (const fs of fors) {
      console.log('\nfor_statement children:');
      for (let i = 0; i < fs.childCount; i++) {
        const ch = fs.child(i);
        console.log(`  child(${i}): type=${ch?.type} text="${ch?.text?.slice(0,40)}"`);
      }
      const init = fs.childForFieldName('initializer');
      const cond = fs.childForFieldName('condition');
      const update = fs.childForFieldName('update');
      console.log(`  initializer: type=${init?.type} text="${init?.text}"`);
      console.log(`  condition:   type=${cond?.type} text="${cond?.text}"`);
      console.log(`  update:      type=${update?.type} text="${update?.text}"`);
      // show condition deeply
      console.log('\nCondition deep:');
      walk(cond, 0, 4);
    }
  }

  // ─── Inner loop condition: i + (1 << j) <= n ──────────────────────────────
  console.log('\n' + '='.repeat(60));
  console.log('Inner loop: for(i=0; i+(1<<j)<=n; i++)');
  console.log('='.repeat(60));
  {
    const t = parseOneOff('void f(){ for(int i=0;i+(1<<j)<=n;i++){} }')!;
    const fors = t.rootNode.descendantsOfType('for_statement');
    for (const fs of fors) {
      const cond = fs.childForFieldName('condition');
      console.log('\nInner cond deep:');
      walk(cond, 0, 5);
    }
  }

  // ─── Pattern E: k = __lg(r - l + 1) ─────────────────────────────────────
  console.log('\n' + '='.repeat(60));
  console.log('Pattern E: k = __lg(r - l + 1)');
  console.log('='.repeat(60));
  {
    const t = parseOneOff('void f(){ int k = __lg(r - l + 1); }')!;
    const d = t.rootNode.descendantsOfType('declaration')[0];
    walk(d, 0, 5);
  }

  // ─── Pattern F: 31 - __builtin_clz(x) ───────────────────────────────────
  console.log('\n' + '='.repeat(60));
  console.log('Pattern F: 31 - __builtin_clz(x)');
  console.log('='.repeat(60));
  {
    const t = parseOneOff('void f(){ int k = 31 - __builtin_clz(n); }')!;
    const d = t.rootNode.descendantsOfType('declaration')[0];
    walk(d, 0, 5);
  }

  // ─── Pattern G: log2 query ───────────────────────────────────────────────
  console.log('\n' + '='.repeat(60));
  console.log('Pattern G: int k = log2(r - l + 1)');
  console.log('='.repeat(60));
  {
    const t = parseOneOff('void f(){ int k = log2(r - l + 1); }')!;
    const d = t.rootNode.descendantsOfType('declaration')[0];
    walk(d, 0, 5);
  }

  // ─── Full sparse table build ─────────────────────────────────────────────
  console.log('\n' + '='.repeat(60));
  console.log('Full Sparse Table build (nested loops)');
  console.log('='.repeat(60));
  {
    const t = parseOneOff(`
void buildST(int* a, int n) {
    for (int i = 0; i < n; i++) st[i][0] = a[i];
    for (int j = 1; (1 << j) <= n; j++) {
        for (int i = 0; i + (1 << j) <= n; i++) {
            st[i][j] = max(st[i][j-1], st[i + (1 << (j-1))][j-1]);
        }
    }
}`)!;
    const fors = t.rootNode.descendantsOfType('for_statement');
    for (const fs of fors) {
      const cond = fs.childForFieldName('condition');
      const update = fs.childForFieldName('update');
      console.log(`\nfor loop: cond="${cond?.text}" update="${update?.text}"`);
      // Is condition a binary_expression?
      const condExpr = cond?.type === 'binary_expression' ? cond : null;
      if (condExpr) {
        const op = condExpr.childForFieldName('operator');
        const lhs = condExpr.childForFieldName('left');
        const rhs = condExpr.childForFieldName('right');
        console.log(`  op=${op?.type} lhs="${lhs?.text}"(${lhs?.type}) rhs="${rhs?.text}"(${rhs?.type})`);
        // does lhs contain shift?
        const shifts = condExpr.descendantsOfType('binary_expression').filter((b:any)=>b.childForFieldName('operator')?.type==='<<');
        console.log(`  shift exprs in condition: ${shifts.length} [${shifts.map((s:any)=>s.text).join(', ')}]`);
      }
    }
  }

  // ─── Compare: Binary lifting ─────────────────────────────────────────────
  console.log('\n' + '='.repeat(60));
  console.log('Comparison: Binary lifting up[v][j]');
  console.log('='.repeat(60));
  {
    const t = parseOneOff(`
void preprocess(int n) {
    for (int j = 1; j < LOG; j++) {
        for (int v = 0; v < n; v++) {
            up[v][j] = up[up[v][j-1]][j-1];
        }
    }
}`)!;
    const fors = t.rootNode.descendantsOfType('for_statement');
    for (const fs of fors) {
      const cond = fs.childForFieldName('condition');
      const update = fs.childForFieldName('update');
      console.log(`\nfor loop: cond="${cond?.text}" update="${update?.text}"`);
      if (cond?.type === 'binary_expression') {
        const op = cond.childForFieldName('operator');
        const lhs = cond.childForFieldName('left');
        const rhs = cond.childForFieldName('right');
        console.log(`  op=${op?.type} lhs="${lhs?.text}"(${lhs?.type}) rhs="${rhs?.text}"(${rhs?.type})`);
        const shifts = cond.descendantsOfType('binary_expression').filter((b:any)=>b.childForFieldName('operator')?.type==='<<');
        console.log(`  shift exprs in condition: ${shifts.length}`);
      }
    }
  }

  // ─── Compare: Normal O(n log n) nested loop ────────────────────────────
  console.log('\n' + '='.repeat(60));
  console.log('Comparison: Normal O(n log n) nested loop (bitmask DP style)');
  console.log('='.repeat(60));
  {
    const t = parseOneOff(`
void f(int n) {
    for (int mask = 0; mask < (1 << n); mask++) {
        for (int i = 0; i < n; i++) {
            dp[mask][i] = 0;
        }
    }
}`)!;
    const fors = t.rootNode.descendantsOfType('for_statement');
    for (const fs of fors) {
      const cond = fs.childForFieldName('condition');
      console.log(`\nfor loop: cond="${cond?.text}"`);
      if (cond?.type === 'binary_expression') {
        const shifts = cond.descendantsOfType('binary_expression').filter((b:any)=>b.childForFieldName('operator')?.type==='<<');
        console.log(`  shift exprs: ${shifts.length} [${shifts.map((s:any)=>s.text).join(', ')}]`);
      }
    }
  }

  // ─── Update pattern: st[i][j] = max(...) ─────────────────────────────────
  console.log('\n' + '='.repeat(60));
  console.log('ST update: st[i][j] = max(st[i][j-1], st[i+(1<<(j-1))][j-1])');
  console.log('='.repeat(60));
  {
    const t = parseOneOff('void f(){ st[i][j] = max(st[i][j-1], st[i + (1 << (j-1))][j-1]); }')!;
    const assigns = t.rootNode.descendantsOfType('assignment_expression');
    for (const a of assigns) {
      const left = a.childForFieldName('left');
      const right = a.childForFieldName('right');
      console.log(`left: type=${left?.type} text="${left?.text}"`);
      console.log(`right: type=${right?.type} text="${right?.text?.slice(0,60)}"`);
      // is right a call_expression?
      if (right?.type === 'call_expression') {
        const fn = right.childForFieldName('function');
        const args = right.childForFieldName('arguments');
        console.log(`  callee: "${fn?.text}" argCount=${args?.namedChildCount}`);
      }
    }
  }
}
main().catch(console.error);
