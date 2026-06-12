// Formal proof of the exact recursion cycle for test718

// === INPUTS ===
// Function:
//   int test718(int n) {
//       int s = 0;
//       for (int i = 0; i < n; i++) {
//           s++;
//           if (i == n / 2) n = n / 2;
//       }
//       return s;
//   }
//
// AST node IDs (verified by execution):
//   D = ID of n's parameter declarator node   (text = "n", type = identifier, inside parameter_declaration)
//   B = ID of binary_expression node "n / 2"  (the RHS of the assignment n = n / 2)
//
// aliasMap after buildAliasRegistry:
//   D -> B      (n_param_decl maps to binary_expr "n / 2")
//
// This aliasMap is INCORRECTLY populated because:
//   isMutated("n") checks assignment_expression at line 1184-1188:
//     lhs = n (id == D), op.type = "=" -> condition (op.type !== "=") is FALSE
//     -> plain assignment not detected -> isMutated returns false -> alias set

// === EXACT CYCLE TRACE ===
//
// canonicalizeVar("n", condition_i<n, fnNode, aliasMap)
//   -> findConditionBoundIdent("n", condition_node)  -> returns n identifier node I1 (inside condition)
//   -> canonicalizeIdentNode(I1, fnNode, aliasMap)
//
// canonicalizeIdentNode(I1, fnNode, aliasMap):          [CALL 1]
//   rawVar = "n"
//   declNode = resolveDeclarationNode(I1, fnNode)       -> finds n param decl, id = D
//   canonicalId = resolveCanonical(D, aliasMap)         -> aliasMap.get(D) = B; B not in aliasMap -> returns B
//   targetNode = findNodeById(fnNode, B)                -> finds binary_expression "n / 2"
//   targetNode.type = "binary_expression"
//   op = targetNode.childForFieldName("operator")       -> "/" 
//   op.type === "/" -> enters the D5.5 branch (line 1580-1595)
//   compoundNodes = extractCompoundBoundNodes(targetNode)
//     -> binary_expression with op "/" and right = number_literal "2"
//     -> right is number_literal -> extractCompoundBoundNodes(left)
//     -> left = identifier "n" (node I2, inside binary_expr "n / 2")
//     -> returns [I2]
//   all compoundNodes are identifiers -> guard passes
//   for leaf I2: resolveDeclarationNode(I2, fnNode) = D (same n param decl) -> declared -> guard passes
//   return compoundNodes.flatMap(vNode => canonicalizeIdentNode(vNode, fnNode, aliasMap))
//     -> canonicalizeIdentNode(I2, fnNode, aliasMap)    [CALL 2]
//
// canonicalizeIdentNode(I2, fnNode, aliasMap):          [CALL 2]
//   rawVar = "n"                                        <- SAME
//   declNode = resolveDeclarationNode(I2, fnNode)       -> finds n param decl, id = D   <- SAME D
//   canonicalId = resolveCanonical(D, aliasMap)         -> B                             <- SAME B
//   targetNode = findNodeById(fnNode, B)                -> binary_expression "n / 2"     <- SAME
//   targetNode.type = "binary_expression"
//   op.type = "/"
//   -> enters D5.5 branch AGAIN
//   compoundNodes = extractCompoundBoundNodes(B) -> [I3]  (another "n" inside B)
//   -> canonicalizeIdentNode(I3, fnNode, aliasMap)      [CALL 3]
//
// CYCLE: Every call resolves to D, then to B, then extracts [n_identifier_inside_B],
//        then calls canonicalizeIdentNode again on that n identifier,
//        which resolves to the same D, then B, then extracts n again.
//
// Repeated node IDs:
//   Declaration: D (n param decl) - repeated in every call via resolveDeclarationNode
//   Target: B (binary_expression "n / 2") - repeated in every call via findNodeById
//   Leaf: a fresh "n" identifier node INSIDE B each time (I2, I3, I4...) 
//         BUT they all resolve to the SAME declaration D
//
// === WHICH GUARD IS MINIMAL? ===
//
// Option A: visited DECLARATION IDs (Set<number> containing D)
//   At CALL 2: before calling resolveCanonical, check if D is already in visited.
//   Insert D into visited at CALL 1 before processing.
//   At CALL 2: D is in visited -> return rawVar ("n") -> terminates.
//   ✓ Works. Minimal. One Set<number>.
//
// Option B: visited TARGET NODE IDs (Set<number> containing B)  
//   At CALL 1: after findNodeById returns B, insert B into visited.
//   At CALL 2: before findNodeById, check canonicalId (B) against visited.
//   At CALL 2: B is in visited -> return rawVar ("n") -> terminates.
//   ✓ Works. Minimal. One Set<number>.
//
// === WHICH IS MORE MATHEMATICALLY MINIMAL? ===
//
// Option A (declaration IDs) catches the cycle at the ENTRY POINT of canonicalizeIdentNode.
//   It prevents re-processing the same declaration twice in a call chain.
//   This is slightly broader: it would also stop non-self-referential multi-hop alias chains.
//   But aliases are guaranteed to terminate by resolveCanonical's own visited Set,
//   so the only cycle canonicalizeIdentNode can encounter is one where the same DECLARATION
//   appears again in the call chain.
//   RISK: if a legitimate compound bound contains the same variable twice (e.g., n + n -> [n, n]),
//         Option A would stop processing the second n early. But flatMap processes them
//         in separate call chain instances (no shared visited state unless passed down).
//
// Option B (target node IDs) catches the cycle at the point where the same BINARY EXPRESSION
//   node is about to be entered again. This is more targeted: it prevents re-entering the
//   SAME binary expression (same node in the AST), not the same declaration.
//   A binary_expression node is unique in the AST (one object, one id).
//   RISK: none. The same binary_expression cannot legitimately be the canonical target of
//         two different declarations in the same function.
//
// CONCLUSION:
//   Option B (visited target node IDs) is the mathematically minimal and most targeted guard.
//   It precisely identifies the repeating structure: the same binary_expression node B
//   being entered from multiple recursive calls through the same alias.
//   It does not affect any other code paths.
//   It terminates with "n" (the rawVar) which is the safe Unknown-preferring fallback
//   when the structural proof cannot be completed.

console.log("Proof document: see comments above.");
