import { readFileSync } from 'fs';
import { resolve } from 'path';
import { getParser } from './src/parser/treeSitter';
import { analyzeDocument } from './src/engine/inference';

async function main() {
  const parser = await getParser(resolve('./dist'));
  const code = `
int find(int x) {
    if(parent[x] == x) return x;
    return parent[x] = find(parent[x]);
}
void unite(int a, int b) {
    a = find(a);
    b = find(b);
    if(a != b) parent[b] = a;
}
void solve() {
    for(int i=0; i<n; i++) {
        unite(u[i], v[i]);
    }
}
`;
  const tree = parser.parse(code);
  const result = analyzeDocument(tree, code, new Map());
  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
