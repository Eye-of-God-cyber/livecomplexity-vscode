import fs from 'fs';

function main() {
    let data = fs.readFileSync('scratch/batch5_results.json', 'utf16le');
    if (data.charCodeAt(0) === 0xFEFF) {
        data = data.slice(1);
    }
    const obj = JSON.parse(data);
    
    let passed = 0;
    let failed = 0;
    
    const mismatches = [];
    
    for (const m of obj.mismatches) {
        // Strip O()
        let exp = m.expected.replace(/^O\(/, '').replace(/\)$/, '').trim();
        let act = m.actual.replace(/^O\(/, '').replace(/\)$/, '').trim();
        
        // Handle weird superscripts from powershell output or raw json
        // Actually, in TS string, they are real chars.
        act = act.replace(/²/g, '^2').replace(/³/g, '^3');
        exp = exp.replace(/²/g, '^2').replace(/³/g, '^3');
        
        // Remove spaces
        exp = exp.replace(/\s+/g, '');
        act = act.replace(/\s+/g, '');
        
        // Replace implicit multiplication
        exp = exp.replace(/([a-zA-Z])([a-zA-Z])/g, '$1*$2');
        act = act.replace(/([a-zA-Z])([a-zA-Z])/g, '$1*$2');
        
        if (exp === act) {
            passed++;
        } else {
            failed++;
            mismatches.push({
                funcName: m.funcName,
                expOrig: m.expected,
                actOrig: m.actual,
                expNorm: exp,
                actNorm: act
            });
        }
    }
    
    console.log("Total tests:", 200);
    console.log("Passed:", obj.passed + passed);
    console.log("Mismatches:", obj.failed - passed);
    console.log("-------------------");
    
    for (const m of mismatches) {
        let category = "Unknown";
        const e = m.expNorm;
        const a = m.actNorm;
        
        // Check equivalence
        const partsE = e.split('+').sort().join('+');
        const partsA = a.split('+').sort().join('+');
        if (partsE === partsA) {
            category = "Mathematically equivalent";
        } else if (m.actOrig === 'Unknown') {
            category = "Correct Unknown";
        } else if (a.includes('size()')) {
            category = "More Precise (container.size)";
        } else if (a === 'n' || a === 'm' || a === 'm+n' || a === 'n^2' || a === 'Unknown') {
            // Check if it's brace-less siblings
            // This needs manual inspection, but we can guess
            category = "Needs manual check";
        }
        
        console.log(m.funcName + " | Exp: " + m.expOrig + " | Act: " + m.actOrig + " | Category: " + category);
    }
}
main();
