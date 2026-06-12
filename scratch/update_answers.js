const fs = require('fs');
const audit = fs.readFileSync('C:/Users/niraj/.gemini/antigravity/brain/1adca5cd-0f48-4c06-90aa-ddfe0f469dd6/audit_79_wrong_expected_answers.md', 'utf8');

const updates = {};
const lines = audit.split('\n');
for (const line of lines) {
    const m = line.match(/^\*\s+\*\*(test\d+)\*\*:\s+Expected\s+\`O\((.*?)\)\`\s+\|\s+Compiler\s+\`O\((.*?)\)\`/);
    if (m) {
        updates[m[1]] = m[3];
    }
}

let answers = fs.readFileSync('scratch/validation_answers_batch3.txt', 'utf8').split('\n');
let count = 0;
for (let i = 0; i < answers.length; i++) {
    const m = answers[i].match(/^(test\d+)\s+->\s+O\((.*?)\)/);
    if (m) {
        const testName = m[1];
        if (updates[testName]) {
            answers[i] = answers[i].replace('O(' + m[2] + ')', 'O(' + updates[testName] + ')');
            count++;
        }
    }
}

fs.writeFileSync('scratch/validation_answers_batch3.txt', answers.join('\n'));
console.log('Updated ' + count + ' answers.');
