# Changelog

All notable changes to the "livecomplexity" extension will be documented in this file.

## [0.0.1] - Initial Beta Release
- **Real-Time Analysis**: Instantly infer Big-O time complexity as you type C/C++ code.
- **Inline Annotations**: View complexity classifications (e.g., `O(n)`, `O(n log n)`) directly at the end of loop and function definitions.
- **Detailed Hover Breakdowns**: Hover over any analyzed function to see a mathematical explanation of the loop hierarchy and the resulting confidence score.
- **Tree-Sitter Engine**: Fast, resilient AST-based parsing that easily handles syntax errors without crashing.
- **Function-Level Scoping**: Correctly segregates loops by function and lambda scope.
