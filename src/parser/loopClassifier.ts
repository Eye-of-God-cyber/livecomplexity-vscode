import { SyntaxNode } from 'web-tree-sitter';

export type LoopClassification = 'constant' | 'linear' | 'logarithmic' | 'linear_logarithmic' | 'fractional' | 'graph_traversal' | 'graph_log_traversal' | 'exponential' | 'unknown';
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

/**
 * Registry for STL container member method complexities.
 * Keys are "ContainerType::methodName" (resolved via TypeContext).
 * Only includes methods with non-trivial (non-O(1)) or explicitly O(1) semantics
 * that the inference engine needs to distinguish from plain loop bodies.
 *
 * Omissions (intentional):
 *   - unordered_map / unordered_set methods: O(1) avg — no log factor to add.
 *   - size(), empty(): O(1) — irrelevant to complexity analysis.
 */
export const STL_MEMBER_REGISTRY: Record<string, LoopClassification> = {
  // ─── set — O(log n) ────────────────────────────────────────────────────────
  'set::insert':          'logarithmic',
  'set::erase':           'logarithmic',
  'set::find':            'logarithmic',
  'set::count':           'logarithmic',
  'set::lower_bound':     'logarithmic',
  'set::upper_bound':     'logarithmic',
  'set::contains':        'logarithmic',   // C++20

  // ─── multiset — O(log n) ───────────────────────────────────────────────────
  'multiset::insert':     'logarithmic',
  'multiset::erase':      'logarithmic',
  'multiset::find':       'logarithmic',
  'multiset::count':      'logarithmic',
  'multiset::contains':   'logarithmic',   // C++20

  // ─── map — O(log n) ────────────────────────────────────────────────────────
  'map::insert':          'logarithmic',
  'map::erase':           'logarithmic',
  'map::find':            'logarithmic',
  'map::count':           'logarithmic',
  'map::lower_bound':     'logarithmic',
  'map::upper_bound':     'logarithmic',
  'map::contains':        'logarithmic',   // C++20

  // ─── multimap — O(log n) ───────────────────────────────────────────────────
  'multimap::insert':     'logarithmic',
  'multimap::erase':      'logarithmic',
  'multimap::find':       'logarithmic',
  'multimap::count':      'logarithmic',

  // ─── priority_queue — O(log n) push/pop/emplace; O(1) top ─────────────────
  'priority_queue::push':    'logarithmic',
  'priority_queue::pop':     'logarithmic',
  'priority_queue::emplace': 'logarithmic',  // C++ emplace — same cost as push
  'priority_queue::top':     'constant',     // peek at max/min element — O(1)

  // ─── queue — O(1); listed explicitly so push/pop are never misclassified ───
  'queue::push':          'constant',
  'queue::pop':           'constant',
  'queue::front':         'constant',
  'queue::back':          'constant',

  // ─── stack — O(1) ──────────────────────────────────────────────────────────
  'stack::push':          'constant',
  'stack::pop':           'constant',
  'stack::top':           'constant',

  // ─── deque — O(1) amortized ────────────────────────────────────────────────
  'deque::push_back':     'constant',
  'deque::push_front':    'constant',
  'deque::pop_back':      'constant',
  'deque::pop_front':     'constant',

  // ─── vector — O(1) amortized ───────────────────────────────────────────────
  'vector::push_back':    'constant',
  'vector::pop_back':     'constant',

  // ─── unordered containers — O(1) avg (explicitly constant) ────────────────
  'unordered_set::insert':    'constant',
  'unordered_set::erase':     'constant',
  'unordered_set::find':      'constant',
  'unordered_set::contains':  'constant',  // C++20
  'unordered_map::insert':    'constant',
  'unordered_map::erase':     'constant',
  'unordered_map::find':      'constant',
  'unordered_map::contains':  'constant',  // C++20
};

export interface LoopClassificationResult {
  classification: LoopClassification;
  confidence: LoopConfidence;
  boundVar?: string | string[];
}


/**
 * Classifies a loop's complexity behavior based on its AST node.
 */
export function classifyLoop(node: SyntaxNode): LoopClassificationResult {
  let updateNode: SyntaxNode | null = null;
  let conditionNode: SyntaxNode | null = null;
  let initializerNode: SyntaxNode | null = null;

  if (node.type === 'for_range_loop') {
    // D5.6 Issue 1: Extract the container identifier as boundVar.
    // Tree-sitter-cpp for_range_loop has a 'right' field that is the range expression.
    // Only bare identifier containers are accepted (e.g., `v` in `for (auto x : v)`).
    // Call expressions (v.subrange()), field expressions, and complex expressions
    // are rejected — the loop classifies as linear with no boundVar (unknown variable).
    let rangeBoundVar: string | undefined = undefined;
    const rangeExpr = node.childForFieldName('right');
    if (rangeExpr && rangeExpr.type === 'identifier') {
      rangeBoundVar = rangeExpr.text;
    }
    return { classification: 'linear', confidence: 'medium', boundVar: rangeBoundVar };
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

  // NOTE: while(call()) loops — e.g. while(q.empty()), while(network.hasNext()) —
  // are NOT assumed linear. The call expression bound is structurally unprovable.
  // A while loop with a call_expression condition and no detectable body update
  // will fall through to the !updateNode → unknown path below.
  // Loops that ARE provably linear (e.g. while(!q.empty()) with q.pop() body update)
  // are handled by analyzeUpdatePattern after the updateNode is found.

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
        const unwrap = (n: any) => n && n.type === 'cast_expression' ? n.childForFieldName('value') || n.child(n.childCount - 1) || n : n;
        if (l1 && l2 && unwrap(l1).text === unwrap(l2).text) {
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

  // ── D3.1: Bitmask / exponential bound detection ──────────────────────────────────────
  // Fires ONLY when all three conditions hold simultaneously:
  //   1. for_statement with an update_expression (mask++)
  //   2. condition RHS is (1 << varName), (1LL << varName), (2 << varName), etc.
  //   3. left side of << is a number_literal (not a variable like k)
  // Any failure silently falls through to the existing linear classification.
  if (
    node.type === 'for_statement' &&
    updateNode !== null &&
    updateNode.type === 'update_expression' &&
    conditionNode !== null &&
    conditionNode.type === 'binary_expression'
  ) {
    const bitmaskVar = extractBitmaskVar(conditionNode);
    if (bitmaskVar) {
      return { classification: 'exponential', confidence: 'high', boundVar: bitmaskVar };
    }
  }

  // ── D4.5: Sparse Table Outer Loop Detection ──────────────────────────────────────
  // Fires when the for-loop condition is of the form (1 << j) <= n  with j++.
  // A loop of this shape iterates exactly floor(log2(n)) + 1 times — provably
  // logarithmic regardless of the loop body, by arithmetic invariant.
  //
  // All six structural conditions must hold simultaneously (see isSparseTableOuterLoop).
  // Any failure falls through to the existing linear classification below.
  // Placed AFTER D3.1 (which requires op=`<`) so the two branches are mutually exclusive.
  if (
    node.type === 'for_statement' &&
    updateNode !== null &&
    updateNode.type === 'update_expression' &&
    conditionNode !== null
  ) {
    if (isSparseTableOuterLoop(conditionNode)) {
      return { classification: 'logarithmic', confidence: 'high', boundVar: getBoundVariable(conditionNode) };
    }
  }

  // ── D3.2: Iterative Path Halving ───────────────────────────────────────────
  // Detects loops like: while(parent[x] != x) { parent[x] = parent[parent[x]]; x = parent[x]; }
  // Looks for the exact structural path halving assignment in the loop body.
  if (node.type === 'while_statement') {
    const bodyNode = node.childForFieldName('body');
    if (bodyNode && isPathHalvingBody(bodyNode)) {
      return { classification: 'constant', confidence: 'medium' };
    }
  }

  // D4.9: pass bodyNode and isForLoopUpdate so analyzeUpdatePattern can apply
  // the Sub-feature E conditional-execution guard and the initializer guard.
  const bodyNode = node.childForFieldName('body');
  const isForLoopUpdate = (node.type === 'for_statement') && (node.childForFieldName('update') !== null);
  const result = analyzeUpdatePattern(updateNode, conditionNode, initializerNode, bodyNode, isForLoopUpdate);
  if (result.classification === 'linear') {
    const boundVar = getBoundVariable(conditionNode);
    if (boundVar) {
      result.boundVar = boundVar;
    } else if (hasOpaqueUpperBound(conditionNode)) {
      // The step pattern is linear (i++) but the upper bound in the condition is an
      // opaque expression that extractCompoundBoundNodes cannot prove structurally
      // (e.g. for(i=0; i<getLimit(); i++) or for(i=0; i<n-m; i++)).
      // The engine has proven the step direction but not the bound range.
      // Correctness Before Guessing: return unknown rather than emitting a bare O(n).
      return { classification: 'unknown', confidence: 'low' };
    }
  }
  return result;
}

/**
 * Returns true when the condition node is a binary_expression using a < or <=
 * operator whose right-hand side cannot be structurally proven by extractCompoundBoundNodes.
 *
 * This is the precise trigger for the "opaque upper bound" case:
 *   for(int i = 0; i < getLimit(); i++)   → RHS is bare call_expression (not obj.size())
 *   for(int i = 0; i < n - m; i++)        → RHS is subtraction (rejected by extractor)
 *   for(int i = 0; i < n * m; i++)        → RHS is multiplication (rejected)
 *   for(int i = 0; i < (n > 0 ? n : m); i++) → RHS is ternary (rejected)
 *
 * It does NOT fire for:
 *   for(int i = n; i > 0; i--)            → operator is >, not < / <=
 *   while(n % i == 0)                     → operator is ==, not < / <=
 *   for(int i = 0; i < n; i++)            → RHS is identifier, extractor succeeds
 *   for(int i = 0; i < vec.size(); i++)   → RHS is obj.size(), extractor succeeds
 */
function hasOpaqueUpperBound(conditionNode: SyntaxNode | null): boolean {
  if (!conditionNode) return false;
  // Unwrap condition_clause wrapper (while/do nodes).
  let cond = conditionNode;
  if (cond.type === 'condition_clause') {
    for (let i = 0; i < cond.childCount; i++) {
      const ch = cond.child(i);
      if (ch && ch.type !== '(' && ch.type !== ')') { cond = ch; break; }
    }
  }
  if (cond.type !== 'binary_expression') return false;
  const op = cond.childForFieldName('operator')?.type;
  if (op !== '<' && op !== '<=') return false;
  const right = cond.childForFieldName('right');
  if (!right) return false;
  // The extractor already handles identifier, number_literal, obj.size(), obj.length(), +, /.
  // If it returns undefined for this RHS, the bound is opaque.
  const extracted = extractCompoundBoundNodes(right);
  return extracted === undefined;
}

export function getBoundVariable(conditionNode: SyntaxNode | null): string | string[] | undefined {
  if (!conditionNode) return undefined;
  if (conditionNode.type === 'condition_clause') {
    for (let i = 0; i < conditionNode.childCount; i++) {
      const ch = conditionNode.child(i);
      if (ch && ch.type !== '(' && ch.type !== ')') {
        conditionNode = ch;
        break;
      }
    }
  }

  if (conditionNode.type === 'binary_expression') {
    const op = conditionNode.childForFieldName('operator')?.type;
    if (op === '<' || op === '<=') {
      const right = conditionNode.childForFieldName('right');
      if (right) {
        return extractCompoundBound(right);
      }
    }
  }

  if (conditionNode.type === 'update_expression') {
    const arg = conditionNode.childForFieldName('argument') || conditionNode.child(0);
    if (arg && arg.type === 'identifier') {
      return arg.text;
    }
  }

  if (conditionNode.type === 'assignment_expression') {
    const left = conditionNode.childForFieldName('left');
    if (left && left.type === 'identifier') {
      return left.text;
    }
  }

  return undefined;
}

/**
 * ATOMIC EXTRACTION RULE:
 * Recursive extraction is all-or-nothing. Either the ENTIRE expression is structurally proven,
 * or it returns undefined. No partial recovery. No dropping unsupported branches.
 * Constants (number_literal) contribute no asymptotic growth and are discarded.
 *
 * extractCompoundBoundNodes is the SINGLE canonical structural traversal.
 * extractCompoundBound is a thin string-projection wrapper over it.
 * The two cannot silently diverge: they share exactly one structural definition.
 */
export function extractCompoundBoundNodes(node: SyntaxNode): SyntaxNode[] | undefined {
  if (node.type === 'identifier') {
    return [node]; // Return the node itself, not its text.
  }

  if (node.type === 'number_literal') {
    // Constants contribute no growth. Discard structurally proven constants.
    return [];
  }

  if (node.type === 'parenthesized_expression') {
    const inner = node.child(1); // skip '('
    if (inner && inner.type !== ')') {
      return extractCompoundBoundNodes(inner);
    }
    return undefined;
  }

  if (node.type === 'binary_expression') {
    const op = node.childForFieldName('operator');
    const left = node.childForFieldName('left');
    const right = node.childForFieldName('right');
    if (!op || !left || !right) return undefined;

    if (op.type === '+') {
      const leftExtracted = extractCompoundBoundNodes(left);
      if (!leftExtracted) return undefined; // Atomic failure

      const rightExtracted = extractCompoundBoundNodes(right);
      if (!rightExtracted) return undefined; // Atomic failure

      return [...leftExtracted, ...rightExtracted];
    } else if (op.type === '/') {
      if (right.type === 'number_literal') {
        return extractCompoundBoundNodes(left);
      }
      return undefined;
    } else {
      // Immediate rejection of -, *, %, logical, bitwise, etc.
      return undefined;
    }
  }

  if (node.type === 'call_expression') {
    // Structural proof for container.size() or container.length() ONLY
    const argsList = node.childForFieldName('arguments');
    if (!argsList || argsList.childCount > 2) return undefined; // Must be empty '()'

    const funcExpr = node.childForFieldName('function');
    if (!funcExpr || funcExpr.type !== 'field_expression') return undefined;

    const objIdent = funcExpr.childForFieldName('argument');
    if (!objIdent || objIdent.type !== 'identifier') return undefined;

    const fieldIdent = funcExpr.childForFieldName('field');
    if (!fieldIdent || (fieldIdent.text !== 'size' && fieldIdent.text !== 'length')) return undefined;

    return [node]; // Return the call_expression node itself — its .text is "v.size()".
  }

  if (node.type === 'cast_expression') {
    // Bug D fix: structural unwrapping of C-style cast (int)v.size().
    // A cast_expression is a pure type annotation wrapper — asymptotically
    // it contributes nothing. Recurse into its value child.
    // tree-sitter field name for the cast value is 'value'.
    const castValue = node.childForFieldName('value');
    if (castValue) return extractCompoundBoundNodes(castValue);
    return undefined;
  }

  // Reject everything else (min/max, ternary, arrays, unknown calls, member chains)
  return undefined;
}

/**
 * String-projection wrapper over extractCompoundBoundNodes.
 * Behaviour is identical to the original extractCompoundBound;
 * callers that only need strings continue to work unchanged.
 */
export function extractCompoundBound(node: SyntaxNode): string[] | undefined {
  const nodes = extractCompoundBoundNodes(node);
  if (nodes === undefined) return undefined;
  return nodes.map(n => n.text);
}

function findBodyUpdate(bodyNode: SyntaxNode | null): SyntaxNode | null {
  if (!bodyNode) return null;
  const updates = bodyNode.descendantsOfType(['update_expression', 'assignment_expression', 'math_assignment_expression']);
  if (updates.length > 0) return updates[updates.length - 1]; // Use last update as conservative guess, or just first.
  return null;
}

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
    if (rhs && containsIdentifier(rhs, midpointName)) return true;
  }
  return false;
}

/**
 * Returns true when node is or structurally contains a division expression
 * at any level of nesting.
 *
 * D5.6 Issue 2 fix: The classical midpoint expression `left + (right - left) / 2`
 * is parsed as a binary_expression with top-level operator `+`, where the right
 * operand `(right - left) / 2` IS a binary_expression with operator `/`.
 * The original shallow check only inspected the top-level operator and therefore
 * returned false for this form, causing the loop to fall through to a linear
 * classification and produce a false-positive O(n) for binary search loops.
 *
 * The fix: recurse into both operands of any binary_expression (not just `/`).
 * The function is structurally bounded — tree-sitter nodes are finite and acyclic.
 * The recursion terminates at leaf nodes (identifiers, literals, etc.).
 */
function containsDivision(node: SyntaxNode): boolean {
  if (node.type === 'binary_expression') {
    const op = node.childForFieldName('operator');
    if (op && op.type === '/') return true;
    // Recurse into both operands — needed for e.g. `left + (right - left) / 2`
    // where the top-level op is `+` but the right child contains `/`.
    const left = node.childForFieldName('left');
    const right = node.childForFieldName('right');
    if (left && containsDivision(left)) return true;
    if (right && containsDivision(right)) return true;
  }
  // Handle explicit parenthesized: (lo+hi)/2
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
    if (a.children.find(c => c.type === '%=')) return true;
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

function isSafeConstantExpression(node: SyntaxNode | null): boolean {
  if (!node) return false;

  switch (node.type) {
    case 'number_literal':
    case 'sizeof_expression':
      return true;
    case 'parenthesized_expression':
      return isSafeConstantExpression(node.child(1) ?? node.child(0));
    case 'unary_expression': {
      const op = node.childForFieldName('operator')?.type;
      if (op === '+' || op === '-') {
        return isSafeConstantExpression(node.childForFieldName('argument'));
      }
      return false;
    }
    case 'binary_expression': {
      const op = node.childForFieldName('operator')?.type;
      if (['+', '-', '*', '/', '%'].includes(op || '')) {
        return isSafeConstantExpression(node.childForFieldName('left')) &&
               isSafeConstantExpression(node.childForFieldName('right'));
      }
      return false;
    }
    default:
      return false;
  }
}

// ─── D3.1: Bitmask / Exponential Bound Extraction ────────────────────────────────────────

/**
 * Returns the exponent variable name if the condition's right-hand side is a
 * bit-shift expression of the form  `(1 << n)`, `1LL << n`, `2 << n`, etc.
 *
 * Matching rules (all must hold):
 *   - Condition operator must be `<`.
 *   - RHS unwrapped through any number of parentheses must be a `binary_expression`.
 *   - The inner operator must be `<<`.
 *   - The left operand of `<<` must be a `number_literal` (handles `1`, `1LL`, `2`, `2LL`).
 *   - The right operand of `<<` must be an `identifier` (the exponent variable).
 *
 * If any condition fails, returns undefined and the caller falls through
 * to the existing classification path — guaranteeing zero regressions.
 */
export function extractBitmaskVar(conditionNode: SyntaxNode): string | undefined {
  if (conditionNode.type !== 'binary_expression') return undefined;

  // Condition operator must be < (mask < (1<<n))
  const condOp = conditionNode.childForFieldName('operator');
  if (!condOp || condOp.type !== '<') return undefined;

  let rhs = conditionNode.childForFieldName('right');
  if (!rhs) return undefined;

  // Unwrap all layers of parenthesized_expression: ((1 << n)) → (1 << n) → 1 << n
  while (rhs.type === 'parenthesized_expression') {
    let inner: SyntaxNode | null = null;
    for (let i = 0; i < rhs.childCount; i++) {
      const ch = rhs.child(i);
      if (ch && ch.type !== '(' && ch.type !== ')') {
        inner = ch;
        break;
      }
    }
    if (!inner) return undefined;
    rhs = inner;
  }

  // RHS must be a binary_expression with << operator
  if (rhs.type !== 'binary_expression') return undefined;
  const shiftOp = rhs.childForFieldName('operator');
  if (!shiftOp || shiftOp.type !== '<<') return undefined;

  const shiftLeft  = rhs.childForFieldName('left');
  const shiftRight = rhs.childForFieldName('right');

  // Left of << must be a numeric literal: 1, 1LL, 2, 2LL, etc.
  // Tree-sitter parses `1LL` as number_literal with text "1LL".
  // Identifiers like `k`, `mask` must be rejected here.
  if (!shiftLeft || shiftLeft.type !== 'number_literal') return undefined;

  // Right of << must be a plain identifier (the exponent variable)
  if (!shiftRight || shiftRight.type !== 'identifier') return undefined;

  return shiftRight.text;
}

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

// ─── D3.2: Path Halving Helper ───────────────────────────────────────────────

/**
 * Safely identifies DSU iterative path halving assignments.
 * Matches ANY assignment in the loop body of the form:
 *   parent[x] = parent[parent[x]]
 * All 3 array identifiers must match, and the innermost index must match the LHS index.
 */
function getSubscriptParts(node: SyntaxNode) {
  if (node.type !== 'subscript_expression') return null;
  const arrayNode = node.childForFieldName('argument');
  const indicesNode = node.childForFieldName('indices');
  if (!arrayNode || !indicesNode || arrayNode.type !== 'identifier') return null;
  
  let indexNode: SyntaxNode | null = null;
  for (let i = 0; i < indicesNode.childCount; i++) {
    const c = indicesNode.child(i);
    if (c && c.type !== '[' && c.type !== ']') {
      indexNode = c;
      break;
    }
  }
  return { arrayNode, indexNode };
}

function isPathHalvingBody(bodyNode: SyntaxNode): boolean {
  const assignments = bodyNode.descendantsOfType('assignment_expression');
  for (const assign of assignments) {
    const lhs = assign.childForFieldName('left');
    let rhs = assign.childForFieldName('right');
    
    if (!lhs || !rhs) continue;

    while (rhs.type === 'parenthesized_expression') {
      let inner: SyntaxNode | null = null;
      for (let i = 0; i < rhs.childCount; i++) {
        const ch = rhs.child(i);
        if (ch && ch.type !== '(' && ch.type !== ')') {
          inner = ch;
          break;
        }
      }
      if (!inner) break;
      rhs = inner;
    }
    
    const lhsParts = getSubscriptParts(lhs);
    const rhsParts = getSubscriptParts(rhs);
    
    if (!lhsParts || !rhsParts) continue;
    if (!lhsParts.indexNode || !rhsParts.indexNode) continue;
    
    if (rhsParts.arrayNode.text !== lhsParts.arrayNode.text) continue;
    
    const rhsInnerParts = getSubscriptParts(rhsParts.indexNode);
    if (!rhsInnerParts || !rhsInnerParts.indexNode) continue;
    
    if (rhsInnerParts.arrayNode.text !== lhsParts.arrayNode.text) continue;
    
    if (rhsInnerParts.indexNode.text === lhsParts.indexNode.text) {
      return true;
    }
  }
  return false;
}

// ─── D4.5: Sparse Table Outer Loop Fingerprint ───────────────────────────────────────────

/**
 * Returns true when the for-loop condition is a sparse-table-style shift guard:
 *
 *   (1 << j) <= n
 *
 * This is structurally unique: the power-of-two expression is on the LEFT of `<=`
 * and the bound identifier is on the RIGHT.  It is the exact opposite of the D3.1
 * bitmask pattern (`mask < (1 << n)`) and is mutually exclusive with it by operator.
 *
 * Required structure (ALL seven must hold):
 *
 *   1. conditionNode is binary_expression
 *   2. outer operator is `<=`  (NOT `<` — that is D3.1's domain)
 *   3. right operand of `<=` is an identifier  (the upper-bound variable, e.g. n)
 *   4. left operand of `<=`, after optional single-level parenthesis unwrap, is
 *      a binary_expression
 *   5. inner operator is `<<`
 *   6. left of `<<` is number_literal  (the power-of-two base; typically 1)
 *   7. right of `<<` is identifier      (the exponent / loop variable, e.g. j)
 *
 * Guarantees:
 *   - No name-based heuristics. No string matching. No regex.
 *   - Returns false for any non-conforming structure — all existing classifications
 *     are preserved.
 *   - Mutually exclusive with extractBitmaskVar() which requires outer op `<`
 *     with shift on the RHS. D4.5 requires outer op `<=` with shift on the LHS.
 */
export function isSparseTableOuterLoop(conditionNode: SyntaxNode | null): boolean {
  if (!conditionNode || conditionNode.type !== 'binary_expression') return false;

  // Condition 2: outer operator must be `<=`
  const outerOp = conditionNode.childForFieldName('operator');
  if (!outerOp || outerOp.type !== '<=') return false;

  // Condition 3: right operand must be an identifier (bound variable, e.g. n)
  const outerRight = conditionNode.childForFieldName('right');
  if (!outerRight || outerRight.type !== 'identifier') return false;

  // Conditions 4–7: left operand, unwrap one optional level of parentheses
  let outerLeft = conditionNode.childForFieldName('left');
  if (!outerLeft) return false;
  if (outerLeft.type === 'parenthesized_expression') {
    // Unwrap: (1 << j) → the inner binary_expression
    let inner: SyntaxNode | null = null;
    for (let i = 0; i < outerLeft.childCount; i++) {
      const ch = outerLeft.child(i);
      if (ch && ch.type !== '(' && ch.type !== ')') { inner = ch; break; }
    }
    if (!inner) return false;
    outerLeft = inner;
  }

  // Condition 4: after unwrap, must be a binary_expression
  if (outerLeft.type !== 'binary_expression') return false;

  // Condition 5: inner operator must be `<<`
  const shiftOp = outerLeft.childForFieldName('operator');
  if (!shiftOp || shiftOp.type !== '<<') return false;

  // Condition 6: left of `<<` must be a number_literal (e.g. 1, 1LL, 2)
  const shiftLeft = outerLeft.childForFieldName('left');
  if (!shiftLeft || shiftLeft.type !== 'number_literal') return false;

  // Condition 7: right of `<<` must be an identifier (the loop / exponent variable)
  const shiftRight = outerLeft.childForFieldName('right');
  if (!shiftRight || shiftRight.type !== 'identifier') return false;

  return true;
}

export function containsIdentifier(node: import('web-tree-sitter').SyntaxNode, name: string): boolean {
  if (node.type === 'identifier' && node.text === name) return true;
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child && containsIdentifier(child, name)) return true;
  }
  return false;
}
