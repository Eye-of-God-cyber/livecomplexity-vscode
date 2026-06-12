import { describe, it, expect, beforeAll } from 'vitest';
import * as path from 'node:path';
import { initParser, parseOneOff } from '../../src/parser/treeSitter';
import { analyzeFunctions } from '../../src/engine/inference';

const distDir = path.resolve(__dirname, '../../dist');

describe('Phase 0 Amortized Analysis Correctness', () => {
  beforeAll(async () => {
    await initParser(distDir);
  });

  function analyze(code: string) {
    const tree = parseOneOff(code);
    expect(tree).not.toBeNull();
    return analyzeFunctions(tree!);
  }

  it('1. True trial division remains amortized', () => {
    const result = analyze(`
      void trial_div(int n) {
        for(int i = 2; i * i <= n; i++) {
          while (n % i == 0) {
            n /= i;
          }
        }
      }
    `);
    const fn = result.functions[0];
    expect(fn.complexity).toBe('O(sqrt n)');
    expect(fn.explanation.join(' ')).toContain('amortized');
  });

  it('2. False trial division with += is rejected', () => {
    const result = analyze(`
      void false_trial_div(int n) {
        for(int i = 2; i * i <= n; i++) {
          while (n % i == 0) {
            n += 2;
          }
        }
      }
    `);
    const fn = result.functions[0];
    // Inner loop falls back to O(n) because it's a linear mutation on n.
    // O(sqrt n) outer * O(n) inner = O(n sqrt n).
    expect(fn.complexity).toBe('O(n sqrt n)');
  });

  it('3. Two-pointer amortized allows ++/--', () => {
    const result = analyze(`
      void two_pointer(int n) {
        int r = n;
        for(int l = 0; l < n; l++) {
          while (l < r) {
            r--;
          }
        }
      }
    `);
    const fn = result.functions[0];
    expect(fn.complexity).toBe('O(n)');
    expect(fn.explanation.join(' ')).toContain('amortized');
  });
});
