import * as path from 'path';
import Parser from 'web-tree-sitter';
import { analyzeFunctions } from '../src/engine/inference';
import { initParser } from '../src/parser/treeSitter';

async function main() {
    const wasmDir = path.resolve(__dirname, '../node_modules/tree-sitter-wasms/out');
    await Parser.init({ locateFile(scriptName: string) { return path.join(wasmDir, scriptName); } });
    await initParser(wasmDir);
    const parser = new Parser();
    const lang = await Parser.Language.load(path.join(wasmDir, 'tree-sitter-cpp.wasm'));
    parser.setLanguage(lang);

    const code = `
#include <vector>
using namespace std;
#define fo(i, n) for(int i=0; i<n; i++)
int helper34(int p)  { int c=0; for(int i=p;i>0;i>>=1) c++; return c; }
int test792(vector<int>& v, vector<int>& u) {
    int n = static_cast<int>(v.size());
    int m = static_cast<int>(u.size());
    int s = 0;
    fo(i, n) s += helper34(m);
    return s;
}
    `;
    const tree = parser.parse(code);
    const result = analyzeFunctions(tree);
    for (const r of result.functions) {
        if (r.name === 'test792') {
            console.log("Complexity:", r.complexity);
            console.log("Node:", JSON.stringify(r.node, null, 2));
        }
    }
}
main().catch(console.error);
