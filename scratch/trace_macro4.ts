import Parser from 'web-tree-sitter';
import fs from 'fs';
import path from 'path';
import { initParser, parseOneOff } from '../src/parser/treeSitter';
import { classifyLoop } from '../src/parser/loopClassifier';

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
            const argText = valueNode?.text.trim() || '';
            const dummyCode = `void _dummy() { ${argText} {} }`;
            const dummyTree = parseOneOff(dummyCode);
            const loopNode = dummyTree?.rootNode.descendantsOfType('for_statement')[0];
            if (loopNode) {
                const result = classifyLoop(loopNode);
                console.log("classifyLoop result:", result);
            }
        }
    }
}
main().catch(console.error);
