import fs from 'fs';
import path from 'path';
import Parser from 'web-tree-sitter';
import { analyzeFunctions } from '../src/engine/inference';
import { initParser } from '../src/parser/treeSitter';

function normalizeString(s: string): string {
    return s.replace(/\s+/g, '');
}

async function main() {
    const wasmDir = path.resolve(__dirname, '../node_modules/tree-sitter-wasms/out');
    await Parser.init({ locateFile(scriptName: string) { return path.join(wasmDir, scriptName); } });
    await initParser(wasmDir);
    const parser = new Parser();
    const lang = await Parser.Language.load(path.join(wasmDir, 'tree-sitter-cpp.wasm'));
    parser.setLanguage(lang);

    const CPP_FILE = path.join(__dirname, '..', 'validation_corpus_batch4.cpp');
    const ANSWERS_FILE = path.join(__dirname, '..', 'validation_answers_batch4.txt');

    const code = fs.readFileSync(CPP_FILE, 'utf-8');
    
    // Extract headers, macros, and helpers (everything before test601)
    const test601Index = code.indexOf('int test601');
    const prefix = code.substring(0, test601Index);
    
    const expected = new Map<string, string>();
    const answersText = fs.readFileSync(ANSWERS_FILE, 'utf-8');
    for (const line of answersText.split('\n')) {
        const t = line.trim();
        if (t === '' || t.startsWith('#')) continue;
        const [funcName, comp] = t.split('->').map(s => s.trim());
        if (funcName && comp) {
            expected.set(funcName, comp);
        }
    }

    const tree = parser.parse(code);
    const functions = tree.rootNode.descendantsOfType('function_definition');
    
    let passed = 0;
    let failed = 0;
    const output: string[] = [];

    for (const func of functions) {
        const nameNode = func.childForFieldName('declarator')?.childForFieldName('declarator');
        if (!nameNode) continue;
        const funcName = nameNode.text;
        if (!funcName.startsWith('test')) continue;

        const exp = expected.get(funcName) || 'UNKNOWN';
        let act = 'UNKNOWN';

        try {
            const isolatedCode = prefix + '\n' + func.text;
            const isoTree = parser.parse(isolatedCode);
            const result = analyzeFunctions(isoTree);
            const funcResult = result.functions.find(r => r.name === funcName);
            if (funcResult) {
                act = funcResult.complexity;
            }
        } catch(e: any) {
            act = 'CRASH';
            console.error(`Crash on ${funcName}: ${e.message}`);
        }

        const expNorm = exp.replace(/\s+/g, '').replace(/sqrt([a-zA-Z0-9_]+)/g, 'sqrt($1)');
        const actNorm = act.replace(/\s+/g, '').replace(/sqrt([a-zA-Z0-9_]+)/g, 'sqrt($1)');

        if (expNorm === actNorm) {
            passed++;
        } else {
            failed++;
            output.push('## ' + funcName);
            output.push('Expected:');
            output.push(exp);
            output.push('');
            output.push('Produced:');
            output.push(`Overall time complexity of function ${funcName} is ${act}.`);
            output.push('---');
        }
    }

    const finalOutput = `Total tests checked: ${passed + failed}\nPassed: ${passed}\nFailed: ${failed}\n\n` + output.join('\n');
    fs.writeFileSync(path.join(__dirname, '..', 'validation_results_batch4.txt'), finalOutput);
    console.log(`Done. ${passed}/${passed+failed} passed.`);
}

main().catch(console.error);
