import fs from 'fs';

function normalizeString(s: string): string {
    return s.replace(/\s+/g, '').replace(/²/g, '^2').replace(/³/g, '^3').replace(/([a-zA-Z])([a-zA-Z])/g, '$1*$2');
}

function main() {
    let data = fs.readFileSync('scratch/batch5_results.json', 'utf16le');
    if (data.charCodeAt(0) === 0xFEFF) {
        data = data.slice(1);
    }
    const obj = JSON.parse(data);
    
    let passed = 0;
    let failed = 0;
    const newMismatches = [];
    
    // Group mismatches by expected vs actual after full normalization
    for (const m of obj.mismatches) {
        let exp = m.expected.replace(/²/g, '^2').replace(/³/g, '^3').replace(/\s+/g, '');
        let act = m.actual.replace(/²/g, '^2').replace(/³/g, '^3').replace(/\s+/g, '');
        
        // Handle common formatting equivalences (e.g., O(nm) vs O(n*m))
        exp = exp.replace(/([a-zA-Z])([a-zA-Z])/g, '$1*$2');
        act = act.replace(/([a-zA-Z])([a-zA-Z])/g, '$1*$2');
        
        // Strip O()
        exp = exp.replace(/^O\(/, '').replace(/\)$/, '');
        act = act.replace(/^O\(/, '').replace(/\)$/, '');
        
        if (exp === act) {
            passed++;
        } else {
            failed++;
            newMismatches.push({ funcName: m.funcName, expected: m.expected, actual: m.actual });
        }
    }
    
    console.log("Passed:", obj.passed + passed);
    console.log("Failed:", obj.failed - passed);
    
    for (const m of newMismatches) {
        console.log(m.funcName + " | Exp: " + m.expected + " | Act: " + m.actual);
    }
}
main();
