import { parseOneOff } from '../src/parser/treeSitter';
import { analyzeFunctions } from '../src/engine/inference';
import * as path from 'path';
import { initParser } from '../src/parser/treeSitter';

async function main() {
  await initParser(path.resolve(__dirname, '../node_modules/tree-sitter-wasms/out'));
  const code = `
#include <vector>
using namespace std;
int test1200(vector<int>& v, int mode) {
    typedef int Sz;
    Sz raw = (Sz)((((int)v.size())));   // deeply-parenthesized cast
    struct Engine {
        int& bound;                      // reference member
        Engine(int& b) : bound(b) {}
        int run() {
            int a1 = bound;
            int a2 = a1;
            int a3 = a2;                 // 3-hop alias chain
            int s = 0;
            for (int i = 0; i < a3; i++)
                for (int j = 0; j < a3; j++) s++;
            return s;
        }
    };
    Engine e(raw);
    for (int k = 0; k < mode; k++) { e.run(); }
    return 0;
}
  `;
  const tree = parseOneOff(code);
  const result = analyzeFunctions(tree);
  console.log(result.functions[0].complexity);
}
main().catch(console.error);
