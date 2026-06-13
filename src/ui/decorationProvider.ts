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


      const line = fn.startLine;
      const lineLength = editor.document.lineAt(line).text.length;
      const range = new vscode.Range(line, lineLength, line, lineLength);

      const confidenceBadge = fn.confidence === 'medium' ? ' ~' : '';
      const label = `  ${fn.complexity}${confidenceBadge}`;

      const color = this.getComplexityColor(fn.complexity);

      decorations.push({
        range,
        renderOptions: {
          after: { 
            contentText: label,
            color: color
          },
        },
      });
    }

    editor.setDecorations(this.decorationType, decorations);
  }

  private getComplexityColor(complexity: string): string {
    if (complexity === 'Unknown') return '#F85149';
    if (complexity === 'O(1)') return '#9CA3AF';
    if (complexity.includes('log n') && !complexity.includes('n log') && !complexity.includes('^')) return '#00D9FF';
    if (complexity === 'O(n)' || (complexity.includes('O(n)') && !complexity.includes('log') && !complexity.includes('^'))) return '#4CAF50';
    if (complexity.includes('n log n') && !complexity.includes('^')) return '#3B82F6';
    if (complexity.includes('^2') || complexity.includes('²')) return '#FFB020';
    if (complexity.includes('^3') || complexity.includes('³') || complexity.match(/\^[4-9]/) || complexity.match(/[⁴-⁹]/)) return '#FB923C';
    if (complexity.includes('^') || complexity.includes('2^')) return '#FB923C';
    return '#4CAF50'; // Default to green for variables like O(V+E)
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
