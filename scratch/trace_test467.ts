import Parser from 'web-tree-sitter';
import fs from 'fs';
import path from 'path';

async function run() {
    await Parser.init();
    const parser = new Parser();
    const wasmPath = path.resolve(__dirname, '../node_modules/tree-sitter-wasms/out/tree-sitter-cpp.wasm');
    const lang = await Parser.Language.load(wasmPath);
    parser.setLanguage(lang);

    const code = `
int test467(int a, int b) {
    int total = a + b;
    int s = 0;
    fo(i, total) s++;
    return s;
}`;

    const tree = parser.parse(code);
    console.log(tree.rootNode.toString());
}

run().catch(console.error);
