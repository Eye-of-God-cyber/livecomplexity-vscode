import * as vscode from 'vscode';

export interface LiveComplexitySettings {
  enable: boolean;
  debounceMs: number;
  showInlineAnnotations: boolean;
  showHover: boolean;
  maxFileSizeKB: number;
}

/**
 * Reads the current LiveComplexity settings from VS Code configuration.
 * Each field falls back to its package.json default if unset.
 */
export function getSettings(): LiveComplexitySettings {
  const config = vscode.workspace.getConfiguration('liveComplexity');

  return {
    enable: config.get<boolean>('enable', true),
    debounceMs: config.get<number>('debounceMs', 300),
    showInlineAnnotations: config.get<boolean>('showInlineAnnotations', true),
    showHover: config.get<boolean>('showHover', true),
    maxFileSizeKB: config.get<number>('maxFileSizeKB', 100),
  };
}
