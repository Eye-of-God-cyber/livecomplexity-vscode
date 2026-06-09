import { initParser, parseOneOff } from '../src/parser/treeSitter';
import { analyzeFunctions } from '../src/engine/inference';
import * as path from 'path';

const distDir = path.join(__dirname, '../dist');

async function debugx() {
  await initParser(distDir);

  const code1 = `void f(int x){ while(x = x / 2){ } }`;
  const tree1 = parseOneOff(code1)!;
  const while1 = tree1.rootNode.descendantsOfType('while_statement')[0];
  const cond1 = while1.childForFieldName('condition');
  
  if (cond1 && cond1.type === 'condition_clause') {
    const expr = cond1.children.find(c => c.type !== '(' && c.type !== ')');
    console.log('expr type inside while cond:', expr?.type);
  }

  const code2 = `void f(){ queue<int> q; q.push(1); while(!q.empty()){ q.pop(); } }`;
  const tree2 = parseOneOff(code2)!;
  const fn2 = analyzeFunctions(tree2);
  console.log('bfs while type:', fn2.functions[0].complexity);
}

debugx().catch(console.error);
