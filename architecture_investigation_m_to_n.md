# LiveComplexityIDE — Symbolic Variable Normalization Investigation

## 1. Intentional or Bug?
This behavior is **100% intentional**. It is a deliberate backward-compatibility constraint designed to pass older golden test cases.

## 2 & 3. Information Loss
The engine successfully extracts and mathematically preserves the symbolic variable `m`. The information is **not** lost in the pipeline; it survives all the way to the final string formatting stage, where it is intentionally discarded and forced to `n`.

## 4. Pipeline Trace for `for (int i = 0; i < m; i++)`
1. **AST Extraction**: The tree-sitter parser identifies the loop condition `i < m`.
2. **Declaration Resolution**: The engine resolves `m` as an external or parameter-derived bound.
3. **ComplexityNode Creation**: A Scalar Node is generated: `{ power: 1, logPower: 0, linearVars: ['m'] }`.
4. **mergeAndReduce**: The node is merged (or remains isolated if it's the only loop). `linearVars: ['m']` is preserved.
5. **Formatter (`formatComplexity`)**: The formatter evaluates the node. It detects that `linearVars.length === 1`.
6. **Information-Loss Point**: The formatter explicitly flags this as a `isSingleVariable` case and drops `linearVars`, routing it to the hardcoded `O(n)` string builder to satisfy legacy test expectations.

## 5. Exact File and Function
* **File**: `src/engine/inference.ts`
* **Function**: `formatComplexity`
* **Lines**: `552–566`
* **Mechanism**: 
  ```typescript
  // If the entire complexity is just a single linear factor, force fallback to 'O(n)'
  // to perfectly preserve single-loop test expectations like test 16: for(i<m) -> O(n).
  const isSingleVariable = !preserveVars && !node.isSubstituted && explicitVars.length === 1 && node.power === 1 && node.logPower === 0 && node.loglogPower === 0 && !explicitVars[0].includes('.');
  
  if (!isFullySymbolic || explicitVars.length === 0 || explicitVars.every(v => v === 'n') || isSingleVariable) {
      if (node.power === 1 && node.logPower === 0) return 'O(n)'; // Drops 'm' entirely
  ```

## 6. Backward Compatibility Analysis
* **Why it exists**: Earlier versions of the deterministic engine (pre-D3/D4) were rigorously validated against hundreds of hardcoded `// expected: O(n)` comments in the test suite. If a loop used `k` or `m`, the tests still blindly expected `O(n)`. When symbolic tracking (`linearVars`) was introduced to correctly resolve things like `O(n * m)` vs `O(n^2)`, this `isSingleVariable` fast-path was added specifically to prevent breaking those older tests.
* **Is it architecturally justified?**: **No.** The engine is now highly advanced (D5.6). It safely formats multi-variable sums `O(n + m)` and products `O(n * m)`. Normalizing a standalone `O(m)` back to `O(n)` is an obsolete test-harness hack, not an architectural necessity.

## 7. Impact of Displaying Raw Variables
If the extension displayed `O(m)`, `O(limit)`, `O(sz)`, or `O(v.size())` instead of normalizing to `O(n)`:
* **Trust Factor**: It would massively increase user trust. Seeing their exact variable name in the Big-O notation is the ultimate proof that the extension is performing deterministic AST analysis and not just blindly regexing `for` loops. It proves the "Zero Heuristics" claim visually.
* **Regression Risk**: Removing this constraint carries **zero runtime regression risk** for the end user. However, it will cause massive validation failures in the `validation_corpus` test suites because hundreds of tests expecting `O(n)` will suddenly output `O(m)`, `O(N)`, `O(k)`, etc.

## 8. Recommendation
**Remove the `isSingleVariable` normalization.**

In a product whose entire brand identity relies on "Correctness Before Guessing" and "Pure AST", hiding the engine's symbolic tracking capability is actively harming the product's perceived value. Revealing the real variable names bridges the gap between what the engine *knows* and what the UI *shows*. 

If you decide to proceed, the implementation plan is trivial (remove `isSingleVariable` from the formatter condition), followed by a massive but mechanical update to the golden validation test expectations.
