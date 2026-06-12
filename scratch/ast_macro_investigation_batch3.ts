import Parser from 'web-tree-sitter';
import fs from 'fs';
import path from 'path';

async function main() {
    await Parser.init();
    const parser = new Parser();
    const wasmPath = path.resolve(__dirname, '../node_modules/tree-sitter-wasms/out/tree-sitter-cpp.wasm');
    const lang = await Parser.Language.load(wasmPath);
    parser.setLanguage(lang);

    const code = `int test435(int n) {
    int s = 0;
    fo(i, n) fo(j, n) fo(k, n) s++;
    return s;
}`;
    const tree = parser.parse(code);
    function walk(node: Parser.SyntaxNode, depth: number) {
        console.log(' '.repeat(depth * 2) + node.type + ' [' + node.text.replace(/\n/g, '\\n') + ']');
        for (let i = 0; i < node.childCount; i++) {
            const child = node.child(i);
            if (child) walk(child, depth + 1);
        }
    }
    walk(tree.rootNode, 0);
}

main().catch(console.error);
