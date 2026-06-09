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
      return { power: 0, logPower: 0, loglogPower: 0, isUnknown: false };
    case 'linear':
      return { power: 1, logPower: 0, loglogPower: 0, isUnknown: false };
    case 'logarithmic':
      return { power: 0, logPower: 1, loglogPower: 0, isUnknown: false };
    case 'fractional':
      return { power: 0.5, logPower: 0, loglogPower: 0, isUnknown: false };
    case 'linear_logarithmic':
      return { power: 1, logPower: 1, loglogPower: 0, isUnknown: false };
    case 'unknown':
    default:
      return { power: 0, logPower: 0, loglogPower: 0, isUnknown: true };
  }
}

function multiplyNodes(a: ComplexityNode, b: ComplexityNode): ComplexityNode {
  if (a.isUnknown || b.isUnknown) {
    return { power: 0, logPower: 0, loglogPower: 0, isUnknown: true };
  }
  return {
    power: a.power + b.power,
    logPower: a.logPower + b.logPower,
    // loglog propagates additively but is clamped: O(n)*O(log log n) = O(n log log n)
    loglogPower: Math.min(1, a.loglogPower + b.loglogPower),
    isUnknown: false
  };
}

function maxNode(a: ComplexityNode, b: ComplexityNode): ComplexityNode {
  if (a.isUnknown || b.isUnknown) {
    return { power: 0, logPower: 0, loglogPower: 0, isUnknown: true };
  }
  // Dominance rule: Higher power wins. If powers equal, higher logPower wins.
  // loglogPower is a sub-log factor; only compare when all else is equal.
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

function formatComplexity(node: ComplexityNode): ComplexityClass {
  if (node.isUnknown) return 'Unknown';
  // O(n log log n) — raised by harmonic reduction from a fractional outer loop
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
      harmonicResultNode = { power: 1, logPower: 1, loglogPower: 0, isUnknown: false };
      explanations.push(
        `Step-dependent inner loop at line ${harmonicChildren[0].startLine + 1} creates harmonic series: ` +
        `outer O(n) × Σ(n/i) = O(n log n).`
      );
    } else if (baseNode.power === 0.5 && baseNode.logPower === 0 && baseNode.loglogPower === 0) {
      // Outer is O(sqrt n): Σ(n/i) for i=1..sqrt(n) = O(n log log n)  [Sieve]
      harmonicResultNode = { power: 1, logPower: 0, loglogPower: 1, isUnknown: false };
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
