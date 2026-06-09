import type { Tree } from 'web-tree-sitter';
import type ParserType from 'web-tree-sitter';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const wts = require('web-tree-sitter');
const Parser = wts.Parser || wts.default || wts;
import * as path from 'node:path';

// Module-level singleton for the parser instance
let parser: ParserType | null = null;
let isReady = false;

/**
 * Initializes the tree-sitter parser with the C++ WASM grammar.
 * This must be called and awaited once before calling `parse()`.
 *
 * @param wasmDir The directory containing `tree-sitter.wasm` and `tree-sitter-cpp.wasm`.
 *                In the extension, this is typically `path.join(context.extensionPath, 'dist')`.
 */
export async function initParser(wasmDir: string): Promise<void> {
  if (isReady) return;

  await Parser.init({
    locateFile: (scriptName: string) => {
      // web-tree-sitter looks for 'tree-sitter.wasm'
      if (scriptName === 'tree-sitter.wasm') {
        return path.join(wasmDir, 'tree-sitter.wasm');
      }
      return scriptName;
    },
  });

  parser = new Parser();
  
  // Load the C++ grammar
  const cppLanguage = await Parser.Language.load(
    path.join(wasmDir, 'tree-sitter-cpp.wasm')
  );
  
  if (parser) {
    parser.setLanguage(cppLanguage);
  }
  isReady = true;
}

import type { Edit } from 'web-tree-sitter';

/**
 * Manages the lifecycle of a parsed AST for a single document.
 * Safely handles memory disposal and incremental parsing.
 */
export class DocumentAST {
  private tree: Tree | null = null;

  /**
   * Parses the source code, incrementally if a previous tree exists.
   */
  public parse(source: string): Tree | null {
    if (!isReady || !parser) return null;

    // Force a fresh parse to prevent line-number desync on document edits.
    // Incremental parsing requires complex VSCode->TreeSitter Edit mapping
    // which is unnecessary for small files since a fresh parse takes <5ms.
    const newTree = parser.parse(source);
    
    // Safely dispose the old tree to prevent memory leaks in WASM
    if (this.tree) {
      this.tree.delete();
    }
    
    this.tree = newTree;
    return this.tree;
  }

  /**
   * Prepares the existing tree for an incremental parse by applying text edits.
   * This must be called before `parse()` when the document changes.
   */
  public edit(editObj: Edit): void {
    if (this.tree) {
      this.tree.edit(editObj);
    }
  }

  /**
   * Returns the current tree without re-parsing.
   */
  public getTree(): Tree | null {
    return this.tree;
  }

  /**
   * Safely disposes the tree memory. Must be called when the document is closed.
   */
  public dispose(): void {
    if (this.tree) {
      this.tree.delete();
      this.tree = null;
    }
  }
}

/**
 * Convenience function for one-off parsing where the tree will be discarded immediately.
 * WARNING: The caller MUST call `tree.delete()` to avoid memory leaks.
 */
export function parseOneOff(source: string): Tree | null {
  if (!isReady || !parser) return null;
  return parser.parse(source);
}

/**
 * Checks if the parser has been initialized.
 */
export function isParserReady(): boolean {
  return isReady;
}
