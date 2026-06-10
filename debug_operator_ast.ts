import { initParser, parseOneOff } from './src/parser/treeSitter';
import { resolve } from 'path';

async function main() {
  await initParser(resolve('./dist'));
  const code = `
void solve() {
    mp[x]++;
    ++mp[x];
    mp[x] += val;
    mp[x] = value;
    auto t = mp[x];
    int y = mp[x];
    arr[x]++;
    vector[i]++;
}
`;
  const tree = parseOneOff(code);
  const root = tree!.rootNode;
  
  const subscripts = root.descendantsOfType('subscript_expression');
  for (const s of subscripts) {
      console.log("Subscript:", s.text);
      console.log("  Parent type:", s.parent?.type);
      console.log("  Parent text:", s.parent?.text);
      console.log("  Argument text:", s.childForFieldName('argument')?.text);
      console.log("----");
  }
}
main().catch(console.error);
