import { initParser, parseOneOff } from './src/parser/treeSitter';
import { resolve } from 'path';

async function main() {
  await initParser(resolve('./dist'));

  const cases = [
    { label: 'dp[i][j]',       code: 'int f(){ return dp[i][j]; }' },
    { label: 'dp[row][col]',   code: 'int f(){ return dp[row][col]; }' },
    { label: 'dp[a][b][c]',    code: 'int f(){ return dp[a][b][c]; }' },
    { label: 'dp[i][mask]',    code: 'int f(){ return dp[i][mask]; }' },
    { label: 'memo[l][r]',     code: 'int f(){ return memo[l][r]; }' },
    { label: 'memo[x][y][z]',  code: 'int f(){ return memo[x][y][z]; }' },
    // indices that are expressions not simple identifiers
    { label: 'dp[i+1][j-1]',   code: 'int f(){ return dp[i+1][j-1]; }' },
    { label: 'dp[2*i][j>>1]',  code: 'int f(){ return dp[2*i][j>>1]; }' },
    // guard form: full 2D guard
    { label: '2D guard full',  code: 'int solve(int i, int j){ if(dp[i][j]!=-1) return dp[i][j]; return dp[i][j]=solve(i-1,j); }'},
    // subscript_argument_list children for 2D
    { label: '2D arglist walk', code: 'int f(){ int x = dp[i][j]; }' },
  ];

  for (const { label, code } of cases) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`CASE: ${label}`);
    console.log('='.repeat(60));

    const tree = parseOneOff(code)!;
    const subs = tree.rootNode.descendantsOfType('subscript_expression');
    for (const s of subs) {
      if (s.text.length > 60) continue; // skip overly long nodes
      console.log(`\nsubscript_expression: "${s.text}"`);
      // Walk the chain
      const indices: string[] = [];
      const indexTypes: string[] = [];
      let cur = s;
      while (cur.type === 'subscript_expression') {
        const argList = cur.child(1); // subscript_argument_list
        if (argList) {
          for (let i = 0; i < argList.childCount; i++) {
            const ch = argList.child(i);
            if (ch && ch.type !== '[' && ch.type !== ']') {
              indices.unshift(ch.text);
              indexTypes.unshift(ch.type);
            }
          }
        }
        cur = cur.child(0)!;
      }
      const rootName = cur.type === 'identifier' ? cur.text : `[${cur.type}]`;
      console.log(`  root:    "${rootName}" (type: ${cur.type})`);
      console.log(`  indices: [${indices.map((v,i) => `"${v}"(${indexTypes[i]})`).join(', ')}]`);
      console.log(`  -> extracted symbols: [${indices.map((v,i) => indexTypes[i] === 'identifier' ? v : `EXPR:${v.slice(0,15)}`).join(', ')}]`);
    }
  }

  // Now investigate the exact index extraction for guard dp[i][j] != -1
  console.log(`\n${'='.repeat(60)}`);
  console.log('GUARD index extraction detail for dp[i][j] != -1');
  console.log('='.repeat(60));
  const guardTree = parseOneOff('void f(){ if(dp[i][j] != -1) return dp[i][j]; dp[i][j] = f(1,2); }')!;
  const ifs = guardTree.rootNode.descendantsOfType('if_statement');
  for (const stmt of ifs) {
    let cond = stmt.childForFieldName('condition')!;
    // unwrap condition_clause
    if (cond.type === 'condition_clause') {
      for (let i = 0; i < cond.childCount; i++) {
        const ch = cond.child(i);
        if (ch && ch.type !== '(' && ch.type !== ')') { cond = ch; break; }
      }
    }
    if (cond.type !== 'binary_expression') continue;
    const lhs = cond.childForFieldName('left')!;
    console.log(`\nGuard lhs: "${lhs.text}" type=${lhs.type}`);
    // extract indices by walking child(0) chain
    const indices: Array<{text:string, type:string}> = [];
    let cur = lhs;
    while (cur.type === 'subscript_expression') {
      const argList = cur.child(1);
      if (argList) {
        for (let i = 0; i < argList.childCount; i++) {
          const ch = argList.child(i);
          if (ch && ch.type !== '[' && ch.type !== ']') {
            indices.unshift({ text: ch.text, type: ch.type });
          }
        }
      }
      cur = cur.child(0)!;
    }
    console.log(`Extracted indices (outermost-last = left-to-right): ${JSON.stringify(indices)}`);
    console.log(`Root: "${cur.text}" type=${cur.type}`);
  }

  // check what linearVars looks like in the existing engine output for multi-var loops
  console.log(`\n${'='.repeat(60)}`);
  console.log('Existing linearVars path for nested loop O(nm)');
  console.log('='.repeat(60));
  const { analyzeFunctions } = require('./src/engine/inference');
  const multiVarCode = `
void solve(int n, int m) {
    for(int i=0; i<n; i++)
        for(int j=0; j<m; j++)
            dp[i][j] = 0;
}`;
  const res = analyzeFunctions(parseOneOff(multiVarCode)!);
  console.log(`Multi-var loop result: complexity=${res.functions[0]?.complexity} confidence=${res.functions[0]?.confidence}`);
}
main().catch(console.error);
