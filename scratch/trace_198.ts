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

    const corpusPath = path.resolve(__dirname, 'validation_corpus_batch1.cpp');
    const code = fs.readFileSync(corpusPath, 'utf-8');
    const tree = parser.parse(code);

    const result = analyzeFunctions(tree);

    for (const func of result.functions) {
        if (func.name === 'test197' || func.name === 'test198' || func.name === 'test199') {
            console.log(`[${func.name}]`);
            console.log(`  Complexity: ${func.complexity}`);
            console.dir(func, { depth: null });
        }
    }
}

main().catch(console.error);
