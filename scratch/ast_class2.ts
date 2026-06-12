import Parser from 'web-tree-sitter';
import path from 'path';
import { initParser } from '../src/parser/treeSitter';

async function main() {
    const wasmDir = path.resolve(__dirname, '../node_modules/tree-sitter-wasms/out');
    await Parser.init({ locateFile(scriptName: string) { return path.join(wasmDir, scriptName); } });
    await initParser(wasmDir);
    const parser = new Parser();
    const lang = await Parser.Language.load(path.join(wasmDir, 'tree-sitter-cpp.wasm'));
    parser.setLanguage(lang);

    // --- Bug Class 2: call_expression arg fallback ---
    // Does 'n' fallback ACTUALLY produce wrong complexity, or does another path catch it?
    // Specifically trace: helper91(helper5(n)) where helper91 runs O(e) and helper5 is O(1)
    
    const code2 = `
int helper5(int x)  { return x*x+3; }
int helper91(int e) {
    int s = 0;
    for (int i = 0; i < e; i++) s++;
    return s;
}
int test710(int n) {
    return helper91(helper5(n));
}
    `;
    
    const tree2 = parser.parse(code2);
    const fn2 = tree2.rootNode.descendantsOfType('function_definition')
        .find(f => {
            const d = f.childForFieldName('declarator')?.childForFieldName('declarator');
            return d?.text === 'test710';
        })!;
    
    console.log('=== Bug Class 2: helper91(helper5(n)) AST ===');
    const callExprs = fn2.descendantsOfType('call_expression');
    for (const call of callExprs) {
        console.log(`call_expression: ${call.text}`);
        const funcNode = call.childForFieldName('function');
        const argsNode = call.childForFieldName('arguments');
        console.log(`  function: ${funcNode?.text}, type: ${funcNode?.type}`);
        if (argsNode) {
            for (let i = 0; i < argsNode.childCount; i++) {
                const c = argsNode.child(i)!;
                console.log(`  arg[${i}]: type=${c.type}, text=${c.text}`);
            }
        }
    }
    
    // Show AST node ID structure to understand what findNodeById navigates
    const body2 = fn2.childForFieldName('body')!;
    const retStmt = body2.descendantsOfType('return_statement')[0];
    if (retStmt) {
        console.log('\nreturn_statement children:');
        for (let i = 0; i < retStmt.childCount; i++) {
            const c = retStmt.child(i)!;
            console.log(`  [${i}] type=${c.type}, id=${c.id}, text=${c.text}`);
        }
    }
    
    // --- Bug Class 2b: What does extractCompoundBoundNodes return for call_expression helper5(n)? ---
    // Per loopClassifier.ts:386-400, call_expression is only valid if:
    //   function is field_expression AND field is 'size' or 'length'
    // helper5(n) has function type 'identifier' (NOT field_expression), so it returns undefined
    // But the calling code at astUtils.ts:462-478 has:
    //   const argNodes = extractCompoundBoundNodes(p);
    //   if (argNodes && argNodes.length === 1) { ... canonicalize ... }
    //   else { callArgVars.push('n'); }  // <-- HERE
    // Let's confirm: what is the type of the helper5(n) function node?
    const helper5Call = fn2.descendantsOfType('call_expression').find(c => c.text === 'helper91(helper5(n))');
    if (helper5Call) {
        const outerArgsNode = helper5Call.childForFieldName('arguments')!;
        // Find the actual arg (skip parens and commas)
        for (let i = 0; i < outerArgsNode.childCount; i++) {
            const p = outerArgsNode.child(i)!;
            if (p.type === '(' || p.type === ')' || p.type === ',') continue;
            console.log('\nArgument to helper91:');
            console.log(`  node type: ${p.type}`);
            console.log(`  node text: ${p.text}`);
            const funcNode2 = p.childForFieldName?.('function');
            console.log(`  inner funcNode type: ${funcNode2?.type}`);
            console.log(`  is field_expression? ${funcNode2?.type === 'field_expression'}`);
            // This means extractCompoundBoundNodes returns undefined -> fallback to 'n'
        }
    }
    
    // Is there ANY other code path that checks for this case before the fallback?
    // Look at what happens specifically with astUtils.ts:462 when argument is call_expression (helper5(n))
    // extractCompoundBoundNodes with a call_expression: requires field_expression with size/length
    // helper5(n).function = identifier 'helper91' -> NOT field_expression
    // So extractCompoundBoundNodes returns undefined for helper5(n)
    // argNodes is undefined -> else branch -> callArgVars.push('n')
    
    console.log('\n=== Key: Is the fallback the ONLY path? ===');
    console.log('Per loopClassifier.ts lines 387-399:');
    console.log('  call_expression accepted ONLY IF funcExpr.type === field_expression AND field is size/length');
    console.log('  helper5(n): funcExpr.type = identifier (NOT field_expression)');
    console.log('  => extractCompoundBoundNodes returns undefined');
    console.log('Per astUtils.ts lines 462-478:');
    console.log('  argNodes = undefined');
    console.log('  else branch executes: callArgVars.push("n")');
    console.log('  => heuristic "n" fallback IS the only path taken');
}

main().catch(console.error);
