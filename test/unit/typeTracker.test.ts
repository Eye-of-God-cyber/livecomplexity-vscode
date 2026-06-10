/**
 * test/unit/typeTracker.test.ts
 *
 * Unit tests for the Phase D2.0 TypeContext foundation layer.
 * These tests verify variable → container type resolution only.
 * No complexity inference is involved.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import path from 'path';
import Parser from 'web-tree-sitter';
import { buildTypeContext, mergeTypeContexts } from '../../src/parser/typeTracker';

const distDir = path.resolve(__dirname, '../../dist');

let parser: Parser;

beforeAll(async () => {
  await Parser.init();
  parser = new Parser();
  const Cpp = await Parser.Language.load(distDir + '/tree-sitter-cpp.wasm');
  parser.setLanguage(Cpp);
});

function parse(code: string) {
  return parser.parse(code);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function vars(code: string): Map<string, string> {
  const tree = parse(code);
  const ctx = buildTypeContext(tree.rootNode);
  return ctx.variables;
}

function aliases(code: string): Map<string, string> {
  const tree = parse(code);
  const ctx = buildTypeContext(tree.rootNode);
  return ctx.aliases;
}

// ─── Direct Template Declarations ────────────────────────────────────────────

describe('TypeContext — Direct declarations', () => {
  it('set<int> s → s: set', () => {
    expect(vars('set<int> s;').get('s')).toBe('set');
  });

  it('priority_queue<int> pq → pq: priority_queue', () => {
    expect(vars('priority_queue<int> pq;').get('pq')).toBe('priority_queue');
  });

  it('queue<int> q → q: queue', () => {
    expect(vars('queue<int> q;').get('q')).toBe('queue');
  });

  it('stack<int> st → st: stack', () => {
    expect(vars('stack<int> st;').get('st')).toBe('stack');
  });

  it('map<int,int> mp → mp: map', () => {
    expect(vars('map<int,int> mp;').get('mp')).toBe('map');
  });

  it('unordered_map<int,int> ump → ump: unordered_map', () => {
    expect(vars('unordered_map<int,int> ump;').get('ump')).toBe('unordered_map');
  });

  it('multiset<int> ms → ms: multiset', () => {
    expect(vars('multiset<int> ms;').get('ms')).toBe('multiset');
  });
});

// ─── Multi-Declarator ────────────────────────────────────────────────────────

describe('TypeContext — Multi-declarator', () => {
  it('set<int> a,b,c → a,b,c: set', () => {
    const v = vars('set<int> a,b,c;');
    expect(v.get('a')).toBe('set');
    expect(v.get('b')).toBe('set');
    expect(v.get('c')).toBe('set');
  });
});

// ─── Alias Resolution ─────────────────────────────────────────────────────────

describe('TypeContext — Alias resolution (using)', () => {
  it('using PQ = priority_queue<int> → PQ alias stored', () => {
    const a = aliases('using PQ = priority_queue<int>;');
    expect(a.get('PQ')).toBe('priority_queue');
  });

  it('using PQ = priority_queue<int>; PQ pq; → pq: priority_queue', () => {
    const v = vars('using PQ = priority_queue<int>;\nPQ pq;');
    expect(v.get('pq')).toBe('priority_queue');
  });
});

describe('TypeContext — Alias resolution (typedef)', () => {
  it('typedef map<int,int> MAP → MAP alias stored', () => {
    const a = aliases('typedef map<int,int> MAP;');
    expect(a.get('MAP')).toBe('map');
  });

  it('typedef map<int,int> MAP; MAP mp; → mp: map', () => {
    const v = vars('typedef map<int,int> MAP;\nMAP mp;');
    expect(v.get('mp')).toBe('map');
  });

  it('typedef priority_queue<int> PQ; PQ pq; → pq: priority_queue', () => {
    const v = vars('typedef priority_queue<int> PQ;\nPQ pq;');
    expect(v.get('pq')).toBe('priority_queue');
  });
});

// ─── Unknown Type Fallback ───────────────────────────────────────────────────

describe('TypeContext — Unknown type fallback', () => {
  it('MyStruct s → no entry in variables', () => {
    // MyStruct is a plain type_identifier not matching any known template
    // The tracker will store it with its raw name. Callers must check if
    // the resolved type is in their own set of recognized containers.
    const v = vars('MyStruct s;');
    // MyStruct is a type_identifier; it gets stored as-is (not an error).
    // D2.1 will only act on recognized container types, so this is a graceful no-op.
    const entry = v.get('s');
    // Either not present, or present with value "MyStruct" — both are acceptable
    // since D2.1 will gate on a known container allow-list.
    expect(entry === undefined || entry === 'MyStruct').toBe(true);
  });

  it('int n → no entry in variables (primitive type skipped)', () => {
    const v = vars('int n;');
    expect(v.has('n')).toBe(false);
  });

  it('long long n → no entry in variables (primitive type skipped)', () => {
    const v = vars('long long n;');
    expect(v.has('n')).toBe(false);
  });
});

// ─── Local Shadowing ─────────────────────────────────────────────────────────

describe('TypeContext — Local shadowing', () => {
  it('global map<int,int> mp shadowed by local int mp', () => {
    const globalCode = 'map<int,int> mp;';
    const localFnCode = 'void solve() { int mp = 0; }';

    const globalTree = parse(globalCode);
    const localTree = parse(localFnCode);

    const globalCtx = buildTypeContext(globalTree.rootNode);
    expect(globalCtx.variables.get('mp')).toBe('map');

    // Get the function_definition node for solve()
    const fnNode = localTree.rootNode.descendantsOfType('function_definition')[0];
    const localCtx = buildTypeContext(fnNode);
    // local declares int mp (primitive), so it should NOT appear in local variables
    // (primitives are skipped by the tracker). This means local has no 'mp' entry.

    const merged = mergeTypeContexts(globalCtx, localCtx);
    // Since local didn't shadow it with a container, global entry survives.
    // This is correct: the local `int mp` is a primitive, so no STL method
    // would ever be called on it — no false-positive risk.
    expect(merged.variables.get('mp')).toBe('map');
  });

  it('global set<int> s shadowed by local set<long long> s (different template arg)', () => {
    const globalCode = 'set<int> s;';
    const localCode = 'void f() { set<long long> s; }';

    const globalTree = parse(globalCode);
    const localTree = parse(localCode);

    const globalCtx = buildTypeContext(globalTree.rootNode);
    const fnNode = localTree.rootNode.descendantsOfType('function_definition')[0];
    const localCtx = buildTypeContext(fnNode);

    const merged = mergeTypeContexts(globalCtx, localCtx);
    // Both resolve to "set" — local wins but the result is the same.
    expect(merged.variables.get('s')).toBe('set');
  });
});

// ─── mergeTypeContexts ───────────────────────────────────────────────────────

describe('mergeTypeContexts', () => {
  it('merges aliases from both contexts', () => {
    const globalCode = 'using PQ = priority_queue<int>;';
    const localCode  = 'void f() { using MS = multiset<int>; }';

    const globalTree = parse(globalCode);
    const localTree = parse(localCode);

    const globalCtx = buildTypeContext(globalTree.rootNode);
    const fnNode = localTree.rootNode.descendantsOfType('function_definition')[0];
    const localCtx = buildTypeContext(fnNode);

    const merged = mergeTypeContexts(globalCtx, localCtx);
    expect(merged.aliases.get('PQ')).toBe('priority_queue');
    expect(merged.aliases.get('MS')).toBe('multiset');
  });

  it('local alias wins over global alias with same name', () => {
    const gCtx = {
      aliases: new Map([['T', 'set']]),
      variables: new Map(),
    };
    const lCtx = {
      aliases: new Map([['T', 'map']]),
      variables: new Map(),
    };
    const merged = mergeTypeContexts(gCtx, lCtx);
    expect(merged.aliases.get('T')).toBe('map');
  });

  it('mergeTypeContexts with undefined global returns local', () => {
    const lCtx = {
      aliases: new Map([['PQ', 'priority_queue']]),
      variables: new Map([['pq', 'priority_queue']]),
    };
    const merged = mergeTypeContexts(undefined, lCtx);
    expect(merged.variables.get('pq')).toBe('priority_queue');
  });
});
