import fs from 'fs';
import path from 'path';

function checkIntegrity() {
    const CPP_FILE = path.join(__dirname, '..', 'validation_corpus_batch7.cpp');
    const code = fs.readFileSync(CPP_FILE, 'utf-8');
    const lines = code.split('\n');

    const expectedTests = new Set();
    for (let i = 1201; i <= 1500; i++) expectedTests.add(i);

    let currentComment = '';
    const functionSet = new Set();
    const commentMap = new Map();
    const missingComments = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('// test')) {
            const match = line.match(/\/\/\s*(test(\d+)):/);
            if (match) {
                const testNum = parseInt(match[2], 10);
                commentMap.set(testNum, line);
            }
        }
        
        if (line.startsWith('int test') || line.startsWith('void test')) {
            const match = line.match(/(?:int|void)\s+test(\d+)\(/);
            if (match) {
                const testNum = parseInt(match[1], 10);
                if (functionSet.has(testNum)) {
                    console.log("Duplicate function definition:", testNum);
                } else {
                    functionSet.add(testNum);
                }
                
                if (!commentMap.has(testNum)) {
                    missingComments.push(testNum);
                }
            }
        }
    }

    const missing = [];
    const extra = [];

    for (let i = 1201; i <= 1500; i++) {
        if (!functionSet.has(i)) missing.push(i);
    }
    
    for (const test of functionSet) {
        if (test < 1201 || test > 1500) extra.push(test);
    }

    console.log("=== Integrity Report ===");
    console.log("Missing tests:", missing);
    console.log("Extra/Accidental tests:", extra);
    console.log("Tests missing expected comment:", missingComments);
    console.log("Total unique valid functions found:", functionSet.size - extra.length);
}

checkIntegrity();
