import * as vscode from 'vscode';
import { createLogger, Logger } from './utils/logger';
import { getSettings } from './config/settings';

let logger: Logger;

export function activate(context: vscode.ExtensionContext): void {
  logger = createLogger('LiveComplexity');

  const version = context.extension.packageJSON.version as string;
  logger.log(`LiveComplexity v${version} activated`);

  const settings = getSettings();
  if (!settings.enable) {
    logger.log('Extension is disabled via settings');
  }

  // Command: show the output channel for debugging
  const showOutputCmd = vscode.commands.registerCommand('livecomplexity.showOutput', () => {
    logger.show();
  });

  // React to configuration changes
  const configListener = vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration('liveComplexity')) {
      const updated = getSettings();
      logger.log(
        `Settings changed — enable: ${updated.enable}, debounceMs: ${updated.debounceMs}`,
      );
    }
  });

  context.subscriptions.push(showOutputCmd, configListener, { dispose: () => logger.dispose() });
}

export function deactivate(): void {
  // All disposables registered via context.subscriptions are cleaned up by VS Code.
}
