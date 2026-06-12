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

    const CPP_FILE = path.join(__dirname, '..', 'validation_corpus_batch5.cpp');
    const code = fs.readFileSync(CPP_FILE, 'utf-8');

    // Extract expected answers
    const expected = new Map<string, string>();
    const lines = code.split('\n');
    for (const line of lines) {
        const t = line.trim();
        if (t.startsWith('// test')) {
            const match = t.match(/\/\/\s*(test\d+):\s*(O\([^)]+\)|Unknown)/);
            if (match) {
                expected.set(match[1], match[2]);
            }
        }
    }

    // Extract definitions before test801 to include as prefix
    let prefix = '';
    for (const line of lines) {
        if (line.includes('test801(')) break;
        prefix += line + '\n';
    }

    const tree = parser.parse(code);
    const functions = tree.rootNode.descendantsOfType('function_definition');
    
    let passed = 0;
    let failed = 0;
    const mismatches: any[] = [];

    for (const func of functions) {
        const nameNode = func.childForFieldName('declarator')?.childForFieldName('declarator');
        if (!nameNode) continue;
        const funcName = nameNode.text;
        
        const match = funcName.match(/^test(\d+)$/);
        if (!match) continue;
        
        const testNum = parseInt(match[1], 10);
        if (testNum < 801 || testNum > 1000) continue;

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
        } catch (e) {
            console.error("Error analyzing " + funcName + ":", e);
        }

        const expNorm = normalizeString(exp);
        const actNorm = normalizeString(act);

        if (expNorm === actNorm) {
            passed++;
        } else {
            failed++;
            mismatches.push({ funcName, expected: exp, actual: act });
        }
    }

    console.log(JSON.stringify({ passed, failed, mismatches }, null, 2));
}

main().catch(console.error);
