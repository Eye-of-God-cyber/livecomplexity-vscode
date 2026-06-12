export function containsIdentifier(node: import('web-tree-sitter').SyntaxNode, name: string): boolean {
  if (node.type === 'identifier' && node.text === name) return true;
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child && containsIdentifier(child, name)) return true;
  }
  return false;
}
