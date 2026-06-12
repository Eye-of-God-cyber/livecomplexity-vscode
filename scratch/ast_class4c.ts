import Parser from 'web-tree-sitter';
import path from 'path';
import { initParser } from '../src/parser/treeSitter';
import { buildAliasRegistry } from '../src/parser/astUtils';

// Prove EXACTLY what buildAliasRegistry contains for test718
// Then trace what canonicalizeIdentNode does with n

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
    
    const aliasMap = buildAliasRegistry(fnNode);
    console.log('=== buildAliasRegistry for test718 ===');
    console.log(`aliasMap size: ${aliasMap.size}`);
    for (const [k, v] of aliasMap.entries()) {
        console.log(`  DeclarationID ${k} -> DeclarationID ${v}`);
    }
    
    if (aliasMap.size === 0) {
        console.log('\naliasMap is EMPTY.');
        console.log('n is NOT aliased (isMutated guard correctly blocked it)');
        
        // Now: canonicalizeVar('n', conditionNode, fnNode, emptyAliasMap):
        // 1. findConditionBoundIdent('n', condition) -> finds n in condition i < n
        // 2. canonicalizeIdentNode(n_cond_ident, fnNode, {})
        // 3. resolveDeclarationNode(n_cond_ident, fnNode) -> parameter n declarator
        // 4. resolveCanonical(n_decl.id, {}) -> n_decl.id (unchanged, not in map)
        // 5. findNodeById(fnNode, n_decl.id) -> walks fn AST to find n param declarator
        //    The param decl is at the top of fnNode, quick to find.
        // 6. targetNode = n_parameter_declarator (type='identifier', NOT init_declarator parent, NOT binary_expression)
        // 7. Returns targetNode.text = 'n'
        // => NO CRASH possible from this path
        
        console.log('\nExpected: canonicalizeIdentNode for n returns "n" without crash.');
        console.log('=> Bug Class 4 crash is NOT caused by n being aliased to n/2.');
    } else {
        console.log('\nWARNING: aliasMap is NOT empty!');
        for (const [k, v] of aliasMap.entries()) {
            // Find what node IDs k and v correspond to
            const findById = (node: any, id: number): any => {
                if (node.id === id) return node;
                for (let ci = 0; ci < node.childCount; ci++) {
                    const c = node.child(ci);
                    if (c) {
                        const found = findById(c, id);
                        if (found) return found;
                    }
                }
                return null;
            };
            const kNode = findById(fnNode, k);
            const vNode = findById(fnNode, v);
            console.log(`  ${k} (${kNode?.text}) -> ${v} (${vNode?.text})`);
        }
    }
    
    // Now test: what does the crash actually look like?
    // The stack trace says:
    //   findNodeById (1655) called repeatedly inside findNodeById (1655)
    //   <- canonicalizeIdentNode (1554)
    //   <- Array.flatMap <- line 1592
    // 
    // This means canonicalizeIdentNode was called from line 1592 (the binary_expression flatMap branch).
    // So targetNode WAS a binary_expression.
    // And the binary expression contains identifier nodes that recursively resolve back.
    //
    // But wait: if aliasMap is empty, how does targetNode become a binary_expression?
    // canonicalizeIdentNode line 1554: findNodeById(fnNode, canonicalId)
    //   canonicalId = resolveCanonical(declNode.id, emptyMap) = declNode.id itself
    //   findNodeById(fnNode, declNode.id) -> finds the declaration node
    //   But declNode is the n PARAMETER identifier - it IS just an identifier
    //   parent check at line 1560: parent.type = 'parameter_declaration' -> NOT 'init_declarator'
    //   binary_expression check at 1580: targetNode.type = 'identifier' -> NOT 'binary_expression'
    //   => returns targetNode.text = 'n' -> no crash
    //
    // UNLESS: the issue is with the 's' variable or 'i' variable alias, not 'n'
    
    console.log('\n=== Check: what is the s declaration? ===');
    const initDecls = fnNode.descendantsOfType('init_declarator');
    for (const d of initDecls) {
        console.log(`  init_declarator: ${d.text}`);
        const rhs = d.childForFieldName('value');
        console.log(`  rhs: ${rhs?.text}, type: ${rhs?.type}`);
    }
}

main().catch(console.error);
