const path = require('path');
async function main() {
  const { initParser, parseOneOff } = require('./dist/extension.js');
  await initParser(path.join(process.cwd(), 'dist'));
  const cases = [
    ['1. Literal arithmetic', 'void f(){ for(int i=0;i<2+3;i++){} }'],
    ['1. Literal arithmetic', 'void f(){ for(int i=0;i<10*20;i++){} }'],
    ['2. Nested arithmetic', 'void f(){ for(int i=0;i<(2+3)*4;i++){} }'],
    ['3. Trivial self-canceling', 'void f(){ for(int i=0;i<x/x;i++){} }'],
    ['3. Trivial self-canceling', 'void f(){ for(int i=0;i<v.size()/v.size();i++){} }'],
    ['4. Constant library', 'void f(){ for(int i=0;i<sizeof(int);i++){} }'],
    ['5. Parenthesized', 'void f(){ for(int i=0;i<(1);i++){} }']
  ];
  for (const [cat, code] of cases) {
    const res = parseOneOff(code);
    console.log(cat + ': ' + (res.functions[0] ? res.functions[0].complexity : 'Not found'));
  }
}
main().catch(console.error);
