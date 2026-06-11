import sys

with open('src/parser/loopClassifier.ts', 'rb') as f:
    content = f.read().decode('utf-8')

# ─── Patch 1: Update call site (lines 272-277) ───────────────────────────────
OLD_CALL = (
  '  const result = analyzeUpdatePattern(updateNode, conditionNode, initializerNode);\r\n'
  '  if (result.classification === \'linear\') {\r\n'
  '    const boundVar = getBoundVariable(conditionNode);\r\n'
  '    if (boundVar) result.boundVar = boundVar;\r\n'
  '  }\r\n'
  '  return result;\r\n'
)
NEW_CALL = (
  '  // D4.9: pass bodyNode and isForLoopUpdate so analyzeUpdatePattern can apply\r\n'
  '  // the Sub-feature E conditional-execution guard and the initializer guard.\r\n'
  '  const bodyNode = node.childForFieldName(\'body\');\r\n'
  '  const isForLoopUpdate = (node.type === \'for_statement\') && (node.childForFieldName(\'update\') !== null);\r\n'
  '  const result = analyzeUpdatePattern(updateNode, conditionNode, initializerNode, bodyNode, isForLoopUpdate);\r\n'
  '  if (result.classification === \'linear\') {\r\n'
  '    const boundVar = getBoundVariable(conditionNode);\r\n'
  '    if (boundVar) result.boundVar = boundVar;\r\n'
  '  }\r\n'
  '  return result;\r\n'
)

if OLD_CALL not in content:
    print('ERROR: Patch 1 target not found', file=sys.stderr)
    sys.exit(1)
content = content.replace(OLD_CALL, NEW_CALL, 1)
print('Patch 1 applied.')

# ─── Patch 2: Add helpers after findBodyUpdate (after line 307) ──────────────
OLD_FINDBODY = (
  'function findBodyUpdate(bodyNode: SyntaxNode | null): SyntaxNode | null {\r\n'
  '  if (!bodyNode) return null;\r\n'
  '  const updates = bodyNode.descendantsOfType([\'update_expression\', \'assignment_expression\', \'math_assignment_expression\']);\r\n'
  '  if (updates.length > 0) return updates[updates.length - 1]; // Use last update as conservative guess, or just first.\r\n'
  '  return null;\r\n'
  '}\r\n'
)
NEW_FINDBODY = OLD_FINDBODY + (
  '\r\n'
  '// \u2500\u2500\u2500 D4.9 Sub-feature E: Unconditional Execution Guard \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\r\n'
  '//\r\n'
  '// Returns true iff `updateNode` is a direct statement of `bodyNode` \u2014\r\n'
  '// i.e. NOT nested inside any if_statement, else_clause, switch_statement,\r\n'
  '// or additional compound_statement block. Only direct children of the body\r\n'
  '// compound_statement are proven to execute on every loop iteration.\r\n'
  '//\r\n'
  '// Applied ONLY to multiplicative/inductive patterns. Linear (i++) is unaffected.\r\n'
  'function isUnconditionalBodyStatement(updateNode: SyntaxNode, bodyNode: SyntaxNode | null): boolean {\r\n'
  '  if (!bodyNode) return false;\r\n'
  '  const directParent = updateNode.parent;\r\n'
  '  if (!directParent) return false;\r\n'
  '  // Case 1: updateNode is directly inside the compound_statement body.\r\n'
  '  if (directParent.id === bodyNode.id) return true;\r\n'
  '  // Case 2: updateNode is wrapped in an expression_statement that is a\r\n'
  '  // direct child of the compound_statement body (the standard C++ form).\r\n'
  '  if (directParent.type === \'expression_statement\' && directParent.parent?.id === bodyNode.id) return true;\r\n'
  '  // All other cases: nested inside if_statement, else, switch, nested block, etc.\r\n'
  '  return false;\r\n'
  '}\r\n'
  '\r\n'
  '// \u2500\u2500\u2500 D4.9 Initializer Guard \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\r\n'
  '//\r\n'
  '// For multiplicative induction the mathematical proof requires i\u2080 > 0.\r\n'
  '// ONLY number_literal > 0 is accepted as a proven positive initializer.\r\n'
  '// All other forms (identifiers, parameters, expressions) are rejected.\r\n'
  'function hasPositiveLiteralInitializer(initializerNode: SyntaxNode | null): boolean {\r\n'
  '  if (!initializerNode) return false;\r\n'
  '  const initDeclarator = initializerNode.descendantsOfType(\'init_declarator\')[0];\r\n'
  '  if (initDeclarator) {\r\n'
  '    const value = initDeclarator.childForFieldName(\'value\');\r\n'
  '    return !!(value && value.type === \'number_literal\' && Number(value.text) > 0);\r\n'
  '  }\r\n'
  '  const assignmentExpr = initializerNode.descendantsOfType(\'assignment_expression\')[0];\r\n'
  '  if (assignmentExpr) {\r\n'
  '    const right = assignmentExpr.childForFieldName(\'right\');\r\n'
  '    return !!(right && right.type === \'number_literal\' && Number(right.text) > 0);\r\n'
  '  }\r\n'
  '  return false;\r\n'
  '}\r\n'
  '\r\n'
  '// \u2500\u2500\u2500 D4.9 Sub-features B & C: Structural plain-assignment recognizers \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\r\n'
  '//\r\n'
  '// Replaces the weak `text.includes(\'*\')` fallback.\r\n'
  '// Returns a LoopClassificationResult only when ALL structural proofs hold.\r\n'
  '// Returns null \u2192 caller falls through to its own logic.\r\n'
  '//\r\n'
  '// Patterns recognised (all return logarithmic, high confidence):\r\n'
  '//   B:  i = i * C      (C is number_literal > 1, LHS text == inner-LHS text)\r\n'
  '//   B\u2032: i = i << C     (C is number_literal >= 1)\r\n'
  '//   C:  i = i + i      (three-way text-identity: lhs == inner-left == inner-right)\r\n'
  '//\r\n'
  '// Rejected \u2192 null:\r\n'
  '//   i = i * k         (k is identifier)\r\n'
  '//   i = foo(i)        (call_expression RHS)\r\n'
  '//   i = i * 1         (multiplier <= 1)\r\n'
  'function classifyPlainAssignmentUpdate(\r\n'
  '  updateNode: SyntaxNode\r\n'
  '): LoopClassificationResult | null {\r\n'
  '  const lhs = updateNode.childForFieldName(\'left\');\r\n'
  '  const rhs = updateNode.childForFieldName(\'right\');\r\n'
  '  if (!lhs || !rhs) return null;\r\n'
  '  if (lhs.type !== \'identifier\') return null;\r\n'
  '  if (rhs.type !== \'binary_expression\') return null;\r\n'
  '\r\n'
  '  const innerOp    = rhs.childForFieldName(\'operator\')?.type;\r\n'
  '  const innerLeft  = rhs.childForFieldName(\'left\');\r\n'
  '  const innerRight = rhs.childForFieldName(\'right\');\r\n'
  '  if (!innerOp || !innerLeft || !innerRight) return null;\r\n'
  '\r\n'
  '  // \u2500\u2500 B: i = i * C \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\r\n'
  '  if (innerOp === \'*\') {\r\n'
  '    if (innerLeft.type !== \'identifier\' || innerLeft.text !== lhs.text) return null;\r\n'
  '    if (innerRight.type !== \'number_literal\' || Number(innerRight.text) <= 1) return null;\r\n'
  '    return { classification: \'logarithmic\', confidence: \'high\' };\r\n'
  '  }\r\n'
  '\r\n'
  '  // \u2500\u2500 B\u2032: i = i << C \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\r\n'
  '  if (innerOp === \'<<\') {\r\n'
  '    if (innerLeft.type !== \'identifier\' || innerLeft.text !== lhs.text) return null;\r\n'
  '    if (innerRight.type !== \'number_literal\' || Number(innerRight.text) < 1) return null;\r\n'
  '    return { classification: \'logarithmic\', confidence: \'high\' };\r\n'
  '  }\r\n'
  '\r\n'
  '  // \u2500\u2500 C: i = i + i \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\r\n'
  '  if (innerOp === \'+\') {\r\n'
  '    if (innerLeft.type !== \'identifier\' || innerLeft.text !== lhs.text) return null;\r\n'
  '    if (innerRight.type !== \'identifier\' || innerRight.text !== lhs.text) return null;\r\n'
  '    return { classification: \'logarithmic\', confidence: \'high\' };\r\n'
  '  }\r\n'
  '\r\n'
  '  return null;\r\n'
  '}\r\n'
)

if OLD_FINDBODY not in content:
    print('ERROR: Patch 2 target not found', file=sys.stderr)
    sys.exit(1)
content = content.replace(OLD_FINDBODY, NEW_FINDBODY, 1)
print('Patch 2 applied.')

# ─── Patch 3: Replace hasConstantInitializer + analyzeUpdatePattern ───────────
OLD_ANALYZE = (
  'function hasConstantInitializer(initializerNode: SyntaxNode | null): boolean {\r\n'
  '  if (!initializerNode) return false;\r\n'
  '  \r\n'
  '  const initDeclarator = initializerNode.descendantsOfType(\'init_declarator\')[0];\r\n'
  '  if (initDeclarator) {\r\n'
  '    const value = initDeclarator.childForFieldName(\'value\');\r\n'
  '    if (value && isSafeConstantExpression(value)) return true;\r\n'
  '  }\r\n'
  '  \r\n'
  '  const assignmentExpr = initializerNode.descendantsOfType(\'assignment_expression\')[0];\r\n'
  '  if (assignmentExpr) {\r\n'
  '    const right = assignmentExpr.childForFieldName(\'right\');\r\n'
  '    if (right && isSafeConstantExpression(right)) return true;\r\n'
  '  }\r\n'
  '\r\n'
  '  return false;\r\n'
  '}\r\n'
  '\r\n'
  'function analyzeUpdatePattern(\r\n'
  '  updateNode: SyntaxNode, \r\n'
  '  conditionNode: SyntaxNode | null, \r\n'
  '  initializerNode: SyntaxNode | null\r\n'
  '): LoopClassificationResult {\r\n'
  '  if (updateNode.type === \'update_expression\') {\r\n'
  '    if (conditionNode && conditionNode.type === \'binary_expression\') {\r\n'
  '      const rightNode = conditionNode.childForFieldName(\'right\');\r\n'
  '      const leftNode = conditionNode.childForFieldName(\'left\');\r\n'
  '      \r\n'
  '      const hasConstantBound = isSafeConstantExpression(rightNode) || isSafeConstantExpression(leftNode);\r\n'
  '      \r\n'
  '      if (hasConstantBound && hasConstantInitializer(initializerNode)) {\r\n'
  '        return { classification: \'constant\', confidence: \'high\' };\r\n'
  '      }\r\n'
  '    }\r\n'
  '    return { classification: \'linear\', confidence: \'high\' };\r\n'
  '  }\r\n'
  '\r\n'
  '  if (updateNode.type === \'assignment_expression\' || updateNode.type === \'math_assignment_expression\') {\r\n'
  '    const operatorNode = updateNode.childForFieldName(\'operator\') || updateNode.children.find(c => c.type === \'+\' + \'=\' || c.type === \'-=\' || c.type === \'*=\' || c.type === \'/=\');\r\n'
  '    const operator = operatorNode ? operatorNode.type : null;\r\n'
  '\r\n'
  '    if (!operator || operator === \'=\') {\r\n'
  '      const text = updateNode.text;\r\n'
  '      if (text.includes(\'*=\') || text.includes(\'<<=\')||text.includes(\'>>=\')) return { classification: \'logarithmic\', confidence: \'high\' };\r\n'
  '      // Task 3: /= in text fallback \u2014 only log if RHS looks like a literal\r\n'
  '      if (text.includes(\'/=\')) {\r\n'
  '        const rhs = updateNode.childForFieldName(\'right\');\r\n'
  '        if (rhs && rhs.type === \'number_literal\' && Number(rhs.text) > 1) return { classification: \'logarithmic\', confidence: \'high\' };\r\n'
  '        return { classification: \'linear\', confidence: \'medium\' };\r\n'
  '      }\r\n'
  '      if (text.includes(\'+=\') || text.includes(\'-=\')) return { classification: \'linear\', confidence: \'medium\' };\r\n'
  '      // Normal assignment `i = i + 1` or `x = x / 2`\r\n'
  '      if (text.includes(\'/\')) {\r\n'
  '        // Only classify as logarithmic if the RHS of the assignment is a division by a constant > 1\r\n'
  '        const rhs = updateNode.childForFieldName(\'right\');\r\n'
  '        if (rhs && rhs.type === \'binary_expression\' && rhs.childForFieldName(\'operator\')?.type === \'/\') {\r\n'
  '          const divRhs = rhs.childForFieldName(\'right\');\r\n'
  '          if (divRhs && divRhs.type === \'number_literal\' && Number(divRhs.text) > 1) {\r\n'
  '            // Only classify as logarithmic if the LHS variable participates in the numerator\r\n'
  '            const lhsNode = updateNode.childForFieldName(\'left\');\r\n'
  '            const divLhsNode = rhs.childForFieldName(\'left\');\r\n'
  '            if (lhsNode && divLhsNode && divLhsNode.text.includes(lhsNode.text)) {\r\n'
  '              return { classification: \'logarithmic\', confidence: \'low\' };\r\n'
  '            }\r\n'
  '          }\r\n'
  '        }\r\n'
  '        return { classification: \'unknown\', confidence: \'low\' };\r\n'
  '      }\r\n'
  '      if (text.includes(\'*\')) return { classification: \'logarithmic\', confidence: \'low\' };\r\n'
  '\r\n'
  '      // Pointer or field traversal: e.g. x = x->next or x = x.child\r\n'
  '      const rhs = updateNode.childForFieldName(\'right\');\r\n'
  '      if (rhs && (rhs.type === \'field_expression\' || rhs.text.includes(\'->\')) ) {\r\n'
  '        return { classification: \'unknown\', confidence: \'low\' };\r\n'
  '      }\r\n'
  '\r\n'
  '      return { classification: \'linear\', confidence: \'low\' };\r\n'
  '    }\r\n'
  '\r\n'
  '    if (operator === \'*=\' || operator === \'<<=\' || operator === \'>>= \') {\r\n'
  '      return { classification: \'logarithmic\', confidence: \'high\' };\r\n'
  '    }\r\n'
)

# Rather than matching the exact bytes, do a simpler replacement on the key function signatures
# Find and replace hasConstantInitializer through analyzeUpdatePattern end

import re

# Strategy: find the block from 'function hasConstantInitializer' through end of 'function analyzeUpdatePattern'
# and replace it entirely.

def find_function_block(text, func_name):
    """Return (start, end) indices of a complete function definition."""
    pattern = re.compile(r'\nfunction ' + re.escape(func_name) + r'\b')
    m = pattern.search(text)
    if not m:
        return None, None
    start = m.start()
    # Find matching closing brace
    depth = 0
    i = m.start()
    in_func = False
    while i < len(text):
        c = text[i]
        if c == '{':
            depth += 1
            in_func = True
        elif c == '}':
            depth -= 1
            if in_func and depth == 0:
                return start, i + 1
        i += 1
    return None, None

# Find hasConstantInitializer start, analyzeUpdatePattern end
hci_start, hci_end = find_function_block(content, 'hasConstantInitializer')
aup_start, aup_end = find_function_block(content, 'analyzeUpdatePattern')

if hci_start is None or aup_start is None:
    print('ERROR: Could not find function blocks', file=sys.stderr)
    sys.exit(1)

print(f'hasConstantInitializer: {hci_start}-{hci_end}')
print(f'analyzeUpdatePattern: {aup_start}-{aup_end}')

NEW_ANALYZE_BLOCK = '''
function hasConstantInitializer(initializerNode: SyntaxNode | null): boolean {
  if (!initializerNode) return false;
  const initDeclarator = initializerNode.descendantsOfType('init_declarator')[0];
  if (initDeclarator) {
    const value = initDeclarator.childForFieldName('value');
    if (value && isSafeConstantExpression(value)) return true;
  }
  const assignmentExpr = initializerNode.descendantsOfType('assignment_expression')[0];
  if (assignmentExpr) {
    const right = assignmentExpr.childForFieldName('right');
    if (right && isSafeConstantExpression(right)) return true;
  }
  return false;
}

function analyzeUpdatePattern(
  updateNode: SyntaxNode,
  conditionNode: SyntaxNode | null,
  initializerNode: SyntaxNode | null,
  bodyNode: SyntaxNode | null,
  isForLoopUpdate: boolean
): LoopClassificationResult {
  // ── update_expression: i++, i--, ++i, --i ──────────────────────────────────
  if (updateNode.type === 'update_expression') {
    if (conditionNode && conditionNode.type === 'binary_expression') {
      const rightNode = conditionNode.childForFieldName('right');
      const leftNode  = conditionNode.childForFieldName('left');
      const hasConstantBound = isSafeConstantExpression(rightNode) || isSafeConstantExpression(leftNode);
      if (hasConstantBound && hasConstantInitializer(initializerNode)) {
        return { classification: 'constant', confidence: 'high' };
      }
    }
    return { classification: 'linear', confidence: 'high' };
  }

  if (updateNode.type === 'assignment_expression' || updateNode.type === 'math_assignment_expression') {
    const operatorNode =
      updateNode.childForFieldName('operator') ||
      updateNode.children.find(c => c.type === '+=' || c.type === '-=' || c.type === '*=' || c.type === '/=');
    const operator = operatorNode ? operatorNode.type : null;

    // ── operator = '=' branch: structural plain-assignment recognizers (D4.9 B & C) ──
    // Replaces the old text.includes('*') / text.includes('<<') heuristics entirely.
    if (!operator || operator === '=') {
      // Sub-feature E: guard before structural recognizers.
      // If update came from the body and is not unconditionally executed → Unknown.
      if (!isForLoopUpdate && !isUnconditionalBodyStatement(updateNode, bodyNode)) {
        return { classification: 'unknown', confidence: 'low' };
      }

      // Try structural multiplicative / doubling recognizers (Sub-features B & C).
      const mulResult = classifyPlainAssignmentUpdate(updateNode);
      if (mulResult) return mulResult;

      // Remaining plain-assignment structural checks.
      const rhs = updateNode.childForFieldName('right');

      if (rhs && rhs.type === 'binary_expression') {
        const innerOp    = rhs.childForFieldName('operator')?.type;
        const innerLeft  = rhs.childForFieldName('left');
        const innerRight = rhs.childForFieldName('right');

        // i = i / C
        if (innerOp === '/') {
          const lhsNode = updateNode.childForFieldName('left');
          if (
            lhsNode && innerLeft && innerRight &&
            innerLeft.type === 'identifier' && innerLeft.text === lhsNode.text &&
            innerRight.type === 'number_literal' && Number(innerRight.text) > 1
          ) {
            return { classification: 'logarithmic', confidence: 'low' };
          }
          return { classification: 'unknown', confidence: 'low' };
        }

        // i = i >> C
        if (innerOp === '>>') {
          const lhsNode = updateNode.childForFieldName('left');
          if (
            lhsNode && innerLeft && innerRight &&
            innerLeft.type === 'identifier' && innerLeft.text === lhsNode.text &&
            innerRight.type === 'number_literal' && Number(innerRight.text) >= 1
          ) {
            return { classification: 'logarithmic', confidence: 'high' };
          }
          return { classification: 'unknown', confidence: 'low' };
        }
      }

      // Pointer or field traversal: x = x->next, x = x.child
      if (rhs && (rhs.type === 'field_expression' || rhs.type === 'pointer_expression')) {
        return { classification: 'unknown', confidence: 'low' };
      }

      return { classification: 'linear', confidence: 'low' };
    }

    // ── D4.9 Sub-feature A: *=, <<=, >>= require number_literal RHS > 1 ───────
    //
    // BUG FIXED: Previously ALL *=/<<=/>>=  returned logarithmic regardless of RHS.
    //   i *= k  →  logarithmic, high  ← FALSE POSITIVE (now fixed)
    //
    // AFTER D4.9:
    //   i *= 2   → logarithmic, high  ✅
    //   i <<= 1  → logarithmic, high  ✅
    //   i >>= 1  → logarithmic, high  ✅
    //   i *= k   → Unknown            ✅ (FIXED)
    //   i *= 0   → Unknown            ✅
    //   i *= 1   → Unknown            ✅
    //   i *= foo()→ Unknown           ✅
    if (operator === '*=' || operator === '<<=' || operator === '>>=') {
      // Sub-feature E: conditional execution guard for body updates.
      if (!isForLoopUpdate && !isUnconditionalBodyStatement(updateNode, bodyNode)) {
        return { classification: 'unknown', confidence: 'low' };
      }
      const rhs = updateNode.childForFieldName('right');
      // RHS must be a number_literal — any other type (identifier, call, etc.) → Unknown.
      if (!rhs || rhs.type !== 'number_literal') {
        return { classification: 'unknown', confidence: 'low' };
      }
      const rhsValue = Number(rhs.text);
      // *= 1 is a no-op; *= 0 collapses i to 0. Both → Unknown.
      if (rhsValue <= 1) {
        return { classification: 'unknown', confidence: 'low' };
      }
      // Initializer guard for *=: i₀ must be a proven positive literal.
      // <<= and >>= do not require this guard.
      if (operator === '*=' && !hasPositiveLiteralInitializer(initializerNode)) {
        return { classification: 'unknown', confidence: 'low' };
      }
      return { classification: 'logarithmic', confidence: 'high' };
    }

    // /= is only logarithmic when the divisor is a literal constant > 1.
    if (operator === '/=') {
      if (!isForLoopUpdate && !isUnconditionalBodyStatement(updateNode, bodyNode)) {
        return { classification: 'unknown', confidence: 'low' };
      }
      const rhs = updateNode.childForFieldName('right');
      if (rhs && rhs.type === 'number_literal' && Number(rhs.text) > 1) {
        return { classification: 'logarithmic', confidence: 'high' };
      }
      return { classification: 'linear', confidence: 'medium' };
    }

    if (operator === '+=' || operator === '-=') {
      // ── D4.9 Sub-feature D: i += i (self-doubling) ────────────────────────
      if (operator === '+=') {
        const lhs = updateNode.childForFieldName('left');
        const rhs = updateNode.childForFieldName('right');
        if (lhs && rhs && lhs.type === 'identifier' && rhs.type === 'identifier' && rhs.text === lhs.text) {
          // Sub-feature E: conditional execution guard.
          if (!isForLoopUpdate && !isUnconditionalBodyStatement(updateNode, bodyNode)) {
            return { classification: 'unknown', confidence: 'low' };
          }
          // Mathematical proof: i += i ≡ i *= 2 — one doubling per iteration.
          return { classification: 'logarithmic', confidence: 'high' };
        }
      }
      // Fenwick lowbit pattern: i += i & (-i)  or  i -= i & (-i)
      if (isFenwickLowbitUpdate(updateNode)) {
        return { classification: 'logarithmic', confidence: 'high' };
      }
      return { classification: 'linear', confidence: 'medium' };
    }
  }

  return { classification: 'unknown', confidence: 'low' };
}'''

# Replace hci_start..aup_end with NEW_ANALYZE_BLOCK
content = content[:hci_start] + NEW_ANALYZE_BLOCK + content[aup_end:]
print('Patch 3 applied.')

with open('src/parser/loopClassifier.ts', 'wb') as f:
    f.write(content.encode('utf-8'))
print('File written successfully.')
