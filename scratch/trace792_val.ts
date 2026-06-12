import { validateCorpusIsolated } from '../src/validation/validator';
import * as path from 'node:path';

async function run() {
  const corpusPath = path.join(__dirname, '../validation_corpus_batch4.cpp');
  const results = await validateCorpusIsolated(corpusPath);
  for (const res of results) {
    if (res.functionName === 'test792') {
      console.log("Overall Node:", JSON.stringify(res.node, null, 2));
    }
  }
}
run().catch(console.error);
