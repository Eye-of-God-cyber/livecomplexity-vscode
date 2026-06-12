import fs from 'fs';

function main() {
    let data = fs.readFileSync('scratch/batch5_results.json', 'utf16le');
    if (data.charCodeAt(0) === 0xFEFF) {
        data = data.slice(1);
    }
    const obj = JSON.parse(data);
    console.log("Passed:", obj.passed);
    console.log("Failed:", obj.failed);
    
    // Group mismatches by expected vs actual
    for (const m of obj.mismatches) {
        console.log(m.funcName + " | Exp: " + m.expected + " | Act: " + m.actual);
    }
}
main();
