import Parser from 'web-tree-sitter';
import path from 'path';
import { initParser } from '../src/parser/treeSitter';
import { buildAliasMap } from '../src/parser/astUtils';

// Prove EXACTLY what aliasMap contains for test718

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
    const fnNode = tree.rootNode.descendantsOfType('function_definition')[0];
    const fnDefMap = new Map<string, any>();
    fnDefMap.set('test718', fnNode);
    
    try {
        // @ts-ignore
        const aliasMap = buildAliasMap(fnNode, fnDefMap);
        console.log('=== aliasMap for test718 ===');
        console.log(`aliasMap size: ${aliasMap.size}`);
        for (const [k, v] of aliasMap.entries()) {
            console.log(`  ${k} -> ${v}`);
        }
        if (aliasMap.size === 0) {
            console.log('aliasMap is EMPTY. n is NOT aliased.');
            console.log('=> canonicalizeIdentNode for n: resolveCanonical returns declNode.id');
            console.log('=> findNodeById called to find the PARAMETER n declarator node');
        }
    } catch (e: any) {
        console.error(`buildAliasMap threw: ${e.message}`);
    }
}

main().catch(console.error);
