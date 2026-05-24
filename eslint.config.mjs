import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'test/fixtures/**', '*.config.*', '*.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Architectural boundary: parser/ and pipeline/ must never import vscode.
    // This ensures these modules remain portable for future extraction
    // into a standalone @livecomplexity/engine package.
    files: ['src/parser/**/*.ts', 'src/pipeline/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'vscode',
              message:
                'Files in parser/ and pipeline/ must not import vscode to ensure portability.',
            },
          ],
        },
      ],
    },
  },
);
