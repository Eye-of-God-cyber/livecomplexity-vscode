import Parser from 'web-tree-sitter';
import path from 'path';
import { initParser } from '../src/parser/treeSitter';
import { buildAliasRegistry } from '../src/parser/astUtils';

// Now we KNOW: n -> n/2 IS in aliasMap (DeclarationID 7109848 -> 7116904)
// This means isMutated check did NOT block it.
// Let's trace exactly WHY isMutated('n') returns false for this assignment

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
    
    // The aliasMap has n -> n/2 binary_expression
    // This means buildAliasRegistry processed n = n / 2 from the assignment_expression loop (line 1450)
    // The init_declarator loop would NOT process n (n is a parameter, not an init_declarator)
    // So this comes from the assignment_expression path at line 1450
    
    // But wait - the assignment n = n/2 should have failed the isMutated check!
    // Let's trace which loop in buildAliasRegistry actually inserted this...
    
    // From the code:
    // Init_declarator loop (line 1380): processes only `int s = 0;` and `int i = 0;`
    //   -> s = 0: rhs is number_literal -> no binary_expression -> skip
    //   -> i = 0: rhs is number_literal -> skip
    
    // assignment_expression loop (line 1450): processes n = n / 2
    //   lhsIdent = 'n'
    //   countSymbolicWrites('n', n_decl_id, fnNode) must be exactly 1
    //   isMutated('n', fnNode, ...) must be false
    
    // BUT the real question is: which code path has lhsDeclId?
    // The INIT_DECLARATOR path at 1380 processes 'n'???
    // No, 'n' is a PARAMETER, not an init_declarator.
    
    // Wait: looking at the init_declarator path more carefully:
    // Line 1380: `for (const initDecl of fnNode.descendantsOfType('init_declarator'))`
    // This includes ALL init_declarators in the function body.
    // Let me check: does 'n = n / 2' appear as an init_declarator somehow?
    
    const initDecls = fnNode.descendantsOfType('init_declarator');
    console.log('All init_declarators:');
    for (const d of initDecls) {
        console.log(`  text: ${d.text}, parent type: ${d.parent?.type}`);
    }
    
    // Let's also check what assignment_expressions there are
    const assigns = fnNode.descendantsOfType('assignment_expression');
    console.log('\nAll assignment_expressions:');
    for (const a of assigns) {
        console.log(`  text: ${a.text}`);
        console.log(`  left: ${a.childForFieldName('left')?.text} (type=${a.childForFieldName('left')?.type})`);
        console.log(`  right: ${a.childForFieldName('right')?.text} (type=${a.childForFieldName('right')?.type})`);
    }
    
    // The assignment expression path (line 1450-1511):
    // For 'n = n / 2':
    //   lhsDecl = resolveDeclarationNode(n, fnNode) = n_parameter_decl
    //   lhsDeclId = n_param_decl.id
    //   countSymbolicWrites('n', lhsDeclId, fnNode) - this checks for symbolic writes
    //   Let's reason: n appears in 'n = n / 2' as LHS -> countSymbolicWrites = 1
    //   isMutated('n', fnNode, ...) - checks if n appears as LHS in mutation
    //   Mutation check includes assignment_expressions where n is LHS -> 'n = n / 2' IS a mutation!
    //   So isMutated should return TRUE -> aliasMap.set should be SKIPPED
    
    // BUT our output shows aliasMap IS SET (n -> n/2)!
    // This means either isMutated returned false OR the check at line 1478 is different from what I thought.
    
    // Let me check isMutated exactly
    
    console.log('\n=== What kind of declaration is n? ===');
    // n is a function PARAMETER
    // resolveDeclarationNode for n_param_ident = n_param_declarator
    // n_param_declarator.type = 'identifier' (inside parameter_declaration)
    
    const paramIdents = fnNode.descendantsOfType('identifier').filter((i: any) => i.text === 'n');
    for (const ident of paramIdents) {
        console.log(`  n occurrence: type=${ident.type}, parent type=${ident.parent?.type}`);
        const parentParent = ident.parent?.parent;
        console.log(`    grandparent: ${parentParent?.type}`);
    }
    
    console.log('\n=== The actual assignment_expression path in buildAliasRegistry ===');
    console.log('For n = n / 2:');
    console.log('  lhs = n (identifier), lhsName = "n"');
    console.log('  lhsDecl = resolveDeclarationNode(n_lhs, fnNode) = n_param_declarator');
    console.log('  lhsDeclId = n_param_declarator.id');
    console.log('  countSymbolicWrites("n", lhsDeclId, fnNode) = 1 (only n = n/2 writes to it)');
    console.log('  isMutated("n", fnNode, ...) = ???');
    console.log('  Expected: isMutated returns TRUE (n IS mutated by n = n/2)');
    console.log('  But actual: aliasMap contains n -> n/2, so isMutated must have returned FALSE!');
    console.log('');
    console.log('HYPOTHESIS: isMutated checks assignment_expressions where n is the LHS,');
    console.log('but there is a subtle bug: it checks if n is in an update_expression,');
    console.log('compound assignment (+=, -=), or is an address-of argument.');
    console.log('A PLAIN assignment "n = ..." may NOT be detected by isMutated!');
}

main().catch(console.error);
