import Parser from 'web-tree-sitter';
import path from 'path';
import { initParser } from '../src/parser/treeSitter';
import { buildMacroRegistry } from '../src/parser/astUtils';

async function main() {
    const wasmDir = path.resolve(__dirname, '../node_modules/tree-sitter-wasms/out');
    await Parser.init({ locateFile(scriptName: string) { return path.join(wasmDir, scriptName); } });
    await initParser(wasmDir);
    const parser = new Parser();
    const lang = await Parser.Language.load(path.join(wasmDir, 'tree-sitter-cpp.wasm'));
    parser.setLanguage(lang);

    // Bug Class 3: buildMacroRegistry with NEST2 and NEST3
    const code3 = `
#define NEST2(I,N,J,M,body) for(int I=0;I<(N);I++) for(int J=0;J<(M);J++) body
#define NEST3(I,N,J,M,K,R,body) for(int I=0;I<(N);I++) for(int J=0;J<(M);J++) for(int K=0;K<(R);K++) body
`;
    const tree3 = parser.parse(code3);
    
    console.log('=== Bug Class 3: buildMacroRegistry for NEST2/NEST3 ===');
    const macroRegistry = buildMacroRegistry(tree3);
    
    for (const [name, entry] of macroRegistry.entries()) {
        console.log(`\nMacro: ${name}`);
        console.log(`  bodyText: ${(entry as any).bodyText}`);
        console.log(`  boundParamIndex: ${(entry as any).boundParamIndex}`);
    }
    
    // Now show the raw preproc_function_def AST nodes for NEST2
    const defs = tree3.rootNode.descendantsOfType(['preproc_function_def', 'preproc_def']);
    for (const def of defs) {
        console.log(`\n--- preproc node ---`);
        for (let i = 0; i < def.childCount; i++) {
            const c = def.child(i)!;
            console.log(`  [${i}] type=${c.type}, text=${c.text.substring(0, 120).replace(/\n/g, ' ')}`);
        }
        const paramsNode = def.childForFieldName('parameters');
        if (paramsNode) {
            console.log(`  parameters children:`);
            for (let i = 0; i < paramsNode.childCount; i++) {
                const p = paramsNode.child(i)!;
                console.log(`    [${i}] type=${p.type}, text=${p.text}`);
            }
        }
        const nameNode = def.descendantsOfType('identifier')[0];
        console.log(`  name: ${nameNode?.text}`);
    }
}

main().catch(console.error);
