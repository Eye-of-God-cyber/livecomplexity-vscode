import { analyzeFunction } from '../src/engine/inference';
import { parseOneOff, initParser } from '../src/parser/treeSitter';
import * as path from 'node:path';
import { analyzeFunctions } from '../src/engine/inference';

async function main() {
  await initParser(path.resolve(__dirname, '../node_modules/tree-sitter-wasms/out'));
  const code = `
int test_rand() {
    int z = rand();
    int s = 0;
    for(int i=0; i<z; i++) s++;
    return s;
}
  `;
  const tree = parseOneOff(code);
  const result = analyzeFunctions(tree);
  console.log(result.functions[0].complexity);
  console.log(JSON.stringify(result.functions[0].node, null, 2));
}
main().catch(console.error);
