import * as vscode from 'vscode';
import { DocumentAST } from '../parser/treeSitter';
import { DocumentComplexityResult, FunctionComplexityResult } from '../engine/complexityNode';

/**
 * Per-document cache entry.
 * Owns the DocumentAST lifecycle and stores the latest analysis result.
 */
export interface CacheEntry {
  /** Manages the WASM tree lifecycle for this document. */
  ast: DocumentAST;
  /** Latest analysis result. Null until the first successful run. */
  result: DocumentComplexityResult | null;
  /** Document version of the analyzed result. Used to detect stale cache. */
  version: number;
}

/**
 * Central store for per-document analysis results.
 * One entry per open C++ document, keyed by URI string.
 * Responsible for DocumentAST creation and disposal.
 */
export class AnalysisCache implements vscode.Disposable {
  private readonly entries = new Map<string, CacheEntry>();

  /** Returns or creates a cache entry for the given document URI. */
  getOrCreate(uri: vscode.Uri): CacheEntry {
    const key = uri.toString();
    let entry = this.entries.get(key);
    if (!entry) {
      entry = { ast: new DocumentAST(), result: null, version: -1 };
      this.entries.set(key, entry);
    }
    return entry;
  }

  /** Returns the cached result for a URI, or null if absent. */
  getResult(uri: vscode.Uri): DocumentComplexityResult | null {
    return this.entries.get(uri.toString())?.result ?? null;
  }

  /** Stores an analysis result. */
  setResult(uri: vscode.Uri, result: DocumentComplexityResult, version: number): void {
    const entry = this.entries.get(uri.toString());
    if (entry) {
      entry.result = result;
      entry.version = version;
    }
  }

  /** Clears the result for a URI (used when analysis fails). */
  clearResult(uri: vscode.Uri): void {
    const entry = this.entries.get(uri.toString());
    if (entry) {
      entry.result = null;
    }
  }

  /**
   * Returns the FunctionComplexityResult whose source range contains the given line.
   * Used by the hover provider.
   */
  getFunctionAt(uri: vscode.Uri, line: number, currentVersion: number): FunctionComplexityResult | null {
    const entry = this.entries.get(uri.toString());
    if (!entry || !entry.result || entry.version !== currentVersion) return null;
    return entry.result.functions.find(
      (fn) => line >= fn.startLine && line <= fn.endLine
    ) ?? null;
  }

  /** Disposes the cache entry for a document (called on document close). */
  evict(uri: vscode.Uri): void {
    const key = uri.toString();
    const entry = this.entries.get(key);
    if (entry) {
      entry.ast.dispose();
      this.entries.delete(key);
    }
  }

  /** Disposes all entries. Called when the extension deactivates. */
  dispose(): void {
    for (const entry of this.entries.values()) {
      entry.ast.dispose();
    }
    this.entries.clear();
  }
}
