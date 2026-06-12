import { parseOneOff } from '../src/parser/treeSitter';
import { analyzeFunctions } from '../src/engine/inference';
import * as path from 'path';
import { initParser } from '../src/parser/treeSitter';

async function main() {
  await initParser(path.resolve(__dirname, '../node_modules/tree-sitter-wasms/out'));
  const code = \`
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
    Engine eng(raw);
    int result = 0;
    int guard = 0;
    for (;;) {
        if (guard >= 1) break;
        switch (mode) {
            default:
                result = eng.run();
        }
        guard++;
    }
    return result;
    // raw == v.size() == n  =>  O(n^2)
}
  \`;
  const tree = parseOneOff(code);
  const result = analyzeFunctions(tree);
  console.log(result.functions[0].complexity);
}
main().catch(console.error);
