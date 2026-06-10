"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.DocumentAST = void 0;
exports.initParser = initParser;
exports.parseOneOff = parseOneOff;
exports.isParserReady = isParserReady;
// eslint-disable-next-line @typescript-eslint/no-require-imports
var wts = require('web-tree-sitter');
var Parser = wts.Parser || wts.default || wts;
var path = __importStar(require("node:path"));
// Module-level singleton for the parser instance
var parser = null;
var isReady = false;
/**
 * Initializes the tree-sitter parser with the C++ WASM grammar.
 * This must be called and awaited once before calling `parse()`.
 *
 * @param wasmDir The directory containing `tree-sitter.wasm` and `tree-sitter-cpp.wasm`.
 *                In the extension, this is typically `path.join(context.extensionPath, 'dist')`.
 */
function initParser(wasmDir) {
    return __awaiter(this, void 0, void 0, function () {
        var cppLanguage;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (isReady)
                        return [2 /*return*/];
                    return [4 /*yield*/, Parser.init({
                            locateFile: function (scriptName) {
                                // web-tree-sitter looks for 'tree-sitter.wasm'
                                if (scriptName === 'tree-sitter.wasm') {
                                    return path.join(wasmDir, 'tree-sitter.wasm');
                                }
                                return scriptName;
                            },
                        })];
                case 1:
                    _a.sent();
                    parser = new Parser();
                    return [4 /*yield*/, Parser.Language.load(path.join(wasmDir, 'tree-sitter-cpp.wasm'))];
                case 2:
                    cppLanguage = _a.sent();
                    if (parser) {
                        parser.setLanguage(cppLanguage);
                    }
                    isReady = true;
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Manages the lifecycle of a parsed AST for a single document.
 * Safely handles memory disposal and incremental parsing.
 */
var DocumentAST = /** @class */ (function () {
    function DocumentAST() {
        this.tree = null;
    }
    /**
     * Parses the source code, incrementally if a previous tree exists.
     */
    DocumentAST.prototype.parse = function (source) {
        if (!isReady || !parser)
            return null;
        // Force a fresh parse to prevent line-number desync on document edits.
        // Incremental parsing requires complex VSCode->TreeSitter Edit mapping
        // which is unnecessary for small files since a fresh parse takes <5ms.
        var newTree = parser.parse(source);
        // Safely dispose the old tree to prevent memory leaks in WASM
        if (this.tree) {
            this.tree.delete();
        }
        this.tree = newTree;
        return this.tree;
    };
    /**
     * Prepares the existing tree for an incremental parse by applying text edits.
     * This must be called before `parse()` when the document changes.
     */
    DocumentAST.prototype.edit = function (editObj) {
        if (this.tree) {
            this.tree.edit(editObj);
        }
    };
    /**
     * Returns the current tree without re-parsing.
     */
    DocumentAST.prototype.getTree = function () {
        return this.tree;
    };
    /**
     * Safely disposes the tree memory. Must be called when the document is closed.
     */
    DocumentAST.prototype.dispose = function () {
        if (this.tree) {
            this.tree.delete();
            this.tree = null;
        }
    };
    return DocumentAST;
}());
exports.DocumentAST = DocumentAST;
/**
 * Convenience function for one-off parsing where the tree will be discarded immediately.
 * WARNING: The caller MUST call `tree.delete()` to avoid memory leaks.
 */
function parseOneOff(source) {
    if (!isReady || !parser)
        return null;
    return parser.parse(source);
}
/**
 * Checks if the parser has been initialized.
 */
function isParserReady() {
    return isReady;
}
