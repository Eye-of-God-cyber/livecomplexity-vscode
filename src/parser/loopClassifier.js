"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STL_MEMBER_REGISTRY = exports.STL_REGISTRY = void 0;
exports.classifyLoop = classifyLoop;
exports.extractBitmaskVar = extractBitmaskVar;
exports.isCallExpressionCondition = isCallExpressionCondition;
exports.classifyMacroString = classifyMacroString;
exports.isSparseTableOuterLoop = isSparseTableOuterLoop;
exports.STL_REGISTRY = {
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
exports.STL_MEMBER_REGISTRY = {
    // ─── set — O(log n) ────────────────────────────────────────────────────────
    'set::insert': 'logarithmic',
    'set::erase': 'logarithmic',
    'set::find': 'logarithmic',
    'set::count': 'logarithmic',
    'set::lower_bound': 'logarithmic',
    'set::upper_bound': 'logarithmic',
    'set::contains': 'logarithmic', // C++20
    // ─── multiset — O(log n) ───────────────────────────────────────────────────
    'multiset::insert': 'logarithmic',
    'multiset::erase': 'logarithmic',
    'multiset::find': 'logarithmic',
    'multiset::count': 'logarithmic',
    'multiset::contains': 'logarithmic', // C++20
    // ─── map — O(log n) ────────────────────────────────────────────────────────
    'map::insert': 'logarithmic',
    'map::erase': 'logarithmic',
    'map::find': 'logarithmic',
    'map::count': 'logarithmic',
    'map::lower_bound': 'logarithmic',
    'map::upper_bound': 'logarithmic',
    'map::contains': 'logarithmic', // C++20
    // ─── multimap — O(log n) ───────────────────────────────────────────────────
    'multimap::insert': 'logarithmic',
    'multimap::erase': 'logarithmic',
    'multimap::find': 'logarithmic',
    'multimap::count': 'logarithmic',
    // ─── priority_queue — O(log n) push/pop/emplace; O(1) top ─────────────────
    'priority_queue::push': 'logarithmic',
    'priority_queue::pop': 'logarithmic',
    'priority_queue::emplace': 'logarithmic', // C++ emplace — same cost as push
    'priority_queue::top': 'constant', // peek at max/min element — O(1)
    // ─── queue — O(1); listed explicitly so push/pop are never misclassified ───
    'queue::push': 'constant',
    'queue::pop': 'constant',
    'queue::front': 'constant',
    'queue::back': 'constant',
    // ─── stack — O(1) ──────────────────────────────────────────────────────────
    'stack::push': 'constant',
    'stack::pop': 'constant',
    'stack::top': 'constant',
    // ─── deque — O(1) amortized ────────────────────────────────────────────────
    'deque::push_back': 'constant',
    'deque::push_front': 'constant',
    'deque::pop_back': 'constant',
    'deque::pop_front': 'constant',
    // ─── vector — O(1) amortized ───────────────────────────────────────────────
    'vector::push_back': 'constant',
    'vector::pop_back': 'constant',
    // ─── unordered containers — O(1) avg (explicitly constant) ────────────────
    'unordered_set::insert': 'constant',
    'unordered_set::erase': 'constant',
    'unordered_set::find': 'constant',
    'unordered_set::contains': 'constant', // C++20
    'unordered_map::insert': 'constant',
    'unordered_map::erase': 'constant',
    'unordered_map::find': 'constant',
    'unordered_map::contains': 'constant', // C++20
};
/**
 * Classifies a loop's complexity behavior based on its AST node.
 */
function classifyLoop(node) {
    var _a, _b;
    var updateNode = null;
    var conditionNode = null;
    var initializerNode = null;
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
            updateNode = (_a = updateNode.child(0)) !== null && _a !== void 0 ? _a : updateNode;
        }
    }
    else if (node.type === 'while_statement' || node.type === 'do_statement') {
        conditionNode = node.childForFieldName('condition');
        // Tree-sitter wraps the while/do condition in a `condition_clause` node
        // (the parenthesized condition). Unwrap it to find the actual expression
        // by scanning children and skipping the '(' and ')' punctuation tokens.
        if (conditionNode && conditionNode.type === 'condition_clause') {
            for (var i = 0; i < conditionNode.childCount; i++) {
                var ch = conditionNode.child(i);
                if (ch && ch.type !== '(' && ch.type !== ')') {
                    conditionNode = ch;
                    break;
                }
            }
        }
    }
    // If there's no updateNode from a for-loop, try the body.
    if (!updateNode) {
        var bodyNode = node.childForFieldName('body');
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
        var left = conditionNode.childForFieldName('left');
        var right = conditionNode.childForFieldName('right');
        var op = conditionNode.childForFieldName('operator');
        if (op && (op.type === '<=' || op.type === '<')) {
            // Check left side for i * i
            if (left && left.type === 'binary_expression' && ((_b = left.childForFieldName('operator')) === null || _b === void 0 ? void 0 : _b.type) === '*') {
                var l1 = left.childForFieldName('left');
                var l2 = left.childForFieldName('right');
                if (l1 && l2 && l1.text === l2.text) {
                    return { classification: 'fractional', confidence: 'high' };
                }
            }
            // Check right side for sqrt(n)
            if (right && right.type === 'call_expression') {
                var fn = right.childForFieldName('function') || right.child(0);
                if (fn && fn.type === 'identifier' && fn.text === 'sqrt') {
                    return { classification: 'fractional', confidence: 'high' };
                }
            }
        }
    }
    // Detect binary-search convergence (while only): condition is var-op-var AND
    // body contains midpoint computation + boundary update using that midpoint.
    if (node.type === 'while_statement') {
        var bodyNode = node.childForFieldName('body');
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
    if (node.type === 'for_statement' &&
        updateNode !== null &&
        updateNode.type === 'update_expression' &&
        conditionNode !== null &&
        conditionNode.type === 'binary_expression') {
        var bitmaskVar = extractBitmaskVar(conditionNode);
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
    if (node.type === 'for_statement' &&
        updateNode !== null &&
        updateNode.type === 'update_expression' &&
        conditionNode !== null) {
        if (isSparseTableOuterLoop(conditionNode)) {
            return { classification: 'logarithmic', confidence: 'high', boundVar: getBoundVariable(conditionNode) };
        }
    }
    // ── D3.2: Iterative Path Halving ───────────────────────────────────────────
    // Detects loops like: while(parent[x] != x) { parent[x] = parent[parent[x]]; x = parent[x]; }
    // Looks for the exact structural path halving assignment in the loop body.
    if (node.type === 'while_statement') {
        var bodyNode = node.childForFieldName('body');
        if (bodyNode && isPathHalvingBody(bodyNode)) {
            return { classification: 'constant', confidence: 'medium' };
        }
    }
    var result = analyzeUpdatePattern(updateNode, conditionNode, initializerNode);
    if (result.classification === 'linear') {
        var boundVar = getBoundVariable(conditionNode);
        if (boundVar)
            result.boundVar = boundVar;
    }
    return result;
}
function getBoundVariable(conditionNode) {
    var _a;
    if (!conditionNode)
        return undefined;
    if (conditionNode.type === 'condition_clause') {
        for (var i = 0; i < conditionNode.childCount; i++) {
            var ch = conditionNode.child(i);
            if (ch && ch.type !== '(' && ch.type !== ')') {
                conditionNode = ch;
                break;
            }
        }
    }
    if (conditionNode.type === 'binary_expression') {
        var op = (_a = conditionNode.childForFieldName('operator')) === null || _a === void 0 ? void 0 : _a.type;
        if (op === '<' || op === '<=') {
            var right = conditionNode.childForFieldName('right');
            if (right && right.type === 'identifier')
                return right.text;
        }
    }
    return undefined;
}
function findBodyUpdate(bodyNode) {
    if (!bodyNode)
        return null;
    var updates = bodyNode.descendantsOfType(['update_expression', 'assignment_expression', 'math_assignment_expression']);
    if (updates.length > 0)
        return updates[updates.length - 1]; // Use last update as conservative guess, or just first.
    return null;
}
/**
 * Returns true when conditionNode looks like a binary-search guard:
 *   lo < hi   lo <= hi   lo > hi   lo >= hi
 * where both operands are identifiers (not literals).
 */
function isBinarySearchCondition(cond) {
    if (cond.type !== 'binary_expression')
        return false;
    var op = cond.childForFieldName('operator');
    if (!op || !['<', '<=', '>', '>='].includes(op.type))
        return false;
    var left = cond.childForFieldName('left');
    var right = cond.childForFieldName('right');
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
function hasMidpointUpdate(bodyNode) {
    if (!bodyNode)
        return false;
    // Step 1: find midpoint name from init_declarator (int mid = …/…) or assignment_expression (mid = …/…)
    var midpointName = null;
    // Check init_declarator: `int mid = (lo+hi)/2`
    var initDecls = bodyNode.descendantsOfType('init_declarator');
    for (var _i = 0, initDecls_1 = initDecls; _i < initDecls_1.length; _i++) {
        var decl = initDecls_1[_i];
        var value = decl.childForFieldName('value');
        if (value && containsDivision(value)) {
            var name_1 = decl.childForFieldName('declarator');
            if (name_1 && name_1.type === 'identifier') {
                midpointName = name_1.text;
                break;
            }
        }
    }
    // Fallback: check assignment_expression: `mid = (lo+hi)/2`
    if (!midpointName) {
        var assignments = bodyNode.descendantsOfType('assignment_expression');
        for (var _a = 0, assignments_1 = assignments; _a < assignments_1.length; _a++) {
            var asgn = assignments_1[_a];
            var rhs = asgn.childForFieldName('right');
            if (rhs && containsDivision(rhs)) {
                var lhs = asgn.childForFieldName('left');
                if (lhs && lhs.type === 'identifier') {
                    midpointName = lhs.text;
                    break;
                }
            }
        }
    }
    if (!midpointName)
        return false;
    // Step 2: verify at least one assignment uses midpoint on its RHS (boundary narrowing)
    var allAssigns = bodyNode.descendantsOfType('assignment_expression');
    for (var _b = 0, allAssigns_1 = allAssigns; _b < allAssigns_1.length; _b++) {
        var asgn = allAssigns_1[_b];
        var lhs = asgn.childForFieldName('left');
        if (lhs && lhs.text === midpointName)
            continue; // skip the midpoint declaration itself
        var rhs = asgn.childForFieldName('right');
        if (rhs && rhs.text.includes(midpointName))
            return true;
    }
    return false;
}
/** Returns true when node is or contains a top-level division expression. */
function containsDivision(node) {
    var _a;
    if (node.type === 'binary_expression') {
        var op = node.childForFieldName('operator');
        if (op && op.type === '/')
            return true;
    }
    // Handle parenthesized: (lo+hi)/2
    if (node.type === 'parenthesized_expression') {
        var inner = (_a = node.child(1)) !== null && _a !== void 0 ? _a : node.child(0);
        if (inner)
            return containsDivision(inner);
    }
    return false;
}
/**
 * Returns true when the body contains a modulo assignment (b = a % b  or  a %= b).
 * Used for Euclidean GCD detection.
 * Searches both init_declarator (int t = a % b) and assignment_expression (b = a % b).
 */
function hasModuloAssignment(bodyNode) {
    var _a, _b;
    if (!bodyNode)
        return false;
    // Check math_assignment_expression with %=
    var mathAssigns = bodyNode.descendantsOfType('math_assignment_expression');
    for (var _i = 0, mathAssigns_1 = mathAssigns; _i < mathAssigns_1.length; _i++) {
        var a = mathAssigns_1[_i];
        if (a.text.includes('%='))
            return true;
    }
    // Check plain assignment where RHS contains binary % expression
    var assigns = bodyNode.descendantsOfType('assignment_expression');
    for (var _c = 0, assigns_1 = assigns; _c < assigns_1.length; _c++) {
        var a = assigns_1[_c];
        var rhs = a.childForFieldName('right');
        if (rhs && rhs.type === 'binary_expression' && ((_a = rhs.childForFieldName('operator')) === null || _a === void 0 ? void 0 : _a.type) === '%')
            return true;
    }
    // Check init_declarator where value contains binary % expression (e.g. int t = a % b)
    var initDecls = bodyNode.descendantsOfType('init_declarator');
    for (var _d = 0, initDecls_2 = initDecls; _d < initDecls_2.length; _d++) {
        var decl = initDecls_2[_d];
        var value = decl.childForFieldName('value');
        if (value && value.type === 'binary_expression' && ((_b = value.childForFieldName('operator')) === null || _b === void 0 ? void 0 : _b.type) === '%')
            return true;
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
function isFenwickLowbitUpdate(updateNode) {
    if (updateNode.type !== 'assignment_expression' && updateNode.type !== 'math_assignment_expression')
        return false;
    var operatorNode = updateNode.childForFieldName('operator') ||
        updateNode.children.find(function (c) { return c.type === '+=' || c.type === '-='; });
    if (!operatorNode || (operatorNode.type !== '+=' && operatorNode.type !== '-='))
        return false;
    // Extract the loop-variable name from the LHS.
    var lhs = updateNode.childForFieldName('left');
    if (!lhs || lhs.type !== 'identifier')
        return false;
    var updateVarName = lhs.text;
    var rhs = updateNode.childForFieldName('right');
    if (!rhs || rhs.type !== 'binary_expression')
        return false;
    var rhsOp = rhs.childForFieldName('operator');
    if (!rhsOp || rhsOp.type !== '&')
        return false;
    var rhsLeft = rhs.childForFieldName('left');
    var rhsRight = rhs.childForFieldName('right');
    // Pattern: updateVar & (-updateVar)
    //   rhsLeft  = identifier(updateVar)
    //   rhsRight = unary_negation wrapping identifier(updateVar)
    var leftIsVar = rhsLeft && rhsLeft.type === 'identifier' && rhsLeft.text === updateVarName;
    var rightIsNeg = rhsRight && isNegationOf(rhsRight, updateVarName);
    if (leftIsVar && rightIsNeg)
        return true;
    // Pattern: (-updateVar) & updateVar
    var rightIsVar = rhsRight && rhsRight.type === 'identifier' && rhsRight.text === updateVarName;
    var leftIsNeg = rhsLeft && isNegationOf(rhsLeft, updateVarName);
    if (rightIsVar && leftIsNeg)
        return true;
    return false;
}
/**
 * Returns true when node is a unary negation of the given identifier,
 * possibly wrapped in parentheses: (-varName) or -(varName).
 */
function isNegationOf(node, varName) {
    if (node.type === 'unary_expression') {
        var op = node.childForFieldName('operator') || node.child(0);
        if (!op || op.type !== '-')
            return false;
        var operand = node.childForFieldName('argument') || node.child(1);
        if (!operand)
            return false;
        if (operand.type === 'identifier')
            return operand.text === varName;
        if (operand.type === 'parenthesized_expression') {
            // -(varName)
            for (var c = 0; c < operand.childCount; c++) {
                var ch = operand.child(c);
                if (ch && ch.type === 'identifier' && ch.text === varName)
                    return true;
            }
        }
        return false;
    }
    if (node.type === 'parenthesized_expression') {
        // (-varName) — parenthesized unary
        for (var c = 0; c < node.childCount; c++) {
            var ch = node.child(c);
            if (ch && isNegationOf(ch, varName))
                return true;
        }
    }
    return false;
}
function isSafeConstantExpression(node) {
    var _a, _b, _c;
    if (!node)
        return false;
    switch (node.type) {
        case 'number_literal':
        case 'sizeof_expression':
            return true;
        case 'parenthesized_expression':
            return isSafeConstantExpression((_a = node.child(1)) !== null && _a !== void 0 ? _a : node.child(0));
        case 'unary_expression': {
            var op = (_b = node.childForFieldName('operator')) === null || _b === void 0 ? void 0 : _b.type;
            if (op === '+' || op === '-') {
                return isSafeConstantExpression(node.childForFieldName('argument'));
            }
            return false;
        }
        case 'binary_expression': {
            var op = (_c = node.childForFieldName('operator')) === null || _c === void 0 ? void 0 : _c.type;
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
function extractBitmaskVar(conditionNode) {
    if (conditionNode.type !== 'binary_expression')
        return undefined;
    // Condition operator must be < (mask < (1<<n))
    var condOp = conditionNode.childForFieldName('operator');
    if (!condOp || condOp.type !== '<')
        return undefined;
    var rhs = conditionNode.childForFieldName('right');
    if (!rhs)
        return undefined;
    // Unwrap all layers of parenthesized_expression: ((1 << n)) → (1 << n) → 1 << n
    while (rhs.type === 'parenthesized_expression') {
        var inner = null;
        for (var i = 0; i < rhs.childCount; i++) {
            var ch = rhs.child(i);
            if (ch && ch.type !== '(' && ch.type !== ')') {
                inner = ch;
                break;
            }
        }
        if (!inner)
            return undefined;
        rhs = inner;
    }
    // RHS must be a binary_expression with << operator
    if (rhs.type !== 'binary_expression')
        return undefined;
    var shiftOp = rhs.childForFieldName('operator');
    if (!shiftOp || shiftOp.type !== '<<')
        return undefined;
    var shiftLeft = rhs.childForFieldName('left');
    var shiftRight = rhs.childForFieldName('right');
    // Left of << must be a numeric literal: 1, 1LL, 2, 2LL, etc.
    // Tree-sitter parses `1LL` as number_literal with text "1LL".
    // Identifiers like `k`, `mask` must be rejected here.
    if (!shiftLeft || shiftLeft.type !== 'number_literal')
        return undefined;
    // Right of << must be a plain identifier (the exponent variable)
    if (!shiftRight || shiftRight.type !== 'identifier')
        return undefined;
    return shiftRight.text;
}
function hasConstantInitializer(initializerNode) {
    if (!initializerNode)
        return false;
    var initDeclarator = initializerNode.descendantsOfType('init_declarator')[0];
    if (initDeclarator) {
        var value = initDeclarator.childForFieldName('value');
        if (value && isSafeConstantExpression(value))
            return true;
    }
    var assignmentExpr = initializerNode.descendantsOfType('assignment_expression')[0];
    if (assignmentExpr) {
        var right = assignmentExpr.childForFieldName('right');
        if (right && isSafeConstantExpression(right))
            return true;
    }
    return false;
}
function analyzeUpdatePattern(updateNode, conditionNode, initializerNode) {
    var _a;
    if (updateNode.type === 'update_expression') {
        if (conditionNode && conditionNode.type === 'binary_expression') {
            var rightNode = conditionNode.childForFieldName('right');
            var leftNode = conditionNode.childForFieldName('left');
            var hasConstantBound = isSafeConstantExpression(rightNode) || isSafeConstantExpression(leftNode);
            if (hasConstantBound && hasConstantInitializer(initializerNode)) {
                return { classification: 'constant', confidence: 'high' };
            }
        }
        return { classification: 'linear', confidence: 'high' };
    }
    if (updateNode.type === 'assignment_expression' || updateNode.type === 'math_assignment_expression') {
        var operatorNode = updateNode.childForFieldName('operator') || updateNode.children.find(function (c) { return c.type === '+=' || c.type === '-=' || c.type === '*=' || c.type === '/='; });
        var operator = operatorNode ? operatorNode.type : null;
        if (!operator || operator === '=') {
            var text = updateNode.text;
            if (text.includes('*=') || text.includes('<<=') || text.includes('>>='))
                return { classification: 'logarithmic', confidence: 'high' };
            // Task 3: /= in text fallback — only log if RHS looks like a literal
            if (text.includes('/=')) {
                var rhs_1 = updateNode.childForFieldName('right');
                if (rhs_1 && rhs_1.type === 'number_literal' && Number(rhs_1.text) > 1)
                    return { classification: 'logarithmic', confidence: 'high' };
                return { classification: 'linear', confidence: 'medium' };
            }
            if (text.includes('+=') || text.includes('-='))
                return { classification: 'linear', confidence: 'medium' };
            // Normal assignment `i = i + 1` or `x = x / 2`
            if (text.includes('/')) {
                // Only classify as logarithmic if the RHS of the assignment is a division by a constant > 1
                var rhs_2 = updateNode.childForFieldName('right');
                if (rhs_2 && rhs_2.type === 'binary_expression' && ((_a = rhs_2.childForFieldName('operator')) === null || _a === void 0 ? void 0 : _a.type) === '/') {
                    var divRhs = rhs_2.childForFieldName('right');
                    if (divRhs && divRhs.type === 'number_literal' && Number(divRhs.text) > 1) {
                        // Only classify as logarithmic if the LHS variable participates in the numerator
                        var lhsNode = updateNode.childForFieldName('left');
                        var divLhsNode = rhs_2.childForFieldName('left');
                        if (lhsNode && divLhsNode && divLhsNode.text.includes(lhsNode.text)) {
                            return { classification: 'logarithmic', confidence: 'low' };
                        }
                    }
                }
                return { classification: 'unknown', confidence: 'low' };
            }
            if (text.includes('*'))
                return { classification: 'logarithmic', confidence: 'low' };
            // Pointer or field traversal: e.g. x = x->next or x = x.child
            var rhs = updateNode.childForFieldName('right');
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
            var rhs = updateNode.childForFieldName('right');
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
function isCallExpressionCondition(cond) {
    if (cond.type === 'call_expression')
        return true;
    // while(!q.empty())
    if (cond.type === 'unary_expression') {
        var op = cond.childForFieldName('operator') || cond.child(0);
        if (op && op.type === '!') {
            var operand = cond.childForFieldName('argument') || cond.child(1);
            if (operand && (operand.type === 'call_expression' || operand.type === 'parenthesized_expression'))
                return true;
        }
    }
    return false;
}
/**
 * Fallback classifier for raw macro strings where we lack a parsed AST body.
 */
function classifyMacroString(macroText) {
    var text = macroText.replace(/\s+/g, ''); // strip whitespace for easier regex
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
function isPathHalvingBody(bodyNode) {
    var _a;
    var assignments = bodyNode.descendantsOfType('assignment_expression');
    for (var _i = 0, assignments_2 = assignments; _i < assignments_2.length; _i++) {
        var assign = assignments_2[_i];
        var leftText = (_a = assign.childForFieldName('left')) === null || _a === void 0 ? void 0 : _a.text.replace(/\s+/g, '');
        var rightNode = assign.childForFieldName('right');
        // Unwrap parenthesis if any
        while (rightNode && rightNode.type === 'parenthesized_expression') {
            var inner = null;
            for (var i = 0; i < rightNode.childCount; i++) {
                var ch = rightNode.child(i);
                if (ch && ch.type !== '(' && ch.type !== ')') {
                    inner = ch;
                    break;
                }
            }
            if (!inner)
                break;
            rightNode = inner;
        }
        var rightText = rightNode === null || rightNode === void 0 ? void 0 : rightNode.text.replace(/\s+/g, '');
        if (leftText && rightText) {
            // Find array A and index B from A[B]
            var match = leftText.match(/^([a-zA-Z0-9_]+)\[(.*)\]$/);
            if (match) {
                var A = match[1];
                var B = match[2];
                var expectedRight = "".concat(A, "[").concat(A, "[").concat(B, "]]");
                if (rightText === expectedRight)
                    return true;
            }
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
function isSparseTableOuterLoop(conditionNode) {
    if (!conditionNode || conditionNode.type !== 'binary_expression')
        return false;
    // Condition 2: outer operator must be `<=`
    var outerOp = conditionNode.childForFieldName('operator');
    if (!outerOp || outerOp.type !== '<=')
        return false;
    // Condition 3: right operand must be an identifier (bound variable, e.g. n)
    var outerRight = conditionNode.childForFieldName('right');
    if (!outerRight || outerRight.type !== 'identifier')
        return false;
    // Conditions 4–7: left operand, unwrap one optional level of parentheses
    var outerLeft = conditionNode.childForFieldName('left');
    if (!outerLeft)
        return false;
    if (outerLeft.type === 'parenthesized_expression') {
        // Unwrap: (1 << j) → the inner binary_expression
        var inner = null;
        for (var i = 0; i < outerLeft.childCount; i++) {
            var ch = outerLeft.child(i);
            if (ch && ch.type !== '(' && ch.type !== ')') {
                inner = ch;
                break;
            }
        }
        if (!inner)
            return false;
        outerLeft = inner;
    }
    // Condition 4: after unwrap, must be a binary_expression
    if (outerLeft.type !== 'binary_expression')
        return false;
    // Condition 5: inner operator must be `<<`
    var shiftOp = outerLeft.childForFieldName('operator');
    if (!shiftOp || shiftOp.type !== '<<')
        return false;
    // Condition 6: left of `<<` must be a number_literal (e.g. 1, 1LL, 2)
    var shiftLeft = outerLeft.childForFieldName('left');
    if (!shiftLeft || shiftLeft.type !== 'number_literal')
        return false;
    // Condition 7: right of `<<` must be an identifier (the loop / exponent variable)
    var shiftRight = outerLeft.childForFieldName('right');
    if (!shiftRight || shiftRight.type !== 'identifier')
        return false;
    return true;
}
