import Parser from 'web-tree-sitter';
import fs from 'fs';
import path from 'path';
import { initParser, parseOneOff } from '../src/parser/treeSitter';

async function main() {
    const wasmDir = path.resolve(__dirname, '../node_modules/tree-sitter-wasms/out');
    await Parser.init({ locateFile(s) { return path.join(wasmDir, s); } });
    await initParser(wasmDir);

    const tree = parseOneOff("void f() { (long long)i; }");
    const cast = tree.rootNode.descendantsOfType('cast_expression')[0];
    
    console.log("cast text:", cast.text);
    for (let i = 0; i < cast.childCount; i++) {
        const c = cast.child(i);
        console.log(`child[${i}]: type=${c?.type}, text='${c?.text}'`);
    }
}
main().catch(console.error);
