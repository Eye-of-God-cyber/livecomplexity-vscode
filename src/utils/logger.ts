import * as vscode from 'vscode';

/**
 * Logger wraps a VS Code OutputChannel with timestamped, leveled messages.
 *
 * Usage:
 *   const logger = createLogger('LiveComplexity');
 *   logger.log('Analysis complete');
 *   logger.warn('File too large, skipping');
 *   logger.error('Parse failed', err);
 */
export interface Logger {
  log(message: string): void;
  warn(message: string): void;
  error(message: string, err?: Error): void;
  show(): void;
  dispose(): void;
}

export function createLogger(name: string): Logger {
  const channel = vscode.window.createOutputChannel(name);

  function timestamp(): string {
    return new Date().toISOString();
  }

  return {
    log(message: string): void {
      channel.appendLine(`[INFO ${timestamp()}] ${message}`);
    },

    warn(message: string): void {
      channel.appendLine(`[WARN ${timestamp()}] ${message}`);
    },

    error(message: string, err?: Error): void {
      channel.appendLine(`[ERROR ${timestamp()}] ${message}`);
      if (err?.stack) {
        channel.appendLine(err.stack);
      }
    },

    show(): void {
      channel.show(true);
    },

    dispose(): void {
      channel.dispose();
    },
  };
}
