# LiveComplexityIDE — VS Code Extension Verification Report

Every issue reported in the previous product audit has been independently verified directly from the source code. **No speculative issues were found; all of them are real, verifiable bugs.**

---

### 1. Unknown Suppression
* **Is it real?** Yes.
* **Exact file(s)**: `src/ui/decorationProvider.ts`, `src/ui/hoverProvider.ts`
* **Exact function(s)**: `DecorationProvider.apply`, `HoverProvider.provideHover`
* **Exact line(s)**: `decorationProvider.ts:36`, `hoverProvider.ts:23`
* **Root cause**: Explicit logic `if (fn.complexity === 'Unknown')` forces an early return/continue, completely skipping rendering.
* **Reproduction steps**: Create a loop with an unresolvable bound (e.g. `M_INDIR`). The engine yields `Unknown`. Neither hover nor inline decoration appears.
* **Minimal fix scope**: Remove the `fn.complexity === 'Unknown'` check to allow the literal string `"Unknown"` to render in the UI.
* **Regression risk**: Very Low.
* **Estimated LOC**: 2 lines modified.

### 2. Ghost Hover / Stale Line Mapping
* **Is it real?** Yes.
* **Exact file(s)**: `src/ui/analysisCache.ts`
* **Exact function(s)**: `AnalysisCache.getFunctionAt`
* **Exact line(s)**: 63-65
* **Root cause**: `HoverProvider` queries the cache using the live `position.line`. The cache relies on `startLine` and `endLine` captured from the *previous* AST. If the user edits the file (shifting lines down), the UI and cache desync during the 300ms debounce window.
* **Reproduction steps**: Wait for a file to be analyzed. Press `Enter` rapidly above a function to push it down 10 lines. Hover over the empty space where the function used to be. A "ghost hover" appears containing the stale complexity.
* **Minimal fix scope**: Add `version: number` to `CacheEntry`. In `AnalysisController.runAnalysis`, save `doc.version` into the cache. In `HoverProvider`, if `document.version !== cacheEntry.version`, return `null` to temporarily suppress the hover until the new analysis completes.
* **Regression risk**: Low.
* **Estimated LOC**: ~5 lines.

### 3. Duplicate Analysis on Tab Switching
* **Is it real?** Yes.
* **Exact file(s)**: `src/ui/analysisController.ts`
* **Exact function(s)**: `AnalysisController.activate`, `AnalysisController.scheduleAnalysis`
* **Exact line(s)**: 46-49
* **Root cause**: `onDidChangeActiveTextEditor` calls `scheduleAnalysis` unconditionally without checking if the document has actually changed since its last analysis.
* **Reproduction steps**: Open `A.cpp` (wait for analysis). Open `B.cpp`. Switch back to `A.cpp`. The extension entirely reparses and re-analyzes `A.cpp` from scratch, wasting CPU.
* **Minimal fix scope**: Compare `doc.version` with the cached `entry.version` inside `runAnalysis` (or `scheduleAnalysis`). If they match, skip the parse and inference entirely and just re-apply decorations.
* **Regression risk**: Low.
* **Estimated LOC**: ~5 lines.

### 4. Synchronous Extension Host Blocking
* **Is it real?** Yes.
* **Exact file(s)**: `src/ui/analysisController.ts`, `src/engine/inference.ts`
* **Exact function(s)**: `AnalysisController.runAnalysis`
* **Exact line(s)**: `analysisController.ts:149,159`
* **Root cause**: `tree.parse()` and `analyzeFunctions()` run sequentially and synchronously. The `CancellationToken` checks between them do not yield the thread. If a file is large, the Extension Host completely stalls until both complete.
* **Reproduction steps**: Create a 490KB C++ file with thousands of nested functions. Type a character. Wait 300ms (debounce ends). The VS Code UI/Extension Host will jitter or freeze for tens to hundreds of milliseconds.
* **Minimal fix scope**: A proper fix requires passing the `CancellationToken` deep into `analyzeFunctions` and adding `await new Promise(r => setImmediate(r))` to yield the event loop during heavy AST traversals. For a Pre-MVP, lowering `maxFileSizeKB` from 500 to 100 mitigates the worst-case stall.
* **Regression risk**: Medium (if adding async/yield to the engine) or Zero (if just lowering max filesize).
* **Estimated LOC**: 1 line (config) or ~15 lines (async engine modification).

### 5. Missing onLanguage:c Activation
* **Is it real?** Yes.
* **Exact file(s)**: `package.json`
* **Exact function(s)**: N/A
* **Exact line(s)**: 38
* **Root cause**: `"onLanguage:c"` was omitted from `activationEvents`.
* **Reproduction steps**: Open VS Code directly into a `.c` file. The extension never boots.
* **Minimal fix scope**: Add `"onLanguage:c"` to the `activationEvents` array.
* **Regression risk**: Zero.
* **Estimated LOC**: 1 line.

### 6. Orphan Decorations on Max File Size
* **Is it real?** Yes.
* **Exact file(s)**: `src/ui/analysisController.ts`
* **Exact function(s)**: `AnalysisController.runAnalysis`
* **Exact line(s)**: 121-127
* **Root cause**: The early return protecting against large files does not clear existing UI state.
* **Reproduction steps**: Open a 490KB file. Allow decorations to render. Paste 20KB of code. The file exceeds the 500KB limit. The extension logs a warning and aborts, but the old decorations remain stuck on the screen forever.
* **Minimal fix scope**: Insert `this.cache.clearResult(doc.uri); this.decorations.clearForUri(doc.uri);` immediately before the `return` statement in the file size check.
* **Regression risk**: Zero.
* **Estimated LOC**: 2 lines.

### 7. Orphan Decorations After Settings Toggle
* **Is it real?** Yes.
* **Exact file(s)**: `src/ui/analysisController.ts`
* **Exact function(s)**: `AnalysisController.runAnalysis`
* **Exact line(s)**: 170-176
* **Root cause**: When `settings.showInlineAnnotations` is set to `false`, the loop simply skips applying the new decorations but fails to clear the existing ones.
* **Reproduction steps**: Open a file and view the decorations. Go to VS Code Settings and toggle "Show Inline Annotations" to false. The decorations stay on screen instead of disappearing.
* **Minimal fix scope**: Add an `else { this.decorations.clearForUri(doc.uri); }` block to the `if (settings.showInlineAnnotations)` statement.
* **Regression risk**: Zero.
* **Estimated LOC**: 3 lines.

### 8. (Unreported but verified) Hover Provider Ignores Settings
* **Is it real?** Yes.
* **Exact file(s)**: `src/ui/hoverProvider.ts`
* **Exact function(s)**: `HoverProvider.provideHover`
* **Exact line(s)**: 15-46
* **Root cause**: `HoverProvider` never fetches or checks `settings.showHover`.
* **Reproduction steps**: Toggle "Show Hover" to false in VS Code Settings. Hover over a function. The hover still renders.
* **Minimal fix scope**: Import `getSettings`, and add `if (!getSettings().showHover) return null;` at the beginning of `provideHover`.
* **Regression risk**: Zero.
* **Estimated LOC**: 2 lines.

---

### Conclusion
Every claim from the previous audit is 100% accurate and verifiable via direct source code inspection. The VS Code extension implementation has structural flaws regarding state clearing and asynchronous execution. The minimal fix scopes outlined above address the problems cleanly without requiring architecture redesigns.
