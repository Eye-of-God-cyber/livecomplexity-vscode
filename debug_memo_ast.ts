import { initParser, parseOneOff } from './src/parser/treeSitter';
import { resolve } from 'path';

function printNode(n: any, depth = 0) {
  const indent = '  '.repeat(depth);
  console.log(`${indent}[${n.type}] "${n.text.replace(/\n/g, '\\n').slice(0, 60)}"`);
  for (let i = 0; i < n.childCount; i++) {
    const ch = n.child(i);
    if (ch) printNode(ch, depth + 1);
  }
}

async function main() {
  await initParser(resolve('./dist'));

  // --- Example 1: Array memoization ---
  console.log('\n======= EXAMPLE 1: Array dp[] memo =======');
  const ex1 = parseOneOff(`
int dp[100005];
int solve(int n) {
    if (n <= 1) return 1;
    if (dp[n] != -1) return dp[n];
    return dp[n] = solve(n - 1);
}`);
  const fn1 = ex1!.rootNode.descendantsOfType('function_definition')[0];
  const body1 = fn1.childForFieldName('body');
  console.log('Body children:');
  for (let i = 0; i < (body1?.childCount ?? 0); i++) {
    const ch = body1!.child(i);
    if (ch && ch.type !== '{' && ch.type !== '}') {
      console.log(`  [${ch.type}]: ${ch.text.replace(/\n/g, ' ').slice(0,80)}`);
    }
  }
  // Find the memoization guard if statement
  const ifStmts1 = fn1.descendantsOfType('if_statement');
  for (const stmt of ifStmts1) {
    const cond = stmt.childForFieldName('condition');
    console.log('\n  if_statement condition:');
    if (cond) printNode(cond, 2);
  }
  // Find return statements
  const returns1 = fn1.descendantsOfType('return_statement');
  for (const r of returns1) {
    console.log('\n  return_statement:');
    printNode(r, 2);
  }

  // --- Example 2: long long memo[] ---
  console.log('\n======= EXAMPLE 2: ll memo[] =======');
  const ex2 = parseOneOff(`
long long memo[100005];
ll f(int x) {
    if (memo[x] != -1)
        return memo[x];
    memo[x] = f(x - 1);
    return memo[x];
}`);
  const fn2 = ex2!.rootNode.descendantsOfType('function_definition')[0];
  const ifStmts2 = fn2.descendantsOfType('if_statement');
  for (const stmt of ifStmts2) {
    const cond = stmt.childForFieldName('condition');
    console.log('\n  if_statement condition:');
    if (cond) printNode(cond, 2);
  }
  const exprs2 = fn2.descendantsOfType('expression_statement');
  for (const e of exprs2) {
    console.log('\n  expression_statement:', e.text.slice(0,80));
  }

  // --- Example 3: unordered_map dp ---
  console.log('\n======= EXAMPLE 3: unordered_map dp =======');
  const ex3 = parseOneOff(`
unordered_map<int,int> dp;
int solve(int x) {
    if (dp.count(x))
        return dp[x];
    return dp[x] = solve(x - 1);
}`);
  const fn3 = ex3!.rootNode.descendantsOfType('function_definition')[0];
  const ifStmts3 = fn3.descendantsOfType('if_statement');
  for (const stmt of ifStmts3) {
    const cond = stmt.childForFieldName('condition');
    console.log('\n  if_statement condition:');
    if (cond) printNode(cond, 2);
  }
  const returns3 = fn3.descendantsOfType('return_statement');
  for (const r of returns3) {
    console.log('\n  return_statement:');
    printNode(r, 2);
  }

  // --- Investigate false-positive patterns ---
  console.log('\n======= FALSE POSITIVE: DFS with vis[] =======');
  const dfs = parseOneOff(`
void dfs(int u) {
    if (vis[u]) return;
    vis[u] = true;
    for (auto v : adj[u]) dfs(v);
}`);
  const fnDfs = dfs!.rootNode.descendantsOfType('function_definition')[0];
  const ifDfs = fnDfs.descendantsOfType('if_statement');
  for (const stmt of ifDfs) {
    const cond = stmt.childForFieldName('condition');
    console.log('\n  if_statement condition:');
    if (cond) printNode(cond, 2);
  }

  console.log('\n======= FALSE POSITIVE: Merge Sort =======');
  const ms = parseOneOff(`
void mergeSort(int* arr, int l, int r) {
    if (l >= r) return;
    int mid = (l + r) / 2;
    mergeSort(arr, l, mid);
    mergeSort(arr, mid+1, r);
    merge(arr, l, mid, r);
}`);
  const fnMs = ms!.rootNode.descendantsOfType('function_definition')[0];
  const ifMs = fnMs.descendantsOfType('if_statement');
  for (const stmt of ifMs) {
    const cond = stmt.childForFieldName('condition');
    console.log('\n  if_statement condition:');
    if (cond) printNode(cond, 2);
  }

  console.log('\n======= FALSE POSITIVE: Backtracking =======');
  const bt = parseOneOff(`
void backtrack(int idx, vector<int>& path) {
    if (idx == n) { result.push_back(path); return; }
    for (int i = 0; i < n; i++) {
        if (visited[i]) continue;
        visited[i] = true;
        path.push_back(i);
        backtrack(idx+1, path);
        path.pop_back();
        visited[i] = false;
    }
}`);
  const fnBt = bt!.rootNode.descendantsOfType('function_definition')[0];
  const ifBt = fnBt.descendantsOfType('if_statement');
  for (const stmt of ifBt) {
    const cond = stmt.childForFieldName('condition');
    console.log('\n  backtrack if_statement condition:');
    if (cond) printNode(cond, 2);
  }
}
main().catch(console.error);
