import { SyntaxNode } from 'web-tree-sitter';

export type LoopClassification = 'constant' | 'linear' | 'logarithmic' | 'linear_logarithmic' | 'fractional' | 'unknown';
export type LoopConfidence = 'high' | 'medium' | 'low';

export const STL_REGISTRY: Record<string, LoopClassification> = {
  'sort': 'linear_logarithmic',
  'stable_sort': 'linear_logarithmic',
  'lower_bound': 'logarithmic',
  'upper_bound': 'logarithmic',
  'binary_search': 'logarithmic',
  'reverse': 'linear',
  'nth_element': 'linear',
  'next_permutation': 'linear',
  'accumulate': 'linear',
  'fill': 'linear'
};

export interface LoopClassificationResult {
  classification: LoopClassification;
  confidence: LoopConfidence;
}


/**
 * Classifies a loop's complexity behavior based on its AST node.
 */
export function classifyLoop(node: SyntaxNode): LoopClassificationResult {
  let updateNode: SyntaxNode | null = null;
  let conditionNode: SyntaxNode | null = null;
  let initializerNode: SyntaxNode | null = null;

  if (node.type === 'for_range_loop') {
    return { classification: 'linear', confidence: 'medium' };
  }

  if (node.type === 'for_statement') {
    conditionNode = node.childForFieldName('condition');
    initializerNode = node.childForFieldName('initializer');
    updateNode = node.childForFieldName('update');

    // FIX 2 — Missing condition guard:
    // A for_statement with no condition field (e.g. `for(i=0;;i++)`) is semantically
    // equivalent to `for(;;)` — it is an infinite loop. Return unknown immediately
    // so we do not confidently classify it as linear.
    if (updateNode !== null && conditionNode === null) {
      return { classification: 'unknown', confidence: 'low' };
    }

    // FIX 3 — comma_expression update handling:
    // Two-pointer and similar idioms use `l++, r--` in the update clause, which
    // tree-sitter parses as a comma_expression. Unwrap to the first operand so
    // the classifier can identify the increment pattern.
    if (updateNode && updateNode.type === 'comma_expression') {
      updateNode = updateNode.child(0) ?? updateNode;
    }
  } else if (node.type === 'while_statement' || node.type === 'do_statement') {
    conditionNode = node.childForFieldName('condition');
    // Tree-sitter wraps the while/do condition in a `condition_clause` node
    // (the parenthesized condition). Unwrap it to find the actual expression
    // by scanning children and skipping the '(' and ')' punctuation tokens.
    if (conditionNode && conditionNode.type === 'condition_clause') {
      for (let i = 0; i < conditionNode.childCount; i++) {
        const ch = conditionNode.child(i);
        if (ch && ch.type !== '(' && ch.type !== ')') {
          conditionNode = ch;
          break;
        }
      }
    }
  }

  // If there's no updateNode from a for-loop, try the body.
  if (!updateNode) {
    const bodyNode = node.childForFieldName('body');
    updateNode = findBodyUpdate(bodyNode);
  }

  // If still no updateNode, the condition itself might be the update (e.g., `while(x = x / 2)`).
  if (!updateNode && conditionNode) {
    if (conditionNode.type === 'assignment_expression' || conditionNode.type === 'update_expression') {
      updateNode = conditionNode;
    }
  }

  // Task 2: Support call_expression conditions such as while(!q.empty()).
  // These are container-driven queue loops — classify as linear by default,
  // bypassing the missing-update check (since they usually just do q.pop() which isn't an assignment).
  if (node.type === 'while_statement' || node.type === 'do_statement') {
    if (conditionNode && isCallExpressionCondition(conditionNode)) {
      // If we did find a body update, let analyzeUpdatePattern classify it.
      // Otherwise, return linear directly.
      if (!updateNode) {
        return { classification: 'linear', confidence: 'low' };
      }
    }
  }

  if (!updateNode) {
    return { classification: 'unknown', confidence: 'low' };
  }

  // Detect O(sqrt n) condition:
  // e.g., i * i <= n OR i <= sqrt(n)
  if (conditionNode && conditionNode.type === 'binary_expression') {
    const left = conditionNode.childForFieldName('left');
    const right = conditionNode.childForFieldName('right');
    const op = conditionNode.childForFieldName('operator');
    
    if (op && (op.type === '<=' || op.type === '<')) {
      // Check left side for i * i
      if (left && left.type === 'binary_expression' && left.childForFieldName('operator')?.type === '*') {
        const l1 = left.childForFieldName('left');
        const l2 = left.childForFieldName('right');
        if (l1 && l2 && l1.text === l2.text) {
          return { classification: 'fractional', confidence: 'high' };
        }
      }
      
      // Check right side for sqrt(n)
      if (right && right.type === 'call_expression') {
        const fn = right.childForFieldName('function') || right.child(0);
        if (fn && fn.type === 'identifier' && fn.text === 'sqrt') {
          return { classification: 'fractional', confidence: 'high' };
        }
      }
    }
  }

  // Detect binary-search convergence (while only): condition is var-op-var AND
  // body contains midpoint computation + boundary update using that midpoint.
  if (node.type === 'while_statement') {
    const bodyNode = node.childForFieldName('body');
    if (conditionNode && isBinarySearchCondition(conditionNode) && hasMidpointUpdate(bodyNode)) {
      return { classification: 'logarithmic', confidence: 'high' };
    }
    // Detect Euclidean GCD: while(singleIdent) with modulo reassignment in body.
    if (conditionNode && conditionNode.type === 'identifier' && hasModuloAssignment(bodyNode)) {
      return { classification: 'logarithmic', confidence: 'medium' };
    }
  }

  return analyzeUpdatePattern(updateNode, conditionNode, initializerNode);
}

function findBodyUpdate(bodyNode: SyntaxNode | null): SyntaxNode | null {
  if (!bodyNode) return null;
  const updates = bodyNode.descendantsOfType(['update_expression', 'assignment_expression', 'math_assignment_expression']);
  if (updates.length > 0) return updates[updates.length - 1]; // Use last update as conservative guess, or just first.
  return null;
}

/**
 * Returns true when conditionNode looks like a binary-search guard:
 *   lo < hi   lo <= hi   lo > hi   lo >= hi
 * where both operands are identifiers (not literals).
 */
function isBinarySearchCondition(cond: SyntaxNode): boolean {
  if (cond.type !== 'binary_expression') return false;
  const op = cond.childForFieldName('operator');
  if (!op || !['<', '<=', '>', '>='].includes(op.type)) return false;
  const left = cond.childForFieldName('left');
  const right = cond.childForFieldName('right');
  return !!(left && left.type === 'identifier' && right && right.type === 'identifier');
}

/**
 * Returns true when the loop body contains a midpoint variable assignment
 * (e.g. `mid = (lo+hi)/2`) AND a boundary update that uses that same variable
 * (e.g. `lo = mid+1` or `hi = mid`).
 *
 * The midpoint is typically declared as a local variable (init_declarator),
 * e.g. `int mid = (lo+hi)/2`. We search both init_declarators and
 * assignment_expressions for a RHS that is a division expression.
 * We then verify at least one boundary assignment references that variable.
 */
function hasMidpointUpdate(bodyNode: SyntaxNode | null): boolean {
  if (!bodyNode) return false;

  // Step 1: find midpoint name from init_declarator (int mid = …/…) or assignment_expression (mid = …/…)
  let midpointName: string | null = null;

  // Check init_declarator: `int mid = (lo+hi)/2`
  const initDecls = bodyNode.descendantsOfType('init_declarator');
  for (const decl of initDecls) {
    const value = decl.childForFieldName('value');
    if (value && containsDivision(value)) {
      const name = decl.childForFieldName('declarator');
      if (name && name.type === 'identifier') {
        midpointName = name.text;
        break;
      }
    }
  }

  // Fallback: check assignment_expression: `mid = (lo+hi)/2`
  if (!midpointName) {
    const assignments = bodyNode.descendantsOfType('assignment_expression');
    for (const asgn of assignments) {
      const rhs = asgn.childForFieldName('right');
      if (rhs && containsDivision(rhs)) {
        const lhs = asgn.childForFieldName('left');
        if (lhs && lhs.type === 'identifier') {
          midpointName = lhs.text;
          break;
        }
      }
    }
  }

  if (!midpointName) return false;

  // Step 2: verify at least one assignment uses midpoint on its RHS (boundary narrowing)
  const allAssigns = bodyNode.descendantsOfType('assignment_expression');
  for (const asgn of allAssigns) {
    const lhs = asgn.childForFieldName('left');
    if (lhs && lhs.text === midpointName) continue; // skip the midpoint declaration itself
    const rhs = asgn.childForFieldName('right');
    if (rhs && rhs.text.includes(midpointName)) return true;
  }
  return false;
}

/** Returns true when node is or contains a top-level division expression. */
function containsDivision(node: SyntaxNode): boolean {
  if (node.type === 'binary_expression') {
    const op = node.childForFieldName('operator');
    if (op && op.type === '/') return true;
  }
  // Handle parenthesized: (lo+hi)/2
  if (node.type === 'parenthesized_expression') {
    const inner = node.child(1) ?? node.child(0);
    if (inner) return containsDivision(inner);
  }
  return false;
}

/**
 * Returns true when the body contains a modulo assignment (b = a % b  or  a %= b).
 * Used for Euclidean GCD detection.
 * Searches both init_declarator (int t = a % b) and assignment_expression (b = a % b).
 */
function hasModuloAssignment(bodyNode: SyntaxNode | null): boolean {
  if (!bodyNode) return false;
  // Check math_assignment_expression with %=
  const mathAssigns = bodyNode.descendantsOfType('math_assignment_expression');
  for (const a of mathAssigns) {
    if (a.text.includes('%=')) return true;
  }
  // Check plain assignment where RHS contains binary % expression
  const assigns = bodyNode.descendantsOfType('assignment_expression');
  for (const a of assigns) {
    const rhs = a.childForFieldName('right');
    if (rhs && rhs.type === 'binary_expression' && rhs.childForFieldName('operator')?.type === '%') return true;
  }
  // Check init_declarator where value contains binary % expression (e.g. int t = a % b)
  const initDecls = bodyNode.descendantsOfType('init_declarator');
  for (const decl of initDecls) {
    const value = decl.childForFieldName('value');
    if (value && value.type === 'binary_expression' && value.childForFieldName('operator')?.type === '%') return true;
  }
  return false;
}

/**
 * Returns true when the update node is a Fenwick lowbit operation:
 *   i += i & (-i)   or   i -= i & (-i)
 *
 * Strict matching rules:
 * 1. Operator must be += or -=.
 * 2. RHS must be a binary_expression with operator '&'.
 * 3. One side of '&' must be a plain identifier that matches the LHS (update variable).
 * 4. The other side of '&' must be a unary negation of the same identifier.
 *
 * This prevents false positives like  x += y & (-y)  where x ≠ y.
 */
function isFenwickLowbitUpdate(updateNode: SyntaxNode): boolean {
  if (updateNode.type !== 'assignment_expression' && updateNode.type !== 'math_assignment_expression') return false;
  const operatorNode = updateNode.childForFieldName('operator') ||
    updateNode.children.find(c => c.type === '+=' || c.type === '-=');
  if (!operatorNode || (operatorNode.type !== '+=' && operatorNode.type !== '-=')) return false;

  // Extract the loop-variable name from the LHS.
  const lhs = updateNode.childForFieldName('left');
  if (!lhs || lhs.type !== 'identifier') return false;
  const updateVarName = lhs.text;

  const rhs = updateNode.childForFieldName('right');
  if (!rhs || rhs.type !== 'binary_expression') return false;
  const rhsOp = rhs.childForFieldName('operator');
  if (!rhsOp || rhsOp.type !== '&') return false;

  const rhsLeft = rhs.childForFieldName('left');
  const rhsRight = rhs.childForFieldName('right');

  // Pattern: updateVar & (-updateVar)
  //   rhsLeft  = identifier(updateVar)
  //   rhsRight = unary_negation wrapping identifier(updateVar)
  const leftIsVar   = rhsLeft  && rhsLeft.type === 'identifier' && rhsLeft.text === updateVarName;
  const rightIsNeg  = rhsRight && isNegationOf(rhsRight, updateVarName);
  if (leftIsVar && rightIsNeg) return true;

  // Pattern: (-updateVar) & updateVar
  const rightIsVar  = rhsRight && rhsRight.type === 'identifier' && rhsRight.text === updateVarName;
  const leftIsNeg   = rhsLeft  && isNegationOf(rhsLeft, updateVarName);
  if (rightIsVar && leftIsNeg) return true;

  return false;
}

/**
 * Returns true when node is a unary negation of the given identifier,
 * possibly wrapped in parentheses: (-varName) or -(varName).
 */
function isNegationOf(node: SyntaxNode, varName: string): boolean {
  if (node.type === 'unary_expression') {
    const op = node.childForFieldName('operator') || node.child(0);
    if (!op || op.type !== '-') return false;
    const operand = node.childForFieldName('argument') || node.child(1);
    if (!operand) return false;
    if (operand.type === 'identifier') return operand.text === varName;
    if (operand.type === 'parenthesized_expression') {
      // -(varName)
      for (let c = 0; c < operand.childCount; c++) {
        const ch = operand.child(c);
        if (ch && ch.type === 'identifier' && ch.text === varName) return true;
      }
    }
    return false;
  }
  if (node.type === 'parenthesized_expression') {
    // (-varName) — parenthesized unary
    for (let c = 0; c < node.childCount; c++) {
      const ch = node.child(c);
      if (ch && isNegationOf(ch, varName)) return true;
    }
  }
  return false;
}

function hasConstantInitializer(initializerNode: SyntaxNode | null): boolean {
  if (!initializerNode) return false;
  
  const initDeclarator = initializerNode.descendantsOfType('init_declarator')[0];
  if (initDeclarator) {
    const value = initDeclarator.childForFieldName('value');
    if (value && value.type === 'number_literal') return true;
  }
  
  const assignmentExpr = initializerNode.descendantsOfType('assignment_expression')[0];
  if (assignmentExpr) {
    const right = assignmentExpr.childForFieldName('right');
    if (right && right.type === 'number_literal') return true;
  }

  return false;
}

function analyzeUpdatePattern(
  updateNode: SyntaxNode, 
  conditionNode: SyntaxNode | null, 
  initializerNode: SyntaxNode | null
): LoopClassificationResult {
  if (updateNode.type === 'update_expression') {
    if (conditionNode && conditionNode.type === 'binary_expression') {
      const rightNode = conditionNode.childForFieldName('right');
      const leftNode = conditionNode.childForFieldName('left');
      
      const hasConstantBound = (rightNode && rightNode.type === 'number_literal') || 
                               (leftNode && leftNode.type === 'number_literal');
      
      if (hasConstantBound && hasConstantInitializer(initializerNode)) {
        return { classification: 'constant', confidence: 'high' };
      }
    }
    return { classification: 'linear', confidence: 'high' };
  }

  if (updateNode.type === 'assignment_expression' || updateNode.type === 'math_assignment_expression') {
    const operatorNode = updateNode.childForFieldName('operator') || updateNode.children.find(c => c.type === '+=' || c.type === '-=' || c.type === '*=' || c.type === '/=');
    const operator = operatorNode ? operatorNode.type : null;

    if (!operator || operator === '=') {
      const text = updateNode.text;
      if (text.includes('*=') || text.includes('<<=')||text.includes('>>=')) return { classification: 'logarithmic', confidence: 'high' };
      // Task 3: /= in text fallback — only log if RHS looks like a literal
      if (text.includes('/=')) {
        const rhs = updateNode.childForFieldName('right');
        if (rhs && rhs.type === 'number_literal' && Number(rhs.text) > 1) return { classification: 'logarithmic', confidence: 'high' };
        return { classification: 'linear', confidence: 'medium' };
      }
      if (text.includes('+=') || text.includes('-=')) return { classification: 'linear', confidence: 'medium' };
      // Normal assignment `i = i + 1` or `x = x / 2`
      if (text.includes('/')) {
        // Only classify as logarithmic if the RHS of the assignment is a division by a constant > 1
        const rhs = updateNode.childForFieldName('right');
        if (rhs && rhs.type === 'binary_expression' && rhs.childForFieldName('operator')?.type === '/') {
          const divRhs = rhs.childForFieldName('right');
          if (divRhs && divRhs.type === 'number_literal' && Number(divRhs.text) > 1) {
            // Only classify as logarithmic if the LHS variable participates in the numerator
            const lhsNode = updateNode.childForFieldName('left');
            const divLhsNode = rhs.childForFieldName('left');
            if (lhsNode && divLhsNode && divLhsNode.text.includes(lhsNode.text)) {
              return { classification: 'logarithmic', confidence: 'low' };
            }
          }
        }
        return { classification: 'unknown', confidence: 'low' };
      }
      if (text.includes('*')) return { classification: 'logarithmic', confidence: 'low' };

      // Pointer or field traversal: e.g. x = x->next or x = x.child
      const rhs = updateNode.childForFieldName('right');
      if (rhs && (rhs.type === 'field_expression' || rhs.text.includes('->'))) {
        return { classification: 'unknown', confidence: 'low' };
      }

      return { classification: 'linear', confidence: 'low' };
    }

    if (operator === '*=' || operator === '<<=' || operator === '>>=') {
      return { classification: 'logarithmic', confidence: 'high' };
    }
    // Task 3: /= is only logarithmic when the divisor is a literal constant > 1.
    // e.g. i /= 2 → O(log n).  i /= k → O(n) (variable divisor, treat as linear).
    if (operator === '/=') {
      const rhs = updateNode.childForFieldName('right');
      if (rhs && rhs.type === 'number_literal' && Number(rhs.text) > 1) {
        return { classification: 'logarithmic', confidence: 'high' };
      }
      return { classification: 'linear', confidence: 'medium' };
    }
    if (operator === '+=' || operator === '-=') {
      // Check for Fenwick lowbit pattern: i += i & (-i)  or  i -= i & (-i)
      if (isFenwickLowbitUpdate(updateNode)) {
        return { classification: 'logarithmic', confidence: 'high' };
      }
      return { classification: 'linear', confidence: 'medium' };
    }
  }

  return { classification: 'unknown', confidence: 'low' };
}

/**
 * Returns true when the while-condition is a call_expression or a unary NOT of a
 * call_expression — the canonical queue/stack-empty loop pattern:
 *   while(!q.empty())   while(q.size())   while(!stk.empty())
 * We accept any method call or free call as the condition.
 */
export function isCallExpressionCondition(cond: SyntaxNode): boolean {
  if (cond.type === 'call_expression') return true;
  // while(!q.empty())
  if (cond.type === 'unary_expression') {
    const op = cond.childForFieldName('operator') || cond.child(0);
    if (op && op.type === '!') {
      const operand = cond.childForFieldName('argument') || cond.child(1);
      if (operand && (operand.type === 'call_expression' || operand.type === 'parenthesized_expression')) return true;
    }
  }
  return false;
}

/**
 * Fallback classifier for raw macro strings where we lack a parsed AST body.
 */
export function classifyMacroString(macroText: string): LoopClassificationResult {
  const text = macroText.replace(/\s+/g, ''); // strip whitespace for easier regex

  // Logarithmic signatures
  if (text.includes('*=') || text.includes('/=') || text.includes('<<=') || text.includes('>>=')) {
    return { classification: 'logarithmic', confidence: 'medium' };
  }
  
  // Linear signatures
  if (text.includes('++') || text.includes('--') || text.includes('+=') || text.includes('-=')) {
    return { classification: 'linear', confidence: 'medium' };
  }

  // Ranged-for (auto &x : v)
  if (text.includes(':')) {
    return { classification: 'linear', confidence: 'medium' };
  }

  // As required: Do NOT default unknown macro bodies to O(n). Return Unknown.
  return { classification: 'unknown', confidence: 'low' };
}
