"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var treeSitter_1 = require("./src/parser/treeSitter");
var path_1 = require("path");
function printNode(n, depth) {
    if (depth === void 0) { depth = 0; }
    var indent = '  '.repeat(depth);
    console.log("".concat(indent, "[").concat(n.type, "] \"").concat(n.text.replace(/\n/g, '\\n').slice(0, 60), "\""));
    for (var i = 0; i < n.childCount; i++) {
        var ch = n.child(i);
        if (ch)
            printNode(ch, depth + 1);
    }
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var ex1, fn1, body1, i, ch, ifStmts1, _i, ifStmts1_1, stmt, cond, returns1, _a, returns1_1, r, ex2, fn2, ifStmts2, _b, ifStmts2_1, stmt, cond, exprs2, _c, exprs2_1, e, ex3, fn3, ifStmts3, _d, ifStmts3_1, stmt, cond, returns3, _e, returns3_1, r, dfs, fnDfs, ifDfs, _f, ifDfs_1, stmt, cond, ms, fnMs, ifMs, _g, ifMs_1, stmt, cond, bt, fnBt, ifBt, _h, ifBt_1, stmt, cond;
        var _j;
        return __generator(this, function (_k) {
            switch (_k.label) {
                case 0: return [4 /*yield*/, (0, treeSitter_1.initParser)((0, path_1.resolve)('./dist'))];
                case 1:
                    _k.sent();
                    // --- Example 1: Array memoization ---
                    console.log('\n======= EXAMPLE 1: Array dp[] memo =======');
                    ex1 = (0, treeSitter_1.parseOneOff)("\nint dp[100005];\nint solve(int n) {\n    if (n <= 1) return 1;\n    if (dp[n] != -1) return dp[n];\n    return dp[n] = solve(n - 1);\n}");
                    fn1 = ex1.rootNode.descendantsOfType('function_definition')[0];
                    body1 = fn1.childForFieldName('body');
                    console.log('Body children:');
                    for (i = 0; i < ((_j = body1 === null || body1 === void 0 ? void 0 : body1.childCount) !== null && _j !== void 0 ? _j : 0); i++) {
                        ch = body1.child(i);
                        if (ch && ch.type !== '{' && ch.type !== '}') {
                            console.log("  [".concat(ch.type, "]: ").concat(ch.text.replace(/\n/g, ' ').slice(0, 80)));
                        }
                    }
                    ifStmts1 = fn1.descendantsOfType('if_statement');
                    for (_i = 0, ifStmts1_1 = ifStmts1; _i < ifStmts1_1.length; _i++) {
                        stmt = ifStmts1_1[_i];
                        cond = stmt.childForFieldName('condition');
                        console.log('\n  if_statement condition:');
                        if (cond)
                            printNode(cond, 2);
                    }
                    returns1 = fn1.descendantsOfType('return_statement');
                    for (_a = 0, returns1_1 = returns1; _a < returns1_1.length; _a++) {
                        r = returns1_1[_a];
                        console.log('\n  return_statement:');
                        printNode(r, 2);
                    }
                    // --- Example 2: long long memo[] ---
                    console.log('\n======= EXAMPLE 2: ll memo[] =======');
                    ex2 = (0, treeSitter_1.parseOneOff)("\nlong long memo[100005];\nll f(int x) {\n    if (memo[x] != -1)\n        return memo[x];\n    memo[x] = f(x - 1);\n    return memo[x];\n}");
                    fn2 = ex2.rootNode.descendantsOfType('function_definition')[0];
                    ifStmts2 = fn2.descendantsOfType('if_statement');
                    for (_b = 0, ifStmts2_1 = ifStmts2; _b < ifStmts2_1.length; _b++) {
                        stmt = ifStmts2_1[_b];
                        cond = stmt.childForFieldName('condition');
                        console.log('\n  if_statement condition:');
                        if (cond)
                            printNode(cond, 2);
                    }
                    exprs2 = fn2.descendantsOfType('expression_statement');
                    for (_c = 0, exprs2_1 = exprs2; _c < exprs2_1.length; _c++) {
                        e = exprs2_1[_c];
                        console.log('\n  expression_statement:', e.text.slice(0, 80));
                    }
                    // --- Example 3: unordered_map dp ---
                    console.log('\n======= EXAMPLE 3: unordered_map dp =======');
                    ex3 = (0, treeSitter_1.parseOneOff)("\nunordered_map<int,int> dp;\nint solve(int x) {\n    if (dp.count(x))\n        return dp[x];\n    return dp[x] = solve(x - 1);\n}");
                    fn3 = ex3.rootNode.descendantsOfType('function_definition')[0];
                    ifStmts3 = fn3.descendantsOfType('if_statement');
                    for (_d = 0, ifStmts3_1 = ifStmts3; _d < ifStmts3_1.length; _d++) {
                        stmt = ifStmts3_1[_d];
                        cond = stmt.childForFieldName('condition');
                        console.log('\n  if_statement condition:');
                        if (cond)
                            printNode(cond, 2);
                    }
                    returns3 = fn3.descendantsOfType('return_statement');
                    for (_e = 0, returns3_1 = returns3; _e < returns3_1.length; _e++) {
                        r = returns3_1[_e];
                        console.log('\n  return_statement:');
                        printNode(r, 2);
                    }
                    // --- Investigate false-positive patterns ---
                    console.log('\n======= FALSE POSITIVE: DFS with vis[] =======');
                    dfs = (0, treeSitter_1.parseOneOff)("\nvoid dfs(int u) {\n    if (vis[u]) return;\n    vis[u] = true;\n    for (auto v : adj[u]) dfs(v);\n}");
                    fnDfs = dfs.rootNode.descendantsOfType('function_definition')[0];
                    ifDfs = fnDfs.descendantsOfType('if_statement');
                    for (_f = 0, ifDfs_1 = ifDfs; _f < ifDfs_1.length; _f++) {
                        stmt = ifDfs_1[_f];
                        cond = stmt.childForFieldName('condition');
                        console.log('\n  if_statement condition:');
                        if (cond)
                            printNode(cond, 2);
                    }
                    console.log('\n======= FALSE POSITIVE: Merge Sort =======');
                    ms = (0, treeSitter_1.parseOneOff)("\nvoid mergeSort(int* arr, int l, int r) {\n    if (l >= r) return;\n    int mid = (l + r) / 2;\n    mergeSort(arr, l, mid);\n    mergeSort(arr, mid+1, r);\n    merge(arr, l, mid, r);\n}");
                    fnMs = ms.rootNode.descendantsOfType('function_definition')[0];
                    ifMs = fnMs.descendantsOfType('if_statement');
                    for (_g = 0, ifMs_1 = ifMs; _g < ifMs_1.length; _g++) {
                        stmt = ifMs_1[_g];
                        cond = stmt.childForFieldName('condition');
                        console.log('\n  if_statement condition:');
                        if (cond)
                            printNode(cond, 2);
                    }
                    console.log('\n======= FALSE POSITIVE: Backtracking =======');
                    bt = (0, treeSitter_1.parseOneOff)("\nvoid backtrack(int idx, vector<int>& path) {\n    if (idx == n) { result.push_back(path); return; }\n    for (int i = 0; i < n; i++) {\n        if (visited[i]) continue;\n        visited[i] = true;\n        path.push_back(i);\n        backtrack(idx+1, path);\n        path.pop_back();\n        visited[i] = false;\n    }\n}");
                    fnBt = bt.rootNode.descendantsOfType('function_definition')[0];
                    ifBt = fnBt.descendantsOfType('if_statement');
                    for (_h = 0, ifBt_1 = ifBt; _h < ifBt_1.length; _h++) {
                        stmt = ifBt_1[_h];
                        cond = stmt.childForFieldName('condition');
                        console.log('\n  backtrack if_statement condition:');
                        if (cond)
                            printNode(cond, 2);
                    }
                    return [2 /*return*/];
            }
        });
    });
}
main().catch(console.error);
