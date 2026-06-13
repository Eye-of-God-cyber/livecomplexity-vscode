# Changelog

All notable changes to LiveComplexity are documented in this file.

## [0.1.0] - Initial Public Release

- Deterministic AST-based time complexity analysis for C and C++.
- Real-time inline `O(...)` annotations while typing.
- Hover explanations with structural complexity derivation.
- Symbolic bound preservation (`O(m)`, `O(rows)`, `O(cols)`, etc.).
- Correctness-first analysis with `Unknown` preferred over unsound inference.
- Web Tree-Sitter–based parsing for resilient structural analysis.
- Function-level scoping for accurate loop attribution.