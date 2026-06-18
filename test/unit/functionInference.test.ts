import { describe, it, expect, beforeAll } from 'vitest';
import * as path from 'node:path';
import { initParser, parseOneOff } from '../../src/parser/treeSitter';
import { analyzeFunctions } from '../../src/engine/inference';

const distDir = path.resolve(__dirname, '../../dist');

describe('Function-Level Complexity Inference', () => {
  beforeAll(async () => {
    await initParser(distDir);
  });

  // ------------------------------------------------------------------ helpers
  function analyze(code: string) {
    const tree = parseOneOff(code);
    expect(tree).not.toBeNull();
    return analyzeFunctions(tree!);
  }

  // -------------------------------------------------------------- test cases

  it('1. single function – no loops → O(1)', () => {
    const result = analyze(`
      int compute() {
        return 42;
      }
    `);
    expect(result.functions).toHaveLength(1);
    expect(result.functions[0].name).toBe('compute');
    expect(result.functions[0].complexity).toBe('O(1)');
    expect(result.functions[0].confidence).toBe('high');
    expect(result.functions[0].explanation.some(e => e.includes('O(1)'))).toBe(true);
  });

  it('2. multiple functions – different complexities', () => {
    const result = analyze(`
      void linear(int n) {
        for(int i = 0; i < n; i++) {}
      }
      void quadratic(int n) {
        for(int i = 0; i < n; i++) {
          for(int j = 0; j < n; j++) {}
        }
      }
    `);
    expect(result.functions).toHaveLength(2);
    expect(result.functions[0].name).toBe('linear');
    expect(result.functions[0].complexity).toBe('O(n)');
    expect(result.functions[1].name).toBe('quadratic');
    expect(result.functions[1].complexity).toBe('O(n²)');
  });

  it('3. empty function body → O(1)', () => {
    const result = analyze(`
      void empty() {}
    `);
    expect(result.functions).toHaveLength(1);
    expect(result.functions[0].complexity).toBe('O(1)');
  });

  it('4. nested loops → O(n²)', () => {
    const result = analyze(`
      void solve(int n) {
        for(int i = 0; i < n; i++) {
          for(int j = 0; j < n; j++) {
            int x = i + j;
          }
        }
      }
    `);
    expect(result.functions[0].complexity).toBe('O(n²)');
    expect(result.functions[0].confidence).toBe('high');
  });

  it('5. logarithmic loop → O(log n)', () => {
    const result = analyze(`
      void logSearch(int n) {
        for(int i = 1; i < n; i *= 2) {}
      }
    `);
    expect(result.functions[0].complexity).toBe('O(log n)');
    expect(result.functions[0].confidence).toBe('high');
  });

  it('6. mixed complexities – two functions with n and n²', () => {
    const result = analyze(`
      void scanOnce(int n) {
        for(int i = 0; i < n; i++) {}
      }
      void scanTwice(int n) {
        for(int i = 0; i < n; i++) {
          for(int j = 0; j < n; j++) {}
        }
      }
    `);
    const fn0 = result.functions.find(f => f.name === 'scanOnce')!;
    const fn1 = result.functions.find(f => f.name === 'scanTwice')!;
    expect(fn0.complexity).toBe('O(n)');
    expect(fn1.complexity).toBe('O(n²)');
  });

  it('7. O(n log n) – linear containing logarithmic', () => {
    const result = analyze(`
      void nlogn(int n) {
        for(int i = 0; i < n; i++) {
          for(int j = 1; j < n; j *= 2) {}
        }
      }
    `);
    expect(result.functions[0].complexity).toBe('O(n log n)');
  });

  it('8. O(n³) – three nested linear loops', () => {
    const result = analyze(`
      void cubic(int n) {
        for(int i = 0; i < n; i++) {
          for(int j = 0; j < n; j++) {
            for(int k = 0; k < n; k++) {}
          }
        }
      }
    `);
    expect(result.functions[0].complexity).toBe('O(n³)');
  });

  it('9. lambda inside function does not inflate outer complexity', () => {
    const result = analyze(`
      void outer(int n) {
        auto fn = []() {
          for(int i = 0; i < 100; i++) {}
        };
      }
    `);
    // The outer function has no loops directly — only a lambda with loops inside.
    // The lambda loop must NOT be attributed to the outer function.
    expect(result.functions).toHaveLength(1);
    expect(result.functions[0].name).toBe('outer');
    expect(result.functions[0].complexity).toBe('O(1)');
  });

  it('10. multiple functions with different complexities – correct mapping', () => {
    const result = analyze(`
      void a(int n) { for(int i=0;i<n;i++) {} }
      void b(int n) { for(int i=1;i<n;i*=2) {} }
      void c(int n) {
        for(int i=0;i<n;i++) {
          for(int j=0;j<n;j++) {}
        }
      }
      void d() {}
    `);
    expect(result.functions).toHaveLength(4);
    const map = Object.fromEntries(result.functions.map(f => [f.name, f.complexity]));
    expect(map['a']).toBe('O(n)');
    expect(map['b']).toBe('O(log n)');
    expect(map['c']).toBe('O(n²)');
    expect(map['d']).toBe('O(1)');
  });

  it('11. explanation generation – nested loop explains nesting', () => {
    const result = analyze(`
      void nested(int n) {
        for(int i=0;i<n;i++) {
          for(int j=0;j<n;j++) {}
        }
      }
    `);
    const fn = result.functions[0];
    const allText = fn.explanation.join(' ');
    expect(allText).toContain('linear');
    expect(allText).toContain('O(n²)');
  });

  it('12. sequential loops inside function → O(n) dominance', () => {
    const result = analyze(`
      void seq(int n) {
        for(int i=0;i<n;i++) {}
        for(int j=0;j<n;j++) {}
      }
    `);
    expect(result.functions[0].complexity).toBe('O(n)');
  });

  it('13. malformed function – should not crash', () => {
    const result = analyze(`
      int broken(
    `);
    // tree-sitter is fault-tolerant; we may or may not extract a function,
    // but must never throw.
    expect(result).toBeDefined();
    expect(Array.isArray(result.functions)).toBe(true);
  });

  it('14. while loop with body update inside function → O(n)', () => {
    const result = analyze(`
      void scan(int n) {
        int i = 0;
        while(i < n) { i++; }
      }
    `);
    expect(result.functions[0].complexity).toBe('O(n)');
    expect(result.functions[0].confidence).toBe('high');
  });

  it('15. startLine and endLine are populated correctly', () => {
    const result = analyze(`int f() { return 0; }`);
    expect(result.functions[0].startLine).toBeGreaterThanOrEqual(0);
    expect(result.functions[0].endLine).toBeGreaterThanOrEqual(result.functions[0].startLine);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // REGRESSION TESTS — Phase 3A bug fixes (FIX-1, FIX-3)
  // ─────────────────────────────────────────────────────────────────────────

  it('[FIX-1] Lambda scope: loop inside lambda must NOT inflate outer function complexity', () => {
    // Before fix: outer was O(n) because the lambda's for-loop leaked into it.
    // After fix:  outer has no own loops → O(1).
    const result = analyze(`
      void outer(int n) {
        auto f = [](int n) { for(int i=0;i<n;i++){} };
      }
    `);
    expect(result.functions).toHaveLength(1);
    expect(result.functions[0].name).toBe('outer');
    expect(result.functions[0].complexity).toBe('O(1)');
  });

  it('[FIX-3] Comma-expression update: two-pointer `l++,r--` must classify as O(n)', () => {
    // Before fix: update was comma_expression → Unknown/low.
    // After fix:  first operand l++ is unwrapped → linear/high → O(n).
    const result = analyze(`
      void twoPointer(int n) {
        for(int l=0,r=n-1;l<r;l++,r--) {}
      }
    `);
    expect(result.functions).toHaveLength(1);
    expect(result.functions[0].complexity).toBe('O(n)');
    expect(result.functions[0].confidence).toBe('high');
  });
});
