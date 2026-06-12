import { initParser, parseOneOff } from '../src/parser/treeSitter';
import { extractCompoundBound } from '../src/parser/loopClassifier';

async function main() {
  await initParser('./dist');
  const tree = parseOneOff('int total = a + b + c + d;');
  const initDecl = tree.rootNode.descendantsOfType('init_declarator')[0];
  const val = initDecl.childForFieldName('value');
  console.log(extractCompoundBound(val));
}
main().catch(console.error);
