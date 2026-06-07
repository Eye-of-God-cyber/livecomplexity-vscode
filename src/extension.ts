import * as vscode from 'vscode';
import { createLogger } from './utils/logger';
import { AnalysisCache } from './ui/analysisCache';
import { DecorationProvider } from './ui/decorationProvider';
import { HoverProvider } from './ui/hoverProvider';
import { AnalysisController } from './ui/analysisController';

export function activate(context: vscode.ExtensionContext): void {
  const logger = createLogger('LiveComplexity');
  const version = context.extension.packageJSON.version as string;
  logger.log(`LiveComplexity v${version} activating…`);

  // ---------------------------------------------------------------- services
  const cache = new AnalysisCache();
  const decorations = new DecorationProvider();
  const controller = new AnalysisController(context, cache, decorations, logger);

  // ---------------------------------------------------------------- commands
  const showOutputCmd = vscode.commands.registerCommand(
    'livecomplexity.showOutput',
    () => logger.show(),
  );

  // ---------------------------------------------------------------- providers
  const hoverDisposable = vscode.languages.registerHoverProvider(
    [{ language: 'cpp' }, { language: 'c' }],
    new HoverProvider(cache),
  );

  // ---------------------------------------------------------------- start
  controller.activate();

  // ---------------------------------------------------------------- cleanup
  context.subscriptions.push(
    showOutputCmd,
    hoverDisposable,
    controller,
    decorations,
    cache,
    { dispose: () => logger.dispose() },
  );

  logger.log('LiveComplexity activated.');
}

export function deactivate(): void {
  // All disposables registered via context.subscriptions are cleaned up by VS Code.
}
