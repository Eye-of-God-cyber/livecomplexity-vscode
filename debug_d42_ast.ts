import { initParser, parseOneOff } from './src/parser/treeSitter';
import { resolve } from 'path';

function printTree(n: any, depth = 0) {
  const indent = '  '.repeat(depth);
  const fields: string[] = [];
  for (const [field] of Object.entries({ argument: 1, index: 1, left: 1, right: 1, operator: 1, function: 1 })) {
    const f = n.childForFieldName(field);
    if (f) fields.push(`${field}=${f.type}`);
  }
  console.log(`${indent}[${n.type}] "${n.text.replace(/\n/g,'\\n').slice(0,50)}" ${fields.length ? '(' + fields.join(', ') + ')' : ''}`);
  for (let i = 0; i < n.childCount; i++) {
    printTree(n.child(i), depth + 1);
  }
}

async function main() {
  await initParser(resolve('./dist'));

  const cases = [
    // 1D
    { label: '1D: dp[i]', code: 'void f(){ int x = dp[i]; }' },
    // 2D
    { label: '2D: dp[i][j]', code: 'void f(){ int x = dp[i][j]; }' },
    // 3D
    { label: '3D: dp[i][j][k]', code: 'void f(){ int x = dp[i][j][k]; }' },
    // 2D guard
    { label: '2D guard: if(dp[i][j] != -1)', code: 'void f(){ if(dp[i][j] != -1) return dp[i][j]; }' },
    // 2D return write
    { label: '2D return write: return dp[i][j] = solve(i-1,j)', code: 'int solve(int i,int j){ return dp[i][j] = solve(i-1,j); }' },
    // 2D memoized recursion full
    { label: '2D full memo solve(int i, int j)', code: `
int dp[105][105];
int solve(int i, int j) {
    if(dp[i][j] != -1) return dp[i][j];
    return dp[i][j] = solve(i-1, j);
}` },
    // False positive: visited matrix
    { label: 'FP: visited[i][j] = true', code: 'void dfs(int i, int j){ if(visited[i][j]) return; visited[i][j] = true; dfs(i-1,j); }' },
    // False positive: dist matrix
    { label: 'FP: dist[i][j] update', code: 'void relax(int i, int j){ if(dist[i][j] > dist[i-1][j] + 1) dist[i][j] = dist[i-1][j] + 1; }' },
    // False positive: grid DFS
    { label: 'FP: grid[r][c] DFS', code: 'void dfs(int r, int c){ if(grid[r][c] == 0) return; grid[r][c] = 0; dfs(r-1,c); }' },
  ];

  for (const { label, code } of cases) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`CASE: ${label}`);
    console.log('='.repeat(60));
    const tree = parseOneOff(code)!;
    // Find all subscript_expressions
    const subs = tree.rootNode.descendantsOfType('subscript_expression');
    for (const s of subs) {
      console.log(`\nsubscript_expression: "${s.text}"`);
      // Child 0 is argument, child 1 is subscript_argument_list
      const arg = s.child(0);
      const argList = s.child(1);
      console.log(`  child(0): type=${arg?.type} text="${arg?.text}"`);
      if (argList) {
        console.log(`  child(1): type=${argList.type} text="${argList.text}"`);
        for (let i = 0; i < argList.childCount; i++) {
          const ch = argList.child(i);
          console.log(`    argList.child(${i}): type=${ch?.type} text="${ch?.text}"`);
        }
      }
      // Named field
      console.log(`  childForFieldName('argument'): ${s.childForFieldName('argument')?.type ?? 'null'}`);
    }
    // For 2D guard: show the if_statement condition shape
    const ifs = tree.rootNode.descendantsOfType('if_statement');
    for (const stmt of ifs) {
      let cond = stmt.childForFieldName('condition');
      console.log(`\nif_statement condition type: ${cond?.type}`);
      if (cond?.type === 'condition_clause') {
        for (let i = 0; i < cond.childCount; i++) {
          const ch = cond.child(i);
          if (ch?.type !== '(' && ch?.type !== ')') { cond = ch; break; }
        }
      }
      console.log(`  unwrapped: type=${cond?.type} text="${cond?.text?.slice(0,60)}"`);
      if (cond?.type === 'binary_expression') {
        const left = cond.childForFieldName('left');
        const op = cond.childForFieldName('operator');
        const right = cond.childForFieldName('right');
        console.log(`    left: type=${left?.type} text="${left?.text}"`);
        console.log(`    op:   ${op?.type}`);
        console.log(`    right: type=${right?.type} text="${right?.text}"`);
        if (left?.type === 'subscript_expression') {
          const la = left.child(0);
          const ll = left.child(1);
          console.log(`    left.child(0): type=${la?.type} text="${la?.text}"`);
          console.log(`    left.child(1): type=${ll?.type} text="${ll?.text}"`);
        }
      }
    }
    // Assignments
    const assigns = tree.rootNode.descendantsOfType('assignment_expression');
    for (const a of assigns) {
      console.log(`\nassignment: "${a.text.slice(0,60)}"`);
      const left = a.childForFieldName('left');
      const right = a.childForFieldName('right');
      console.log(`  left: type=${left?.type} text="${left?.text}"`);
      console.log(`  right: type=${right?.type} text="${right?.text?.slice(0,40)}"`);
    }
  }
}
main().catch(console.error);
