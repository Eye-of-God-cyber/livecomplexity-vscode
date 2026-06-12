import Parser from 'web-tree-sitter';
import path from 'path';
import { initParser } from '../src/parser/treeSitter';

// Reproduce the exact dummy parse tree for NEST2 to show what loop nodes are extracted

async function main() {
    const wasmDir = path.resolve(__dirname, '../node_modules/tree-sitter-wasms/out');
    await Parser.init({ locateFile(scriptName: string) { return path.join(wasmDir, scriptName); } });
    await initParser(wasmDir);
    const parser = new Parser();
    const lang = await Parser.Language.load(path.join(wasmDir, 'tree-sitter-cpp.wasm'));
    parser.setLanguage(lang);

    // This is exactly what buildMacroRegistry does for NEST2:
    const NEST2_body = `for(int I=0;I<(N);I++) for(int J=0;J<(M);J++) body`;
    const dummyCode = `void _dummy() { ${NEST2_body} {} }`;
    const dummyTree = parser.parse(dummyCode);
    
    console.log('=== Bug Class 3: Dummy parse tree for NEST2 ===');
    console.log(`Dummy code: ${dummyCode}`);
    
    const forStmts = dummyTree.rootNode.descendantsOfType('for_statement');
    console.log(`\nfor_statements found: ${forStmts.length}`);
    for (const f of forStmts) {
        console.log(`\n  for_statement text: ${f.text.substring(0, 120).replace(/\n/g, ' ')}`);
        const cond = f.childForFieldName('condition');
        const body = f.childForFieldName('body');
        console.log(`    condition: ${cond?.text} (type=${cond?.type})`);
        console.log(`    body type: ${body?.type}`);
        console.log(`    body text: ${body?.text?.substring(0, 80).replace(/\n/g, ' ')}`);
    }
    
    // buildMacroRegistry only takes [0] - the FIRST for_statement
    const loopNode = forStmts[0];
    console.log(`\n==> buildMacroRegistry takes: forStmts[0]`);
    console.log(`    text: ${loopNode?.text.substring(0, 120).replace(/\n/g, ' ')}`);
    
    // It then classifies the bound variable of the OUTER loop only
    // The inner for loop is inside the body of the outer for, which is ignored
    const cond0 = loopNode?.childForFieldName('condition');
    console.log(`    condition (for bound extraction): ${cond0?.text}`);
    // The bound is N (index 1 in params (I,N,J,M,body) -> paramIdx=1)
    
    // forStmts[1] is NEVER accessed
    const loopNode1 = forStmts[1];
    console.log(`\n==> forStmts[1] (IGNORED by buildMacroRegistry):`);
    console.log(`    text: ${loopNode1?.text.substring(0, 120).replace(/\n/g, ' ')}`);
    const cond1 = loopNode1?.childForFieldName('condition');
    console.log(`    condition (for bound extraction): ${cond1?.text}`);
    // This is J<(M), which would give boundParamIndex=3 (M at index 3 in params)
    
    // NEST3 dummy parse:
    const NEST3_body = `for(int I=0;I<(N);I++) for(int J=0;J<(M);J++) for(int K=0;K<(R);K++) body`;
    const dummyCode3 = `void _dummy() { ${NEST3_body} {} }`;
    const dummyTree3 = parser.parse(dummyCode3);
    const forStmts3 = dummyTree3.rootNode.descendantsOfType('for_statement');
    console.log(`\n=== NEST3 dummy parse: ${forStmts3.length} for_statements ===`);
    for (let i = 0; i < forStmts3.length; i++) {
        const f = forStmts3[i];
        const cond = f.childForFieldName('condition');
        console.log(`  forStmts3[${i}] condition: ${cond?.text} ${i > 0 ? '(IGNORED)' : '(USED)'}`);
    }
    
    // Conclusion
    console.log('\n=== PROOF ===');
    console.log('buildMacroRegistry at line 99: const loopNode = dummyTree?.rootNode.descendantsOfType("for_statement")[0]');
    console.log('ONLY [0] is captured. For NEST2, [0] has bound N (paramIdx=1), [1] has bound M (paramIdx=3).');
    console.log('NEST2 is registered with boundParamIndex=1 (N only). M is permanently discarded.');
    console.log('Information-loss point: astUtils.ts:99 - hardcoded [0] index.');
}

main().catch(console.error);
