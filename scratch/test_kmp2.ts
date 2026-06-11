import { initParser, parseOneOff } from '../src/parser/treeSitter';
import { analyzeFunctions } from '../src/engine/inference';
import { resolve } from 'path';
import * as fs from 'fs';

const kmpCode = fs.readFileSync(resolve(__dirname, 'test_kmp.ts'), 'utf8');
const startIdx = kmpCode.indexOf('void computeLPS');
const endIdx = kmpCode.indexOf('async function main()');
const pureCode = kmpCode.slice(startIdx, endIdx);

async function main() {
  await initParser(resolve('./dist'));

  const tree = parseOneOff(pureCode)!;
  const result = analyzeFunctions(tree);
  for (const fn of result.functions) {
      console.log('Function:', fn.name);
      console.log('Node:', JSON.stringify((fn as any).node || (fn as any).overallNode));
  }
}
main().catch(console.error);
