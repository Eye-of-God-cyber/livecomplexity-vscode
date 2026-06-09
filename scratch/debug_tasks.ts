import { initParser, parseOneOff } from '../src/parser/treeSitter';
import { isCallExpressionCondition } from '../src/parser/loopClassifier';
import * as path from 'path';

const distDir = path.join(__dirname, '../dist');

async function debugCallExpr() {
  await initParser(distDir);

  const code1 = `void f(){ while(!q.empty()){ q.pop(); } }`;
  const tree1 = parseOneOff(code1)!;
  const while1 = tree1.rootNode.descendantsOfType('while_statement')[0];
  const cond1 = while1.childForFieldName('condition');
  
  console.log('while(!q.empty()) ->');
  if (cond1) {
    console.log('cond type:', cond1.type);
    for (let i = 0; i < cond1.childCount; i++) {
      const ch = cond1.child(i);
      console.log(`  child[${i}]: type=${ch?.type}, text="${ch?.text}"`);
    }
  }

  const unwrapped1 = (cond1 && cond1.type === 'condition_clause') ? cond1.children.find(c => c.type !== '(' && c.type !== ')') : cond1;
  console.log('unwrapped type:', unwrapped1?.type);
  console.log('isCallExpressionCondition:', unwrapped1 ? isCallExpressionCondition(unwrapped1) : false);

  const code2 = `void f(int x){ while(x = x / 2){ } }`;
  const tree2 = parseOneOff(code2)!;
  const while2 = tree2.rootNode.descendantsOfType('while_statement')[0];
  const body2 = while2.childForFieldName('body');
  const assigns2 = body2?.descendantsOfType('assignment_expression') || [];
  console.log('\\nwhile(x = x / 2) ->');
  console.log('assigns length:', assigns2.length);

  const updates2 = body2?.descendantsOfType(['update_expression', 'assignment_expression', 'math_assignment_expression']) || [];
  console.log('updates length:', updates2.length);
}

debugCallExpr().catch(console.error);
