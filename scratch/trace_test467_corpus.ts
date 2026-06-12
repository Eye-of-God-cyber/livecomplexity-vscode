import Parser from 'web-tree-sitter';
import fs from 'fs';
import path from 'path';
import { extractFunctionLoops, buildMacroRegistry } from '../src/parser/astUtils';
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
    const macroMap = buildMacroRegistry(tree);
    console.log("fo macro:", macroMap.get('fo'));

    for (const fnNode of tree.rootNode.descendantsOfType('function_definition')) {
        const decl = fnNode.childForFieldName('declarator');
        if (!decl) continue;
        let ident = decl.type === 'identifier' ? decl : decl.descendantsOfType('identifier')[0];
        if (ident && ident.text === 'test467') {
            const loops = extractFunctionLoops(fnNode, macroMap);
            console.log("test467 loops:", JSON.stringify(loops, null, 2));
            break;
        }
    }
}
main().catch(console.error);
