/**
 * AST Macro Nesting Investigation
 *
 * Issue 3: Do nested brace-less macros (fo(i, n) fo(j, m) s++;)
 * appear as parent-child in the tree-sitter AST, or as siblings?
 *
 * This script dumps:
 *   - Full AST trees for both the nested and non-nested macro forms
 *   - Parent chains of every node
 *   - Sibling relationships
 *   - Node spans (startPosition / endPosition)
 *   - Byte ranges (startIndex / endIndex)
 *   - The full parent-child nesting structure
 *
 * We test three cases:
 *   1. fo(i, n) fo(j, m) s++;       (nested brace-less — the failing case)
 *   2. fo(i, n) { fo(j, m) s++; }   (with outer braces)
 *   3. fo(i, n) { fo(j, m) { s++; } }  (fully braced)
 *
 * We also test a standard for-loop nested form for reference:
 *   4. for(int i=0;i<n;i++) for(int j=0;j<m;j++) s++;
 */

import * as path from 'path';
import Parser from 'web-tree-sitter';

const projectRoot = path.resolve(__dirname, '..');

async function initParser(): Promise<Parser> {
  await Parser.init();
  const parser = new Parser();
  const Lang = await Parser.Language.load(
    path.join(projectRoot, 'node_modules', 'tree-sitter-wasms', 'out', 'tree-sitter-cpp.wasm')
  );
  parser.setLanguage(Lang);
  return parser;
}

function nodeInfo(n: Parser.SyntaxNode, indent = 0): string {
  const prefix = '  '.repeat(indent);
  const span = `[${n.startPosition.row}:${n.startPosition.column}–${n.endPosition.row}:${n.endPosition.column}]`;
  const bytes = `bytes[${n.startIndex}–${n.endIndex}]`;
  const id = `id=${n.id}`;
  const parentId = n.parent ? `parentId=${n.parent.id}` : 'parentId=ROOT';
  const text = JSON.stringify(n.text.slice(0, 60));
  return `${prefix}${n.type} ${span} ${bytes} ${id} ${parentId} text=${text}`;
}

function dumpTree(n: Parser.SyntaxNode, indent = 0, maxDepth = 10): void {
  if (indent > maxDepth) return;
  console.log(nodeInfo(n, indent));
  for (let i = 0; i < n.childCount; i++) {
    const ch = n.child(i);
    if (ch) dumpTree(ch, indent + 1, maxDepth);
  }
}

function dumpParentChain(n: Parser.SyntaxNode): void {
  const chain: string[] = [];
  let cur: Parser.SyntaxNode | null = n;
  while (cur) {
    chain.push(`${cur.type}(id=${cur.id})`);
    cur = cur.parent;
  }
  console.log('Parent chain:', chain.join(' -> '));
}

function findAllCallExpressions(n: Parser.SyntaxNode): Parser.SyntaxNode[] {
  const results: Parser.SyntaxNode[] = [];
  if (n.type === 'call_expression') results.push(n);
  for (let i = 0; i < n.childCount; i++) {
    const ch = n.child(i);
    if (ch) results.push(...findAllCallExpressions(ch));
  }
  return results;
}

function findAllNodes(n: Parser.SyntaxNode, types: string[]): Parser.SyntaxNode[] {
  return n.descendantsOfType(types);
}

function dumpSiblingRelationships(n: Parser.SyntaxNode): void {
  if (!n.parent) { console.log('  No parent — no siblings'); return; }
  const parent = n.parent;
  console.log(`  Parent: ${parent.type}(id=${parent.id}), childCount=${parent.childCount}`);
  for (let i = 0; i < parent.childCount; i++) {
    const sib = parent.child(i);
    if (!sib) continue;
    const marker = sib.id === n.id ? '>>>' : '   ';
    console.log(`  ${marker} sibling[${i}]: ${sib.type}(id=${sib.id}) text=${JSON.stringify(sib.text.slice(0, 40))}`);
  }
}

async function investigate(label: string, source: string, parser: Parser): Promise<void> {
  console.log('\n' + '='.repeat(80));
  console.log(`CASE: ${label}`);
  console.log('SOURCE:');
  source.split('\n').forEach((l, i) => console.log(`  ${i + 1}: ${l}`));
  console.log('='.repeat(80));

  const tree = parser.parse(source);
  const root = tree.rootNode;

  console.log('\n--- FULL AST ---');
  dumpTree(root, 0, 15);

  console.log('\n--- ALL call_expression NODES ---');
  const calls = findAllNodes(root, ['call_expression']);
  for (const c of calls) {
    console.log(`\ncall_expression: text=${JSON.stringify(c.text.slice(0, 60))}`);
    console.log(nodeInfo(c, 1));
    console.log('  Siblings:');
    dumpSiblingRelationships(c);
    console.log('  Parent chain:');
    dumpParentChain(c);
  }

  console.log('\n--- ALL for_statement / for_range_loop NODES ---');
  const forStmts = findAllNodes(root, ['for_statement', 'for_range_loop']);
  for (const f of forStmts) {
    console.log(`\n${f.type}: text=${JSON.stringify(f.text.slice(0, 80))}`);
    console.log(nodeInfo(f, 1));
    console.log('  Siblings:');
    dumpSiblingRelationships(f);
    console.log('  Parent chain:');
    dumpParentChain(f);
    // Dump direct children
    console.log('  Children:');
    for (let i = 0; i < f.childCount; i++) {
      const ch = f.child(i);
      if (ch) console.log(`    child[${i}]: ${ch.type} named=${f.namedChild(i) !== null} text=${JSON.stringify(ch.text.slice(0, 40))}`);
    }
    // What is the 'body' field?
    const body = f.childForFieldName('body');
    console.log(`  body field: ${body ? body.type + '(id=' + body.id + ')' : 'null'}`);
  }

  console.log('\n--- expression_statement NODES ---');
  const exprStmts = findAllNodes(root, ['expression_statement']);
  for (const e of exprStmts) {
    console.log(`\nexpression_statement: text=${JSON.stringify(e.text.slice(0, 60))}`);
    console.log(nodeInfo(e, 1));
    console.log('  Siblings:');
    dumpSiblingRelationships(e);
  }
}

async function main() {
  const parser = await initParser();

  // Macro definition we'll use (fo macro = for loop)
  const macroDefLine = '#define fo(i, n) for (int i = 0; i < (n); i++)';

  // Case 1: Brace-less nested macros (the FAILING case)
  await investigate(
    'BRACE-LESS NESTED: fo(i, n) fo(j, m) s++;',
    `${macroDefLine}
void test() {
    int n = 10, m = 5, s = 0;
    fo(i, n) fo(j, m) s++;
}`,
    parser
  );

  // Case 2: Outer braces only
  await investigate(
    'OUTER BRACES: fo(i, n) { fo(j, m) s++; }',
    `${macroDefLine}
void test() {
    int n = 10, m = 5, s = 0;
    fo(i, n) { fo(j, m) s++; }
}`,
    parser
  );

  // Case 3: Fully braced
  await investigate(
    'FULLY BRACED: fo(i, n) { fo(j, m) { s++; } }',
    `${macroDefLine}
void test() {
    int n = 10, m = 5, s = 0;
    fo(i, n) { fo(j, m) { s++; } }
}`,
    parser
  );

  // Case 4: Standard for-loop nested (brace-less reference)
  await investigate(
    'REFERENCE: for(int i=0;i<n;i++) for(int j=0;j<m;j++) s++;',
    `void test() {
    int n = 10, m = 5, s = 0;
    for (int i = 0; i < n; i++) for (int j = 0; j < m; j++) s++;
}`,
    parser
  );

  // Case 5: rep macro (also fails)
  await investigate(
    'REP NESTED: rep(i, 0, n) rep(j, 0, m) s++;',
    `#define rep(i, a, b) for (int i = (a); i < (b); i++)
void test() {
    int n = 10, m = 5, s = 0;
    rep(i, 0, n) rep(j, 0, m) s++;
}`,
    parser
  );

  // Case 6: Nested macro — what does the AST look like for the CALL SITE?
  // (BEFORE macro expansion — tree-sitter may not expand macros at all)
  await investigate(
    'MACRO CALL SITE (no #define): fo(i, n) fo(j, m) s++;',
    `void test() {
    int n = 10, m = 5, s = 0;
    fo(i, n) fo(j, m) s++;
}`,
    parser
  );
}

main().catch(e => { console.error(e); process.exit(1); });
