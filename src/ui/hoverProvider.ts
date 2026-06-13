import * as vscode from 'vscode';
import { AnalysisCache } from './analysisCache';
import { getSettings } from '../config/settings';

/**
 * Provides complexity explanation hovers on function definitions.
 *
 * Rendering rules:
 *  - Only shown when the cursor is within a function's source range
 *  - Shows complexity, confidence, and the explanation bullet list
 *  - Never shown for Unknown or low-confidence results
 */
export class HoverProvider implements vscode.HoverProvider {
  constructor(private readonly cache: AnalysisCache) {}

  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.Hover | null {
    const fn = this.cache.getFunctionAt(document.uri, position.line, document.version);
    if (!fn) return null;

    if (!getSettings().showHover) return null;

    const md = new vscode.MarkdownString('', true);
    md.isTrusted = true;
    md.supportHtml = true;

    // Header
    md.appendMarkdown(`### <span style="color:#00D9FF;">LiveComplexity</span>\n\n`);
    md.appendMarkdown(`---\n\n`);

    // Semantic Colors
    const complexityColor = this.getComplexityColor(fn.complexity);
    const confidenceColor = fn.confidence === 'high' ? '#4CAF50' : (fn.confidence === 'medium' ? '#FFB020' : '#F85149');
    const confidenceLabel = fn.confidence.charAt(0).toUpperCase() + fn.confidence.slice(1);

    md.appendMarkdown(`**Complexity:** <span style="color:${complexityColor};">${fn.complexity}</span>\n\n`);
    md.appendMarkdown(`**Confidence:** <span style="color:${confidenceColor};">${confidenceLabel}</span>\n\n`);

    // Explanation bullets
    md.appendMarkdown(`**Trace:**\n\n`);
    for (const line of fn.explanation) {
      md.appendMarkdown(`<span style="color:#9CA3AF;">${line}</span>\n\n`);
    }

    // Range covers the whole function body so the hover is accessible anywhere inside
    const range = new vscode.Range(fn.startLine, 0, fn.endLine, 0);
    return new vscode.Hover(md, range);
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
    return '#4CAF50';
  }
}
