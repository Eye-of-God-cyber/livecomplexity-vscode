import { parseOneOff, initParser } from '../src/parser/treeSitter';
import * as path from 'node:path';

async function main() {
  await initParser(path.join(__dirname, '../dist'));
  const code = `
void foo() {
    NEST2(i, n, j, n, { s += helper97(n); });
}
  `;
  const tree = parseOneOff(code);
  console.log(tree.rootNode.toString());
}
main().catch(console.error);
