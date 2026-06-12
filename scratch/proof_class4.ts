// EXACT PROOF for Bug Class 4

// isMutated('n', fnNode, ...) for test718:
// 
// test718 has:
//   for (int i = 0; i < n; i++) {
//       s++;
//       if (i == n / 2) n = n / 2;   // <-- assignment_expression n = n/2
//   }
// 
// isMutated scans ALL 'n' identifier occurrences in fnNode:
//   n occurrence 1: parameter_declaration (parent type = parameter_declaration)
//     - NOT update_expression
//     - NOT assignment_expression parent
//     - NOT unary_expression
//     - NOT binary_expression with >>
//     - NOT argument_list
//     -> no mutation detected
//
//   n occurrence 2: binary_expression 'n / 2' (the condition check i < n / 2), grandparent=for_statement
//     parent type = binary_expression
//     - NOT update_expression
//     - NOT assignment_expression parent
//     - NOT unary_expression
//     - binary_expression check: op = '/'? NO, op = '<' -> SKIP
//     - NOT argument_list
//     -> no mutation detected
//
//   n occurrence 3: binary_expression n / 2 (RHS of n = n / 2), grandparent=assignment_expression  
//     parent type = binary_expression (the n/2 expression)
//     - NOT update_expression
//     - NOT assignment_expression parent (parent is binary_expression, not assignment_expression)
//     - NOT unary_expression
//     - binary_expression check: op = '/'? YES but RIGHT is identNode? No, n is LEFT of '/'
//     -> no mutation detected
//
//   n occurrence 4: identifier 'n' that is LHS of assignment_expression n = n/2
//     parent type = assignment_expression
//     - Check at 1184-1188:
//       lhs = n (same id as this identifier) 
//       op = '=' 
//       CONDITION: op.type !== '=' -> FALSE (it IS '=')
//       -> this condition FAILS -> returns TRUE only for COMPOUND assignment (+=, *=, etc.)
//       -> PLAIN assignment (=) does NOT trigger mutation detection!
//     -> no mutation detected
//
// isMutated returns FALSE even though n IS assigned with plain '='!
// This is the EXACT bug: isMutated at line 1187 only detects COMPOUND assignment operators.
// It explicitly excludes plain '=' (the most common mutation form).
//
// RESULT: buildAliasRegistry incorrectly adds n -> n/2 to aliasMap
//   because isMutated failed to detect plain assignment.
//
// Then canonicalizeIdentNode:
//   declNode = n_param_decl (id=D)
//   canonicalId = aliasMap.get(D) = binary_expression_id (id=B)
//   targetNode = findNodeById(fnNode, B) = binary_expression 'n / 2'
//   targetNode.type = 'binary_expression'
//   op = '/' -> enters the D5.5 branch
//   extractCompoundBoundNodes(n / 2) = [n_identifier_inside]
//   compoundNodes.flatMap(vNode => canonicalizeIdentNode(vNode, fnNode, aliasMap))
//     vNode = n_identifier_inside_binary_expr
//     resolveDeclarationNode(n_ident_inside) = n_param_decl (id=D, SAME)
//     canonicalId = aliasMap.get(D) = B (SAME)
//     -> INFINITE CYCLE: D -> B -> [n inside B] -> D -> B -> ...

console.log("Proof written above");
