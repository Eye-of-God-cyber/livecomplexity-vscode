import fs from 'fs';
import path from 'path';
import Parser from 'web-tree-sitter';
import { analyzeFunctions } from '../src/engine/inference';
import { initParser } from '../src/parser/treeSitter';

async function main() {
    const wasmDir = path.resolve(__dirname, '../node_modules/tree-sitter-wasms/out');
    await Parser.init({
      locateFile(scriptName: string) {
        return path.join(wasmDir, scriptName);
      }
    });
    await initParser(wasmDir);
    const parser = new Parser();
    const lang = await Parser.Language.load(path.join(wasmDir, 'tree-sitter-cpp.wasm'));
    parser.setLanguage(lang);

    const code = fs.readFileSync('validation_corpus_batch4.cpp', 'utf8');
    const tree = parser.parse(code);
    const res = analyzeFunctions(tree);
    const t601 = res.find(r => r.functionName === 'test601');
    console.log("test601:", t601);
}

main().catch(console.error);
