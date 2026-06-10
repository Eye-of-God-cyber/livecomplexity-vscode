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
function walk(n, depth, maxDepth) {
    if (depth === void 0) { depth = 0; }
    if (maxDepth === void 0) { maxDepth = 5; }
    if (depth > maxDepth)
        return;
    var indent = '  '.repeat(depth);
    var namedFields = [];
    for (var _i = 0, _a = ['left', 'right', 'operator', 'function', 'arguments', 'condition', 'body', 'declarator', 'value', 'index', 'argument']; _i < _a.length; _i++) {
        var f = _a[_i];
        var ch = n.childForFieldName(f);
        if (ch)
            namedFields.push("".concat(f, "=").concat(ch.type, "(\"").concat(ch.text.slice(0, 25), "\")"));
    }
    console.log("".concat(indent, "[").concat(n.type, "] \"").concat(n.text.slice(0, 40).replace(/\n/g, '\\n'), "\" ").concat(namedFields.length ? '{' + namedFields.join(', ') + '}' : ''));
    for (var i = 0; i < n.childCount; i++)
        walk(n.child(i), depth + 1, maxDepth);
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var t, b, t, b, _i, b_1, n, ifs, _a, ifs_1, stmt, cond, i, ch, t, fors, _b, fors_1, fs, i, ch, init, cond, update, t, fors, _c, fors_2, fs, cond, t, d, t, d, t, d, t, fors, _d, fors_3, fs, cond, update, condExpr, op, lhs, rhs, shifts, t, fors, _e, fors_4, fs, cond, update, op, lhs, rhs, shifts, t, fors, _f, fors_5, fs, cond, shifts, t, assigns, _g, assigns_1, a, left, right, fn, args;
        var _h, _j;
        return __generator(this, function (_k) {
            switch (_k.label) {
                case 0: return [4 /*yield*/, (0, treeSitter_1.initParser)((0, path_1.resolve)('./dist'))];
                case 1:
                    _k.sent();
                    // ─── Pattern A: 1 << j ───────────────────────────────────────────────────
                    console.log('\n' + '='.repeat(60));
                    console.log('Pattern A: 1 << j');
                    console.log('='.repeat(60));
                    {
                        t = (0, treeSitter_1.parseOneOff)('void f(){ int x = 1 << j; }');
                        b = t.rootNode.descendantsOfType('binary_expression')[0];
                        walk(b);
                    }
                    // ─── Pattern B: i + (1 << j) ─────────────────────────────────────────────
                    console.log('\n' + '='.repeat(60));
                    console.log('Pattern B: i + (1 << j) <= n');
                    console.log('='.repeat(60));
                    {
                        t = (0, treeSitter_1.parseOneOff)('void f(){ if(i + (1 << j) <= n) {} }');
                        b = t.rootNode.descendantsOfType('binary_expression');
                        for (_i = 0, b_1 = b; _i < b_1.length; _i++) {
                            n = b_1[_i];
                            if (n.text.includes('1 <<')) {
                                walk(n);
                                break;
                            }
                        }
                        ifs = t.rootNode.descendantsOfType('if_statement');
                        for (_a = 0, ifs_1 = ifs; _a < ifs_1.length; _a++) {
                            stmt = ifs_1[_a];
                            cond = stmt.childForFieldName('condition');
                            if ((cond === null || cond === void 0 ? void 0 : cond.type) === 'condition_clause') {
                                for (i = 0; i < cond.childCount; i++) {
                                    ch = cond.child(i);
                                    if (ch && ch.type !== '(' && ch.type !== ')') {
                                        cond = ch;
                                        break;
                                    }
                                }
                            }
                            console.log('\nouter comparison:');
                            walk(cond);
                        }
                    }
                    // ─── Pattern C: j++ update in for loop ───────────────────────────────────
                    console.log('\n' + '='.repeat(60));
                    console.log('Pattern C: for(j=1; (1<<j)<=n; j++) header');
                    console.log('='.repeat(60));
                    {
                        t = (0, treeSitter_1.parseOneOff)('void f(){ for(int j=1;(1<<j)<=n;j++) {} }');
                        fors = t.rootNode.descendantsOfType('for_statement');
                        for (_b = 0, fors_1 = fors; _b < fors_1.length; _b++) {
                            fs = fors_1[_b];
                            console.log('\nfor_statement children:');
                            for (i = 0; i < fs.childCount; i++) {
                                ch = fs.child(i);
                                console.log("  child(".concat(i, "): type=").concat(ch === null || ch === void 0 ? void 0 : ch.type, " text=\"").concat((_h = ch === null || ch === void 0 ? void 0 : ch.text) === null || _h === void 0 ? void 0 : _h.slice(0, 40), "\""));
                            }
                            init = fs.childForFieldName('initializer');
                            cond = fs.childForFieldName('condition');
                            update = fs.childForFieldName('update');
                            console.log("  initializer: type=".concat(init === null || init === void 0 ? void 0 : init.type, " text=\"").concat(init === null || init === void 0 ? void 0 : init.text, "\""));
                            console.log("  condition:   type=".concat(cond === null || cond === void 0 ? void 0 : cond.type, " text=\"").concat(cond === null || cond === void 0 ? void 0 : cond.text, "\""));
                            console.log("  update:      type=".concat(update === null || update === void 0 ? void 0 : update.type, " text=\"").concat(update === null || update === void 0 ? void 0 : update.text, "\""));
                            // show condition deeply
                            console.log('\nCondition deep:');
                            walk(cond, 0, 4);
                        }
                    }
                    // ─── Inner loop condition: i + (1 << j) <= n ──────────────────────────────
                    console.log('\n' + '='.repeat(60));
                    console.log('Inner loop: for(i=0; i+(1<<j)<=n; i++)');
                    console.log('='.repeat(60));
                    {
                        t = (0, treeSitter_1.parseOneOff)('void f(){ for(int i=0;i+(1<<j)<=n;i++){} }');
                        fors = t.rootNode.descendantsOfType('for_statement');
                        for (_c = 0, fors_2 = fors; _c < fors_2.length; _c++) {
                            fs = fors_2[_c];
                            cond = fs.childForFieldName('condition');
                            console.log('\nInner cond deep:');
                            walk(cond, 0, 5);
                        }
                    }
                    // ─── Pattern E: k = __lg(r - l + 1) ─────────────────────────────────────
                    console.log('\n' + '='.repeat(60));
                    console.log('Pattern E: k = __lg(r - l + 1)');
                    console.log('='.repeat(60));
                    {
                        t = (0, treeSitter_1.parseOneOff)('void f(){ int k = __lg(r - l + 1); }');
                        d = t.rootNode.descendantsOfType('declaration')[0];
                        walk(d, 0, 5);
                    }
                    // ─── Pattern F: 31 - __builtin_clz(x) ───────────────────────────────────
                    console.log('\n' + '='.repeat(60));
                    console.log('Pattern F: 31 - __builtin_clz(x)');
                    console.log('='.repeat(60));
                    {
                        t = (0, treeSitter_1.parseOneOff)('void f(){ int k = 31 - __builtin_clz(n); }');
                        d = t.rootNode.descendantsOfType('declaration')[0];
                        walk(d, 0, 5);
                    }
                    // ─── Pattern G: log2 query ───────────────────────────────────────────────
                    console.log('\n' + '='.repeat(60));
                    console.log('Pattern G: int k = log2(r - l + 1)');
                    console.log('='.repeat(60));
                    {
                        t = (0, treeSitter_1.parseOneOff)('void f(){ int k = log2(r - l + 1); }');
                        d = t.rootNode.descendantsOfType('declaration')[0];
                        walk(d, 0, 5);
                    }
                    // ─── Full sparse table build ─────────────────────────────────────────────
                    console.log('\n' + '='.repeat(60));
                    console.log('Full Sparse Table build (nested loops)');
                    console.log('='.repeat(60));
                    {
                        t = (0, treeSitter_1.parseOneOff)("\nvoid buildST(int* a, int n) {\n    for (int i = 0; i < n; i++) st[i][0] = a[i];\n    for (int j = 1; (1 << j) <= n; j++) {\n        for (int i = 0; i + (1 << j) <= n; i++) {\n            st[i][j] = max(st[i][j-1], st[i + (1 << (j-1))][j-1]);\n        }\n    }\n}");
                        fors = t.rootNode.descendantsOfType('for_statement');
                        for (_d = 0, fors_3 = fors; _d < fors_3.length; _d++) {
                            fs = fors_3[_d];
                            cond = fs.childForFieldName('condition');
                            update = fs.childForFieldName('update');
                            console.log("\nfor loop: cond=\"".concat(cond === null || cond === void 0 ? void 0 : cond.text, "\" update=\"").concat(update === null || update === void 0 ? void 0 : update.text, "\""));
                            condExpr = (cond === null || cond === void 0 ? void 0 : cond.type) === 'binary_expression' ? cond : null;
                            if (condExpr) {
                                op = condExpr.childForFieldName('operator');
                                lhs = condExpr.childForFieldName('left');
                                rhs = condExpr.childForFieldName('right');
                                console.log("  op=".concat(op === null || op === void 0 ? void 0 : op.type, " lhs=\"").concat(lhs === null || lhs === void 0 ? void 0 : lhs.text, "\"(").concat(lhs === null || lhs === void 0 ? void 0 : lhs.type, ") rhs=\"").concat(rhs === null || rhs === void 0 ? void 0 : rhs.text, "\"(").concat(rhs === null || rhs === void 0 ? void 0 : rhs.type, ")"));
                                shifts = condExpr.descendantsOfType('binary_expression').filter(function (b) { var _a; return ((_a = b.childForFieldName('operator')) === null || _a === void 0 ? void 0 : _a.type) === '<<'; });
                                console.log("  shift exprs in condition: ".concat(shifts.length, " [").concat(shifts.map(function (s) { return s.text; }).join(', '), "]"));
                            }
                        }
                    }
                    // ─── Compare: Binary lifting ─────────────────────────────────────────────
                    console.log('\n' + '='.repeat(60));
                    console.log('Comparison: Binary lifting up[v][j]');
                    console.log('='.repeat(60));
                    {
                        t = (0, treeSitter_1.parseOneOff)("\nvoid preprocess(int n) {\n    for (int j = 1; j < LOG; j++) {\n        for (int v = 0; v < n; v++) {\n            up[v][j] = up[up[v][j-1]][j-1];\n        }\n    }\n}");
                        fors = t.rootNode.descendantsOfType('for_statement');
                        for (_e = 0, fors_4 = fors; _e < fors_4.length; _e++) {
                            fs = fors_4[_e];
                            cond = fs.childForFieldName('condition');
                            update = fs.childForFieldName('update');
                            console.log("\nfor loop: cond=\"".concat(cond === null || cond === void 0 ? void 0 : cond.text, "\" update=\"").concat(update === null || update === void 0 ? void 0 : update.text, "\""));
                            if ((cond === null || cond === void 0 ? void 0 : cond.type) === 'binary_expression') {
                                op = cond.childForFieldName('operator');
                                lhs = cond.childForFieldName('left');
                                rhs = cond.childForFieldName('right');
                                console.log("  op=".concat(op === null || op === void 0 ? void 0 : op.type, " lhs=\"").concat(lhs === null || lhs === void 0 ? void 0 : lhs.text, "\"(").concat(lhs === null || lhs === void 0 ? void 0 : lhs.type, ") rhs=\"").concat(rhs === null || rhs === void 0 ? void 0 : rhs.text, "\"(").concat(rhs === null || rhs === void 0 ? void 0 : rhs.type, ")"));
                                shifts = cond.descendantsOfType('binary_expression').filter(function (b) { var _a; return ((_a = b.childForFieldName('operator')) === null || _a === void 0 ? void 0 : _a.type) === '<<'; });
                                console.log("  shift exprs in condition: ".concat(shifts.length));
                            }
                        }
                    }
                    // ─── Compare: Normal O(n log n) nested loop ────────────────────────────
                    console.log('\n' + '='.repeat(60));
                    console.log('Comparison: Normal O(n log n) nested loop (bitmask DP style)');
                    console.log('='.repeat(60));
                    {
                        t = (0, treeSitter_1.parseOneOff)("\nvoid f(int n) {\n    for (int mask = 0; mask < (1 << n); mask++) {\n        for (int i = 0; i < n; i++) {\n            dp[mask][i] = 0;\n        }\n    }\n}");
                        fors = t.rootNode.descendantsOfType('for_statement');
                        for (_f = 0, fors_5 = fors; _f < fors_5.length; _f++) {
                            fs = fors_5[_f];
                            cond = fs.childForFieldName('condition');
                            console.log("\nfor loop: cond=\"".concat(cond === null || cond === void 0 ? void 0 : cond.text, "\""));
                            if ((cond === null || cond === void 0 ? void 0 : cond.type) === 'binary_expression') {
                                shifts = cond.descendantsOfType('binary_expression').filter(function (b) { var _a; return ((_a = b.childForFieldName('operator')) === null || _a === void 0 ? void 0 : _a.type) === '<<'; });
                                console.log("  shift exprs: ".concat(shifts.length, " [").concat(shifts.map(function (s) { return s.text; }).join(', '), "]"));
                            }
                        }
                    }
                    // ─── Update pattern: st[i][j] = max(...) ─────────────────────────────────
                    console.log('\n' + '='.repeat(60));
                    console.log('ST update: st[i][j] = max(st[i][j-1], st[i+(1<<(j-1))][j-1])');
                    console.log('='.repeat(60));
                    {
                        t = (0, treeSitter_1.parseOneOff)('void f(){ st[i][j] = max(st[i][j-1], st[i + (1 << (j-1))][j-1]); }');
                        assigns = t.rootNode.descendantsOfType('assignment_expression');
                        for (_g = 0, assigns_1 = assigns; _g < assigns_1.length; _g++) {
                            a = assigns_1[_g];
                            left = a.childForFieldName('left');
                            right = a.childForFieldName('right');
                            console.log("left: type=".concat(left === null || left === void 0 ? void 0 : left.type, " text=\"").concat(left === null || left === void 0 ? void 0 : left.text, "\""));
                            console.log("right: type=".concat(right === null || right === void 0 ? void 0 : right.type, " text=\"").concat((_j = right === null || right === void 0 ? void 0 : right.text) === null || _j === void 0 ? void 0 : _j.slice(0, 60), "\""));
                            // is right a call_expression?
                            if ((right === null || right === void 0 ? void 0 : right.type) === 'call_expression') {
                                fn = right.childForFieldName('function');
                                args = right.childForFieldName('arguments');
                                console.log("  callee: \"".concat(fn === null || fn === void 0 ? void 0 : fn.text, "\" argCount=").concat(args === null || args === void 0 ? void 0 : args.namedChildCount));
                            }
                        }
                    }
                    return [2 /*return*/];
            }
        });
    });
}
main().catch(console.error);
