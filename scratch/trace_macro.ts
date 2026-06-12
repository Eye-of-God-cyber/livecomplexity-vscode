import Parser from 'web-tree-sitter';
import fs from 'fs';
import path from 'path';
import { initParser, parseOneOff } from '../src/parser/treeSitter';
import { classifyLoop } from '../src/parser/loopClassifier';

async function main() {
    const wasmDir = path.resolve(__dirname, '../node_modules/tree-sitter-wasms/out');
    await Parser.init({ locateFile(s) { return path.join(wasmDir, s); } });
    await initParser(wasmDir);

    const dummyCode = `void _dummy() { for(int i=0;i<(n);i++) {} }`;
    const dummyTree = parseOneOff(dummyCode);
    const loopNode = dummyTree?.rootNode.descendantsOfType('for_statement')[0];
    const result = classifyLoop(loopNode);
    console.log("result.boundVar:", JSON.stringify(result.boundVar));
}
main().catch(console.error);
