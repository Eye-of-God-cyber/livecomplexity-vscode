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
 * O(n^power * log^logPower n)
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
