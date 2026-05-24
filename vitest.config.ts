import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    include: ['test/unit/**/*.test.ts'],
  },
  resolve: {
    alias: {
      // Redirect 'vscode' imports to our mock during testing.
      // This lets src/ code `import * as vscode from 'vscode'`
      // and receive the mock without any source code changes.
      vscode: path.resolve(__dirname, 'test/mocks/vscode.ts'),
    },
  },
});
