"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildMacroRegistry = buildMacroRegistry;
exports.extractStructure = extractStructure;
exports.extractFunctionLoops = extractFunctionLoops;
exports.getForIteratorVar = getForIteratorVar;
exports.isAmortizedInner = isAmortizedInner;
exports.isStepDependentOn = isStepDependentOn;
exports.extractFunctionName = extractFunctionName;
var loopClassifier_1 = require("./loopClassifier");
var treeSitter_1 = require("./treeSitter");
var typeTracker_1 = require("./typeTracker");
/**
 * Extracts a dynamic registry of loop macros defined in the file.
 * Returns a map of macro identifier (e.g. 'fo') -> raw macro string (e.g. 'for(int i=0;i<n;i++)').
 */
function buildMacroRegistry(tree) {
    var registry = new Map();
    if (!tree || !tree.rootNode)
        return registry;
    var defs = tree.rootNode.descendantsOfType(['preproc_function_def', 'preproc_def']);
    for (var _i = 0, defs_1 = defs; _i < defs_1.length; _i++) {
        var def = defs_1[_i];
        var nameNode = findChildOfType(def, 'identifier');
        if (!nameNode)
            continue;
        // The body is usually the last child, often parsed as preproc_arg
        var argText = '';
        for (var i = 0; i < def.childCount; i++) {
            var child = def.child(i);
            if (child && child.type === 'preproc_arg') {
                argText = child.text.trim();
                break;
            }
        }
        // If no preproc_arg, fallback to looking for the last child's text if it looks like a loop
        if (!argText) {
            var lastChild = def.child(def.childCount - 1);
            if (lastChild) {
                argText = lastChild.text.trim();
            }
        }
        if (argText.startsWith('for') || argText.startsWith('while')) {
            var boundParamIndex = undefined;
            var paramsNode = def.childForFieldName('parameters');
            if (paramsNode) {
                var dummyCode = "void _dummy() { ".concat(argText, " {} }");
                var dummyTree = (0, treeSitter_1.parseOneOff)(dummyCode);
                var loopNode = dummyTree === null || dummyTree === void 0 ? void 0 : dummyTree.rootNode.descendantsOfType('for_statement')[0];
                if (loopNode) {
                    var result = (0, loopClassifier_1.classifyLoop)(loopNode);
                    if (result.boundVar) {
                        var paramIdx = 0;
                        for (var i = 0; i < paramsNode.childCount; i++) {
                            var p = paramsNode.child(i);
                            if (p && p.type === 'identifier') {
                                if (p.text === result.boundVar) {
                                    boundParamIndex = paramIdx;
                                    break;
                                }
                                paramIdx++;
                            }
                        }
                    }
                }
            }
            registry.set(nameNode.text, { bodyText: argText, boundParamIndex: boundParamIndex });
        }
    }
    return registry;
}
/**
 * Traverses the AST to find all function definitions, for-loops, and while-loops.
 * Note: tree-sitter lines are 0-indexed. This function returns 0-indexed line numbers.
 *
 * @param tree The parsed syntax tree
 * @param source The original source code (optional, used if node text extraction is needed)
 * @returns A structured result containing the found functions and loops.
 */
function extractStructure(tree) {
    var result = {
        functions: [],
        loops: []
    };
    if (!tree || !tree.rootNode) {
        return result;
    }
    var functions = tree.rootNode.descendantsOfType('function_definition');
    for (var _i = 0, functions_1 = functions; _i < functions_1.length; _i++) {
        var node = functions_1[_i];
        var declarator = findChildOfType(node, 'function_declarator');
        var name_1 = '<anonymous>';
        if (declarator) {
            var identifier = findChildOfType(declarator, 'identifier') || findChildOfType(declarator, 'field_identifier');
            if (identifier) {
                name_1 = identifier.text;
            }
        }
        result.functions.push({
            name: name_1,
            startLine: node.startPosition.row,
            endLine: node.endPosition.row
        });
    }
    var loopNodes = tree.rootNode.descendantsOfType([
        'for_statement',
        'for_range_loop',
        'while_statement',
        'do_statement'
    ]);
    var loopMap = new Map();
    var loopParentMap = new Map(); // maps node.id to parent loop node.id
    // First pass: create loop objects and find their loop parents
    for (var _a = 0, loopNodes_1 = loopNodes; _a < loopNodes_1.length; _a++) {
        var node = loopNodes_1[_a];
        var type = (node.type === 'for_statement' || node.type === 'for_range_loop') ? 'for' : 'while';
        var _b = (0, loopClassifier_1.classifyLoop)(node), classification = _b.classification, confidence = _b.confidence;
        var extractedLoop = {
            type: type,
            startLine: node.startPosition.row,
            endLine: node.endPosition.row,
            classification: classification,
            confidence: confidence,
            childLoops: []
        };
        loopMap.set(node.id, extractedLoop);
        // Find closest loop parent within the same function
        var parentLoopId = null;
        var current = node.parent;
        while (current) {
            if (current.type === 'for_statement' ||
                current.type === 'for_range_loop' ||
                current.type === 'while_statement' ||
                current.type === 'do_statement') {
                parentLoopId = current.id;
                break;
            }
            if (current.type === 'function_definition' || current.type === 'lambda_expression') {
                break;
            }
            current = current.parent;
        }
        loopParentMap.set(node.id, parentLoopId);
    }
    // Second pass: build the hierarchy
    for (var _c = 0, loopNodes_2 = loopNodes; _c < loopNodes_2.length; _c++) {
        var node = loopNodes_2[_c];
        var extractedLoop = loopMap.get(node.id);
        var parentLoopId = loopParentMap.get(node.id);
        if (parentLoopId != null) {
            var parentLoop = loopMap.get(parentLoopId);
            if (parentLoop) {
                parentLoop.childLoops.push(extractedLoop);
            }
            else {
                // Fallback (shouldn't happen)
                result.loops.push(extractedLoop);
            }
        }
        else {
            // Top-level loop
            result.loops.push(extractedLoop);
        }
    }
    return result;
}
/**
 * Helper to do a shallow search for a child of a specific type.
 */
function findChildOfType(node, type) {
    for (var i = 0; i < node.childCount; i++) {
        var child = node.child(i);
        if (child && child.type === type) {
            return child;
        }
        // If it's a wrapper node or reference declarator, we might need to dig deeper
        if (child && (child.type === 'reference_declarator' || child.type === 'pointer_declarator')) {
            var deeper = findChildOfType(child, type);
            if (deeper)
                return deeper;
        }
    }
    return null;
}
/**
 * Builds a hierarchical loop tree scoped to a single function definition AST node.
 * Loops inside nested lambda expressions are treated as separate scopes and
 * will NOT be owned by the enclosing function's loop hierarchy.
 *
 * @param fnNode The function_definition SyntaxNode to analyze.
 * @param macroRegistry An optional map of user-defined loop macros.
 * @param functionRegistry An optional map of pre-computed function complexities.
 * @returns Array of top-level ExtractedLoop nodes (each may contain childLoops).
 */
function extractFunctionLoops(fnNode, macroRegistry, functionRegistry, globalTypeContext) {
    var _a, _b;
    // Build a function-local TypeContext and merge with the global one.
    // Local declarations shadow global ones (local wins on conflict).
    var localTypeContext = (0, typeTracker_1.buildTypeContext)(fnNode);
    var typeContext = (0, typeTracker_1.mergeTypeContexts)(globalTypeContext, localTypeContext);
    // typeContext is used for STL member method interception (D2.1+).
    var LOOP_TYPES = ['for_statement', 'for_range_loop', 'while_statement', 'do_statement'];
    // We also intercept function_definition and call_expression to check against the macro registry.
    var searchTypes = __spreadArray(__spreadArray([], LOOP_TYPES, true), ['function_definition', 'call_expression', 'subscript_expression'], false);
    var loopNodes = fnNode.descendantsOfType(searchTypes);
    var loopMap = new Map();
    var loopParentMap = new Map();
    for (var _i = 0, loopNodes_3 = loopNodes; _i < loopNodes_3.length; _i++) {
        var node = loopNodes_3[_i];
        // FIX 1 — Lambda scope leak:
        // Skip any loop that lives inside a nested lambda or function_definition that
        // is NOT fnNode itself. Walk up until we find the nearest scope boundary;
        // if it is not fnNode, this loop belongs to an inner scope and must be ignored.
        var scopeAncestor = node.parent;
        while (scopeAncestor) {
            if (scopeAncestor.type === 'lambda_expression') {
                break;
            }
            if (scopeAncestor.type === 'function_definition') {
                var name_2 = extractFunctionNameOrCallIdentifier(scopeAncestor);
                if (!macroRegistry || !macroRegistry.has(name_2)) {
                    break;
                }
            }
            scopeAncestor = scopeAncestor.parent;
        }
        // If the nearest scope ancestor is not our function node, skip this loop.
        if (!scopeAncestor || scopeAncestor.id !== fnNode.id) {
            continue;
        }
        // Check if this node is a macro invocation, standalone STL call, member STL call, or user-defined call
        var isMacro = false;
        var isStl = false;
        var isStlMember = false;
        var isUserCall = false;
        var isMapOp = false;
        var name_3 = '';
        var stlName = '';
        var stlMemberClassification = 'constant';
        var mapOpClassification = 'constant';
        var userCallName = '';
        if (node.type === 'function_definition' || node.type === 'call_expression') {
            name_3 = extractFunctionNameOrCallIdentifier(node);
            if (macroRegistry && macroRegistry.has(name_3)) {
                isMacro = true;
            }
            else if (node.type === 'call_expression' && loopClassifier_1.STL_REGISTRY[name_3]) {
                isStl = true;
                stlName = name_3;
            }
            else if (node.type === 'call_expression' && functionRegistry && functionRegistry.has(name_3)) {
                isUserCall = true;
                userCallName = name_3;
            }
            else if (node.type === 'call_expression') {
                // ── D2.1: STL member method interception ──────────────────────────────
                // Fires when the call is a field_expression: `object.method(args)`
                var funcNode = node.childForFieldName('function');
                if (funcNode && funcNode.type === 'field_expression') {
                    var objectIdent = funcNode.childForFieldName('argument');
                    var fieldIdent = funcNode.childForFieldName('field');
                    if (objectIdent && fieldIdent) {
                        var resolvedType = typeContext.variables.get(objectIdent.text);
                        if (resolvedType) {
                            var key = "".concat(resolvedType, "::").concat(fieldIdent.text);
                            if (loopClassifier_1.STL_MEMBER_REGISTRY[key] !== undefined) {
                                isStlMember = true;
                                stlMemberClassification = loopClassifier_1.STL_MEMBER_REGISTRY[key];
                            }
                        }
                    }
                }
                if (!isStlMember) {
                    continue; // Not a registered macro, STL algorithm, member call, or known user call
                }
            }
            else {
                continue;
            }
        }
        else if (node.type === 'subscript_expression') {
            var arrName = (_a = node.childForFieldName('argument')) === null || _a === void 0 ? void 0 : _a.text;
            if (arrName) {
                var canonicalType = typeContext.variables.get(arrName);
                if (canonicalType === 'map') {
                    isMapOp = true;
                    mapOpClassification = 'logarithmic';
                }
                else if (canonicalType === 'unordered_map') {
                    isMapOp = true;
                    mapOpClassification = 'constant';
                }
            }
            if (!isMapOp)
                continue;
        }
        var type = (node.type === 'for_statement' || node.type === 'for_range_loop' || (isMacro)) ? 'for' : (isUserCall || isStl || isStlMember || isMapOp ? 'call' : 'while');
        var classification = void 0;
        var confidence = void 0;
        var customComplexity = void 0;
        var boundVar = void 0;
        if (isMacro) {
            var macroMeta = macroRegistry.get(name_3);
            var result = (0, loopClassifier_1.classifyMacroString)(macroMeta.bodyText);
            classification = result.classification;
            confidence = result.confidence;
            if (macroMeta.boundParamIndex !== undefined) {
                if (node.type === 'call_expression') {
                    var argsNode = node.childForFieldName('arguments');
                    if (argsNode) {
                        var argIdx = 0;
                        for (var i = 0; i < argsNode.childCount; i++) {
                            var p = argsNode.child(i);
                            if (p && p.type !== '(' && p.type !== ')' && p.type !== ',') {
                                if (argIdx === macroMeta.boundParamIndex) {
                                    if (p.type === 'identifier') {
                                        boundVar = p.text;
                                    }
                                    break;
                                }
                                argIdx++;
                            }
                        }
                    }
                }
                else if (node.type === 'function_definition') {
                    var decl = node.childForFieldName('declarator');
                    if (decl) {
                        var params = decl.childForFieldName('parameters');
                        if (params) {
                            var argIdx = 0;
                            for (var i = 0; i < params.childCount; i++) {
                                var p = params.child(i);
                                if (p && p.type !== '(' && p.type !== ')' && p.type !== ',') {
                                    if (argIdx === macroMeta.boundParamIndex) {
                                        boundVar = p.text;
                                        break;
                                    }
                                    argIdx++;
                                }
                            }
                        }
                    }
                }
            }
        }
        else if (isStl) {
            classification = loopClassifier_1.STL_REGISTRY[stlName];
            confidence = 'high';
        }
        else if (isStlMember) {
            classification = stlMemberClassification;
            confidence = 'medium';
        }
        else if (isMapOp) {
            classification = mapOpClassification;
            confidence = 'high';
        }
        else if (isUserCall) {
            classification = 'custom';
            confidence = 'high';
            customComplexity = functionRegistry.get(userCallName);
        }
        else {
            var result = (0, loopClassifier_1.classifyLoop)(node);
            classification = result.classification;
            confidence = result.confidence;
            boundVar = result.boundVar;
            // ── D2.2: Graph traversal upgrade ─────────────────────────────────────
            // After normal classification, check if this while_statement is actually
            // a BFS/DFS graph traversal. All four conditions must hold simultaneously:
            //   1. while_statement
            //   2. condition = !container.empty()
            //   3. container type ∈ {queue, stack, deque}  (via TypeContext)
            //   4. body contains a for_range_loop  (adjacency-list iteration)
            // Any failure → silently keep the existing classification.
            if (node.type === 'while_statement' && isGraphTraversalWhile(node, typeContext)) {
                classification = 'graph_traversal';
                confidence = 'medium';
            }
            else if (node.type === 'while_statement' && isDijkstraWhile(node, typeContext)) {
                // ── D2.3: Priority-queue graph traversal (Dijkstra / Prim) ────────────────
                // Container must be priority_queue (not queue/stack/deque).
                // Produces O((V+E) log V), not O(V+E).
                // The two checks are mutually exclusive by the container type guard.
                classification = 'graph_log_traversal';
                confidence = 'medium';
            }
        }
        // Extract the iterator variable for 'for' loops so the inference engine
        // can detect step-dependent (harmonic) relationships with child loops.
        var iteratorVar = void 0;
        if (!isMacro && !isStl && !isStlMember && !isUserCall && node.type === 'for_statement') {
            iteratorVar = (_b = getForIteratorVar(node)) !== null && _b !== void 0 ? _b : undefined;
        }
        var extractedLoop = {
            type: type,
            startLine: node.startPosition.row,
            endLine: node.endPosition.row,
            classification: classification,
            confidence: confidence,
            childLoops: [],
            customComplexity: customComplexity,
            iteratorVar: iteratorVar,
            boundVar: boundVar,
        };
        loopMap.set(node.id, extractedLoop);
        // Walk up to find the nearest enclosing loop within the same function scope
        var parentLoopId = null;
        var current = node.parent;
        while (current) {
            if (current.type === 'for_statement' ||
                current.type === 'for_range_loop' ||
                current.type === 'while_statement' ||
                current.type === 'do_statement') {
                parentLoopId = current.id;
                break;
            }
            if (current.type === 'function_definition' || current.type === 'call_expression') {
                var name_4 = extractFunctionNameOrCallIdentifier(current);
                if (macroRegistry && macroRegistry.has(name_4)) {
                    parentLoopId = current.id;
                    break;
                }
                if (current.type === 'call_expression' && loopClassifier_1.STL_REGISTRY[name_4]) {
                    parentLoopId = current.id;
                    break;
                }
                if (current.type === 'call_expression' && isRegisteredStlMember(current, typeContext)) {
                    parentLoopId = current.id;
                    break;
                }
                if (current.type === 'call_expression' && functionRegistry && functionRegistry.has(name_4)) {
                    parentLoopId = current.id;
                    break;
                }
            }
            if (current.type === 'function_definition' || current.type === 'lambda_expression') {
                break;
            }
            current = current.parent;
        }
        loopParentMap.set(node.id, parentLoopId);
    }
    // Second pass: wire childLoops.
    // Build a node-id → AST-node map from loopNodes for O(1) lookups.
    var astNodeMap = new Map();
    for (var _c = 0, loopNodes_4 = loopNodes; _c < loopNodes_4.length; _c++) {
        var node = loopNodes_4[_c];
        astNodeMap.set(node.id, node);
    }
    // Iterate only the nodes that passed the scope check (present in loopMap).
    var topLevelLoops = [];
    for (var _d = 0, loopMap_1 = loopMap; _d < loopMap_1.length; _d++) {
        var _e = loopMap_1[_d], nodeId = _e[0], extractedLoop = _e[1];
        var parentLoopId = loopParentMap.get(nodeId);
        if (parentLoopId != null) {
            var parentLoop = loopMap.get(parentLoopId);
            if (parentLoop) {
                var childAstNode = astNodeMap.get(nodeId);
                var parentAstNode = astNodeMap.get(parentLoopId);
                // ── Harmonic (step-dependent) check ──────────────────────────────
                if (parentLoop.iteratorVar && (childAstNode === null || childAstNode === void 0 ? void 0 : childAstNode.type) === 'for_statement') {
                    if (isStepDependentOn(childAstNode, parentLoop.iteratorVar)) {
                        extractedLoop.stepDependentOn = parentLoop.iteratorVar;
                    }
                }
                // ── Amortized check ───────────────────────────────────────────────
                // Only run when not already classified as step-dependent, and only
                // when the child is a while/do-while inside a for loop parent.
                if (!extractedLoop.stepDependentOn &&
                    childAstNode &&
                    (childAstNode.type === 'while_statement' || childAstNode.type === 'do_statement') &&
                    (parentAstNode === null || parentAstNode === void 0 ? void 0 : parentAstNode.type) === 'for_statement') {
                    if (isAmortizedInner(childAstNode, parentAstNode)) {
                        extractedLoop.isAmortized = true;
                    }
                }
                parentLoop.childLoops.push(extractedLoop);
            }
            else {
                // Parent was skipped (inside a lambda) — treat this as top-level
                topLevelLoops.push(extractedLoop);
            }
        }
        else {
            topLevelLoops.push(extractedLoop);
        }
    }
    return topLevelLoops;
}
/**
 * Extracts the iteration variable name from a for_statement initializer.
 * Handles both `for(int i=0;...)` (init_declarator) and `for(i=0;...)` (assignment_expression).
 * Returns null if the variable cannot be determined.
 */
function getForIteratorVar(forNode) {
    var init = forNode.childForFieldName('initializer');
    if (!init)
        return null;
    // `for(int i = 0; ...)` — init_declarator
    var decl = init.descendantsOfType('init_declarator')[0];
    if (decl) {
        var declarator = decl.childForFieldName('declarator');
        if (declarator && declarator.type === 'identifier')
            return declarator.text;
    }
    // `for(i = 0; ...)` — plain assignment_expression
    var assign = init.descendantsOfType('assignment_expression')[0];
    if (assign) {
        var lhs = assign.childForFieldName('left');
        if (lhs && lhs.type === 'identifier')
            return lhs.text;
    }
    return null;
}
/**
 * Returns true when an inner while/do-while loop is amortized relative to
 * its parent for loop. Two precise structural patterns are detected:
 *
 * Pattern A — Two-pointer:
 *   The inner while mutates a variable `v` that appears in the inner condition,
 *   AND the inner condition also references the outer for loop's iteration variable.
 *   e.g.  for(int r=0; r<n; r++) { while(l < r) l++; }
 *         mutated=l, inner-cond references outer-iter r → amortized
 *
 * Pattern B — Trial division:
 *   The inner while mutates a variable `v` that appears in the inner condition,
 *   AND that same `v` also appears in the outer for loop's condition.
 *   e.g.  for(int i=2; i*i<=n; i++) { while(n%i==0) n/=i; }
 *         mutated=n, inner-cond n%i==0 contains n, outer-cond i*i<=n contains n → amortized
 *
 * Monotonic mutations accepted:
 *   v++  v--  v+=literal  v-=literal  v/=anything
 *
 * False-positive guards:
 *   - Mutated var must appear in inner condition (prevents y++ when cond is unrelated).
 *   - Inner condition must reference either the outer iterator (A) or outer-cond var (B).
 *   - Only activates when parent is a for_statement (not a while nesting another while).
 */
function isAmortizedInner(innerNode, parentForNode) {
    // ── 1. Find the monotonic mutation variable in the inner body ─────────────
    var bodyNode = innerNode.childForFieldName('body');
    if (!bodyNode)
        return false;
    var mutatedVar = null;
    var bodyUpdates = bodyNode.descendantsOfType([
        'update_expression', 'assignment_expression', 'math_assignment_expression'
    ]);
    for (var _i = 0, bodyUpdates_1 = bodyUpdates; _i < bodyUpdates_1.length; _i++) {
        var update = bodyUpdates_1[_i];
        if (update.type === 'update_expression') {
            // v++ or v-- : find any identifier child
            for (var ci = 0; ci < update.childCount; ci++) {
                var ch = update.child(ci);
                if (ch && ch.type === 'identifier') {
                    mutatedVar = ch.text;
                    break;
                }
            }
        }
        else {
            // assignment_expression or math_assignment_expression
            var opNode = update.childForFieldName('operator') ||
                update.children.find(function (c) { return c.type === '+=' || c.type === '-=' || c.type === '/='; });
            if (!opNode)
                continue;
            var op = opNode.type;
            var lhs = update.childForFieldName('left');
            if (!lhs || lhs.type !== 'identifier')
                continue;
            if (op === '+=' || op === '-=') {
                // Only accept literal step to guarantee strict monotonicity
                var rhs = update.childForFieldName('right');
                if (rhs && rhs.type === 'number_literal' && Number(rhs.text) > 0) {
                    mutatedVar = lhs.text;
                }
            }
            else if (op === '/=') {
                // Division always reduces n (any divisor > 1 implied by context)
                mutatedVar = lhs.text;
            }
        }
        if (mutatedVar)
            break;
    }
    if (!mutatedVar)
        return false;
    // ── 2. Mutated variable must appear in inner condition ────────────────────
    var innerCond = innerNode.childForFieldName('condition');
    if (!innerCond)
        return false;
    // Unwrap condition_clause: `(expr)` → `expr`
    if (innerCond.type === 'condition_clause') {
        for (var ci = 0; ci < innerCond.childCount; ci++) {
            var ch = innerCond.child(ci);
            if (ch && ch.type !== '(' && ch.type !== ')') {
                innerCond = ch;
                break;
            }
        }
    }
    if (!innerCond.text.includes(mutatedVar))
        return false;
    // ── 3A. Two-pointer: inner condition references outer iterator ────────────
    var outerIterVar = getForIteratorVar(parentForNode);
    if (outerIterVar && innerCond.text.includes(outerIterVar)) {
        return true;
    }
    // ── 3B. Trial division: mutated variable appears in outer for condition ───
    var outerCond = parentForNode.childForFieldName('condition');
    if (outerCond && outerCond.text.includes(mutatedVar)) {
        return true;
    }
    return false;
}
/**
 * Returns true when the inner for_statement's update clause increments by
 * `outerVar` (i.e. `j += outerVar`) AND its initializer begins at an expression
 * that depends on `outerVar` (e.g. `j = outerVar`, `j = 2*outerVar`,
 * `j = outerVar*outerVar`).
 *
 * False-positive guard: `j += blockSize` where blockSize ≠ outerVar → false.
 */
function isStepDependentOn(innerForNode, outerVar) {
    var _a, _b;
    // ── 1. Update clause must be `j += outerVar` ──────────────────────────────
    var updateNode = innerForNode.childForFieldName('update');
    if (!updateNode)
        return false;
    // Unwrap comma_expression (e.g. `j+=i, k++`) — use first operand
    var effectiveUpdate = updateNode.type === 'comma_expression'
        ? ((_a = updateNode.child(0)) !== null && _a !== void 0 ? _a : updateNode)
        : updateNode;
    if (effectiveUpdate.type !== 'assignment_expression' &&
        effectiveUpdate.type !== 'math_assignment_expression')
        return false;
    // Operator must be +=
    var opNode = effectiveUpdate.childForFieldName('operator') ||
        effectiveUpdate.children.find(function (c) { return c.type === '+='; });
    if (!opNode || opNode.type !== '+=')
        return false;
    // RHS of the update must be exactly the outer iterator identifier
    var updateRhs = effectiveUpdate.childForFieldName('right');
    if (!updateRhs || updateRhs.type !== 'identifier' || updateRhs.text !== outerVar)
        return false;
    // ── 2. Initializer must reference outerVar ────────────────────────────────
    var init = innerForNode.childForFieldName('initializer');
    if (!init)
        return false;
    // Extract the RHS of the inner initialization value
    var initValue = null;
    var decl = init.descendantsOfType('init_declarator')[0];
    if (decl) {
        initValue = decl.childForFieldName('value');
    }
    else {
        var assign = init.descendantsOfType('assignment_expression')[0];
        if (assign)
            initValue = assign.childForFieldName('right');
    }
    if (!initValue)
        return false;
    // Accept: j = outerVar
    if (initValue.type === 'identifier' && initValue.text === outerVar)
        return true;
    // Accept: j = k * outerVar  or  j = outerVar * k  (any constant × outerVar)
    if (initValue.type === 'binary_expression' && ((_b = initValue.childForFieldName('operator')) === null || _b === void 0 ? void 0 : _b.type) === '*') {
        var l = initValue.childForFieldName('left');
        var r = initValue.childForFieldName('right');
        if ((l && l.type === 'identifier' && l.text === outerVar) ||
            (r && r.type === 'identifier' && r.text === outerVar)) {
            return true;
        }
    }
    // Accept: j = outerVar * outerVar  (i*i — Sieve of Eratosthenes init)
    // This is already covered by the `*` check above if both sides are outerVar.
    return false;
}
/**
 * Extracts the name from a function_definition node.
 */
function extractFunctionName(fnNode) {
    return extractFunctionNameOrCallIdentifier(fnNode);
}
/**
 * Extracts the identifier from a function_definition or call_expression.
 */
function extractFunctionNameOrCallIdentifier(node) {
    if (node.type === 'call_expression') {
        var functionNode = node.childForFieldName('function') || node.child(0);
        if (functionNode && functionNode.type === 'identifier') {
            return functionNode.text;
        }
        return '<anonymous>';
    }
    var declarator = findChildOfType(node, 'function_declarator');
    if (declarator) {
        var identifier = findChildOfType(declarator, 'identifier') ||
            findChildOfType(declarator, 'field_identifier');
        if (identifier)
            return identifier.text;
    }
    return '<anonymous>';
}
/**
 * Returns true if `callNode` is a call_expression whose function is a
 * field_expression resolving to a key in STL_MEMBER_REGISTRY via the TypeContext.
 * Used during the parent-walk to correctly scope nested STL member calls.
 */
function isRegisteredStlMember(callNode, ctx) {
    var funcNode = callNode.childForFieldName('function');
    if (!funcNode || funcNode.type !== 'field_expression')
        return false;
    var objectIdent = funcNode.childForFieldName('argument');
    var fieldIdent = funcNode.childForFieldName('field');
    if (!objectIdent || !fieldIdent)
        return false;
    var resolvedType = ctx.variables.get(objectIdent.text);
    if (!resolvedType)
        return false;
    return loopClassifier_1.STL_MEMBER_REGISTRY["".concat(resolvedType, "::").concat(fieldIdent.text)] !== undefined;
}
// ─── Graph Traversal Detection (D2.2) ────────────────────────────────────────
/**
 * Returns true if `whileNode` matches the BFS/DFS graph traversal signature:
 *   container ∈ {queue, stack, deque} + !x.empty() + for_range_loop body.
 * Produces O(V+E).
 */
function isGraphTraversalWhile(whileNode, ctx) {
    return _isGraphWhile(whileNode, ctx, ['queue', 'stack', 'deque']);
}
// ─── Dijkstra / Priority-Queue Traversal Detection (D2.3) ────────────────────
/**
 * Returns true if `whileNode` matches the Dijkstra/priority-queue graph
 * traversal signature:
 *   container = priority_queue + !pq.empty() + for_range_loop body.
 * Produces O((V+E) log V).
 * Mutually exclusive with isGraphTraversalWhile by the container type guard.
 */
function isDijkstraWhile(whileNode, ctx) {
    return _isGraphWhile(whileNode, ctx, ['priority_queue']);
}
// ─── Shared graph-while detection core ───────────────────────────────────────
/**
 * Core implementation shared by isGraphTraversalWhile and isDijkstraWhile.
 *
 * All four conditions must hold simultaneously:
 *   1. Condition is `!x.empty()` (exact AST shape — unary ! wrapping call_expression).
 *   2. Method field name is exactly "empty".
 *   3. Variable `x` TypeContext-resolves to one of `allowedTypes`.
 *   4. Body contains a for_range_loop with no intervening for/while/do loop
 *      between it and the outer while (ancestor walk using .id comparison).
 *
 * Any single failure returns false silently, preserving the existing classification.
 */
function _isGraphWhile(whileNode, ctx, allowedTypes) {
    // ── 1. Extract condition ──────────────────────────────────────────────────
    var condNode = whileNode.childForFieldName('condition');
    if (!condNode)
        return false;
    // Unwrap condition_clause: `(expr)` → inner expr
    if (condNode.type === 'condition_clause') {
        for (var i = 0; i < condNode.childCount; i++) {
            var ch = condNode.child(i);
            if (ch && ch.type !== '(' && ch.type !== ')') {
                condNode = ch;
                break;
            }
        }
    }
    // ── 2. Condition must be `!x.empty()` ────────────────────────────────────
    if (condNode.type !== 'unary_expression')
        return false;
    var unaryOp = condNode.child(0);
    if (!unaryOp || unaryOp.text !== '!')
        return false;
    var innerCall = condNode.child(1);
    if (!innerCall || innerCall.type !== 'call_expression')
        return false;
    var callFunc = innerCall.childForFieldName('function');
    if (!callFunc || callFunc.type !== 'field_expression')
        return false;
    var containerIdent = callFunc.childForFieldName('argument');
    var methodIdent = callFunc.childForFieldName('field');
    if (!containerIdent || !methodIdent)
        return false;
    if (methodIdent.text !== 'empty')
        return false;
    // ── 3. Container type must be in allowedTypes ─────────────────────────────
    var resolvedType = ctx.variables.get(containerIdent.text);
    if (!resolvedType)
        return false;
    if (!allowedTypes.includes(resolvedType))
        return false;
    // ── 4. Body must contain a for_range_loop at direct depth ────────────────
    // A range loop is "direct" if no for/while/do appears in the ancestor chain
    // between it and the outer while node (.id comparison avoids wrapper aliasing).
    var body = whileNode.childForFieldName('body');
    if (!body)
        return false;
    var allRangeLoops = body.descendantsOfType('for_range_loop');
    var directRangeLoops = allRangeLoops.filter(function (rl) {
        var cur = rl.parent;
        while (cur && cur.id !== whileNode.id) {
            if (cur.type === 'for_statement' ||
                cur.type === 'for_range_loop' ||
                cur.type === 'while_statement' ||
                cur.type === 'do_statement') {
                return false;
            }
            cur = cur.parent;
        }
        return true;
    });
    return directRangeLoops.length > 0;
}
