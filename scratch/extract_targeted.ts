import fs from 'fs';
import path from 'path';
import Parser from 'web-tree-sitter';
import { initParser } from '../src/parser/treeSitter';

async function main() {
    const wasmDir = path.resolve(__dirname, '../node_modules/tree-sitter-wasms/out');
    await Parser.init({ locateFile(scriptName: string) { return path.join(wasmDir, scriptName); } });
    await initParser(wasmDir);
    const parser = new Parser();
    const lang = await Parser.Language.load(path.join(wasmDir, 'tree-sitter-cpp.wasm'));
    parser.setLanguage(lang);

    const CPP_FILE = path.join(__dirname, '..', 'validation_corpus_batch7.cpp');
    const code = fs.readFileSync(CPP_FILE, 'utf-8');

    const tree = parser.parse(code);
    const functions = tree.rootNode.descendantsOfType('function_definition');

    const targets = ['test1428', 'test1432', 'test1440'];
    
    for (const func of functions) {
        const nameNode = func.childForFieldName('declarator')?.childForFieldName('declarator');
        if (!nameNode) continue;
        const funcName = nameNode.text;
        
        if (targets.includes(funcName)) {
            console.log("================ " + funcName + " ================");
            // Find the comment immediately preceding
            let prev = func.previousNamedSibling;
            while (prev && prev.type === 'comment') {
                console.log(prev.text);
                prev = prev.previousNamedSibling;
            }
            console.log(func.text);
            console.log('');
        }
    }
}
main().catch(console.error);
