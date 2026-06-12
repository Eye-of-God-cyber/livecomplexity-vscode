export type ComplexityClass = string;
export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface ComplexityResult {
  complexity: ComplexityClass;
  confidence: ConfidenceLevel;
  explanation: string[];
  node?: ComplexityNode;
}

/**
 * Internal mathematical representation of Big-O complexity.
 *
 * Scalar Node (sumTerms === undefined):
 *   Represents O(n^power · log^logPower n) with optional exponential / graph-sum flags.
 *   All nodes produced before D4.7 are Scalar Nodes.
 *
 * Sum Node (sumTerms is a non-empty array):
 *   Represents O(T₁ + T₂ + …) where every element is a Scalar Node.
 *   Introduced by D4.7 to express additive complexities of sequential independent work.
 *   Invariant: sumTerms elements are always Scalar Nodes (flattenSum prevents nesting).
 *   Invariant: sumTerms contains no Unknown terms (Unknown propagates immediately).
 *   Invariant: sumTerms contains no dominated or duplicate terms (mergeAndReduce enforces this).
 *
 * loglogPower = 1 encodes the extra log log n factor (e.g. O(n log log n)).
 */
export interface ComplexityNode {
  power: number;
  logPower: number;
  loglogPower: number;  // 0 = absent, 1 = O(... log log n)
  isUnknown: boolean;
  linearVars?: string[]; // variables extracted from loop bound — e.g. ['m', 'V'] (D1+)
  isGraphSum?:    boolean;  // true → format as O(V+E) (D2.2+)
  isGraphSumLog?: boolean;  // true → format as O((V+E) log V) (D2.3+)
  expVars?: string[];        // per-variable 2^x entries — e.g. ['n'] → 2ⁿ, ['n','m'] → 2ⁿ·2ᵐ (D3.1+)
  sumTerms?: ComplexityNode[]; // D4.7: non-empty → Sum Node O(T₁+T₂+…); undefined → Scalar Node
  isSubstituted?: boolean; // D5.0: true → disable isSingleVariable fallback
}

/**
 * Complexity analysis result scoped to a single function definition.
 */
export interface FunctionComplexityResult {
  name: string;
  startLine: number;
  endLine: number;
  complexity: ComplexityClass;
  confidence: ConfidenceLevel;
  explanation: string[];
}

/**
 * The top-level result of a full document analysis.
 * Contains one entry per function definition found.
 */
export interface DocumentComplexityResult {
  functions: FunctionComplexityResult[];
}
