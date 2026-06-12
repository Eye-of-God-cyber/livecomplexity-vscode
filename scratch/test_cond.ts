import { initParser, parseOneOff } from '../src/parser/treeSitter';

async function main() {
  await initParser('./dist');
  const tree = parseOneOff('for (int i = 0; i < total; i++) {}');
  const cond = tree.rootNode.descendantsOfType('binary_expression')[0];
  const right = cond.childForFieldName('right');
  console.log(right?.text);
  console.log(right?.type);
}
main().catch(console.error);
