import Parser from 'web-tree-sitter';
import fs from 'fs';
import path from 'path';
import { extractFunctionLoops, buildAliasMap } from '../src/parser/astUtils';

async function main() {
    await Parser.init();
    const parser = new Parser();
    const wasmPath = path.resolve(__dirname, '../node_modules/tree-sitter-wasms/out/tree-sitter-cpp.wasm');
    const lang = await Parser.Language.load(wasmPath);
    parser.setLanguage(lang);

    const corpusPath = path.resolve(__dirname, 'validation_corpus_batch1.cpp');
    const code = fs.readFileSync(corpusPath, 'utf-8');
    const tree = parser.parse(code);

    const query = new Parser.Query(lang, `(function_definition) @func`);
    const matches = query.matches(tree.rootNode);
    
    for (const match of matches) {
        const funcNode = match.captures[0].node;
        const nameNode = funcNode.childForFieldName('declarator')?.childForFieldName('declarator');
        if (nameNode && (nameNode.text === 'test197' || nameNode.text === 'test198')) {
            console.log(`\n=== ${nameNode.text} ===`);
            const aliasMap = buildAliasMap ? buildAliasMap(funcNode) : new Map();
            console.log("Alias Map:", Object.fromEntries(aliasMap));
            const loops = extractFunctionLoops(funcNode, aliasMap);
            console.log(JSON.stringify(loops, null, 2));
        }
    }
}

main().catch(console.error);
