/**
 * Mock implementation of the VS Code API for unit testing.
 *
 * This module is aliased as 'vscode' by vitest.config.ts, so any source file
 * that does `import * as vscode from 'vscode'` will receive this mock
 * during test execution.
 *
 * The mock tracks state (created channels, logged lines) so tests can
 * inspect what the source code did without touching real VS Code APIs.
 */

// --- Mock types ---

export interface MockOutputChannel {
  name: string;
  lines: string[];
  shown: boolean;
  disposed: boolean;
  appendLine(value: string): void;
  show(preserveFocus?: boolean): void;
  dispose(): void;
}

// --- Tracked state ---

/** All output channels created during the current test. */
export const mockChannels: MockOutputChannel[] = [];

/** Reset all mock state. Call this in `beforeEach`. */
export function resetMocks(): void {
  mockChannels.length = 0;
  configValues.clear();
}

// --- Configuration mock ---

const configValues = new Map<string, unknown>();

/**
 * Set a mock configuration value.
 * Call this in tests to simulate user-configured settings.
 *
 * @example
 * setMockConfig('enable', false);
 * const settings = getSettings(); // settings.enable === false
 */
export function setMockConfig(key: string, value: unknown): void {
  configValues.set(key, value);
}

// --- VS Code API surface ---

export const window = {
  createOutputChannel(name: string): MockOutputChannel {
    const channel: MockOutputChannel = {
      name,
      lines: [],
      shown: false,
      disposed: false,
      appendLine(value: string) {
        this.lines.push(value);
      },
      show(_preserveFocus?: boolean) {
        this.shown = true;
      },
      dispose() {
        this.disposed = true;
      },
    };
    mockChannels.push(channel);
    return channel;
  },
};

export const workspace = {
  getConfiguration(_section?: string) {
    return {
      get<T>(_key: string, defaultValue: T): T {
        const val = configValues.get(_key);
        return val !== undefined ? (val as T) : defaultValue;
      },
    };
  },
  onDidChangeConfiguration(_listener: (...args: unknown[]) => void) {
    return { dispose() {} };
  },
};

export const commands = {
  registerCommand(_command: string, _callback: (...args: unknown[]) => unknown) {
    return { dispose() {} };
  },
};
