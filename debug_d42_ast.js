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
function printTree(n, depth) {
    if (depth === void 0) { depth = 0; }
    var indent = '  '.repeat(depth);
    var fields = [];
    for (var _i = 0, _a = Object.entries({ argument: 1, index: 1, left: 1, right: 1, operator: 1, function: 1 }); _i < _a.length; _i++) {
        var field = _a[_i][0];
        var f = n.childForFieldName(field);
        if (f)
            fields.push("".concat(field, "=").concat(f.type));
    }
    console.log("".concat(indent, "[").concat(n.type, "] \"").concat(n.text.replace(/\n/g, '\\n').slice(0, 50), "\" ").concat(fields.length ? '(' + fields.join(', ') + ')' : ''));
    for (var i = 0; i < n.childCount; i++) {
        printTree(n.child(i), depth + 1);
    }
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var cases, _i, cases_1, _a, label, code, tree, subs, _b, subs_1, s, arg, argList, i, ch, ifs, _c, ifs_1, stmt, cond, i, ch, left, op, right, la, ll, assigns, _d, assigns_1, a, left, right;
        var _e, _f, _g, _h;
        return __generator(this, function (_j) {
            switch (_j.label) {
                case 0: return [4 /*yield*/, (0, treeSitter_1.initParser)((0, path_1.resolve)('./dist'))];
                case 1:
                    _j.sent();
                    cases = [
                        // 1D
                        { label: '1D: dp[i]', code: 'void f(){ int x = dp[i]; }' },
                        // 2D
                        { label: '2D: dp[i][j]', code: 'void f(){ int x = dp[i][j]; }' },
                        // 3D
                        { label: '3D: dp[i][j][k]', code: 'void f(){ int x = dp[i][j][k]; }' },
                        // 2D guard
                        { label: '2D guard: if(dp[i][j] != -1)', code: 'void f(){ if(dp[i][j] != -1) return dp[i][j]; }' },
                        // 2D return write
                        { label: '2D return write: return dp[i][j] = solve(i-1,j)', code: 'int solve(int i,int j){ return dp[i][j] = solve(i-1,j); }' },
                        // 2D memoized recursion full
                        { label: '2D full memo solve(int i, int j)', code: "\nint dp[105][105];\nint solve(int i, int j) {\n    if(dp[i][j] != -1) return dp[i][j];\n    return dp[i][j] = solve(i-1, j);\n}" },
                        // False positive: visited matrix
                        { label: 'FP: visited[i][j] = true', code: 'void dfs(int i, int j){ if(visited[i][j]) return; visited[i][j] = true; dfs(i-1,j); }' },
                        // False positive: dist matrix
                        { label: 'FP: dist[i][j] update', code: 'void relax(int i, int j){ if(dist[i][j] > dist[i-1][j] + 1) dist[i][j] = dist[i-1][j] + 1; }' },
                        // False positive: grid DFS
                        { label: 'FP: grid[r][c] DFS', code: 'void dfs(int r, int c){ if(grid[r][c] == 0) return; grid[r][c] = 0; dfs(r-1,c); }' },
                    ];
                    for (_i = 0, cases_1 = cases; _i < cases_1.length; _i++) {
                        _a = cases_1[_i], label = _a.label, code = _a.code;
                        console.log("\n".concat('='.repeat(60)));
                        console.log("CASE: ".concat(label));
                        console.log('='.repeat(60));
                        tree = (0, treeSitter_1.parseOneOff)(code);
                        subs = tree.rootNode.descendantsOfType('subscript_expression');
                        for (_b = 0, subs_1 = subs; _b < subs_1.length; _b++) {
                            s = subs_1[_b];
                            console.log("\nsubscript_expression: \"".concat(s.text, "\""));
                            arg = s.child(0);
                            argList = s.child(1);
                            console.log("  child(0): type=".concat(arg === null || arg === void 0 ? void 0 : arg.type, " text=\"").concat(arg === null || arg === void 0 ? void 0 : arg.text, "\""));
                            if (argList) {
                                console.log("  child(1): type=".concat(argList.type, " text=\"").concat(argList.text, "\""));
                                for (i = 0; i < argList.childCount; i++) {
                                    ch = argList.child(i);
                                    console.log("    argList.child(".concat(i, "): type=").concat(ch === null || ch === void 0 ? void 0 : ch.type, " text=\"").concat(ch === null || ch === void 0 ? void 0 : ch.text, "\""));
                                }
                            }
                            // Named field
                            console.log("  childForFieldName('argument'): ".concat((_f = (_e = s.childForFieldName('argument')) === null || _e === void 0 ? void 0 : _e.type) !== null && _f !== void 0 ? _f : 'null'));
                        }
                        ifs = tree.rootNode.descendantsOfType('if_statement');
                        for (_c = 0, ifs_1 = ifs; _c < ifs_1.length; _c++) {
                            stmt = ifs_1[_c];
                            cond = stmt.childForFieldName('condition');
                            console.log("\nif_statement condition type: ".concat(cond === null || cond === void 0 ? void 0 : cond.type));
                            if ((cond === null || cond === void 0 ? void 0 : cond.type) === 'condition_clause') {
                                for (i = 0; i < cond.childCount; i++) {
                                    ch = cond.child(i);
                                    if ((ch === null || ch === void 0 ? void 0 : ch.type) !== '(' && (ch === null || ch === void 0 ? void 0 : ch.type) !== ')') {
                                        cond = ch;
                                        break;
                                    }
                                }
                            }
                            console.log("  unwrapped: type=".concat(cond === null || cond === void 0 ? void 0 : cond.type, " text=\"").concat((_g = cond === null || cond === void 0 ? void 0 : cond.text) === null || _g === void 0 ? void 0 : _g.slice(0, 60), "\""));
                            if ((cond === null || cond === void 0 ? void 0 : cond.type) === 'binary_expression') {
                                left = cond.childForFieldName('left');
                                op = cond.childForFieldName('operator');
                                right = cond.childForFieldName('right');
                                console.log("    left: type=".concat(left === null || left === void 0 ? void 0 : left.type, " text=\"").concat(left === null || left === void 0 ? void 0 : left.text, "\""));
                                console.log("    op:   ".concat(op === null || op === void 0 ? void 0 : op.type));
                                console.log("    right: type=".concat(right === null || right === void 0 ? void 0 : right.type, " text=\"").concat(right === null || right === void 0 ? void 0 : right.text, "\""));
                                if ((left === null || left === void 0 ? void 0 : left.type) === 'subscript_expression') {
                                    la = left.child(0);
                                    ll = left.child(1);
                                    console.log("    left.child(0): type=".concat(la === null || la === void 0 ? void 0 : la.type, " text=\"").concat(la === null || la === void 0 ? void 0 : la.text, "\""));
                                    console.log("    left.child(1): type=".concat(ll === null || ll === void 0 ? void 0 : ll.type, " text=\"").concat(ll === null || ll === void 0 ? void 0 : ll.text, "\""));
                                }
                            }
                        }
                        assigns = tree.rootNode.descendantsOfType('assignment_expression');
                        for (_d = 0, assigns_1 = assigns; _d < assigns_1.length; _d++) {
                            a = assigns_1[_d];
                            console.log("\nassignment: \"".concat(a.text.slice(0, 60), "\""));
                            left = a.childForFieldName('left');
                            right = a.childForFieldName('right');
                            console.log("  left: type=".concat(left === null || left === void 0 ? void 0 : left.type, " text=\"").concat(left === null || left === void 0 ? void 0 : left.text, "\""));
                            console.log("  right: type=".concat(right === null || right === void 0 ? void 0 : right.type, " text=\"").concat((_h = right === null || right === void 0 ? void 0 : right.text) === null || _h === void 0 ? void 0 : _h.slice(0, 40), "\""));
                        }
                    }
                    return [2 /*return*/];
            }
        });
    });
}
main().catch(console.error);
