import { SyntaxNode, Tree } from 'web-tree-sitter';
import { classifyLoop, LoopClassification, LoopConfidence } from './loopClassifier';

export interface ExtractedFunction {
  name: string;
  startLine: number;
  endLine: number;
}

export interface ExtractedLoop {
  type: 'for' | 'while';
  startLine: number;
  endLine: number;
  classification: LoopClassification;
  confidence: LoopConfidence;
  childLoops: ExtractedLoop[];
}

export interface AnalysisResult {
  functions: ExtractedFunction[];
  loops: ExtractedLoop[];
}

/**
 * Traverses the AST to find all function definitions, for-loops, and while-loops.
 * Note: tree-sitter lines are 0-indexed. This function returns 0-indexed line numbers.
 *
 * @param tree The parsed syntax tree
 * @param source The original source code (optional, used if node text extraction is needed)
 * @returns A structured result containing the found functions and loops.
 */
export function extractStructure(tree: Tree): AnalysisResult {
  const result: AnalysisResult = {
    functions: [],
    loops: []
  };

  if (!tree || !tree.rootNode) {
    return result;
  }

  const functions = tree.rootNode.descendantsOfType('function_definition');
  for (const node of functions) {
    const declarator = findChildOfType(node, 'function_declarator');
    let name = '<anonymous>';
    if (declarator) {
      const identifier = findChildOfType(declarator, 'identifier') || findChildOfType(declarator, 'field_identifier');
      if (identifier) {
        name = identifier.text;
      }
    }
    
    result.functions.push({
      name,
      startLine: node.startPosition.row,
      endLine: node.endPosition.row
    });
  }

  const loopNodes = tree.rootNode.descendantsOfType([
    'for_statement', 
    'for_range_loop', 
    'while_statement', 
    'do_statement'
  ]);

  const loopMap = new Map<number, ExtractedLoop>();
  const loopParentMap = new Map<number, number | null>(); // maps node.id to parent loop node.id

  // First pass: create loop objects and find their loop parents
  for (const node of loopNodes) {
    const type = (node.type === 'for_statement' || node.type === 'for_range_loop') ? 'for' : 'while';
    const { classification, confidence } = classifyLoop(node);
    
    const extractedLoop: ExtractedLoop = {
      type,
      startLine: node.startPosition.row,
      endLine: node.endPosition.row,
      classification,
      confidence,
      childLoops: []
    };
    
    loopMap.set(node.id, extractedLoop);

    // Find closest loop parent within the same function
    let parentLoopId: number | null = null;
    let current: SyntaxNode | null = node.parent;
    while (current) {
      if (
        current.type === 'for_statement' ||
        current.type === 'for_range_loop' ||
        current.type === 'while_statement' ||
        current.type === 'do_statement'
      ) {
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
  for (const node of loopNodes) {
    const extractedLoop = loopMap.get(node.id)!;
    const parentLoopId = loopParentMap.get(node.id);

    if (parentLoopId != null) {
      const parentLoop = loopMap.get(parentLoopId);
      if (parentLoop) {
        parentLoop.childLoops.push(extractedLoop);
      } else {
        // Fallback (shouldn't happen)
        result.loops.push(extractedLoop);
      }
    } else {
      // Top-level loop
      result.loops.push(extractedLoop);
    }
  }

  return result;
}

/**
 * Helper to do a shallow search for a child of a specific type.
 */
function findChildOfType(node: SyntaxNode, type: string): SyntaxNode | null {
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child && child.type === type) {
      return child;
    }
    // If it's a wrapper node or reference declarator, we might need to dig deeper
    if (child && (child.type === 'reference_declarator' || child.type === 'pointer_declarator')) {
      const deeper = findChildOfType(child, type);
      if (deeper) return deeper;
    }
  }
  return null;
}

const LOOP_TYPES = ['for_statement', 'for_range_loop', 'while_statement', 'do_statement'] as const;

/**
 * Builds a hierarchical loop tree scoped to a single function definition AST node.
 * Loops inside nested lambda expressions are treated as separate scopes and
 * will NOT be owned by the enclosing function's loop hierarchy.
 *
 * @param fnNode The function_definition SyntaxNode to analyze.
 * @returns Array of top-level ExtractedLoop nodes (each may contain childLoops).
 */
export function extractFunctionLoops(fnNode: SyntaxNode): ExtractedLoop[] {
  const loopNodes = fnNode.descendantsOfType([...LOOP_TYPES]);

  const loopMap = new Map<number, ExtractedLoop>();
  const loopParentMap = new Map<number, number | null>();

  for (const node of loopNodes) {
    const type = (node.type === 'for_statement' || node.type === 'for_range_loop') ? 'for' : 'while';
    const { classification, confidence } = classifyLoop(node);

    const extractedLoop: ExtractedLoop = {
      type,
      startLine: node.startPosition.row,
      endLine: node.endPosition.row,
      classification,
      confidence,
      childLoops: []
    };

    loopMap.set(node.id, extractedLoop);

    // Walk up to find the nearest enclosing loop, stopping at function or lambda boundaries
    let parentLoopId: number | null = null;
    let current: SyntaxNode | null = node.parent;
    while (current) {
      if (LOOP_TYPES.includes(current.type as typeof LOOP_TYPES[number])) {
        parentLoopId = current.id;
        break;
      }
      // Stop at the function itself or any nested lambda — they are independent scopes
      if (current.type === 'function_definition' || current.type === 'lambda_expression') {
        break;
      }
      current = current.parent;
    }

    loopParentMap.set(node.id, parentLoopId);
  }

  // Second pass: wire childLoops
  const topLevelLoops: ExtractedLoop[] = [];
  for (const node of loopNodes) {
    const extractedLoop = loopMap.get(node.id)!;
    const parentLoopId = loopParentMap.get(node.id);

    if (parentLoopId != null) {
      const parentLoop = loopMap.get(parentLoopId);
      if (parentLoop) {
        parentLoop.childLoops.push(extractedLoop);
      } else {
        topLevelLoops.push(extractedLoop);
      }
    } else {
      topLevelLoops.push(extractedLoop);
    }
  }

  return topLevelLoops;
}

/**
 * Extracts the name from a function_definition node.
 */
export function extractFunctionName(fnNode: SyntaxNode): string {
  const declarator = findChildOfType(fnNode, 'function_declarator');
  if (declarator) {
    const identifier =
      findChildOfType(declarator, 'identifier') ||
      findChildOfType(declarator, 'field_identifier');
    if (identifier) return identifier.text;
  }
  return '<anonymous>';
}
