import Parser from 'web-tree-sitter';
import path from 'path';
import { initParser } from '../src/parser/treeSitter';

// Bug Class 4: Minimal test case to demonstrate infinite recursion cycle in canonicalizeIdentNode
// and determine what visited-set strategy would terminate it.

async function main() {
    const wasmDir = path.resolve(__dirname, '../node_modules/tree-sitter-wasms/out');
    await Parser.init({ locateFile(scriptName: string) { return path.join(wasmDir, scriptName); } });
    await initParser(wasmDir);
    const parser = new Parser();
    const lang = await Parser.Language.load(path.join(wasmDir, 'tree-sitter-cpp.wasm'));
    parser.setLanguage(lang);

    // Minimal reproduction: mutated loop bound
    const code4 = `
int test718(int n) {
    int s = 0;
    for (int i = 0; i < n; i++) {
        s++;
        if (i == n / 2) n = n / 2;
    }
    return s;
}
    `;
    
    const tree4 = parser.parse(code4);
    const fn4 = tree4.rootNode.descendantsOfType('function_definition')[0];
    
    console.log('=== Bug Class 4: Minimal test case for infinite recursion ===');
    
    // 1. What is the loop AST?
    const forStmt = fn4.descendantsOfType('for_statement')[0];
    console.log(`for_statement condition: ${forStmt.childForFieldName('condition')?.text}`);
    
    // 2. What does the assignment expression look like?
    const assigns = fn4.descendantsOfType('assignment_expression');
    console.log('\nassignment_expressions inside function:');
    for (const a of assigns) {
        console.log(`  text: ${a.text}`);
        const left = a.childForFieldName('left');
        const right = a.childForFieldName('right');
        console.log(`  left: type=${left?.type}, text=${left?.text}`);
        console.log(`  right: type=${right?.type}, text=${right?.text}`);
    }
    
    // 3. Trace what buildAliasMap does with this
    // From the buildAliasMap code (lines 1400-1448):
    // For assignment_expression: n = n / 2
    //   lhsIdent = 'n' (identifier)
    //   rhs = 'n / 2' (binary_expression with '/')
    //   op.type === '/' -> checks right is number_literal: '2' -> YES
    //   compoundNodes = extractCompoundBoundNodes(n / 2) = [n_identifier]
    //   all compoundNodes are identifier -> OK
    //   targetDeclId = rhs.id (the binary_expression id)
    //   countSymbolicWrites('n') > 1? n = n / 2 counts as a write, AND n is a parameter (so declared once)
    //   Actually n is declared as a parameter, so written symbolically exactly once in this assignment
    //   But wait: isMutated('n') checks assignment_expressions where n appears on left.
    //   n = n / 2 -> n IS mutated -> isMutated returns TRUE -> aliasMap.set is SKIPPED

    console.log('\n=== Step 3: Does buildAliasMap actually add n to aliasMap? ===');
    console.log('Looking at assignment_expression n = n / 2:');
    console.log('  isMutated("n") checks: is n used as LHS in assignment? YES (n = n/2)');
    console.log('  countSymbolicWrites checks the same condition');
    
    // Check: at line 1442: countSymbolicWrites must be exactly 1
    // The assignment 'n = n / 2' IS a symbolic write to n
    // Plus n is a parameter (not a local init_declarator)
    // So the aliasMap code in buildAliasMap runs for init_declarators (local vars)
    // n is NOT an init_declarator, it's a PARAMETER
    // Parameters are not processed by the init_declarator loop
    
    // Let's check: is n = n / 2 an assignment_expression?
    const assignN = assigns.find(a => a.childForFieldName('left')?.text === 'n');
    if (assignN) {
        console.log('\nFound: n = n / 2');
        console.log('Assignment is inside an if_statement inside the for_statement body');
        // This is NOT an init_declarator, so it's processed by the assignment_expression path
        // in buildAliasMap (line 1450)
        const rhs = assignN.childForFieldName('right');
        console.log(`  rhs: ${rhs?.text}, type: ${rhs?.type}`);
        if (rhs?.type === 'binary_expression') {
            const op = rhs.childForFieldName('operator');
            const right = rhs.childForFieldName('right');
            console.log(`  op: ${op?.text}, right: ${right?.text}, right type: ${right?.type}`);
            console.log(`  right is number_literal? ${right?.type === 'number_literal'}`);
        }
    }
    
    // 4. What does canonicalizeIdentNode do with n?
    // canonicalizeIdentNode(n_condIdent, fnNode, aliasMap):
    //   rawVar = 'n'
    //   declNode = resolveDeclarationNode(n_condIdent, fnNode) = the 'n' parameter declarator
    //   canonicalId = resolveCanonical(declNode.id, aliasMap)
    //   IF n is in aliasMap: canonicalId = aliasMap.get(n.id) = binary_expression.id
    //   IF n is NOT in aliasMap: canonicalId = declNode.id (same as start) -> returns current (number)
    //   findNodeById(fnNode, canonicalId) -> returns the node with that ID
    
    // Let's trace what happens IF n ends up in aliasMap pointing to the binary expression n / 2
    // targetNode = the binary_expression 'n / 2'
    // targetNode.type = 'binary_expression'
    // op = '/' -> enters the D5.5 branch at line 1580
    // extractCompoundBoundNodes(n / 2) -> returns [n_identifier] (n extracted from left of /)
    // compoundNodes.flatMap(vNode => canonicalizeIdentNode(vNode, fnNode, aliasMap))
    // vNode = n_identifier (from inside n/2 expression)
    // canonicalizeIdentNode(n_identifier_from_n/2, fnNode, aliasMap)
    // -> resolveDeclarationNode(n_identifier_from_n/2) = n parameter declarator (SAME declNode)
    // -> resolveCanonical(declNode.id) = binary_expression.id AGAIN
    // -> findNodeById returns n / 2 AGAIN
    // -> enters binary_expression path AGAIN
    // -> INFINITE RECURSION
    
    console.log('\n=== Step 4: Exact recursion cycle trace ===');
    console.log('Assuming n is in aliasMap pointing to binary_expression "n / 2":');
    console.log('');
    console.log('Call 1: canonicalizeIdentNode(n_param_ident, fn, aliasMap)');
    console.log('  -> declNode = n_parameter_decl (id=D)');
    console.log('  -> canonicalId = aliasMap.get(D) = binary_expr.id (id=B)');
    console.log('  -> targetNode = findNodeById(fn, B) = binary_expr "n / 2"');
    console.log('  -> binary_expr path: extractCompoundBoundNodes("n / 2") = [n_ident_inside]');
    console.log('  -> flatMap: canonicalizeIdentNode(n_ident_inside, fn, aliasMap)');
    console.log('');
    console.log('Call 2: canonicalizeIdentNode(n_ident_inside_n/2, fn, aliasMap)');
    console.log('  -> resolveDeclarationNode(n_ident_inside_n/2) = n_parameter_decl (SAME id=D)');
    console.log('  -> canonicalId = aliasMap.get(D) = binary_expr.id (SAME B)');
    console.log('  -> targetNode = findNodeById(fn, B) = binary_expr "n / 2" AGAIN');
    console.log('  -> binary_expr path again -> INFINITE LOOP');
    console.log('');
    
    // 5. Key question: Does n actually end up in aliasMap?
    // Check the assignment_expression path in buildAliasMap (line 1450+):
    console.log('=== Step 5: Does n end up in aliasMap? ===');
    console.log('Check: Does buildAliasMap process "n = n / 2"?');
    console.log('buildAliasMap processes assignment_expression nodes at lines 1450-1511');
    console.log('For n = n / 2:');
    console.log('  lhsIdent = n (identifier)');
    console.log('  rhs = n / 2 (binary_expression)');
    console.log('  op = / -> must check right is number_literal: 2 -> YES (line 1421-1422)');
    console.log('  extractCompoundBoundNodes(n / 2) -> [n_identifier]');
    console.log('  all are identifier -> OK (line 1431)');
    console.log('  targetDeclId = rhs.id (the n/2 binary_expression node id)');
    console.log('  countSymbolicWrites(n) -> n appears as LHS in n = n / 2 -> count = 1');
    console.log('  isMutated(n) -> n IS mutated (appears as LHS) -> returns TRUE');
    console.log('  BECAUSE isMutated returns true: aliasMap.set is SKIPPED (line 1445)');
    console.log('  => n is NOT in aliasMap');
    console.log('');
    console.log('CONCLUSION: n is NOT added to aliasMap because isMutated(n) = true.');
    console.log('So the resolveCanonical(declNode.id, aliasMap) returns declNode.id (no alias chain).');
    console.log('findNodeById(fnNode, declNode.id) finds the n parameter declarator itself.');
    
    // 6. What actually happens in the call stack?
    // Since n is NOT in aliasMap, resolveCanonical returns the same ID (no chain).
    // findNodeById returns the n parameter declarator.
    // BUT the n parameter declarator is NOT inside an init_declarator -> parent check fails.
    // The binary_expression check: targetNode.type = 'identifier' (the param decl) -> NOT binary_expression.
    // So we skip both branches and return targetNode.text = 'n'.
    // This should NOT cause infinite recursion!
    
    console.log('');
    console.log('REVISED CONCLUSION: If n is NOT in aliasMap, there should be NO infinite recursion.');
    console.log('The crash at test718 must be triggered by a DIFFERENT code path.');
    console.log('Investigate: what calls canonicalizeIdentNode/findNodeById for test718?');
    
    // 7. The actual crash - look at findNodeById and what node IDs might form cycles
    // findNodeById at line 1650 does DFS. But tree-sitter guarantees acyclic AST.
    // Could there be a case where fnNode ITSELF contains a cycle?
    // Answer: Tree-sitter AST is always a directed acyclic graph. No structural cycles possible.
    // So findNodeById cannot infinitely recurse due to AST cycles.
    
    // The crash at line 1655 in findNodeById is called RECURSIVELY from canonicalizeIdentNode (line 1554).
    // But canonicalizeIdentNode itself is called recursively from line 1572-1574.
    // The cycle must be: canonicalizeIdentNode -> extractCompoundBoundNodes -> canonicalizeIdentNode

    console.log('');
    console.log('REFINED ANALYSIS:');
    console.log('Stack trace shows:');
    console.log('  findNodeById (1655) <- findNodeById (1655) <- ... <- canonicalizeIdentNode (1554)');
    console.log('  <- Array.flatMap <- [line 1592]');
    console.log('');
    console.log('The many findNodeById calls are DFS TRAVERSAL of a large subtree, NOT a cycle.');
    console.log('findNodeById terminates (tree is acyclic) but may traverse a very large tree.');
    console.log('The crash is stack overflow from findNodeById traversing an excessively deep tree,');
    console.log('not from infinite recursion between canonicalizeIdentNode calls.');
    console.log('');
    console.log('In test718, fnNode is the entire function. The aliasMap resolves n to a node,');
    console.log('and findNodeById performs DFS across the entire function AST until stack overflow.');
}

main().catch(console.error);
