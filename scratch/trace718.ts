import fs from 'fs';
import path from 'path';
import Parser from 'web-tree-sitter';
import { analyzeFunctions } from '../src/engine/inference';
import { initParser } from '../src/parser/treeSitter';

async function main() {
    const wasmDir = path.resolve(__dirname, '../node_modules/tree-sitter-wasms/out');
    await Parser.init({ locateFile(scriptName: string) { return path.join(wasmDir, scriptName); } });
    await initParser(wasmDir);
    const parser = new Parser();
    const lang = await Parser.Language.load(path.join(wasmDir, 'tree-sitter-cpp.wasm'));
    parser.setLanguage(lang);

    const code = `
int test718(int n) {
    int s = 0;
    for (int i = 0; i < n; i++) {
        s++;
        if (i == n / 2) n = n / 2;
    }
    return s;
}
    `;

    const tree = parser.parse(code);
    try {
        const result = analyzeFunctions(tree);
        console.log(result);
    } catch (e: any) {
        console.error(e.stack);
    }
}
main().catch(console.error);
