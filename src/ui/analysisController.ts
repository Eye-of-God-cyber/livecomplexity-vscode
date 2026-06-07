import * as vscode from 'vscode';
import { initParser, isParserReady } from '../parser/treeSitter';
import { analyzeFunctions } from '../engine/inference';
import { getSettings } from '../config/settings';
import { Logger } from '../utils/logger';
import { AnalysisCache } from './analysisCache';
import { DecorationProvider } from './decorationProvider';

/**
 * Orchestrates the full live-analysis pipeline:
 *   document change → debounce → parse (incremental) → infer → decorate
 *
 * Responsibilities:
 *  - Debouncing: one timer per document
 *  - Cancellation: a new edit cancels the in-flight analysis for that document
 *  - File-size guard: skip files above maxFileSizeKB
 *  - Error handling: failures clear decorations, log the error, never crash
 */
export class AnalysisController implements vscode.Disposable {
  /** One debounce timer per document URI. */
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  /** One cancellation token source per document URI. */
  private readonly cancellation = new Map<string, vscode.CancellationTokenSource>();

  private readonly subscriptions: vscode.Disposable[] = [];
  private parserInitialised = false;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly cache: AnalysisCache,
    private readonly decorations: DecorationProvider,
    private readonly logger: Logger,
  ) {}

  /**
   * Registers all VS Code event listeners and kicks off analysis for the
   * currently active editor (if any).
   */
  activate(): void {
    // Immediately analyse any already-open C++ editor
    if (vscode.window.activeTextEditor) {
      this.scheduleAnalysis(vscode.window.activeTextEditor.document);
    }

    this.subscriptions.push(
      // New document opened / editor switched
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor) this.scheduleAnalysis(editor.document);
      }),

      // Keystroke / paste / undo
      vscode.workspace.onDidChangeTextDocument((e) => {
        this.scheduleAnalysis(e.document);
      }),

      // Save — analyse immediately (skip debounce)
      vscode.workspace.onDidSaveTextDocument((doc) => {
        this.scheduleAnalysis(doc, 0);
      }),

      // Document closed — clean up
      vscode.workspace.onDidCloseTextDocument((doc) => {
        this.evict(doc.uri);
      }),

      // Settings changed — re-analyse active editor
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (
          e.affectsConfiguration('liveComplexity') &&
          vscode.window.activeTextEditor
        ) {
          this.scheduleAnalysis(vscode.window.activeTextEditor.document, 0);
        }
      }),
    );
  }

  /**
   * Schedules analysis for the given document after the configured debounce
   * delay. Cancels any pending schedule for the same document.
   *
   * @param doc The document to analyse.
   * @param overrideMs If provided, uses this delay instead of settings.debounceMs.
   */
  scheduleAnalysis(doc: vscode.TextDocument, overrideMs?: number): void {
    if (!this.isCppDocument(doc)) return;

    const settings = getSettings();
    if (!settings.enable) return;

    const key = doc.uri.toString();
    const delayMs = overrideMs !== undefined ? overrideMs : settings.debounceMs;

    // Clear existing debounce timer
    const existing = this.timers.get(key);
    if (existing !== undefined) clearTimeout(existing);

    // Cancel any in-flight analysis
    this.cancelInFlight(key);

    const cts = new vscode.CancellationTokenSource();
    this.cancellation.set(key, cts);

    const timer = setTimeout(() => {
      this.timers.delete(key);
      void this.runAnalysis(doc, cts.token);
    }, delayMs);

    this.timers.set(key, timer);
  }

  // ----------------------------------------------------------------- private

  private async runAnalysis(
    doc: vscode.TextDocument,
    token: vscode.CancellationToken,
  ): Promise<void> {
    if (token.isCancellationRequested) return;

    const settings = getSettings();
    const fileSizeKB = Buffer.byteLength(doc.getText(), 'utf8') / 1024;
    if (fileSizeKB > settings.maxFileSizeKB) {
      this.logger.log(
        `Skipping analysis: file size ${fileSizeKB.toFixed(1)} KB exceeds limit of ${settings.maxFileSizeKB} KB`,
      );
      return;
    }

    // Initialise the parser once (lazily, inside the extension host)
    if (!this.parserInitialised) {
      try {
        const wasmDir = this.context.asAbsolutePath('dist');
        await initParser(wasmDir);
        this.parserInitialised = isParserReady();
      } catch (err) {
        this.logger.log(`Parser init failed: ${String(err)}`);
        return;
      }
    }

    if (token.isCancellationRequested) return;

    const entry = this.cache.getOrCreate(doc.uri);

    try {
      const source = doc.getText();
      const start = Date.now();

      const tree = entry.ast.parse(source);
      if (!tree) {
        this.logger.log(`Parse returned null for ${doc.uri.fsPath}`);
        this.cache.clearResult(doc.uri);
        this.decorations.clearForUri(doc.uri);
        return;
      }

      if (token.isCancellationRequested) return;

      const result = analyzeFunctions(tree);
      const elapsed = Date.now() - start;
      this.logger.log(
        `Analysed ${doc.uri.fsPath} — ${result.functions.length} functions in ${elapsed}ms`,
      );

      if (token.isCancellationRequested) return;

      this.cache.setResult(doc.uri, result);

      // Apply decorations to every visible editor showing this document
      if (settings.showInlineAnnotations) {
        for (const editor of vscode.window.visibleTextEditors) {
          if (editor.document.uri.toString() === doc.uri.toString()) {
            this.decorations.apply(editor, result);
          }
        }
      }
    } catch (err) {
      this.logger.log(`Analysis error for ${doc.uri.fsPath}: ${String(err)}`);
      this.cache.clearResult(doc.uri);
      this.decorations.clearForUri(doc.uri);
    }
  }

  private cancelInFlight(key: string): void {
    const cts = this.cancellation.get(key);
    if (cts) {
      cts.cancel();
      cts.dispose();
      this.cancellation.delete(key);
    }
  }

  private evict(uri: vscode.Uri): void {
    const key = uri.toString();
    const timer = this.timers.get(key);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
    this.cancelInFlight(key);
    this.decorations.clearForUri(uri);
    this.cache.evict(uri);
  }

  private isCppDocument(doc: vscode.TextDocument): boolean {
    return doc.languageId === 'cpp' || doc.languageId === 'c';
  }

  dispose(): void {
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();

    for (const cts of this.cancellation.values()) {
      cts.cancel();
      cts.dispose();
    }
    this.cancellation.clear();

    for (const d of this.subscriptions) d.dispose();
  }
}
