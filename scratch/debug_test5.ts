
import { analyze } from '../src/engine/complexityAnalyzer';
const result = analyze(\
void foo(vector<int>& v) {
  int sz = v.size();
  int m = sz;
  for(int i = 0; i < m; i++) {}
}
\);
console.log(JSON.stringify(result.functions[0], null, 2));

