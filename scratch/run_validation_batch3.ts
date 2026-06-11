import Parser from 'web-tree-sitter';
import fs from 'fs';
import path from 'path';
import { analyzeFunctions } from '../src/engine/inference';
import { initParser } from '../src/parser/treeSitter';

async function main() {
    const wasmDir = path.resolve(__dirname, '../node_modules/tree-sitter-wasms/out');
    await Parser.init({
      locateFile(scriptName: string) {
        return path.join(wasmDir, scriptName);
      }
    });
    await initParser(wasmDir);
    const parser = new Parser();
    const lang = await Parser.Language.load(path.join(wasmDir, 'tree-sitter-cpp.wasm'));
    parser.setLanguage(lang);

    const CPP_FILE = path.join(__dirname, 'validation_corpus_batch3.cpp');
    const ANSWERS_FILE = path.join(__dirname, 'validation_answers_batch3.txt');
    const RESULTS_FILE = path.join(__dirname, 'validation_results_batch3.txt');

    const code = fs.readFileSync(CPP_FILE, 'utf-8');
    const tree = parser.parse(code);

    const result = analyzeFunctions(tree);
    
    const expected = new Map<string, string>();
    const answersText = fs.readFileSync(ANSWERS_FILE, 'utf-8');
    for (const line of answersText.split('\n')) {
        const m = line.match(/^(\w+)\s*->\s*(O\(.*\)|Unknown)/);
        if (m) {
            expected.set(m[1], m[2]);
        }
    }

    const output = [];
    let passed = 0, failed = 0, total = 0;
    for (const func of result.functions) {
        if (!func.name.startsWith('test')) continue;
        const testId = parseInt(func.name.substring(4), 10);
        if (testId < 401 || testId > 600) continue;

        total++;
        const exp = expected.get(func.name) || 'NOT FOUND';
        const act = func.complexity;

        const expNorm = exp.replace(/\s+/g, '');
        const actNorm = act.replace(/\s+/g, '');

        if (expNorm === actNorm) {
            passed++;
        } else {
            failed++;
            output.push('## ' + func.name);
            output.push('');
            output.push('Expected:');
            output.push(exp);
            output.push('');
            output.push('Produced:');
            output.push(act);
            output.push('');
            output.push('Explanation:');
            output.push(func.explanation.join(' | '));
            output.push('');
            output.push('---');
        }
    }
    
    output.unshift('Total tests checked: ' + total);
    output.unshift('Passed: ' + passed);
    output.unshift('Failed: ' + failed);
    
    fs.writeFileSync(RESULTS_FILE, output.join('\n'));
    console.log(`Done. ${passed}/${total} passed.`);
}

main().catch(console.error);
