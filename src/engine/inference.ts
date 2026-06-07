import { Tree } from 'web-tree-sitter';
import { ExtractedLoop, extractFunctionLoops, extractFunctionName } from '../parser/astUtils';
import {
  ComplexityClass,
  ComplexityNode,
  ComplexityResult,
  ConfidenceLevel,
  DocumentComplexityResult,
  FunctionComplexityResult
} from './complexityNode';
import { LoopClassification } from '../parser/loopClassifier';

function getBaseComplexity(classification: LoopClassification): ComplexityNode {
  switch (classification) {
    case 'constant':
      return { power: 0, logPower: 0, isUnknown: false };
    case 'linear':
      return { power: 1, logPower: 0, isUnknown: false };
    case 'logarithmic':
      return { power: 0, logPower: 1, isUnknown: false };
    case 'unknown':
    default:
      return { power: 0, logPower: 0, isUnknown: true };
  }
}

function multiplyNodes(a: ComplexityNode, b: ComplexityNode): ComplexityNode {
  if (a.isUnknown || b.isUnknown) {
    return { power: 0, logPower: 0, isUnknown: true };
  }
  return {
    power: a.power + b.power,
    logPower: a.logPower + b.logPower,
    isUnknown: false
  };
}

function maxNode(a: ComplexityNode, b: ComplexityNode): ComplexityNode {
  if (a.isUnknown || b.isUnknown) {
    return { power: 0, logPower: 0, isUnknown: true };
  }
  // Dominance rule: Higher power wins. If powers are equal, higher logPower wins.
  if (a.power > b.power) return a;
  if (b.power > a.power) return b;
  if (a.logPower > b.logPower) return a;
  if (b.logPower > a.logPower) return b;
  return a;
}

function mergeConfidence(a: ConfidenceLevel, b: ConfidenceLevel): ConfidenceLevel {
  if (a === 'low' || b === 'low') return 'low';
  if (a === 'medium' || b === 'medium') return 'medium';
  return 'high';
}

function formatComplexity(node: ComplexityNode): ComplexityClass {
  if (node.isUnknown) return 'Unknown';
  if (node.power === 0 && node.logPower === 0) return 'O(1)';
  if (node.power === 0 && node.logPower === 1) return 'O(log n)';
  if (node.power === 1 && node.logPower === 0) return 'O(n)';
  if (node.power === 1 && node.logPower === 1) return 'O(n log n)';
  if (node.power === 2 && node.logPower === 0) return 'O(n²)';
  if (node.power >= 3 && node.logPower === 0) return 'O(n³)'; // Cap at O(n^3) per requirements
  
  // Fallbacks for edge cases (e.g. O(n^2 log n)) mapping to Unknown or something else
  // The requirements specified: O(1), O(log n), O(n), O(n log n), O(n²), O(n³).
  // Anything outside this standard set can be capped or returned as Unknown.
  // For safety, we cap high polynomials to O(n³) or mark unknown if it's a weird combo.
  if (node.power > 3) return 'O(n³)'; 
  return 'Unknown';
}

export function inferComplexity(loops: ExtractedLoop[]): ComplexityResult {
  if (!loops || loops.length === 0) {
    return {
      complexity: 'O(1)',
      confidence: 'high',
      explanation: ['No loops detected. Complexity is O(1).']
    };
  }

  let overallNode: ComplexityNode = { power: 0, logPower: 0, isUnknown: false };
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

    overallNode = maxNode(overallNode, node);
    overallConfidence = mergeConfidence(overallConfidence, confidence);
    explanations.push(...explanation);
  }

  // Deduplicate some explanations if needed, but linear flow is fine
  return {
    complexity: formatComplexity(overallNode),
    confidence: overallConfidence,
    explanation: explanations
  };
}

function analyzeLoopHierarchy(loop: ExtractedLoop): { node: ComplexityNode, confidence: ConfidenceLevel, explanation: string[] } {
  const baseNode = getBaseComplexity(loop.classification);
  const explanations: string[] = [];
  let currentConfidence = loop.confidence;
  
  explanations.push(`Loop at line ${loop.startLine + 1} classified as ${loop.classification}.`);

  if (!loop.childLoops || loop.childLoops.length === 0) {
    return { node: baseNode, confidence: currentConfidence, explanation: explanations };
  }

  let maxChildNode: ComplexityNode = { power: 0, logPower: 0, isUnknown: false };
  let childDomConfidence: ConfidenceLevel = 'high';

  for (const child of loop.childLoops) {
    const childResult = analyzeLoopHierarchy(child);
    maxChildNode = maxNode(maxChildNode, childResult.node);
    childDomConfidence = mergeConfidence(childDomConfidence, childResult.confidence);
    explanations.push(...childResult.explanation);
  }

  currentConfidence = mergeConfidence(currentConfidence, childDomConfidence);
  const multipliedNode = multiplyNodes(baseNode, maxChildNode);
  
  if (!multipliedNode.isUnknown && !baseNode.isUnknown && !maxChildNode.isUnknown) {
    if (baseNode.power === 0 && baseNode.logPower === 0) {
      explanations.push(`Outer loop at line ${loop.startLine + 1} is constant, so it does not multiply inner complexity.`);
    } else {
      const outerStr = formatComplexity(baseNode);
      const innerStr = formatComplexity(maxChildNode);
      const totalStr = formatComplexity(multipliedNode);
      explanations.push(`Nested ${innerStr} loop inside ${outerStr} loop multiply to produce ${totalStr}.`);
    }
  } else if (multipliedNode.isUnknown) {
    explanations.push(`Unknown complexity in nested hierarchy leads to overall Unknown.`);
  }

  return {
    node: multipliedNode,
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

  const fnNodes = tree.rootNode.descendantsOfType('function_definition');

  for (const fnNode of fnNodes) {
    // Skip function definitions nested inside other function definitions
    // (e.g. lambdas that get parsed as function_definition by tree-sitter).
    // We only process top-level and class-member functions, not lambdas.
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
    const loops = extractFunctionLoops(fnNode);
    const { complexity, confidence, explanation } = inferComplexity(loops);

    // Append a concise summary sentence as the final explanation line
    const summaryLine = buildSummary(name, complexity);
    const finalExplanation = [...explanation, summaryLine];

    results.push({
      name,
      startLine: fnNode.startPosition.row,
      endLine: fnNode.endPosition.row,
      complexity,
      confidence,
      explanation: finalExplanation
    });
  }

  return { functions: results };
}

function buildSummary(name: string, complexity: ComplexityClass): string {
  if (complexity === 'O(1)') {
    return `Function "${name}" contains no loops or only constant loops. Time complexity is O(1).`;
  }
  return `Overall time complexity of function "${name}" is ${complexity}.`;
}
