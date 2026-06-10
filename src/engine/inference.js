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
exports.inferComplexity = inferComplexity;
exports.analyzeFunctions = analyzeFunctions;
var astUtils_1 = require("../parser/astUtils");
var typeTracker_1 = require("../parser/typeTracker");
function getBaseComplexity(classification, customComplexity, boundVar) {
    if (classification === 'custom' && customComplexity) {
        return customComplexity;
    }
    switch (classification) {
        case 'constant':
            return { power: 0, logPower: 0, loglogPower: 0, isUnknown: false };
        case 'linear':
            return { power: 1, logPower: 0, loglogPower: 0, isUnknown: false, linearVars: classification === 'linear' && boundVar ? [boundVar] : undefined };
        case 'logarithmic':
            return { power: 0, logPower: 1, loglogPower: 0, isUnknown: false };
        case 'fractional':
            return { power: 0.5, logPower: 0, loglogPower: 0, isUnknown: false };
        case 'linear_logarithmic':
            return { power: 1, logPower: 1, loglogPower: 0, isUnknown: false, linearVars: boundVar ? [boundVar] : undefined };
        case 'graph_traversal':
            // O(V+E): stored as power=1 so it dominates O(log n) and O(1),
            // but the isGraphSum flag causes the formatter to emit 'O(V+E)'.
            return { power: 1, logPower: 0, loglogPower: 0, isUnknown: false, isGraphSum: true };
        case 'graph_log_traversal':
            // O((V+E) log V): stored as power=1, logPower=1 for dominance ordering.
            // isGraphSumLog causes the formatter to emit 'O((V+E) log V)'.
            return { power: 1, logPower: 1, loglogPower: 0, isUnknown: false, isGraphSumLog: true };
        case 'exponential':
            // O(2^n): stored as power=0, logPower=0 — polynomial part is zero.
            // expVars carries the exponent variable; formatExponential emits 'O(2ⁿ)'.
            // Using power=0 allows correct multiplication: O(2ⁿ) × O(n) = O(n·2ⁿ).
            return { power: 0, logPower: 0, loglogPower: 0, isUnknown: false,
                expVars: boundVar ? [boundVar] : [] };
        case 'unknown':
        default:
            return { power: 0, logPower: 0, loglogPower: 0, isUnknown: true };
    }
}
function multiplyNodes(a, b) {
    if (a.isUnknown || b.isUnknown) {
        return { power: 0, logPower: 0, loglogPower: 0, isUnknown: true };
    }
    // Graph-sum nodes are never multiplied — the inner loop is already counted.
    // isGraphSumLog (O((V+E) log V)) takes priority over isGraphSum (O(V+E)).
    if (a.isGraphSumLog || b.isGraphSumLog) {
        return a.isGraphSumLog ? a : b;
    }
    if (a.isGraphSum || b.isGraphSum) {
        return a.isGraphSum ? a : b;
    }
    // D3.1: Concatenate expVars arrays — exactly parallel to linearVars merging.
    // e.g. [n] + [m] → [n,m] → O(2ⁿ·2ᵐ)  |  [n] + [] → [n] → O(2ⁿ)
    var mergedExpVars = undefined;
    if (a.expVars || b.expVars) {
        mergedExpVars = __spreadArray(__spreadArray([], (a.expVars || []), true), (b.expVars || []), true);
    }
    var mergedVars = undefined;
    if (a.linearVars || b.linearVars) {
        mergedVars = __spreadArray(__spreadArray([], (a.linearVars || []), true), (b.linearVars || []), true);
    }
    return {
        power: a.power + b.power,
        logPower: a.logPower + b.logPower,
        loglogPower: Math.min(1, a.loglogPower + b.loglogPower),
        isUnknown: false,
        linearVars: mergedVars,
        expVars: mergedExpVars,
    };
}
function maxNode(a, b) {
    if (a.isUnknown || b.isUnknown) {
        return { power: 0, logPower: 0, loglogPower: 0, isUnknown: true };
    }
    // isGraphSumLog (O((V+E) log V), power=1 logPower=1) and
    // isGraphSum (O(V+E), power=1 logPower=0) use standard power/logPower dominance.
    if (a.isGraphSumLog && b.isGraphSumLog)
        return a;
    if (a.isGraphSum && b.isGraphSum)
        return a;
    // D3.1: Exponential always dominates polynomial.
    // Both expVars non-empty: longer total exponent list wins (conservative tie-break).
    var aIsExp = !!(a.expVars && a.expVars.length > 0);
    var bIsExp = !!(b.expVars && b.expVars.length > 0);
    if (aIsExp && !bIsExp)
        return a;
    if (bIsExp && !aIsExp)
        return b;
    if (aIsExp && bIsExp) {
        // Both exponential — use longer expVars as a proxy for dominant exponent.
        // No symbolic comparison; tie falls to `a` (first encountered, conservative).
        return a.expVars.length >= b.expVars.length ? a : b;
    }
    // Standard polynomial dominance.
    if (a.power > b.power)
        return a;
    if (b.power > a.power)
        return b;
    if (a.logPower > b.logPower)
        return a;
    if (b.logPower > a.logPower)
        return b;
    if (a.loglogPower >= b.loglogPower)
        return a;
    return b;
}
function mergeConfidence(a, b) {
    if (a === 'low' || b === 'low')
        return 'low';
    if (a === 'medium' || b === 'medium')
        return 'medium';
    return 'high';
}
function formatComplexity(node) {
    if (node.isUnknown)
        return 'Unknown';
    // D2.2 / D2.3: Graph traversal summation — checked before all polynomial formatting.
    // isGraphSumLog (Dijkstra, O((V+E) log V)) must be checked before isGraphSum (BFS/DFS, O(V+E))
    // because both flags could theoretically coexist in maxNode comparisons.
    if (node.isGraphSumLog)
        return 'O((V+E) log V)';
    if (node.isGraphSum)
        return 'O(V+E)';
    // D3.1: Exponential formatting — checked before polynomial.
    // Any node with expVars set is routed through formatExponential.
    if (node.expVars && node.expVars.length > 0)
        return formatExponential(node);
    // Mixed / Heuristic check:
    // If the number of extracted linear symbolic variables does NOT perfectly match the expected linear polynomial degree,
    // we MUST abort symbolic formatting and fall back to the exact 'n' representation.
    var explicitVars = node.linearVars || [];
    var expectedLinearFactors = Math.floor(node.power);
    var isFullySymbolic = explicitVars.length === expectedLinearFactors;
    // If the entire complexity is just a single linear factor, force fallback to 'O(n)'
    // to perfectly preserve single-loop test expectations like test 16: for(i<m) -> O(n).
    // Symbolic formatting only triggers when there are MULTIPLE explicit variables multiplying.
    var isSingleVariable = explicitVars.length === 1 && Math.floor(node.power) === 1;
    // Backward compatibility fast-paths for pure 'n', OR when we abort symbolic formatting
    if (!isFullySymbolic || explicitVars.length === 0 || explicitVars.every(function (v) { return v === 'n'; }) || isSingleVariable) {
        if (node.power === 1 && node.logPower === 0 && node.loglogPower === 1)
            return 'O(n log log n)';
        if (node.power === 0 && node.logPower === 0)
            return 'O(1)';
        if (node.power === 0 && node.logPower === 1)
            return 'O(log n)';
        if (node.power === 0 && node.logPower === 2)
            return 'O(log² n)';
        if (node.power === 0 && node.logPower >= 3)
            return 'O(log³ n)';
        if (node.power === 0.5 && node.logPower === 0)
            return 'O(sqrt n)';
        if (node.power === 1 && node.logPower === 0)
            return 'O(n)';
        if (node.power === 1 && node.logPower === 1)
            return 'O(n log n)';
        if (node.power === 1.5 && node.logPower === 0)
            return 'O(n sqrt n)';
        if (node.power === 1 && node.logPower === 2)
            return 'O(n log² n)';
        if (node.power === 2 && node.logPower === 0)
            return 'O(n²)';
        if (node.power === 2 && node.logPower === 1)
            return 'O(n² log n)';
        if (node.power === 2.5 && node.logPower === 0)
            return 'O(n² sqrt n)';
        if (node.power === 1.5 && node.logPower === 1)
            return 'O(n sqrt n log n)';
        if (node.power >= 3) {
            var powFloor = Math.floor(node.power);
            var isFractional = (node.power % 1 === 0.5);
            var powStr = powFloor === 3 ? '³' : "^".concat(powFloor);
            var fracStr = isFractional ? ' sqrt n' : '';
            if (node.logPower === 0)
                return "O(n".concat(powStr).concat(fracStr, ")");
            if (node.logPower === 1)
                return "O(n".concat(powStr).concat(fracStr, " log n)");
            if (node.logPower === 2)
                return "O(n".concat(powStr).concat(fracStr, " log\u00B2 n)");
            return "O(n".concat(powStr).concat(fracStr, " log\u00B3 n)");
        }
    }
    // Multi-variable formatting
    var allVars = __spreadArray([], explicitVars, true);
    allVars.sort(function (a, b) {
        if (a === 'n')
            return -1;
        if (b === 'n')
            return 1;
        return a.localeCompare(b);
    });
    var varCounts = new Map();
    for (var _i = 0, allVars_1 = allVars; _i < allVars_1.length; _i++) {
        var v = allVars_1[_i];
        varCounts.set(v, (varCounts.get(v) || 0) + 1);
    }
    var polyTerms = [];
    for (var _a = 0, _b = varCounts.entries(); _a < _b.length; _a++) {
        var _c = _b[_a], v = _c[0], count = _c[1];
        if (count === 1)
            polyTerms.push(v);
        else if (count === 2)
            polyTerms.push(v + '²');
        else if (count === 3)
            polyTerms.push(v + '³');
        else
            polyTerms.push(v + '^' + count);
    }
    var result = polyTerms.join('');
    if (node.power % 1 === 0.5) {
        result += (result ? ' ' : '') + 'sqrt n';
    }
    if (node.logPower === 1) {
        result += (result ? ' ' : '') + 'log n';
    }
    else if (node.logPower === 2) {
        result += (result ? ' ' : '') + 'log² n';
    }
    else if (node.logPower >= 3) {
        result += (result ? ' ' : '') + 'log³ n';
    }
    if (node.loglogPower === 1) {
        result += (result ? ' ' : '') + 'log log n';
    }
    if (!result)
        return 'O(1)';
    return "O(".concat(result, ")");
}
// ─── D3.1: Superscript map and exponential formatter ──────────────────────────────────────────────
var SUPERSCRIPT_MAP = {
    n: '\u207F', m: '\u1D50', k: '\u1D4F', r: '\u02B3', i: '\u2071', j: '\u02B2',
    a: '\u1D43', b: '\u1D47', c: '\u1D9C', d: '\u1D48', p: '\u1D56',
};
function toSuperscript(varName) {
    return (varName.length === 1 && SUPERSCRIPT_MAP[varName])
        ? SUPERSCRIPT_MAP[varName]
        : "^".concat(varName); // fallback for multi-char or unmapped variables
}
/**
 * Formats a ComplexityNode that has expVars set (D3.1).
 *
 * Output structure: [poly·]exp[ log…]
 *
 *   poly part  — derived from power + linearVars (same logic as formatComplexity polynomial section)
 *   exp part   — each entry in expVars becomes '2<sup>var</sup>', joined by '·'
 *   log suffix — appended after the exponential term if logPower > 0
 *
 * No simplification: O(2ⁿ·2ⁿ) stays O(2ⁿ·2ⁿ), not O(4ⁿ).
 */
function formatExponential(node) {
    // ── 1. Exponential part ──────────────────────────────────────────────────────────
    var expPart = node.expVars.map(function (v) { return "2".concat(toSuperscript(v)); }).join('\u00B7');
    // ── 2. Polynomial prefix (from power + linearVars) ──────────────────────────────
    var polyPrefix = '';
    if (node.power > 0) {
        var explicitVars = node.linearVars || [];
        var expectedLinearFactors = Math.floor(node.power);
        var isFullySymbolic = explicitVars.length === expectedLinearFactors;
        if (isFullySymbolic && explicitVars.length > 0 && !explicitVars.every(function (v) { return v === 'n'; })) {
            // Multi-variable symbolic: e.g. ['n','m'] → 'nm'
            var varCounts = new Map();
            for (var _i = 0, explicitVars_1 = explicitVars; _i < explicitVars_1.length; _i++) {
                var v = explicitVars_1[_i];
                varCounts.set(v, (varCounts.get(v) || 0) + 1);
            }
            var sortedKeys = __spreadArray([], varCounts.keys(), true).sort(function (a, b) {
                return a === 'n' ? -1 : b === 'n' ? 1 : a.localeCompare(b);
            });
            var polyTerms = [];
            for (var _a = 0, sortedKeys_1 = sortedKeys; _a < sortedKeys_1.length; _a++) {
                var v = sortedKeys_1[_a];
                var cnt = varCounts.get(v);
                if (cnt === 1)
                    polyTerms.push(v);
                else if (cnt === 2)
                    polyTerms.push(v + '\u00B2');
                else if (cnt === 3)
                    polyTerms.push(v + '\u00B3');
                else
                    polyTerms.push("".concat(v, "^").concat(cnt));
            }
            polyPrefix = polyTerms.join('');
        }
        else {
            // Fallback: n, n², n³ ...
            var p = Math.floor(node.power);
            polyPrefix = p === 1 ? 'n' : p === 2 ? 'n\u00B2' : p === 3 ? 'n\u00B3' : "n^".concat(p);
        }
    }
    // ── 3. Log suffix ──────────────────────────────────────────────────────────────────
    var logSuffix = '';
    if (node.logPower === 1)
        logSuffix = ' log n';
    else if (node.logPower === 2)
        logSuffix = ' log\u00B2 n';
    else if (node.logPower >= 3)
        logSuffix = ' log\u00B3 n';
    // ── 4. Combine: [poly·]exp[ log...] ──────────────────────────────────────────────
    var inner = polyPrefix ? "".concat(polyPrefix, "\u00B7").concat(expPart).concat(logSuffix) : "".concat(expPart).concat(logSuffix);
    return "O(".concat(inner, ")");
}
function inferComplexity(loops) {
    if (!loops || loops.length === 0) {
        return {
            complexity: 'O(1)',
            confidence: 'high',
            explanation: ['No loops detected. Complexity is O(1).'],
            node: { power: 0, logPower: 0, loglogPower: 0, isUnknown: false }
        };
    }
    var overallNode = { power: 0, logPower: 0, loglogPower: 0, isUnknown: false };
    var overallConfidence = 'high';
    var explanations = [];
    for (var _i = 0, loops_1 = loops; _i < loops_1.length; _i++) {
        var loop = loops_1[_i];
        var _a = analyzeLoopHierarchy(loop), node = _a.node, confidence = _a.confidence, explanation = _a.explanation;
        // Check if the current loop dominates the overall complexity
        var isDominant = !node.isUnknown && !overallNode.isUnknown &&
            (node.power > overallNode.power || (node.power === overallNode.power && node.logPower > overallNode.logPower));
        if (isDominant || overallNode.isUnknown === false && overallNode.power === 0 && overallNode.logPower === 0) {
            if (explanations.length > 0 && isDominant) {
                explanations.push("Sequential loop at line ".concat(loop.startLine + 1, " dominates previous loops."));
            }
        }
        overallNode = maxNode(overallNode, node);
        overallConfidence = mergeConfidence(overallConfidence, confidence);
        explanations.push.apply(explanations, explanation);
    }
    // Deduplicate some explanations if needed, but linear flow is fine
    return {
        complexity: formatComplexity(overallNode),
        confidence: overallConfidence,
        explanation: explanations,
        node: overallNode
    };
}
function analyzeLoopHierarchy(loop) {
    var baseNode = getBaseComplexity(loop.classification, loop.customComplexity, loop.boundVar);
    // Re-inject boundVar into baseNode for linear cases
    if (loop.classification === 'linear' || loop.classification === 'linear_logarithmic') {
        if (loop.boundVar) {
            baseNode.linearVars = [loop.boundVar];
        }
    }
    // D3.1: Re-inject boundVar into expVars for exponential (bitmask) loops.
    // Parallel to the linearVars re-injection above.
    if (loop.classification === 'exponential' && loop.boundVar) {
        baseNode.expVars = [loop.boundVar];
    }
    var explanations = [];
    var currentConfidence = loop.confidence;
    explanations.push("Loop at line ".concat(loop.startLine + 1, " classified as ").concat(loop.classification, "."));
    if (!loop.childLoops || loop.childLoops.length === 0) {
        return { node: baseNode, confidence: currentConfidence, explanation: explanations };
    }
    // ── D2.2: Graph traversal short-circuit (O(V+E)) ──────────────────────────────
    // When the outer loop is a confirmed BFS/DFS traversal, the inner for_range_loop
    // is the edge iteration. O(V) outer + O(E) inner = O(V+E), NOT O(V*E).
    if (baseNode.isGraphSum) {
        for (var _i = 0, _a = loop.childLoops; _i < _a.length; _i++) {
            var child = _a[_i];
            var childResult = analyzeLoopHierarchy(child);
            explanations.push.apply(explanations, childResult.explanation);
        }
        explanations.push("Graph traversal at line ".concat(loop.startLine + 1, ": outer while (vertices) + ") +
            "inner for_range_loop (edges) = O(V+E).");
        return { node: baseNode, confidence: currentConfidence, explanation: explanations };
    }
    // ── D2.3: Dijkstra / priority-queue short-circuit (O((V+E) log V)) ────────────
    // The priority_queue push/pop/emplace inside the traversal are NOT double-counted:
    // O((V+E) log V) already accounts for the log factor from the heap operations.
    // Child explanations are collected for hover display but do NOT alter complexity.
    if (baseNode.isGraphSumLog) {
        for (var _b = 0, _c = loop.childLoops; _b < _c.length; _b++) {
            var child = _c[_b];
            var childResult = analyzeLoopHierarchy(child);
            explanations.push.apply(explanations, childResult.explanation);
        }
        explanations.push("Dijkstra / priority-queue graph traversal at line ".concat(loop.startLine + 1, ": ") +
            "outer while (vertices/edges) + priority_queue ops (log V) = O((V+E) log V).");
        return { node: baseNode, confidence: currentConfidence, explanation: explanations };
    }
    // Partition children into harmonic, amortized, and independent sets.
    var harmonicChildren = loop.childLoops.filter(function (c) { return c.stepDependentOn !== undefined; });
    var amortizedChildren = loop.childLoops.filter(function (c) { return c.isAmortized === true && c.stepDependentOn === undefined; });
    var independentChildren = loop.childLoops.filter(function (c) { return c.stepDependentOn === undefined && c.isAmortized !== true; });
    // ── Independent children: classic max-then-multiply ──────────────────────
    var maxIndependentNode = { power: 0, logPower: 0, loglogPower: 0, isUnknown: false };
    var indepConfidence = 'high';
    for (var _d = 0, independentChildren_1 = independentChildren; _d < independentChildren_1.length; _d++) {
        var child = independentChildren_1[_d];
        var childResult = analyzeLoopHierarchy(child);
        maxIndependentNode = maxNode(maxIndependentNode, childResult.node);
        indepConfidence = mergeConfidence(indepConfidence, childResult.confidence);
        explanations.push.apply(explanations, childResult.explanation);
    }
    // ── Harmonic children: apply harmonic reduction ───────────────────────────
    //
    // Harmonic reduction rule:
    //   outer O(n)        + inner j+=i, j=f(i) → O(n log n)
    //   outer O(sqrt n)   + inner j+=i, j=f(i) → O(n log log n)
    //   outer O(n log n)  + inner j+=i, j=f(i) → O(n log n)  [already n log n dominates]
    //
    // The inner loop iterates O(n/i) times per outer iteration.
    // Σ_{i=1}^{n} n/i = n·H_n = O(n log n).
    // Σ_{i=1}^{sqrt(n)} n/i = n·H_{sqrt(n)} = O(n log(sqrt(n))) = O(n log log n)  [Sieve-style]
    //
    // We choose the result based on the outer loop's classification:
    //   outer linear (power=1)     → O(n log n)
    //   outer fractional (power=0.5, i.e. sqrt n) → O(n log log n)
    //   outer linear_log or higher → fall back to multiply (conservative)
    //
    var maxHarmonicNode = { power: 0, logPower: 0, loglogPower: 0, isUnknown: false };
    var harmonicConfidence = 'high';
    if (harmonicChildren.length > 0) {
        // We pick the best (dominant) harmonic child for its own self-complexity,
        // but we do NOT multiply: instead we apply the summation formula.
        for (var _e = 0, harmonicChildren_1 = harmonicChildren; _e < harmonicChildren_1.length; _e++) {
            var child = harmonicChildren_1[_e];
            var childResult = analyzeLoopHierarchy(child);
            harmonicConfidence = mergeConfidence(harmonicConfidence, childResult.confidence);
            explanations.push.apply(explanations, childResult.explanation);
        }
        var harmonicResultNode = void 0;
        if (baseNode.power === 1 && baseNode.logPower === 0 && baseNode.loglogPower === 0) {
            // Outer is O(n): Σ(n/i) for i=1..n = O(n log n)
            harmonicResultNode = { power: 1, logPower: 1, loglogPower: 0, isUnknown: false };
            explanations.push("Step-dependent inner loop at line ".concat(harmonicChildren[0].startLine + 1, " creates harmonic series: ") +
                "outer O(n) \u00D7 \u03A3(n/i) = O(n log n).");
        }
        else if (baseNode.power === 0.5 && baseNode.logPower === 0 && baseNode.loglogPower === 0) {
            // Outer is O(sqrt n): Σ(n/i) for i=1..sqrt(n) = O(n log log n)  [Sieve]
            harmonicResultNode = { power: 1, logPower: 0, loglogPower: 1, isUnknown: false };
            explanations.push("Step-dependent inner loop at line ".concat(harmonicChildren[0].startLine + 1, " with outer O(sqrt n): ") +
                "sieve-style harmonic sum = O(n log log n).");
        }
        else {
            // For other outer complexities, fall back to conservative multiply.
            // e.g. outer O(n log n) × inner O(n) is still O(n² log n) upper bound.
            var childSelfResult = analyzeLoopHierarchy(harmonicChildren[0]);
            harmonicResultNode = multiplyNodes(baseNode, childSelfResult.node);
            explanations.push("Step-dependent inner loop at line ".concat(harmonicChildren[0].startLine + 1, ": ") +
                "harmonic reduction not applicable for outer ".concat(formatComplexity(baseNode), ", using conservative multiply."));
        }
        maxHarmonicNode = maxNode(maxHarmonicNode, harmonicResultNode);
    }
    // ── Amortized children: do NOT multiply outer × inner ────────────────────
    //
    // An amortized inner loop's total work across all outer iterations is O(outer).
    // Therefore it contributes the same as O(1) per outer iteration.
    // We still recurse into its body (in case it has grandchildren) but we do
    // NOT include its own complexity in the multiplication.
    //
    //   outer O(sqrt n) × amortized-inner: total stays O(sqrt n)  [trial division]
    //   outer O(n)      × amortized-inner: total stays O(n)        [two-pointer]
    //
    var amortizedConfidence = 'high';
    for (var _f = 0, amortizedChildren_1 = amortizedChildren; _f < amortizedChildren_1.length; _f++) {
        var child = amortizedChildren_1[_f];
        var childResult = analyzeLoopHierarchy(child);
        amortizedConfidence = mergeConfidence(amortizedConfidence, childResult.confidence);
        explanations.push.apply(explanations, childResult.explanation);
        explanations.push("Inner loop at line ".concat(child.startLine + 1, " is amortized: total work across all outer ") +
            "iterations is bounded by the outer loop's complexity.");
    }
    // ── Combine: independent × outer, harmonic precomputed, amortized = free ─
    var independentTotal = multiplyNodes(baseNode, maxIndependentNode);
    currentConfidence = mergeConfidence(currentConfidence, mergeConfidence(indepConfidence, mergeConfidence(harmonicConfidence, amortizedConfidence)));
    var resultNode;
    var hasHarmonic = harmonicChildren.length > 0;
    var hasAmortized = amortizedChildren.length > 0;
    var hasIndependent = independentChildren.length > 0;
    if (hasHarmonic && !hasIndependent) {
        resultNode = maxHarmonicNode;
    }
    else if (hasHarmonic) {
        resultNode = maxNode(maxHarmonicNode, independentTotal);
    }
    else if (hasAmortized && !hasIndependent) {
        // Only amortized children — outer contributes its own base complexity.
        resultNode = baseNode;
    }
    else if (hasAmortized) {
        // Amortized + independent — max(baseNode, independentTotal) = independentTotal dominates.
        resultNode = maxNode(baseNode, independentTotal);
    }
    else {
        // Pure independent (original behavior).
        resultNode = independentTotal;
    }
    if (!resultNode.isUnknown && !baseNode.isUnknown) {
        if (baseNode.power === 0 && baseNode.logPower === 0) {
            explanations.push("Outer loop at line ".concat(loop.startLine + 1, " is constant, so it does not multiply inner complexity."));
        }
        else if (hasIndependent && !hasHarmonic && !hasAmortized) {
            var innerStr = formatComplexity(maxIndependentNode);
            var outerStr = formatComplexity(baseNode);
            var totalStr = formatComplexity(resultNode);
            explanations.push("Nested ".concat(innerStr, " loop inside ").concat(outerStr, " loop multiply to produce ").concat(totalStr, "."));
        }
    }
    else if (resultNode.isUnknown) {
        explanations.push("Unknown complexity in nested hierarchy leads to overall Unknown.");
    }
    return {
        node: resultNode,
        confidence: currentConfidence,
        explanation: explanations
    };
}
/**
 * Analyzes every function_definition in the given parsed tree and returns
 * a per-function complexity breakdown.
 *
 * @param tree The parsed tree-sitter Tree for the document.
 * @returns A DocumentComplexityResult with one entry per function.
 */
function analyzeFunctions(tree) {
    var results = [];
    if (!tree || !tree.rootNode) {
        return { functions: results };
    }
    var macroRegistry = (0, astUtils_1.buildMacroRegistry)(tree);
    var globalTypeContext = (0, typeTracker_1.buildTypeContext)(tree.rootNode);
    var fnNodes = tree.rootNode.descendantsOfType('function_definition');
    // Pass 1: Collect valid top-level functions
    var fnMap = new Map();
    var allFnNames = [];
    for (var _i = 0, fnNodes_1 = fnNodes; _i < fnNodes_1.length; _i++) {
        var fnNode = fnNodes_1[_i];
        var isNestedFn = false;
        var parent_1 = fnNode.parent;
        while (parent_1) {
            if (parent_1.type === 'function_definition') {
                isNestedFn = true;
                break;
            }
            parent_1 = parent_1.parent;
        }
        if (isNestedFn)
            continue;
        var name_1 = (0, astUtils_1.extractFunctionName)(fnNode);
        // Ignore duplicate names (overloads) for now, use the last one found
        fnMap.set(name_1, fnNode);
        if (!allFnNames.includes(name_1)) {
            allFnNames.push(name_1);
        }
    }
    // Pass 2: Build Call Graph
    var graph = new Map();
    for (var _a = 0, allFnNames_1 = allFnNames; _a < allFnNames_1.length; _a++) {
        var name_2 = allFnNames_1[_a];
        var node = fnMap.get(name_2);
        var calls = node.descendantsOfType('call_expression');
        var outgoing = new Set();
        for (var _b = 0, calls_1 = calls; _b < calls_1.length; _b++) {
            var call = calls_1[_b];
            var functionNode = call.childForFieldName('function') || call.child(0);
            if (functionNode && functionNode.type === 'identifier') {
                var targetName = functionNode.text;
                if (fnMap.has(targetName)) {
                    outgoing.add(targetName);
                }
            }
        }
        graph.set(name_2, Array.from(outgoing));
    }
    // Pass 3: Topological Sort with cycle detection
    var visited = new Set();
    var visiting = new Set();
    var sorted = [];
    var recursiveNodes = new Set();
    function dfs(name) {
        if (visiting.has(name)) {
            recursiveNodes.add(name);
            return;
        }
        if (visited.has(name))
            return;
        visiting.add(name);
        var edges = graph.get(name) || [];
        for (var _i = 0, edges_1 = edges; _i < edges_1.length; _i++) {
            var target = edges_1[_i];
            dfs(target);
        }
        visiting.delete(name);
        visited.add(name);
        sorted.push(name);
    }
    for (var _c = 0, allFnNames_2 = allFnNames; _c < allFnNames_2.length; _c++) {
        var name_3 = allFnNames_2[_c];
        if (!visited.has(name_3)) {
            dfs(name_3);
        }
    }
    // Pass 4: Bottom-up evaluation
    var functionRegistry = new Map();
    for (var _d = 0, sorted_1 = sorted; _d < sorted_1.length; _d++) {
        var name_4 = sorted_1[_d];
        var fnNode = fnMap.get(name_4);
        if (recursiveNodes.has(name_4)) {
            // ── D3.2: DSU Recursive Path Compression Override ──────────────
            // If the function exactly matches the `parent[x] = find(parent[x])`
            // fingerprint, we safely evaluate it as O(1) amortized instead of Unknown.
            if (isDSURecursivePathCompression(fnNode, name_4)) {
                functionRegistry.set(name_4, { power: 0, logPower: 0, loglogPower: 0, isUnknown: false });
                results.push({
                    name: name_4,
                    startLine: fnNode.startPosition.row,
                    endLine: fnNode.endPosition.row,
                    complexity: 'O(1)',
                    confidence: 'high',
                    explanation: ["Function \"".concat(name_4, "\" recognized as DSU recursive path compression. Complexity is amortized O(1).")]
                });
                continue;
            }
            // ── D4.1 / D4.2: Memoized Recursion Override ──────────────────
            // isMemoizedRecursion() returns the cache dimension (1, 2, or 3)
            // when the strict structural fingerprint matches, or null otherwise.
            // Dimension maps directly to complexity: 1→O(n), 2→O(n²), 3→O(n³).
            // Any null result falls through to Unknown, exactly as before.
            var memoDim = isMemoizedRecursion(fnNode, name_4);
            if (memoDim !== null) {
                var memoComplexity = formatComplexity({ power: memoDim, logPower: 0, loglogPower: 0, isUnknown: false });
                var dimLabel = memoDim === 1 ? 'single' : memoDim === 2 ? 'two' : 'three';
                functionRegistry.set(name_4, { power: memoDim, logPower: 0, loglogPower: 0, isUnknown: false });
                results.push({
                    name: name_4,
                    startLine: fnNode.startPosition.row,
                    endLine: fnNode.endPosition.row,
                    complexity: memoComplexity,
                    confidence: 'medium',
                    explanation: ["Function \"".concat(name_4, "\" recognized as memoized recursion with ").concat(dimLabel, "-dimension cache. Each state computed once: ").concat(memoComplexity, ".")]
                });
                continue;
            }
            // ── D4.6: Recursive Binary Search Override ────────────────────
            // isRecursiveBinarySearch() returns true when ALL four structural
            // conditions hold (midpoint decl, endpoint-preservation, no loops,
            // pairwise mutual exclusivity). Any failure falls to Unknown.
            if (isRecursiveBinarySearch(fnNode, name_4)) {
                functionRegistry.set(name_4, { power: 0, logPower: 1, loglogPower: 0, isUnknown: false });
                results.push({
                    name: name_4,
                    startLine: fnNode.startPosition.row,
                    endLine: fnNode.endPosition.row,
                    complexity: 'O(log n)',
                    confidence: 'high',
                    explanation: ["Function \"".concat(name_4, "\" recognized as recursive binary search (halving with branch-isolated self-calls). Complexity is O(log n).")]
                });
                continue;
            }
            // Ordinary recursion falls through to existing Unknown behavior.
            functionRegistry.set(name_4, { power: 0, logPower: 0, loglogPower: 0, isUnknown: true });
            results.push({
                name: name_4,
                startLine: fnNode.startPosition.row,
                endLine: fnNode.endPosition.row,
                complexity: 'Unknown',
                confidence: 'low',
                explanation: ["Function \"".concat(name_4, "\" participates in recursion. Complexity is Unknown.")]
            });
            continue;
        }
        var loops = (0, astUtils_1.extractFunctionLoops)(fnNode, macroRegistry, functionRegistry, globalTypeContext);
        var _e = inferComplexity(loops), complexity = _e.complexity, confidence = _e.confidence, explanation = _e.explanation, node = _e.node;
        var summaryLine = buildSummary(name_4, complexity);
        var finalExplanation = __spreadArray(__spreadArray([], explanation, true), [summaryLine], false);
        if (node) {
            functionRegistry.set(name_4, node);
        }
        results.push({
            name: name_4,
            startLine: fnNode.startPosition.row,
            endLine: fnNode.endPosition.row,
            complexity: complexity,
            confidence: confidence,
            explanation: finalExplanation
        });
    }
    // Restore original function order to match the document's structure exactly
    results.sort(function (a, b) {
        if (a.startLine !== b.startLine)
            return a.startLine - b.startLine;
        return allFnNames.indexOf(a.name) - allFnNames.indexOf(b.name);
    });
    return { functions: results };
}
function buildSummary(name, complexity) {
    if (complexity === 'O(1)') {
        return "Function \"".concat(name, "\" contains no loops or only constant loops. Time complexity is O(1).");
    }
    return "Overall time complexity of function \"".concat(name, "\" is ").concat(complexity, ".");
}
// ─── D3.2: DSU Path Compression Helper ──────────────────────────────────────────────────
/**
 * Safely identifies DSU recursive path compression functions.
 * Looks for exact AST structural fingerprint: `parent[x] = find(parent[x])`.
 * Requires:
 * 1. Recursive self-call
 * 2. assignment_expression where `left` is a `subscript_expression`
 * 3. `right` is a `call_expression` to the same function
 * 4. The argument to the call is an identical `subscript_expression`
 */
function isDSURecursivePathCompression(fnNode, fnName) {
    var assignments = fnNode.descendantsOfType('assignment_expression');
    for (var _i = 0, assignments_1 = assignments; _i < assignments_1.length; _i++) {
        var assign = assignments_1[_i];
        var left = assign.childForFieldName('left');
        var right = assign.childForFieldName('right');
        if (!left || left.type !== 'subscript_expression')
            continue;
        // Unwrap parenthesis if any
        while (right && right.type === 'parenthesized_expression') {
            var inner = null;
            for (var i = 0; i < right.childCount; i++) {
                var ch = right.child(i);
                if (ch && ch.type !== '(' && ch.type !== ')') {
                    inner = ch;
                    break;
                }
            }
            if (!inner)
                break;
            right = inner;
        }
        if (!right || right.type !== 'call_expression')
            continue;
        var callFunc = right.childForFieldName('function');
        if (!callFunc || callFunc.text !== fnName)
            continue;
        var argsNode = right.childForFieldName('arguments');
        if (!argsNode)
            continue;
        var firstArg = null;
        for (var i = 0; i < argsNode.childCount; i++) {
            var p = argsNode.child(i);
            if (p && p.type !== '(' && p.type !== ')' && p.type !== ',') {
                firstArg = p;
                break;
            }
        }
        if (!firstArg || firstArg.type !== 'subscript_expression')
            continue;
        // Structurally match: parent[x] == parent[x]
        if (left.text === firstArg.text) {
            return true;
        }
    }
    return false;
}
// ─── D4.1 / D4.2: Memoized Recursion Helpers ─────────────────────────────────────────────
/**
 * Walks a (possibly nested) subscript_expression chain to find the root array identifier.
 *
 * Tree-sitter-cpp models  memo[i][j]  as:
 *   subscript_expression (outer, "memo[i][j]")
 *     child(0): subscript_expression (inner, "memo[i]")
 *       child(0): identifier ("memo")
 *       child(1): subscript_argument_list ("[i]")
 *     child(1): subscript_argument_list ("[j]")
 *
 * This helper descends through child(0) until it finds an identifier, counting
 * the number of subscript levels as the dimension.
 *
 * Returns null when:
 *   - The root node is not an identifier (pointer dereference, member access, etc.)
 *   - The dimension exceeds 3 (deferred scope)
 *
 * No heuristics. No name-based inference. Pure structural descent.
 */
function getSubscriptRoot(node) {
    var dim = 0;
    var cur = node;
    while (cur.type === 'subscript_expression') {
        dim++;
        var inner = cur.child(0);
        if (!inner)
            return null; // malformed AST
        cur = inner;
    }
    // The root must be a plain identifier — reject pointer derefs, field_expressions, etc.
    if (cur.type !== 'identifier')
        return null;
    // Cap at 3 dimensions: 4D+ DP is out of scope.
    if (dim > 3)
        return null;
    return { name: cur.text, dimension: dim };
}
/**
 * Safely identifies memoized recursion with 1D, 2D, or 3D cache arrays.
 *
 * Returns the cache dimension (1, 2, or 3) when ALL five conditions hold:
 *
 * 1. GUARD: An if_statement whose condition is:
 *      A. binary_expression:  memo[...] != number_literal   (operator must be `!=`)
 *         lhs must be a subscript_expression of depth 1, 2, or 3.
 *      B. call_expression:    container.count(...)           (field must be `count`)
 *         This path is only applicable for 1D (map containers); 2D/3D map memoization
 *         is exceedingly rare and is not supported here.
 *
 * 2. EARLY RETURN: The guarded branch returns the SAME subscript expression
 *    (matched by normalized text: same array name, same indices).
 *
 * 3. MEMO WRITE: An assignment_expression elsewhere in the function:
 *       memo[...] = fnName(...)      (same normalized subscript on left; fnName on right)
 *
 * 4. ROOT IS IDENTIFIER: getSubscriptRoot() must return non-null for all examined
 *    subscript_expressions (rejects pointer dereferences, field access, etc.).
 *
 * 5. SELF-RECURSIVE CALLEE: The RHS of the write must be a call_expression
 *    whose callee identifier text exactly equals fnName.
 *
 * Returns null when any condition fails — caller falls through to Unknown.
 */
function isMemoizedRecursion(fnNode, fnName) {
    var ifStmts = fnNode.descendantsOfType('if_statement');
    for (var _i = 0, ifStmts_1 = ifStmts; _i < ifStmts_1.length; _i++) {
        var ifStmt = ifStmts_1[_i];
        // ── Step 1: Unwrap condition_clause ─────────────────────────────────────
        var cond = ifStmt.childForFieldName('condition');
        if (!cond)
            continue;
        if (cond.type === 'condition_clause') {
            var inner = null;
            for (var i = 0; i < cond.childCount; i++) {
                var ch = cond.child(i);
                if (ch && ch.type !== '(' && ch.type !== ')') {
                    inner = ch;
                    break;
                }
            }
            if (!inner)
                continue;
            cond = inner;
        }
        // ── Step 2: Identify guard pattern ───────────────────────────────────────
        // memoKey: normalized whitespace-free subscript text used as the match key
        //          e.g. "dp[i][j]" for a 2D guard, "memo[x]" for a 1D guard.
        // memoName: the root array/container identifier (e.g. "dp", "memo").
        // dimension: 1 for memo[x], 2 for memo[i][j], 3 for memo[i][j][k].
        var memoKey = null;
        var memoName = null;
        var dimension = 1;
        var isCountGuard = false;
        if (cond.type === 'binary_expression') {
            // Pattern A: memo[...] != sentinel
            var op = cond.childForFieldName('operator');
            if (!op || op.type !== '!=')
                continue;
            var lhs = cond.childForFieldName('left');
            var rhs = cond.childForFieldName('right');
            if (!lhs || lhs.type !== 'subscript_expression')
                continue;
            // Walk the subscript chain to the root identifier.
            // This handles 1D (memo[x]), 2D (memo[i][j]), and 3D (memo[i][j][k]).
            var root = getSubscriptRoot(lhs);
            if (!root)
                continue; // non-identifier base or dimension > 3 → reject
            // Right must be a number_literal (the sentinel: -1, 0, etc.)
            if (!rhs || rhs.type !== 'number_literal')
                continue;
            memoName = root.name;
            dimension = root.dimension;
            // Use the full normalized subscript text as the identity key.
            // This robustly handles all dimensions without extracting individual indices.
            memoKey = lhs.text.replace(/\s+/g, '');
        }
        else if (cond.type === 'call_expression') {
            // Pattern B: container.count(arg) — supported for 1D map guards only.
            var funcNode = cond.childForFieldName('function');
            if (!funcNode || funcNode.type !== 'field_expression')
                continue;
            var fieldIdent = funcNode.childForFieldName('field');
            if (!fieldIdent || fieldIdent.text !== 'count')
                continue;
            var objIdent = funcNode.childForFieldName('argument');
            if (!objIdent || objIdent.type !== 'identifier')
                continue;
            memoName = objIdent.text;
            dimension = 1;
            isCountGuard = true;
            // Extract the first argument of .count(arg) as the index key.
            var argsNode = cond.childForFieldName('arguments');
            if (!argsNode)
                continue;
            var arg1 = null;
            for (var i = 0; i < argsNode.childCount; i++) {
                var ch = argsNode.child(i);
                if (ch && ch.type !== '(' && ch.type !== ')' && ch.type !== ',') {
                    arg1 = ch.text;
                    break;
                }
            }
            if (!arg1)
                continue;
            // Build key in the same subscript form for uniform matching below.
            memoKey = "".concat(memoName, "[").concat(arg1, "]");
        }
        else {
            continue; // Not a recognized guard shape — no truthiness, no negation
        }
        if (!memoName || !memoKey)
            continue;
        // ── Step 3: Verify early-return in the guarded consequent ────────────────
        // The then-branch must contain a return_statement whose value is a
        // subscript_expression with the SAME normalized text as the guard's subscript.
        var consequent = ifStmt.childForFieldName('consequence');
        if (!consequent)
            continue;
        var hasMatchingReturn = false;
        var returnStmts = consequent.descendantsOfType('return_statement');
        for (var _a = 0, returnStmts_1 = returnStmts; _a < returnStmts_1.length; _a++) {
            var ret = returnStmts_1[_a];
            var retSubs = ret.descendantsOfType('subscript_expression');
            for (var _b = 0, retSubs_1 = retSubs; _b < retSubs_1.length; _b++) {
                var sub = retSubs_1[_b];
                // Verify the root identifier matches.
                var retRoot = getSubscriptRoot(sub);
                if (!retRoot || retRoot.name !== memoName)
                    continue;
                // Verify the full normalized text matches the guard key.
                if (sub.text.replace(/\s+/g, '') === memoKey) {
                    hasMatchingReturn = true;
                    break;
                }
            }
            if (hasMatchingReturn)
                break;
        }
        if (!hasMatchingReturn)
            continue;
        // ── Step 4: Verify memoization write with self-recursive call ────────────
        // Find any assignment_expression where:
        //   left  = subscript_expression with normalized text == memoKey
        //   right = call_expression whose callee identifier == fnName
        var assignments = fnNode.descendantsOfType('assignment_expression');
        var hasMemoWrite = false;
        for (var _c = 0, assignments_2 = assignments; _c < assignments_2.length; _c++) {
            var assign = assignments_2[_c];
            var left = assign.childForFieldName('left');
            var right = assign.childForFieldName('right');
            if (!left || left.type !== 'subscript_expression')
                continue;
            // Verify root is the expected identifier and dimension matches.
            var leftRoot = getSubscriptRoot(left);
            if (!leftRoot || leftRoot.name !== memoName || leftRoot.dimension !== dimension)
                continue;
            // Verify the full subscript text matches the guard key exactly.
            if (left.text.replace(/\s+/g, '') !== memoKey)
                continue;
            // Unwrap parentheses on the right side.
            while (right && right.type === 'parenthesized_expression') {
                var inner = null;
                for (var i = 0; i < right.childCount; i++) {
                    var ch = right.child(i);
                    if (ch && ch.type !== '(' && ch.type !== ')') {
                        inner = ch;
                        break;
                    }
                }
                if (!inner)
                    break;
                right = inner;
            }
            if (!right || right.type !== 'call_expression')
                continue;
            // The callee must be the function itself — not a helper, not a lambda.
            var callFunc = right.childForFieldName('function');
            if (!callFunc)
                continue;
            if (callFunc.type !== 'identifier' || callFunc.text !== fnName)
                continue;
            hasMemoWrite = true;
            break;
        }
        if (!hasMemoWrite)
            continue;
        // All five conditions satisfied — return the dimension for complexity emission.
        return dimension;
    }
    return null;
}
// ─── D4.6: Recursive Binary Search Helper ────────────────────────────────────
/**
 * Detects a midpoint declaration of the form:  <identifier> = (<any> + <any>) / 2
 *
 * Tree-sitter-cpp represents  `int mid = (lo + hi) / 2`  as:
 *   init_declarator
 *     declarator: identifier  ("mid")
 *     value: binary_expression
 *       left:  parenthesized_expression  "(lo + hi)"
 *         └─ binary_expression  op="+"
 *       operator: "/"
 *       right: number_literal  "2"
 *
 * Accepts the paren-free variant too:  mid = lo + hi >> 1  is NOT matched
 * (different operator), but  mid = (lo + hi) / 2  and  mid = lo + hi / 2
 * are both structurally distinct — only the first is the correct halving form.
 *
 * Returns the midpoint identifier name, or null if no matching declaration exists.
 * No name assumptions. No text matching. Pure AST shape.
 */
function detectMidVariable(fnNode) {
    var decls = fnNode.descendantsOfType('init_declarator');
    for (var _i = 0, decls_1 = decls; _i < decls_1.length; _i++) {
        var d = decls_1[_i];
        var nameNode = d.childForFieldName('declarator');
        if (!nameNode || nameNode.type !== 'identifier')
            continue;
        var val = d.childForFieldName('value');
        if (!val)
            continue;
        // The value must be a binary_expression with operator "/".
        if (val.type !== 'binary_expression')
            continue;
        var outerOp = val.childForFieldName('operator');
        if (!outerOp || outerOp.type !== '/')
            continue;
        // Right operand must be the literal 2.
        var outerRight = val.childForFieldName('right');
        if (!outerRight || outerRight.type !== 'number_literal' || outerRight.text !== '2')
            continue;
        // Left operand must be either a parenthesized_expression or a binary_expression
        // with operator "+".
        var outerLeft = val.childForFieldName('left');
        if (!outerLeft)
            continue;
        var addExpr = outerLeft;
        if (addExpr.type === 'parenthesized_expression') {
            // Unwrap one level of parens.
            var inner = null;
            for (var i = 0; i < addExpr.childCount; i++) {
                var ch = addExpr.child(i);
                if (ch && ch.type !== '(' && ch.type !== ')') {
                    inner = ch;
                    break;
                }
            }
            if (!inner)
                continue;
            addExpr = inner;
        }
        if (addExpr.type !== 'binary_expression')
            continue;
        var addOp = addExpr.childForFieldName('operator');
        if (!addOp || addOp.type !== '+')
            continue;
        // Both operands of the addition must be identifiers (no complex expressions).
        // This rejects   mid = (f(l) + r) / 2   and similar.
        var addLeft = addExpr.childForFieldName('left');
        var addRight = addExpr.childForFieldName('right');
        if (!addLeft || addLeft.type !== 'identifier')
            continue;
        if (!addRight || addRight.type !== 'identifier')
            continue;
        return nameNode.text;
    }
    return null;
}
/**
 * Returns true if the function contains any self-call inside a loop body
 * (for_statement, while_statement, do_statement).
 * Such calls would violate the O(log n) bound.
 */
function hasLoopedSelfCall(fnNode, fnName) {
    var loopTypes = ['for_statement', 'while_statement', 'do_statement'];
    for (var _i = 0, loopTypes_1 = loopTypes; _i < loopTypes_1.length; _i++) {
        var loopType = loopTypes_1[_i];
        var loops = fnNode.descendantsOfType(loopType);
        for (var _a = 0, loops_2 = loops; _a < loops_2.length; _a++) {
            var lp = loops_2[_a];
            var calls = lp.descendantsOfType('call_expression');
            for (var _b = 0, calls_2 = calls; _b < calls_2.length; _b++) {
                var c = calls_2[_b];
                var f = c.childForFieldName('function');
                if (f && f.type === 'identifier' && f.text === fnName)
                    return true;
            }
        }
    }
    return false;
}
/**
 * Extracts the set of formal parameter identifier names from a function_definition node.
 *
 * Handles three declarator shapes emitted by tree-sitter-cpp:
 *
 *   int lo          → declarator: identifier("lo")  → name = "lo"
 *   int* a          → declarator: pointer_declarator
 *                        childForFieldName('declarator') → identifier("a")  → name = "a"
 *   int** pp        → declarator: pointer_declarator
 *                        childForFieldName('declarator') → pointer_declarator
 *                        childForFieldName('declarator') → identifier("pp") → name = "pp"
 *   int& ref        → declarator: reference_declarator
 *                        no 'declarator' field; identifier is child(1)      → name = "ref"
 *
 * Returns an empty set when:
 *   - The function_declarator cannot be found.
 *   - A parameter has no recognized declarator shape (abstract/unnamed param).
 *
 * No name assumptions. No heuristics. Pure AST traversal.
 */
function collectParamNames(fnNode) {
    var _a;
    var names = new Set();
    // Navigate: function_definition → declarator (may be pointer_declarator wrapping
    // function_declarator if the function returns a pointer, e.g. `int* solve(...)`).
    var decl = fnNode.childForFieldName('declarator');
    while (decl && decl.type === 'pointer_declarator') {
        decl = decl.childForFieldName('declarator');
    }
    if (!decl || decl.type !== 'function_declarator')
        return names;
    var params = decl.childForFieldName('parameters');
    if (!params)
        return names;
    for (var i = 0; i < params.childCount; i++) {
        var param = params.child(i);
        if (!param || param.type !== 'parameter_declaration')
            continue;
        var d = param.childForFieldName('declarator');
        if (!d)
            continue;
        // Unwrap pointer layers: pointer_declarator has a named 'declarator' field.
        while (d && d.type === 'pointer_declarator') {
            d = (_a = d.childForFieldName('declarator')) !== null && _a !== void 0 ? _a : null;
        }
        if (!d)
            continue;
        if (d.type === 'identifier') {
            names.add(d.text);
        }
        else if (d.type === 'reference_declarator') {
            // reference_declarator has no named 'declarator' field in tree-sitter-cpp.
            // The identifier is always child(1): child(0) is '&'.
            var inner = d.child(1);
            if (inner && inner.type === 'identifier')
                names.add(inner.text);
        }
        // Other shapes (abstract_declarator, array_declarator, etc.) are silently skipped.
    }
    return names;
}
/**
 * Verifies that a single call_expression argument node represents exactly one
 * of the strictly legal endpoint-preservation forms:
 *
 *   <midName>              — the midpoint identifier
 *   <midName> + 1          — binary_expression: identifier(midName) + number_literal(1)
 *   <midName> - 1          — binary_expression: identifier(midName) - number_literal(1)
 *   <paramName>            — a formal parameter of the function (lo, hi, l, r, etc.)
 *   <number_literal>       — e.g. 0 (rare but valid)
 *
 * Rejects ANYTHING ELSE, including:
 *   mid2, alias, tmp      (arbitrary local identifiers not in the param list)
 *   mid + k               (non-literal RHS)
 *   mid * 2               (wrong operator)
 *   foo(mid)              (call wrapping mid)
 *   l + 2                 (offset from endpoint)
 *   mid + mid2            (non-literal RHS)
 *
 * 'paramNames' is the set of formal parameter identifiers returned by
 * collectParamNames() for this function.
 */
function isLegalCallArg(arg, midName, paramNames) {
    // Identifier: accepted only if it is the midpoint variable OR a formal parameter.
    if (arg.type === 'identifier') {
        return arg.text === midName || paramNames.has(arg.text);
    }
    // binary_expression: only mid±1 is legal.
    if (arg.type === 'binary_expression') {
        var op = arg.childForFieldName('operator');
        var lhs = arg.childForFieldName('left');
        var rhs = arg.childForFieldName('right');
        if (!op || !lhs || !rhs)
            return false;
        // Operator must be + or -.
        if (op.type !== '+' && op.type !== '-')
            return false;
        // LHS must be the mid identifier.
        if (lhs.type !== 'identifier' || lhs.text !== midName)
            return false;
        // RHS must be the literal 1.
        if (rhs.type !== 'number_literal' || rhs.text !== '1')
            return false;
        return true;
    }
    // Number literals are accepted.
    if (arg.type === 'number_literal')
        return true;
    // Everything else (call_expression, field_expression, subscript_expression,
    // unary_expression, cast_expression, …) is rejected.
    return false;
}
/**
 * Verifies that EVERY argument of EVERY self-call satisfies isLegalCallArg().
 * Additionally requires that at least one self-call contains the midName
 * identifier (as a plain arg or in a ±1 expression) — otherwise no halving occurs.
 *
 * 'paramNames' is threaded from isRecursiveBinarySearch via collectParamNames().
 */
function verifyEndpointPreservation(allCalls, midName, paramNames) {
    var anyCallUseMid = false;
    for (var _i = 0, allCalls_1 = allCalls; _i < allCalls_1.length; _i++) {
        var call = allCalls_1[_i];
        var argsNode = call.childForFieldName('arguments');
        if (!argsNode)
            return false; // malformed
        var thisCallUsesMid = false;
        for (var i = 0; i < argsNode.childCount; i++) {
            var ch = argsNode.child(i);
            if (!ch || ch.type === '(' || ch.type === ')' || ch.type === ',')
                continue;
            if (!isLegalCallArg(ch, midName, paramNames))
                return false;
            // Track whether this call references midName at all.
            if (ch.type === 'identifier' && ch.text === midName)
                thisCallUsesMid = true;
            if (ch.type === 'binary_expression') {
                var lhs = ch.childForFieldName('left');
                if (lhs && lhs.type === 'identifier' && lhs.text === midName)
                    thisCallUsesMid = true;
            }
        }
        if (thisCallUsesMid)
            anyCallUseMid = true;
    }
    return anyCallUseMid; // at least one call must reference mid
}
/**
 * Returns true iff the two self-calls are structurally mutually exclusive —
 * i.e., no single execution path can reach both.
 *
 * Uses LCA (Lowest Common Ancestor) traversal with node.id equality.
 *
 * Two calls are mutually exclusive when their LCA is:
 *
 * Case A — if_statement or conditional_expression:
 *   call1 is a descendant of the consequence field AND
 *   call2 is a descendant of the alternative field (or vice versa).
 *   The consequence fires XOR the alternative fires.
 *
 * Case B — compound_statement (a sequential block):
 *   call1 appears before call2 (in source order), AND
 *   call1 is wrapped in a return_statement.
 *   If call1 executes and returns, call2 is unreachable.
 */
function areMutuallyExclusive(call1, call2) {
    // Build ancestor-id chains from each call up to the tree root.
    var buildPath = function (node) {
        var path = [];
        var cur = node;
        while (cur) {
            path.push(cur);
            cur = cur.parent;
        }
        path.reverse(); // root → node
        return path;
    };
    var path1 = buildPath(call1);
    var path2 = buildPath(call2);
    // Walk the shared prefix to find the LCA.
    var lca = null;
    var child1 = null;
    var child2 = null;
    for (var i = 0; i < Math.min(path1.length, path2.length); i++) {
        if (path1[i].id === path2[i].id) {
            lca = path1[i];
        }
        else {
            child1 = path1[i]; // child of LCA on the path to call1
            child2 = path2[i]; // child of LCA on the path to call2
            break;
        }
    }
    if (!lca || !child1 || !child2)
        return false;
    // Helper: is 'node' a descendant of 'ancestor'?
    var isDescendantOf = function (node, ancestor) {
        var cur = node;
        while (cur) {
            if (cur.id === ancestor.id)
                return true;
            cur = cur.parent;
        }
        return false;
    };
    // ── Case A: LCA is if_statement or conditional_expression ────────────────
    if (lca.type === 'if_statement' || lca.type === 'conditional_expression') {
        var cons = lca.childForFieldName('consequence');
        var alt = lca.childForFieldName('alternative');
        if (cons && alt) {
            // One call in consequence, the other in alternative.
            if (isDescendantOf(call1, cons) && isDescendantOf(call2, alt))
                return true;
            if (isDescendantOf(call2, cons) && isDescendantOf(call1, alt))
                return true;
        }
    }
    // ── Case B: LCA is a compound_statement (sequential block) ───────────────
    // The earlier call must be wrapped in a return_statement for mutual exclusivity.
    if (lca.type === 'compound_statement') {
        // Determine source order: the child that comes first in the child list.
        var idx1 = -1, idx2 = -1;
        for (var i = 0; i < lca.childCount; i++) {
            var ch = lca.child(i);
            if (!ch)
                continue;
            if (ch.id === child1.id)
                idx1 = i;
            if (ch.id === child2.id)
                idx2 = i;
        }
        if (idx1 < 0 || idx2 < 0)
            return false;
        // The earlier child (lower index) must contain a return_statement that
        // encloses the earlier call — ensuring the function exits before the
        // later call is reached.
        var earlierCall = idx1 < idx2 ? call1 : call2;
        var cur = earlierCall.parent;
        while (cur && cur.id !== lca.id) {
            if (cur.type === 'return_statement')
                return true;
            cur = cur.parent;
        }
    }
    return false;
}
/**
 * Safely identifies recursive binary-search-style functions.
 *
 * Returns true when ALL FOUR structural conditions hold:
 *
 * 1. MIDPOINT: the function body contains a declaration of the form
 *      <id> = (<id> + <id>) / 2
 *    (detectMidVariable returns non-null).
 *
 * 2. NO LOOPS: no self-call occurs inside a for/while/do body.
 *    (hasLoopedSelfCall returns false).
 *
 * 3. ENDPOINT PRESERVATION: every argument of every self-call is either
 *    a plain identifier or  <mid>±1  (isLegalCallArg), AND at least one
 *    call references the mid variable.
 *    (verifyEndpointPreservation returns true).
 *
 * 4. PAIRWISE MUTUAL EXCLUSIVITY: for every pair of self-calls, the pair
 *    is structurally mutually exclusive (areMutuallyExclusive).
 *
 * Any failure returns false immediately, causing Pass 4 to fall through to
 * the existing Unknown path — exactly like DSU and memoization fingerprints.
 */
function isRecursiveBinarySearch(fnNode, fnName) {
    // ── Condition 1: midpoint declaration ──────────────────────────────────
    var midName = detectMidVariable(fnNode);
    if (midName === null)
        return false;
    // Extract the strict whitelist of legal endpoint identifiers:
    // only formal parameter names + midName itself.
    var paramNames = collectParamNames(fnNode);
    // Collect all self-calls in the function.
    var allCallNodes = fnNode.descendantsOfType('call_expression');
    var selfCalls = allCallNodes.filter(function (c) {
        var f = c.childForFieldName('function');
        return f !== null && f.type === 'identifier' && f.text === fnName;
    });
    if (selfCalls.length === 0)
        return false;
    // ── Condition 2: no self-calls inside loops ─────────────────────────────
    if (hasLoopedSelfCall(fnNode, fnName))
        return false;
    // ── Condition 3: endpoint-preservation for all args (strict whitelist) ──
    if (!verifyEndpointPreservation(selfCalls, midName, paramNames))
        return false;
    // ── Condition 4: every pair of self-calls is mutually exclusive ─────────
    for (var i = 0; i < selfCalls.length; i++) {
        for (var j = i + 1; j < selfCalls.length; j++) {
            if (!areMutuallyExclusive(selfCalls[i], selfCalls[j]))
                return false;
        }
    }
    return true;
}
