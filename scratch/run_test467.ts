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

    const code = `
#define fo(i,n) for(int i=0;i<n;i++)
int test467(int a, int b) {
    int total = a + b;
    int s = 0;
    fo(i, total) s++;
    return s;
}`;
    const tree = parser.parse(code);
    const fnNode = tree.rootNode.descendantsOfType('function_definition')[0];
    const macroMap = buildMacroRegistry(tree);

    const loops = extractFunctionLoops(fnNode, macroMap);
    console.log(JSON.stringify(loops, null, 2));
}
main().catch(console.error);
