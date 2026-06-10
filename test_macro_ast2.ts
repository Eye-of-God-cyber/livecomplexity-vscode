import { initParser, parseOneOff } from './src/parser/treeSitter';
import * as path from 'node:path';

async function main() {
  await initParser(path.resolve(__dirname, './dist'));

  const code = `
  void f(ll n,ll m,ll r)
  {
      fo(i,n)
      {
          fo(j,m)
          {
              fo(k,r)
              {
              }
          }
      }
  }
  `;
  
  const tree = parseOneOff(code);
  console.log(tree!.rootNode.toString());
}

main().catch(console.error);
