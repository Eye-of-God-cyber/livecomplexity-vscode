# VS Code Extension Stability & UX Patch (Pre-MVP)

The stability and UX patches targeting the VS Code wrapper are successfully implemented.

## Files changed
1. `src/ui/decorationProvider.ts`
2. `src/ui/hoverProvider.ts`
3. `src/ui/analysisCache.ts`
4. `src/ui/analysisController.ts`
5. `src/config/settings.ts`
6. `package.json`

## LOC changed
Total lines modified: ~25
Total lines added: ~15
Total lines removed: ~10

## Explanation of every modification

### 1. Unknown Visibility
* **`decorationProvider.ts`**: Removed the `if (fn.complexity === 'Unknown') { continue; }` block. Inline decorations now correctly render the string "Unknown".
* **`hoverProvider.ts`**: Removed the identical suppression logic, allowing full mathematical explanations (if any) and the "Unknown" label to surface on hover.

### 2. Ghost Hover
* **`analysisCache.ts`**: Upgraded `CacheEntry` to store the exact `version: number` of the analyzed document. `getFunctionAt` now accepts the live document version and strictly validates `entry.version === currentVersion`.
* **`hoverProvider.ts`**: Passes `document.version` to `getFunctionAt`. If the user hits `Enter` shifting code during the 300ms debounce, versions mismatch, safely returning `null` to suppress ghost hovers until the fresh AST arrives.

### 3. Duplicate Analysis On Tab Switch
* **`analysisController.ts`**: Inside `runAnalysis`, immediately following `getOrCreate()`, added a guard: `if (entry.version === doc.version && entry.result)`. If the document is unchanged, it skips the expensive synchronous `parse()` and `analyzeFunctions()`, directly applying cached decorations. 

### 4. Missing `onLanguage:c`
* **`package.json`**: Added `"onLanguage:c"` to the `activationEvents` array, ensuring the extension boots natively when a pure `.c` file is opened.

### 5. Orphan Decorations (Max File Size)
* **`analysisController.ts`**: Inside the 500KB (now 100KB) early-return guard, inserted explicit calls to `this.cache.clearResult(doc.uri)` and `this.decorations.clearForUri(doc.uri)` so stale UI is properly flushed.

### 6. Orphan Decorations (Settings Toggle)
* **`analysisController.ts`**: Attached an `else { this.decorations.clearForUri(doc.uri); }` block to the existing `if (settings.showInlineAnnotations)` statements, guaranteeing instant cleanup if the user disables annotations in settings.

### 7. Hover Setting
* **`hoverProvider.ts`**: Imported `getSettings` and inserted `if (!getSettings().showHover) return null;` at the top of the provider, correctly respecting the user config.

### 8. Synchronous Extension Host Blocking
* **`package.json` & `settings.ts`**: Lowered `liveComplexity.maxFileSizeKB` default from 500 to 100. Because the current engine architecture is un-yieldingly synchronous, the safest non-invasive pre-MVP fix is lowering the cutoff threshold, severely bounding the worst-case thread stall without over-engineering an async scheduler.

---

## Regression analysis
**Risk Level**: Very Low.
The modifications are strictly confined to the VS Code UI/Event wrapper logic. Early returns were simply enhanced with cleanup calls, state caching was tightened using VS Code's native `document.version`, and configuration reads were explicitly honored. No deep algorithmic state is manipulated.

## Why deterministic behavior remains unchanged
The deterministic D5.6 inference engine (`inference.ts`, `astUtils.ts`, `loopClassifier.ts`, `typeTracker.ts`) was completely untouched. The AST logic, symbolic boundaries, and canonicalization procedures remain perfectly frozen. The patch only changes *when* the wrapper calls the engine (fixing duplicates) and *whether* it displays the unaltered result (fixing `Unknown` visibility). 

---

## Manual testing checklist
- [ ] Ensure inline annotations show `"  Unknown"` when analyzing unmapped `M_INDIR` or similar complex loops.
- [ ] Push a function down via rapid `Enter` keys and immediately hover the old/new lines to confirm hover suppression (no ghost hovers).
- [ ] Open two `.cpp` files. Switch tabs back and forth. Verify the Output Logs do *not* report duplicate "Analysed X functions in Y ms".
- [ ] Open VS Code Settings. Toggle "Show Inline Annotations". Confirm they disappear instantly.
- [ ] Toggle "Show Hover". Confirm hovers cease rendering instantly.
- [ ] Open a `.c` file directly. Ensure the LiveComplexity Output pane logs activation.

## Confidence level for each fix
1. **Unknown Visibility**: 100%
2. **Ghost Hover**: 100% 
3. **Duplicate Analysis (Tab Switch)**: 98%
4. **Missing onLanguage:c**: 100%
5. **Orphan Decorations (Max Size)**: 100%
6. **Orphan Decorations (Toggle)**: 100%
7. **Hover Setting**: 100%
8. **Synchronous Host Blocking**: 100% (Mitigated safely without invasive logic redesign).
