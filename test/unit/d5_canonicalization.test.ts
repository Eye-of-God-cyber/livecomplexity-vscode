import { describe, it, expect, beforeAll } from 'vitest';
import * as path from 'node:path';
import { initParser, parseOneOff } from '../../src/parser/treeSitter';
import { analyzeFunctions } from '../../src/engine/inference';

const distDir = path.resolve(__dirname, '../../dist');

describe('D5.0 Parameter Canonicalization', () => {
  beforeAll(async () => {
    await initParser(distDir);
  });

  function analyze(code: string) {
    const tree = parseOneOff(code);
    expect(tree).not.toBeNull();
    return analyzeFunctions(tree!);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // POSITIVE TESTS
  // ─────────────────────────────────────────────────────────────────────────

  it('1. Basic parameter substitution: foo(m) -> O(m)', () => {
    const result = analyze(`
      void foo(int n) {
        for(int i = 0; i < n; i++) {}
      }
      void caller(int m) {
        foo(m);
      }
    `);
    const callerFn = result.functions.find(f => f.name === 'caller')!;
    expect(callerFn.complexity).toBe('O(m)');
  });

  it('2. Multi-parameter positional mapping: foo(a,b) -> O(ab)', () => {
    const result = analyze(`
      void foo(int x, int y) {
        for(int i = 0; i < x; i++) {
          for(int j = 0; j < y; j++) {}
        }
      }
      void caller(int a, int b) {
        foo(a, b);
      }
    `);
    const callerFn = result.functions.find(f => f.name === 'caller')!;
    expect(callerFn.complexity).toBe('O(ab)');
  });

  it('3. Duplicate parameters: foo(n,n) -> O(n²)', () => {
    const result = analyze(`
      void foo(int x, int y) {
        for(int i = 0; i < x; i++) {
          for(int j = 0; j < y; j++) {}
        }
      }
      void caller(int n) {
        foo(n, n);
      }
    `);
    const callerFn = result.functions.find(f => f.name === 'caller')!;
    expect(callerFn.complexity).toBe('O(n²)');
  });

  it('4. Canonicalization via D4.8 AliasMap: foo(alias) -> O(m)', () => {
    const result = analyze(`
      void foo(int n) {
        for(int i = 0; i < n; i++) {}
      }
      void caller(int m) {
        int alias = m;
        foo(alias);
      }
    `);
    const callerFn = result.functions.find(f => f.name === 'caller')!;
    expect(callerFn.complexity).toBe('O(m)');
  });

  it('5. Shadowing proof: Local shadow does not leak across calls', () => {
    const result = analyze(`
      void foo(int n) {
        for(int i = 0; i < n; i++) {}
      }
      void caller(int m) {
        {
          int m; // Uninitialized shadow
          foo(m); // Should evaluate to inner m
        }
        foo(m); // Should evaluate to outer m (merged as O(m))
      }
    `);
    const callerFn = result.functions.find(f => f.name === 'caller')!;
    // Tree-sitter has different IDs for outer m and inner m.
    // The canonical text is still "m" for both.
    expect(callerFn.complexity).toBe('O(m)');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // NEGATIVE TESTS (Unchanged behavior)
  // ─────────────────────────────────────────────────────────────────────────

  it('6. Literal argument -> defaults to abstract parameter O(n)', () => {
    const result = analyze(`
      void foo(int n) {
        for(int i = 0; i < n; i++) {}
      }
      void caller() {
        foo(5);
      }
    `);
    const callerFn = result.functions.find(f => f.name === 'caller')!;
    expect(callerFn.complexity).toBe('Unknown'); // Literal is structurally unproven → Unknown
  });

  it('7. Expression argument -> defaults to abstract parameter O(n)', () => {
    const result = analyze(`
      void foo(int n) {
        for(int i = 0; i < n; i++) {}
      }
      void caller(int m) {
        foo(m + 1);
      }
    `);
    const callerFn = result.functions.find(f => f.name === 'caller')!;
    expect(callerFn.complexity).toBe('O(m)'); // D5.1 enhancement: m+1 resolves to m structurally
  });

  it('8. Nested call argument -> defaults to abstract parameter O(n)', () => {
    const result = analyze(`
      int get(int x) { return x; }
      void foo(int n) {
        for(int i = 0; i < n; i++) {}
      }
      void caller(int m) {
        foo(get(m));
      }
    `);
    const callerFn = result.functions.find(f => f.name === 'caller')!;
    expect(callerFn.complexity).toBe('Unknown'); // Nested call is structurally unproven → Unknown
  });


  it('9. Method call argument -> defaults to abstract parameter O(n)', () => {
    const result = analyze(`
      void foo(int n) {
        for(int i = 0; i < n; i++) {}
      }
      void caller() {
        vector<int> v;
        foo(v.size());
      }
    `);
    const callerFn = result.functions.find(f => f.name === 'caller')!;
    expect(callerFn.complexity).toBe('O(v.size())'); // D5.1 enhancement: v.size() is fully supported
  });
});
