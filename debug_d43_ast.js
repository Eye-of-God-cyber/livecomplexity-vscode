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
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var cases, _i, cases_1, _a, label, code, tree, subs, _loop_1, _b, subs_1, s, guardTree, ifs, _c, ifs_1, stmt, cond, i, ch, lhs, indices, cur, argList, i, ch, analyzeFunctions, multiVarCode, res;
        var _d, _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0: return [4 /*yield*/, (0, treeSitter_1.initParser)((0, path_1.resolve)('./dist'))];
                case 1:
                    _f.sent();
                    cases = [
                        { label: 'dp[i][j]', code: 'int f(){ return dp[i][j]; }' },
                        { label: 'dp[row][col]', code: 'int f(){ return dp[row][col]; }' },
                        { label: 'dp[a][b][c]', code: 'int f(){ return dp[a][b][c]; }' },
                        { label: 'dp[i][mask]', code: 'int f(){ return dp[i][mask]; }' },
                        { label: 'memo[l][r]', code: 'int f(){ return memo[l][r]; }' },
                        { label: 'memo[x][y][z]', code: 'int f(){ return memo[x][y][z]; }' },
                        // indices that are expressions not simple identifiers
                        { label: 'dp[i+1][j-1]', code: 'int f(){ return dp[i+1][j-1]; }' },
                        { label: 'dp[2*i][j>>1]', code: 'int f(){ return dp[2*i][j>>1]; }' },
                        // guard form: full 2D guard
                        { label: '2D guard full', code: 'int solve(int i, int j){ if(dp[i][j]!=-1) return dp[i][j]; return dp[i][j]=solve(i-1,j); }' },
                        // subscript_argument_list children for 2D
                        { label: '2D arglist walk', code: 'int f(){ int x = dp[i][j]; }' },
                    ];
                    for (_i = 0, cases_1 = cases; _i < cases_1.length; _i++) {
                        _a = cases_1[_i], label = _a.label, code = _a.code;
                        console.log("\n".concat('='.repeat(60)));
                        console.log("CASE: ".concat(label));
                        console.log('='.repeat(60));
                        tree = (0, treeSitter_1.parseOneOff)(code);
                        subs = tree.rootNode.descendantsOfType('subscript_expression');
                        _loop_1 = function (s) {
                            if (s.text.length > 60)
                                return "continue"; // skip overly long nodes
                            console.log("\nsubscript_expression: \"".concat(s.text, "\""));
                            // Walk the chain
                            var indices = [];
                            var indexTypes = [];
                            var cur = s;
                            while (cur.type === 'subscript_expression') {
                                var argList = cur.child(1); // subscript_argument_list
                                if (argList) {
                                    for (var i = 0; i < argList.childCount; i++) {
                                        var ch = argList.child(i);
                                        if (ch && ch.type !== '[' && ch.type !== ']') {
                                            indices.unshift(ch.text);
                                            indexTypes.unshift(ch.type);
                                        }
                                    }
                                }
                                cur = cur.child(0);
                            }
                            var rootName = cur.type === 'identifier' ? cur.text : "[".concat(cur.type, "]");
                            console.log("  root:    \"".concat(rootName, "\" (type: ").concat(cur.type, ")"));
                            console.log("  indices: [".concat(indices.map(function (v, i) { return "\"".concat(v, "\"(").concat(indexTypes[i], ")"); }).join(', '), "]"));
                            console.log("  -> extracted symbols: [".concat(indices.map(function (v, i) { return indexTypes[i] === 'identifier' ? v : "EXPR:".concat(v.slice(0, 15)); }).join(', '), "]"));
                        };
                        for (_b = 0, subs_1 = subs; _b < subs_1.length; _b++) {
                            s = subs_1[_b];
                            _loop_1(s);
                        }
                    }
                    // Now investigate the exact index extraction for guard dp[i][j] != -1
                    console.log("\n".concat('='.repeat(60)));
                    console.log('GUARD index extraction detail for dp[i][j] != -1');
                    console.log('='.repeat(60));
                    guardTree = (0, treeSitter_1.parseOneOff)('void f(){ if(dp[i][j] != -1) return dp[i][j]; dp[i][j] = f(1,2); }');
                    ifs = guardTree.rootNode.descendantsOfType('if_statement');
                    for (_c = 0, ifs_1 = ifs; _c < ifs_1.length; _c++) {
                        stmt = ifs_1[_c];
                        cond = stmt.childForFieldName('condition');
                        // unwrap condition_clause
                        if (cond.type === 'condition_clause') {
                            for (i = 0; i < cond.childCount; i++) {
                                ch = cond.child(i);
                                if (ch && ch.type !== '(' && ch.type !== ')') {
                                    cond = ch;
                                    break;
                                }
                            }
                        }
                        if (cond.type !== 'binary_expression')
                            continue;
                        lhs = cond.childForFieldName('left');
                        console.log("\nGuard lhs: \"".concat(lhs.text, "\" type=").concat(lhs.type));
                        indices = [];
                        cur = lhs;
                        while (cur.type === 'subscript_expression') {
                            argList = cur.child(1);
                            if (argList) {
                                for (i = 0; i < argList.childCount; i++) {
                                    ch = argList.child(i);
                                    if (ch && ch.type !== '[' && ch.type !== ']') {
                                        indices.unshift({ text: ch.text, type: ch.type });
                                    }
                                }
                            }
                            cur = cur.child(0);
                        }
                        console.log("Extracted indices (outermost-last = left-to-right): ".concat(JSON.stringify(indices)));
                        console.log("Root: \"".concat(cur.text, "\" type=").concat(cur.type));
                    }
                    // check what linearVars looks like in the existing engine output for multi-var loops
                    console.log("\n".concat('='.repeat(60)));
                    console.log('Existing linearVars path for nested loop O(nm)');
                    console.log('='.repeat(60));
                    analyzeFunctions = require('./src/engine/inference').analyzeFunctions;
                    multiVarCode = "\nvoid solve(int n, int m) {\n    for(int i=0; i<n; i++)\n        for(int j=0; j<m; j++)\n            dp[i][j] = 0;\n}";
                    res = analyzeFunctions((0, treeSitter_1.parseOneOff)(multiVarCode));
                    console.log("Multi-var loop result: complexity=".concat((_d = res.functions[0]) === null || _d === void 0 ? void 0 : _d.complexity, " confidence=").concat((_e = res.functions[0]) === null || _e === void 0 ? void 0 : _e.confidence));
                    return [2 /*return*/];
            }
        });
    });
}
main().catch(console.error);
