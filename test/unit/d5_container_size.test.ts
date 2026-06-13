import { describe, it, expect, beforeAll } from 'vitest';
import * as path from 'node:path';
import { initParser, parseOneOff } from '../../src/parser/treeSitter';
import { analyzeFunctions } from '../../src/engine/inference';

const distDir = path.resolve(__dirname, '../../dist');

describe('D5.1 Container Size Canonicalization', () => {
  beforeAll(async () => {
    await initParser(distDir);
  });

  function analyze(code: string) {
    const tree = parseOneOff(code);
    expect(tree).not.toBeNull();
    return analyzeFunctions(tree!);
  }

  describe('Positive Cases', () => {
    it('1. sz = v.size()', () => {
      const result = analyze(`
        void foo(vector<int>& v) {
          int sz = v.size();
          for(int i = 0; i < sz; i++) {}
        }
      `);
      const fn = result.functions[0];
      expect(fn.complexity).toBe('O(v.size())');
    });

    it('2. sz = vec.size()', () => {
      const result = analyze(`
        void foo(vector<int>& vec) {
          int sz = vec.size();
          for(int i = 0; i < sz; i++) {}
        }
      `);
      const fn = result.functions[0];
      expect(fn.complexity).toBe('O(vec.size())');
    });

    it('3. sz = s.length()', () => {
      const result = analyze(`
        void foo(string& s) {
          int sz = s.length();
          for(int i = 0; i < sz; i++) {}
        }
      `);
      const fn = result.functions[0];
      expect(fn.complexity).toBe('O(s.length())');
    });

    it('4. Parameter canonicalization: foo(sz) -> O(v.size())', () => {
      const result = analyze(`
        void bar(int n) {
          for(int i = 0; i < n; i++) {}
        }
        void foo(vector<int>& v) {
          int sz = v.size();
          bar(sz);
        }
      `);
      const fn = result.functions.find(f => f.name === 'foo')!;
      expect(fn.complexity).toBe('O(v.size())');
    });

    it('5. alias -> sz -> v.size()', () => {
      const result = analyze(`
        void foo(vector<int>& v) {
          int sz = v.size();
          int m = sz;
          for(int i = 0; i < m; i++) {}
        }
      `);
      const fn = result.functions[0];
      expect(fn.complexity).toBe('O(v.size())');
    });
  });

  describe('Negative Cases (Must fall back to generic variables or abstract)', () => {
    it('6. obj[0].size() -> rejected, generic O(n)', () => {
      const result = analyze(`
        void foo(vector<vector<int>>& obj) {
          int sz = obj[0].size();
          for(int i = 0; i < sz; i++) {}
        }
      `);
      const fn = result.functions[0];
      expect(fn.complexity).toBe('O(sz)');
    });

    it('7. foo().size() -> rejected, generic O(n)', () => {
      const result = analyze(`
        void test() {
          int sz = getVec().size();
          for(int i = 0; i < sz; i++) {}
        }
      `);
      const fn = result.functions[0];
      expect(fn.complexity).toBe('O(sz)');
    });

    it('8. expr.size() -> rejected, generic O(n)', () => {
      const result = analyze(`
        void test() {
          int sz = (v).size();
          for(int i = 0; i < sz; i++) {}
        }
      `);
      const fn = result.functions[0];
      expect(fn.complexity).toBe('O(sz)');
    });

    it('9. a+b.size() -> rejected, generic O(n)', () => {
      const result = analyze(`
        void test() {
          int sz = a + b.size();
          for(int i = 0; i < sz; i++) {}
        }
      `);
      const fn = result.functions[0];
      // Due to how tree-sitter parses 'int sz = a + b.size()', the RHS is not a call_expression.
      expect(fn.complexity).toBe('O(sz)');
    });

    it('10. mutated container: sz = v.size() but v is mutated -> sz remains valid alias structurally', () => {
      const result = analyze(`
        void test(vector<int>& v) {
          int sz = v.size();
          v.push_back(1);
          for(int i = 0; i < sz; i++) {}
        }
      `);
      const fn = result.functions[0];
      // Structural reasoning says `sz` was assigned `v.size()`. We do NOT do semantic container-flow analysis.
      // Therefore, it still correctly resolves structurally to v.size().
      expect(fn.complexity).toBe('O(v.size())');
    });
  });
});
