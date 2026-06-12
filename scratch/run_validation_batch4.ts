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

    const CPP_FILE = path.join(__dirname, '..', 'validation_corpus_batch4.cpp');
    const ANSWERS_FILE = path.join(__dirname, '..', 'validation_answers_batch4.txt');
    const RESULTS_FILE = path.join(__dirname, '..', 'validation_results_batch4.txt');

    const code = fs.readFileSync(CPP_FILE, 'utf-8');
    const tree = parser.parse(code);

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

    let passed = 0;
    let failed = 0;
    const output: string[] = [];

    const functions = tree.rootNode.descendantsOfType('function_definition');

    for (const func of functions) {
        const nameNode = func.childForFieldName('declarator')?.childForFieldName('declarator');
        if (!nameNode) continue;
        const funcName = nameNode.text;
        if (!funcName.startsWith('test')) continue;

        console.log(`Analyzing: ${funcName}`);

        const exp = expected.get(funcName) || 'UNKNOWN';
        let act = 'UNKNOWN';
        
        try {
            // Re-parse just this function to isolate it (same as analyzeFunctions does internally, but isolated)
            const result = analyzeFunctions(parser.parse(func.text));
            if (result.length > 0) {
                act = result[0].complexity;
            }
        } catch (e) {
            console.error(`Crash on ${funcName}:`, e);
            act = 'CRASH';
        }

        const expNorm = exp.replace(/\s+/g, '').replace(/sqrt([a-zA-Z0-9_]+)/g, 'sqrt($1)');
        const actNorm = act.replace(/\s+/g, '').replace(/sqrt([a-zA-Z0-9_]+)/g, 'sqrt($1)');

        if (expNorm === actNorm) {
            passed++;
        } else {
            failed++;
            output.push('## ' + funcName);
            output.push('');
            output.push('Expected:');
            output.push(exp);
            output.push('');
            output.push('Produced:');
            output.push(`Overall time complexity of function ${funcName} is ${act}.`);
            output.push('');
            output.push('---');
        }
    }

    let finalOutput = `Total tests checked: ${passed + failed}\nPassed: ${passed}\nFailed: ${failed}\n\n` + output.join('\n');
    fs.writeFileSync(RESULTS_FILE, finalOutput);
    console.log(`Done. ${passed}/${passed + failed} passed.`);
}

main().catch(console.error);
