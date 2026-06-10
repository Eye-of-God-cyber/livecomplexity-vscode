import { initParser, parseOneOff } from './src/parser/treeSitter';
import { resolve } from 'path';

async function main() {
  await initParser(resolve('./dist'));
  const code = `
void solve() {
    while(parent[x] != x) {
        parent[x] = parent[parent[x]];
        x = parent[x];
    }
}`;
  const tree = parseOneOff(code);
  const root = tree!.rootNode;
  
  const assignments = root.descendantsOfType('assignment_expression');
  for (const a of assignments) {
      if (a.text === 'parent[x] = parent[parent[x]]') {
          const right = a.childForFieldName('right');
          const subArgs = right.child(1);
          console.log("Children of subscript_argument_list:");
          for(let i=0; i<subArgs.childCount; i++) {
              console.log(i, subArgs.child(i).type, subArgs.child(i).text);
          }
      }
  }
}
main().catch(console.error);
