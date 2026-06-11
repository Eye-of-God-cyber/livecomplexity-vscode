import { SyntaxNode, Tree } from 'web-tree-sitter';
import { classifyLoop, classifyMacroString, LoopClassification, LoopConfidence, STL_REGISTRY, STL_MEMBER_REGISTRY } from './loopClassifier';
import { ComplexityNode } from '../engine/complexityNode';
import { parseOneOff } from './treeSitter';
import { buildTypeContext, mergeTypeContexts, TypeContext } from './typeTracker';
import { extractCompoundBound, extractCompoundBoundNodes } from './loopClassifier';

export interface MacroRegistryEntry {
  bodyText: string;
  boundParamIndex?: number;
}

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
  /**
   * The iteration variable name for `for` loops, e.g. `i` in `for(int i=0;i<n;i++)`.
   * Used by the inference engine to detect step-dependent (harmonic) nested loops.
   */
  iteratorVar?: string;
  boundVar?: string | string[];
  /**
   * If set, this loop's step increment is the named variable from an enclosing loop.
   * e.g. `j += i` where `i` is an outer loop's iterator → stepDependentOn = 'i'.
   * Used to trigger harmonic reduction instead of naive multiplication.
   */
  stepDependentOn?: string;
  /**
   * If true, this inner loop is amortized relative to its parent:
   * its total work across all outer iterations is bounded by the parent's
   * complexity, not by parent × self. Used for trial division and two-pointer.
   */
  isAmortized?: boolean;
  /**
   * Bug D fix: D5.0 positional argument substitution.
   * When a known user-defined function is called (isUserCall), we extract the
   * actual argument expressions at the call site and canonicalize them.
   * callArgVars[i] = the canonical variable name for the i-th call-site argument.
   * calleeParamNames[i] = the formal parameter name of the callee at position i.
   * inference.ts uses these to substitute the callee's linearVars/expVars.
   */
  callArgVars?: string[];
  calleeParamNames?: string[];
}

export interface AnalysisResult {
  functions: ExtractedFunction[];
  loops: ExtractedLoop[];
}

/**
 * Extracts a dynamic registry of loop macros defined in the file.
 * Returns a map of macro identifier (e.g. 'fo') -> raw macro string (e.g. 'for(int i=0;i<n;i++)').
 */
export function buildMacroRegistry(tree: Tree): Map<string, MacroRegistryEntry> {
  const registry = new Map<string, MacroRegistryEntry>();
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
      let boundParamIndex: number | undefined = undefined;
      const paramsNode = def.childForFieldName('parameters');
      if (paramsNode) {
        const dummyCode = `void _dummy() { ${argText} {} }`;
        const dummyTree = parseOneOff(dummyCode);
        const loopNode = dummyTree?.rootNode.descendantsOfType('for_statement')[0];
        if (loopNode) {
          const result = classifyLoop(loopNode);
          if (result.boundVar) {
            let paramIdx = 0;
            for (let i = 0; i < paramsNode.childCount; i++) {
              const p = paramsNode.child(i);
              if (p && p.type === 'identifier') {
                const targetText = Array.isArray(result.boundVar) && result.boundVar.length === 1 ? result.boundVar[0] : result.boundVar;
                if (typeof targetText === 'string' && p.text === targetText) {
                  boundParamIndex = paramIdx;
                  break;
                }
                paramIdx++;
              }
            }
          }
        }
      }
      registry.set(nameNode.text, { bodyText: argText, boundParamIndex });
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
  macroRegistry?: Map<string, MacroRegistryEntry>,
  functionRegistry?: Map<string, ComplexityNode>,
  globalTypeContext?: TypeContext,
  paramMap?: Map<string, string[]>
): ExtractedLoop[] {
  // Build a function-local TypeContext and merge with the global one.
  // Local declarations shadow global ones (local wins on conflict).
  const localTypeContext = buildTypeContext(fnNode);
  const typeContext = mergeTypeContexts(globalTypeContext, localTypeContext);
  // typeContext is used for STL member method interception (D2.1+).
  const LOOP_TYPES = ['for_statement', 'for_range_loop', 'while_statement', 'do_statement'] as const;
  
  // We also intercept function_definition and call_expression to check against the macro registry.
  const searchTypes = [...LOOP_TYPES, 'function_definition', 'call_expression', 'subscript_expression'];
  const loopNodes = fnNode.descendantsOfType(searchTypes);

  // ── D4.8: Canonical Symbol Registry ─────────────────────────────────────────
  // Build an alias map for this function analysis only. Lifetime: this call frame.
  // Maps DeclarationID -> CanonicalDeclarationID. Never serialized or reused.
  const aliasMap = buildAliasRegistry(fnNode, macroRegistry);

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

    // Check if this node is a macro invocation, standalone STL call, member STL call, or user-defined call
    let isMacro = false;
    let isStl = false;
    let isStlMember = false;
    let isUserCall = false;
    let isMapOp = false;
    let name = '';
    let stlName = '';
    let stlMemberClassification: LoopClassification = 'constant';
    let mapOpClassification: LoopClassification = 'constant';
    let userCallName = '';
    
    if (node.type === 'function_definition' || node.type === 'call_expression') {
      name = extractFunctionNameOrCallIdentifier(node);
      if (macroRegistry && macroRegistry.has(name)) {
        isMacro = true;
      } else if (node.type === 'call_expression' && STL_REGISTRY[name]) {
        isStl = true;
        stlName = name;
      } else if (node.type === 'call_expression' && functionRegistry && functionRegistry.has(name)) {
        isUserCall = true;
        userCallName = name;
      } else if (node.type === 'call_expression') {
        // ── D2.1: STL member method interception ──────────────────────────────
        // Fires when the call is a field_expression: `object.method(args)`
        const funcNode = node.childForFieldName('function');
        if (funcNode && funcNode.type === 'field_expression') {
          const objectIdent = funcNode.childForFieldName('argument');
          const fieldIdent  = funcNode.childForFieldName('field');
          if (objectIdent && fieldIdent) {
            const resolvedType = typeContext.variables.get(objectIdent.text);
            if (resolvedType) {
              const key = `${resolvedType}::${fieldIdent.text}`;
              if (STL_MEMBER_REGISTRY[key] !== undefined) {
                isStlMember = true;
                stlMemberClassification = STL_MEMBER_REGISTRY[key];
              }
            }
          }
        }
        if (!isStlMember) {
          continue; // Not a registered macro, STL algorithm, member call, or known user call
        }
      } else {
        continue;
      }
    } else if (node.type === 'subscript_expression') {
      const arrName = node.childForFieldName('argument')?.text;
      if (arrName) {
        const canonicalType = typeContext.variables.get(arrName);
        if (canonicalType === 'map') {
          isMapOp = true;
          mapOpClassification = 'logarithmic';
        } else if (canonicalType === 'unordered_map') {
          isMapOp = true;
          mapOpClassification = 'constant';
        }
      }
      if (!isMapOp) continue;
    }

    const type = (node.type === 'for_statement' || node.type === 'for_range_loop' || (isMacro)) ? 'for' : (isUserCall || isStl || isStlMember || isMapOp ? 'call' : 'while');
    
    let classification: LoopClassification | 'custom';
    let confidence: LoopConfidence;
    let customComplexity: ComplexityNode | undefined;
    let boundVar: string | string[] | undefined;
    
    if (isMacro) {
      const macroMeta = macroRegistry!.get(name)!;
      const result = classifyMacroString(macroMeta.bodyText);
      classification = result.classification;
      confidence = result.confidence;

      if (macroMeta.boundParamIndex !== undefined) {
        if (node.type === 'call_expression') {
          const argsNode = node.childForFieldName('arguments');
          if (argsNode) {
            let argIdx = 0;
            for (let i = 0; i < argsNode.childCount; i++) {
              const p = argsNode.child(i);
              if (p && p.type !== '(' && p.type !== ')' && p.type !== ',') {
                if (argIdx === macroMeta.boundParamIndex) {
                  const argNodes = extractCompoundBoundNodes(p);
                  if (argNodes && argNodes.length > 0) {
                    const canonical = canonicalizeIdentNode(argNodes[0], fnNode, aliasMap);
                    boundVar = canonical;
                  } else if (p.type === 'identifier') {
                    boundVar = p.text;
                  }
                  break;
                }
                argIdx++;
              }
            }
          }
        } else if (node.type === 'function_definition') {
          const decl = node.childForFieldName('declarator');
          if (decl) {
            const params = decl.childForFieldName('parameters');
            if (params) {
              let argIdx = 0;
              for (let i = 0; i < params.childCount; i++) {
                const p = params.child(i);
                if (p && p.type !== '(' && p.type !== ')' && p.type !== ',') {
                  if (argIdx === macroMeta.boundParamIndex) {
                    const argNodes = extractCompoundBoundNodes(p);
                    if (argNodes && argNodes.length > 0) {
                      const canonical = canonicalizeIdentNode(argNodes[0], fnNode, aliasMap);
                      boundVar = canonical;
                    } else {
                      boundVar = p.text;
                    }
                    break;
                  }
                  argIdx++;
                }
              }
            }
          }
        }
      }
    } else if (isStl) {
      classification = STL_REGISTRY[stlName];
      confidence = 'high';
    } else if (isStlMember) {
      classification = stlMemberClassification;
      confidence = 'medium';
    } else if (isMapOp) {
      classification = mapOpClassification;
      confidence = 'high';
    } else if (isUserCall) {
      classification = 'custom';
      confidence = 'high';
      customComplexity = functionRegistry!.get(userCallName);

      // ── Bug D fix: D5.0 Positional Argument Substitution ───────────────────
      // Extract the actual arguments at the call site and canonicalize them.
      // Only identifier and structurally proven container-size arguments are
      // accepted (via extractCompoundBoundNodes, which now handles cast_expression).
      // If an argument cannot be structurally resolved, it is left as its raw text.
      // No heuristics. No guessing. Structural proof only.
      const calleeParams = paramMap?.get(userCallName);
      if (calleeParams && calleeParams.length > 0) {
        const argsNode = node.childForFieldName('arguments');
        if (argsNode) {
          const callArgVars: string[] = [];
          let argIdx = 0;
          for (let i = 0; i < argsNode.childCount; i++) {
            const p = argsNode.child(i);
            if (!p || p.type === '(' || p.type === ')' || p.type === ',') continue;
            if (argIdx < calleeParams.length) {
              // extractCompoundBoundNodes handles identifier, cast_expression, and
              // call_expression (.size()/.length()) — the three structurally proven forms.
              const argNodes = extractCompoundBoundNodes(p);
              if (argNodes && argNodes.length === 1) {
                // Single-element result: canonicalize through the alias registry.
                const argNode = argNodes[0];
                const canonical = canonicalizeIdentNode(argNode, fnNode, aliasMap);
                // Accept if it's a single string or an array of length 1.
                if (typeof canonical === 'string') {
                  callArgVars.push(canonical);
                } else if (Array.isArray(canonical) && canonical.length === 1) {
                  callArgVars.push(canonical[0]);
                } else {
                  callArgVars.push('n'); // generic fallback for unsupported compound args
                }
              } else {
                // Multi-element or rejected: fallback to generic 'n'
                callArgVars.push('n');
              }
            }
            argIdx++;
          }
          if (callArgVars.length > 0) {
            // Attach arg mapping to the loop for inference.ts to substitute.
            // These are set below when building extractedLoop.
            // Store temporarily; will be attached after the ExtractedLoop literal.
            (node as any).__callArgVars = callArgVars;
            (node as any).__calleeParamNames = calleeParams;
          }
        }
      }
    } else {
      const result = classifyLoop(node);
      classification = result.classification;
      confidence = result.confidence;
      boundVar = result.boundVar;

      // ── D4.8: Canonicalize boundVar via the alias registry ────────────────
      // If the loop bound variable has a proven alias to another declaration,
      // replace it with the canonical name before it enters ExtractedLoop.
      // This is pure string replacement at the exact information-loss point.
      // No heuristics. No guessing. Structural proof only.
      if (boundVar) {
        const conditionNode = node.childForFieldName('condition');
        if (Array.isArray(boundVar)) {
          boundVar = boundVar.flatMap(v => canonicalizeVar(v, conditionNode, fnNode, aliasMap));
        } else {
          boundVar = canonicalizeVar(boundVar, conditionNode, fnNode, aliasMap);
        }
      }

      // ── D2.2: Graph traversal upgrade ─────────────────────────────────────
      // After normal classification, check if this while_statement is actually
      // a BFS/DFS graph traversal. All four conditions must hold simultaneously:
      //   1. while_statement
      //   2. condition = !container.empty()
      //   3. container type ∈ {queue, stack, deque}  (via TypeContext)
      //   4. body contains a for_range_loop  (adjacency-list iteration)
      // Any failure → silently keep the existing classification.
      if (node.type === 'while_statement' && isGraphTraversalWhile(node, typeContext)) {
        classification = 'graph_traversal';
        confidence = 'medium';
      } else if (node.type === 'while_statement' && isDijkstraWhile(node, typeContext)) {
        // ── D2.3: Priority-queue graph traversal (Dijkstra / Prim) ────────────────
        // Container must be priority_queue (not queue/stack/deque).
        // Produces O((V+E) log V), not O(V+E).
        // The two checks are mutually exclusive by the container type guard.
        classification = 'graph_log_traversal';
        confidence = 'medium';
      }
    }

    // Extract the iterator variable for 'for' loops so the inference engine
    // can detect step-dependent (harmonic) relationships with child loops.
    let iteratorVar: string | undefined;
    if (!isMacro && !isStl && !isStlMember && !isUserCall && node.type === 'for_statement') {
      iteratorVar = getForIteratorVar(node) ?? undefined;
    }

    const extractedLoop: ExtractedLoop = {
      type,
      startLine: node.startPosition.row,
      endLine: node.endPosition.row,
      classification,
      confidence,
      childLoops: [],
      customComplexity,
      iteratorVar,
      boundVar,
      callArgVars: (node as any).__callArgVars,
      calleeParamNames: (node as any).__calleeParamNames,
    };
    // Clean up temporary properties.
    delete (node as any).__callArgVars;
    delete (node as any).__calleeParamNames;

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
        if (current.type === 'call_expression' && isRegisteredStlMember(current, typeContext)) {
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
  // Build a node-id → AST-node map from loopNodes for O(1) lookups.
  const astNodeMap = new Map<number, SyntaxNode>();
  for (const node of loopNodes) {
    astNodeMap.set(node.id, node);
  }

  // Iterate only the nodes that passed the scope check (present in loopMap).
  const topLevelLoops: ExtractedLoop[] = [];
  for (const [nodeId, extractedLoop] of loopMap) {
    const parentLoopId = loopParentMap.get(nodeId);

    if (parentLoopId != null) {
      const parentLoop = loopMap.get(parentLoopId);
      if (parentLoop) {
        const childAstNode = astNodeMap.get(nodeId);
        const parentAstNode = astNodeMap.get(parentLoopId);

        // ── Harmonic (step-dependent) check ──────────────────────────────
        if (parentLoop.iteratorVar && childAstNode?.type === 'for_statement') {
          if (isStepDependentOn(childAstNode, parentLoop.iteratorVar)) {
            extractedLoop.stepDependentOn = parentLoop.iteratorVar;
          }
        }

        // ── Amortized check ───────────────────────────────────────────────
        // Only run when not already classified as step-dependent, and only
        // when the child is a while/do-while inside a for loop parent.
        if (
          !extractedLoop.stepDependentOn &&
          childAstNode &&
          (childAstNode.type === 'while_statement' || childAstNode.type === 'do_statement') &&
          parentAstNode?.type === 'for_statement'
        ) {
          if (isAmortizedInner(childAstNode, parentAstNode)) {
            extractedLoop.isAmortized = true;
          }
        }

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
 * Extracts the iteration variable name from a for_statement initializer.
 * Handles both `for(int i=0;...)` (init_declarator) and `for(i=0;...)` (assignment_expression).
 * Returns null if the variable cannot be determined.
 */
export function getForIteratorVar(forNode: SyntaxNode): string | null {
  const init = forNode.childForFieldName('initializer');
  if (!init) return null;

  // `for(int i = 0; ...)` — init_declarator
  const decl = init.descendantsOfType('init_declarator')[0];
  if (decl) {
    const declarator = decl.childForFieldName('declarator');
    if (declarator && declarator.type === 'identifier') return declarator.text;
  }

  // `for(i = 0; ...)` — plain assignment_expression
  const assign = init.descendantsOfType('assignment_expression')[0];
  if (assign) {
    const lhs = assign.childForFieldName('left');
    if (lhs && lhs.type === 'identifier') return lhs.text;
  }

  return null;
}

/**
 * Returns true when an inner while/do-while loop is amortized relative to
 * its parent for loop. Two precise structural patterns are detected:
 *
 * Pattern A — Two-pointer:
 *   The inner while mutates a variable `v` that appears in the inner condition,
 *   AND the inner condition also references the outer for loop's iteration variable.
 *   e.g.  for(int r=0; r<n; r++) { while(l < r) l++; }
 *         mutated=l, inner-cond references outer-iter r → amortized
 *
 * Pattern B — Trial division:
 *   The inner while mutates a variable `v` that appears in the inner condition,
 *   AND that same `v` also appears in the outer for loop's condition.
 *   e.g.  for(int i=2; i*i<=n; i++) { while(n%i==0) n/=i; }
 *         mutated=n, inner-cond n%i==0 contains n, outer-cond i*i<=n contains n → amortized
 *
 * Monotonic mutations accepted:
 *   v++  v--  v+=literal  v-=literal  v/=anything
 *
 * False-positive guards:
 *   - Mutated var must appear in inner condition (prevents y++ when cond is unrelated).
 *   - Inner condition must reference either the outer iterator (A) or outer-cond var (B).
 *   - Only activates when parent is a for_statement (not a while nesting another while).
 */
export function isAmortizedInner(innerNode: SyntaxNode, parentForNode: SyntaxNode): boolean {
  // ── 1. Find the monotonic mutation variable in the inner body ─────────────
  const bodyNode = innerNode.childForFieldName('body');
  if (!bodyNode) return false;

  let mutatedVar: string | null = null;
  let mutationOp: string | null = null;

  const bodyUpdates = bodyNode.descendantsOfType([
    'update_expression', 'assignment_expression', 'math_assignment_expression'
  ]);

  for (const update of bodyUpdates) {
    if (update.type === 'update_expression') {
      // v++ or v-- : find any identifier child
      for (let ci = 0; ci < update.childCount; ci++) {
        const ch = update.child(ci);
        if (ch && ch.type === 'identifier') {
          mutatedVar = ch.text;
          mutationOp = update.text.includes('++') ? '++' : '--';
          break;
        }
      }
    } else {
      // assignment_expression or math_assignment_expression
      const opNode = update.childForFieldName('operator') ||
        update.children.find(c => c.type === '+=' || c.type === '-=' || c.type === '/=');
      if (!opNode) continue;
      const op = opNode.type;

      const lhs = update.childForFieldName('left');
      if (!lhs || lhs.type !== 'identifier') continue;

      if (op === '+=' || op === '-=') {
        // Only accept literal step to guarantee strict monotonicity
        const rhs = update.childForFieldName('right');
        if (rhs && rhs.type === 'number_literal' && Number(rhs.text) > 0) {
          mutatedVar = lhs.text;
          mutationOp = op;
        }
      } else if (op === '/=') {
        // Division always reduces n (any divisor > 1 implied by context)
        mutatedVar = lhs.text;
        mutationOp = op;
      }
    }
    if (mutatedVar) break;
  }

  if (!mutatedVar) return false;

  // ── 2. Mutated variable must appear in inner condition ────────────────────
  let innerCond: SyntaxNode | null = innerNode.childForFieldName('condition');
  if (!innerCond) return false;
  // Unwrap condition_clause: `(expr)` → `expr`
  if (innerCond.type === 'condition_clause') {
    for (let ci = 0; ci < innerCond.childCount; ci++) {
      const ch = innerCond.child(ci);
      if (ch && ch.type !== '(' && ch.type !== ')') {
        innerCond = ch;
        break;
      }
    }
  }
  if (!innerCond.text.includes(mutatedVar)) return false;

  // ── 3B. Trial division: mutated variable appears in outer for condition ───
  const outerCond = parentForNode.childForFieldName('condition');
  if (outerCond && outerCond.text.includes(mutatedVar)) {
    if (mutationOp !== '/=') return false; // reject += for trial division
    return true;
  }

  // ── 3A. Two-pointer: inner condition references outer iterator ────────────
  const outerIterVar = getForIteratorVar(parentForNode);
  if (outerIterVar && innerCond.text.includes(outerIterVar)) {
    return true;
  }

  return false;
}

/**
 * Returns true when the inner for_statement's update clause increments by
 * `outerVar` (i.e. `j += outerVar`) AND its initializer begins at an expression
 * that depends on `outerVar` (e.g. `j = outerVar`, `j = 2*outerVar`,
 * `j = outerVar*outerVar`).
 *
 * False-positive guard: `j += blockSize` where blockSize ≠ outerVar → false.
 */
export function isStepDependentOn(innerForNode: SyntaxNode, outerVar: string): boolean {
  // ── 1. Update clause must be `j += outerVar` ──────────────────────────────
  const updateNode = innerForNode.childForFieldName('update');
  if (!updateNode) return false;

  // Unwrap comma_expression (e.g. `j+=i, k++`) — use first operand
  const effectiveUpdate = updateNode.type === 'comma_expression'
    ? (updateNode.child(0) ?? updateNode)
    : updateNode;

  if (
    effectiveUpdate.type !== 'assignment_expression' &&
    effectiveUpdate.type !== 'math_assignment_expression'
  ) return false;

  // Operator must be +=
  const opNode = effectiveUpdate.childForFieldName('operator') ||
    effectiveUpdate.children.find(c => c.type === '+=');
  if (!opNode || opNode.type !== '+=') return false;

  // RHS of the update must be exactly the outer iterator identifier
  const updateRhs = effectiveUpdate.childForFieldName('right');
  if (!updateRhs || updateRhs.type !== 'identifier' || updateRhs.text !== outerVar) return false;

  // ── 2. Initializer must reference outerVar ────────────────────────────────
  const init = innerForNode.childForFieldName('initializer');
  if (!init) return false;

  // Extract the RHS of the inner initialization value
  let initValue: SyntaxNode | null = null;

  const decl = init.descendantsOfType('init_declarator')[0];
  if (decl) {
    initValue = decl.childForFieldName('value');
  } else {
    const assign = init.descendantsOfType('assignment_expression')[0];
    if (assign) initValue = assign.childForFieldName('right');
  }

  if (!initValue) return false;

  // Accept: j = outerVar
  if (initValue.type === 'identifier' && initValue.text === outerVar) return true;

  // Accept: j = k * outerVar  or  j = outerVar * k  (any constant × outerVar)
  if (initValue.type === 'binary_expression' && initValue.childForFieldName('operator')?.type === '*') {
    const l = initValue.childForFieldName('left');
    const r = initValue.childForFieldName('right');
    if ((l && l.type === 'identifier' && l.text === outerVar) ||
        (r && r.type === 'identifier' && r.text === outerVar)) {
      return true;
    }
  }

  // Accept: j = outerVar * outerVar  (i*i — Sieve of Eratosthenes init)
  // This is already covered by the `*` check above if both sides are outerVar.

  return false;
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

/**
 * Returns true if `callNode` is a call_expression whose function is a
 * field_expression resolving to a key in STL_MEMBER_REGISTRY via the TypeContext.
 * Used during the parent-walk to correctly scope nested STL member calls.
 */
function isRegisteredStlMember(callNode: SyntaxNode, ctx: TypeContext): boolean {
  const funcNode = callNode.childForFieldName('function');
  if (!funcNode || funcNode.type !== 'field_expression') return false;
  const objectIdent = funcNode.childForFieldName('argument');
  const fieldIdent  = funcNode.childForFieldName('field');
  if (!objectIdent || !fieldIdent) return false;
  const resolvedType = ctx.variables.get(objectIdent.text);
  if (!resolvedType) return false;
  return STL_MEMBER_REGISTRY[`${resolvedType}::${fieldIdent.text}`] !== undefined;
}

// ─── Graph Traversal Detection (D2.2) ────────────────────────────────────────

/**
 * Returns true if `whileNode` matches the BFS/DFS graph traversal signature:
 *   container ∈ {queue, stack, deque} + !x.empty() + for_range_loop body.
 * Produces O(V+E).
 */
function isGraphTraversalWhile(whileNode: SyntaxNode, ctx: TypeContext): boolean {
  return _isGraphWhile(whileNode, ctx, ['queue', 'stack', 'deque']);
}

// ─── Dijkstra / Priority-Queue Traversal Detection (D2.3) ────────────────────

/**
 * Returns true if `whileNode` matches the Dijkstra/priority-queue graph
 * traversal signature:
 *   container = priority_queue + !pq.empty() + for_range_loop body.
 * Produces O((V+E) log V).
 * Mutually exclusive with isGraphTraversalWhile by the container type guard.
 */
function isDijkstraWhile(whileNode: SyntaxNode, ctx: TypeContext): boolean {
  return _isGraphWhile(whileNode, ctx, ['priority_queue']);
}

// ─── Shared graph-while detection core ───────────────────────────────────────

/**
 * Core implementation shared by isGraphTraversalWhile and isDijkstraWhile.
 *
 * All four conditions must hold simultaneously:
 *   1. Condition is `!x.empty()` (exact AST shape — unary ! wrapping call_expression).
 *   2. Method field name is exactly "empty".
 *   3. Variable `x` TypeContext-resolves to one of `allowedTypes`.
 *   4. Body contains a for_range_loop with no intervening for/while/do loop
 *      between it and the outer while (ancestor walk using .id comparison).
 *
 * Any single failure returns false silently, preserving the existing classification.
 */
function _isGraphWhile(
  whileNode: SyntaxNode,
  ctx: TypeContext,
  allowedTypes: string[]
): boolean {
  // ── 1. Extract condition ──────────────────────────────────────────────────
  let condNode = whileNode.childForFieldName('condition');
  if (!condNode) return false;

  // Unwrap condition_clause: `(expr)` → inner expr
  if (condNode.type === 'condition_clause') {
    for (let i = 0; i < condNode.childCount; i++) {
      const ch = condNode.child(i);
      if (ch && ch.type !== '(' && ch.type !== ')') {
        condNode = ch;
        break;
      }
    }
  }

  // ── 2. Condition must be `!x.empty()` ────────────────────────────────────
  if (condNode.type !== 'unary_expression') return false;
  const unaryOp = condNode.child(0);
  if (!unaryOp || unaryOp.text !== '!') return false;

  const innerCall = condNode.child(1);
  if (!innerCall || innerCall.type !== 'call_expression') return false;

  const callFunc = innerCall.childForFieldName('function');
  if (!callFunc || callFunc.type !== 'field_expression') return false;

  const containerIdent = callFunc.childForFieldName('argument');
  const methodIdent    = callFunc.childForFieldName('field');
  if (!containerIdent || !methodIdent) return false;
  if (methodIdent.text !== 'empty') return false;

  // ── 3. Container type must be in allowedTypes ─────────────────────────────
  const resolvedType = ctx.variables.get(containerIdent.text);
  if (!resolvedType) return false;
  if (!allowedTypes.includes(resolvedType)) return false;

  // ── 4. Body must contain a for_range_loop at direct depth ────────────────
  // A range loop is "direct" if no for/while/do appears in the ancestor chain
  // between it and the outer while node (.id comparison avoids wrapper aliasing).
  const body = whileNode.childForFieldName('body');
  if (!body) return false;

  const allRangeLoops = body.descendantsOfType('for_range_loop');
  const directRangeLoops = allRangeLoops.filter(rl => {
    let cur: SyntaxNode | null = rl.parent;
    while (cur && cur.id !== whileNode.id) {
      if (
        cur.type === 'for_statement'   ||
        cur.type === 'for_range_loop'  ||
        cur.type === 'while_statement' ||
        cur.type === 'do_statement'
      ) {
        return false;
      }
      cur = cur.parent;
    }
    return true;
  });
  return directRangeLoops.length > 0;
}


// ═══════════════════════════════════════════════════════════════════════════════
// D4.8: CANONICAL SYMBOL REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════
//
// Philosophy: declaration identity, not string identity.
//
// An alias A -> B exists iff ALL of the following structural proofs hold:
//   1. A has exactly one provable write (init_declarator only in D4.8).
//   2. The write's RHS is a bare identifier only.
//   3. A is never the subject of an update_expression (++, --).
//   4. A is never the subject of a compound assignment (+=, -=, *=, /=, ...).
//   5. A is never passed via & address-of.
//   6. A is never passed via >> (cin >> a).
//   7. A is never passed to a function whose param is `int&` or where
//      the signature is unavailable (conservative rejection).
//   8. RHS B must resolve lexically to a prior declaration.
//
// If any proof fails → reject alias → treat A as an independent variable.
//
// Lifetime: AliasMap is created inside extractFunctionLoops, used locally,
// never returned, never serialized. Garbage-collected on function return.
// ═══════════════════════════════════════════════════════════════════════════════

/** Analysis-local alias registry. Maps DeclarationID -> CanonicalDeclarationID. */
type AliasMap = Map<number, number>;

/**
 * Lexically resolves an identifier node to the declarator SyntaxNode that
 * introduced it into scope within `fnNode`.
 *
 * Handles:
 *   - Block scope (compound_statement, prior siblings)
 *   - Nested compound statements (walks up multiple levels)
 *   - Function/lambda parameter lists
 *   - For-loop initialisers (int i = 0)
 *
 * Never crosses the `fnNode` boundary.
 * Returns the identifier node that IS the declarator, or null.
 */
function resolveDeclarationNode(
  ident: SyntaxNode,
  fnNode: SyntaxNode
): SyntaxNode | null {
  const targetName = ident.text;
  let current: SyntaxNode | null = ident;

  while (current) {
    if (current.id === fnNode.id) break;

    const parent: SyntaxNode | null = current.parent;
    if (!parent) break;

    // ── 1. Block scope: scan prior siblings for declarations ─────────────────
    if (
      parent.type === 'compound_statement' ||
      parent.type === 'translation_unit' ||
      parent.type === 'declaration_list'
    ) {
      for (let i = 0; i < parent.childCount; i++) {
        const sibling = parent.child(i);
        if (!sibling) continue;
        if (sibling.id === current.id) break; // stop at current — no forward refs

        if (sibling.type === 'declaration') {
          const found = findDeclaredIdentifier(sibling, targetName);
          if (found) return found;
        }
      }
    }

    // ── 2. For-statement initialiser ─────────────────────────────────────────
    if (parent.type === 'for_statement') {
      const init = parent.childForFieldName('initializer');
      if (init && init.type === 'declaration') {
        const found = findDeclaredIdentifier(init, targetName);
        if (found) return found;
      }
    }

    // ── 3. Function / lambda parameter list ──────────────────────────────────
    if (
      parent.type === 'function_definition' ||
      parent.type === 'lambda_expression'
    ) {
      let paramList: SyntaxNode | null = null;
      if (parent.type === 'function_definition') {
        const decl = parent.childForFieldName('declarator');
        paramList = decl?.childForFieldName('parameters') ?? null;
      } else {
        paramList = parent.childForFieldName('parameters') ?? null;
      }

      if (paramList) {
        for (let i = 0; i < paramList.childCount; i++) {
          const p = paramList.child(i);
          if (!p || p.type !== 'parameter_declaration') continue;
          const declNode = p.childForFieldName('declarator');
          if (!declNode) continue;
          if (declNode.type === 'identifier' && declNode.text === targetName) return declNode;
          // Handle reference/pointer declarators wrapping an identifier
          if (declNode.type !== 'identifier') {
            const inner = declNode.descendantsOfType('identifier')[0];
            if (inner && inner.text === targetName) return inner;
          }
        }
      }
      // Stop at any function/lambda scope boundary.
      if (parent.id !== fnNode.id) break;
    }

    current = parent;
  }

  return null;
}

/**
 * Searches a `declaration` node for an `init_declarator` whose declarator
 * identifier matches `targetName`. Returns the identifier SyntaxNode or null.
 */
function findDeclaredIdentifier(
  declNode: SyntaxNode,
  targetName: string
): SyntaxNode | null {
  const initDecls = declNode.descendantsOfType('init_declarator');
  for (const id of initDecls) {
    const declarator = id.childForFieldName('declarator');
    if (!declarator) continue;
    if (declarator.type === 'identifier' && declarator.text === targetName) return declarator;
    if (declarator.type !== 'identifier') {
      const inner = declarator.descendantsOfType('identifier')[0];
      if (inner && inner.text === targetName) return inner;
    }
  }
  return null;
}

/**
 * Follows the alias chain from `startId` to its canonical declaration ID.
 * Uses a visited Set<number> for cycle detection (defence-in-depth).
 * Guarantees termination for any input. If a cycle is detected, returns
 * `startId` (safe conservative fallback).
 */
function resolveCanonical(startId: number, aliasMap: AliasMap): number {
  const visited = new Set<number>();
  let current = startId;
  while (aliasMap.has(current)) {
    if (visited.has(current)) return startId; // Cycle detected — return original.
    visited.add(current);
    current = aliasMap.get(current)!;
  }
  return current;
}

/**
 * Returns true if the identifier named `name` with Declaration ID `declId`
 * is mutated anywhere in `fnNode`.
 *
 * Mutations checked:
 *   - update_expression    (m++, ++m, m--, --m)
 *   - compound assignment  (m += k, m -= k, m *= k, ...)
 *   - address-of           (&m)
 *   - stream extraction    (cin >> m)
 *   - mutable ref argument (foo(m) where param is int& or signature unknown)
 */
function isMutated(
  name: string,
  fnNode: SyntaxNode,
  fnDefMap: Map<string, SyntaxNode>,
  macroRegistry?: Map<string, MacroRegistryEntry>
): boolean {
  const allIdents = fnNode.descendantsOfType('identifier').filter(id => id.text === name);

  for (const id of allIdents) {
    const p = id.parent;
    if (!p) continue;

    // update_expression: m++, ++m, m--, --m
    if (p.type === 'update_expression') return true;

    // compound assignment: m += k, m *= k, etc.
    if (p.type === 'assignment_expression') {
      const lhs = p.childForFieldName('left');
      const op  = p.childForFieldName('operator');
      if (lhs && lhs.id === id.id && op && op.type !== '=') return true;
    }

    // address-of: &m
    if (p.type === 'unary_expression') {
      const opNode = p.childForFieldName('operator') ?? p.child(0);
      if (opNode && opNode.text === '&') return true;
    }

    // stream extraction: cin >> m
    if (p.type === 'binary_expression') {
      const op = p.childForFieldName('operator');
      if (op && op.type === '>>') {
        const right = p.childForFieldName('right');
        if (right && right.id === id.id) return true;
      }
    }

    // function call argument
    if (p.type === 'argument_list') {
      const callNode = p.parent;
      if (!callNode || callNode.type !== 'call_expression') continue;
      const funcIdent = callNode.childForFieldName('function');
      const calleeName = funcIdent?.type === 'identifier' ? funcIdent.text : null;
      if (!calleeName) return true; // unknown callee — conservative reject

      const calleeDef = fnDefMap.get(calleeName);
      if (!calleeDef) {
        if (macroRegistry && macroRegistry.has(calleeName)) continue; // Known macro, assume it doesn't mutate its bound parameters
        return true; // signature unavailable — conservative reject
      }
      const argIndex = getArgumentIndex(p, id);
      if (argIndex === -1) return true;

      const paramDecl = getParameterAt(calleeDef, argIndex);
      if (!paramDecl) return true;

      if (!isProvenImmutableParam(paramDecl)) return true;
    }
  }

  return false;
}

/** Returns the 0-based index of `identNode` within an argument_list. Returns -1 if not found. */
function getArgumentIndex(argListNode: SyntaxNode, identNode: SyntaxNode): number {
  let idx = 0;
  for (let i = 0; i < argListNode.childCount; i++) {
    const ch = argListNode.child(i);
    if (!ch || ch.type === '(' || ch.type === ')' || ch.type === ',') continue;
    if (ch.id === identNode.id) return idx;
    idx++;
  }
  return -1;
}

/** Returns the parameter_declaration at position `index` in a function_definition. */
function getParameterAt(fnDefNode: SyntaxNode, index: number): SyntaxNode | null {
  const decl = fnDefNode.childForFieldName('declarator');
  const params = decl?.childForFieldName('parameters');
  if (!params) return null;
  let idx = 0;
  for (let i = 0; i < params.childCount; i++) {
    const p = params.child(i);
    if (!p || p.type !== 'parameter_declaration') continue;
    if (idx === index) return p;
    idx++;
  }
  return null;
}

/**
 * Returns true if a parameter_declaration is provably immutable from the caller's
 * perspective:
 *   - by value `int x`        → safe
 *   - `const int x`           → safe
 *   - `const int& x`          → safe (const reference)
 *   - `int& x`                → UNSAFE (mutable reference)
 *   - `int* x`                → UNSAFE (pointer)
 */
function isProvenImmutableParam(paramDecl: SyntaxNode): boolean {
  const typeNode = paramDecl.childForFieldName('type');
  const declNode = paramDecl.childForFieldName('declarator');
  if (!typeNode) return false;

  // Pointer declarator → always reject.
  if (declNode && declNode.type === 'pointer_declarator') return false;

  // Reference declarator → safe only if const-qualified.
  if (declNode && declNode.type === 'reference_declarator') {
    if (typeNode.text.startsWith('const ')) return true;
    for (let i = 0; i < typeNode.childCount; i++) {
      const ch = typeNode.child(i);
      if (ch && ch.type === 'type_qualifier' && ch.text === 'const') return true;
    }
    return false; // mutable reference — reject.
  }

  return true; // by-value — safe.
}

/**
 * Builds a map of function name -> function_definition node for all functions
 * in the same translation unit. Used to look up callee signatures in isMutated.
 */
function buildFunctionDefMap(fnNode: SyntaxNode): Map<string, SyntaxNode> {
  const map = new Map<string, SyntaxNode>();
  let root: SyntaxNode = fnNode;
  while (root.parent) root = root.parent;

  const allFns = root.descendantsOfType('function_definition');
  for (const fn of allFns) {
    const decl = fn.childForFieldName('declarator');
    if (!decl) continue;
    const idents = decl.descendantsOfType('identifier');
    if (idents.length > 0) map.set(idents[0].text, fn);
  }
  return map;
}

/**
 * Counts provable write operations to the identifier named `name` in `fnNode`.
 *
 * Counts:
 *   - init_declarator with a value (int m = n;) — counted precisely by DeclID.
 *   - plain `=` assignment_expression where LHS spells `name` — counted
 *     conservatively (without DeclID check, to err on the side of rejection).
 */
function countWrites(name: string, declId: number, fnNode: SyntaxNode): number {
  let count = 0;

  // init_declarator writes — use DeclID for precision.
  for (const id of fnNode.descendantsOfType('init_declarator')) {
    const decl = id.childForFieldName('declarator');
    if (!decl) continue;
    let ident: SyntaxNode | null = decl.type === 'identifier' ? decl : decl.descendantsOfType('identifier')[0] ?? null;
    if (ident && ident.text === name && ident.id === declId) count++;
  }

  // Plain `=` assignment writes — conservative (text match only).
  for (const a of fnNode.descendantsOfType('assignment_expression')) {
    const op  = a.childForFieldName('operator');
    if (!op || op.type !== '=') continue;
    const lhs = a.childForFieldName('left');
    if (lhs && lhs.type === 'identifier' && lhs.text === name) count++;
  }

  return count;
}

function countSymbolicWrites(name: string, declId: number, fnNode: SyntaxNode): number {
  let count = 0;

  for (const id of fnNode.descendantsOfType('init_declarator')) {
    const decl = id.childForFieldName('declarator');
    if (!decl) continue;
    let ident: SyntaxNode | null = decl.type === 'identifier' ? decl : decl.descendantsOfType('identifier')[0] ?? null;
    if (ident && ident.text === name && ident.id === declId) {
      const rhs = id.childForFieldName('value');
      if (rhs && rhs.type !== 'number_literal') count++;
    }
  }

  for (const a of fnNode.descendantsOfType('assignment_expression')) {
    const op  = a.childForFieldName('operator');
    if (!op || op.type !== '=') continue;
    const lhs = a.childForFieldName('left');
    if (lhs && lhs.type === 'identifier' && lhs.text === name) {
      const resolvedLhs = resolveDeclarationNode(lhs, fnNode);
      if (resolvedLhs && resolvedLhs.id === declId) {
         const rhs = a.childForFieldName('right');
         if (rhs && rhs.type !== 'number_literal') count++;
      }
    }
  }

  return count;
}

/**
 * Builds the Canonical Symbol Registry for a single function analysis.
 *
 * Lifetime guarantee: Map exists only within the extractFunctionLoops call frame.
 * Never returned. Never serialized. GC'd when call returns.
 *
 * Only processes init_declarator with bare-identifier RHS (D4.8 scope).
 * Plain `m = n;` assignments are NOT aliased (writeCount > 1 due to conservative
 * counting — safe rejection).
 */
export function buildAliasRegistry(fnNode: SyntaxNode, macroRegistry?: Map<string, MacroRegistryEntry>): AliasMap {
  const aliasMap: AliasMap = new Map();
  const fnDefMap = buildFunctionDefMap(fnNode);

  for (const initDecl of fnNode.descendantsOfType('init_declarator')) {
    // Skip declarations inside nested lambdas or inner function_definitions.
    let scopeNode: SyntaxNode | null = initDecl.parent;
    let inScope = false;
    while (scopeNode) {
      if (scopeNode.type === 'function_definition' || scopeNode.type === 'lambda_expression') {
        if (scopeNode.id === fnNode.id) inScope = true;
        break;
      }
      scopeNode = scopeNode.parent;
    }
    if (!inScope) continue;

    // Extract LHS declarator identifier.
    const lhsDecl = initDecl.childForFieldName('declarator');
    if (!lhsDecl) continue;
    let lhsIdent: SyntaxNode | null =
      lhsDecl.type === 'identifier'
        ? lhsDecl
        : lhsDecl.descendantsOfType('identifier')[0] ?? null;
    if (!lhsIdent) continue;

    const lhsDeclId = lhsIdent.id;
    const lhsName   = lhsIdent.text;

    // RHS must be an identifier or an approved binary expression
    const rhs = initDecl.childForFieldName('value');
    if (!rhs) continue;

    let targetDeclId: number;

    if (rhs.type === 'identifier') {
      const targetDecl = resolveDeclarationNode(rhs, fnNode);
      if (!targetDecl) continue;
      targetDeclId = targetDecl.id;
    } else if (rhs.type === 'binary_expression') {
      const op = rhs.childForFieldName('operator');
      if (!op || (op.type !== '+' && op.type !== '/')) continue;
      
      // D5.5 structurally check: if '/', right MUST be number_literal
      if (op.type === '/') {
        const right = rhs.childForFieldName('right');
        if (!right || right.type !== 'number_literal') continue;
      }

      // Verify shape with strict traversal
      const compoundNodes = extractCompoundBoundNodes(rhs);
      if (!compoundNodes || compoundNodes.length === 0) continue;

      // D5.5 user constraint: reject function calls in binary expressions.
      // All extracted nodes must be strictly identifiers.
      if (compoundNodes.some(n => n.type !== 'identifier')) continue;

      targetDeclId = rhs.id;
    } else {
      continue;
    }

    // Self-alias guard.
    if (lhsDeclId === targetDeclId) continue;

    // Exactly one symbolic write to LHS.
    if (countSymbolicWrites(lhsName, lhsDeclId, fnNode) !== 1) continue;

    // LHS must not be mutated anywhere.
    if (isMutated(lhsName, fnNode, fnDefMap, macroRegistry)) continue;

    aliasMap.set(lhsDeclId, targetDeclId);
  }

  for (const assign of fnNode.descendantsOfType('assignment_expression')) {
    const op = assign.childForFieldName('operator');
    if (!op || op.type !== '=') continue; // must be exactly '='

    let lhsScopeNode: SyntaxNode | null = assign.parent;
    let inScope = false;
    while (lhsScopeNode) {
      if (lhsScopeNode.type === 'function_definition' || lhsScopeNode.type === 'lambda_expression') {
        if (lhsScopeNode.id === fnNode.id) inScope = true;
        break;
      }
      lhsScopeNode = lhsScopeNode.parent;
    }
    if (!inScope) continue;

    const lhs = assign.childForFieldName('left');
    if (!lhs || lhs.type !== 'identifier') continue;
    const lhsName = lhs.text;

    // LHS resolves to a declaration
    const lhsDecl = resolveDeclarationNode(lhs, fnNode);
    if (!lhsDecl) continue;
    const lhsDeclId = lhsDecl.id;

    // Exactly one symbolic write exists
    if (countSymbolicWrites(lhsName, lhsDeclId, fnNode) !== 1) continue;

    // LHS must not be mutated anywhere
    if (isMutated(lhsName, fnNode, fnDefMap, macroRegistry)) continue;

    const rhs = assign.childForFieldName('right');
    if (!rhs) continue;

    let targetDeclId: number;
    if (rhs.type === 'identifier') {
      const targetDecl = resolveDeclarationNode(rhs, fnNode);
      if (!targetDecl) continue;
      targetDeclId = targetDecl.id;
    } else if (rhs.type === 'binary_expression') {
      const opRhs = rhs.childForFieldName('operator');
      if (!opRhs || (opRhs.type !== '+' && opRhs.type !== '/')) continue;
      if (opRhs.type === '/') {
        const right = rhs.childForFieldName('right');
        if (!right || right.type !== 'number_literal') continue;
      }
      const compoundNodes = extractCompoundBoundNodes(rhs);
      if (!compoundNodes || compoundNodes.length === 0) continue;
      if (compoundNodes.some(n => n.type !== 'identifier')) continue;
      targetDeclId = rhs.id;
    } else if (rhs.type === 'cast_expression') {
      const unwrap = (n: any) => n && n.type === 'cast_expression' ? (n.child(1) || n) : n;
      const castInner = unwrap(rhs);
      if (!castInner || castInner.type !== 'identifier') continue;
      const targetDecl = resolveDeclarationNode(castInner, fnNode);
      if (!targetDecl) continue;
      targetDeclId = targetDecl.id;
    } else {
      continue;
    }

    if (lhsDeclId === targetDeclId) continue;
    aliasMap.set(lhsDeclId, targetDeclId);
  }

  return aliasMap;
}

/**
 * Canonicalizes `rawVar` (the loop boundVar string) by resolving it through
 * the alias registry. Returns the canonical variable name, or `rawVar` if
 * no alias is proven or if resolution cannot be completed structurally.
 *
 * This is the sole injection point of D4.8 into the existing pipeline.
 * No other function in the pipeline changes.
 */
function canonicalizeVar(
  rawVar: string,
  condNode: SyntaxNode | null,
  fnNode: SyntaxNode,
  aliasMap: AliasMap
): string | string[] {

  // Locate the bound identifier in the condition expression.
  const condIdent = findConditionBoundIdent(rawVar, condNode);
  if (!condIdent) return rawVar;

  return canonicalizeIdentNode(condIdent, fnNode, aliasMap);
}

function canonicalizeIdentNode(
  identNode: SyntaxNode,
  fnNode: SyntaxNode,
  aliasMap: AliasMap
): string | string[] {
  const rawVar = identNode.text;

  // Lexically resolve to its declaration.
  const declNode = resolveDeclarationNode(identNode, fnNode);
  if (!declNode) return rawVar;

  // Follow alias chain.
  const canonicalId = resolveCanonical(declNode.id, aliasMap);
  if (typeof canonicalId === 'string') return canonicalId;

  const targetNode = findNodeById(fnNode, canonicalId);
  if (!targetNode) return rawVar;

  // Bug B fix: Phase 2 lazy evaluation of compound initializers.
  // Applied to the resolved target node (after following the alias chain).
  const parent = targetNode.parent;
  if (parent && parent.type === 'init_declarator') {
    const valueNode = parent.childForFieldName('value');
    if (valueNode) {
      const compoundNodes = extractCompoundBoundNodes(valueNode);
      if (compoundNodes && compoundNodes.length > 0) {
        // Guard: verify all identifier leaves are declared in scope.
        for (const leaf of compoundNodes) {
          if (leaf.type === 'identifier' && !resolveDeclarationNode(leaf, fnNode)) {
            // Undeclared identifier — structurally unverifiable. Fall back.
            return targetNode.text;
          }
        }
        return compoundNodes.flatMap(vNode =>
          canonicalizeIdentNode(vNode, fnNode, aliasMap)
        );
      }
    }
  }

  // D5.5: Explicitly map approved binary_expression
  if (targetNode.type === 'binary_expression') {
    const op = targetNode.childForFieldName('operator');
    if (op && (op.type === '+' || op.type === '/')) {
      const compoundNodes = extractCompoundBoundNodes(targetNode);
      if (compoundNodes && compoundNodes.length > 0) {
        // Guard: verify all identifier leaves are declared in scope.
        for (const leaf of compoundNodes) {
          if (leaf.type === 'identifier' && !resolveDeclarationNode(leaf, fnNode)) {
            return targetNode.text;
          }
        }
        return compoundNodes.flatMap(vNode =>
          canonicalizeIdentNode(vNode, fnNode, aliasMap)
        );
      }
    }
  }

  return targetNode.text;
}

/**
 * Finds the identifier in a loop condition that is the bound variable
 * (RHS of `<` or `<=` expression). Handles condition_clause wrapping.
 */
function findConditionBoundIdent(
  rawVar: string,
  condNode: SyntaxNode | null
): SyntaxNode | null {
  if (!condNode) return null;

  let expr = condNode;
  if (expr.type === 'condition_clause') {
    for (let i = 0; i < expr.childCount; i++) {
      const ch = expr.child(i);
      if (ch && ch.type !== '(' && ch.type !== ')') { expr = ch; break; }
    }
  }

  if (expr.type !== 'binary_expression') return null;
  const op = expr.childForFieldName('operator')?.type;
  if (op !== '<' && op !== '<=') return null;

  const right = expr.childForFieldName('right');
  if (right) {
    const ident = findIdentNodeByText(right, rawVar);
    if (ident) return ident;
  }
  return null;
}

/**
 * Recursively finds an identifier node by its exact text within an expression.
 */
function findIdentNodeByText(node: SyntaxNode, text: string): SyntaxNode | null {
  if (node.type === 'identifier' && node.text === text) return node;
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child) {
      const found = findIdentNodeByText(child, text);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Depth-first search within `node` for a SyntaxNode with `.id === targetId`.
 * Bounded to the subtree rooted at `node`.
 */
function findNodeById(node: SyntaxNode, targetId: number): SyntaxNode | null {
  if (node.id === targetId) return node;
  for (let i = 0; i < node.childCount; i++) {
    const ch = node.child(i);
    if (!ch) continue;
    const found = findNodeById(ch, targetId);
    if (found) return found;
  }
  return null;
}
