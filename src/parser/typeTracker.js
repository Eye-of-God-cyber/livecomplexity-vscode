"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildTypeContext = buildTypeContext;
exports.mergeTypeContexts = mergeTypeContexts;
/**
 * Creates an empty TypeContext.
 */
function emptyContext() {
    return { aliases: new Map(), variables: new Map() };
}
/**
 * Extracts the canonical base container name from an AST type node.
 * Handles:
 *   - template_type:    `set<int>` → "set"
 *   - type_identifier:  `PQ` → "PQ" (may be an alias; caller resolves)
 * Returns null for types we cannot statically resolve (primitives, pointers, etc.).
 */
function resolveTypeNode(typeNode) {
    var _a;
    if (typeNode.type === 'template_type') {
        var nameNode = (_a = typeNode.childForFieldName('name')) !== null && _a !== void 0 ? _a : typeNode.child(0);
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
        for (var i = 0; i < typeNode.childCount; i++) {
            var ch = typeNode.child(i);
            if (ch && (ch.type === 'template_type' || ch.type === 'type_identifier')) {
                return resolveTypeNode(ch);
            }
        }
    }
    // qualified_identifier handles std::map<int,int> or std::priority_queue
    if (typeNode.type === 'qualified_identifier') {
        var nameNode = typeNode.childForFieldName('name') || typeNode.child(typeNode.childCount - 1);
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
function collectDeclaredNames(declaratorNode) {
    var names = [];
    collectNamesRecursive(declaratorNode, names);
    return names;
}
function collectNamesRecursive(node, names) {
    if (node.type === 'identifier') {
        names.push(node.text);
        return;
    }
    if (node.type === 'init_declarator') {
        var decl = node.childForFieldName('declarator');
        if (decl)
            collectNamesRecursive(decl, names);
        return;
    }
    // For other wrapper nodes (reference_declarator, pointer_declarator, etc.),
    // walk children looking for identifiers.
    for (var i = 0; i < node.childCount; i++) {
        var ch = node.child(i);
        if (ch)
            collectNamesRecursive(ch, names);
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
function buildTypeContext(scope) {
    var _a;
    var ctx = emptyContext();
    // We collect raw variable→type entries where the type may be an alias name,
    // then do a second pass to resolve aliases.
    var rawVariables = new Map();
    walkShallow(scope, function (node) {
        // ── 1. alias_declaration  (using PQ = priority_queue<int>;) ───────────────
        if (node.type === 'alias_declaration') {
            var nameNode = node.childForFieldName('name');
            var typeNode = node.childForFieldName('type');
            if (nameNode && typeNode) {
                var resolved = resolveTypeNode(typeNode);
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
            var typeNode = node.childForFieldName('type');
            // declarator here is a type_identifier acting as the new alias name
            var declaratorNode = node.childForFieldName('declarator');
            if (typeNode && declaratorNode && declaratorNode.type === 'type_identifier') {
                var resolved = resolveTypeNode(typeNode);
                if (resolved) {
                    ctx.aliases.set(declaratorNode.text, resolved);
                }
            }
            return false;
        }
        // ── 3. declaration & parameter_declaration (set<int> s; / map<int,int>& mp) ──
        if (node.type === 'declaration' || node.type === 'parameter_declaration') {
            var typeNode = node.childForFieldName('type');
            if (!typeNode)
                return false;
            var rawType = resolveTypeNode(typeNode);
            if (!rawType)
                return false; // primitive (int, long, etc.) — skip
            var declaredNames = [];
            if (node.type === 'parameter_declaration') {
                var declNode = node.childForFieldName('declarator');
                if (declNode) {
                    var names = collectDeclaredNames(declNode);
                    declaredNames.push.apply(declaredNames, names);
                }
            }
            else {
                // Collect all declared variable names (handles `set<int> a, b, c;`)
                // In tree-sitter-cpp, `set<int> a, b, c;` produces ONE declaration node
                // with multiple `declarator` children (not a single `declarator` field).
                for (var i = 0; i < node.childCount; i++) {
                    var ch = node.child(i);
                    if (!ch)
                        continue;
                    // Skip the type node itself, punctuation, and the semicolon.
                    if (ch === typeNode || ch.type === ';')
                        continue;
                    // Each remaining non-punctuation child that is NOT the type is a declarator.
                    if (ch.type !== ',' && ch.type !== ';') {
                        var names = collectDeclaredNames(ch);
                        declaredNames.push.apply(declaredNames, names);
                    }
                }
            }
            for (var _i = 0, declaredNames_1 = declaredNames; _i < declaredNames_1.length; _i++) {
                var varName = declaredNames_1[_i];
                rawVariables.set(varName, rawType);
            }
            return false; // don't recurse inside declarations
        }
        return true; // recurse into other nodes
    });
    // Second pass: resolve raw variable types through the alias map.
    for (var _i = 0, rawVariables_1 = rawVariables; _i < rawVariables_1.length; _i++) {
        var _b = rawVariables_1[_i], varName = _b[0], rawType = _b[1];
        var resolved = (_a = ctx.aliases.get(rawType)) !== null && _a !== void 0 ? _a : rawType;
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
function mergeTypeContexts(globalCtx, localCtx) {
    if (!globalCtx)
        return localCtx;
    // Merge aliases (local wins on conflict).
    var mergedAliases = new Map(__spreadArray(__spreadArray([], globalCtx.aliases, true), localCtx.aliases, true));
    // Merge variables (local wins on conflict), then re-resolve any variable whose
    // stored type is itself an alias name in the merged alias map.
    // This handles the case where a local variable is declared with a globally-defined
    // alias type (e.g. global `typedef set<int> SI;` + local `SI s;`).
    var mergedVariables = new Map(__spreadArray(__spreadArray([], globalCtx.variables, true), localCtx.variables, true));
    for (var _i = 0, mergedVariables_1 = mergedVariables; _i < mergedVariables_1.length; _i++) {
        var _a = mergedVariables_1[_i], varName = _a[0], rawType = _a[1];
        var resolved = mergedAliases.get(rawType);
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
function walkShallow(node, visitor) {
    for (var i = 0; i < node.childCount; i++) {
        var child = node.child(i);
        if (!child)
            continue;
        // Never recurse into nested function or lambda bodies from the outer scope.
        if (child.type === 'function_definition' || child.type === 'lambda_expression') {
            continue;
        }
        var shouldRecurse = visitor(child);
        if (shouldRecurse) {
            walkShallow(child, visitor);
        }
    }
}
