import { SyntaxNode } from 'web-tree-sitter';

/**
 * TypeContext maps variable/alias names to their canonical container type.
 *
 * aliases:   type alias name → resolved base container type
 *            e.g. "PQ" → "priority_queue"  (from `using PQ = priority_queue<int>`)
 *
 * variables: variable name → resolved base container type
 *            e.g. "pq" → "priority_queue"  (from `priority_queue<int> pq`)
 *
 * Limitations (out of scope for D2.0):
 *   - `auto x = pq;`      — auto-deduced types are NOT tracked.
 *   - `auto &ref = pq;`   — reference aliases are NOT tracked.
 *   - `decltype(pq) x;`   — decltype expressions are NOT tracked.
 */
export interface TypeContext {
  aliases: Map<string, string>;
  variables: Map<string, string>;
}

/**
 * Creates an empty TypeContext.
 */
function emptyContext(): TypeContext {
  return { aliases: new Map(), variables: new Map() };
}

/**
 * Extracts the canonical base container name from an AST type node.
 * Handles:
 *   - template_type:    `set<int>` → "set"
 *   - type_identifier:  `PQ` → "PQ" (may be an alias; caller resolves)
 * Returns null for types we cannot statically resolve (primitives, pointers, etc.).
 */
function resolveTypeNode(typeNode: SyntaxNode): string | null {
  if (typeNode.type === 'template_type') {
    const nameNode = typeNode.childForFieldName('name') ?? typeNode.child(0);
    if (nameNode && nameNode.type === 'type_identifier') {
      return nameNode.text;
    }
    return null;
  }

  if (typeNode.type === 'type_identifier') {
    return typeNode.text;
  }

  // type_descriptor wraps a type_identifier or template_type (used in alias_declaration)
  if (typeNode.type === 'type_descriptor') {
    for (let i = 0; i < typeNode.childCount; i++) {
      const ch = typeNode.child(i);
      if (ch && (ch.type === 'template_type' || ch.type === 'type_identifier')) {
        return resolveTypeNode(ch);
      }
    }
  }

  // qualified_identifier handles std::map<int,int> or std::priority_queue
  if (typeNode.type === 'qualified_identifier') {
    const nameNode = typeNode.childForFieldName('name') || typeNode.child(typeNode.childCount - 1);
    if (nameNode) {
      return resolveTypeNode(nameNode);
    }
  }

  return null;
}

/**
 * Collects all declared variable names from a declarator node tree.
 * Handles:
 *   - Simple identifier:           `s`
 *   - init_declarator:             `s = {...}`
 *   - Comma-separated multi-decl:  `a, b, c` — Tree-Sitter represents these as
 *     sibling declarator nodes within the same declaration, not nested.
 */
function collectDeclaredNames(declaratorNode: SyntaxNode): string[] {
  const names: string[] = [];
  collectNamesRecursive(declaratorNode, names);
  return names;
}

function collectNamesRecursive(node: SyntaxNode, names: string[]): void {
  if (node.type === 'identifier') {
    names.push(node.text);
    return;
  }

  if (node.type === 'init_declarator') {
    const decl = node.childForFieldName('declarator');
    if (decl) collectNamesRecursive(decl, names);
    return;
  }

  // For other wrapper nodes (reference_declarator, pointer_declarator, etc.),
  // walk children looking for identifiers.
  for (let i = 0; i < node.childCount; i++) {
    const ch = node.child(i);
    if (ch) collectNamesRecursive(ch, names);
  }
}

/**
 * Performs a single-pass walk of `scope` and builds a TypeContext.
 *
 * Recognized AST patterns:
 *
 *   1. `declaration` with a `template_type`:
 *        set<int> s;          → variables: s → set
 *        set<int> a, b, c;    → variables: a, b, c → set
 *
 *   2. `alias_declaration` (using):
 *        using PQ = priority_queue<int>;  → aliases: PQ → priority_queue
 *
 *   3. `type_definition` (typedef):
 *        typedef map<int,int> MAP;        → aliases: MAP → map
 *
 *   4. `declaration` with a `type_identifier` (previously aliased type):
 *        PQ pq;  → variables: pq → priority_queue  (resolved via aliases)
 *
 * The walk is SHALLOW relative to function scopes: it does NOT recurse into
 * nested function_definition or lambda_expression bodies, so that function-local
 * calls don't pollute the global context and vice-versa.
 */
export function buildTypeContext(scope: SyntaxNode): TypeContext {
  const ctx = emptyContext();

  // We collect raw variable→type entries where the type may be an alias name,
  // then do a second pass to resolve aliases.
  const rawVariables = new Map<string, string>();

  walkShallow(scope, (node) => {
    // ── 1. alias_declaration  (using PQ = priority_queue<int>;) ───────────────
    if (node.type === 'alias_declaration') {
      const nameNode = node.childForFieldName('name');
      const typeNode = node.childForFieldName('type');
      if (nameNode && typeNode) {
        const resolved = resolveTypeNode(typeNode);
        if (resolved) {
          ctx.aliases.set(nameNode.text, resolved);
        }
      }
      return false; // don't recurse inside alias_declaration
    }

    // ── 2. type_definition  (typedef map<int,int> MAP;) ───────────────────────
    if (node.type === 'type_definition') {
      // The typedef'd name is in the `declarator` field as a type_identifier.
      // The source type is in the `type` field.
      const typeNode = node.childForFieldName('type');
      // declarator here is a type_identifier acting as the new alias name
      const declaratorNode = node.childForFieldName('declarator');
      if (typeNode && declaratorNode && declaratorNode.type === 'type_identifier') {
        const resolved = resolveTypeNode(typeNode);
        if (resolved) {
          ctx.aliases.set(declaratorNode.text, resolved);
        }
      }
      return false;
    }

    // ── 3. declaration & parameter_declaration (set<int> s; / map<int,int>& mp) ──
    if (node.type === 'declaration' || node.type === 'parameter_declaration') {
      const typeNode = node.childForFieldName('type');
      if (!typeNode) return false;

      const rawType = resolveTypeNode(typeNode);
      if (!rawType) return false; // primitive (int, long, etc.) — skip

      const declaredNames: string[] = [];

      if (node.type === 'parameter_declaration') {
        const declNode = node.childForFieldName('declarator');
        if (declNode) {
          const names = collectDeclaredNames(declNode);
          declaredNames.push(...names);
        }
      } else {
        // Collect all declared variable names (handles `set<int> a, b, c;`)
        // In tree-sitter-cpp, `set<int> a, b, c;` produces ONE declaration node
        // with multiple `declarator` children (not a single `declarator` field).
        for (let i = 0; i < node.childCount; i++) {
          const ch = node.child(i);
          if (!ch) continue;
          // Skip the type node itself, punctuation, and the semicolon.
          if (ch === typeNode || ch.type === ';') continue;
          // Each remaining non-punctuation child that is NOT the type is a declarator.
          if (ch.type !== ',' && ch.type !== ';') {
            const names = collectDeclaredNames(ch);
            declaredNames.push(...names);
          }
        }
      }

      for (const varName of declaredNames) {
        rawVariables.set(varName, rawType);
      }

      return false; // don't recurse inside declarations
    }

    return true; // recurse into other nodes
  });

  // Second pass: resolve raw variable types through the alias map.
  for (const [varName, rawType] of rawVariables) {
    const resolved = ctx.aliases.get(rawType) ?? rawType;
    ctx.variables.set(varName, resolved);
  }

  return ctx;
}

/**
 * Merges a global and a local TypeContext.
 * Local aliases and variables shadow global ones (local wins on conflict).
 *
 * @param globalCtx  The file-level context (may be undefined).
 * @param localCtx   The function-scoped context.
 */
export function mergeTypeContexts(
  globalCtx: TypeContext | undefined,
  localCtx: TypeContext
): TypeContext {
  if (!globalCtx) return localCtx;

  // Merge aliases (local wins on conflict).
  const mergedAliases = new Map([...globalCtx.aliases, ...localCtx.aliases]);

  // Merge variables (local wins on conflict), then re-resolve any variable whose
  // stored type is itself an alias name in the merged alias map.
  // This handles the case where a local variable is declared with a globally-defined
  // alias type (e.g. global `typedef set<int> SI;` + local `SI s;`).
  const mergedVariables = new Map([...globalCtx.variables, ...localCtx.variables]);
  for (const [varName, rawType] of mergedVariables) {
    const resolved = mergedAliases.get(rawType);
    if (resolved) {
      mergedVariables.set(varName, resolved);
    }
  }

  return { aliases: mergedAliases, variables: mergedVariables };
}

/**
 * Shallow AST walker.
 * Calls `visitor(node)` for each node. If visitor returns false, the node's
 * children are NOT traversed (allows skipping sub-trees).
 * Stops recursing into nested function_definition and lambda_expression so that
 * global and local scopes stay cleanly separated.
 */
function walkShallow(
  node: SyntaxNode,
  visitor: (n: SyntaxNode) => boolean
): void {
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (!child) continue;

    // Never recurse into nested function or lambda bodies from the outer scope.
    if (child.type === 'function_definition' || child.type === 'lambda_expression') {
      continue;
    }

    const shouldRecurse = visitor(child);
    if (shouldRecurse) {
      walkShallow(child, visitor);
    }
  }
}
