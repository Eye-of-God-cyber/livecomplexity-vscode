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
        int i = 2;
        while ((long long)i * i <= n) {
            while (n % i == 0) n /= i;
            i++;
        }
    }`;
    const tree = parseOneOff(code);
    const while1 = tree.rootNode.descendantsOfType('while_statement')[0];
    const while2 = tree.rootNode.descendantsOfType('while_statement')[1];
    
    console.log("while1 type:", while1.type);
    console.log("while2 type:", while2.type);
    
    const result = isAmortizedInner(while2, while1);
    console.log("isAmortizedInner result:", result);
}
main().catch(console.error);
