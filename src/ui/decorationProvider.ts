import * as vscode from 'vscode';
import { DocumentComplexityResult } from '../engine/complexityNode';

/**
 * Manages the single TextEditorDecorationType used to render complexity
 * annotations at the end of function signature lines.
 *
 * Rendering rules:
 *  - Skip functions with complexity "Unknown"
 *  - Skip functions with confidence "low"
 *  - Render only on the function's opening line (startLine)
 */
export class DecorationProvider implements vscode.Disposable {
  private readonly decorationType: vscode.TextEditorDecorationType;

  constructor() {
    this.decorationType = vscode.window.createTextEditorDecorationType({
      after: {
        margin: '0 0 0 2em',
        fontStyle: 'normal',
        color: new vscode.ThemeColor('editorCodeLens.foreground'),
      },
      isWholeLine: false,
    });
  }

  /**
   * Applies complexity decorations to the given editor.
   * Clears all existing decorations first.
   */
  apply(editor: vscode.TextEditor, result: DocumentComplexityResult): void {
    const decorations: vscode.DecorationOptions[] = [];

    for (const fn of result.functions) {
      // Suppress Unknown complexity or low-confidence results
      if (fn.complexity === 'Unknown' || fn.confidence === 'low') {
        continue;
      }

      const line = fn.startLine;
      const lineLength = editor.document.lineAt(line).text.length;
      const range = new vscode.Range(line, lineLength, line, lineLength);

      const confidenceBadge = fn.confidence === 'medium' ? ' ~' : '';
      const label = `  ${fn.complexity}${confidenceBadge}`;

      decorations.push({
        range,
        renderOptions: {
          after: { contentText: label },
        },
      });
    }

    editor.setDecorations(this.decorationType, decorations);
  }

  /**
   * Clears all decorations from the given editor.
   * Called when analysis fails or file closes.
   */
  clear(editor: vscode.TextEditor): void {
    editor.setDecorations(this.decorationType, []);
  }

  /**
   * Clears decorations from all visible editors showing the given URI.
   */
  clearForUri(uri: vscode.Uri): void {
    for (const editor of vscode.window.visibleTextEditors) {
      if (editor.document.uri.toString() === uri.toString()) {
        this.clear(editor);
      }
    }
  }

  dispose(): void {
    this.decorationType.dispose();
  }
}
