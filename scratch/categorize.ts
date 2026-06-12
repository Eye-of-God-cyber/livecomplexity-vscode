import fs from 'fs';

const lines = fs.readFileSync('validation_results_batch4.txt', 'utf8').split('\n');

const failures: any[] = [];
let current: any = null;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('## ')) {
        if (current) failures.push(current);
        current = { test: line.substring(3), expected: '', actual: '' };
    } else if (line.startsWith('Expected:')) {
        current.expected = lines[++i].trim();
    } else if (line.startsWith('Produced:')) {
        current.actual = lines[++i].trim();
    }
}
if (current) failures.push(current);

const catA = [];
const catB = [];
const catC = [];
const crash = [];

function isCatA(exp: string, act: string) {
    let e = exp.replace(/\s+/g, '').replace(/\*/g, '').replace(/\^2/g, '²').replace(/\^3/g, '³');
    let a = act.replace(/Overalltimecomplexityoffunction.*isO\(/, '').replace(/\)\.$/, '').replace(/\s+/g, '').replace(/\*/g, '');
    
    // Sort additive terms
    e = e.split('+').sort().join('+');
    a = a.split('+').sort().join('+');
    // Sort multiplicative terms
    e = e.split('').sort().join('');
    a = a.split('').sort().join('');
    
    return e === a;
}

function isCatB(exp: string, act: string) {
    if (act.includes('size()') || act.includes('length()') || act.includes('capacity()') || act.includes('sizeof')) return true;
    
    // Check if it's just different variable letters (e.g., ef vs nm)
    let e = exp.replace(/\s+/g, '').replace(/\*/g, '').replace(/\^2/g, '²').replace(/\^3/g, '³').replace(/O\(/, '').replace(/\)/, '');
    let a = act.replace(/Overalltimecomplexityoffunction.*isO\(/, '').replace(/\)\.$/, '').replace(/\s+/g, '').replace(/\*/g, '');
    
    // if same shape but different letters
    if (e.length === a.length && /^[a-z]+$/.test(e) && /^[a-z]+$/.test(a)) return true;
    
    return false;
}

for (const f of failures) {
    if (f.actual === 'CRASH') {
        crash.push(f);
        continue;
    }
    const actMatch = f.actual.match(/is (.*)\./);
    const actVal = actMatch ? actMatch[1] : f.actual;

    if (isCatA(f.expected, f.actual)) {
        catA.push(f);
    } else if (isCatB(f.expected, f.actual)) {
        catB.push(f);
    } else {
        catC.push(f);
    }
}

console.log(`Category A (Formatting): ${catA.length}`);
console.log(`Category B (Precise): ${catB.length}`);
console.log(`Category C (Mismatch): ${catC.length}`);
console.log(`CRASH: ${crash.length}`);

console.log("\nCategory C mismatches:");
catC.forEach(c => console.log(`${c.test} | Exp: ${c.expected} | Act: ${c.actual}`));

console.log("\nCrashes:");
crash.forEach(c => console.log(`${c.test}`));
