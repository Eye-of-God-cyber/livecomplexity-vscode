import { initParser, parseOneOff } from './src/parser/treeSitter';
import { resolve } from 'path';

async function main() {
  await initParser(resolve('./dist'));
  const code = `
typedef map<int,int> MAP;
using UMAP = unordered_map<int,int>;

void solve1(std::map<int,int>& mp) {}
void solve2(const priority_queue<int>& pq) {}
void solve3(set<int>& s) {}
void solve4(MAP& m1, const UMAP& m2) {}
`;
  const tree = parseOneOff(code);
  const root = tree!.rootNode;
  
  const params = root.descendantsOfType('parameter_declaration');
  for (const p of params) {
      console.log("Parameter:", p.text);
      console.log("  Children:");
      for(let i=0; i<p.childCount; i++) {
          console.log(`    [${i}] ${p.child(i).type} : ${p.child(i).text}`);
      }
      const typeNode = p.childForFieldName('type');
      console.log("  Type Node field:", typeNode?.type, typeNode?.text);
      const declNode = p.childForFieldName('declarator');
      console.log("  Declarator Node field:", declNode?.type, declNode?.text);
      if (declNode) {
          console.log("  Declarator children:");
          for(let i=0; i<declNode.childCount; i++) {
              console.log(`    [${i}] ${declNode.child(i).type} : ${declNode.child(i).text}`);
          }
      }
      console.log("----");
  }
}
main().catch(console.error);
