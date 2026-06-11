"""
D4.9 complete patch for loopClassifier.ts.
Uses function-boundary detection to avoid fragile string matching.
"""
import re
import sys

with open('src/parser/loopClassifier.ts', 'rb') as f:
    content = f.read().decode('utf-8')

print(f'File size: {len(content)} bytes')

# ─── Utility: find complete function block ───────────────────────────────────
def find_function(text, func_name):
    """Return (start, end) of the complete function definition."""
    # Match 'function funcName(' or 'export function funcName('
    pat = re.compile(r'\n(?:export )?function ' + re.escape(func_name) + r'\b')
    m = pat.search(text)
    if not m:
        return None, None
    start = m.start() + 1  # +1 to skip the leading \n
    depth = 0
    i = start
    while i < len(text):
        if text[i] == '{':
            depth += 1
        elif text[i] == '}':
            depth -= 1
            if depth == 0:
                return start, i + 1
        i += 1
    return None, None

# ─── Patch 1: Update call site ───────────────────────────────────────────────
OLD1 = '  const result = analyzeUpdatePattern(updateNode, conditionNode, initializerNode);\n  if (result.classification === \'linear\') {\n    const boundVar = getBoundVariable(conditionNode);\n    if (boundVar) result.boundVar = boundVar;\n  }\n  return result;'
# Also handle CRLF
OLD1_CRLF = OLD1.replace('\n', '\r\n')

NEW1 = '''  // D4.9: pass bodyNode and isForLoopUpdate so analyzeUpdatePattern can apply
  // the Sub-feature E conditional-execution guard and the initializer guard.
  const bodyNode = node.childForFieldName('body');
  const isForLoopUpdate = (node.type === 'for_statement') && (node.childForFieldName('update') !== null);
  const result = analyzeUpdatePattern(updateNode, conditionNode, initializerNode, bodyNode, isForLoopUpdate);
  if (result.classification === 'linear') {
    const boundVar = getBoundVariable(conditionNode);
    if (boundVar) result.boundVar = boundVar;
  }
  return result;'''

if OLD1_CRLF in content:
    content = content.replace(OLD1_CRLF, NEW1.replace('\n', '\r\n'), 1)
    print('Patch 1 applied (CRLF).')
elif OLD1 in content:
    content = content.replace(OLD1, NEW1, 1)
    print('Patch 1 applied (LF).')
else:
    print('ERROR: Patch 1 target not found.', file=sys.stderr)
    sys.exit(1)

# ─── Patch 2: Add helpers after findBodyUpdate ────────────────────────────────
fb_start, fb_end = find_function(content, 'findBodyUpdate')
if fb_start is None:
    print('ERROR: findBodyUpdate not found', file=sys.stderr)
    sys.exit(1)
print(f'findBodyUpdate: {fb_start}-{fb_end}')

HELPERS = '''

// ─── D4.9 Sub-feature E: Unconditional Execution Guard ──────────────────────
//
// Returns true iff `updateNode` is a direct statement of `bodyNode` —
// i.e. NOT nested inside any if_statement, else_clause, switch_statement,
// or additional compound_statement block. Only direct children of the body
// compound_statement are proven to execute on every loop iteration.
//
// Applied ONLY to multiplicative/inductive patterns. Linear (i++) is unaffected.
function isUnconditionalBodyStatement(updateNode: SyntaxNode, bodyNode: SyntaxNode | null): boolean {
  if (!bodyNode) return false;
  const directParent = updateNode.parent;
  if (!directParent) return false;
  // Case 1: updateNode is directly inside the compound_statement body.
  if (directParent.id === bodyNode.id) return true;
  // Case 2: updateNode is wrapped in an expression_statement that is a
  // direct child of the compound_statement body (the standard C++ form).
  if (directParent.type === 'expression_statement' && directParent.parent?.id === bodyNode.id) return true;
  // All other cases: nested inside if_statement, else, switch, nested block, etc.
  return false;
}

// ─── D4.9 Initializer Guard ──────────────────────────────────────────────────
//
// For multiplicative induction the mathematical proof requires i₀ > 0.
// ONLY number_literal > 0 is accepted as a proven positive initializer.
// All other forms (identifiers, parameters, expressions, aliases) are rejected.
function hasPositiveLiteralInitializer(initializerNode: SyntaxNode | null): boolean {
  if (!initializerNode) return false;
  const initDeclarator = initializerNode.descendantsOfType('init_declarator')[0];
  if (initDeclarator) {
    const value = initDeclarator.childForFieldName('value');
    return !!(value && value.type === 'number_literal' && Number(value.text) > 0);
  }
  const assignmentExpr = initializerNode.descendantsOfType('assignment_expression')[0];
  if (assignmentExpr) {
    const right = assignmentExpr.childForFieldName('right');
    return !!(right && right.type === 'number_literal' && Number(right.text) > 0);
  }
  return false;
}

// ─── D4.9 Sub-features B & C: Structural plain-assignment recognizers ────────
//
// Replaces the weak text.includes('*') fallback.
// Returns a result only when ALL structural proofs hold.
// Returns null → caller falls through to its own logic.
//
// Recognised (logarithmic, high):
//   B:  i = i * C      (C is number_literal > 1, LHS text == inner-LHS text)
//   B': i = i << C     (C is number_literal >= 1)
//   C:  i = i + i      (three-way text-identity)
//
// Rejected → null:
//   i = i * k          (k is identifier)
//   i = foo(i)         (call_expression RHS)
//   i = i * 1          (multiplier <= 1)
function classifyPlainAssignmentUpdate(
  updateNode: SyntaxNode
): LoopClassificationResult | null {
  const lhs = updateNode.childForFieldName('left');
  const rhs = updateNode.childForFieldName('right');
  if (!lhs || !rhs) return null;
  if (lhs.type !== 'identifier') return null;
  if (rhs.type !== 'binary_expression') return null;

  const innerOp    = rhs.childForFieldName('operator')?.type;
  const innerLeft  = rhs.childForFieldName('left');
  const innerRight = rhs.childForFieldName('right');
  if (!innerOp || !innerLeft || !innerRight) return null;

  // B: i = i * C
  if (innerOp === '*') {
    if (innerLeft.type !== 'identifier' || innerLeft.text !== lhs.text) return null;
    if (innerRight.type !== 'number_literal' || Number(innerRight.text) <= 1) return null;
    return { classification: 'logarithmic', confidence: 'high' };
  }

  // B': i = i << C
  if (innerOp === '<<') {
    if (innerLeft.type !== 'identifier' || innerLeft.text !== lhs.text) return null;
    if (innerRight.type !== 'number_literal' || Number(innerRight.text) < 1) return null;
    return { classification: 'logarithmic', confidence: 'high' };
  }

  // C: i = i + i
  if (innerOp === '+') {
    if (innerLeft.type !== 'identifier' || innerLeft.text !== lhs.text) return null;
    if (innerRight.type !== 'identifier' || innerRight.text !== lhs.text) return null;
    return { classification: 'logarithmic', confidence: 'high' };
  }

  return null;
}
'''

# Insert HELPERS right after findBodyUpdate ends
content = content[:fb_end] + HELPERS + content[fb_end:]
print('Patch 2 applied.')

# ─── Patch 3: Replace hasConstantInitializer + analyzeUpdatePattern ───────────
hci_start, hci_end = find_function(content, 'hasConstantInitializer')
aup_start, aup_end = find_function(content, 'analyzeUpdatePattern')

if hci_start is None or aup_start is None:
    print('ERROR: Could not find target functions.', file=sys.stderr)
    sys.exit(1)
print(f'hasConstantInitializer: {hci_start}-{hci_end}')
print(f'analyzeUpdatePattern: {aup_start}-{aup_end}')

NEW_BLOCK = '''function hasConstantInitializer(initializerNode: SyntaxNode | null): boolean {
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

    // ── operator '=' branch: structural plain-assignment recognizers ───────────
    // D4.9 Sub-features B & C handle i=i*C, i=i<<C, i=i+i.
    // Removes the old text.includes('*') / text.includes('<<') heuristics entirely.
    if (!operator || operator === '=') {
      // Sub-feature E: conditional execution guard.
      if (!isForLoopUpdate && !isUnconditionalBodyStatement(updateNode, bodyNode)) {
        return { classification: 'unknown', confidence: 'low' };
      }

      // Try structural recognizers (Sub-features B & C).
      const mulResult = classifyPlainAssignmentUpdate(updateNode);
      if (mulResult) return mulResult;

      // Remaining structural checks.
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

        // i = i * k (variable), i = i + j (j≠i), i = i << k (variable):
        // Cannot prove logarithmic OR linear — return Unknown.
        if (innerOp === '*' || innerOp === '+' || innerOp === '<<') {
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
    //   i <<= 0  → Unknown            ✅
    if (operator === '*=' || operator === '<<=' || operator === '>>=') {
      // Sub-feature E: conditional execution guard.
      if (!isForLoopUpdate && !isUnconditionalBodyStatement(updateNode, bodyNode)) {
        return { classification: 'unknown', confidence: 'low' };
      }
      const rhs = updateNode.childForFieldName('right');
      if (!rhs || rhs.type !== 'number_literal') {
        return { classification: 'unknown', confidence: 'low' };
      }
      const rhsValue = Number(rhs.text);
      if (operator === '*=') {
        // *= 1 is a no-op; *= 0 collapses i to 0. Both → Unknown.
        if (rhsValue <= 1) return { classification: 'unknown', confidence: 'low' };
        // Initializer guard: i₀ must be a proven positive literal.
        if (!hasPositiveLiteralInitializer(initializerNode)) {
          return { classification: 'unknown', confidence: 'low' };
        }
      } else {
        // <<= and >>=: shift amount must be >= 1. Shift by 0 is identity (no-op).
        if (rhsValue < 1) return { classification: 'unknown', confidence: 'low' };
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

# The separator between the two functions is '\n\n' — find exact split
sep = content[hci_end:aup_start]
print(f'Separator between functions: {repr(sep[:20])}')

content = content[:hci_start] + NEW_BLOCK + content[aup_end:]
print('Patch 3 applied.')

with open('src/parser/loopClassifier.ts', 'wb') as f:
    f.write(content.encode('utf-8'))
print('File written successfully.')
