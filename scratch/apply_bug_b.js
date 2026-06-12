const fs = require('fs');
let code = fs.readFileSync('src/parser/astUtils.ts', 'utf8');

// 1. Add extractCompoundBound import
code = code.replace(
  "import { buildTypeContext, mergeTypeContexts, TypeContext } from './typeTracker';",
  "import { buildTypeContext, mergeTypeContexts, TypeContext } from './typeTracker';\nimport { extractCompoundBound } from './loopClassifier';"
);

// 2. extractFunctionLoops flatMap
code = code.replace(
  "boundVar = canonicalizeVar(boundVar, conditionNode, fnNode, aliasMap);",
  "if (Array.isArray(boundVar)) {\n          boundVar = boundVar.flatMap(v => canonicalizeVar(v, conditionNode, fnNode, aliasMap));\n        } else {\n          boundVar = canonicalizeVar(boundVar, conditionNode, fnNode, aliasMap);\n        }"
);

// 3. Split canonicalizeVar and canonicalizeIdentNode
const oldCanonicalizeVar = `function canonicalizeVar(
  rawVar: string,
  condNode: SyntaxNode | null,
  fnNode: SyntaxNode,
  aliasMap: AliasMap
): string {
  if (aliasMap.size === 0) return rawVar;

  // Locate the bound identifier in the condition expression.
  const condIdent = findConditionBoundIdent(rawVar, condNode);
  if (!condIdent) return rawVar;

  // Lexically resolve to its declaration.
  const declNode = resolveDeclarationNode(condIdent, fnNode);
  if (!declNode) return rawVar;

  // Follow alias chain.
  const canonicalId = resolveCanonical(declNode.id, aliasMap);
  if (canonicalId === declNode.id) return rawVar;

  // Retrieve canonical declaration text.
  const canonicalNode = findNodeById(fnNode, canonicalId);
  if (!canonicalNode) return rawVar;

  return canonicalNode.text;
}`;

const newCanonicalizeVar = `function canonicalizeVar(
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
  identNode: import('web-tree-sitter').SyntaxNode,
  fnNode: import('web-tree-sitter').SyntaxNode,
  aliasMap: AliasMap
): string | string[] {
  const rawVar = identNode.text;

  // Lexically resolve to its declaration.
  const declNode = resolveDeclarationNode(identNode, fnNode);
  if (!declNode) return rawVar;

  // Follow alias chain.
  const canonicalId = resolveCanonical(declNode.id, aliasMap);
  if (typeof canonicalId === 'string') return canonicalId;

  if (canonicalId === declNode.id) {
    // BUG B FIX: Phase 2 lazy evaluation of compound initializers
    const parent = declNode.parent;
    if (parent && parent.type === 'init_declarator') {
      const valueNode = parent.childForFieldName('value');
      if (valueNode) {
        const compound = extractCompoundBound(valueNode);
        if (compound && compound.length > 0) {
          return compound.flatMap(v => {
            const vIdent = findIdentNodeByText(valueNode, v);
            return vIdent ? canonicalizeIdentNode(vIdent, fnNode, aliasMap) : v;
          });
        }
      }
    }
    return rawVar;
  }

  // Retrieve canonical declaration text.
  const canonicalNode = findNodeById(fnNode, canonicalId);
  if (!canonicalNode) return rawVar;

  return canonicalNode.text;
}`;

code = code.replace(oldCanonicalizeVar, newCanonicalizeVar);

// 4. Add findIdentNodeByText
const oldFindConditionBoundIdentEnd = `  const right = expr.childForFieldName('right');
  if (right && right.type === 'identifier' && right.text === rawVar) return right;
  return null;
}`;

const newFindConditionBoundIdentEnd = `  const right = expr.childForFieldName('right');
  if (right) {
    const ident = findIdentNodeByText(right, rawVar);
    if (ident) return ident;
  }
  return null;
}

/**
 * Recursively finds an identifier node by its exact text within an expression.
 */
function findIdentNodeByText(node: import('web-tree-sitter').SyntaxNode, text: string): import('web-tree-sitter').SyntaxNode | null {
  if (node.type === 'identifier' && node.text === text) return node;
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child) {
      const found = findIdentNodeByText(child, text);
      if (found) return found;
    }
  }
  return null;
}`;

code = code.replace(oldFindConditionBoundIdentEnd, newFindConditionBoundIdentEnd);

fs.writeFileSync('src/parser/astUtils.ts', code);
