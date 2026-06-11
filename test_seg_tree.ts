import { initParser, parseOneOff } from './src/parser/treeSitter';
import { analyzeFunctions } from './src/engine/inference';
import { resolve } from 'path';

const segTreeQueryCode = `
int query(int v, int tl, int tr, int l, int r) {
    if (l > r) 
        return 0;
    if (l == tl && r == tr) {
        return t[v];
    }
    int tm = (tl + tr) / 2;
    return query(v*2, tl, tm, l, min(r, tm))
         + query(v*2+1, tm+1, tr, max(l, tm+1), r);
}
`;

const segTreeQueryCode2 = `
int query(int node, int start, int end, int l, int r) {
    if (r < start || end < l) {
        return 0;
    }
    if (l <= start && end <= r) {
        return tree[node];
    }
    int mid = (start + end) / 2;
    int p1 = query(2 * node, start, mid, l, r);
    int p2 = query(2 * node + 1, mid + 1, end, l, r);
    return p1 + p2;
}
`;

async function main() {
  await initParser(resolve('./dist'));

  const codes = [segTreeQueryCode, segTreeQueryCode2];
  for (let idx = 0; idx < codes.length; idx++) {
      const tree = parseOneOff(codes[idx])!;
      const result = analyzeFunctions(tree);
      console.log('=== Test ' + (idx + 1) + ' ===');
      console.log('Complexity:', result.functions[0]?.complexity);
  }
}
main().catch(console.error);
