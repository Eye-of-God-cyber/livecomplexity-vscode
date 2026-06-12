import Parser from 'web-tree-sitter';
import fs from 'fs';
import path from 'path';
import { initParser, parseOneOff } from '../src/parser/treeSitter';
import { classifyLoop } from '../src/parser/loopClassifier';

async function main() {
    const wasmDir = path.resolve(__dirname, '../node_modules/tree-sitter-wasms/out');
    await Parser.init({ locateFile(s) { return path.join(wasmDir, s); } });
    await initParser(wasmDir);
    const parser = new Parser();
    const lang = await Parser.Language.load(path.join(wasmDir, 'tree-sitter-cpp.wasm'));
    parser.setLanguage(lang);

    const code = fs.readFileSync('scratch/validation_corpus_batch3.cpp', 'utf8');
    const tree = parser.parse(code);
    for (const macro of tree.rootNode.descendantsOfType('preproc_function_def')) {
        const nameNode = macro.childForFieldName('name');
        if (nameNode && nameNode.text === 'fo') {
            const paramsNode = macro.childForFieldName('parameters');
            const valueNode = macro.childForFieldName('value');
            const argText = valueNode?.text.trim() || '';
            const dummyCode = `void _dummy() { ${argText} {} }`;
            const dummyTree = parseOneOff(dummyCode);
            const loopNode = dummyTree?.rootNode.descendantsOfType('for_statement')[0];
            const result = classifyLoop(loopNode);
            
            let boundParamIndex = undefined;
            if (result.boundVar) {
                let paramIdx = 0;
                for (let i = 0; i < paramsNode.childCount; i++) {
                    const p = paramsNode.child(i);
                    if (p && p.type === 'identifier') {
                        const targetText = Array.isArray(result.boundVar) && result.boundVar.length === 1 ? result.boundVar[0] : result.boundVar;
                        console.log(`checking p='${p.text}' against targetText='${targetText}' (type ${typeof targetText})`);
                        if (typeof targetText === 'string' && p.text === targetText) {
                            boundParamIndex = paramIdx;
                            console.log("MATCH! boundParamIndex =", boundParamIndex);
                            break;
                        }
                        paramIdx++;
                    }
                }
            }
            console.log("Final boundParamIndex:", boundParamIndex);
        }
    }
}
main().catch(console.error);
