import Parser from 'web-tree-sitter';
import fs from 'fs';
import path from 'path';
import { initParser } from '../src/parser/treeSitter';

async function main() {
    const wasmDir = path.resolve(__dirname, '../node_modules/tree-sitter-wasms/out');
    await Parser.init({ locateFile(s) { return path.join(wasmDir, s); } });
    await initParser(wasmDir);
    const parser = new Parser();
    const lang = await Parser.Language.load(path.join(wasmDir, 'tree-sitter-cpp.wasm'));
    parser.setLanguage(lang);

    const code = fs.readFileSync('scratch/validation_corpus_batch3.cpp', 'utf8');
    const tree = parser.parse(code);
    for (const macro of tree.rootNode.descendantsOfType('preproc_function_def')) {
        const nameNode = macro.childForFieldName('name');
        if (nameNode && nameNode.text === 'fo') {
            const valueNode = macro.childForFieldName('value');
            console.log("valueNode text:", valueNode?.text);
        }
    }
}
main().catch(console.error);
