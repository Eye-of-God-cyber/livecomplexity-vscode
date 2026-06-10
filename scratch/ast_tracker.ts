import { initParser } from '../src/parser/treeSitter';
import { resolve } from 'path';

const distDir = resolve(__dirname, '../dist');

async function main() {
  const treeSitter = await initParser(distDir);
  const code = `
void test() {
    set<int> s;
    priority_queue<int> pq;
    map<int,int> mp;
    using pii = pair<int,int>;
    typedef priority_queue<int> PQ;
    PQ pq_alias;
}
`;
  const tree = treeSitter.parse(code);
  console.log(tree.rootNode.toString());
}

main().catch(console.error);
