import { Tree, SyntaxNode } from 'web-tree-sitter';
import { ExtractedLoop, extractFunctionLoops, extractFunctionName, buildMacroRegistry } from '../parser/astUtils';
import {
  ComplexityClass,
  ComplexityNode,
  ComplexityResult,
  ConfidenceLevel,
  DocumentComplexityResult,
  FunctionComplexityResult
} from './complexityNode';
import { LoopClassification } from '../parser/loopClassifier';

function getBaseComplexity(classification: LoopClassification | 'custom', customComplexity?: ComplexityNode): ComplexityNode {
  if (classification === 'custom' && customComplexity) {
    return customComplexity;
  }
  switch (classification) {
    case 'constant':
      return { power: 0, logPower: 0, isUnknown: false };
    case 'linear':
      return { power: 1, logPower: 0, isUnknown: false };
    case 'logarithmic':
      return { power: 0, logPower: 1, isUnknown: false };
    case 'fractional':
      return { power: 0.5, logPower: 0, isUnknown: false };
    case 'linear_logarithmic':
      return { power: 1, logPower: 1, isUnknown: false };
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
  if (node.power === 0 && node.logPower === 2) return 'O(log² n)';
  if (node.power === 0 && node.logPower >= 3) return 'O(log³ n)';
  if (node.power === 0.5 && node.logPower === 0) return 'O(sqrt n)';
  if (node.power === 1 && node.logPower === 0) return 'O(n)';
  if (node.power === 1 && node.logPower === 1) return 'O(n log n)';
  if (node.power === 1.5 && node.logPower === 0) return 'O(n sqrt n)';
  if (node.power === 1 && node.logPower === 2) return 'O(n log² n)';
  if (node.power === 2 && node.logPower === 0) return 'O(n²)';
  if (node.power === 2 && node.logPower === 1) return 'O(n² log n)';
  if (node.power >= 3 && node.logPower === 0) return 'O(n³)';
  if (node.power >= 3 && node.logPower >= 1) return 'O(n³ log n)';
  // Catch-all: cap to O(n³) rather than emitting Unknown for exotic combos.
  return 'O(n³)';
}

export function inferComplexity(loops: ExtractedLoop[]): ComplexityResult {
  if (!loops || loops.length === 0) {
    return {
      complexity: 'O(1)',
      confidence: 'high',
      explanation: ['No loops detected. Complexity is O(1).'],
      node: { power: 0, logPower: 0, isUnknown: false }
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
    explanation: explanations,
    node: overallNode
  };
}

function analyzeLoopHierarchy(loop: ExtractedLoop): { node: ComplexityNode, confidence: ConfidenceLevel, explanation: string[] } {
  const baseNode = getBaseComplexity(loop.classification, loop.customComplexity);
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

  const macroRegistry = buildMacroRegistry(tree);
  const fnNodes = tree.rootNode.descendantsOfType('function_definition');

  // Pass 1: Collect valid top-level functions
  const fnMap = new Map<string, SyntaxNode>();
  const allFnNames: string[] = [];
  
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
      functionRegistry.set(name, { power: 0, logPower: 0, isUnknown: true });
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

    const loops = extractFunctionLoops(fnNode, macroRegistry, functionRegistry);
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
