import { initParser, parseOneOff } from '../src/parser/treeSitter';
import { analyzeFunctions } from '../src/engine/inference';
import { resolve } from 'path';

const code = `
int dp(int i, int j) {
  if(memo[i][j] != -1) return memo[i][j];
  return memo[i][j] = dp(i-1, j) + dp(i, j-1);
}
`;

async function main() {
  await initParser(resolve('./dist'));
  const tree = parseOneOff(code)!;
  const result = analyzeFunctions(tree);
  console.log('Result:', JSON.stringify(result, null, 2));
}
main().catch(console.error);
