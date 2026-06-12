import { expect, test } from 'vitest';
import { analyzeFunctions } from '../../src/engine/inference';
import { printComplexityNode } from '../../src/engine/complexityNode';
import Parser from 'web-tree-sitter';
import fs from 'fs';
import path from 'path';

test('Investigation T x N', async () => {
    await Parser.init();
    const parser = new Parser();
    const wasmPath = path.resolve(__dirname, '../../node_modules/tree-sitter-wasms/out/tree-sitter-cpp.wasm');
    const lang = await Parser.Language.load(wasmPath);
    parser.setLanguage(lang);

    const code = `
        int n;
        void solve() {
            for (int i=0;i<n;i++) {}
        }
        int main() {
            int t;
            while(t--) {
                solve();
            }
        }
    `;
    const tree = parser.parse(code);
    const res = analyzeFunctions(tree);
    console.log("---- T x N ----");
    for (const d of res.functions) {
        console.log(d.name + ": " + d.complexity);
    }
});

test('Investigation K x M', async () => {
    await Parser.init();
    const parser = new Parser();
    const wasmPath = path.resolve(__dirname, '../../node_modules/tree-sitter-wasms/out/tree-sitter-cpp.wasm');
    const lang = await Parser.Language.load(wasmPath);
    parser.setLanguage(lang);

    const code = `
        void solve() {
            int k, m;
            while(k--) {
                while(m--) {
                }
            }
        }
    `;
    const tree = parser.parse(code);
    const res = analyzeFunctions(tree);
    console.log("---- K x M ----");
    for (const d of res.functions) {
        console.log(d.name + ": " + d.complexity);
    }
});

test('Investigation T x N 2', async () => {
    await Parser.init();
    const parser = new Parser();
    const wasmPath = path.resolve(__dirname, '../../node_modules/tree-sitter-wasms/out/tree-sitter-cpp.wasm');
    const lang = await Parser.Language.load(wasmPath);
    parser.setLanguage(lang);

    const code = `
        void solve() {
            int t, n;
            while(t--) {
                for(int i=0;i<n;i++) {
                }
            }
        }
    `;
    const tree = parser.parse(code);
    const res = analyzeFunctions(tree);
    console.log("---- T x N 2 ----");
    for (const d of res.functions) {
        console.log(d.name + ": " + d.complexity);
    }
});

test('Investigation Testcases', async () => {
    await Parser.init();
    const parser = new Parser();
    const wasmPath = path.resolve(__dirname, '../../node_modules/tree-sitter-wasms/out/tree-sitter-cpp.wasm');
    const lang = await Parser.Language.load(wasmPath);
    parser.setLanguage(lang);

    const code = `
        #include <vector>
        using namespace std;
        void solve(int sz) {
            for(int i=0;i<sz;i++) {}
        }
        int main() {
            int testcases;
            while(testcases--) {
                vector<int> v;
                int sz = v.size();
                solve(sz);
            }
        }
    `;
    const tree = parser.parse(code);
    const res = analyzeFunctions(tree);
    console.log("---- Testcases x Size ----");
    for (const d of res.functions) {
        console.log(d.name + ": " + d.complexity);
    }
});
