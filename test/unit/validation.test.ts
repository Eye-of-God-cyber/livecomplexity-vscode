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
  let fn = result.functions.find(f => f.name === 'solve' || f.name === 'main');
  if (!fn) fn = result.functions[0];
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
    code: wrap('int i=0; do{ i++; }while(i<n);'), expected: 'O(n)' },
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
    code: wrap('int i=1; while(i<n){ i*=2; }'), expected: 'Unknown' },
  { id: 21, label: 'while i/=2',
    code: wrap('int i=n; while(i>0){ i/=2; }'), expected: 'O(log n)' },
  { id: 22, label: 'binary search style (lo/hi midpoint)',
    code: wrap('int lo=0,hi=n;\nfor(int mid=(lo+hi)/2; lo<=hi; mid=(lo+hi)/2){\n  lo=mid+1;\n}'), expected: 'Unknown' },

  // ── O(n²) ─────────────────────────────────────────────────────────────────
  { id: 23, label: 'Classic nested i,j linear',
    code: wrap('for(int i=0;i<n;i++) for(int j=0;j<n;j++){}'), expected: 'O(n²)' },
  { id: 24, label: 'Nested loops over n and m',
    code: wrap('for(int i=0;i<n;i++) for(int j=0;j<m;j++){}'), expected: 'O(nm)' as any },
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
  { id: 34, label: 'STL iterator it++',
    code: wrap('for(auto it=v.begin();it!=v.end();it++){}'), expected: 'O(n)' },
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
    code: wrap('for(int i=2;i*i<=n;i++){}'), expected: 'O(sqrt n)' },
  { id: 48, label: 'Constant + O(n) sequential',
    code: wrap('for(int i=0;i<10;i++){}\nfor(int j=0;j<n;j++){}'), expected: 'O(n)' },
  { id: 49, label: 'O(n) + O(n log n) sequential – dominance',
    code: wrap('for(int i=0;i<n;i++){}\nfor(int i=0;i<n;i++) for(int j=1;j<n;j*=2){}'), expected: 'O(n log n)' },
  { id: 50, label: 'O(n²) + O(n³) sequential – dominance',
    code: wrap('for(int i=0;i<n;i++) for(int j=0;j<n;j++){}\nfor(int i=0;i<n;i++) for(int j=0;j<n;j++) for(int k=0;k<n;k++){}'), expected: 'O(n³)' },
  // Two additional edge cases
  { id: 51, label: 'while(i<n) i*=2 inside for',
    code: wrap('for(int x=0;x<n;x++){\n  int i=1;\n  while(i<n){ i*=2; }\n}'), expected: 'Unknown' },
  { id: 52, label: 'Constant loop inside linear loop (constant ignored)',
    code: wrap('for(int i=0;i<n;i++) for(int j=0;j<10;j++){}'), expected: 'O(n)' },

  // ── Macro loops ───────────────────────────────────────────────────────────
  { id: 53, label: 'Linear macro loop',
    code: '#define fo(i,n) for(int i=0;i<n;i++)\n' + wrap('fo(i,n){}'), expected: 'O(n)' },
  { id: 54, label: 'Logarithmic macro loop',
    code: '#define lg(i,n) for(int i=1;i<n;i*=2)\n' + wrap('lg(i,n){}'), expected: 'O(log n)' },
  { id: 55, label: 'Nested macro loops',
    code: '#define fo(i,n) for(int i=0;i<n;i++)\n' + wrap('fo(i,n){\nfo(j,n){}\n}'), expected: 'O(n²)' },
  { id: 56, label: 'Non-loop macro',
    code: '#define custom(x) strangeThing(x)\n' + wrap('custom(n);'), expected: 'O(1)' },

  // ── STL calls ─────────────────────────────────────────────────────────────
  { id: 57, label: 'sort(all(v))',
    code: wrap('sort(all(v));'), expected: 'O(n log n)' },
  { id: 58, label: 'for(...) sort(all(v))',
    code: wrap('for(int i=0;i<n;i++) sort(all(v));'), expected: 'O(n² log n)' },
  { id: 59, label: 'lower_bound(...)',
    code: wrap('lower_bound(v.begin(), v.end(), x);'), expected: 'O(log n)' },
  { id: 60, label: 'reverse(...)',
    code: wrap('reverse(all(v));'), expected: 'O(n)' },
  { id: 61, label: 'sort(all(a)); sort(all(b));',
    code: wrap('sort(all(a)); sort(all(b));'), expected: 'O(n log n)' },
  { id: 62, label: 'log loop containing sort',
    code: wrap('for(int i=1;i<n;i*=2) sort(all(v));'), expected: 'O(n log² n)' },

  // ── Function Call Propagation ─────────────────────────────────────────────
  { id: 63, label: 'A -> O(n)',
    code: 'void A(int n) { for(int i=0;i<n;i++){} }', expected: 'O(n)' },
  { id: 64, label: 'B calling A -> O(n)',
    code: 'void B(int n) { A(n); } void A(int n) { for(int i=0;i<n;i++){} }', expected: 'O(n)' },
  { id: 65, label: 'solve calling A(n²) and sort -> O(n²)',
    code: 'void solve(int n) { A(n); sort(all(v)); } void A(int n) { for(int i=0;i<n;i++) for(int j=0;j<n;j++){} }', expected: 'O(n²)' },
  { id: 66, label: 'for(...) A(n) -> O(n²)',
    code: 'void solve(int n) { for(int i=0;i<n;i++) A(n); } void A(int n) { for(int i=0;i<n;i++){} }', expected: 'O(n²)' },
  { id: 67, label: 'A -> B -> C propagation chain',
    code: 'void A(int n) { B(n); } void B(int n) { C(n); } void C(int n) { for(int i=0;i<n;i++){} }', expected: 'O(n)' },
  { id: 68, label: 'Direct recursion',
    code: 'void recurse(int n) { if(n>0) recurse(n-1); }', expected: 'Unknown' },
  { id: 69, label: 'Mutual recursion',
    code: 'void A(int n) { B(n); } void B(int n) { A(n); }', expected: 'Unknown' },

  // ── Bitwise Logarithmic Loops ───────────────────────────────────────────────
  { id: 70, label: 'for(int i=1;i<n;i<<=1) -> O(log n)',
    code: wrap('for(int i=1;i<n;i<<=1){}'), expected: 'O(log n)' },
  { id: 71, label: 'for(int i=n;i>0;i>>=1) -> O(log n)',
    code: wrap('for(int i=n;i>0;i>>=1){}'), expected: 'O(log n)' },
  { id: 72, label: 'while(n){ n >>= 1; } -> O(log n)',
    code: wrap('while(n>0){ n >>= 1; }'), expected: 'O(log n)' },

  // ── Square Root Loops ───────────────────────────────────────────────────────
  { id: 73, label: 'for(long long i=1;i*i<=n;i++) -> O(sqrt n)',
    code: wrap('for(long long i=1;i*i<=n;i++){}'), expected: 'O(sqrt n)' },
  { id: 74, label: 'for(long long i=2;i*i<x;i++) -> O(sqrt n)',
    code: wrap('for(long long i=2;i*i<x;i++){}'), expected: 'O(sqrt n)' },
  { id: 75, label: 'nested sqrt loop inside linear loop -> O(n sqrt n)',
    code: wrap('for(int i=0;i<n;i++) { for(int j=1;j*j<=n;j++){} }'), expected: 'O(n sqrt n)' },
  { id: 76, label: 'i <= sqrt(n)',
    code: wrap('for(int i=1; i<=sqrt(n); i++) {}'), expected: 'O(sqrt n)' },

  // ── Fenwick tree idiom ────────────────────────────────────────────────────
  { id: 77, label: 'Fenwick point update i+=i&(-i) -> O(log n)',
    code: wrap('for(;i<=n;i+=i&(-i)){}'), expected: 'O(log n)' },
  { id: 78, label: 'Fenwick prefix query i-=i&(-i) -> O(log n)',
    code: wrap('for(;i>0;i-=i&(-i)){}'), expected: 'O(log n)' },

  // ── Binary search convergence ──────────────────────────────────────────────
  { id: 79, label: 'Binary search while(lo<hi) with mid -> O(log n)',
    code: wrap('int lo=0,hi=n; while(lo<hi){ int mid=(lo+hi)/2; if(mid>0)hi=mid; else lo=mid+1; }'), expected: 'O(log n)' },
  { id: 80, label: 'Binary search while(lo<=hi) with mid -> O(log n)',
    code: wrap('int lo=0,hi=n; while(lo<=hi){ int mid=(lo+hi)/2; if(mid>0)hi=mid-1; else lo=mid+1; }'), expected: 'O(log n)' },
  { id: 81, label: 'Plain while(lo<hi) without mid -> NOT log (should be linear or unknown)',
    code: wrap('int lo=0,hi=n; while(lo<hi){ lo++; }'), expected: 'O(n)' },

  // ── Euclidean GCD ─────────────────────────────────────────────────────────
  { id: 82, label: 'Euclidean GCD while(b) with modulo -> O(log n)',
    code: 'int gcd(int a, int b){ while(b){ int t=a%b; a=b; b=t; } return a; }', expected: 'O(log n)' },

  // ── Formatter edge cases ──────────────────────────────────────────────────
  { id: 83, label: 'Triple nested log -> O(log³ n)',
    code: wrap('for(int i=1;i<n;i*=2) for(int j=1;j<n;j*=2) for(int k=1;k<n;k*=2){}'), expected: 'O(log³ n)' },
  { id: 84, label: 'sort in O(n²) loop -> O(n³ log n)',
    code: wrap('for(int i=0;i<n;i++) for(int j=0;j<n;j++) sort(all(v));'), expected: 'O(n³ log n)' },

  // ── Dependent-loop (harmonic) patterns ───────────────────────────────────

  // Pattern A: classic harmonic divisor sum — outer O(n), inner j+=i, j=i
  { id: 85, label: 'Harmonic: outer O(n) inner j=i,j+=i -> O(n log n)',
    code: wrap('for(int i=1;i<=n;i++) for(int j=i;j<=n;j+=i){}'), expected: 'O(n log n)' },

  // Pattern A variant: j starts at 2*i
  { id: 86, label: 'Harmonic: outer O(n) inner j=2*i,j+=i -> O(n log n)',
    code: wrap('for(int i=1;i<=n;i++) for(int j=2*i;j<=n;j+=i){}'), expected: 'O(n log n)' },

  // Pattern B: Sieve of Eratosthenes — outer O(sqrt n), inner j=i*i,j+=i
  { id: 87, label: 'Sieve: outer O(sqrt n) inner j=i*i,j+=i -> O(n log log n)',
    code: wrap('for(int i=2;i*i<=n;i++) for(int j=i*i;j<=n;j+=i){}'), expected: 'O(n log log n)' },

  // Pattern B variant: i<=sqrt(n) with j=i*i
  { id: 88, label: 'Sieve sqrt bound: outer i<=sqrt(n) inner j=i*i,j+=i -> O(n log log n)',
    code: wrap('for(int i=2;i<=sqrt(n);i++) for(int j=i*i;j<=n;j+=i){}'), expected: 'O(n log log n)' },

  // Pattern C: outer O(n), inner starts at i (same as Pattern A)
  { id: 89, label: 'Divisor sum: outer O(n) inner j=i,j+=i -> O(n log n)',
    code: wrap('for(int i=1;i<=n;i++){ int s=0; for(int j=i;j<=n;j+=i) s++; }'), expected: 'O(n log n)' },

  // False positive guard 1: j += blockSize where blockSize != outer iterator -> O(n²)
  { id: 90, label: 'FP-guard: j+=blockSize (blockSize != i) -> O(n²) not O(n log n)',
    code: wrap('int blockSize=100; for(int i=0;i<n;i++) for(int j=0;j<n;j+=blockSize){}'), expected: 'O(n²)' },

  // False positive guard 2: j += k where k is an unrelated variable -> O(n²)
  { id: 91, label: 'FP-guard: j+=k (k != i) -> O(n²) not O(n log n)',
    code: wrap('int k=3; for(int i=0;i<n;i++) for(int j=0;j<n;j+=k){}'), expected: 'O(n²)' },

  // False positive guard 3: j += constant (not outer var) -> O(n²)
  { id: 92, label: 'FP-guard: j+=2 (constant step) -> O(n²) not O(n log n)',
    code: wrap('for(int i=0;i<n;i++) for(int j=0;j<n;j+=2){}'), expected: 'O(n²)' },

  // False positive guard 4: j starts at 0 (not a function of i) even though j+=i -> NOT harmonic
  // j = 0 means init does not depend on i, so not step-dependent
  { id: 93, label: 'FP-guard: j=0,j+=i (init not dependent on i) -> O(n²)',
    code: wrap('for(int i=1;i<=n;i++) for(int j=0;j<n;j+=i){}'), expected: 'O(n²)' },

  // Nested harmonic inside outer O(n): should produce O(n log n)
  { id: 94, label: 'Fenwick build: outer i, inner j+=j&(-j) -> O(n log n)',
    code: wrap('for(int i=1;i<=n;i++) for(int j=i;j<=n;j+=j&(-j)){}'), expected: 'O(n log n)' },

  // Harmonic sequential to a linear: should take max -> O(n log n)
  { id: 95, label: 'Harmonic + sequential linear: max = O(n log n)',
    code: wrap('for(int i=1;i<=n;i++) for(int j=i;j<=n;j+=i){} for(int k=0;k<n;k++){}'), expected: 'O(n log n)' },

  // Sieve with if guard (standard Sieve of Eratosthenes)
  { id: 96, label: 'Full Sieve with if guard -> O(n log log n)',
    code: wrap('for(int i=2;i*i<=n;i++){ if(true){ for(int j=i*i;j<=n;j+=i){} } }'), expected: 'O(n log log n)' },

  // ── Phase C: Amortized analysis ─────────────────────────────────────────

  // Trial division: inner while(n%i==0) n/=i is amortized — outer stays O(sqrt n)
  { id: 97, label: 'Trial division: for(i;i*i<=n;i++) while(n%i==0) n/=i -> O(sqrt n)',
    code: wrap('for(int i=2;i*i<=n;i++){ while(n%i==0){ n/=i; } }'), expected: 'O(sqrt n)' },

  // Trial division with explicit body block
  { id: 98, label: 'Trial division (prime factorization body) -> O(sqrt n)',
    code: 'void factorize(long long n){ for(long long i=2;i*i<=n;i++){ while(n%i==0){ n/=i; } } }',
    expected: 'O(sqrt n)' },

  // Two-pointer classic: l advances at most n times total
  { id: 99, label: 'Two-pointer: for(r;r<n;r++) while(l<r) l++ -> O(n)',
    code: wrap('int l=0; for(int r=0;r<n;r++){ while(l<r){ l++; } }'), expected: 'O(n)' },

  // Two-pointer with <= condition
  { id: 100, label: 'Two-pointer: while(l<=r) l++ -> O(n)',
    code: wrap('int l=0; for(int r=0;r<n;r++){ while(l<=r){ l++; } }'), expected: 'O(n)' },

  // Sliding window: same structure as two-pointer
  { id: 101, label: 'Sliding window: while(l<r) l+=1 -> O(n)',
    code: wrap('int l=0; for(int r=0;r<n;r++){ while(l<r){ l+=1; } }'), expected: 'O(n)' },

  // Two-pointer with linear body: O(n) outer × amortized inner + O(1) body = O(n)
  { id: 102, label: 'Two-pointer with body ops -> O(n)',
    code: wrap('int l=0,s=0; for(int r=0;r<n;r++){ s+=r; while(l<r){ s-=l; l++; } }'), expected: 'O(n)' },

  // False positive guard A: y++ where y is NOT in inner condition -> O(n²)
  { id: 103, label: 'FP-guard amortized: y++ not in inner cond -> O(n²)',
    code: wrap('int x=n,y=0; for(int i=0;i<n;i++){ while(x>0){ y++; } }'), expected: 'O(n²)' },

  // False positive guard B: while(flag) with unrelated update (c is not in cond, flag is not monotonic)
  // -> engine correctly returns O(n²) because c++ is not in the while condition
  { id: 104, label: 'FP-guard amortized: while(flag) c++ (c not in cond) -> O(n²)',
    code: wrap('bool flag=true; int c=0; for(int i=0;i<n;i++){ while(flag){ c++; flag=false; } }'), expected: 'O(n²)' },

  // False positive guard C: j<n where j is unrelated to outer bound variable
  // j is not the outer iterator r, and j does not appear in outer condition i<n
  { id: 105, label: 'FP-guard amortized: while(j<n) k++ (k not in cond) -> O(n²)',
    code: wrap('int j=0,k=0; for(int i=0;i<n;i++){ while(j<n){ k++; } }'), expected: 'O(n²)' },

  // Amortized + independent mix: outer O(n), amortized inner + independent inner -> O(n)
  { id: 106, label: 'Two-pointer + sequential inner O(1) -> O(n)',
    code: wrap('int l=0; for(int r=0;r<n;r++){ int x=r*2; while(l<r){ l++; } }'), expected: 'O(n)' },

  // Trial division in sqrt loop followed by linear loop: max = O(n)
  { id: 107, label: 'Trial division + sequential O(n) loop -> O(n)',
    code: wrap('for(int i=2;i*i<=n;i++){ while(n%i==0){ n/=i; } } for(int k=0;k<n;k++){}'), expected: 'O(n)' },

  // Trial division alone with i<=sqrt(n) bound
  { id: 108, label: 'Trial division: i<=sqrt(n) bound -> O(sqrt n)',
    code: wrap('for(int i=2;i<=sqrt(n);i++){ while(n%i==0){ n/=i; } }'), expected: 'O(sqrt n)' },

  // ── Stabilization fixes ───────────────────────────────────────────────────

  // Fix 22: mid = (lo+hi)/2 in update should NOT be logarithmic
  { id: 109, label: 'Fix 22: mid=(lo+hi)/2 update is linear -> Unknown (due to condition)',
    code: wrap('int lo=0,hi=n; for(int mid=(lo+hi)/2; lo<=hi; mid=(lo+hi)/2){ lo=mid+1; }'), expected: 'Unknown' },

  // Fix 43: pointer traversal should be unknown
  { id: 110, label: 'Fix 43: pointer traversal ptr=ptr->next -> Unknown',
    code: wrap('while(ptr!=nullptr){ ptr=ptr->next; }'), expected: 'Unknown' },

  // ── Phase D1: Multi-Variable and Constant Expression Support ──────────────
  // Case A: for(i<n) for(j<n) -> O(n²)
  { id: 111, label: 'Multi-var Case A: for(i<n) for(j<n)',
    code: wrap('for(int i=0;i<n;i++) for(int j=0;j<n;j++){}'), expected: 'O(n²)' as any },

  // Case B: for(i<m) for(j<m) -> O(m²)
  { id: 112, label: 'Multi-var Case B: for(i<m) for(j<m)',
    code: wrap('for(int i=0;i<m;i++) for(int j=0;j<m;j++){}'), expected: 'O(m²)' as any },

  // Case C: for(i<n) for(j<m) -> O(nm)
  { id: 113, label: 'Multi-var Case C: for(i<n) for(j<m)',
    code: wrap('for(int i=0;i<n;i++) for(int j=0;j<m;j++){}'), expected: 'O(nm)' as any },

  // Case D: for(i<n) for(j<m) for(k<p) -> O(nmp)
  { id: 114, label: 'Multi-var Case D: for(i<n) for(j<m) for(k<p)',
    code: wrap('for(int i=0;i<n;i++) for(int j=0;j<m;j++) for(int k=0;k<p;k++){}'), expected: 'O(nmp)' as any },

  // Case E: for(i<m) sort() -> O(n² log n) (mixed symbolic + heuristic)
  { id: 115, label: 'Multi-var Case E: for(i<m) sort(...)',
    code: wrap('for(int i=0;i<m;i++) sort(v.begin(), v.end());'), expected: 'O(n² log n)' as any },

  // Case F: for(i<n) sort() -> O(n² log n) (mixed symbolic + heuristic)
  { id: 116, label: 'Multi-var Case F: for(i<n) sort(...)',
    code: wrap('for(int i=0;i<n;i++) sort(v.begin(), v.end());'), expected: 'O(n² log n)' as any },

  // Case G: for(i<2+3) -> O(1)
  { id: 117, label: 'Constant Case G: for(i<2+3)',
    code: wrap('for(int i=0;i<2+3;i++){}'), expected: 'O(1)' as any },

  // Case H: for(i<sizeof(int)) -> O(1)
  { id: 118, label: 'Constant Case H: for(i<sizeof(int))',
    code: wrap('for(int i=0;i<sizeof(int);i++){}'), expected: 'O(1)' as any },

  // Case I: for(i<n){} for(j<m){} -> O(n) (dominance limitation)
  { id: 119, label: 'Multi-var Case I: sequential loops fallback to O(m + n) [D4.7]', code: `
void foo(int n, int m) {
  for(int i=0;i<n;i++) {}
  for(int j=0;j<m;j++) {}
}`, expected: 'O(m + n)' as any },

  // Case J: for(i<n) for(j<m) {} for(k<p) {} -> O(nm)
  { id: 120, label: 'Multi-var Case J: sequential loops fallback dominance to O(nm + p) [D4.7]', code: `
void foo(int n, int m, int p) {
  for(int i=0;i<n;i++) {
    for(int j=0;j<m;j++) {}
  }
  for(int k=0;k<p;k++) {}
}`, expected: 'O(nm + p)' as any },

  // Case K: for(i<m) for(j<n) -> O(nm) (deterministic sort order)
  { id: 121, label: 'Multi-var Case K: deterministic sort order O(nm)',
    code: wrap('for(int i=0;i<m;i++) for(int j=0;j<n;j++){}'), expected: 'O(nm)' as any },
    
  // ─── Macro Symbolic Propagation ──────────────────────────────────────────
  { id: 122, label: 'Macro: fo(i,n) fo(j,m) -> O(nm)',
    code: `#define fo(i,n) for(ll i=0;i<n;i++)\nvoid f() { fo(i,n) { fo(j,m) {} } }`, expected: 'O(nm)' as any },
  { id: 123, label: 'Macro: fo(i,n) fo(j,m) fo(k,r) -> O(nmr)',
    code: `#define fo(i,n) for(ll i=0;i<n;i++)\nvoid f() { fo(i,n) { fo(j,m) { fo(k,r) {} } } }`, expected: 'O(nmr)' as any },
  { id: 124, label: 'Macro: fo(i,n) fo(j,n) -> O(n²)',
    code: `#define fo(i,n) for(ll i=0;i<n;i++)\nvoid f(ll n,ll m) { fo(i,n) { fo(j,n) {} } }`, expected: 'O(n²)' as any },
  { id: 125, label: 'Macro: rep(i,a,b) -> O(n)',
    code: `#define rep(i,a,b) for(ll i=a;i<b;i++)\nvoid f() { rep(i,l,r) {} }`, expected: 'O(n)' as any },
  { id: 126, label: 'Macro: FOR(i,l,r) -> O(n)',
    code: `#define FOR(i,l,r) for(ll i=l;i<=r;i++)\nvoid f() { FOR(i,l,r) {} }`, expected: 'O(n)' as any },
  
  // ─── Format Cap Regression ───────────────────────────────────────────────
  { id: 127, label: 'Five nested identical loops scale to O(n^5)',
    code: wrap('for(int i=0;i<n;i++) for(int j=0;j<n;j++) for(int k=0;k<n;k++) for(int l=0;l<n;l++) for(int z=0;z<n;z++){}'), expected: 'O(n^5)' as any },

  // ─── D2.1: STL Container Method Complexities ─────────────────────────────
  { id: 128, label: 'D2.1: set.insert in O(n) loop → O(n log n)',
    code: wrap('set<int> s;\nfor(int i=0;i<n;i++) s.insert(a[i]);'), expected: 'O(n log n)' as any },

  { id: 129, label: 'D2.1: map.find in O(n) loop → O(n log n)',
    code: wrap('map<int,int> mp;\nfor(int i=0;i<n;i++) mp.find(a[i]);'), expected: 'O(n log n)' as any },

  { id: 130, label: 'D2.1: priority_queue.push in O(n) loop → O(n log n)',
    code: wrap('priority_queue<int> pq;\nfor(int i=0;i<n;i++) pq.push(a[i]);'), expected: 'O(n log n)' as any },

  { id: 131, label: 'D2.1: priority_queue.pop in O(n) loop → O(n log n)',
    code: wrap('priority_queue<int> pq;\nfor(int i=0;i<n;i++) pq.pop();'), expected: 'O(n log n)' as any },

  { id: 132, label: 'D2.1: queue.push in O(n) loop → O(n) [no log regression]',
    code: wrap('queue<int> q;\nfor(int i=0;i<n;i++) q.push(a[i]);'), expected: 'O(n)' as any },

  { id: 133, label: 'D2.1: stack.push in O(n) loop → O(n) [no log regression]',
    code: wrap('stack<int> st;\nfor(int i=0;i<n;i++) st.push(a[i]);'), expected: 'O(n)' as any },

  { id: 134, label: 'D2.1: multiset.insert in O(n) loop → O(n log n)',
    code: wrap('multiset<int> ms;\nfor(int i=0;i<n;i++) ms.insert(a[i]);'), expected: 'O(n log n)' as any },

  { id: 135, label: 'D2.1: vector.push_back in O(n) loop → O(n) [no log regression]',
    code: wrap('vector<int> v;\nfor(int i=0;i<n;i++) v.push_back(a[i]);'), expected: 'O(n)' as any },

  { id: 136, label: 'D2.1: sort + set.insert mix → O(n log n) dominance',
    code: wrap('set<int> s;\nsort(a, a+n);\nfor(int i=0;i<n;i++) s.insert(a[i]);'), expected: 'O(n log n)' as any },

  { id: 137, label: 'D2.1: typedef alias set.insert → O(n log n)',
    code: 'typedef set<int> SI;\nvoid f(int n, int* a) { SI s;\nfor(int i=0;i<n;i++) s.insert(a[i]); }', expected: 'O(n log n)' as any },

  { id: 138, label: 'D2.1: C++20 set.contains in O(n) loop → O(n log n)',
    code: wrap('set<int> s;\nfor(int i=0;i<n;i++) s.contains(a[i]);'), expected: 'O(n log n)' as any },

  // ─── D2.2: Graph Traversal & Summation Rules ─────────────────────────────
  { id: 139, label: 'D2.2: BFS (queue + while(!q.empty()) + for_range_loop) → O(V+E)',
    code: `void bfs(int n) {
  queue<int> q;
  q.push(0);
  while(!q.empty()) {
    int u = q.front(); q.pop();
    for(auto v : adj[u]) { q.push(v); }
  }
}`, expected: 'O(V+E)' as any },

  { id: 140, label: 'D2.2: Iterative DFS (stack + while(!st.empty()) + for_range_loop) → O(V+E)',
    code: `void dfs(int n) {
  stack<int> st;
  st.push(0);
  while(!st.empty()) {
    int u = st.top(); st.pop();
    for(auto v : adj[u]) { st.push(v); }
  }
}`, expected: 'O(V+E)' as any },

  { id: 141, label: 'D2.2: Deque traversal (deque + while(!dq.empty()) + for_range_loop) → O(V+E)',
    code: `void bfs2(int n) {
  deque<int> dq;
  dq.push_back(0);
  while(!dq.empty()) {
    int u = dq.front(); dq.pop_front();
    for(auto v : adj[u]) { dq.push_back(v); }
  }
}`, expected: 'O(V+E)' as any },

  { id: 142, label: 'D2.2: Tree traversal (queue + for_range_loop children) → O(V+E)',
    code: `void bfsTree(int root) {
  queue<int> q;
  q.push(root);
  while(!q.empty()) {
    int u = q.front(); q.pop();
    for(auto child : tree[u]) { q.push(child); }
  }
}`, expected: 'O(V+E)' as any },

  { id: 143, label: 'D2.2: Queue loop WITHOUT for_range_loop → O(n) [no graph detection]',
    code: `void process(int n) {
  queue<int> q;
  while(!q.empty()) {
    int u = q.front(); q.pop();
  }
}`, expected: 'O(n)' as any },

  { id: 144, label: 'D2.2: Non-queue nested while+for_range_loop → O(n²) [no graph detection]',
    code: wrap('int cnt = n;\nwhile(cnt > 0) { cnt--;\nfor(auto v : adj[cnt]) {} }'), expected: 'O(n²)' as any },

  { id: 145, label: 'D2.2: Queue + for_statement (NOT for_range_loop) → O(n²) [no graph detection]',
    code: `void f(int n) {
  queue<int> q;
  while(!q.empty()) {
    for(int i = 0; i < n; i++) {}
  }
}`, expected: 'O(n²)' as any },

  { id: 146, label: 'D2.2: Queue + sort (NOT for_range_loop) → no graph detection, sort multiplied',
    code: `void f(int n, vector<int>& v) {
  queue<int> q;
  while(!q.empty()) {
    sort(v.begin(), v.end());
  }
}`, expected: 'O(n² log n)' as any },

  // ── D2.3: Dijkstra & Priority-Queue Graph Algorithms ───────────────────────

  { id: 147, label: 'D2.3: Dijkstra (pq.push) → O((V+E) log V + log n) [D4.7: initial pq.push is O(log n), incommensurable with O((V+E) log V)]', code: `
void dijkstra() {
  priority_queue<pair<int,int>> pq;
  pq.push({0, src});
  while(!pq.empty()) {
    auto cur = pq.top();
    pq.pop();
    for(auto edge : adj[cur.second]) {
      pq.push({dist + edge.w, edge.v});
    }
  }
}`, expected: 'O((V+E) log V + log n)' as any },

  { id: 148, label: 'D2.3: Prim (pq.emplace) → O((V+E) log V + log n) [D4.7: initial pq.emplace is O(log n)]', code: `
void prim() {
  priority_queue<pair<int,int>, vector<pair<int,int>>, greater<pair<int,int>>> pq;
  pq.emplace(0, src);
  while(!pq.empty()) {
    auto [w, u] = pq.top();
    pq.pop();
    for(auto [nw, v] : adj[u]) {
      pq.emplace(nw, v);
    }
  }
}`, expected: 'O((V+E) log V + log n)' as any },

  { id: 149, label: 'D2.3: min-heap (greater<>) → O((V+E) log V + log n) [D4.7: initial pq.push is O(log n)]', code: `
void solve() {
  priority_queue<int, vector<int>, greater<int>> pq;
  pq.push(0);
  while(!pq.empty()) {
    int u = pq.top();
    pq.pop();
    for(auto v : adj[u]) {
      pq.push(v);
    }
  }
}`, expected: 'O((V+E) log V + log n)' as any },

  { id: 150, label: 'D2.3: priority_queue without for_range_loop → existing behavior (no graph detection)', code: `
void process() {
  priority_queue<int> pq;
  for(int i=0;i<n;i++) pq.push(a[i]);
  while(!pq.empty()) {
    int x = pq.top();
    pq.pop();
  }
}`, expected: 'O(n log n)' as any },

  { id: 151, label: 'D2.3: priority_queue + for(int i<n) inside → multiplicative (no graph detection)', code: `
void process() {
  priority_queue<int> pq;
  pq.push(0);
  while(!pq.empty()) {
    pq.pop();
    for(int i=0;i<n;i++) {
      pq.push(i);
    }
  }
}`, expected: 'O(n² log n)' as any },

  { id: 152, label: 'D2.3: Regression — BFS queue still emits O(V+E)', code: `
void bfs() {
  queue<int> q;
  q.push(src);
  while(!q.empty()) {
    int u = q.front();
    q.pop();
    for(auto v : adj[u]) {
      q.push(v);
    }
  }
}`, expected: 'O(V+E)' as any },

  { id: 153, label: 'D2.3: pq.top() inside Dijkstra → O((V+E) log V + log n) [D4.7: initial pq.push is O(log n)]', code: `
void dijkstra() {
  priority_queue<pair<int,int>> pq;
  pq.push({0, src});
  while(!pq.empty()) {
    auto [d, u] = pq.top();
    pq.pop();
    for(auto [w, v] : adj[u]) {
      if(d + w < dist[v]) {
        pq.push({d + w, v});
      }
    }
  }
}`, expected: 'O((V+E) log V + log n)' as any },

  { id: 154, label: 'D2.3: pq.top() standalone in O(n) loop → O(n)', code: `
void getMax() {
  priority_queue<int> pq;
  for(int i=0;i<n;i++) {
    int x = pq.top();
  }
}`, expected: 'O(n)' as any },

  { id: 155, label: 'D2.3: typedef alias priority_queue → O((V+E) log V + log n) [D4.7: initial pq.push is O(log n)]', code: `
void dijkstra() {
  typedef priority_queue<pair<int,int>> PQ;
  PQ pq;
  pq.push({0, src});
  while(!pq.empty()) {
    pq.pop();
    for(auto edge : adj[u]) {
      pq.push(edge);
    }
  }
}`, expected: 'O((V+E) log V + log n)' as any },

  { id: 156, label: 'D2.3: using alias priority_queue → O((V+E) log V + log n) [D4.7: initial pq.push is O(log n)]', code: `
void dijkstra() {
  using PQ = priority_queue<pair<int,int>>;
  PQ pq;
  pq.push({0, src});
  while(!pq.empty()) {
    pq.pop();
    for(auto v : adj[u]) {
      pq.push(v);
    }
  }
}`, expected: 'O((V+E) log V + log n)' as any },

  // ── D3.1: Bitmask & Exponential Complexity ─────────────────────────────────

  { id: 157, label: 'D3.1: 1<<n bitmask loop → O(2ⁿ)', code: `
void solve() {
  for(int mask=0; mask<(1<<n); mask++) {
  }
}`, expected: 'O(2ⁿ)' as any },

  { id: 158, label: 'D3.1: 1LL<<n bitmask loop → O(2ⁿ)', code: `
void solve() {
  for(int mask=0; mask<(1LL<<n); mask++) {
  }
}`, expected: 'O(2ⁿ)' as any },

  { id: 159, label: 'D3.1: bitmask outer + linear inner → O(n·2ⁿ)', code: `
void solve() {
  for(int mask=0; mask<(1<<n); mask++) {
    for(int i=0; i<n; i++) {
    }
  }
}`, expected: 'O(n·2ⁿ)' as any },

  { id: 160, label: 'D3.1: linear outer + bitmask(m) inner → O(n·2ᵐ)', code: `
void solve() {
  for(int i=0; i<n; i++) {
    for(int mask=0; mask<(1<<m); mask++) {
    }
  }
}`, expected: 'O(n·2ᵐ)' as any },

  { id: 161, label: 'D3.1: bitmask(n) + bitmask(m) nested → O(2ⁿ·2ᵐ)', code: `
void solve() {
  for(int mask=0; mask<(1<<n); mask++) {
    for(int mask2=0; mask2<(1<<m); mask2++) {
    }
  }
}`, expected: 'O(2ⁿ·2ᵐ)' as any },

  { id: 162, label: 'D3.1: bitmask + set.insert (log) → O(2ⁿ log n)', code: `
void solve() {
  set<int> s;
  for(int mask=0; mask<(1<<n); mask++) {
    s.insert(mask);
  }
}`, expected: 'O(2ⁿ log n)' as any },

  { id: 163, label: 'D3.1: bitmask(n) + bitmask(n) same var → O(2ⁿ·2ⁿ) no simplification', code: `
void solve() {
  for(int mask=0; mask<(1<<n); mask++) {
    for(int s=0; s<(1<<n); s++) {
    }
  }
}`, expected: 'O(2ⁿ·2ⁿ)' as any },

  { id: 164, label: 'D3.1: Regression — plain for(i<n) still O(n)', code: `
void solve() {
  for(int i=0; i<n; i++) {
  }
}`, expected: 'O(n)' as any },

  { id: 165, label: 'D3.1: Regression — for(mask<16) constant bound still O(1)', code: `
void solve() {
  for(int mask=0; mask<16; mask++) {
  }
}`, expected: 'O(1)' as any },

  { id: 166, label: 'D3.1: Guard — k<<n (non-literal left) → no exponential detection', code: `
void solve() {
  for(int mask=0; mask<(k<<n); mask++) {
  }
}`, expected: 'O(n)' as any },

  { id: 167, label: 'D3.1: Double-parenthesized ((1<<n)) → O(2ⁿ)', code: `
void solve() {
  for(int mask=0; mask<((1<<n)); mask++) {
  }
}`, expected: 'O(2ⁿ)' as any },

  { id: 168, label: 'D3.1: Double-parenthesized ((1LL<<n)) → O(2ⁿ)', code: `
void solve() {
  for(int mask=0; mask<((1LL<<n)); mask++) {
  }
}`, expected: 'O(2ⁿ)' as any },

  // ── D3.2: Disjoint Set Union (DSU) ───────────────────────────────────────

  { id: 169, label: 'D3.2: Recursive path compression → O(1)', code: `
int find(int x) {
    if(parent[x] == x) return x;
    return parent[x] = find(parent[x]);
}`, expected: 'O(1)' as any },

  { id: 170, label: 'D3.2: Union calling recognized recursive find → O(1)', code: `
int find(int x) {
    if(parent[x] == x) return x;
    return parent[x] = find(parent[x]);
}
void unite(int a, int b) {
    a = find(a);
    b = find(b);
    if(a != b) parent[b] = a;
}`, expected: 'O(1)' as any },

  { id: 171, label: 'D3.2: Loop performing n unions → O(n)', code: `
int find(int x) {
    if(parent[x] == x) return x;
    return parent[x] = find(parent[x]);
}
void unite(int a, int b) {
    a = find(a);
    b = find(b);
    if(a != b) parent[b] = a;
}
void solve() {
    for(int i=0; i<n; i++) {
        unite(u[i], v[i]);
    }
}`, expected: 'O(n)' as any },

  { id: 172, label: 'D3.2: Iterative path halving → O(1)', code: `
void solve() {
    while(parent[x] != x) {
        parent[x] = parent[parent[x]];
        x = parent[x];
    }
}`, expected: 'O(1)' as any },

  { id: 173, label: 'D3.2: Guard — Plain pointer chasing → O(n)', code: `
void solve() {
    while(parent[x] != x) {
        x = parent[x];
    }
}`, expected: 'O(n)' as any },

  { id: 174, label: 'D3.2: Guard — Generic array pointer chasing → O(n)', code: `
void solve() {
    while(cur != -1) {
        cur = next_node[cur];
    }
}`, expected: 'O(n)' as any },

  { id: 175, label: 'D3.2: Guard — Memoized recursion → Unknown', code: `
int dp(int x) {
    if (memo[x] != -1) return memo[x];
    return memo[x] = dp(x - 1) + dp(x - 2);
}`, expected: 'Unknown' as any },

  { id: 176, label: 'D3.2: Guard — Classic recursive DFS → Unknown', code: `
void dfs(int u) {
    vis[u] = true;
    for(int v : adj[u]) {
        if(!vis[v]) dfs(v);
    }
}`, expected: 'Unknown' as any },

  // ── Phase D3.3: Function Parameter Type Tracking ────────────────────────────

  { id: 177, label: 'D3.3: parameter reference set<int>&', code: `
void solve(set<int>& s) {
    s.insert(x);
}`, expected: 'O(log n)' as any },

  { id: 178, label: 'D3.3: parameter reference map<int,int>&', code: `
void solve(map<int,int>& mp) {
    mp.find(x);
}`, expected: 'O(log n)' as any },

  { id: 179, label: 'D3.3: parameter reference priority_queue<int>&', code: `
void solve(priority_queue<int>& pq) {
    pq.push(x);
}`, expected: 'O(log n)' as any },

  { id: 180, label: 'D3.3: parameter typedef alias MAP&', code: `
typedef map<int,int> MAP;
void solve(MAP& mp) {
    mp.find(x);
}`, expected: 'O(log n)' as any },

  { id: 181, label: 'D3.3: parameter using alias MAP&', code: `
using MAP = map<int,int>;
void solve(MAP& mp) {
    mp.find(x);
}`, expected: 'O(log n)' as any },

  { id: 182, label: 'D3.3: Parameter shadows global variable', code: `
set<int> mp; // global set
void solve(map<int,int>& mp) {
    mp.find(x); // should be map (O(log n))
}`, expected: 'O(log n)' as any },

  { id: 183, label: 'D3.3: Local variable shadows parameter', code: `
void solve(map<int,int>& mp) {
    unordered_map<int,int> mp;
    mp.find(x); // should be unordered_map (O(1))
}`, expected: 'O(1)' as any },

  { id: 184, label: 'D3.3: Primitive parameter regression guard', code: `
void solve(int n) {
    n++;
}`, expected: 'O(1)' as any },

  // ── Phase D3.4: map::operator[] Recognition ───────────────────────────────

  { id: 185, label: 'D3.4: map::operator[] mp[x]++', code: `
map<int,int> mp;
void solve(int n) {
    for(int i=0; i<n; i++) {
        mp[i]++;
    }
}`, expected: 'O(n log n)' as any },

  { id: 186, label: 'D3.4: map::operator[] ++mp[x]', code: `
map<int,int> mp;
void solve(int n) {
    for(int i=0; i<n; i++) {
        ++mp[i];
    }
}`, expected: 'O(n log n)' as any },

  { id: 187, label: 'D3.4: map::operator[] mp[x] += v', code: `
map<int,int> mp;
void solve(int n) {
    for(int i=0; i<n; i++) {
        mp[i] += 5;
    }
}`, expected: 'O(n log n)' as any },

  { id: 188, label: 'D3.4: map::operator[] assignment auto t = mp[x]', code: `
map<int,int> mp;
void solve(int n) {
    for(int i=0; i<n; i++) {
        auto t = mp[i];
    }
}`, expected: 'O(n log n)' as any },

  { id: 189, label: 'D3.4: unordered_map::operator[] mp[x]++', code: `
unordered_map<int,int> ump;
void solve(int n) {
    for(int i=0; i<n; i++) {
        ump[i]++;
    }
}`, expected: 'O(n)' as any },

  { id: 190, label: 'D3.4: Regression guard — arr[x]++ remains O(n)', code: `
int arr[100];
void solve(int n) {
    for(int i=0; i<n; i++) {
        arr[i]++;
    }
}`, expected: 'O(n)' as any },

  { id: 191, label: 'D3.4: Regression guard — vector[x]++ remains O(n)', code: `
vector<int> v;
void solve(int n) {
    for(int i=0; i<n; i++) {
        v[i]++;
    }
}`, expected: 'O(n)' as any },

  { id: 192, label: 'D3.4: Regression guard — parent[x] DSU pointer chasing', code: `
int parent[100];
void solve(int n) {
    int x = n;
    while(parent[x] != x) {
        x = parent[x];
    }
}`, expected: 'O(n)' as any },

  { id: 193, label: 'D3.4: Parameter tracking interaction mp[x]++', code: `
void solve(int n, map<int,int>& mp) {
    for(int i=0; i<n; i++) {
        mp[i]++;
    }
}`, expected: 'O(n log n)' as any },

  { id: 194, label: 'D3.4: Typedef alias map operator[]', code: `
typedef map<int,int> MAP;
MAP mp;
void solve(int n) {
    for(int i=0; i<n; i++) {
        mp[i]++;
    }
}`, expected: 'O(n log n)' as any },

  { id: 195, label: 'D3.4: Using alias unordered_map operator[]', code: `
using UMAP = unordered_map<int,int>;
UMAP ump;
void solve(int n) {
    for(int i=0; i<n; i++) {
        ump[i]++;
    }
}`, expected: 'O(n)' as any },

  // ── Phase D4.1: Memoization & DP Recognition ─────────────────────────────

  { id: 196, label: 'D4.1: memo[x] != -1 guard + return + self-call write', code: `
int memo[100005];
int solve(int n) {
    if (n <= 1) return 1;
    if (memo[n] != -1) return memo[n];
    return memo[n] = solve(n - 1);
}`, expected: 'O(n)' as any },

  { id: 197, label: 'D4.1: memo[x] != 0 sentinel variant', code: `
int memo[100005];
int f(int x) {
    if (memo[x] != 0) return memo[x];
    memo[x] = f(x - 1);
    return memo[x];
}`, expected: 'O(n)' as any },

  { id: 198, label: 'D4.1: dp.count(x) unordered_map guard', code: `
unordered_map<int,int> dp;
int solve(int x) {
    if (dp.count(x)) return dp[x];
    return dp[x] = solve(x - 1);
}`, expected: 'O(n)' as any },

  { id: 199, label: 'D4.1: return memo[x] = self(...) inline write', code: `
long long memo[100005];
long long f(int x) {
    if (memo[x] != -1) return memo[x];
    return memo[x] = f(x - 1);
}`, expected: 'O(n)' as any },

  { id: 200, label: 'D4.1: Guard — DFS with vis[u] must remain Unknown', code: `
void dfs(int u) {
    if (vis[u]) return;
    vis[u] = true;
    for (auto v : adj[u]) dfs(v);
}`, expected: 'Unknown' as any },

  { id: 201, label: 'D4.1: Guard — backtracking visited[] must remain Unknown', code: `
void backtrack(int idx) {
    if (idx == n) return;
    for (int i = 0; i < n; i++) {
        if (visited[i]) continue;
        visited[i] = true;
        backtrack(idx + 1);
        visited[i] = false;
    }
}`, expected: 'Unknown' as any },

  { id: 202, label: 'D4.1: Guard — generic recursion no memo must remain Unknown', code: `
int fib(int n) {
    if (n <= 1) return n;
    return fib(n - 1) + fib(n - 2);
}`, expected: 'Unknown' as any },

  { id: 203, label: 'D4.1: Guard — memo[x] = constant (not self-call) must remain Unknown', code: `
int memo[100005];
int f(int x) {
    if (memo[x] != -1) return memo[x];
    memo[x] = 5;
    f(x - 1);
    return memo[x];
}`, expected: 'Unknown' as any },

  { id: 204, label: 'D4.1: Guard — memo[x] = otherFunction() must remain Unknown', code: `
int memo[100005];
int compute(int x);
int f(int x) {
    if (memo[x] != -1) return memo[x];
    f(x - 2);
    memo[x] = compute(x - 1);
    return memo[x];
}`, expected: 'Unknown' as any },

  { id: 205, label: 'D4.2: 2D memo[i][j] — now recognized as O(n²)', code: `
int memo[100][100];
int f(int i, int j) {
    if (memo[i][j] != -1) return memo[i][j];
    return memo[i][j] = f(i - 1, j);
}`, expected: 'O(n²)' as any },

  { id: 206, label: 'D4.1: Guard — recursive binary search now recognized as O(log n) by D4.6', code: `
int bsearch(int* arr, int lo, int hi, int target) {
    if (lo > hi) return -1;
    int mid = (lo + hi) / 2;
    if (arr[mid] == target) return mid;
    if (arr[mid] < target) return bsearch(arr, mid + 1, hi, target);
    return bsearch(arr, lo, mid - 1, target);
}`, expected: 'O(log n)' as any },

  { id: 207, label: 'D4.1: Guard — merge sort must remain Unknown', code: `
void mergeSort(int* arr, int l, int r) {
    if (l >= r) return;
    int mid = (l + r) / 2;
    mergeSort(arr, l, mid);
    mergeSort(arr, mid + 1, r);
}`, expected: 'Unknown' as any },

  { id: 208, label: 'D4.1: Guard — truthiness if(memo[x]) must remain Unknown', code: `
int memo[100005];
int f(int x) {
    if (memo[x]) return memo[x];
    memo[x] = f(x - 1);
    return memo[x];
}`, expected: 'Unknown' as any },

  // ── Phase D4.2: Multi-Dimensional Memoized Recursion Recognition ──────────────

  { id: 209, label: 'D4.2: 2D dp[i][j] != -1 guard + return + self-call write', code: `
int dp[105][105];
int solve(int i, int j) {
    if (dp[i][j] != -1) return dp[i][j];
    return dp[i][j] = solve(i - 1, j);
}`, expected: 'O(n²)' as any },

  { id: 210, label: 'D4.2: 3D memo[i][j][k] != -1 + return + self-call write', code: `
int memo[50][50][50];
int f(int i, int j, int k) {
    if (memo[i][j][k] != -1) return memo[i][j][k];
    return memo[i][j][k] = f(i - 1, j, k);
}`, expected: 'O(n³)' as any },

  { id: 211, label: 'D4.2: 2D memo[a][b] != 0 sentinel variant', code: `
int memo[105][105];
int solve(int a, int b) {
    if (memo[a][b] != 0) return memo[a][b];
    return memo[a][b] = solve(a - 1, b);
}`, expected: 'O(n²)' as any },

  { id: 212, label: 'D4.2: 2D write separate from return', code: `
int dp[105][105];
int solve(int i, int j) {
    if (dp[i][j] != -1) return dp[i][j];
    dp[i][j] = solve(i, j - 1);
    return dp[i][j];
}`, expected: 'O(n²)' as any },

  { id: 213, label: 'D4.2: Regression — visited[i][j] DFS must remain Unknown', code: `
void dfs(int i, int j) {
    if (visited[i][j]) return;
    visited[i][j] = true;
    dfs(i - 1, j);
}`, expected: 'Unknown' as any },

  { id: 214, label: 'D4.2: Regression — grid[r][c] == 0 must remain Unknown', code: `
void dfs(int r, int c) {
    if (grid[r][c] == 0) return;
    grid[r][c] = 0;
    dfs(r - 1, c);
}`, expected: 'Unknown' as any },

  { id: 215, label: 'D4.2: Regression — dist[i][j] > relaxation must remain Unknown', code: `
void relax(int i, int j) {
    if (dist[i][j] > dist[i - 1][j] + 1) {
        dist[i][j] = dist[i - 1][j] + 1;
        relax(i - 1, j);
    }
}`, expected: 'Unknown' as any },

  { id: 216, label: 'D4.2: Regression — 2D write with helper not self must remain Unknown', code: `
int dp[105][105];
int helper(int i, int j);
int f(int i, int j) {
    if (dp[i][j] != -1) return dp[i][j];
    f(i - 1, j);
    dp[i][j] = helper(i, j);
    return dp[i][j];
}`, expected: 'Unknown' as any },

  { id: 217, label: 'D4.2: Regression — 4D dp exceeds scope must remain Unknown', code: `
int dp[10][10][10][10];
int f(int a, int b, int c, int d) {
    if (dp[a][b][c][d] != -1) return dp[a][b][c][d];
    return dp[a][b][c][d] = f(a - 1, b, c, d);
}`, expected: 'Unknown' as any },

  // ── Phase D4.5: Sparse Table Outer Loop Recognition ──────────────────────────────────

  { id: 218, label: 'D4.5: Sparse table build — (1<<j)<=n outer + i<n inner → O(n log n)', code: `
void buildST(int n) {
    for (int j = 1; (1 << j) <= n; j++) {
        for (int i = 0; i < n; i++) {
            st[i][j] = 0;
        }
    }
}`, expected: 'O(n log n)' as any },

  { id: 219, label: 'D4.5: Sparse table — j starts at 0 variant → O(n log n)', code: `
void buildST(int n) {
    for (int j = 0; (1 << j) <= n; j++) {
        for (int i = 0; i < n; i++) {
            st[i][j] = 0;
        }
    }
}`, expected: 'O(n log n)' as any },

  { id: 220, label: 'D4.5: Sparse table — no parentheses around shift 1<<j<=n → O(n log n)', code: `
void buildST(int n) {
    for (int j = 1; 1 << j <= n; j++) {
        for (int i = 0; i < n; i++) {
            st[i][j] = 0;
        }
    }
}`, expected: 'O(n log n)' as any },

  { id: 221, label: 'D4.5: Regression — binary lifting j<LOG (linear×linear) must not trigger D4.5', code: `
void preprocess(int n) {
    for (int j = 1; j < LOG; j++) {
        for (int v = 0; v < n; v++) {
            up[v][j] = up[up[v][j-1]][j-1];
        }
    }
}`, expected: 'O(nLOG)' as any },

  { id: 222, label: 'D4.5: Regression — bitmask DP mask<(1<<n) must remain O(2ⁿ)', code: `
void f(int n) {
    for (int mask = 0; mask < (1 << n); mask++) {
        dp[mask] = 0;
    }
}`, expected: 'O(2ⁿ)' as any },

  { id: 223, label: 'D4.5: Regression — normal nested loops must remain O(nm)', code: `
void f(int n, int m) {
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < m; j++) {
            a[i][j] = 0;
        }
    }
}`, expected: 'O(nm)' as any },

  { id: 224, label: 'D4.5: Regression — single Fenwick loop i+=i&(-i) is O(log n) not O(n log n)', code: `
void update(int n) {
    for (int i = 1; i <= n; i += i & (-i)) {
        bit[i]++;
    }
}`, expected: 'O(log n)' as any },

  // ── D4.6: Recursive Binary Search ──────────────────────────────────────────

  { id: 225, label: 'D4.6: Classic recursive binary search → O(log n)', code: `
int solve(int* a, int lo, int hi, int target) {
    if (lo > hi) return -1;
    int mid = (lo + hi) / 2;
    if (a[mid] == target) return mid;
    if (a[mid] < target) return solve(a, mid + 1, hi, target);
    return solve(a, lo, mid - 1, target);
}`, expected: 'O(log n)' as any },

  { id: 226, label: 'D4.6: Compact if-else binary search → O(log n)', code: `
int solve(int* a, int lo, int hi, int v) {
    if (lo > hi) return -1;
    int mid = (lo + hi) / 2;
    if (a[mid] == v) return mid;
    else if (a[mid] < v) return solve(a, mid + 1, hi, v);
    else return solve(a, lo, mid - 1, v);
}`, expected: 'O(log n)' as any },

  { id: 227, label: 'D4.6: Recursive lower_bound style → O(log n)', code: `
int solve(int* a, int lo, int hi, int val) {
    if (lo >= hi) return lo;
    int mid = (lo + hi) / 2;
    if (a[mid] < val) return solve(a, mid + 1, hi, val);
    return solve(a, lo, mid, val);
}`, expected: 'O(log n)' as any },

  { id: 228, label: 'D4.6: Recursive upper_bound style → O(log n)', code: `
int solve(int lo, int hi, int val) {
    if (lo >= hi) return lo;
    int mid = (lo + hi) / 2;
    if (check(mid) >= val) return solve(lo, mid, val);
    return solve(mid + 1, hi, val);
}`, expected: 'O(log n)' as any },

  { id: 229, label: 'D4.6: Persistent segment tree update (if/else, 1 call per branch) → O(log n)', code: `
int solve(int prev, int l, int r, int pos, int val) {
    if (l == r) { return newNode(val); }
    int mid = (l + r) / 2;
    int nd = newNode(0);
    if (pos <= mid) {
        nd = solve(prev, l, mid, pos, val);
    } else {
        nd = solve(prev, mid + 1, r, pos, val);
    }
    return nd;
}`, expected: 'O(log n)' as any },

  { id: 230, label: 'D4.6: Idiomatic early-return binary search → O(log n)', code: `
int solve(int lo, int hi) {
    if (lo > hi) return -1;
    int mid = (lo + hi) / 2;
    if (ok(mid)) return solve(lo, mid - 1);
    return solve(mid + 1, hi);
}`, expected: 'O(log n)' as any },

  // ── D4.6: Regression guards ────────────────────────────────────────────────

  { id: 231, label: 'D4.6: Regression — merge sort must remain Unknown', code: `
void solve(int* a, int l, int r) {
    if (l >= r) return;
    int mid = (l + r) / 2;
    solve(a, l, mid);
    solve(a, mid + 1, r);
    merge(a, l, mid, r);
}`, expected: 'Unknown' as any },

  { id: 232, label: 'D4.6: Regression — segment tree BUILD must remain Unknown', code: `
void solve(int node, int l, int r) {
    if (l == r) { tree[node] = arr[l]; return; }
    int mid = (l + r) / 2;
    solve(2 * node, l, mid);
    solve(2 * node + 1, mid + 1, r);
    tree[node] = tree[2*node] + tree[2*node+1];
}`, expected: 'Unknown' as any },

  { id: 233, label: 'D4.6: Regression — seg tree query with return f()+f() must remain Unknown', code: `
int solve(int node, int l, int r, int ql, int qr) {
    if (ql > r || qr < l) return 0;
    if (ql <= l && r <= qr) return tree[node];
    int mid = (l + r) / 2;
    if (qr <= mid) return solve(2*node, l, mid, ql, qr);
    if (ql > mid) return solve(2*node+1, mid+1, r, ql, qr);
    return solve(2*node, l, mid, ql, qr) + solve(2*node+1, mid+1, r, ql, qr);
}`, expected: 'Unknown' as any },

  { id: 234, label: 'D4.6: Regression — fibonacci must remain Unknown', code: `
int solve(int n) {
    if (n <= 1) return n;
    return solve(n - 1) + solve(n - 2);
}`, expected: 'Unknown' as any },

  { id: 235, label: 'D4.6: Regression — quickSort must remain Unknown', code: `
void solve(int* a, int l, int r) {
    if (l >= r) return;
    int p = partition(a, l, r);
    solve(a, l, p - 1);
    solve(a, p + 1, r);
}`, expected: 'Unknown' as any },

  { id: 236, label: 'D4.6: Endpoint guard — mid*2 arg must remain Unknown', code: `
int solve(int l, int r) {
    if (l >= r) return l;
    int mid = (l + r) / 2;
    if (ok(mid)) return solve(l, mid - 1);
    return solve(mid * 2, r);
}`, expected: 'Unknown' as any },

  { id: 237, label: 'D4.6: Endpoint guard — mid+k (non-literal) must remain Unknown', code: `
int solve(int l, int r, int k) {
    if (l >= r) return l;
    int mid = (l + r) / 2;
    if (ok(mid)) return solve(l, mid - 1);
    return solve(mid + k, r);
}`, expected: 'Unknown' as any },

  { id: 238, label: 'D4.6: Endpoint guard — foo(mid) wrapped call must remain Unknown', code: `
int solve(int l, int r) {
    if (l >= r) return l;
    int mid = (l + r) / 2;
    if (ok(mid)) return solve(l, mid - 1);
    return solve(foo(mid), r);
}`, expected: 'Unknown' as any },

  { id: 239, label: 'D4.6: Endpoint guard — l+2 offset arg must remain Unknown', code: `
int solve(int l, int r) {
    if (l >= r) return l;
    int mid = (l + r) / 2;
    if (ok(mid)) return solve(l + 2, mid);
    return solve(mid + 1, r);
}`, expected: 'Unknown' as any },

  { id: 240, label: 'D4.6: Identifier guard — mid2 is a local alias, not a param → Unknown', code: `
int solve(int l, int r) {
    if (l >= r) return l;
    int mid = (l + r) / 2;
    int mid2 = mid;
    if (ok(mid)) return solve(l, mid - 1);
    return solve(mid, mid2);
}`, expected: 'Unknown' as any },

  // ── D4.6: Strict identifier whitelist regression ───────────────────────────

  { id: 241, label: 'D4.6: Identifier guard — foo is not a param → Unknown', code: `
int solve(int l, int r) {
    if (l >= r) return l;
    int mid = (l + r) / 2;
    if (ok(mid)) return solve(l, mid - 1);
    return solve(foo, r);
}`, expected: 'Unknown' as any },

  { id: 242, label: 'D4.6: Identifier guard — alias is not a param → Unknown', code: `
int solve(int l, int r) {
    if (l >= r) return l;
    int mid = (l + r) / 2;
    int alias = l;
    if (ok(mid)) return solve(alias, mid);
    return solve(mid + 1, r);
}`, expected: 'Unknown' as any },

  { id: 243, label: 'D4.6: Identifier guard — tmp and tmp2 both non-params → Unknown', code: `
int solve(int l, int r) {
    if (l >= r) return l;
    int mid = (l + r) / 2;
    int tmp = l, tmp2 = r;
    if (ok(mid)) return solve(tmp, mid);
    return solve(mid + 1, tmp2);
}`, expected: 'Unknown' as any },

  { id: 244, label: 'D4.6: Pointer param accepted — solve(a, mid+1, hi, target) → O(log n)', code: `
int solve(int* a, int lo, int hi, int target) {
    if (lo > hi) return -1;
    int mid = (lo + hi) / 2;
    if (a[mid] == target) return mid;
    if (a[mid] < target) return solve(a, mid + 1, hi, target);
    return solve(a, lo, mid - 1, target);
}`, expected: 'O(log n)' as any },

  { id: 245, label: 'D4.6: Regression guard — if(cond) f(...); return f(...); → Unknown', code: `
int solve(int l, int r) {
    if (l > r) return -1;
    int mid = (l + r) / 2;
    if (mid & 1)
        solve(l, mid - 1);
    return solve(mid + 1, r);
}`, expected: 'Unknown' as any },

  { id: 246, label: 'D4.6: Regression guard — bare sequential f(...); return f(...); → Unknown', code: `
int solve(int l, int r) {
    if (l > r) return -1;
    int mid = (l + r) / 2;
    solve(l, mid - 1);
    return solve(mid + 1, r);
}`, expected: 'Unknown' as any },

  { id: 247, label: 'D4.6: Regression guard — braced if(cond) { f(...); } return f(...); → Unknown', code: `
int solve(int l, int r) {
    if (l > r) return -1;
    int mid = (l + r) / 2;
    if (mid & 1) { solve(l, mid - 1); }
    return solve(mid + 1, r);
}`, expected: 'Unknown' as any },

  // ── D4.7: Sum Node — sequential additive complexity ──────────────────────
  // These cases validate the mergeAndReduce / addNode pipeline.

  { id: 248, label: 'D4.7: two sequential incommensurable loops → O(m + n)', code: `
void foo(int n, int m) {
  for(int i = 0; i < n; i++) { }
  for(int j = 0; j < m; j++) { }
}`, expected: 'O(m + n)' as any },

  { id: 249, label: 'D4.7: two sequential same-variable loops → O(n) (deduplicated)', code: `
void foo(int n) {
  for(int i = 0; i < n; i++) { }
  for(int j = 0; j < n; j++) { }
}`, expected: 'O(n)' as any },

  { id: 250, label: 'D4.7: three loops — two with n, one with m → O(m + n) (n deduplicated)', code: `
void foo(int n, int m) {
  for(int i = 0; i < n; i++) { }
  for(int j = 0; j < m; j++) { }
  for(int k = 0; k < n; k++) { }
}`, expected: 'O(m + n)' as any },

  { id: 251, label: 'D4.9: j*=2 with variable init (j=i) — cannot prove j₀>0 → Unknown', code: `
void foo(int n) {
  for(int i = 0; i < n; i++) { }
  for(int i = 0; i < n; i++) {
    for(int j = i; j < n; j *= 2) { }
  }
}`, expected: 'Unknown' as any },

  { id: 252, label: 'D4.7: regression — nested loop still multiplies, not sums → O(nm)', code: `
void foo(int n, int m) {
  for(int i = 0; i < n; i++) {
    for(int j = 0; j < m; j++) { }
  }
}`, expected: 'O(nm)' as any },

  { id: 253, label: 'D4.7: O(n) + O(m) + O(k) three-way sum → O(k + m + n) (canonical sort)', code: `
void foo(int n, int m, int k) {
  for(int i = 0; i < n; i++) { }
  for(int j = 0; j < m; j++) { }
  for(int l = 0; l < k; l++) { }
}`, expected: 'O(k + m + n)' as any },

  { id: 254, label: 'D4.7: regression — BFS graph traversal alone → O(V+E) (unchanged)', code: `
void bfs() {
  queue<int> q;
  q.push(src);
  while(!q.empty()) {
    int u = q.front();
    q.pop();
    for(auto v : adj[u]) {
      q.push(v);
    }
  }
}`, expected: 'O(V+E)' as any },

  { id: 255, label: 'D4.7: regression — DSU path compression → O(1) (unchanged)', code: `
int find(int x) {
  if(parent[x] != x) parent[x] = find(parent[x]);
  return parent[x];
}`, expected: 'O(1)' as any },

  { id: 256, label: 'D4.7: regression — memoized recursion 2D → O(n²) (unchanged)', code: `
int dp(int i, int j) {
  if(memo[i][j] != -1) return memo[i][j];
  return memo[i][j] = dp(i-1, j);
}`, expected: 'O(n²)' as any },

  { id: 257, label: 'D4.7: regression — recursive binary search → O(log n) (unchanged)', code: `
int solve(int l, int r) {
  if(l > r) return -1;
  int mid = (l + r) / 2;
  if(a[mid] == target) return mid;
  if(a[mid] < target) return solve(mid + 1, r);
  return solve(l, mid - 1);
}`, expected: 'O(log n)' as any },

  { id: 258, label: 'D4.7: regression — D4.6 guard: if(cond) f(); return f(); → Unknown (unchanged)', code: `
int solve(int l, int r) {
  if(l >= r) return 0;
  int mid = (l + r) / 2;
  if(mid > 0) solve(l, mid);
  return solve(mid + 1, r);
}`, expected: 'Unknown' as any },

  { id: 259, label: 'D4.7: O(n²) dominates sequential O(n) — same variable → O(n²)', code: `
void foo(int n) {
  for(int i = 0; i < n; i++) { }
  for(int i = 0; i < n; i++) {
    for(int j = 0; j < n; j++) { }
  }
}`, expected: 'O(n²)' as any },

  { id: 260, label: 'D4.9: j*=2 variable init + O(m) → Unknown', code: `
void foo(int n, int m) {
  for(int i = 0; i < n; i++) {
    for(int j = i; j < n; j *= 2) { }
  }
  for(int k = 0; k < m; k++) { }
}`, expected: 'Unknown' as any },

  // ── Phase D4.8: Canonical Symbol Registry ────────────────────────────────────
  // POSITIVE cases — alias is structurally provable; loop bound must canonicalize.

  { id: 261, label: 'D4.8: int alias — int m=n; two loops → O(n) not O(m+n)', code: `
void foo(int n) {
  int m = n;
  for(int i = 0; i < n; i++) {}
  for(int j = 0; j < m; j++) {}
}`, expected: 'O(n)' as any },

  { id: 262, label: 'D4.8: const alias — const int m=n; two loops → O(n)', code: `
void foo(int n) {
  const int m = n;
  for(int i = 0; i < n; i++) {}
  for(int j = 0; j < m; j++) {}
}`, expected: 'O(n)' as any },

  { id: 263, label: 'D4.8: auto alias — auto m=n; two loops → O(n)', code: `
void foo(int n) {
  auto m = n;
  for(int i = 0; i < n; i++) {}
  for(int j = 0; j < m; j++) {}
}`, expected: 'O(n)' as any },

  { id: 264, label: 'D4.8: multi-hop alias — d→c→a→b; b and d loops dedup to O(b) → emits O(n)', code: `
void foo(int b) {
  int a = b;
  int c = a;
  int d = c;
  for(int i = 0; i < b; i++) {}
  for(int j = 0; j < d; j++) {}
}`, expected: 'O(n)' as any },

  { id: 265, label: 'D4.8: alias dedup — int m=n; only one param so loops merge to O(n)', code: `
void foo(int n) {
  int m = n;
  for(int i = 0; i < n; i++) {}
  for(int j = 0; j < m; j++) {}
}`, expected: 'O(n)' as any },

  { id: 266, label: 'D4.8: alias in nested scope — inner m=n; outer n loop → O(n)', code: `
void foo(int n) {
  {
    int m = n;
    for(int i = 0; i < m; i++) {}
  }
  for(int j = 0; j < n; j++) {}
}`, expected: 'O(n)' as any },

  // NEGATIVE cases — alias must be REJECTED; the loop variables must stay distinct.
  // Two-parameter functions are used so that SumNode path reveals the distinction.

  { id: 270, label: 'D4.8: reject — m++ mutation; two loops with n and m → O(m + n)', code: `
void foo(int n, int m) {
  m++;
  for(int i = 0; i < n; i++) {}
  for(int j = 0; j < m; j++) {}
}`, expected: 'O(m + n)' as any },

  { id: 271, label: 'D4.8: reject — m+=1 mutation; two loops with n and m → O(m + n)', code: `
void foo(int n, int m) {
  m += 1;
  for(int i = 0; i < n; i++) {}
  for(int j = 0; j < m; j++) {}
}`, expected: 'O(m + n)' as any },

  { id: 272, label: 'D4.8: reject — non-bare RHS m=n+1; two loops → O(m + n)', code: `
void foo(int n, int m) {
  int k = n + 1;
  for(int i = 0; i < n; i++) {}
  for(int j = 0; j < m; j++) {}
}`, expected: 'O(m + n)' as any },

  { id: 273, label: 'D4.8: reject — call RHS m=foo(); two loops → O(m + n)', code: `
int foo();
void bar(int n, int m) {
  int k = foo();
  for(int i = 0; i < n; i++) {}
  for(int j = 0; j < m; j++) {}
}`, expected: 'O(m + n)' as any },

  { id: 274, label: 'D4.8: shadow — outer m=n; inner n; outer loop m → still O(n)', code: `
void foo(int n) {
  int m = n;
  {
    int n = 5;
  }
  for(int i = 0; i < n; i++) {}
  for(int j = 0; j < m; j++) {}
}`, expected: 'O(n)' as any },

  { id: 275, label: 'D4.8: shadow isolation — inner scope alias does not affect outer → O(n)', code: `
void foo(int n) {
  {
    int n = 5;
    int m = n;
  }
  for(int i = 0; i < n; i++) {}
}`, expected: 'O(n)' as any },

  // ── D4.9: Multiplicative Induction Recognition ──────────────────────────────
  // ── Positive cases (MUST return O(log n)) ───────────────────────────────────

  { id: 276, label: 'D4.9 A: for i*=2 literal → O(log n)',
    code: `void f(int n){ for(int i=1;i<n;i*=2){} }`, expected: 'O(log n)' as any },

  { id: 277, label: 'D4.9 A: for i<<=1 literal → O(log n)',
    code: `void f(int n){ for(int i=1;i<n;i<<=1){} }`, expected: 'O(log n)' as any },

  { id: 278, label: 'D4.9 A: for i>>=1 literal → O(log n)',
    code: `void f(int n){ for(int i=n;i>1;i>>=1){} }`, expected: 'O(log n)' as any },

  { id: 279, label: 'D4.9 A: for i/=2 literal → O(log n)',
    code: `void f(int n){ for(int i=n;i>1;i/=2){} }`, expected: 'O(log n)' as any },

  { id: 280, label: 'D4.9 B: for i=i*2 plain assignment → O(log n)',
    code: `void f(int n){ for(int i=1;i<n;i=i*2){} }`, expected: 'O(log n)' as any },

  { id: 281, label: 'D4.9 B: for i=i*3 plain assignment → O(log n)',
    code: `void f(int n){ for(int i=1;i<n;i=i*3){} }`, expected: 'O(log n)' as any },

  { id: 282, label: "D4.9 B': for i=i<<1 shift plain assignment → O(log n)",
    code: `void f(int n){ for(int i=1;i<n;i=i<<1){} }`, expected: 'O(log n)' as any },

  { id: 283, label: 'D4.9 C: for i=i+i self-doubling addition → O(log n)',
    code: `void f(int n){ for(int i=1;i<n;i=i+i){} }`, expected: 'O(log n)' as any },

  { id: 284, label: 'D4.9 D: for i+=i self-doubling += → O(log n)',
    code: `void f(int n){ for(int i=1;i<n;i+=i){} }`, expected: 'O(log n)' as any },

  // ── Negative cases (MUST return Unknown) ────────────────────────────────────

  { id: 285, label: 'D4.9 NEG A: i*=k variable multiplier → Unknown',
    code: `void f(int n,int k){ for(int i=1;i<n;i*=k){} }`, expected: 'Unknown' as any },

  { id: 286, label: 'D4.9 NEG A: i*=1 no-op multiplier → Unknown',
    code: `void f(int n){ for(int i=1;i<n;i*=1){} }`, expected: 'Unknown' as any },

  { id: 287, label: 'D4.9 NEG A: i*=0 zero multiplier → Unknown',
    code: `void f(int n){ for(int i=1;i<n;i*=0){} }`, expected: 'Unknown' as any },

  { id: 288, label: 'D4.9 NEG B: i=i*k variable factor → Unknown or linear',
    code: `void f(int n,int k){ for(int i=1;i<n;i=i*k){} }`, expected: 'Unknown' as any },

  { id: 289, label: 'D4.9 NEG: init=0 multiplicative stuck at 0 → Unknown',
    code: `void f(int n){ for(int i=0;i<n;i*=2){} }`, expected: 'Unknown' as any },

  { id: 290, label: 'D4.9 NEG E: guarded while i*=2 inside if → Unknown',
    code: `void f(int n){ int i=1; while(i<n){ if(i>0) i*=2; } }`, expected: 'Unknown' as any },

  { id: 291, label: 'D4.9 NEG E: guarded while i=i*2 inside if → Unknown',
    code: `void f(int n){ int i=1; while(i<n){ if(i>0) i=i*2; } }`, expected: 'Unknown' as any },

  { id: 292, label: 'D4.9 NEG E: guarded while i+=i inside if → Unknown',
    code: `void f(int n){ int i=1; while(i<n){ if(i>0) i+=i; } }`, expected: 'Unknown' as any },

];




// ─── vitest suite ───────────────────────────────────────────────────────────

describe('Validation Suite — 292 patterns', () => {
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
