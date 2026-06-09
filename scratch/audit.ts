import { initParser, parseOneOff } from '../src/parser/treeSitter';
import { analyzeFunctions } from '../src/engine/inference';
import * as fs from 'fs';
import * as path from 'path';

const distDir = path.join(__dirname, '../dist');

const cases = [
  // ── Multiple variables ──────────────────────────────────────────────────
  {
    name: 'Different bounds (n, m)',
    code: 'void solve(int n, int m) { for(int i=0;i<n;i++) { for(int j=0;j<m;j++) {} } }',
    correct: 'O(n*m)',
  },
  {
    name: 'Three variables (n, m, k)',
    code: 'void solve(int n, int m, int k) { for(int i=0;i<n;i++) for(int j=0;j<m;j++) for(int l=0;l<k;l++) {} }',
    correct: 'O(n*m*k)',
  },
  {
    name: 'Sequential different variables',
    code: 'void solve(int n, int m) { for(int i=0;i<n;i++){} for(int j=0;j<m;j++){} }',
    correct: 'O(n + m)',
  },
  
  // ── Function Call Propagation ──────────────────────────────────────────
  {
    name: 'Helper function inside loop',
    code: 'void helper(int m) { for(int i=0;i<m;i++){} } void solve(int n) { for(int i=0;i<n;i++) helper(n); }',
    correct: 'O(n^2)',
  },
  {
    name: 'Multiple helper calls',
    code: 'void h1(int n) { for(int i=0;i<n;i++){} } void h2(int n) { for(int i=0;i<n;i++){} } void solve(int n) { h1(n); h2(n); }',
    correct: 'O(n)',
  },
  {
    name: 'Deep call chain',
    code: 'void f1(int n){ for(int i=0;i<n;i++){} } void f2(int n){ f1(n); } void f3(int n){ f2(n); } void solve(int n){ f3(n); }',
    correct: 'O(n)',
  },

  // ── STL Algorithms ─────────────────────────────────────────────────────
  {
    name: 'sort inside loop',
    code: 'void solve(int n) { for(int i=0;i<n;i++) sort(v.begin(), v.end()); }',
    correct: 'O(n^2 log n)',
  },
  {
    name: 'lower_bound inside loop',
    code: 'void solve(int n) { for(int i=0;i<n;i++) auto it = lower_bound(v.begin(), v.end(), i); }',
    correct: 'O(n log n)',
  },
  {
    name: 'reverse sequential to sort',
    code: 'void solve(int n) { reverse(all(v)); sort(all(v)); }',
    correct: 'O(n log n)',
  },

  // ── Macros ─────────────────────────────────────────────────────────────
  {
    name: 'Macro loop with custom bounds',
    code: '#define rep(i, a, b) for(int i = a; i < b; ++i)\nvoid solve(int n) { rep(i, 0, n) {} }',
    correct: 'O(n)',
  },
  {
    name: 'Macro inside loop',
    code: '#define fo(i, n) for(int i=0;i<n;i++)\nvoid solve(int n) { for(int i=0;i<n;i++) fo(j, n) {} }',
    correct: 'O(n^2)',
  },
  {
    name: 'Macro calling macro (not officially supported but let us see)',
    code: '#define fo(i, n) for(int i=0;i<n;i++)\n#define fo2(n) fo(i, n)\nvoid solve(int n) { fo2(n) {} }',
    correct: 'O(n)',
  },

  // ── Sqrt loops ─────────────────────────────────────────────────────────
  {
    name: 'i * i <= n',
    code: 'void solve(int n) { for(int i=1; i*i<=n; i++) {} }',
    correct: 'O(sqrt(n))',
  },
  {
    name: 'i * i < n',
    code: 'void solve(int n) { for(int i=1; i*i<n; i++) {} }',
    correct: 'O(sqrt(n))',
  },

  // ── Log loops ──────────────────────────────────────────────────────────
  {
    name: 'i *= 2',
    code: 'void solve(int n) { for(int i=1; i<n; i*=2) {} }',
    correct: 'O(log n)',
  },
  {
    name: 'n /= 2',
    code: 'void solve(int n) { while(n > 0) { n /= 2; } }',
    correct: 'O(log n)',
  },
  {
    name: 'i <<= 1',
    code: 'void solve(int n) { for(int i=1; i<n; i<<=1) {} }',
    correct: 'O(log n)',
  },
  {
    name: 'n >>= 1',
    code: 'void solve(int n) { while(n > 0) { n >>= 1; } }',
    correct: 'O(log n)',
  },

  // ── Early returns & Break/Continue ──────────────────────────────────────
  {
    name: 'Early return in loop',
    code: 'void solve(int n) { for(int i=0;i<n;i++) { if(i == 5) return; } }',
    correct: 'O(n) worst-case',
  },
  {
    name: 'Break in loop',
    code: 'void solve(int n) { for(int i=0;i<n;i++) { if(i == 5) break; } }',
    correct: 'O(n) worst-case',
  },

  // ── Sequential vs Nested ───────────────────────────────────────────────
  {
    name: 'O(n) nested in O(log n)',
    code: 'void solve(int n) { for(int i=1; i<n; i*=2) { for(int j=0; j<n; j++) {} } }',
    correct: 'O(n log n)',
  },
  {
    name: 'O(log n) nested in O(n)',
    code: 'void solve(int n) { for(int i=0; i<n; i++) { for(int j=1; j<n; j*=2) {} } }',
    correct: 'O(n log n)',
  },
  {
    name: 'O(n) sequential to O(log n)',
    code: 'void solve(int n) { for(int i=0; i<n; i++) {} for(int j=1; j<n; j*=2) {} }',
    correct: 'O(n)',
  },

  // ── Complex combinations ───────────────────────────────────────────────
  {
    name: 'n log n nested in n',
    code: 'void solve(int n) { for(int i=0;i<n;i++) { sort(all(v)); } }',
    correct: 'O(n^2 log n)',
  },
  {
    name: 'O(n^2) nested in log n',
    code: 'void solve(int n) { for(int i=1; i<n; i*=2) { for(int j=0; j<n; j++) for(int k=0; k<n; k++) {} } }',
    correct: 'O(n^2 log n)',
  },
  
  // ── Iterators ──────────────────────────────────────────────────────────
  {
    name: 'Vector iterator loop',
    code: 'void solve(vector<int>& v) { for(auto it = v.begin(); it != v.end(); ++it) {} }',
    correct: 'O(n)',
  },
  {
    name: 'Map iterator loop',
    code: 'void solve(map<int,int>& m) { for(auto it = m.begin(); it != m.end(); ++it) {} }',
    correct: 'O(n)',
  },
  
  // ── Pointers ───────────────────────────────────────────────────────────
  {
    name: 'Pointer traversal',
    code: 'void solve(ListNode* head) { while(head != nullptr) { head = head->next; } }',
    correct: 'O(n)',
  },
];

async function runAudit() {
  await initParser(distDir);
  const results = [];
  
  for (const c of cases) {
    const tree = parseOneOff(c.code);
    if (!tree) continue;
    
    const analysis = analyzeFunctions(tree);
    const fnResult = analysis.functions.find(f => f.name === 'solve') || analysis.functions[0];
    
    results.push({
      name: c.name,
      code: c.code,
      correct: c.correct,
      actual: fnResult ? fnResult.complexity : 'Parse Error'
    });
  }
  
  fs.writeFileSync(path.join(__dirname, 'audit_results.json'), JSON.stringify(results, null, 2));
  console.log('Audit completed.');
}

runAudit().catch(console.error);
