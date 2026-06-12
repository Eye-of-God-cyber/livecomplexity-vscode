import { initParser, parseOneOff } from '../src/parser/treeSitter';
import { analyzeFunctions } from '../src/engine/inference';

async function main() {
  await initParser('./dist');
  const code = `
int test270(int a, int b, int c, int d) {
    int total = a + b + c + d;
    int s = 0;
    for (int i = 0; i < total; i++) s++;
    return s;
}
`;
  const tree = parseOneOff(code);
  const result = analyzeFunctions(tree!);
  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
