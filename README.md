# LiveComplexity for VS Code

![Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/livecomplexity.livecomplexity)
![Installs](https://img.shields.io/visual-studio-marketplace/i/livecomplexity.livecomplexity)
![License](https://img.shields.io/github/license/livecomplexity/livecomplexity-vscode)

LiveComplexity brings real-time algorithm complexity analysis directly into your editor. As you write C or C++ code, the extension instantly infers the Big-O time complexity of your functions and displays it inline.

## Features

- **Real-Time Analysis**: Instantly infers Big-O time complexity as you type.
- **Inline Annotations**: Displays complexity classifications (e.g., `O(n)`, `O(n log n)`) directly at the end of function signatures and loops.
- **Detailed Breakdowns**: Hover over analyzed functions to see a mathematical explanation of the loop hierarchy and confidence score.
- **Resilient Parsing**: Powered by Tree-Sitter, the engine gracefully handles syntax errors as you type without crashing.
- **Function-Level Scoping**: Correctly segregates loops by function and lambda scope.

## Demo

![LiveComplexity Demo](assets/demo.gif)

*Watch how the complexity decoration dynamically updates from O(n) to O(n²) as nested loops are constructed.*

## Screenshots

![Inline Annotations](assets/screenshot-inline.png)
*Inline annotations summarizing function complexity.*

![Hover Breakdowns](assets/screenshot-hover.png)
*Detailed hover breakdowns showing loop hierarchy and confidence scores.*

## Installation

1. Open VS Code.
2. Go to the Extensions view (`Ctrl+Shift+X` or `Cmd+Shift+X`).
3. Search for "LiveComplexity".
4. Click **Install**.

Alternatively, install via the CLI:
```bash
code --install-extension livecomplexity.livecomplexity
```

## Usage

LiveComplexity automatically activates when you open a `.cpp` or `.c` file. 

As you type, the engine evaluates your code (debounced by 300ms by default). Look for the `O(...)` annotations appearing at the end of your function and loop declarations. Hover your mouse over the function signature or the annotation itself to see a detailed explanation of the complexity derivation.

## Settings

You can customize LiveComplexity via VS Code Settings (`Ctrl+,` or `Cmd+,`).

| Setting | Default | Description |
|---|---|---|
| `liveComplexity.enable` | `true` | Enable or disable analysis globally across the workspace. |
| `liveComplexity.debounceMs` | `300` | Delay (ms) before analysis runs after you stop typing. |
| `liveComplexity.showInlineAnnotations` | `true` | Display Big-O annotations inline. |
| `liveComplexity.showHover` | `true` | Show mathematical breakdowns on hover. |
| `liveComplexity.maxFileSizeKB` | `500` | Safety limit: Skip AST analysis for files larger than this size. |

## Known Limitations

Static AST analysis without full semantic type resolution has some inherent limitations:
- **STL Iterators**: Iterators (e.g., `it++`) are structurally identical to primitive counters (`i++`) and are classified as linear `O(n)`, regardless of the container type.
- **Missing Conditions**: Loops without explicit exit conditions in the header (e.g., `for(;;)` or `while(true)`) are marked as `Unknown`, even if they `break` internally.
- **Recursive Functions**: Currently, only loop-based complexity is analyzed. Recursive function complexity is not yet supported.

## Roadmap

- Support for Python and Java.
- Memory/Space complexity analysis.
- Detection of recursive pattern complexity.

## Contributing

We welcome contributions! Please visit our [GitHub repository](https://github.com/livecomplexity/livecomplexity-vscode) to report issues, suggest features, or submit pull requests.
