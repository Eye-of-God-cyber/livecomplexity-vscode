import { Tree, SyntaxNode } from 'web-tree-sitter';
import { ExtractedLoop, extractFunctionLoops, extractFunctionName, buildMacroRegistry } from '../parser/astUtils';
import { buildTypeContext, TypeContext } from '../parser/typeTracker';
import {
  ComplexityClass,
  ComplexityNode,
  ComplexityResult,
  ConfidenceLevel,
  DocumentComplexityResult,
  FunctionComplexityResult
} from './complexityNode';
import { LoopClassification } from '../parser/loopClassifier';

function getBaseComplexity(classification: LoopClassification | 'custom', customComplexity?: ComplexityNode, boundVar?: string | string[]): ComplexityNode {
  if (classification === 'custom' && customComplexity) {
    return customComplexity;
  }

  // D5.2 Compound Bounds: If boundVar is an array (e.g. ['n', 'm']), construct a SumNode
  if (Array.isArray(boundVar)) {
    if (boundVar.length === 0) {
      // Empty array means constants only or atomic failure fallback. Treat as abstract.
      return getBaseComplexity(classification, customComplexity, undefined);
    }
    if (boundVar.length === 1) {
      // Single element array unwraps to string
      return getBaseComplexity(classification, customComplexity, boundVar[0]);
    }
    
    // For linear and linear_logarithmic, a compound bound O(n + m) is exactly equal to O(n) + O(m)
    // We recursively create a node for each variable, then wrap them in a SumNode.
    if (classification === 'linear' || classification === 'linear_logarithmic') {
      const terms = boundVar.map(v => getBaseComplexity(classification, customComplexity, v));
      return { power: 1, logPower: 0, loglogPower: 0, isUnknown: false, sumTerms: terms };
    }
    // For exponential, O(2^(n+m)) = O(2^n * 2^m), which is correctly represented by expVars: ['n', 'm']
    if (classification === 'exponential') {
      return { power: 0, logPower: 0, loglogPower: 0, isUnknown: false, expVars: [...boundVar] };
    }
  }

  const singleVar = typeof boundVar === 'string' ? boundVar : undefined;

  switch (classification) {
    case 'constant':
      return { power: 0, logPower: 0, loglogPower: 0, isUnknown: false };
    case 'linear':
      return { power: 1, logPower: 0, loglogPower: 0, isUnknown: false, linearVars: classification === 'linear' && singleVar ? [singleVar] : undefined };
    case 'logarithmic':
      return { power: 0, logPower: 1, loglogPower: 0, isUnknown: false };
    case 'fractional':
      return { power: 0.5, logPower: 0, loglogPower: 0, isUnknown: false };
    case 'linear_logarithmic':
      return { power: 1, logPower: 1, loglogPower: 0, isUnknown: false, linearVars: singleVar ? [singleVar] : undefined };
    case 'graph_traversal':
      return { power: 1, logPower: 0, loglogPower: 0, isUnknown: false, isGraphSum: true };
    case 'graph_log_traversal':
      return { power: 1, logPower: 1, loglogPower: 0, isUnknown: false, isGraphSumLog: true };
    case 'exponential':
      return { power: 0, logPower: 0, loglogPower: 0, isUnknown: false,
               expVars: singleVar ? [singleVar] : [] };
    case 'unknown':
    default:
      return { power: 0, logPower: 0, loglogPower: 0, isUnknown: true };
  }
}

/**
 * Bug D fix: D5.0 Positional Argument Substitution.
 * Recursively clones a ComplexityNode and replaces all occurrences of formal
 * parameter names with the corresponding call-site argument canonical names.
 */
function substituteNodeVars(node: ComplexityNode, calleeParamNames: string[], callArgVars: string[]): ComplexityNode {
  if (calleeParamNames.length === 0 || callArgVars.length === 0) {
    return node;
  }

  const substitutionMap = new Map<string, string>();
  for (let i = 0; i < Math.min(calleeParamNames.length, callArgVars.length); i++) {
    substitutionMap.set(calleeParamNames[i], callArgVars[i]);
  }

  function cloneAndSubstitute(n: ComplexityNode): ComplexityNode {
    const clone = { ...n };
    let didSubstitute = false;
    if (clone.linearVars) {
      clone.linearVars = clone.linearVars.map(v => {
        if (substitutionMap.has(v)) {
          didSubstitute = true;
          return substitutionMap.get(v)!;
        }
        return v;
      });
    }
    if (clone.expVars) {
      clone.expVars = clone.expVars.map(v => {
        if (substitutionMap.has(v)) {
          didSubstitute = true;
          return substitutionMap.get(v)!;
        }
        return v;
      });
    }
    if (clone.sumTerms) {
      clone.sumTerms = clone.sumTerms.map(t => cloneAndSubstitute(t));
    }
    if (didSubstitute) {
      clone.isSubstituted = true;
    }
    return clone;
  }

  return cloneAndSubstitute(node);
}

// ─── D4.7: Sum-of-complexities algebra helpers ────────────────────────────────
//
// These five helpers implement the mergeAndReduce algorithm that underlies both
// addNode (sequential composition) and the extended maxNode (dominance with Sum
// Node inputs). They are pure functions with no side-effects.
//
// API contract:
//   flattenSum       — extracts Scalar Node list from any node (flattens Sum Nodes)
//   canonicalVarSet  — returns a sorted comma-joined key for linearVars
//   structurallyEqual — deep structural equality for Scalar Nodes (no string formatting)
//   strictlyDominates — true iff X asymptotically dominates Y over the same variable set
//   mergeAndReduce   — eliminates dominated/duplicate terms; returns Scalar or Sum Node

/**
 * Returns the flat list of Scalar Nodes contained in `node`.
 * - If node is a Sum Node: returns node.sumTerms (already flat by invariant).
 * - If node is a Scalar Node: returns [node].
 * Precondition: node.sumTerms elements are never Sum Nodes themselves (invariant).
 */
function flattenSum(node: ComplexityNode): ComplexityNode[] {
  return (node.sumTerms && node.sumTerms.length > 0) ? node.sumTerms : [node];
}

/**
 * Returns a canonical multiset string key for the linearVars of a Scalar Node.
 * - Sorts the variable names alphabetically.
 * - Duplicates are preserved (e.g., ['n', 'n', 'm'] -> 'm,n,n').
 * - If linearVars is missing but the node has polynomial degree, defaults to implicit 'n'.
 */
function getCanonicalMultiset(node: ComplexityNode): string {
  if (node.linearVars && node.linearVars.length > 0) {
    return [...node.linearVars].sort().join(',');
  }
  if (node.power > 0 || node.logPower > 0 || node.loglogPower > 0) {
    const count = Math.max(1, Math.floor(node.power));
    return Array(count).fill('n').join(',');
  }
  return '';
}

/**
 * Returns the set of unique variables used by a Scalar Node.
 * - Used for dominance checks (e.g., checking if one node's variables are a subset of another's).
 */
function getUniqueVars(node: ComplexityNode): Set<string> {
  if (node.power === 0 && node.logPower === 0 && node.loglogPower === 0 && !node.isGraphSum && !node.isGraphSumLog) {
    return new Set();
  }
  if (node.linearVars && node.linearVars.length > 0) {
    return new Set(node.linearVars);
  }
  return new Set(['n']); // implicit default variable
}

/**
 * Structural equality for two Scalar Nodes.
 * Two Scalar Nodes are equal iff every field that affects their complexity class
 * is identical. This comparison is purely structural — it does NOT use formatted
 * strings or any string-based heuristics.
 *
 * Returns false if either node is a Sum Node (Sum Nodes are never directly compared
 * — mergeAndReduce works on their constituent Scalar Nodes).
 */
function structurallyEqual(a: ComplexityNode, b: ComplexityNode): boolean {
  if (a.sumTerms || b.sumTerms) return false; // Sum Nodes: not directly comparable
  if (a.isUnknown !== b.isUnknown) return false;
  if (a.isUnknown && b.isUnknown) return true; // both Unknown
  if (a.isGraphSum !== b.isGraphSum) return false;
  if (a.isGraphSumLog !== b.isGraphSumLog) return false;
  if (a.power !== b.power) return false;
  if (a.logPower !== b.logPower) return false;
  if (a.loglogPower !== b.loglogPower) return false;
  // expVars: canonical sorted comparison
  const aExp = (a.expVars ?? []).slice().sort().join(',');
  const bExp = (b.expVars ?? []).slice().sort().join(',');
  if (aExp !== bExp) return false;
  // linearVars: sorted multiset comparison
  if (getCanonicalMultiset(a) !== getCanonicalMultiset(b)) return false;
  return true;
}

/**
 * Returns true iff Scalar Node X strictly asymptotically dominates Scalar Node Y.
 *
 * "Strictly dominates" means X grows faster than Y as input size → ∞ over the same
 * variable set. A tie (same class) returns false. Incommensurable variables return false.
 *
 * Rules (in order):
 *  1. Unknown nodes never dominate or are dominated.
 *  2. Exponential dominates any polynomial. Two exponentials: no strict dominance asserted
 *     (we cannot order 2ⁿ vs 2ᵐ without knowing n vs m).
 *  3. Graph nodes (isGraphSum / isGraphSumLog) are treated as incommensurable with all
 *     polynomial nodes (Decision 1: no heuristic assumption about V,E vs n).
 *     isGraphSumLog dominates isGraphSum (O((V+E)logV) > O(V+E) — same graph domain).
 *  4. For two polynomial Scalar Nodes: strict dominance requires the SAME canonical
 *     variable set. Different variable sets → incommensurable → return false.
 *  5. Same variable set: compare power, then logPower, then loglogPower strictly.
 */
function strictlyDominates(x: ComplexityNode, y: ComplexityNode): boolean {
  // Rule 1: Unknown
  if (x.isUnknown || y.isUnknown) return false;

  // Shared flag computation
  const xIsExp = !!(x.expVars && x.expVars.length > 0);
  const yIsExp = !!(y.expVars && y.expVars.length > 0);
  const xIsGraph = !!(x.isGraphSum || x.isGraphSumLog);
  const yIsGraph = !!(y.isGraphSum || y.isGraphSumLog);

  // Rule 2: O(1) special case.
  // A pure constant node (power=0, logPower=0, loglogPower=0, no special flags, no expVars)
  // has no variable dependency. Any non-constant Scalar Node X (power>0 OR logPower>0 OR
  // loglogPower>0 OR graph OR exp) strictly dominates O(1), regardless of variable sets.
  const yIsConstant = !yIsGraph && !yIsExp && y.power === 0 && y.logPower === 0 && y.loglogPower === 0;
  const xIsConstant = !xIsGraph && !xIsExp && x.power === 0 && x.logPower === 0 && x.loglogPower === 0;
  if (xIsConstant) return false; // O(1) dominates nothing
  if (yIsConstant) return true;  // anything non-constant dominates O(1)

  // Rule 3: Exponential vs polynomial
  if (xIsExp && !yIsExp) return true;  // exponential dominates polynomial
  if (!xIsExp && yIsExp) return false;
  if (xIsExp && yIsExp) return false;  // both exponential: incommensurable

  // Rule 4: Graph nodes — incommensurable with polynomial; isGraphSumLog > isGraphSum
  if (xIsGraph && !yIsGraph) return false; // graph vs polynomial: incommensurable
  if (!xIsGraph && yIsGraph) return false; // polynomial vs graph: incommensurable
  if (xIsGraph && yIsGraph) {
    // Both graph: isGraphSumLog dominates isGraphSum
    if (x.isGraphSumLog && y.isGraphSum) return true;
    return false; // same type (isGraphSum==isGraphSum or isGraphSumLog==isGraphSumLog)
  }

  // Rule 5: Variable domain comparison.
  // X can only strictly dominate Y if Y's variables are a subset of X's variables.
  // E.g., O(n^2) and O(n) share {n}. O(nm) {n,m} dominates O(n) {n}.
  // But O(n) {n} cannot dominate O(m) {m} or O(nm) {n,m}.
  const varsX = getUniqueVars(x);
  const varsY = getUniqueVars(y);
  const isSubset = (sub: Set<string>, sup: Set<string>) => [...sub].every(v => sup.has(v));
  
  const sameVars = varsX.size === varsY.size && isSubset(varsX, varsY);
  if (sameVars) {
    // Exact same domain — compare degree strictly
    if (x.power > y.power) return true;
    if (x.power < y.power) return false;
    if (x.logPower > y.logPower) return true;
    if (x.logPower < y.logPower) return false;
    if (x.loglogPower > y.loglogPower) return true;
    return false; // pure tie
  }

  if (isSubset(varsY, varsX)) {
    // Y operates on a strict subset of X's variables.
    // X dominates Y only if its degree is strictly higher.
    // (If degree is equal, e.g., O(nm) vs O(n^2), neither dominates).
    if (x.power > y.power) return true;
    if (x.power < y.power) return false;
    if (x.logPower > y.logPower) return true;
    if (x.logPower < y.logPower) return false;
    if (x.loglogPower > y.loglogPower) return true;
    return false;
  }

  // varsX is a strict subset of varsY, or they are disjoint. X cannot dominate Y.
  return false;
}

/**
 * D4.7 core: Reduces a list of Scalar Nodes to the minimal set of mutually
 * incommensurable, non-dominated, deduplicated terms. Returns a Scalar Node when
 * only one term survives, or a Sum Node otherwise.
 *
 * Algorithm:
 *  1. Guard: if any input term is Unknown → return Unknown immediately.
 *  2. Flatten: expand any Sum Node inputs (defensive; precondition is they are Scalar).
 *  3. Eliminate dominated: for every pair (X, Y), if strictlyDominates(X,Y), remove Y.
 *     Repeat until stable (iterative fixpoint; terminates because the list shrinks).
 *  4. Deduplicate: remove structurally identical survivors.
 *  5. Sort survivors in canonical order:
 *       (a) isGraphSumLog before isGraphSum before exponential before polynomial
 *       (b) descending power, descending logPower, descending loglogPower
 *       (c) ascending canonical linearVars key as final tie-break
 *  6. Return: single survivor → Scalar Node; multiple → Sum Node { sumTerms: survivors }.
 *
 * Correctness property: the result is always an upper bound of the true complexity.
 * Proof: a term Y is removed only when ∃ surviving X with strictlyDominates(X,Y)=true,
 * meaning f_X asymptotically absorbs f_Y. The remaining terms are incommensurable.
 */
function mergeAndReduce(terms: ComplexityNode[]): ComplexityNode {
  // Step 1: Unknown propagation
  if (terms.some(t => t.isUnknown)) {
    return { power: 0, logPower: 0, loglogPower: 0, isUnknown: true };
  }

  // Step 2: Flatten (defensive — callers should only pass Scalar Nodes)
  const flat: ComplexityNode[] = [];
  for (const t of terms) {
    if (t.sumTerms && t.sumTerms.length > 0) {
      flat.push(...t.sumTerms);
    } else {
      flat.push(t);
    }
  }

  // Step 3: Eliminate dominated terms (iterative fixpoint)
  let survivors = [...flat];
  let changed = true;
  while (changed) {
    changed = false;
    outer: for (let i = 0; i < survivors.length; i++) {
      for (let j = 0; j < survivors.length; j++) {
        if (i === j) continue;
        if (strictlyDominates(survivors[i], survivors[j])) {
          survivors.splice(j, 1);
          changed = true;
          break outer;
        }
      }
    }
  }

  // Step 4: Deduplicate structurally equal survivors
  const deduped: ComplexityNode[] = [];
  for (const s of survivors) {
    if (!deduped.some(d => structurallyEqual(d, s))) {
      deduped.push(s);
    }
  }

  // Step 5: Canonical sort
  deduped.sort((a, b) => {
    // (a) Graph log > graph > exponential > polynomial
    const aRank = a.isGraphSumLog ? 4 : a.isGraphSum ? 3 : (a.expVars && a.expVars.length > 0) ? 2 : 1;
    const bRank = b.isGraphSumLog ? 4 : b.isGraphSum ? 3 : (b.expVars && b.expVars.length > 0) ? 2 : 1;
    if (aRank !== bRank) return bRank - aRank; // descending rank
    // (b) Descending power, logPower, loglogPower
    if (a.power !== b.power) return b.power - a.power;
    if (a.logPower !== b.logPower) return b.logPower - a.logPower;
    if (a.loglogPower !== b.loglogPower) return b.loglogPower - a.loglogPower;
    // (c) Ascending canonical linearVars multiset key as final tie-break
    return getCanonicalMultiset(a).localeCompare(getCanonicalMultiset(b));
  });

  // Step 6: Return
  if (deduped.length === 0) {
    // All terms cancelled (e.g., only O(1) terms that were dominated) — return O(1)
    return { power: 0, logPower: 0, loglogPower: 0, isUnknown: false };
  }
  if (deduped.length === 1) return deduped[0];
  return { power: 0, logPower: 0, loglogPower: 0, isUnknown: false, sumTerms: deduped };
}

/**
 * D4.7: addNode — sequential composition.
 *
 * Semantic: A and B are INDEPENDENT, SEQUENTIAL computations.
 * The total complexity is O(W_A + W_B).
 *
 * Mathematical basis: For non-negative functions, max(f,g) = Θ(f+g). When f and g
 * are incommensurable (different variable sets), neither max alone is a correct
 * representation — the Sum Node preserves the information about both contributions.
 * When one strictly dominates the other (same variable set, higher degree), the
 * dominated term is absorbed and the result is a Scalar Node.
 *
 * Call sites: M1 only — inferComplexity's sequential loop aggregation.
 *
 * MUST NOT be used at M3/M4/M5 (dominance-in-same-loop-body contexts).
 */
function addNode(a: ComplexityNode, b: ComplexityNode): ComplexityNode {
  if (a.isUnknown || b.isUnknown) {
    return { power: 0, logPower: 0, loglogPower: 0, isUnknown: true };
  }
  return mergeAndReduce([...flattenSum(a), ...flattenSum(b)]);
}

function multiplyNodes(a: ComplexityNode, b: ComplexityNode): ComplexityNode {
  if (a.isUnknown || b.isUnknown) {
    return { power: 0, logPower: 0, loglogPower: 0, isUnknown: true };
  }

  // D4.7: Sum × Sum guard. Structurally unreachable from the current AST pipeline
  // (a call_expression baseNode with sumTerms is always a leaf — it has no childLoops,
  // so analyzeLoopHierarchy returns before reaching multiplyNodes). If it ever fires
  // due to a future change, Unknown is the safe conservative result.
  if (a.sumTerms && b.sumTerms) {
    return { power: 0, logPower: 0, loglogPower: 0, isUnknown: true };
  }

  // D4.7: Scalar × Sum (and symmetric Sum × Scalar): distribute by the distributive law.
  // O(s) × O(T₁ + T₂ + …) = O(s·T₁ + s·T₂ + …). Exact — no approximation.
  if (a.sumTerms && a.sumTerms.length > 0) {
    // Sum on left — treat symmetrically (multiplication is commutative).
    return multiplyNodes(b, a);
  }
  if (b.sumTerms && b.sumTerms.length > 0) {
    // Scalar × Sum: distribute. Each b.sumTerms[i] is a Scalar Node (invariant).
    const distributed = b.sumTerms.map(t => multiplyNodes(a, t));
    return mergeAndReduce(distributed);
  }

  // D5.5: Graph-sum nodes cannot mathematically absorb symbolic multipliers without
  // representing O(mV + mE). Since the engine does not support this representation,
  // we strictly return Unknown if multiplied by any non-constant operand to prevent
  // silent information loss.
  const isAGraph = a.isGraphSumLog || a.isGraphSum;
  const isBGraph = b.isGraphSumLog || b.isGraphSum;
  
  if (isAGraph || isBGraph) {
    if (isAGraph && isBGraph) {
      return { power: 0, logPower: 0, loglogPower: 0, isUnknown: true };
    }
    const graphNode = isAGraph ? a : b;
    const otherNode = isAGraph ? b : a;
    
    const otherIsConstant = otherNode.power === 0 && otherNode.logPower === 0 && 
                            otherNode.loglogPower === 0 && !(otherNode.expVars && otherNode.expVars.length > 0);
                            
    if (!otherIsConstant) {
      return { power: 0, logPower: 0, loglogPower: 0, isUnknown: true };
    }
    return graphNode;
  }
  // D3.1: Concatenate expVars arrays — exactly parallel to linearVars merging.
  // e.g. [n] + [m] → [n,m] → O(2ⁿ·2ᵐ)  |  [n] + [] → [n] → O(2ⁿ)
  let mergedExpVars: string[] | undefined = undefined;
  if (a.expVars || b.expVars) {
    mergedExpVars = [...(a.expVars || []), ...(b.expVars || [])];
  }
  let mergedVars: string[] | undefined = undefined;
  if (a.linearVars || b.linearVars) {
    mergedVars = [...(a.linearVars || []), ...(b.linearVars || [])];
  }

  return {
    power: a.power + b.power,
    logPower: a.logPower + b.logPower,
    loglogPower: Math.min(1, a.loglogPower + b.loglogPower),
    isUnknown: false,
    linearVars: mergedVars,
    expVars: mergedExpVars,
    isSubstituted: a.isSubstituted || b.isSubstituted
  };
}

/**
 * maxNode — dominance selection.
 *
 * Semantic: A and B are complexity contributions from the SAME computational context
 * (e.g. competing inner loops in the same loop body, or alternative branches).
 * We select the dominant one. NOT a sequential sum — using addNode here would
 * double-count work that happens in the same iterations.
 *
 * Call sites: M2 (sibling accumulation), M3 (harmonic), M4 (harmonic vs independent),
 *             M5 (amortized vs independent).
 *
 * D4.7 extension: when either operand is a Sum Node, delegates to mergeAndReduce.
 * mergeAndReduce eliminates dominated terms and preserves incommensurable ones.
 * Mathematical justification: max(f,g) = Θ(f+g) for non-negative functions, so
 * the merge-and-reduce result is always a correct upper bound.
 *
 * MUST NOT be used at M1 (sequential aggregation) — use addNode there.
 */
function maxNode(a: ComplexityNode, b: ComplexityNode): ComplexityNode {
  if (a.isUnknown || b.isUnknown) {
    return { power: 0, logPower: 0, loglogPower: 0, isUnknown: true };
  }
  // D4.7: If either operand is a Sum Node, route through mergeAndReduce.
  // This handles the case where a child function (via functionRegistry) returned a
  // Sum Node, and it is now being compared with another child or with the outer base.
  if ((a.sumTerms && a.sumTerms.length > 0) || (b.sumTerms && b.sumTerms.length > 0)) {
    return mergeAndReduce([...flattenSum(a), ...flattenSum(b)]);
  }
  // Both Scalar Nodes — existing dominance logic unchanged.
  // isGraphSumLog (O((V+E) log V), power=1 logPower=1) and
  // isGraphSum (O(V+E), power=1 logPower=0) use standard power/logPower dominance.
  if (a.isGraphSumLog && b.isGraphSumLog) return a;
  if (a.isGraphSum    && b.isGraphSum)    return a;
  // D3.1: Exponential always dominates polynomial.
  // Both expVars non-empty: longer total exponent list wins (conservative tie-break).
  const aIsExp = !!(a.expVars && a.expVars.length > 0);
  const bIsExp = !!(b.expVars && b.expVars.length > 0);
  if (aIsExp && !bIsExp) return a;
  if (bIsExp && !aIsExp) return b;
  if (aIsExp && bIsExp) {
    // Both exponential — use longer expVars as a proxy for dominant exponent.
    // No symbolic comparison; tie falls to `a` (first encountered, conservative).
    return a.expVars!.length >= b.expVars!.length ? a : b;
  }
  // Standard polynomial dominance.
  if (a.power > b.power) return a;
  if (b.power > a.power) return b;
  if (a.logPower > b.logPower) return a;
  if (b.logPower > a.logPower) return b;
  if (a.loglogPower >= b.loglogPower) return a;
  return b;
}

function mergeConfidence(a: ConfidenceLevel, b: ConfidenceLevel): ConfidenceLevel {
  if (a === 'low' || b === 'low') return 'low';
  if (a === 'medium' || b === 'medium') return 'medium';
  return 'high';
}

function formatComplexity(node: ComplexityNode, preserveVars: boolean = false): ComplexityClass {
  if (node.isUnknown) return 'Unknown';

  // D4.7: Sum Node formatting — checked before all Scalar paths.
  // Each term in sumTerms is a Scalar Node; formatComplexity recurse cannot loop.
  // Terms are already in canonical order (mergeAndReduce Step 5) so output is
  // deterministic: same ComplexityNode always produces the same string.
  // We pass preserveVars=true so that individual terms like O(m) are not forced to O(n).
  if (node.sumTerms && node.sumTerms.length > 0) {
    const parts = node.sumTerms.map(t => {
      const s = formatComplexity(t, true);
      // Strip outer 'O(' and ')' to get the inner expression for joining.
      return s.startsWith('O(') ? s.slice(2, -1) : s;
    });
    return 'O(' + parts.join(' + ') + ')';
  }

  // D2.2 / D2.3: Graph traversal summation — checked before all polynomial formatting.
  // isGraphSumLog (Dijkstra, O((V+E) log V)) must be checked before isGraphSum (BFS/DFS, O(V+E))
  // because both flags could theoretically coexist in maxNode comparisons.
  if (node.isGraphSumLog) return 'O((V+E) log V)';
  if (node.isGraphSum)    return 'O(V+E)';

  // D3.1: Exponential formatting — checked before polynomial.
  // Any node with expVars set is routed through formatExponential.
  if (node.expVars && node.expVars.length > 0) return formatExponential(node);
  
  // Mixed / Heuristic check:
  // If the number of extracted linear symbolic variables does NOT perfectly match the expected linear polynomial degree,
  // we MUST abort symbolic formatting and fall back to the exact 'n' representation.
  const explicitVars = node.linearVars || [];
  const expectedLinearFactors = Math.floor(node.power);
  const isFullySymbolic = explicitVars.length === expectedLinearFactors;
  
  // If the entire complexity is just a single linear factor, force fallback to 'O(n)'
  // to perfectly preserve single-loop test expectations like test 16: for(i<m) -> O(n).
  // Symbolic formatting only triggers when there are MULTIPLE explicit variables multiplying,
  // OR when we are inside a Sum Node (preserveVars is true) and need to distinguish n vs m.
  const isSingleVariable = !preserveVars && !node.isSubstituted && explicitVars.length === 1 && node.power === 1 && node.logPower === 0 && node.loglogPower === 0 && !explicitVars[0].includes('.');
  
  // Backward compatibility fast-paths for pure 'n', OR when we abort symbolic formatting
  if (!isFullySymbolic || explicitVars.length === 0 || explicitVars.every(v => v === 'n') || isSingleVariable) {
    if (node.power === 1 && node.logPower === 0 && node.loglogPower === 1) return 'O(n log log n)';
    if (node.power === 0 && node.logPower === 0) return 'O(1)';
    if (node.power === 0 && node.logPower === 1) return 'O(log n)';
    if (node.power === 0 && node.logPower === 2) return 'O(log² n)';
    if (node.power === 0 && node.logPower >= 3) return 'O(log³ n)';
    if (node.power === 0.5 && node.logPower === 0) return 'O(sqrt n)';
    if (node.power === 1 && node.logPower === 0) return 'O(n)';
    if (node.power === 1 && node.logPower === 1) return 'O(n log n)';
    if (node.power === 1.5 && node.logPower === 0) return 'O(n sqrt n)';
    if (node.power === 1 && node.logPower === 2) return 'O(n log² n)';
    if (node.power === 2 && node.logPower === 0) return 'O(n²)';
    if (node.power === 2 && node.logPower === 1) return 'O(n² log n)';
    if (node.power === 2.5 && node.logPower === 0) return 'O(n² sqrt n)';
    if (node.power === 1.5 && node.logPower === 1) return 'O(n sqrt n log n)';
    if (node.power >= 3) {
      const powFloor = Math.floor(node.power);
      const isFractional = (node.power % 1 === 0.5);
      const powStr = powFloor === 3 ? '³' : `^${powFloor}`;
      const fracStr = isFractional ? ' sqrt n' : '';
      if (node.logPower === 0) return `O(n${powStr}${fracStr})`;
      if (node.logPower === 1) return `O(n${powStr}${fracStr} log n)`;
      if (node.logPower === 2) return `O(n${powStr}${fracStr} log² n)`;
      return `O(n${powStr}${fracStr} log³ n)`;
    }
  }

  // Multi-variable formatting
  const allVars = [...explicitVars];

  allVars.sort((a, b) => {
    if (a === 'n') return -1;
    if (b === 'n') return 1;
    return a.localeCompare(b);
  });

  const varCounts = new Map<string, number>();
  for (const v of allVars) {
    varCounts.set(v, (varCounts.get(v) || 0) + 1);
  }

  const polyTerms: string[] = [];
  for (const [v, count] of varCounts.entries()) {
    if (count === 1) polyTerms.push(v);
    else if (count === 2) polyTerms.push(v + '²');
    else if (count === 3) polyTerms.push(v + '³');
    else polyTerms.push(v + '^' + count);
  }

  let result = polyTerms.join('');

  const logVar = explicitVars.length > 0 ? explicitVars[0] : 'n';

  if (node.power % 1 === 0.5) {
    result += (result ? ' ' : '') + `sqrt ${logVar}`;
  }

  if (node.logPower === 1) {
    result += (result ? ' ' : '') + `log ${logVar}`;
  } else if (node.logPower === 2) {
    result += (result ? ' ' : '') + `log² ${logVar}`;
  } else if (node.logPower >= 3) {
    result += (result ? ' ' : '') + `log³ ${logVar}`;
  }

  if (node.loglogPower === 1) {
    result += (result ? ' ' : '') + `log log ${logVar}`;
  }

  if (!result) return 'O(1)';
  return `O(${result})`;
}
// ─── D3.1: Superscript map and exponential formatter ──────────────────────────────────────────────

const SUPERSCRIPT_MAP: Record<string, string> = {
  n: '\u207F', m: '\u1D50', k: '\u1D4F', r: '\u02B3', i: '\u2071', j: '\u02B2',
  a: '\u1D43', b: '\u1D47', c: '\u1D9C', d: '\u1D48', p: '\u1D56',
};

function toSuperscript(varName: string): string {
  return (varName.length === 1 && SUPERSCRIPT_MAP[varName])
    ? SUPERSCRIPT_MAP[varName]
    : `^${varName}`; // fallback for multi-char or unmapped variables
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
function formatExponential(node: ComplexityNode): ComplexityClass {
  // ── 1. Exponential part ──────────────────────────────────────────────────────────
  const expPart = node.expVars!.map(v => `2${toSuperscript(v)}`).join('\u00B7');

  // ── 2. Polynomial prefix (from power + linearVars) ──────────────────────────────
  let polyPrefix = '';
  if (node.power > 0) {
    const explicitVars = node.linearVars || [];
    const expectedLinearFactors = Math.floor(node.power);
    const isFullySymbolic = explicitVars.length === expectedLinearFactors;

    if (isFullySymbolic && explicitVars.length > 0 && !explicitVars.every(v => v === 'n')) {
      // Multi-variable symbolic: e.g. ['n','m'] → 'nm'
      const varCounts = new Map<string, number>();
      for (const v of explicitVars) varCounts.set(v, (varCounts.get(v) || 0) + 1);
      const sortedKeys = [...varCounts.keys()].sort((a, b) =>
        a === 'n' ? -1 : b === 'n' ? 1 : a.localeCompare(b)
      );
      const polyTerms: string[] = [];
      for (const v of sortedKeys) {
        const cnt = varCounts.get(v)!;
        if (cnt === 1) polyTerms.push(v);
        else if (cnt === 2) polyTerms.push(v + '\u00B2');
        else if (cnt === 3) polyTerms.push(v + '\u00B3');
        else polyTerms.push(`${v}^${cnt}`);
      }
      polyPrefix = polyTerms.join('');
    } else {
      // Fallback: n, n², n³ ...
      const p = Math.floor(node.power);
      polyPrefix = p === 1 ? 'n' : p === 2 ? 'n\u00B2' : p === 3 ? 'n\u00B3' : `n^${p}`;
    }
  }

  // ── 3. Log suffix ──────────────────────────────────────────────────────────────────
  let logSuffix = '';
  if (node.logPower === 1) logSuffix = ' log n';
  else if (node.logPower === 2) logSuffix = ' log\u00B2 n';
  else if (node.logPower >= 3) logSuffix = ' log\u00B3 n';

  // ── 4. Combine: [poly·]exp[ log...] ──────────────────────────────────────────────
  const inner = polyPrefix ? `${polyPrefix}\u00B7${expPart}${logSuffix}` : `${expPart}${logSuffix}`;
  return `O(${inner})`;
}

export function inferComplexity(loops: ExtractedLoop[]): ComplexityResult {
  if (!loops || loops.length === 0) {
    return {
      complexity: 'O(1)',
      confidence: 'high',
      explanation: ['No loops detected. Complexity is O(1).'],
      node: { power: 0, logPower: 0, loglogPower: 0, isUnknown: false }
    };
  }

  let overallNode: ComplexityNode = { power: 0, logPower: 0, loglogPower: 0, isUnknown: false };
  let overallConfidence: ConfidenceLevel = 'high';
  const explanations: string[] = [];

  for (const loop of loops) {
    const { node, confidence, explanation } = analyzeLoopHierarchy(loop);
    
    // Check if the current loop dominates the overall complexity
    const isDominant = !node.isUnknown && !overallNode.isUnknown && 
                       (node.power > overallNode.power || (node.power === overallNode.power && node.logPower > overallNode.logPower));
    
    if (isDominant || overallNode.isUnknown === false && overallNode.power === 0 && overallNode.logPower === 0) {
      if (explanations.length > 0 && isDominant) {
        explanations.push(`Sequential loop at line ${loop.startLine + 1} dominates previous loops.`);
      }
    }

    // D4.7: addNode (not maxNode) for sequential aggregation (M1).
    // addNode correctly emits O(n+m) for incommensurable sequential loops instead
    // of silently dropping one variable. See proof in implementation_plan.md.
    overallNode = addNode(overallNode, node);
    overallConfidence = mergeConfidence(overallConfidence, confidence);
    explanations.push(...explanation);
  }

  // Deduplicate some explanations if needed, but linear flow is fine
  return {
    complexity: formatComplexity(overallNode),
    confidence: overallConfidence,
    explanation: explanations,
    node: overallNode
  };
}

function analyzeLoopHierarchy(loop: ExtractedLoop): { node: ComplexityNode, confidence: ConfidenceLevel, explanation: string[] } {
  let baseNode = getBaseComplexity(loop.classification, loop.customComplexity, loop.boundVar);

  // Bug D fix: D5.0 Positional Argument Substitution
  if (loop.classification === 'custom' && loop.calleeParamNames && loop.callArgVars) {
    baseNode = substituteNodeVars(baseNode, loop.calleeParamNames, loop.callArgVars);
  }

  // Re-inject boundVar into baseNode for linear cases
  if (loop.classification === 'linear' || loop.classification === 'linear_logarithmic') {
    if (loop.boundVar) {
      if (!Array.isArray(loop.boundVar)) {
        baseNode.linearVars = [loop.boundVar];
      }
      // If it's an array, getBaseComplexity already generated a SumNode, so do not override linearVars.
    }
  }
  // D3.1: Re-inject boundVar into expVars for exponential (bitmask) loops.
  if (loop.classification === 'exponential' && loop.boundVar) {
    if (!Array.isArray(loop.boundVar)) {
      baseNode.expVars = [loop.boundVar];
    }
  }

  const explanations: string[] = [];
  let currentConfidence = loop.confidence;
  
  explanations.push(`Loop at line ${loop.startLine + 1} classified as ${loop.classification}.`);

  if (!loop.childLoops || loop.childLoops.length === 0) {
    return { node: baseNode, confidence: currentConfidence, explanation: explanations };
  }

  // ── D2.2: Graph traversal short-circuit (O(V+E)) ──────────────────────────────
  // When the outer loop is a confirmed BFS/DFS traversal, the inner for_range_loop
  // is the edge iteration. O(V) outer + O(E) inner = O(V+E), NOT O(V*E).
  if (baseNode.isGraphSum) {
    for (const child of loop.childLoops) {
      const childResult = analyzeLoopHierarchy(child);
      explanations.push(...childResult.explanation);
    }
    explanations.push(
      `Graph traversal at line ${loop.startLine + 1}: outer while (vertices) + ` +
      `inner for_range_loop (edges) = O(V+E).`
    );
    return { node: baseNode, confidence: currentConfidence, explanation: explanations };
  }

  // ── D2.3: Dijkstra / priority-queue short-circuit (O((V+E) log V)) ────────────
  // The priority_queue push/pop/emplace inside the traversal are NOT double-counted:
  // O((V+E) log V) already accounts for the log factor from the heap operations.
  // Child explanations are collected for hover display but do NOT alter complexity.
  if (baseNode.isGraphSumLog) {
    for (const child of loop.childLoops) {
      const childResult = analyzeLoopHierarchy(child);
      explanations.push(...childResult.explanation);
    }
    explanations.push(
      `Dijkstra / priority-queue graph traversal at line ${loop.startLine + 1}: ` +
      `outer while (vertices/edges) + priority_queue ops (log V) = O((V+E) log V).`
    );
    return { node: baseNode, confidence: currentConfidence, explanation: explanations };
  }

  // Partition children into harmonic, amortized, and independent sets.
  const harmonicChildren  = loop.childLoops.filter(c => c.stepDependentOn !== undefined);
  const amortizedChildren = loop.childLoops.filter(c => c.isAmortized === true && c.stepDependentOn === undefined);
  const independentChildren = loop.childLoops.filter(
    c => c.stepDependentOn === undefined && c.isAmortized !== true
  );

  // ── Independent children: classic max-then-multiply ──────────────────────
  let maxIndependentNode: ComplexityNode = { power: 0, logPower: 0, loglogPower: 0, isUnknown: false };
  let indepConfidence: ConfidenceLevel = 'high';
  for (const child of independentChildren) {
    const childResult = analyzeLoopHierarchy(child);
    maxIndependentNode = maxNode(maxIndependentNode, childResult.node);
    indepConfidence = mergeConfidence(indepConfidence, childResult.confidence);
    explanations.push(...childResult.explanation);
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
  let maxHarmonicNode: ComplexityNode = { power: 0, logPower: 0, loglogPower: 0, isUnknown: false };
  let harmonicConfidence: ConfidenceLevel = 'high';
  if (harmonicChildren.length > 0) {
    // We pick the best (dominant) harmonic child for its own self-complexity,
    // but we do NOT multiply: instead we apply the summation formula.
    for (const child of harmonicChildren) {
      const childResult = analyzeLoopHierarchy(child);
      harmonicConfidence = mergeConfidence(harmonicConfidence, childResult.confidence);
      explanations.push(...childResult.explanation);
    }

    let harmonicResultNode: ComplexityNode;
    if (baseNode.power === 1 && baseNode.logPower === 0 && baseNode.loglogPower === 0) {
      // Outer is O(n): Σ(n/i) for i=1..n = O(n log n)
      harmonicResultNode = { power: 1, logPower: 1, loglogPower: 0, isUnknown: false, linearVars: baseNode.linearVars };
      explanations.push(
        `Step-dependent inner loop at line ${harmonicChildren[0].startLine + 1} creates harmonic series: ` +
        `outer O(n) × Σ(n/i) = O(n log n).`
      );
    } else if (baseNode.power === 0.5 && baseNode.logPower === 0 && baseNode.loglogPower === 0) {
      // Outer is O(sqrt n): Σ(n/i) for i=1..sqrt(n) = O(n log log n)  [Sieve]
      harmonicResultNode = { power: 1, logPower: 0, loglogPower: 1, isUnknown: false, linearVars: baseNode.linearVars };
      explanations.push(
        `Step-dependent inner loop at line ${harmonicChildren[0].startLine + 1} with outer O(sqrt n): ` +
        `sieve-style harmonic sum = O(n log log n).`
      );
    } else {
      // For other outer complexities, fall back to conservative multiply.
      // e.g. outer O(n log n) × inner O(n) is still O(n² log n) upper bound.
      const childSelfResult = analyzeLoopHierarchy(harmonicChildren[0]);
      harmonicResultNode = multiplyNodes(baseNode, childSelfResult.node);
      explanations.push(
        `Step-dependent inner loop at line ${harmonicChildren[0].startLine + 1}: ` +
        `harmonic reduction not applicable for outer ${formatComplexity(baseNode)}, using conservative multiply.`
      );
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
  let amortizedConfidence: ConfidenceLevel = 'high';
  for (const child of amortizedChildren) {
    const childResult = analyzeLoopHierarchy(child);
    amortizedConfidence = mergeConfidence(amortizedConfidence, childResult.confidence);
    explanations.push(...childResult.explanation);
    explanations.push(
      `Inner loop at line ${child.startLine + 1} is amortized: total work across all outer ` +
      `iterations is bounded by the outer loop's complexity.`
    );
  }

  // ── Combine: independent × outer, harmonic precomputed, amortized = free ─
  const independentTotal = multiplyNodes(baseNode, maxIndependentNode);
  currentConfidence = mergeConfidence(
    currentConfidence,
    mergeConfidence(indepConfidence, mergeConfidence(harmonicConfidence, amortizedConfidence))
  );

  let resultNode: ComplexityNode;
  const hasHarmonic   = harmonicChildren.length > 0;
  const hasAmortized  = amortizedChildren.length > 0;
  const hasIndependent = independentChildren.length > 0;

  if (hasHarmonic && !hasIndependent) {
    resultNode = maxHarmonicNode;
  } else if (hasHarmonic) {
    resultNode = maxNode(maxHarmonicNode, independentTotal);
  } else if (hasAmortized && !hasIndependent) {
    // Only amortized children — outer contributes its own base complexity.
    resultNode = baseNode;
  } else if (hasAmortized) {
    // Amortized + independent — max(baseNode, independentTotal) = independentTotal dominates.
    resultNode = maxNode(baseNode, independentTotal);
  } else {
    // Pure independent (original behavior).
    resultNode = independentTotal;
  }

  if (!resultNode.isUnknown && !baseNode.isUnknown) {
    if (baseNode.power === 0 && baseNode.logPower === 0) {
      explanations.push(`Outer loop at line ${loop.startLine + 1} is constant, so it does not multiply inner complexity.`);
    } else if (hasIndependent && !hasHarmonic && !hasAmortized) {
      const innerStr = formatComplexity(maxIndependentNode);
      const outerStr = formatComplexity(baseNode);
      const totalStr = formatComplexity(resultNode);
      explanations.push(`Nested ${innerStr} loop inside ${outerStr} loop multiply to produce ${totalStr}.`);
    }
  } else if (resultNode.isUnknown) {
    explanations.push(`Unknown complexity in nested hierarchy leads to overall Unknown.`);
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
export function analyzeFunctions(tree: Tree): DocumentComplexityResult {
  const results: FunctionComplexityResult[] = [];

  if (!tree || !tree.rootNode) {
    return { functions: results };
  }

  const macroRegistry = buildMacroRegistry(tree);
  const globalTypeContext = buildTypeContext(tree.rootNode);
  const fnNodes = tree.rootNode.descendantsOfType('function_definition');

  // Pass 1: Collect valid top-level functions
  const fnMap = new Map<string, SyntaxNode>();
  const allFnNames: string[] = [];
  const paramMap = new Map<string, string[]>();
  
  for (const fnNode of fnNodes) {
    let isNestedFn = false;
    let parent = fnNode.parent;
    while (parent) {
      if (parent.type === 'function_definition') {
        isNestedFn = true;
        break;
      }
      parent = parent.parent;
    }
    if (isNestedFn) continue;

    const name = extractFunctionName(fnNode);
    // Ignore duplicate names (overloads) for now, use the last one found
    fnMap.set(name, fnNode);
    paramMap.set(name, Array.from(collectParamNames(fnNode)));
    if (!allFnNames.includes(name)) {
      allFnNames.push(name);
    }
  }

  // Pass 2: Build Call Graph
  const graph = new Map<string, string[]>();
  for (const name of allFnNames) {
    const node = fnMap.get(name)!;
    const calls = node.descendantsOfType('call_expression');
    const outgoing = new Set<string>();
    
    for (const call of calls) {
      const functionNode = call.childForFieldName('function') || call.child(0);
      if (functionNode && functionNode.type === 'identifier') {
        const targetName = functionNode.text;
        if (fnMap.has(targetName)) {
          outgoing.add(targetName);
        }
      }
    }
    graph.set(name, Array.from(outgoing));
  }

  // Pass 3: Topological Sort with cycle detection
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const sorted: string[] = [];
  const recursiveNodes = new Set<string>();

  function dfs(name: string) {
    if (visiting.has(name)) {
      recursiveNodes.add(name);
      return;
    }
    if (visited.has(name)) return;
    
    visiting.add(name);
    const edges = graph.get(name) || [];
    for (const target of edges) {
      dfs(target);
    }
    visiting.delete(name);
    visited.add(name);
    sorted.push(name);
  }

  for (const name of allFnNames) {
    if (!visited.has(name)) {
      dfs(name);
    }
  }

  // Pass 4: Bottom-up evaluation
  const functionRegistry = new Map<string, ComplexityNode>();

  for (const name of sorted) {
    const fnNode = fnMap.get(name)!;
    
    if (recursiveNodes.has(name)) {
      // ── D3.2: DSU Recursive Path Compression Override ──────────────
      // If the function exactly matches the `parent[x] = find(parent[x])`
      // fingerprint, we safely evaluate it as O(1) amortized instead of Unknown.
      if (isDSURecursivePathCompression(fnNode, name)) {
        functionRegistry.set(name, { power: 0, logPower: 0, loglogPower: 0, isUnknown: false });
        results.push({
          name,
          startLine: fnNode.startPosition.row,
          endLine: fnNode.endPosition.row,
          complexity: 'O(1)',
          confidence: 'high',
          explanation: [`Function "${name}" recognized as DSU recursive path compression. Complexity is amortized O(1).`]
        });
        continue;
      }

      // ── D4.1 / D4.2: Memoized Recursion Override ──────────────────
      // isMemoizedRecursion() returns the cache dimension (1, 2, or 3)
      // when the strict structural fingerprint matches, or null otherwise.
      // Dimension maps directly to complexity: 1→O(n), 2→O(n²), 3→O(n³).
      // Any null result falls through to Unknown, exactly as before.
      const memoDim = isMemoizedRecursion(fnNode, name);
      if (memoDim !== null) {
        const memoComplexity = formatComplexity({ power: memoDim, logPower: 0, loglogPower: 0, isUnknown: false });
        const dimLabel = memoDim === 1 ? 'single' : memoDim === 2 ? 'two' : 'three';
        functionRegistry.set(name, { power: memoDim, logPower: 0, loglogPower: 0, isUnknown: false });
        results.push({
          name,
          startLine: fnNode.startPosition.row,
          endLine: fnNode.endPosition.row,
          complexity: memoComplexity,
          confidence: 'medium',
          explanation: [`Function "${name}" recognized as memoized recursion with ${dimLabel}-dimension cache. Each state computed once: ${memoComplexity}.`]
        });
        continue;
      }

      // ── D4.6: Recursive Binary Search Override ────────────────────
      // isRecursiveBinarySearch() returns true when ALL four structural
      // conditions hold (midpoint decl, endpoint-preservation, no loops,
      // pairwise mutual exclusivity). Any failure falls to Unknown.
      if (isRecursiveBinarySearch(fnNode, name)) {
        functionRegistry.set(name, { power: 0, logPower: 1, loglogPower: 0, isUnknown: false });
        results.push({
          name,
          startLine: fnNode.startPosition.row,
          endLine: fnNode.endPosition.row,
          complexity: 'O(log n)',
          confidence: 'high',
          explanation: [`Function "${name}" recognized as recursive binary search (halving with branch-isolated self-calls). Complexity is O(log n).`]
        });
        continue;
      }

      // Ordinary recursion falls through to existing Unknown behavior.
      functionRegistry.set(name, { power: 0, logPower: 0, loglogPower: 0, isUnknown: true });
      results.push({
        name,
        startLine: fnNode.startPosition.row,
        endLine: fnNode.endPosition.row,
        complexity: 'Unknown',
        confidence: 'low',
        explanation: [`Function "${name}" participates in recursion. Complexity is Unknown.`]
      });
      continue;
    }

    const loops = extractFunctionLoops(fnNode, macroRegistry, functionRegistry, globalTypeContext, paramMap);
    const { complexity, confidence, explanation, node } = inferComplexity(loops);

    const summaryLine = buildSummary(name, complexity);
    const finalExplanation = [...explanation, summaryLine];

    if (node) {
      functionRegistry.set(name, node);
    }

    results.push({
      name,
      startLine: fnNode.startPosition.row,
      endLine: fnNode.endPosition.row,
      complexity,
      confidence,
      explanation: finalExplanation
    });
  }

  // Restore original function order to match the document's structure exactly
  results.sort((a, b) => {
    if (a.startLine !== b.startLine) return a.startLine - b.startLine;
    return allFnNames.indexOf(a.name) - allFnNames.indexOf(b.name);
  });

  return { functions: results };
}

function buildSummary(name: string, complexity: ComplexityClass): string {
  if (complexity === 'O(1)') {
    return `Function "${name}" contains no loops or only constant loops. Time complexity is O(1).`;
  }
  return `Overall time complexity of function "${name}" is ${complexity}.`;
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
function isDSURecursivePathCompression(fnNode: SyntaxNode, fnName: string): boolean {
  const assignments = fnNode.descendantsOfType('assignment_expression');
  for (const assign of assignments) {
    const left = assign.childForFieldName('left');
    let right = assign.childForFieldName('right');
    
    if (!left || left.type !== 'subscript_expression') continue;
    
    // Unwrap parenthesis if any
    while (right && right.type === 'parenthesized_expression') {
      let inner: SyntaxNode | null = null;
      for (let i = 0; i < right.childCount; i++) {
        const ch = right.child(i);
        if (ch && ch.type !== '(' && ch.type !== ')') {
          inner = ch;
          break;
        }
      }
      if (!inner) break;
      right = inner;
    }
    
    if (!right || right.type !== 'call_expression') continue;
    
    const callFunc = right.childForFieldName('function');
    if (!callFunc || callFunc.text !== fnName) continue;
    
    const argsNode = right.childForFieldName('arguments');
    if (!argsNode) continue;
    
    let firstArg: SyntaxNode | null = null;
    for (let i = 0; i < argsNode.childCount; i++) {
      const p = argsNode.child(i);
      if (p && p.type !== '(' && p.type !== ')' && p.type !== ',') {
        firstArg = p;
        break;
      }
    }
    
    if (!firstArg || firstArg.type !== 'subscript_expression') continue;
    
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
function getSubscriptRoot(node: SyntaxNode): { name: string; dimension: number } | null {
  let dim = 0;
  let cur: SyntaxNode = node;
  while (cur.type === 'subscript_expression') {
    dim++;
    const inner = cur.child(0);
    if (!inner) return null;  // malformed AST
    cur = inner;
  }
  // The root must be a plain identifier — reject pointer derefs, field_expressions, etc.
  if (cur.type !== 'identifier') return null;
  // Cap at 3 dimensions: 4D+ DP is out of scope.
  if (dim > 3) return null;
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
function isMemoizedRecursion(fnNode: SyntaxNode, fnName: string): number | null {
  const ifStmts = fnNode.descendantsOfType('if_statement');

  for (const ifStmt of ifStmts) {
    // ── Step 1: Unwrap condition_clause ─────────────────────────────────────
    let cond = ifStmt.childForFieldName('condition');
    if (!cond) continue;
    if (cond.type === 'condition_clause') {
      let inner: SyntaxNode | null = null;
      for (let i = 0; i < cond.childCount; i++) {
        const ch = cond.child(i);
        if (ch && ch.type !== '(' && ch.type !== ')') { inner = ch; break; }
      }
      if (!inner) continue;
      cond = inner;
    }

    // ── Step 2: Identify guard pattern ───────────────────────────────────────
    // memoKey: normalized whitespace-free subscript text used as the match key
    //          e.g. "dp[i][j]" for a 2D guard, "memo[x]" for a 1D guard.
    // memoName: the root array/container identifier (e.g. "dp", "memo").
    // dimension: 1 for memo[x], 2 for memo[i][j], 3 for memo[i][j][k].
    let memoKey: string | null = null;
    let memoName: string | null = null;
    let dimension = 1;
    let isCountGuard = false;

    if (cond.type === 'binary_expression') {
      // Pattern A: memo[...] != sentinel
      const op = cond.childForFieldName('operator');
      if (!op || op.type !== '!=') continue;

      const lhs = cond.childForFieldName('left');
      const rhs = cond.childForFieldName('right');

      if (!lhs || lhs.type !== 'subscript_expression') continue;

      // Walk the subscript chain to the root identifier.
      // This handles 1D (memo[x]), 2D (memo[i][j]), and 3D (memo[i][j][k]).
      const root = getSubscriptRoot(lhs);
      if (!root) continue;  // non-identifier base or dimension > 3 → reject

      // Right must be a number_literal (the sentinel: -1, 0, etc.)
      if (!rhs || rhs.type !== 'number_literal') continue;

      memoName = root.name;
      dimension = root.dimension;
      // Use the full normalized subscript text as the identity key.
      // This robustly handles all dimensions without extracting individual indices.
      memoKey = lhs.text.replace(/\s+/g, '');

    } else if (cond.type === 'call_expression') {
      // Pattern B: container.count(arg) — supported for 1D map guards only.
      const funcNode = cond.childForFieldName('function');
      if (!funcNode || funcNode.type !== 'field_expression') continue;
      const fieldIdent = funcNode.childForFieldName('field');
      if (!fieldIdent || fieldIdent.text !== 'count') continue;
      const objIdent = funcNode.childForFieldName('argument');
      if (!objIdent || objIdent.type !== 'identifier') continue;

      memoName = objIdent.text;
      dimension = 1;
      isCountGuard = true;

      // Extract the first argument of .count(arg) as the index key.
      const argsNode = cond.childForFieldName('arguments');
      if (!argsNode) continue;
      let arg1: string | null = null;
      for (let i = 0; i < argsNode.childCount; i++) {
        const ch = argsNode.child(i);
        if (ch && ch.type !== '(' && ch.type !== ')' && ch.type !== ',') {
          arg1 = ch.text;
          break;
        }
      }
      if (!arg1) continue;
      // Build key in the same subscript form for uniform matching below.
      memoKey = `${memoName}[${arg1}]`;
    } else {
      continue; // Not a recognized guard shape — no truthiness, no negation
    }

    if (!memoName || !memoKey) continue;

    // ── Step 3: Verify early-return in the guarded consequent ────────────────
    // The then-branch must contain a return_statement whose value is a
    // subscript_expression with the SAME normalized text as the guard's subscript.
    const consequent = ifStmt.childForFieldName('consequence');
    if (!consequent) continue;

    let hasMatchingReturn = false;
    const returnStmts = consequent.descendantsOfType('return_statement');
    for (const ret of returnStmts) {
      const retSubs = ret.descendantsOfType('subscript_expression');
      for (const sub of retSubs) {
        // Verify the root identifier matches.
        const retRoot = getSubscriptRoot(sub);
        if (!retRoot || retRoot.name !== memoName) continue;
        // Verify the full normalized text matches the guard key.
        if (sub.text.replace(/\s+/g, '') === memoKey) {
          hasMatchingReturn = true;
          break;
        }
      }
      if (hasMatchingReturn) break;
    }
    if (!hasMatchingReturn) continue;

    // ── Step 4: Verify memoization write with self-recursive call ────────────
    // Find any assignment_expression where:
    //   left  = subscript_expression with normalized text == memoKey
    //   right = call_expression whose callee identifier == fnName
    const assignments = fnNode.descendantsOfType('assignment_expression');
    let hasMemoWrite = false;

    for (const assign of assignments) {
      const left = assign.childForFieldName('left');
      let right = assign.childForFieldName('right');

      if (!left || left.type !== 'subscript_expression') continue;

      // Verify root is the expected identifier and dimension matches.
      const leftRoot = getSubscriptRoot(left);
      if (!leftRoot || leftRoot.name !== memoName || leftRoot.dimension !== dimension) continue;

      // Verify the full subscript text matches the guard key exactly.
      if (left.text.replace(/\s+/g, '') !== memoKey) continue;

      // Unwrap parentheses on the right side.
      while (right && right.type === 'parenthesized_expression') {
        let inner: SyntaxNode | null = null;
        for (let i = 0; i < right.childCount; i++) {
          const ch = right.child(i);
          if (ch && ch.type !== '(' && ch.type !== ')') { inner = ch; break; }
        }
        if (!inner) break;
        right = inner;
      }

      if (!right || right.type !== 'call_expression') continue;

      // The callee must be the function itself — not a helper, not a lambda.
      const callFunc = right.childForFieldName('function');
      if (!callFunc) continue;
      if (callFunc.type !== 'identifier' || callFunc.text !== fnName) continue;

      hasMemoWrite = true;
      break;
    }

    if (!hasMemoWrite) continue;

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
function detectMidVariable(fnNode: SyntaxNode): string | null {
  const decls = fnNode.descendantsOfType('init_declarator');
  for (const d of decls) {
    const nameNode = d.childForFieldName('declarator');
    if (!nameNode || nameNode.type !== 'identifier') continue;

    const val = d.childForFieldName('value');
    if (!val) continue;

    // The value must be a binary_expression with operator "/".
    if (val.type !== 'binary_expression') continue;
    const outerOp = val.childForFieldName('operator');
    if (!outerOp || outerOp.type !== '/') continue;

    // Right operand must be the literal 2.
    const outerRight = val.childForFieldName('right');
    if (!outerRight || outerRight.type !== 'number_literal' || outerRight.text !== '2') continue;

    // Left operand must be either a parenthesized_expression or a binary_expression
    // with operator "+".
    const outerLeft = val.childForFieldName('left');
    if (!outerLeft) continue;

    let addExpr = outerLeft;
    if (addExpr.type === 'parenthesized_expression') {
      // Unwrap one level of parens.
      let inner: SyntaxNode | null = null;
      for (let i = 0; i < addExpr.childCount; i++) {
        const ch = addExpr.child(i);
        if (ch && ch.type !== '(' && ch.type !== ')') { inner = ch; break; }
      }
      if (!inner) continue;
      addExpr = inner;
    }
    if (addExpr.type !== 'binary_expression') continue;
    const addOp = addExpr.childForFieldName('operator');
    if (!addOp || addOp.type !== '+') continue;

    // Both operands of the addition must be identifiers (no complex expressions).
    // This rejects   mid = (f(l) + r) / 2   and similar.
    const addLeft  = addExpr.childForFieldName('left');
    const addRight = addExpr.childForFieldName('right');
    if (!addLeft  || addLeft.type  !== 'identifier') continue;
    if (!addRight || addRight.type !== 'identifier') continue;

    return nameNode.text;
  }
  return null;
}

/**
 * Returns true if the function contains any self-call inside a loop body
 * (for_statement, while_statement, do_statement).
 * Such calls would violate the O(log n) bound.
 */
function hasLoopedSelfCall(fnNode: SyntaxNode, fnName: string): boolean {
  const loopTypes = ['for_statement', 'while_statement', 'do_statement'];
  for (const loopType of loopTypes) {
    const loops = fnNode.descendantsOfType(loopType);
    for (const lp of loops) {
      const calls = lp.descendantsOfType('call_expression');
      for (const c of calls) {
        const f = c.childForFieldName('function');
        if (f && f.type === 'identifier' && f.text === fnName) return true;
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
function collectParamNames(fnNode: SyntaxNode): Set<string> {
  const names = new Set<string>();

  // Navigate: function_definition → declarator (may be pointer_declarator wrapping
  // function_declarator if the function returns a pointer, e.g. `int* solve(...)`).
  let decl = fnNode.childForFieldName('declarator');
  while (decl && decl.type === 'pointer_declarator') {
    decl = decl.childForFieldName('declarator');
  }
  if (!decl || decl.type !== 'function_declarator') return names;

  const params = decl.childForFieldName('parameters');
  if (!params) return names;

  for (let i = 0; i < params.childCount; i++) {
    const param = params.child(i);
    if (!param || param.type !== 'parameter_declaration') continue;

    let d = param.childForFieldName('declarator');
    if (!d) continue;

    // Unwrap pointer layers: pointer_declarator has a named 'declarator' field.
    while (d && d.type === 'pointer_declarator') {
      d = d.childForFieldName('declarator') ?? null;
    }

    if (!d) continue;

    if (d.type === 'identifier') {
      names.add(d.text);
    } else if (d.type === 'reference_declarator') {
      // reference_declarator has no named 'declarator' field in tree-sitter-cpp.
      // The identifier is always child(1): child(0) is '&'.
      const inner = d.child(1);
      if (inner && inner.type === 'identifier') names.add(inner.text);
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
function isLegalCallArg(arg: SyntaxNode, midName: string, paramNames: Set<string>): boolean {
  // Identifier: accepted only if it is the midpoint variable OR a formal parameter.
  if (arg.type === 'identifier') {
    return arg.text === midName || paramNames.has(arg.text);
  }

  // binary_expression: only mid±1 is legal.
  if (arg.type === 'binary_expression') {
    const op  = arg.childForFieldName('operator');
    const lhs = arg.childForFieldName('left');
    const rhs = arg.childForFieldName('right');
    if (!op || !lhs || !rhs) return false;
    // Operator must be + or -.
    if (op.type !== '+' && op.type !== '-') return false;
    // LHS must be the mid identifier.
    if (lhs.type !== 'identifier' || lhs.text !== midName) return false;
    // RHS must be the literal 1.
    if (rhs.type !== 'number_literal' || rhs.text !== '1') return false;
    return true;
  }

  // Number literals are accepted.
  if (arg.type === 'number_literal') return true;

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
function verifyEndpointPreservation(allCalls: SyntaxNode[], midName: string, paramNames: Set<string>): boolean {
  let anyCallUseMid = false;

  for (const call of allCalls) {
    const argsNode = call.childForFieldName('arguments');
    if (!argsNode) return false; // malformed

    let thisCallUsesMid = false;
    for (let i = 0; i < argsNode.childCount; i++) {
      const ch = argsNode.child(i);
      if (!ch || ch.type === '(' || ch.type === ')' || ch.type === ',') continue;

      if (!isLegalCallArg(ch, midName, paramNames)) return false;

      // Track whether this call references midName at all.
      if (ch.type === 'identifier' && ch.text === midName) thisCallUsesMid = true;
      if (ch.type === 'binary_expression') {
        const lhs = ch.childForFieldName('left');
        if (lhs && lhs.type === 'identifier' && lhs.text === midName) thisCallUsesMid = true;
      }
    }
    if (thisCallUsesMid) anyCallUseMid = true;
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
function areMutuallyExclusive(call1: SyntaxNode, call2: SyntaxNode): boolean {
  // Build ancestor-id chains from each call up to the tree root.
  const buildPath = (node: SyntaxNode): SyntaxNode[] => {
    const path: SyntaxNode[] = [];
    let cur: SyntaxNode | null = node;
    while (cur) { path.push(cur); cur = cur.parent; }
    path.reverse(); // root → node
    return path;
  };

  const path1 = buildPath(call1);
  const path2 = buildPath(call2);

  // Walk the shared prefix to find the LCA.
  let lca: SyntaxNode | null = null;
  let child1: SyntaxNode | null = null;
  let child2: SyntaxNode | null = null;
  for (let i = 0; i < Math.min(path1.length, path2.length); i++) {
    if (path1[i].id === path2[i].id) {
      lca = path1[i];
    } else {
      child1 = path1[i]; // child of LCA on the path to call1
      child2 = path2[i]; // child of LCA on the path to call2
      break;
    }
  }
  if (!lca || !child1 || !child2) return false;

  // Helper: is 'node' a descendant of 'ancestor'?
  const isDescendantOf = (node: SyntaxNode, ancestor: SyntaxNode): boolean => {
    let cur: SyntaxNode | null = node;
    while (cur) {
      if (cur.id === ancestor.id) return true;
      cur = cur.parent;
    }
    return false;
  };

  // ── Case A: LCA is if_statement or conditional_expression ────────────────
  if (lca.type === 'if_statement' || lca.type === 'conditional_expression') {
    const cons = lca.childForFieldName('consequence');
    const alt  = lca.childForFieldName('alternative');
    if (cons && alt) {
      // One call in consequence, the other in alternative.
      if (isDescendantOf(call1, cons) && isDescendantOf(call2, alt)) return true;
      if (isDescendantOf(call2, cons) && isDescendantOf(call1, alt)) return true;
    }
  }

  // ── Case B: LCA is a compound_statement (sequential block) ───────────────
  // The earlier call must be wrapped in a return_statement for mutual exclusivity.
  if (lca.type === 'compound_statement') {
    // Determine source order: the child that comes first in the child list.
    let idx1 = -1, idx2 = -1;
    for (let i = 0; i < lca.childCount; i++) {
      const ch = lca.child(i);
      if (!ch) continue;
      if (ch.id === child1.id) idx1 = i;
      if (ch.id === child2.id) idx2 = i;
    }
    if (idx1 < 0 || idx2 < 0) return false;
    // The earlier child (lower index) must contain a return_statement that
    // encloses the earlier call — ensuring the function exits before the
    // later call is reached.
    const earlierCall = idx1 < idx2 ? call1 : call2;
    let cur: SyntaxNode | null = earlierCall.parent;
    while (cur && cur.id !== lca.id) {
      if (cur.type === 'return_statement') return true;
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
function isRecursiveBinarySearch(fnNode: SyntaxNode, fnName: string): boolean {
  // ── Condition 1: midpoint declaration ──────────────────────────────────
  const midName = detectMidVariable(fnNode);
  if (midName === null) return false;

  // Extract the strict whitelist of legal endpoint identifiers:
  // only formal parameter names + midName itself.
  const paramNames = collectParamNames(fnNode);

  // Collect all self-calls in the function.
  const allCallNodes = fnNode.descendantsOfType('call_expression');
  const selfCalls: SyntaxNode[] = allCallNodes.filter(c => {
    const f = c.childForFieldName('function');
    return f !== null && f.type === 'identifier' && f.text === fnName;
  });
  if (selfCalls.length === 0) return false;

  // ── Condition 2: no self-calls inside loops ─────────────────────────────
  if (hasLoopedSelfCall(fnNode, fnName)) return false;

  // ── Condition 3: endpoint-preservation for all args (strict whitelist) ──
  if (!verifyEndpointPreservation(selfCalls, midName, paramNames)) return false;

  // ── Condition 4: every pair of self-calls is mutually exclusive ─────────
  for (let i = 0; i < selfCalls.length; i++) {
    for (let j = i + 1; j < selfCalls.length; j++) {
      if (!areMutuallyExclusive(selfCalls[i], selfCalls[j])) return false;
    }
  }

  return true;
}
