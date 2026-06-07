export type ComplexityClass = 'O(1)' | 'O(log n)' | 'O(n)' | 'O(n log n)' | 'O(n²)' | 'O(n³)' | 'Unknown';
export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface ComplexityResult {
  complexity: ComplexityClass;
  confidence: ConfidenceLevel;
  explanation: string[];
}

/**
 * Internal mathematical representation of Big-O complexity.
 * O(n^power * log^logPower n)
 */
export interface ComplexityNode {
  power: number;
  logPower: number;
  isUnknown: boolean;
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
