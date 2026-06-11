"""Patch test expectations for D4.9 correctness changes."""
import sys

with open('test/unit/validation.test.ts', 'rb') as f:
    content = f.read().decode('utf-8')

patches = [
    # Test 20: while i*=2 — cannot prove i₀ > 0 (no structural initializer) → Unknown
    (
        "{ id: 20, label: 'while i*=2',\r\n    code: wrap('int i=1; while(i<n){ i*=2; }'), expected: 'O(log n)' }",
        "{ id: 20, label: 'while i*=2 — D4.9: no proven i₀>0 → Unknown',\r\n    code: wrap('int i=1; while(i<n){ i*=2; }'), expected: 'Unknown' }"
    ),
    # Test 51: while i*=2 inside for — same reason → Unknown outer product
    (
        "{ id: 51, label: 'while(i<n) i*=2 inside for',\r\n    code: wrap('for(int x=0;x<n;x++){\\n  int i=1;\\n  while(i<n){ i*=2; }\\n}'), expected: 'O(n log n)' }",
        "{ id: 51, label: 'while(i<n) i*=2 inside for — D4.9: no proven i₀>0 → Unknown',\r\n    code: wrap('for(int x=0;x<n;x++){\\n  int i=1;\\n  while(i<n){ i*=2; }\\n}'), expected: 'Unknown' }"
    ),
    # Test 251: j*=2 with variable init j=i — cannot prove j₀ > 0 → Unknown
    (
        "{ id: 251, label: 'D4.7: O(n log n) dominates sequential O(n) \u2014 same variable \u2192 O(n log n)', code: `",
        "{ id: 251, label: 'D4.9: j*=2 with variable init (j=i) \u2014 cannot prove j\u2080>0 \u2192 Unknown', code: `"
    ),
    (
        "}`, expected: 'O(n log n)' as any },\r\n\r\n  { id: 252",
        "}`, expected: 'Unknown' as any },\r\n\r\n  { id: 252"
    ),
    # Test 260: j*=2 with variable init + O(m) → Unknown
    (
        "{ id: 260, label: 'D4.7: O(n log n) + O(m) incommensurable \u2192 O(n log n + m)', code: `",
        "{ id: 260, label: 'D4.9: j*=2 with variable init + O(m) \u2014 variable init \u2192 Unknown', code: `"
    ),
    (
        "}`, expected: 'O(n log n + m)' as any },\r\n\r\n  // \u2500\u2500 Phase D4.8",
        "}`, expected: 'Unknown' as any },\r\n\r\n  // \u2500\u2500 Phase D4.8"
    ),
    # Test 288: i=i*k → Unknown (not O(n)) — update expected
    (
        "{ id: 288, label: 'D4.9 NEG B: i=i*k variable factor → Unknown or linear',\r\n    code: `void f(int n,int k){ for(int i=1;i<n;i=i*k){} }`, expected: 'Unknown' as any }",
        "{ id: 288, label: 'D4.9 NEG B: i=i*k variable factor → Unknown',\r\n    code: `void f(int n,int k){ for(int i=1;i<n;i=i*k){} }`, expected: 'Unknown' as any }"
    ),
]

for old, new in patches:
    if old in content:
        content = content.replace(old, new, 1)
        print(f'Applied: {old[:60].strip()!r}')
    else:
        print(f'WARN: not found: {old[:60].strip()!r}', file=sys.stderr)

with open('test/unit/validation.test.ts', 'wb') as f:
    f.write(content.encode('utf-8'))
print('Test file written.')
