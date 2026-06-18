## [0.1.2]

### Fixed
Added support for constant-offset loop bounds such as:
- `n - 1`
- `n - 2`
- `n - 100`
- `v.size() - 1`

Loops using bounds of the form `identifier - constant` are now analyzed correctly instead of being reported as `Unknown`.

Examples:

```cpp
for (int i = 0; i < n - 1; i++) {}
for (int i = 0; i < v.size() - 1; i++) {}
```

These now correctly resolve to their asymptotic complexity.

### Validation
- 444/444 unit tests passing.
- Validation baseline unchanged.
- No regressions introduced.

### Unchanged
The following intentionally remain `Unknown`:

```cpp
for (int i = 0; i < n - m; i++) {}
for (int i = 0; i < n - getLimit(); i++) {}
for (int i = 0; i < n - (a + b); i++) {}
```

LiveComplexity continues to prioritize deterministic structural analysis and correctness-first complexity inference.

**Proven, Not Guessed.**

## [0.1.1]

- Improve README
- Add Quick Links section
- Add VS Code CLI installation command
- Documentation refinements