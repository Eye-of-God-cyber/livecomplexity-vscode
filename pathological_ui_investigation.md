# Pathological UI Investigation: Symbolic Formatting

## Overview
I traced the behavior of the AST bound extraction pipeline (`extractCompoundBoundNodes` in `src/parser/loopClassifier.ts`) to determine what happens if we remove the legacy `O(n)` string normalizer.

**Crucial Finding**: The AST extraction is intentionally and aggressively strict. It completely shields the UI from pathological expressions by refusing to extract them.

## Case-by-Case Analysis

### 1. `i < veryLongAndUnreadableVariableName`
1. **Preserved**: `veryLongAndUnreadableVariableName`
2. **Displayed**: `O(veryLongAndUnreadableVariableName)`
3. **Readable**: Yes. While long, it is mathematically correct and exactly matches the user's source code. 

### 2. `i < this->member.subobject.counter`
1. **Preserved**: `undefined`
2. **Displayed**: `O(n)`
3. **Why**: The AST explicitly rejects `field_expression` chains as unverifiable bounds. It returns `undefined`, which defaults to the generic `O(n)`.

### 3. `i < obj.deep.field.length`
1. **Preserved**: `undefined`
2. **Displayed**: `O(n)`
3. **Why**: Rejected for the same reason. Nested member expressions are structurally dropped.

### 4. `i < someFunction().size()`
1. **Preserved**: `undefined`
2. **Displayed**: `O(n)`
3. **Why**: The parser strictly enforces that `.size()` can only be called on a base `identifier`. `call_expression` bases are rejected.

### 5. `i < vec.size()`
1. **Preserved**: `vec.size()`
2. **Displayed**: `O(vec.size())`
3. **Readable**: Yes. Highly trustworthy and exactly what a C++ developer expects to see.

### 6. `i < matrix[row].size()`
1. **Preserved**: `undefined`
2. **Displayed**: `O(n)`
3. **Why**: `matrix[row]` is a `subscript_expression`, not an `identifier`. Rejected by the `.size()` parser constraint.

### 7. `i < getLimit()`
1. **Preserved**: `undefined`
2. **Displayed**: `O(n)`
3. **Why**: Function calls are rejected as bounds.

## Shortening Rules
**No shortening rule should be added.**
The pipeline is already perfectly constrained:
1. `extractCompoundBoundNodes` acts as an absolute gatekeeper. It only permits pure identifiers (`limit`, `m`), `+` or `/` combinations, and exact `<identifier>.size()` calls.
2. Because complex expressions are already rejected and fall back to `O(n)`, there is literally no risk of generating pathological strings like `O(this->member.subobject.counter)`.
3. If a user intentionally names a pure identifier `veryLongAndUnreadableVariableName`, truncating it to `veryLong...` introduces a heuristic string transformation that undermines the "Correctness Before Guessing" philosophy. The exact text is the most trustworthy output.

## Conclusion & Recommendation
Removing the `O(n)` formatter constraint is **100% safe**. 

The parser's existing strictness guarantees that the UI will only ever display clean, valid identifiers or `identifier.size()`. Displaying `O(v.size())` instead of `O(n)` will massively boost Marketplace screenshots and user trust because it visually proves the extension operates via deep AST inspection rather than generic regex matching.
