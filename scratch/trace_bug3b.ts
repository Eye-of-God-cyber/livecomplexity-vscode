import Parser from 'web-tree-sitter';
import fs from 'fs';
import path from 'path';
import { initParser, parseOneOff } from '../src/parser/treeSitter';
import { isAmortizedInner } from '../src/parser/astUtils';

async function main() {
    const wasmDir = path.resolve(__dirname, '../node_modules/tree-sitter-wasms/out');
    await Parser.init({ locateFile(s) { return path.join(wasmDir, s); } });
    await initParser(wasmDir);

    const code = `
    void f(int n) {
        for(int i = 2; (long long)i * i <= n; i++) {
            while (n % i == 0) n /= i;
        }
    }`;
    const tree = parseOneOff(code);
    const for1 = tree.rootNode.descendantsOfType('for_statement')[0];
    const while1 = tree.rootNode.descendantsOfType('while_statement')[0];
    
    console.log("isAmortizedInner result:", isAmortizedInner(while1, for1));
}
main().catch(console.error);
