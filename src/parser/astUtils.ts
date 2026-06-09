import { SyntaxNode, Tree } from 'web-tree-sitter';
import { classifyLoop, classifyMacroString, LoopClassification, LoopConfidence, STL_REGISTRY } from './loopClassifier';
import { ComplexityNode } from '../engine/complexityNode';

export interface ExtractedFunction {
  name: string;
  startLine: number;
  endLine: number;
}

export interface ExtractedLoop {
  type: 'for' | 'while' | 'call';
  startLine: number;
  endLine: number;
  classification: LoopClassification | 'custom';
  confidence: LoopConfidence;
  childLoops: ExtractedLoop[];
  customComplexity?: ComplexityNode;
}

export interface AnalysisResult {
  functions: ExtractedFunction[];
  loops: ExtractedLoop[];
}

/**
 * Extracts a dynamic registry of loop macros defined in the file.
 * Returns a map of macro identifier (e.g. 'fo') -> raw macro string (e.g. 'for(int i=0;i<n;i++)').
 */
export function buildMacroRegistry(tree: Tree): Map<string, string> {
  const registry = new Map<string, string>();
  if (!tree || !tree.rootNode) return registry;

  const defs = tree.rootNode.descendantsOfType(['preproc_function_def', 'preproc_def']);
  for (const def of defs) {
    const nameNode = findChildOfType(def, 'identifier');
    if (!nameNode) continue;

    // The body is usually the last child, often parsed as preproc_arg
    let argText = '';
    for (let i = 0; i < def.childCount; i++) {
      const child = def.child(i);
      if (child && child.type === 'preproc_arg') {
        argText = child.text.trim();
        break;
      }
    }
    
    // If no preproc_arg, fallback to looking for the last child's text if it looks like a loop
    if (!argText) {
      const lastChild = def.child(def.childCount - 1);
      if (lastChild) {
        argText = lastChild.text.trim();
      }
    }

    if (argText.startsWith('for') || argText.startsWith('while')) {
      registry.set(nameNode.text, argText);
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
export function extractFunctionLoops(
  fnNode: SyntaxNode, 
  macroRegistry?: Map<string, string>,
  functionRegistry?: Map<string, ComplexityNode>
): ExtractedLoop[] {
  const LOOP_TYPES = ['for_statement', 'for_range_loop', 'while_statement', 'do_statement'] as const;
  
  // We also intercept function_definition and call_expression to check against the macro registry.
  const searchTypes = [...LOOP_TYPES, 'function_definition', 'call_expression'];
  const loopNodes = fnNode.descendantsOfType(searchTypes);

  const loopMap = new Map<number, ExtractedLoop>();
  const loopParentMap = new Map<number, number | null>();

  for (const node of loopNodes) {
    // FIX 1 — Lambda scope leak:
    // Skip any loop that lives inside a nested lambda or function_definition that
    // is NOT fnNode itself. Walk up until we find the nearest scope boundary;
    // if it is not fnNode, this loop belongs to an inner scope and must be ignored.
    let scopeAncestor: SyntaxNode | null = node.parent;
    while (scopeAncestor) {
      if (scopeAncestor.type === 'lambda_expression') {
        break;
      }
      if (scopeAncestor.type === 'function_definition') {
        const name = extractFunctionNameOrCallIdentifier(scopeAncestor);
        if (!macroRegistry || !macroRegistry.has(name)) {
          break;
        }
      }
      scopeAncestor = scopeAncestor.parent;
    }
    // If the nearest scope ancestor is not our function node, skip this loop.
    if (!scopeAncestor || scopeAncestor.id !== fnNode.id) {
      continue;
    }

    // Check if this node is a macro invocation, STL call, or user-defined call
    let isMacro = false;
    let isStl = false;
    let isUserCall = false;
    let macroBody = '';
    let stlName = '';
    let userCallName = '';
    
    if (node.type === 'function_definition' || node.type === 'call_expression') {
      const name = extractFunctionNameOrCallIdentifier(node);
      if (macroRegistry && macroRegistry.has(name)) {
        isMacro = true;
        macroBody = macroRegistry.get(name)!;
      } else if (node.type === 'call_expression' && STL_REGISTRY[name]) {
        isStl = true;
        stlName = name;
      } else if (node.type === 'call_expression' && functionRegistry && functionRegistry.has(name)) {
        isUserCall = true;
        userCallName = name;
      } else {
        continue; // Not a registered macro, STL algorithm, or known user call, skip this node
      }
    }

    const type = (node.type === 'for_statement' || node.type === 'for_range_loop' || (isMacro && macroBody.startsWith('for'))) ? 'for' : (isUserCall || isStl ? 'call' : 'while');
    
    let classification: LoopClassification | 'custom';
    let confidence: LoopConfidence;
    let customComplexity: ComplexityNode | undefined;
    
    if (isMacro) {
      const result = classifyMacroString(macroBody);
      classification = result.classification;
      confidence = result.confidence;
    } else if (isStl) {
      classification = STL_REGISTRY[stlName];
      confidence = 'high';
    } else if (isUserCall) {
      classification = 'custom';
      confidence = 'high';
      customComplexity = functionRegistry!.get(userCallName);
    } else {
      const result = classifyLoop(node);
      classification = result.classification;
      confidence = result.confidence;
    }

    const extractedLoop: ExtractedLoop = {
      type,
      startLine: node.startPosition.row,
      endLine: node.endPosition.row,
      classification,
      confidence,
      childLoops: [],
      customComplexity
    };

    loopMap.set(node.id, extractedLoop);

    // Walk up to find the nearest enclosing loop within the same function scope
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
      
      if (current.type === 'function_definition' || current.type === 'call_expression') {
        const name = extractFunctionNameOrCallIdentifier(current);
        if (macroRegistry && macroRegistry.has(name)) {
          parentLoopId = current.id;
          break;
        }
        if (current.type === 'call_expression' && STL_REGISTRY[name]) {
          parentLoopId = current.id;
          break;
        }
        if (current.type === 'call_expression' && functionRegistry && functionRegistry.has(name)) {
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
  // Iterate only the nodes that passed the scope check (present in loopMap).
  const topLevelLoops: ExtractedLoop[] = [];
  for (const [nodeId, extractedLoop] of loopMap) {
    const parentLoopId = loopParentMap.get(nodeId);

    if (parentLoopId != null) {
      const parentLoop = loopMap.get(parentLoopId);
      if (parentLoop) {
        parentLoop.childLoops.push(extractedLoop);
      } else {
        // Parent was skipped (inside a lambda) — treat this as top-level
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
  return extractFunctionNameOrCallIdentifier(fnNode);
}

/**
 * Extracts the identifier from a function_definition or call_expression.
 */
function extractFunctionNameOrCallIdentifier(node: SyntaxNode): string {
  if (node.type === 'call_expression') {
    const functionNode = node.childForFieldName('function') || node.child(0);
    if (functionNode && functionNode.type === 'identifier') {
      return functionNode.text;
    }
    return '<anonymous>';
  }

  const declarator = findChildOfType(node, 'function_declarator');
  if (declarator) {
    const identifier =
      findChildOfType(declarator, 'identifier') ||
      findChildOfType(declarator, 'field_identifier');
    if (identifier) return identifier.text;
  }
  return '<anonymous>';
}
