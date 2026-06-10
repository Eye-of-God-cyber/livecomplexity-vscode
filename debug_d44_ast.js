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
function showNode(label, n, depth) {
    if (depth === void 0) { depth = 0; }
    var indent = '  '.repeat(depth);
    var fields = [];
    for (var _i = 0, _a = ['left', 'right', 'operator', 'function', 'arguments', 'condition', 'consequence', 'value', 'declarator', 'name']; _i < _a.length; _i++) {
        var f = _a[_i];
        var ch = n.childForFieldName(f);
        if (ch)
            fields.push("".concat(f, "=").concat(ch.type, "(\"").concat(ch.text.slice(0, 20), "\")"));
    }
    console.log("".concat(indent, "[").concat(n.type, "] \"").concat(n.text.slice(0, 40).replace(/\n/g, '\\n'), "\" ").concat(fields.length ? '{' + fields.join(', ') + '}' : ''));
    if (depth < 4) {
        for (var i = 0; i < n.childCount; i++)
            showNode('', n.child(i), depth + 1);
    }
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var cases, _i, cases_1, _a, label, code, tree, ifs, _b, ifs_1, stmt, cond, i, ch, op, lhs, rhs, decls, _c, decls_1, d, text, i, ch, val, fnNodes, _d, fnNodes_1, fn, fnNameNode, fnName, funcDeclarators, nameNode, calls, selfCalls, _e, calls_1, call, funcNode, args, argChildren, i, ch;
        var _f;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0: return [4 /*yield*/, (0, treeSitter_1.initParser)((0, path_1.resolve)('./dist'))];
                case 1:
                    _g.sent();
                    cases = [
                        {
                            label: 'MergeSort full',
                            code: "\nvoid mergeSort(int* arr, int l, int r) {\n    if (l >= r) return;\n    int mid = (l + r) / 2;\n    mergeSort(arr, l, mid);\n    mergeSort(arr, mid + 1, r);\n    merge(arr, l, mid, r);\n}"
                        },
                        {
                            label: 'Binary search recursive',
                            code: "\nint bsearch(int* arr, int lo, int hi, int target) {\n    if (lo > hi) return -1;\n    int mid = (lo + hi) / 2;\n    if (arr[mid] == target) return mid;\n    if (arr[mid] < target) return bsearch(arr, mid + 1, hi, target);\n    return bsearch(arr, lo, mid - 1, target);\n}"
                        },
                        {
                            label: 'QuickSort',
                            code: "\nvoid quickSort(int* arr, int l, int r) {\n    if (l >= r) return;\n    int p = partition(arr, l, r);\n    quickSort(arr, l, p - 1);\n    quickSort(arr, p + 1, r);\n}"
                        },
                        {
                            label: 'Segment tree build',
                            code: "\nvoid build(int node, int l, int r) {\n    if (l == r) { tree[node] = arr[l]; return; }\n    int mid = (l + r) / 2;\n    build(2 * node, l, mid);\n    build(2 * node + 1, mid + 1, r);\n    tree[node] = tree[2*node] + tree[2*node+1];\n}"
                        },
                        {
                            label: 'Generic recursion',
                            code: "\nint solve(int x) {\n    if (x <= 1) return x;\n    return solve(x - 1) + solve(x - 2);\n}"
                        },
                        {
                            label: 'MergeSort mid >> 1 variant',
                            code: "\nvoid mergeSort(int* arr, int l, int r) {\n    if (l >= r) return;\n    int mid = l + (r - l) / 2;\n    mergeSort(arr, l, mid);\n    mergeSort(arr, mid + 1, r);\n    merge(arr, l, mid, r);\n}"
                        },
                    ];
                    for (_i = 0, cases_1 = cases; _i < cases_1.length; _i++) {
                        _a = cases_1[_i], label = _a.label, code = _a.code;
                        console.log("\n".concat('='.repeat(60)));
                        console.log("CASE: ".concat(label));
                        console.log('='.repeat(60));
                        tree = (0, treeSitter_1.parseOneOff)(code);
                        ifs = tree.rootNode.descendantsOfType('if_statement');
                        for (_b = 0, ifs_1 = ifs; _b < ifs_1.length; _b++) {
                            stmt = ifs_1[_b];
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
                            console.log("\nif-condition: type=".concat(cond === null || cond === void 0 ? void 0 : cond.type, " text=\"").concat(cond === null || cond === void 0 ? void 0 : cond.text, "\""));
                            if ((cond === null || cond === void 0 ? void 0 : cond.type) === 'binary_expression') {
                                op = cond.childForFieldName('operator');
                                lhs = cond.childForFieldName('left');
                                rhs = cond.childForFieldName('right');
                                console.log("  op=\"".concat(op === null || op === void 0 ? void 0 : op.type, "\" lhs=\"").concat(lhs === null || lhs === void 0 ? void 0 : lhs.text, "\"(").concat(lhs === null || lhs === void 0 ? void 0 : lhs.type, ") rhs=\"").concat(rhs === null || rhs === void 0 ? void 0 : rhs.text, "\"(").concat(rhs === null || rhs === void 0 ? void 0 : rhs.type, ")"));
                            }
                        }
                        decls = tree.rootNode.descendantsOfType('declaration');
                        for (_c = 0, decls_1 = decls; _c < decls_1.length; _c++) {
                            d = decls_1[_c];
                            text = d.text;
                            if (text.includes('mid')) {
                                console.log("\ndeclaration: \"".concat(text, "\""));
                                // Find the init value
                                for (i = 0; i < d.childCount; i++) {
                                    ch = d.child(i);
                                    if ((ch === null || ch === void 0 ? void 0 : ch.type) === 'init_declarator') {
                                        console.log("  init_declarator: \"".concat(ch.text, "\""));
                                        val = ch.childForFieldName('value');
                                        console.log("  value: type=".concat(val === null || val === void 0 ? void 0 : val.type, " text=\"").concat(val === null || val === void 0 ? void 0 : val.text, "\""));
                                        if ((val === null || val === void 0 ? void 0 : val.type) === 'binary_expression') {
                                            showNode('  value', val, 2);
                                        }
                                    }
                                }
                            }
                        }
                        fnNodes = tree.rootNode.descendantsOfType('function_definition');
                        for (_d = 0, fnNodes_1 = fnNodes; _d < fnNodes_1.length; _d++) {
                            fn = fnNodes_1[_d];
                            fnNameNode = fn.childForFieldName('declarator');
                            fnName = '';
                            funcDeclarators = fn.descendantsOfType('function_declarator');
                            if (funcDeclarators.length > 0) {
                                nameNode = funcDeclarators[0].childForFieldName('declarator');
                                fnName = (_f = nameNode === null || nameNode === void 0 ? void 0 : nameNode.text) !== null && _f !== void 0 ? _f : '';
                            }
                            if (!fnName)
                                continue;
                            calls = fn.descendantsOfType('call_expression');
                            selfCalls = 0;
                            for (_e = 0, calls_1 = calls; _e < calls_1.length; _e++) {
                                call = calls_1[_e];
                                funcNode = call.childForFieldName('function');
                                if (!funcNode)
                                    continue;
                                if (funcNode.type === 'identifier' && funcNode.text === fnName) {
                                    selfCalls++;
                                    args = call.childForFieldName('arguments');
                                    console.log("\nself-call [".concat(selfCalls, "]: \"").concat(call.text.slice(0, 60), "\""));
                                    if (args) {
                                        argChildren = [];
                                        for (i = 0; i < args.childCount; i++) {
                                            ch = args.child(i);
                                            if (ch && ch.type !== '(' && ch.type !== ')' && ch.type !== ',') {
                                                argChildren.push("\"".concat(ch.text, "\"(").concat(ch.type, ")"));
                                            }
                                        }
                                        console.log("  args: [".concat(argChildren.join(', '), "]"));
                                    }
                                }
                            }
                            console.log("\nTotal self-calls in \"".concat(fnName, "\": ").concat(selfCalls));
                        }
                    }
                    return [2 /*return*/];
            }
        });
    });
}
main().catch(console.error);
