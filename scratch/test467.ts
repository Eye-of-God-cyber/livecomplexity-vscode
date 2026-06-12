import * as fs from 'fs';
import { analyzeDocument } from '../src/engine/inference';
import { resolve } from 'path';

const code = `int test467(int a, int b) {
    int total = a + b;
    int s = 0;
    fo(i, total) s++;
    return s;
}`;

async function run() {
  const result = await parseDocument(code);
  console.log(JSON.stringify(result, null, 2));
}

run().catch(console.error);
