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

    // --- Bug Class 1: fo(i, n) fo(j, m) sibling macro call ---
    const code1 = `
#define fo(i,n) for(int i=0;i<(n);i++)
int test678(int n, int m, int r, int t) {
    int s = 0;
    fo(i, n) fo(j, m) fo(k, r) fo(l, t) s++;
    return s;
}`;
    const tree1 = parser.parse(code1);
    const fn1 = tree1.rootNode.descendantsOfType('function_definition')[0];
    const body1 = fn1.childForFieldName('body')!;
    console.log('=== Bug Class 1: fo(i, n) fo(j, m) fo(k, r) fo(l, t) s++; ===');
    console.log('Function body children:');
    for (let i = 0; i < body1.childCount; i++) {
        const child = body1.child(i)!;
        console.log(`  [${i}] type=${child.type}, text=${child.text.substring(0, 80).replace(/\n/g, ' ')}`);
    }
    
    // What does AST look like after macro expansion?
    const stmts1 = body1.descendantsOfType('expression_statement');
    console.log('\nexpression_statements:');
    for (const s of stmts1) {
        console.log(`  text=${s.text.substring(0, 100).replace(/\n/g, ' ')}`);
    }
    
    // Are the fo() calls call_expressions in the raw AST?
    const calls1 = body1.descendantsOfType('call_expression');
    console.log('\ncall_expressions (potential fo() macro calls):');
    for (const c of calls1) {
        console.log(`  text=${c.text.substring(0, 80).replace(/\n/g, ' ')}`);
    }
    
    // --- Bug Class 1 part 2: How does the engine see macros? Not expanded, but raw? ---
    // Tree-sitter doesn't expand macros, so what does it actually parse?
    const compoundStmts1 = body1.descendantsOfType('compound_statement');
    console.log('\ncompound_statements:');
    for (const c of compoundStmts1) {
        console.log(`  text=${c.text.substring(0, 80).replace(/\n/g, ' ')}`);
    }
    
    const forStmts1 = body1.descendantsOfType('for_statement');
    console.log('\nfor_statements:');
    for (const f of forStmts1) {
        console.log(`  text=${f.text.substring(0, 120).replace(/\n/g, ' ')}`);
        // Is another for_statement a child of this one?
        const body = f.childForFieldName('body');
        if (body) {
            console.log(`    body type=${body.type}, text=${body.text.substring(0, 80).replace(/\n/g, ' ')}`);
        }
    }
}

main().catch(console.error);
