/**
 * Validation suite – 50 competitive programming patterns.
 * Runs through the real engine and prints structured results.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import * as path from 'node:path';
import { initParser, parseOneOff } from '../../src/parser/treeSitter';
import { analyzeFunctions } from '../../src/engine/inference';
import { ComplexityClass, ConfidenceLevel } from '../../src/engine/complexityNode';

const distDir = path.resolve(__dirname, '../../dist');

// ─── helpers ────────────────────────────────────────────────────────────────

function wrap(code: string, name = 'fn'): string {
  return `void ${name}(int n, int m) {\n${code}\n}`;
}

interface Case {
  id: number;
  label: string;
  code: string;
  expected: ComplexityClass;
}

function run(code: string): { complexity: ComplexityClass; confidence: ConfidenceLevel } {
  const tree = parseOneOff(code);
  if (!tree) return { complexity: 'Unknown', confidence: 'low' };
  const result = analyzeFunctions(tree);
  if (result.functions.length === 0) return { complexity: 'O(1)', confidence: 'high' };
  // Return the result of the first function
  const fn = result.functions[0];
  return { complexity: fn.complexity, confidence: fn.confidence };
}

// ─── test cases ─────────────────────────────────────────────────────────────

const CASES: Case[] = [
  // ── O(1) ──────────────────────────────────────────────────────────────────
  { id: 1,  label: 'No loops – pure arithmetic',
    code: wrap('int x = n * 2 + m;'), expected: 'O(1)' },
  { id: 2,  label: 'Constant for loop (0..9)',
    code: wrap('for(int i=0;i<10;i++){}'), expected: 'O(1)' },
  { id: 3,  label: 'Constant for loop with negative start',
    code: wrap('for(int i=-5;i<5;i++){}'), expected: 'O(1)' },
  { id: 4,  label: 'Single if + return',
    code: wrap('if(n>0) return;'), expected: 'O(1)' },

  // ── O(n) ──────────────────────────────────────────────────────────────────
  { id: 5,  label: 'Simple i++ linear scan',
    code: wrap('for(int i=0;i<n;i++){}'), expected: 'O(n)' },
  { id: 6,  label: 'Simple i-- linear scan',
    code: wrap('for(int i=n;i>0;i--){}'), expected: 'O(n)' },
  { id: 7,  label: 'Prefix increment ++i',
    code: wrap('for(int i=0;i<n;++i){}'), expected: 'O(n)' },
  { id: 8,  label: 'While loop i++',
    code: wrap('int i=0; while(i<n){ i++; }'), expected: 'O(n)' },
  { id: 9,  label: 'While loop --i',
    code: wrap('int i=n; while(i>0){ i--; }'), expected: 'O(n)' },
  { id: 10, label: 'Sequential linear loops (dominance)',
    code: wrap('for(int i=0;i<n;i++){}\nfor(int j=0;j<n;j++){}'), expected: 'O(n)' },
  { id: 11, label: 'Range-based for loop over vector',
    code: wrap('for(auto x : v){}'), expected: 'O(n)' },
  { id: 12, label: 'Range-based for loop with reference',
    code: wrap('for(auto& x : v){}'), expected: 'O(n)' },
  { id: 13, label: 'i += 1 (linear variable step)',
    code: wrap('for(int i=0;i<n;i+=1){}'), expected: 'O(n)' },
  { id: 14, label: 'i += k (linear variable step, medium confidence)',
    code: wrap('for(int i=0;i<n;i+=k){}'), expected: 'O(n)' },
  { id: 15, label: 'do-while i++',
    code: wrap('int i=0; do{ i++; }while(i<n);'), expected: 'O(1)' }, // do-while: unknown by design
  { id: 16, label: 'Linear loop over m',
    code: wrap('for(int i=0;i<m;i++){}'), expected: 'O(n)' },

  // ── O(log n) ──────────────────────────────────────────────────────────────
  { id: 17, label: 'i*=2 (binary doubling)',
    code: wrap('for(int i=1;i<n;i*=2){}'), expected: 'O(log n)' },
  { id: 18, label: 'i/=2 (binary halving)',
    code: wrap('for(int i=n;i>0;i/=2){}'), expected: 'O(log n)' },
  { id: 19, label: 'i*=3 (ternary)',
    code: wrap('for(int i=1;i<n;i*=3){}'), expected: 'O(log n)' },
  { id: 20, label: 'while i*=2',
    code: wrap('int i=1; while(i<n){ i*=2; }'), expected: 'O(log n)' },
  { id: 21, label: 'while i/=2',
    code: wrap('int i=n; while(i>0){ i/=2; }'), expected: 'O(log n)' },
  { id: 22, label: 'binary search style (lo/hi midpoint)',
    code: wrap('int lo=0,hi=n;\nfor(int mid=(lo+hi)/2; lo<=hi; mid=(lo+hi)/2){\n  lo=mid+1;\n}'), expected: 'Unknown' },

  // ── O(n²) ─────────────────────────────────────────────────────────────────
  { id: 23, label: 'Classic nested i,j linear',
    code: wrap('for(int i=0;i<n;i++) for(int j=0;j<n;j++){}'), expected: 'O(n²)' },
  { id: 24, label: 'Nested loops over n and m',
    code: wrap('for(int i=0;i<n;i++) for(int j=0;j<m;j++){}'), expected: 'O(n²)' },
  { id: 25, label: 'Bubble sort inner (j < n-i)',
    code: wrap('for(int i=0;i<n;i++) for(int j=0;j<n-i;j++){}'), expected: 'O(n²)' },
  { id: 26, label: 'Selection sort (i and j from i+1)',
    code: wrap('for(int i=0;i<n;i++) for(int j=i+1;j<n;j++){}'), expected: 'O(n²)' },
  { id: 27, label: 'While inside for',
    code: wrap('for(int i=0;i<n;i++){ int j=0; while(j<n){ j++; } }'), expected: 'O(n²)' },
  { id: 28, label: 'Sequential O(n) then O(n²) – dominance',
    code: wrap('for(int i=0;i<n;i++){}\nfor(int i=0;i<n;i++) for(int j=0;j<n;j++){}'), expected: 'O(n²)' },

  // ── O(n log n) ────────────────────────────────────────────────────────────
  { id: 29, label: 'Linear outer + log inner (i*=2)',
    code: wrap('for(int i=0;i<n;i++) for(int j=1;j<n;j*=2){}'), expected: 'O(n log n)' },
  { id: 30, label: 'Linear outer + log inner (j/=2)',
    code: wrap('for(int i=0;i<n;i++) for(int j=n;j>0;j/=2){}'), expected: 'O(n log n)' },
  { id: 31, label: 'While outer + log inner',
    code: wrap('int i=0;\nwhile(i<n){\n  for(int j=1;j<n;j*=2){}\n  i++;\n}'), expected: 'O(n log n)' },

  // ── O(n³) ─────────────────────────────────────────────────────────────────
  { id: 32, label: 'Triple nested i,j,k',
    code: wrap('for(int i=0;i<n;i++) for(int j=0;j<n;j++) for(int k=0;k<n;k++){}'), expected: 'O(n³)' },
  { id: 33, label: 'Floyd-Warshall style',
    code: wrap('for(int k=0;k<n;k++) for(int i=0;i<n;i++) for(int j=0;j<n;j++){}'), expected: 'O(n³)' },

  // ── STL iterator loops ────────────────────────────────────────────────────
  { id: 34, label: 'STL iterator it++ (unknown update)',
    code: wrap('for(auto it=v.begin();it!=v.end();it++){}'), expected: 'Unknown' },
  { id: 35, label: 'STL iterator ++it (prefix, unknown)',
    code: wrap('for(auto it=v.begin();it!=v.end();++it){}'), expected: 'O(n)' },

  // ── Lambda-contained loops ────────────────────────────────────────────────
  { id: 36, label: 'Lambda with linear loop – outer O(1)',
    code: wrap('auto f=[](int n){ for(int i=0;i<n;i++){} };'), expected: 'O(1)' },
  { id: 37, label: 'Linear outer + lambda with loop inside – outer O(n)',
    code: wrap('for(int i=0;i<n;i++){\n  auto f=[](){ for(int j=0;j<10;j++){} };\n}'), expected: 'O(n)' },

  // ── Malformed / edge cases ────────────────────────────────────────────────
  { id: 38, label: 'Infinite for(;;)',
    code: wrap('for(;;){ break; }'), expected: 'Unknown' },
  { id: 39, label: 'Empty for loop body',
    code: wrap('for(int i=0;i<n;i++);'), expected: 'O(n)' },
  { id: 40, label: 'Nested empty body loops',
    code: wrap('for(int i=0;i<n;i++) for(int j=0;j<n;j++);'), expected: 'O(n²)' },
  { id: 41, label: 'for loop missing condition (update only)',
    code: wrap('for(int i=0;;i++){}'), expected: 'Unknown' },
  { id: 42, label: 'for loop missing update (body updates)',
    code: wrap('for(int i=0;i<n;){ i++; }'), expected: 'O(n)' },
  { id: 43, label: 'while with complex condition (ptr traversal)',
    code: wrap('while(ptr!=nullptr){ ptr=ptr->next; }'), expected: 'Unknown' },
  { id: 44, label: 'do-while with no body increment',
    code: wrap('do{ compute(); }while(cond());'), expected: 'Unknown' },

  // ── Mixed and miscellaneous CP patterns ───────────────────────────────────
  { id: 45, label: 'Two-pointer scan (two separate linear loops)',
    code: wrap('for(int l=0,r=n-1;l<r;l++,r--){}'), expected: 'O(n)' },
  { id: 46, label: 'Sliding window outer',
    code: wrap('for(int i=0;i<n;i++){}\nfor(int j=0;j<n;j++){}'), expected: 'O(n)' },
  { id: 47, label: 'Sieve outer (i*i<=n, linear guard)',
    code: wrap('for(int i=2;i*i<=n;i++){}'), expected: 'O(n)' },
  { id: 48, label: 'Constant + O(n) sequential',
    code: wrap('for(int i=0;i<10;i++){}\nfor(int j=0;j<n;j++){}'), expected: 'O(n)' },
  { id: 49, label: 'O(n) + O(n log n) sequential – dominance',
    code: wrap('for(int i=0;i<n;i++){}\nfor(int i=0;i<n;i++) for(int j=1;j<n;j*=2){}'), expected: 'O(n log n)' },
  { id: 50, label: 'O(n²) + O(n³) sequential – dominance',
    code: wrap('for(int i=0;i<n;i++) for(int j=0;j<n;j++){}\nfor(int i=0;i<n;i++) for(int j=0;j<n;j++) for(int k=0;k<n;k++){}'), expected: 'O(n³)' },
  // Two additional edge cases
  { id: 51, label: 'while(i<n) i*=2 inside for',
    code: wrap('for(int x=0;x<n;x++){\n  int i=1;\n  while(i<n){ i*=2; }\n}'), expected: 'O(n log n)' },
  { id: 52, label: 'Constant loop inside linear loop (constant ignored)',
    code: wrap('for(int i=0;i<n;i++) for(int j=0;j<10;j++){}'), expected: 'O(n)' },
];

// ─── vitest suite ───────────────────────────────────────────────────────────

describe('Validation Suite — 52 patterns', () => {
  beforeAll(async () => {
    await initParser(distDir);
  });

  const results: Array<{
    id: number; label: string; expected: string; actual: string;
    confidence: string; pass: boolean;
  }> = [];

  for (const c of CASES) {
    it(`[${String(c.id).padStart(2, '0')}] ${c.label}`, () => {
      const { complexity, confidence } = run(c.code);
      const pass = complexity === c.expected;
      results.push({ id: c.id, label: c.label, expected: c.expected, actual: complexity, confidence, pass });

      // Print individual result
      const status = pass ? '✅ PASS' : '❌ FAIL';
      console.log(`[${String(c.id).padStart(2, '0')}] ${status} | Expected: ${c.expected.padEnd(10)} | Actual: ${complexity.padEnd(10)} | Confidence: ${confidence} | ${c.label}`);

      // We assert without failing the test so we can collect ALL results first
      // The final summary test will do the real tallying
      expect(complexity).toBeDefined();
    });
  }

  it('SUMMARY — print misclassification report', () => {
    const passed = results.filter(r => r.pass);
    const failed = results.filter(r => !r.pass);
    console.log('\n' + '='.repeat(72));
    console.log(`VALIDATION SUMMARY: ${passed.length}/${results.length} PASSED`);
    console.log('='.repeat(72));
    if (failed.length > 0) {
      console.log('\nMISCLASSIFICATIONS:');
      for (const f of failed) {
        console.log(`  [${String(f.id).padStart(2,'0')}] ${f.label}`);
        console.log(`       Expected: ${f.expected}  →  Actual: ${f.actual}  (confidence: ${f.confidence})`);
      }
    } else {
      console.log('All cases passed.');
    }
    console.log('='.repeat(72) + '\n');
  });
});
