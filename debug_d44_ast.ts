import { initParser, parseOneOff } from './src/parser/treeSitter';
import { resolve } from 'path';

function showNode(label: string, n: any, depth = 0) {
  const indent = '  '.repeat(depth);
  const fields: string[] = [];
  for (const f of ['left','right','operator','function','arguments','condition','consequence','value','declarator','name']) {
    const ch = n.childForFieldName(f);
    if (ch) fields.push(`${f}=${ch.type}("${ch.text.slice(0,20)}")`);
  }
  console.log(`${indent}[${n.type}] "${n.text.slice(0,40).replace(/\n/g,'\\n')}" ${fields.length ? '{'+fields.join(', ')+'}' : ''}`);
  if (depth < 4) {
    for (let i = 0; i < n.childCount; i++) showNode('', n.child(i), depth + 1);
  }
}

async function main() {
  await initParser(resolve('./dist'));

  const cases = [
    {
      label: 'MergeSort full',
      code: `
void mergeSort(int* arr, int l, int r) {
    if (l >= r) return;
    int mid = (l + r) / 2;
    mergeSort(arr, l, mid);
    mergeSort(arr, mid + 1, r);
    merge(arr, l, mid, r);
}`
    },
    {
      label: 'Binary search recursive',
      code: `
int bsearch(int* arr, int lo, int hi, int target) {
    if (lo > hi) return -1;
    int mid = (lo + hi) / 2;
    if (arr[mid] == target) return mid;
    if (arr[mid] < target) return bsearch(arr, mid + 1, hi, target);
    return bsearch(arr, lo, mid - 1, target);
}`
    },
    {
      label: 'QuickSort',
      code: `
void quickSort(int* arr, int l, int r) {
    if (l >= r) return;
    int p = partition(arr, l, r);
    quickSort(arr, l, p - 1);
    quickSort(arr, p + 1, r);
}`
    },
    {
      label: 'Segment tree build',
      code: `
void build(int node, int l, int r) {
    if (l == r) { tree[node] = arr[l]; return; }
    int mid = (l + r) / 2;
    build(2 * node, l, mid);
    build(2 * node + 1, mid + 1, r);
    tree[node] = tree[2*node] + tree[2*node+1];
}`
    },
    {
      label: 'Generic recursion',
      code: `
int solve(int x) {
    if (x <= 1) return x;
    return solve(x - 1) + solve(x - 2);
}`
    },
    {
      label: 'MergeSort mid >> 1 variant',
      code: `
void mergeSort(int* arr, int l, int r) {
    if (l >= r) return;
    int mid = l + (r - l) / 2;
    mergeSort(arr, l, mid);
    mergeSort(arr, mid + 1, r);
    merge(arr, l, mid, r);
}`
    },
  ];

  for (const { label, code } of cases) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`CASE: ${label}`);
    console.log('='.repeat(60));
    const tree = parseOneOff(code)!;

    // Show all if_statements
    const ifs = tree.rootNode.descendantsOfType('if_statement');
    for (const stmt of ifs) {
      let cond = stmt.childForFieldName('condition');
      if (cond?.type === 'condition_clause') {
        for (let i = 0; i < cond.childCount; i++) {
          const ch = cond.child(i);
          if (ch && ch.type !== '(' && ch.type !== ')') { cond = ch; break; }
        }
      }
      console.log(`\nif-condition: type=${cond?.type} text="${cond?.text}"`);
      if (cond?.type === 'binary_expression') {
        const op = cond.childForFieldName('operator');
        const lhs = cond.childForFieldName('left');
        const rhs = cond.childForFieldName('right');
        console.log(`  op="${op?.type}" lhs="${lhs?.text}"(${lhs?.type}) rhs="${rhs?.text}"(${rhs?.type})`);
      }
    }

    // Show all declaration_statements looking for mid
    const decls = tree.rootNode.descendantsOfType('declaration');
    for (const d of decls) {
      const text = d.text;
      if (text.includes('mid')) {
        console.log(`\ndeclaration: "${text}"`);
        // Find the init value
        for (let i = 0; i < d.childCount; i++) {
          const ch = d.child(i);
          if (ch?.type === 'init_declarator') {
            console.log(`  init_declarator: "${ch.text}"`);
            const val = ch.childForFieldName('value');
            console.log(`  value: type=${val?.type} text="${val?.text}"`);
            if (val?.type === 'binary_expression') {
              showNode('  value', val, 2);
            }
          }
        }
      }
    }

    // Show all self-recursive call_expressions
    const fnNodes = tree.rootNode.descendantsOfType('function_definition');
    for (const fn of fnNodes) {
      const fnNameNode = fn.childForFieldName('declarator');
      // get function name
      let fnName = '';
      const funcDeclarators = fn.descendantsOfType('function_declarator');
      if (funcDeclarators.length > 0) {
        const nameNode = funcDeclarators[0].childForFieldName('declarator');
        fnName = nameNode?.text ?? '';
      }
      if (!fnName) continue;

      const calls = fn.descendantsOfType('call_expression');
      let selfCalls = 0;
      for (const call of calls) {
        const funcNode = call.childForFieldName('function');
        if (!funcNode) continue;
        if (funcNode.type === 'identifier' && funcNode.text === fnName) {
          selfCalls++;
          const args = call.childForFieldName('arguments');
          console.log(`\nself-call [${selfCalls}]: "${call.text.slice(0,60)}"`);
          if (args) {
            const argChildren: string[] = [];
            for (let i = 0; i < args.childCount; i++) {
              const ch = args.child(i);
              if (ch && ch.type !== '(' && ch.type !== ')' && ch.type !== ',') {
                argChildren.push(`"${ch.text}"(${ch.type})`);
              }
            }
            console.log(`  args: [${argChildren.join(', ')}]`);
          }
        }
      }
      console.log(`\nTotal self-calls in "${fnName}": ${selfCalls}`);
    }
  }
}
main().catch(console.error);
