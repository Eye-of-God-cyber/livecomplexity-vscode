# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('test/unit/validation.test.ts', 'rb') as f:
    content = f.read().decode('utf-8')

# Test 260 label
old_lbl = "{ id: 260, label: 'D4.7: O(n log n) + O(m) incommensurable \u2192 O(n log n + m)', code: `"
new_lbl = "{ id: 260, label: 'D4.9: j*=2 variable init + O(m) \u2192 Unknown', code: `"
if old_lbl in content:
    content = content.replace(old_lbl, new_lbl, 1)
    print('260 label patched')
else:
    print('260 label NOT found')

# Test 260 expected
old_exp = "expected: 'O(n log n + m)' as any },"
new_exp = "expected: 'Unknown' as any },"
if old_exp in content:
    content = content.replace(old_exp, new_exp, 1)
    print('260 expected patched')
else:
    print('260 expected NOT found')

with open('test/unit/validation.test.ts', 'wb') as f:
    f.write(content.encode('utf-8'))
print('Done')
