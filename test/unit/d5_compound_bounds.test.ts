import { describe, it, expect, beforeAll } from 'vitest';
import { analyzeFunctions } from '../../src/engine/inference';
import { initParser, parseOneOff } from '../../src/parser/treeSitter';

async function analyzeCode(code: string): Promise<string> {
  const tree = parseOneOff(code);
  expect(tree).not.toBeNull();
  const result = analyzeFunctions(tree!);
  if (result.functions.length === 1) return result.functions[0].complexity;
  return result.functions.map(f => f.name + ': ' + f.complexity).join('\\n');
}
describe('D5.2: Compound Symbolic Bounds', () => {
  beforeAll(async () => {
    await initParser('./dist');
  });

  // ─── POSITIVE TESTS ─────────────────────────────────────────────────────────

  it('D5.2 POS: O(n + m) — simple compound addition', async () => {
    const code = `
      void f(int n, int m) {
        for (int i = 0; i < n + m; i++) {}
      }
    `;
    const result = await analyzeCode(code);
    expect(result).toBe('O(m + n)');
  });

  it('D5.2 POS: O(n + v.size()) — compound with container method', async () => {
    const code = `
      void f(int n, vector<int>& v) {
        for (int i = 0; i < n + v.size(); i++) {}
      }
    `;
    const result = await analyzeCode(code);
    expect(result).toBe('O(n + v.size())');
  });

  it('D5.2 POS: O(v.size() + m) — left container, right identifier', async () => {
    const code = `
      void f(int m, vector<int>& v) {
        for (int i = 0; i < v.size() + m; i++) {}
      }
    `;
    const result = await analyzeCode(code);
    expect(result).toBe('O(m + v.size())');
  });

  it('D5.2 POS: O(a + b + c) — multi-compound addition', async () => {
    const code = `
      void f(int a, int b, int c) {
        for (int i = 0; i < a + b + c; i++) {}
      }
    `;
    const result = await analyzeCode(code);
    expect(result).toBe('O(a + b + c)');
  });

  it('D5.2 POS: ((n + m)) — recursive parenthesis unwrapping', async () => {
    const code = `
      void f(int n, int m) {
        for (int i = 0; i < ((n + m)); i++) {}
      }
    `;
    const result = await analyzeCode(code);
    expect(result).toBe('O(m + n)');
  });

  it('D5.2 POS: n + 5 — constant discard (right)', async () => {
    const code = `
      void f(int n) {
        for (int i = 0; i < n + 5; i++) {}
      }
    `;
    const result = await analyzeCode(code);
    expect(result).toBe('O(n)');
  });

  it('D5.2 POS: 5 + n — constant discard (left)', async () => {
    const code = `
      void f(int n) {
        for (int i = 0; i < 5 + n; i++) {}
      }
    `;
    const result = await analyzeCode(code);
    expect(result).toBe('O(n)');
  });

  it('D5.2 POS: foo(sz) integrated with n + sz (D5.0 & D5.1)', async () => {
    const code = `
      void foo(int sz, int n) {
        for (int i = 0; i < n + sz; i++) {}
      }
      void bar(vector<int>& v, int n) {
        int sz = v.size();
        foo(sz, n);
      }
    `;
    const result = await analyzeCode(code);
    expect(result).toContain('bar: O(n + v.size())'); // bar contains the substituted complexity
  });

  it('D5.2 POS: foo(alias) integrated with n + alias (D4.8)', async () => {
    const code = `
      void foo(int m, int n) {
        for (int i = 0; i < n + m; i++) {}
      }
      void bar(int x, int n) {
        int alias = x;
        foo(alias, n);
      }
    `;
    const result = await analyzeCode(code);
    expect(result).toContain('bar: O(n + x)'); 
  });


  // ─── NEGATIVE TESTS (MUST REJECT AND FALLBACK) ────────────────────────────

  it('D5.2 NEG: n - m — subtraction rejected', async () => {
    const code = `
      void f(int n, int m) {
        for (int i = 0; i < n - m; i++) {}
      }
    `;
    const result = await analyzeCode(code);
    expect(result).toBe('Unknown'); // bound is n-m (subtraction), structurally unprovable
  });

  it('D5.2 NEG: n * m — multiplication rejected', async () => {
    const code = `
      void f(int n, int m) {
        for (int i = 0; i < n * m; i++) {}
      }
    `;
    const result = await analyzeCode(code);
    expect(result).toBe('Unknown'); // bound is n*m (multiplication), structurally unprovable
  });

  it('D5.2 NEG: n / m — division rejected', async () => {
    const code = `
      void f(int n, int m) {
        for (int i = 0; i < n / m; i++) {}
      }
    `;
    const result = await analyzeCode(code);
    expect(result).toBe('Unknown'); // bound is n/m (division by variable), structurally unprovable
  });

  it('D5.2 NEG: n % m — modulo rejected', async () => {
    const code = `
      void f(int n, int m) {
        for (int i = 0; i < n % m; i++) {}
      }
    `;
    const result = await analyzeCode(code);
    expect(result).toBe('Unknown'); // bound is n%m (modulo), structurally unprovable
  });

  it('D5.2 NEG: n + foo() — arbitrary call rejected atomically', async () => {
    const code = `
      void f(int n) {
        for (int i = 0; i < n + foo(); i++) {}
      }
    `;
    const result = await analyzeCode(code);
    expect(result).toBe('Unknown'); // Entire expression rejected, opaque bound
  });

  it('D5.2 NEG: foo() + n — arbitrary call left rejected atomically', async () => {
    const code = `
      void f(int n) {
        for (int i = 0; i < foo() + n; i++) {}
      }
    `;
    const result = await analyzeCode(code);
    expect(result).toBe('Unknown'); // foo() call not obj.size(), opaque
  });

  it('D5.2 NEG: n + min(a,b) — min/max rejected', async () => {
    const code = `
      void f(int n, int a, int b) {
        for (int i = 0; i < n + min(a, b); i++) {}
      }
    `;
    const result = await analyzeCode(code);
    expect(result).toBe('Unknown'); // min/max rejected by extractor, opaque
  });

  it('D5.2 NEG: n + (m * k) — nested unsupported operator rejected', async () => {
    const code = `
      void f(int n, int m, int k) {
        for (int i = 0; i < n + (m * k); i++) {}
      }
    `;
    const result = await analyzeCode(code);
    expect(result).toBe('Unknown'); // multiplication nested in +, extractor rejects atomically
  });

  it('D5.2 NEG: ternary rejected', async () => {
    const code = `
      void f(int n, int m) {
        for (int i = 0; i < (n > 0 ? n : m); i++) {}
      }
    `;
    const result = await analyzeCode(code);
    expect(result).toBe('Unknown'); // ternary bound is unprovable
  });

  it('D5.2 NEG: bitwise operators rejected', async () => {
    const code = `
      void f(int n, int m) {
        for (int i = 0; i < (n | m); i++) {}
      }
    `;
    const result = await analyzeCode(code);
    expect(result).toBe('Unknown'); // bitwise OR bound is structurally unprovable
  });

});
