import { describe, it, expect, beforeAll } from 'vitest';
import * as path from 'path';
import { initParser, parseOneOff } from '../../src/parser/treeSitter';
import { analyzeFunctions } from '../../src/engine/inference';

describe('Constant expressions', () => {
  beforeAll(async () => {
    await initParser(path.join(process.cwd(), 'dist'));
  });

  const cases = [
    ['1. Literal arithmetic', 'void f(){ for(int i=0;i<2+3;i++){} }'],
    ['1. Literal arithmetic', 'void f(){ for(int i=0;i<10*20;i++){} }'],
    ['1. Literal arithmetic', 'void f(){ for(int i=0;i<100/5;i++){} }'],
    ['2. Nested arithmetic', 'void f(){ for(int i=0;i<(2+3)*4;i++){} }'],
    ['2. Nested arithmetic', 'void f(){ for(int i=0;i<(5*5)/25;i++){} }'],
    ['3. Trivial self-canceling', 'void f(){ for(int i=0;i<x/x;i++){} }'],
    ['3. Trivial self-canceling', 'void f(){ for(int i=0;i<v.size()/v.size();i++){} }'],
    ['3. Trivial self-canceling', 'void f(){ for(int i=0;i<m/m;i++){} }'],
    ['4. Constant library', 'void f(){ for(int i=0;i<sizeof(int);i++){} }'],
    ['4. Constant library', 'void f(){ for(int i=0;i<sizeof(long long);i++){} }'],
    ['5. Parenthesized', 'void f(){ for(int i=0;i<(1);i++){} }'],
    ['5. Parenthesized', 'void f(){ for(int i=0;i<((2));i++){} }']
  ];

  for (const [cat, code] of cases) {
    it(`${cat} | code: ${code}`, () => {
      const tree = parseOneOff(code);
      const res = analyzeFunctions(tree);
      console.log(cat + ': ' + res.functions[0].complexity);
    });
  }
});
