import { initParser, parseOneOff } from './src/parser/treeSitter';
import { analyzeFunctions } from './src/engine/inference';
import * as path from 'node:path';

async function main() {
  await initParser(path.resolve(__dirname, './dist'));

  const code = `
  solve()
  {
      cin >> n;
      cin >> m;

      for(i<n)
          for(j<m)
  }
  `;
  const tree = parseOneOff(code);
  const result = analyzeFunctions(tree!);
  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
