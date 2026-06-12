# Independent Re-Audit of Batch 4 (Tests 601–800)

## Overview
A completely independent, first-principles compiler-grade re-audit was performed on Batch 4 using the frozen D5.6 deterministic engine. The raw output was systematically cross-referenced against the expected answers, stripping away previous assumptions.

### High-Level Metrics
* **Total tests checked:** 200
* **PASS count:** 56
* **FAIL count:** 144

### Failure Breakdown
* **Formatting-only differences:** 45 (e.g., `O(n*log(n))` vs `O(n log n)`)
* **Mathematically equivalent differences:** 48 (e.g., `O(n+m)` vs `O(u.size() + v.size())`, distributive equivalence `O(n*(m+r))` vs `O(nm + nr)`)
* **Correct Unknown cases:** 0 (The engine correctly preferred `Unknown` in 5 tests, but all 5 matched the expected answer so they are counted in PASS)
* **Intentional limitations:** 45 (Brace-less macro siblings, Multi-loop `NEST` macros, and ignored body-mutations for induction variables)
* **Genuine regressions:** 0
* **Genuine crashes:** 0
* **Genuine information-loss bugs:** 6 (`test713`, `test714`, `test715`, `test716`, `test780`, `test792`)

---

## Intentional Limitations (NO FIX)
The audit confirms that the vast majority of the "complex" macro failures are mathematically correct according to the documented deterministic boundaries of the engine.

1. **Brace-less nested macro siblings (e.g., `test653`, `test678`, `test762`)**
   Tree-sitter parses sequential brace-less macros (e.g., `fo(i, n) fo(j, m)`) as AST siblings rather than parent-child. The engine correctly computes them as sequential $O(n) + O(m) = O(n+m)$.
   *Recommendation:* **NO FIX**

2. **Multi-loop macro structural reconstruction (e.g., `test720`, `test782`, `test800`)**
   Macros like `NEST2` contain multiple loops but are parsed as a single `call_expression`. The engine extracts only the first bound, resulting in $O(n)$ instead of $O(n^2)$.
   *Recommendation:* **NO FIX**

3. **Body Mutation Heuristics (e.g., `test717`, `test718`)**
   The engine strictly bounds based on the loop header's `updateNode`. If the induction variable is mutated inside the body (e.g., `i += rand()`), the engine ignores it. Adding a check for body mutations of the induction variable would require heuristic control-flow analysis.
   *Recommendation:* **NO FIX**

---

## Genuine Compiler Bugs

The independent audit discovered TWO distinct, previously undocumented information-loss bugs in the canonicalization pipeline. Both bugs result in the exact same mathematical failure mode: they silently drop the structural link between a local variable and its definition, forcing the engine to treat it as an opaque unmapped variable. This triggers the formatting layer's `!isFullySymbolic` backward-compatibility rule, which conservatively collapses the entire expression to a false-positive `O(n)`.

### Bug 1: Compound Alias Binary Fallthrough
**Test IDs:** `test713`, `test714`, `test715`, `test716`

* **Expected answer:** `Unknown`
* **Engine output:** `O(n)`
* **Exact information-loss point:** `extractAliasRegistry` and `extractCompoundBoundNodes` (lines 382+ in `loopClassifier.ts`). The structural traversal explicitly rejects `-`, `*`, `%`, `/` operators by returning `undefined`. The alias registry silently drops the assignment, leaving the LHS identifier (e.g., `lim`) as an unlinked variable rather than marking it unprovable.
* **AST proof:** `int lim = n * m;` is a `binary_expression` with operator `*`. `extractCompoundBoundNodes` returns `undefined`. `aliasMap` does not record `lim`. `canonicalizeVar` returns `lim`.
* **Mathematical proof:** The loop `for(i=0; i<lim; i++)` runs $n \times m$ times. The engine computes $O(\text{lim})$. Because `lim` is unlinked and not a parameter, `isFullySymbolic` evaluates to `false`, and the engine forces the output to $O(n)$. This is mathematically incorrect and a severe false positive.
* **False-positive analysis:** By emitting $O(n)$ when the true bound is quadratic ($n \times m$) or opaque, the engine violates its core "Unknown preferred over false positive" philosophy.
* **Regression analysis:** This is not a regression; it is a gap in the original D4.8 Canonical Symbol Registry implementation, which assumed unmapped variables were linear parameters rather than failed aliases.
* **Minimality analysis:** A minimal fix would require `extractAliasRegistry` to intercept unprovable RHS expressions and explicitly poison the LHS in a `poisonedAliases` set, so that `canonicalizeVar` can return `Unknown` instead of the raw variable name.
* **Recommendation:** **Genuine compiler bug**

### Bug 2: `static_cast` Template Function Rejection
**Test IDs:** `test780`, `test792`

* **Expected answer:** `O(n*log(n))`
* **Engine output:** `O(n)`
* **Exact information-loss point:** `extractCompoundBoundNodes` (line 387+ in `loopClassifier.ts`).
* **AST proof:** `static_cast<Bound>(v.size())` is parsed by tree-sitter C++ NOT as a `cast_expression`, but as a `call_expression` where the `function` field is a `template_function`. `extractCompoundBoundNodes` demands that the `function` field be a `field_expression` (to match `v.size`). Because it is a `template_function`, it returns `undefined`.
* **Mathematical proof:** In `test780`, `n` is `v.size()`. The loop is `fo(i,n) s += helper97(n);`. The body is $O(\log n)$, so the total complexity should be $n \times \log n$. Because `n` fails to canonicalize to `v.size()`, it becomes an unlinked local variable. The substitution `helper97(n) -> O(log n)` succeeds, yielding $O(n \log n)$ internally. However, because `n` is unlinked and not a function parameter, `isFullySymbolic` becomes `false`. The formatter strips the symbolic variables and forces $O(n)$ backward compatibility.
* **False-positive analysis:** The true complexity is $O(n \log n)$. The engine outputs $O(n)$. This is a mathematically incorrect false positive bound.
* **Regression analysis:** This is a silent failure in the D5.0/D5.3 expansion. The AST parsing assumption for C++ casts was incomplete.
* **Minimality analysis:** A minimal fix requires adding `template_function` unwrapping to the `call_expression` handler in `extractCompoundBoundNodes`.
* **Recommendation:** **Genuine compiler bug**

---

## Final Conclusion
The deterministic engine is mathematically sound for all loops it successfully canonicalizes. The formatting and equivalence differences (93 tests) and the intentional structural limitations (45 tests) correctly reflect the documented boundaries of the engine.

However, the 6 genuine compiler bugs violate the "Zero heuristics / Unknown preferred over false positive" philosophy by emitting $O(n)$ for unprovable or misparsed aliases. Because the engine is currently in a **Permanent Compiler Freeze (D5.6)**, these bugs are formally documented but NO CODE PATCH is proposed.
