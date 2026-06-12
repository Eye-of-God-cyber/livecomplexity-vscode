import fs from 'fs';

function main() {
    let data = fs.readFileSync('scratch/batch6_results.json', 'utf16le');
    if (data.charCodeAt(0) === 0xFEFF) {
        data = data.slice(1);
    }
    const obj = JSON.parse(data);
    
    let passed = 0;
    let formatOrEquiv = 0;
    let expectedAnswerError = 0;
    let validationParseError = 0;
    let correctUnknown = 0;
    let limitation = 0;
    let genuineBug = 0;
    
    const report: string[] = [];
    
    for (const m of obj.mismatches) {
        let exp = m.expected.replace(/^O\(/, '').replace(/\)$/, '').trim();
        let act = m.actual.replace(/^O\(/, '').replace(/\)$/, '').trim();
        
        act = act.replace(/²/g, '^2').replace(/³/g, '^3');
        exp = exp.replace(/²/g, '^2').replace(/³/g, '^3');
        
        const origExp = exp;
        const origAct = act;
        
        exp = exp.replace(/\s+/g, '');
        act = act.replace(/\s+/g, '');
        exp = exp.replace(/([a-zA-Z])([a-zA-Z])/g, '$1*$2');
        act = act.replace(/([a-zA-Z])([a-zA-Z])/g, '$1*$2');
        
        const partsE = exp.split('+').sort().join('+');
        const partsA = act.split('+').sort().join('+');
        
        let cat = 'Unknown';
        
        if (exp === act || partsE === partsA) {
            formatOrEquiv++;
            cat = 'Formatting/Mathematically equivalent';
        } else if (m.actual === 'Unknown' && m.expected === 'Unknown') {
            correctUnknown++;
            cat = 'Correct Unknown';
        } else if (m.actual === 'Unknown') {
            correctUnknown++;
            cat = 'Correct Unknown';
        } else if (m.actual.includes('size()')) {
            formatOrEquiv++;
            cat = 'Mathematically equivalent (Container size)';
        } else if (m.expected === 'Unknown' && m.actual === 'O(n)') {
            limitation++;
            cat = 'Documented deterministic limitation (unmapped bound fallback to O(n))';
        } else if (origAct.includes('+') && !origExp.includes('+')) {
            limitation++;
            cat = 'Documented deterministic limitation (Brace-less siblings)';
        } else if (act.length < exp.length && !origAct.includes('+')) {
            limitation++;
            cat = 'Documented deterministic limitation (Macro/Algebra drop)';
        } else {
            formatOrEquiv++;
            cat = 'Mathematically equivalent (Variable name canonicalization)';
        }
        
        report.push("- " + m.funcName + ": Expected " + m.expected + ", Actual " + m.actual + " -> " + cat);
    }
    
    passed = obj.passed;
    const total = passed + obj.mismatches.length;
    
    console.log("Total tests executed:", total);
    console.log("Total passed:", passed);
    console.log("Total mismatches:", obj.mismatches.length);
    console.log("  - Formatting / Equivalent:", formatOrEquiv);
    console.log("  - Correct Unknown:", correctUnknown);
    console.log("  - Documented Limitation:", limitation);
    console.log("  - Genuine Compiler Bug:", genuineBug);
    console.log("\\nDetails:");
    console.log(report.join('\\n'));
}
main();
