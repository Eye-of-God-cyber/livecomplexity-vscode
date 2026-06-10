import { initParser, parseOneOff } from './src/parser/treeSitter';
import { analyzeFunctions } from './src/engine/inference';
import * as path from 'node:path';

async function main() {
  await initParser(path.resolve(__dirname, './dist'));

  const code = `
  void solve()
  {
      int A, B;
      cin >> A >> B;

      for(int i=0; i<A; i++)
          for(int j=0; j<B; j++) {}
  }
  `;
  const tree = parseOneOff(code);
  const result = analyzeFunctions(tree!);
  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
