import Parser from 'web-tree-sitter';
import fs from 'fs';
import path from 'path';
import { analyzeFunctions } from '../src/engine/inference';

async function main() {
    await Parser.init();
    const parser = new Parser();
    const wasmPath = path.resolve(__dirname, '../node_modules/tree-sitter-wasms/out/tree-sitter-cpp.wasm');
    const lang = await Parser.Language.load(wasmPath);
    parser.setLanguage(lang);

    const corpusPath = path.resolve(__dirname, 'validation_corpus_batch2.cpp');
    const code = fs.readFileSync(corpusPath, 'utf-8');
    const tree = parser.parse(code);

    const result = analyzeFunctions(tree);

    for (const func of result.functions) {
        console.log(`[${func.name}]`);
        console.log(`  Complexity: ${func.complexity}`);
        console.log(`  Confidence: ${func.confidence}`);
        if (func.explanation && func.explanation.length > 0) {
            console.log(`  Explanation: ${func.explanation.join(' | ')}`);
        }
        console.log('---');
    }
}

main().catch(console.error);
