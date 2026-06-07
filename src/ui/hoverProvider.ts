import * as vscode from 'vscode';
import { AnalysisCache } from './analysisCache';

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
    const fn = this.cache.getFunctionAt(document.uri, position.line);
    if (!fn) return null;

    // Suppress Unknown or low-confidence hovers
    if (fn.complexity === 'Unknown' || fn.confidence === 'low') return null;

    const md = new vscode.MarkdownString('', true);
    md.isTrusted = true;

    // Header
    md.appendMarkdown(`### LiveComplexity\n\n`);

    // Complexity + confidence on one line
    const confidenceLabel = fn.confidence.charAt(0).toUpperCase() + fn.confidence.slice(1);
    md.appendMarkdown(`**Complexity:** \`${fn.complexity}\`\n\n`);
    md.appendMarkdown(`**Confidence:** ${confidenceLabel}\n\n`);

    // Explanation bullets
    md.appendMarkdown(`**Explanation:**\n\n`);
    for (const line of fn.explanation) {
      md.appendMarkdown(`- ${line}\n`);
    }

    // Range covers the whole function body so the hover is accessible anywhere inside
    const range = new vscode.Range(fn.startLine, 0, fn.endLine, 0);
    return new vscode.Hover(md, range);
  }
}
