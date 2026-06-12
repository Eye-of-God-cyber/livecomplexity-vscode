const fs = require('fs');
const path = require('path');
let code = fs.readFileSync('scratch/run_validation_batch4.ts', 'utf8');
code = code.replace(/__dirname \+ "\/validation_corpus_batch4\.cpp"/, 'path.join(__dirname, "..", "validation_corpus_batch4.cpp")');
code = code.replace(/__dirname \+ "\/validation_answers_batch4\.txt"/, 'path.join(__dirname, "..", "validation_answers_batch4.txt")');
code = code.replace(/__dirname \+ "\/validation_results_batch4\.txt"/, 'path.join(__dirname, "..", "validation_results_batch4.txt")');
fs.writeFileSync('scratch/run_validation_batch4.ts', code);
console.log('Fixed paths.');
