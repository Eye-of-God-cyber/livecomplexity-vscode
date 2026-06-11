import { describe, it, expect, beforeAll } from 'vitest';
import * as path from 'node:path';
import { initParser, parseOneOff, DocumentAST } from '../../src/parser/treeSitter';
import { extractStructure } from '../../src/parser/astUtils';

// Path to the downloaded WASM files from node_modules
// A custom locator just for tests since they pull directly from node_modules
const wts = require('web-tree-sitter');
const Parser = wts.Parser || wts.default || wts;

const distDir = path.resolve(__dirname, '../../dist');

describe('C++ Parser and AST Utilities', () => {
  beforeAll(async () => {
    await initParser(distDir);
  });

  it('should handle an empty file', () => {
    const code = ``;
    const tree = parseOneOff(code);
    expect(tree).not.toBeNull();
    
    const result = extractStructure(tree!);
    expect(result.functions).toHaveLength(0);
    expect(result.loops).toHaveLength(0);
  });

  it('should detect a single function', () => {
    const code = `
      int main() {
        return 0;
      }
    `;
    const tree = parseOneOff(code);
    const result = extractStructure(tree!);
    
    expect(result.functions).toHaveLength(1);
    expect(result.functions[0].name).toBe('main');
    expect(result.loops).toHaveLength(0);
  });

  it('should detect multiple functions', () => {
    const code = `
      void helper(int x) {}
      int compute() { return 1; }
      int main() { return compute(); }
    `;
    const tree = parseOneOff(code);
    const result = extractStructure(tree!);
    
    expect(result.functions).toHaveLength(3);
    expect(result.functions[0].name).toBe('helper');
    expect(result.functions[1].name).toBe('compute');
    expect(result.functions[2].name).toBe('main');
  });

  it('should detect a single constant for loop (depth 1)', () => {
    const code = `
      void test() {
        for(int i=0; i<10; i++) {
          // do nothing
        }
      }
    `;
    const tree = parseOneOff(code);
    const result = extractStructure(tree!);
    
    expect(result.loops).toHaveLength(1);
    expect(result.loops[0].type).toBe('for');
    expect(result.loops[0].childLoops).toHaveLength(0);
    expect(result.loops[0].classification).toBe('constant');
    expect(result.loops[0].confidence).toBe('high');
  });

  it('should detect nested for loops (linear increment, depth 2)', () => {
    const code = `
      void test() {
        for(int i=0; i<n; i++) {
          for(int j=0; j<m; j++) {
            sum += 1;
          }
        }
      }
    `;
    const tree = parseOneOff(code);
    const result = extractStructure(tree!);
    
    expect(result.loops).toHaveLength(1);
    // Outer loop
    expect(result.loops[0].type).toBe('for');
    expect(result.loops[0].classification).toBe('linear');
    expect(result.loops[0].confidence).toBe('high');
    // Inner loop
    expect(result.loops[0].childLoops).toHaveLength(1);
    expect(result.loops[0].childLoops[0].type).toBe('for');
    expect(result.loops[0].childLoops[0].classification).toBe('linear');
    expect(result.loops[0].childLoops[0].confidence).toBe('high');
  });

  it('should detect linear decrement and linear variable step', () => {
    const code = `
      void test() {
        for(int i=n; i>0; i--) {}
        for(int j=0; j<n; j+=k) {}
      }
    `;
    const tree = parseOneOff(code);
    const result = extractStructure(tree!);
    
    expect(result.loops).toHaveLength(2);
    expect(result.loops[0].classification).toBe('linear');
    expect(result.loops[0].confidence).toBe('high'); // i--
    expect(result.loops[1].classification).toBe('linear');
    expect(result.loops[1].confidence).toBe('medium'); // j+=k
  });

  it('should detect logarithmic multiply and divide', () => {
    const code = `
      void test() {
        for(int i=1; i<n; i*=2) {}
        for(int j=n; j>0; j/=2) {}
      }
    `;
    const tree = parseOneOff(code);
    const result = extractStructure(tree!);
    
    expect(result.loops).toHaveLength(2);
    expect(result.loops[0].classification).toBe('logarithmic');
    expect(result.loops[0].confidence).toBe('high');
    expect(result.loops[1].classification).toBe('logarithmic');
    expect(result.loops[1].confidence).toBe('high');
  });

  it('should detect a while loop with unknown condition', () => {
    const code = `
      void test() {
        while(customCondition()) {
          doSomething();
        }
      }
    `;
    const tree = parseOneOff(code);
    const result = extractStructure(tree!);
    
    expect(result.loops).toHaveLength(1);
    expect(result.loops[0].type).toBe('while');
    expect(result.loops[0].childLoops).toHaveLength(0);
    expect(result.loops[0].classification).toBe('linear');
    expect(result.loops[0].confidence).toBe('low');
  });

  it('should detect while loop with standard update in body', () => {
    const code = `
      void test() {
        while(i < n) {
          i++;
        }
      }
    `;
    const tree = parseOneOff(code);
    const result = extractStructure(tree!);
    
    expect(result.loops).toHaveLength(1);
    expect(result.loops[0].type).toBe('while');
    expect(result.loops[0].classification).toBe('linear');
    expect(result.loops[0].confidence).toBe('high');
  });

  it('should detect do-while loop', () => {
    const code = `
      void test() {
        do {
          doSomething();
        } while(i < 10);
      }
    `;
    const tree = parseOneOff(code);
    const result = extractStructure(tree!);
    
    expect(result.loops).toHaveLength(1);
    expect(result.loops[0].type).toBe('while');
    expect(result.loops[0].classification).toBe('unknown');
    expect(result.loops[0].confidence).toBe('low');
  });

  it('should detect range-based for loop', () => {
    const code = `
      void test() {
        for(auto x : vec) {}
      }
    `;
    const tree = parseOneOff(code);
    const result = extractStructure(tree!);
    
    expect(result.loops).toHaveLength(1);
    expect(result.loops[0].type).toBe('for');
    expect(result.loops[0].classification).toBe('linear');
    expect(result.loops[0].confidence).toBe('medium');
  });

  it('should detect nested depth 3', () => {
    const code = `
      void test() {
        for(int i=0; i<n; i++) {
          for(int j=0; j<n; j++) {
            for(int k=0; k<n; k++) {}
          }
        }
      }
    `;
    const tree = parseOneOff(code);
    const result = extractStructure(tree!);
    
    expect(result.loops).toHaveLength(1); // Only 1 top-level loop
    expect(result.loops[0].childLoops).toHaveLength(1);
    expect(result.loops[0].childLoops[0].childLoops).toHaveLength(1);
  });

  it('should correctly handle nested loops inside lambdas', () => {
    const code = `
      void test() {
        for(int i=0; i<n; i++) {
          auto lambda = []() {
            for(int j=0; j<n; j++) {}
          };
        }
      }
    `;
    const tree = parseOneOff(code);
    const result = extractStructure(tree!);
    
    // The outer loop shouldn't own the inner loop because of the lambda boundary.
    // However, our parser returns both, but unlinked because of the function_definition boundary.
    // They both should be top-level relative to their function scopes, but currently extractStructure just returns a flat array of roots.
    // Let's verify they both exist but the inner one isn't a child of the outer one.
    expect(result.loops).toHaveLength(2);
    expect(result.loops[0].childLoops).toHaveLength(0);
    expect(result.loops[1].childLoops).toHaveLength(0);
  });

  it('should detect missing update clause with body update', () => {
    // for(int i=1; i<n;) { i *= 2; } — i₀=1 > 0 proven, update is unconditional body statement.
    // D4.9: classified as logarithmic only when the structural proof is complete.
    const code = `
      void test() {
        for(int i=1; i<n;) {
          i *= 2;
        }
      }
    `;
    const tree = parseOneOff(code);
    const result = extractStructure(tree!);
    
    expect(result.loops).toHaveLength(1);
    expect(result.loops[0].classification).toBe('logarithmic');
    expect(result.loops[0].confidence).toBe('high');
  });

  it('should detect infinite loop', () => {
    const code = `
      void test() {
        for(;;) {
        }
      }
    `;
    const tree = parseOneOff(code);
    const result = extractStructure(tree!);
    
    expect(result.loops).toHaveLength(1);
    expect(result.loops[0].classification).toBe('unknown');
    expect(result.loops[0].confidence).toBe('low');
  });

  it('should safely manage tree memory via DocumentAST', () => {
    const doc = new DocumentAST();
    for (let i = 0; i < 50; i++) {
      const tree = doc.parse('int x = 1;');
      expect(tree).not.toBeNull();
    }
    const finalTree = doc.getTree();
    expect(finalTree).not.toBeNull();
    doc.dispose();
    expect(doc.getTree()).toBeNull();
  });

  it('should gracefully handle malformed C++ code', () => {
    const code = `
      int main() {
        for(int i=0; i<10
        // missing closing braces
    `;
    const tree = parseOneOff(code);
    expect(tree).not.toBeNull();
    // Tree-sitter is fault-tolerant. It produces an AST with ERROR nodes.
    const result = extractStructure(tree!);
    
    expect(result).toBeDefined();
    // Tree-sitter might or might not recover the function node depending on the error severity.
    // The main assertion is that it doesn't crash during traversal.
  });

  // ─────────────────────────────────────────────────────────────────────────
  // REGRESSION TEST — Phase 3A bug fix 2 (classifier level)
  // ─────────────────────────────────────────────────────────────────────────

  it('[FIX-2] Missing condition: `for(i=0;;i++)` must classify as Unknown, not O(n)', () => {
    // Before fix: classifier saw `i++` update and returned linear/high, ignoring
    //             that the condition field is absent (i.e. the loop is infinite).
    // After fix:  returns unknown/low when conditionNode is null but updateNode present.
    const code = `
      void fn(int n) {
        for(int i=0;;i++) { break; }
      }
    `;
    const tree = parseOneOff(code);
    const result = extractStructure(tree!);
    expect(result.loops).toHaveLength(1);
    expect(result.loops[0].classification).toBe('unknown');
    expect(result.loops[0].confidence).toBe('low');
  });
});
