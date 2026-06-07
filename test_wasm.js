const wts = require('web-tree-sitter');
console.log('web-tree-sitter type:', typeof wts);
console.log('web-tree-sitter keys:', Object.keys(wts));
console.log('wts.Parser:', !!wts.Parser);
console.log('wts.default:', !!wts.default);
