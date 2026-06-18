// validation_corpus_batch7.cpp
// ULTIMATE FINAL ADVERSARIAL VALIDATION CORPUS — Batch 7 (test1201–test1500)
// Deterministic AST-only complexity inference — D5.6 frozen engine
// C++17 — Compilable
//
// Each function's expected complexity is annotated IMMEDIATELY before the
// function.  "Unknown" means a deterministic zero-heuristic AST-only
// engine CANNOT and SHOULD NOT produce a definite bound — that is a
// SUCCESSFUL deterministic outcome.
//
// Design mandate: every test is structurally novel relative to batches 1–6.
// Focus areas (none of which saturate any single-concept region already covered):
//   §1   Immediately-invoked lambdas (IIFE) as loop-producing expressions
//   §2   Lambda-captured bounds + chain
//   §3   Nested lambdas (lambda returning lambda, etc.)
//   §4   Local struct with template-method pattern
//   §5   Multiple return paths — all same complexity
//   §6   Multiple return paths — DIFFERENT complexities (Unknown)
//   §7   Ternary operator as loop bound — Unknown
//   §8   Conditional (if/else) alias selection — Unknown
//   §9   Alias convergence via assignment in both branches of if/else
//         where BOTH branches assign the SAME symbol => deterministic
//   §10  goto-based loops (structured, forward-only, bounded)
//   §11  Aggregate initializer / struct member as bound
//   §12  std::array with .begin()/.end() and manual count
//   §13  std::list size-alias patterns not yet covered
//   §14  Bit-manipulation loop bounds (purely integer param, no pointer)
//   §15  nested lambda capture + outer-scope loop composition
//   §16  Constexpr context loops (constexpr function, O(1) at compile time)
//   §17  init-statement in if / switch (C++17 if-init, switch-init)
//   §18  Structured bindings (C++17 auto [a,b]) as alias source
//   §19  Fold-expression style sequential sum trees (inline additive)
//   §20  Mixed macro + reference + typedef + paren + nested-loop combos
//         (new combination shapes not in batch6 test1200)
//   §21  Integer overflow boundary (n near INT_MAX — Unknown by policy)
//   §22  Volatile-qualified bounds — Unknown (write-read volatile is opaque)
//   §23  Static local variable as bound — Unknown
//   §24  Global variable as bound — Unknown
//   §25  mutable capture in lambda modifying bound — Unknown
//   §26  std::accumulate / std::for_each over container — O(n) patterns
//   §27  Template function complexity (non-type template param as bound)
//   §28  Multiple-inheritance local struct (method complexity)
//   §29  Operator-overloaded loop counter (struct with operator++)
//   §30  Compound statement as macro body (new macro shapes)

#include <bits/stdc++.h>
using namespace std;

// ─────────────────────────────────────────────────────────────────────────────
//  MACROS (new set — none overlap with batches 1–6 names)
// ─────────────────────────────────────────────────────────────────────────────
#define ILOOP(idx,N)         for(int idx=0;idx<(N);idx++)
#define ILOOP_R(idx,N)       for(int idx=(N)-1;idx>=0;idx--)
#define LOG_LOOP(idx,N)      for(int idx=(N);idx>0;idx>>=1)
#define MUL_LOOP(idx,N)      for(int idx=1;idx<(N);idx*=2)
#define BODY_LOOP(idx,N,B)   for(int idx=0;idx<(N);idx++){ B; }
#define NEST_ILOOP(i,N,j,M)  for(int i=0;i<(N);i++) for(int j=0;j<(M);j++)
#define ALIAS(x,y)           int x = (y)
#define ADD2(a,b)            ((a)+(b))
#define ADD3(a,b,c)          ((a)+(b)+(c))
#define ADD4(a,b,c,d)        ((a)+(b)+(c)+(d))

// ─────────────────────────────────────────────────────────────────────────────
//  SHARED FILE-SCOPE HELPERS (small, fresh, not duplicating prior batches)
// ─────────────────────────────────────────────────────────────────────────────

// fshA: O(n)  basic linear
static int fshA(int n) { int s=0; for(int i=0;i<n;i++) s++; return s; }

// fshB: O(1)
static int fshB(int x) { return x+1; }

// fshC: O(log n)  bit-shift descending
static int fshC(int n) { int c=0; for(int i=n;i>0;i>>=1) c++; return c; }

// fshD: O(n)  calls fshA
static int fshD(int n) { return fshA(n)+fshB(0); }

// fshE: O(n*m)
static int fshE(int n, int m) { int s=0; for(int i=0;i<n;i++) for(int j=0;j<m;j++) s++; return s; }

// fshF: O(n^2)  calls fshE(n,n)
static int fshF(int n) { return fshE(n,n); }

// fshG: O(n+m)
static int fshG(int n, int m) { int s=0; for(int i=0;i<n;i++) s++; for(int i=0;i<m;i++) s++; return s; }

// fshH: O(n*log(n))
static int fshH(int n) { int s=0; for(int i=0;i<n;i++) for(int j=n;j>0;j>>=1) s++; return s; }

// Global variable for §24 tests — deliberately opaque bound source
static int g_bound_7 = 42;

// ─────────────────────────────────────────────────────────────────────────────
//  §1  IMMEDIATELY-INVOKED LAMBDA EXPRESSIONS (IIFE) AS BOUND SOURCE
// ─────────────────────────────────────────────────────────────────────────────

// test1201: O(n)
// IIFE returns n; result used as loop bound.  The lambda is invoked once
// (O(1) invocation overhead), and its body returns n — the AST shows a
// call expression whose return value aliases n.
int test1201(int n) {
    int lim = [&]() { return n; }();
    int s = 0;
    for (int i = 0; i < lim; i++) s++;
    return s;
}

// test1202: O(n)
// IIFE contains a linear loop itself; its return value (the count) is
// used ONLY for an O(1) call afterward.  The IIFE's own loop is O(n).
int test1202(int n) {
    int cnt = [&]() {
        int acc = 0;
        for (int i = 0; i < n; i++) acc++;
        return acc;
    }();
    return fshB(cnt);
    // IIFE runs O(n); fshB call is O(1); overall O(n)
}

// test1203: O(n)
// IIFE body chains three aliases from captured n and returns the final one.
int test1203(int n) {
    int bound = [&]() {
        int a = n;
        int b = a;
        int c = b;
        return c;
    }();
    int s = 0;
    ILOOP(i, bound) s++;
    return s;
}

// test1204: O(n^2)
// IIFE produces n; outer loop iterates n times; inner calls fshA(n) = O(n)
// per step => O(n * n) = O(n^2).
int test1204(int n) {
    int lim = [&]() { return n; }();
    int s = 0;
    for (int i = 0; i < lim; i++) s += fshA(n);
    return s;
}

// test1205: O(n+m)
// IIFE captures two params and returns their sum as a single alias; one
// sequential loop runs for that sum.
int test1205(int n, int m) {
    int total = [&]() { return n + m; }();
    int s = 0;
    for (int i = 0; i < total; i++) s++;
    return s;
}

// test1206: Unknown
// IIFE returns the result of fshA(n) — an O(n) helper call — and that
// runtime value is used as the loop bound.  The engine cannot determine
// that fshA's return value equals n from pure AST.
int test1206(int n) {
    int bound = [&]() { return fshA(n); }();
    int s = 0;
    for (int i = 0; i < bound; i++) s++;
    return s;
}

// test1207: O(n)
// Two sequential IIFEs, each performing O(n) work; their results are
// added for an O(1) arithmetic expression.  The combined work is O(n).
int test1207(int n) {
    int a = [&]() { int acc=0; for(int i=0;i<n;i++) acc++; return acc; }();
    int b = [&]() { int acc=0; for(int i=0;i<n;i++) acc+=2; return acc; }();
    return a + b;
    // two O(n) IIFEs => O(n)
}

// test1208: O(n*m)
// IIFE body itself contains a nested loop over n and m (no capture
// needed for bounds since they're captured by reference).
int test1208(int n, int m) {
    int result = [&]() {
        int s = 0;
        for (int i = 0; i < n; i++)
            for (int j = 0; j < m; j++) s++;
        return s;
    }();
    return result;
}

// test1209: O(n)
// IIFE uses a local alias inside it (not captured) plus a capture — stresses
// the lambda-scope alias resolver.
int test1209(int n) {
    int r = [n]() {
        int lim = n;   // local alias inside lambda
        int s = 0;
        for (int i = 0; i < lim; i++) s++;
        return s;
    }();
    return r;
}

// test1210: O(log n)
// IIFE contains a logarithmic loop.
int test1210(int n) {
    int c = [&]() {
        int cnt = 0;
        for (int i = n; i > 0; i >>= 1) cnt++;
        return cnt;
    }();
    return c;
}

// ─────────────────────────────────────────────────────────────────────────────
//  §2  LAMBDA-CAPTURED BOUNDS + ALIAS CHAIN
// ─────────────────────────────────────────────────────────────────────────────

// test1211: O(n)
// Lambda captures n by value; body is a simple linear loop.  Lambda is
// stored in auto variable and invoked once.
int test1211(int n) {
    auto fn = [n]() {
        int s = 0;
        for (int i = 0; i < n; i++) s++;
        return s;
    };
    return fn();
}

// test1212: O(n)
// Lambda captures n by reference; a local alias inside the lambda chains
// from the reference capture.
int test1212(int n) {
    auto fn = [&n]() {
        int a = n;
        int b = a;
        int s = 0;
        for (int i = 0; i < b; i++) s++;
        return s;
    };
    return fn();
}

// test1213: O(n*m)
// Lambda captures both n and m by value; nested loop inside.
int test1213(int n, int m) {
    auto fn = [n, m]() {
        int s = 0;
        for (int i = 0; i < n; i++)
            for (int j = 0; j < m; j++) s++;
        return s;
    };
    return fn();
}

// test1214: O(n)
// Lambda stored in std::function<int()>, called once.
int test1214(int n) {
    function<int()> fn = [n]() {
        int s = 0;
        for (int i = 0; i < n; i++) s++;
        return s;
    };
    return fn();
}

// test1215: O(n)
// Lambda with a multi-hop alias for its captured bound, fed into ILOOP macro.
int test1215(int n) {
    auto fn = [n]() {
        int a = n;
        int b = a;
        int c = b;
        int s = 0;
        ILOOP(i, c) s++;
        return s;
    };
    return fn();
}

// test1216: O(n+m)
// Two lambdas, each capturing one param, called sequentially and their
// results summed — two O(n) and O(m) lambdas => O(n+m).
int test1216(int n, int m) {
    auto fA = [n]() { int s=0; for(int i=0;i<n;i++) s++; return s; };
    auto fB = [m]() { int s=0; for(int i=0;i<m;i++) s++; return s; };
    return fA() + fB();
}

// test1217: Unknown
// Lambda captures n by reference, but the bound used inside the lambda is
// actually a MUTABLE local that starts at 0 and increments inside the loop —
// loop terminates when local equals n, but the bound variable and the counter
// are the SAME variable (self-referential mutation in a structurally opaque way).
int test1217(int n) {
    int cnt = 0;
    auto fn = [&cnt, &n]() {
        while (cnt < n) cnt++;
        return cnt;
    };
    return fn();
    // Structurally: loop bound 'n' is fine, but the loop variable being the
    // CAPTURED 'cnt' (not a fresh local) is an unusual AST shape.
    // The engine sees a while loop whose condition compares a CAPTURED
    // reference variable against a captured reference bound — the loop
    // variable is not a simple for-loop counter with a recognized form.
    // Result: Unknown.
}

// test1218: O(log n)
// Lambda captures n, contains a multiplying log loop.
int test1218(int n) {
    auto fn = [n]() {
        int c = 0;
        for (int i = 1; i < n; i *= 2) c++;
        return c;
    };
    return fn();
}

// ─────────────────────────────────────────────────────────────────────────────
//  §3  NESTED LAMBDAS / LAMBDA RETURNING LAMBDA
// ─────────────────────────────────────────────────────────────────────────────

// test1219: O(n)
// Outer lambda captures n, returns an inner lambda that performs the loop.
// The inner lambda is immediately invoked.
int test1219(int n) {
    auto outer = [n]() {
        auto inner = [n]() {
            int s = 0;
            for (int i = 0; i < n; i++) s++;
            return s;
        };
        return inner();
    };
    return outer();
}

// test1220: O(n*m)
// Outer lambda captures n; returns an inner lambda capturing both n and m.
// Inner lambda has a nested loop.
int test1220(int n, int m) {
    auto outer = [n, m]() {
        auto inner = [n, m]() {
            int s = 0;
            for (int i = 0; i < n; i++)
                for (int j = 0; j < m; j++) s++;
            return s;
        };
        return inner();
    };
    return outer();
}

// test1221: O(n)
// Three-deep lambda nesting; each level passes the bound down via capture.
int test1221(int n) {
    auto L1 = [n]() {
        auto L2 = [n]() {
            auto L3 = [n]() {
                int s = 0;
                for (int i = 0; i < n; i++) s++;
                return s;
            };
            return L3();
        };
        return L2();
    };
    return L1();
}

// test1222: Unknown
// Lambda returned FROM another lambda; the returned lambda is stored in
// an auto variable.  The returned lambda captures the outer lambda's
// local variable 'cnt' which is itself the result of an O(n) loop run
// inside the outer lambda — Unknown because the bound of the inner
// lambda's loop depends on the runtime result of the outer computation.
int test1222(int n) {
    auto makeLoop = [n]() {
        int cnt = 0;
        for (int i = 0; i < n; i++) cnt++;  // cnt = n after loop
        return [cnt]() {
            int s = 0;
            for (int i = 0; i < cnt; i++) s++;  // loop runs cnt times
            return s;
        };
    };
    return makeLoop()();
    // The inner loop bound 'cnt' equals n at runtime, but that is determined
    // by executing the outer lambda's loop — opaque to static AST analysis.
}

// test1223: O(n)
// Lambda stored in a vector, each element invoked in a loop.  All lambdas
// are identical (each is O(1)), so total work is O(|v|) = O(n).
int test1223(int n) {
    vector<function<int()>> fns;
    for (int i = 0; i < n; i++)
        fns.push_back([i]() { return fshB(i); }); // O(1) lambda
    int s = 0;
    for (auto& f : fns) s += f();
    return s;
    // Building vector: O(n); iterating + O(1) each: O(n) => O(n)
}

// ─────────────────────────────────────────────────────────────────────────────
//  §4  LOCAL STRUCT WITH TEMPLATE-METHOD PATTERN
// ─────────────────────────────────────────────────────────────────────────────

// test1224: O(n)
// Local struct with a "template method" pattern: base behavior in one method
// calls a virtual-ish sub-step.  Both steps are O(1); loop is in the driver.
int test1224(int n) {
    struct TM {
        int step(int x) { return fshB(x); }         // O(1)
        int run(int k) {
            int s = 0;
            for (int i = 0; i < k; i++) s += step(i); // O(n) * O(1)
            return s;
        }
    };
    TM t;
    return t.run(n);
}

// test1225: O(n^2)
// Local struct method calls ANOTHER local struct method (helper delegation
// inside structs), each delegation is O(n), called n times.
int test1225(int n) {
    struct Inner2 {
        int go(int k) {
            int s = 0;
            for (int i = 0; i < k; i++) s++;
            return s;
        }
    };
    struct Outer2 {
        Inner2 inner;
        int run(int k) {
            int s = 0;
            for (int i = 0; i < k; i++) s += inner.go(k); // n * O(n) = O(n^2)
            return s;
        }
    };
    Outer2 o;
    return o.run(n);
}

// test1226: O(n+m)
// Local struct with TWO methods called sequentially; each method is O(n)
// and O(m) respectively — no loop around the calls.
int test1226(int n, int m) {
    struct Dual {
        int partA(int k) { int s=0; for(int i=0;i<k;i++) s++; return s; }
        int partB(int k) { int s=0; for(int i=0;i<k;i++) s++; return s; }
    };
    Dual d;
    return d.partA(n) + d.partB(m);
    // O(n) + O(m) = O(n+m)
}

// test1227: O(n*log(n))
// Local struct method: outer loop O(n), inner loop is a halving log loop
// bounded by n as well.
int test1227(int n) {
    struct LogLinear {
        int run(int k) {
            int s = 0;
            for (int i = 0; i < k; i++)
                for (int j = k; j > 0; j >>= 1) s++;
            return s;
        }
    };
    LogLinear ll;
    return ll.run(n);
}

// test1228: O(n)
// Local class (not struct) inheriting from another local struct — method
// resolution through inheritance inside a local scope.
int test1228(int n) {
    struct Base {
        virtual int work(int k) {
            int s = 0;
            for (int i = 0; i < k; i++) s++;
            return s;
        }
        virtual ~Base() = default;
    };
    struct Derived : Base {
        int work(int k) override {
            return Base::work(k) + fshB(0);  // O(n) + O(1) = O(n)
        }
    };
    Derived d;
    return d.work(n);
}

// ─────────────────────────────────────────────────────────────────────────────
//  §5  MULTIPLE RETURN PATHS — ALL SAME COMPLEXITY (deterministic)
// ─────────────────────────────────────────────────────────────────────────────

// test1229: O(n)
// Three different return paths, each performing a loop of O(n).
int test1229(int n, int mode) {
    if (mode == 0) {
        int s = 0;
        for (int i = 0; i < n; i++) s++;
        return s;
    }
    if (mode == 1) {
        int s = 0;
        ILOOP(i, n) s++;
        return s;
    }
    return fshA(n);
    // All three paths: O(n)
}

// test1230: O(n*m)
// Two return paths both computing nested loops of the same shape.
int test1230(int n, int m, bool flag) {
    if (flag) {
        int s = 0;
        for (int i = 0; i < n; i++)
            for (int j = 0; j < m; j++) s++;
        return s;
    }
    return fshE(n, m);
    // Both paths: O(n*m)
}

// test1231: O(n)
// Return paths through a switch where ALL cases call fshA(n).
int test1231(int n, int mode) {
    switch (mode % 3) {
        case 0: return fshA(n);
        case 1: return fshD(n);   // fshD calls fshA => O(n)
        default: return fshA(n);
    }
}

// test1232: O(n)
// Early-return pattern: first path short-circuits with O(1), second path
// (post-guard) runs O(n).
// NOTE: when n <= 0 the function returns 0 (O(1)), otherwise O(n). Since the
// compiler is deterministic and cannot condition on runtime value of n,
// and the dominant path is O(n), the deterministic answer is O(n).
int test1232(int n) {
    if (n <= 0) return 0;   // O(1) guard
    int s = 0;
    for (int i = 0; i < n; i++) s++;
    return s;
    // The O(n) path dominates; O(1) guard is structurally a pre-check.
}

// ─────────────────────────────────────────────────────────────────────────────
//  §6  MULTIPLE RETURN PATHS — DIFFERENT COMPLEXITIES (Unknown)
// ─────────────────────────────────────────────────────────────────────────────

// test1233: Unknown
// One branch is O(n), another is O(n^2) — cannot merge without symbolic max.
int test1233(int n, bool heavy) {
    if (heavy) {
        int s = 0;
        for (int i = 0; i < n; i++)
            for (int j = 0; j < n; j++) s++;
        return s;
    }
    int s = 0;
    for (int i = 0; i < n; i++) s++;
    return s;
}

// test1234: Unknown
// Switch where case 0 is O(n) and case 1 is O(n*m) — distinct complexities
// across cases, cannot be merged deterministically.
int test1234(int n, int m, int mode) {
    int s = 0;
    switch (mode) {
        case 0:
            for (int i = 0; i < n; i++) s++;
            break;
        case 1:
            for (int i = 0; i < n; i++)
                for (int j = 0; j < m; j++) s++;
            break;
        default:
            s = fshB(n);
            break;
    }
    return s;
}

// ─────────────────────────────────────────────────────────────────────────────
//  §7  TERNARY OPERATOR AS LOOP BOUND — Unknown
// ─────────────────────────────────────────────────────────────────────────────

// test1235: Unknown
// Loop bound is (n > m) ? n : m — max of two symbolic expressions,
// requires symbolic max reasoning.
int test1235(int n, int m) {
    int lim = (n > m) ? n : m;
    int s = 0;
    for (int i = 0; i < lim; i++) s++;
    return s;
}

// test1236: Unknown
// Loop bound is (n > 0) ? n : m — ternary involving a runtime condition.
int test1236(int n, int m) {
    int lim = (n > 0) ? n : m;
    int s = 0;
    for (int i = 0; i < lim; i++) s++;
    return s;
}

// test1237: Unknown
// Nested ternary as bound: (a > b) ? ((c > d) ? c : d) : a.
int test1237(int a, int b, int c, int d) {
    int lim = (a > b) ? ((c > d) ? c : d) : a;
    int s = 0;
    for (int i = 0; i < lim; i++) s++;
    return s;
}

// test1238: Unknown
// Ternary in a MACRO argument: ILOOP(i, (flag ? n : m)).
int test1238(int n, int m, bool flag) {
    int s = 0;
    ILOOP(i, (flag ? n : m)) s++;
    return s;
}

// ─────────────────────────────────────────────────────────────────────────────
//  §8  IF/ELSE ALIAS SELECTION — Unknown when branches differ
// ─────────────────────────────────────────────────────────────────────────────

// test1239: Unknown
// Variable 'lim' assigned n in one branch and m in the other; the engine
// cannot statically determine which branch executes.
int test1239(int n, int m, bool pick) {
    int lim;
    if (pick) lim = n;
    else      lim = m;
    int s = 0;
    for (int i = 0; i < lim; i++) s++;
    return s;
}

// test1240: Unknown
// Three-way if/else/else-if each assigning a different symbolic value
// to the same bound variable.
int test1240(int n, int m, int r, int mode) {
    int lim = 0;
    if      (mode == 0) lim = n;
    else if (mode == 1) lim = m;
    else                lim = r;
    int s = 0;
    for (int i = 0; i < lim; i++) s++;
    return s;
}

// ─────────────────────────────────────────────────────────────────────────────
//  §9  IF/ELSE BOTH ASSIGN THE SAME SYMBOL — deterministic when same source
// ─────────────────────────────────────────────────────────────────────────────

// test1241: O(n)
// Both branches assign lim = n regardless of condition.
int test1241(int n, bool flag) {
    int lim;
    if (flag) lim = n;
    else      lim = n;   // same symbol both branches
    int s = 0;
    for (int i = 0; i < lim; i++) s++;
    return s;
}

// test1242: O(n)
// Both if/else branches assign through the SAME alias chain (both ultimately
// trace to the same param n).
int test1242(int n, bool flag) {
    int a = n;
    int b = a;
    int lim;
    if (flag) lim = b;
    else      lim = b;   // same 'b' both sides
    int s = 0;
    for (int i = 0; i < lim; i++) s++;
    return s;
}

// ─────────────────────────────────────────────────────────────────────────────
//  §10  goto-BASED LOOPS (forward-only, structured, bounded)
// ─────────────────────────────────────────────────────────────────────────────

// test1243: O(n)
// Backward goto forming a counted loop: counter increments until == n.
int test1243(int n) {
    int i = 0, s = 0;
    loop_top:
    if (i >= n) goto loop_end;
    s++;
    i++;
    goto loop_top;
    loop_end:
    return s;
    // Structurally: goto-based bounded loop, count n iterations => O(n)
    // NOTE: goto-based loops may be outside the engine's scope since
    // they do not form standard AST loop nodes.  If the engine does not
    // recognize goto-loops, this should be Unknown.
}
// EXPECTED for test1243: Unknown
// (goto does not produce a ForStmt/WhileStmt/DoStmt AST node; engine
// cannot infer the bound from the goto-jump graph)

// test1244: Unknown
// Forward-only goto used to skip half the iterations of a loop based on
// a runtime condition — interacts with a for-loop.
int test1244(int n) {
    int s = 0;
    for (int i = 0; i < n; i++) {
        if (i % 2 == 0) goto skip;
        s++;
        skip:;
    }
    return s;
    // goto-inside-loop: the loop itself is O(n), but the goto pattern
    // inside the body adds structural ambiguity.
    // Conservative AST engine: O(n) — the outer for-loop is recognized.
}
// EXPECTED for test1244: O(n)
// (outer for-loop is a standard ForStmt; body complexity is O(1) per iter)

// ─────────────────────────────────────────────────────────────────────────────
//  §11  AGGREGATE INITIALIZER / STRUCT MEMBER AS BOUND
// ─────────────────────────────────────────────────────────────────────────────

// test1245: O(n)
// Struct with a single int member initialized from n; member used as loop bound.
int test1245(int n) {
    struct Box { int cap; };
    Box b{n};
    int s = 0;
    for (int i = 0; i < b.cap; i++) s++;
    return s;
    // b.cap = n => O(n)
}

// test1246: O(n*m)
// Struct with two int members (rows, cols); nested loop uses both.
int test1246(int n, int m) {
    struct Grid { int rows; int cols; };
    Grid g{n, m};
    int s = 0;
    for (int i = 0; i < g.rows; i++)
        for (int j = 0; j < g.cols; j++) s++;
    return s;
}

// test1247: O(n)
// Struct member initialized from a container size cast.
int test1247(vector<int>& v) {
    struct Holder { int sz; };
    Holder h{(int)v.size()};
    int s = 0;
    for (int i = 0; i < h.sz; i++) s++;
    return s;
}

// test1248: O(n+m)
// Two struct members, each from a different container size; sequential loops.
int test1248(vector<int>& v, deque<int>& dq) {
    struct Pair2 { int a; int b; };
    Pair2 p{(int)v.size(), (int)dq.size()};
    int s = 0;
    for (int i = 0; i < p.a; i++) s++;
    for (int i = 0; i < p.b; i++) s++;
    return s;
}

// test1249: O(n)
// Struct member accessed through a reference to the struct — member via ref.
int test1249(int n) {
    struct Cap { int val; };
    Cap c{n};
    Cap& rc = c;
    int s = 0;
    for (int i = 0; i < rc.val; i++) s++;
    return s;
}

// ─────────────────────────────────────────────────────────────────────────────
//  §12  std::array PATTERNS NOT PREVIOUSLY COVERED
// ─────────────────────────────────────────────────────────────────────────────

// test1250: O(n)
// std::array of fixed size N; loop over all elements using index loop with
// alias from arr.size().  (arr.size() == N == 50, a compile-time constant.)
int test1250(array<int,50>& arr) {
    int n = (int)arr.size();    // n = 50 symbolically
    int s = 0;
    for (int i = 0; i < n; i++) s++;
    return s;
}

// test1251: O(n)
// std::array range-for iteration — body O(1) per element.
int test1251(array<int,50>& arr) {
    int s = 0;
    for (auto& x : arr) { (void)x; s++; }
    return s;
    // |arr| = 50 (constant), but symbolically O(n) where n = arr.size()
}

// test1252: O(n^2)
// std::array size aliased once; used for BOTH bounds of nested loop.
int test1252(array<int,50>& arr) {
    int n = (int)arr.size();
    int s = 0;
    for (int i = 0; i < n; i++)
        for (int j = 0; j < n; j++) s++;
    return s;
}

// ─────────────────────────────────────────────────────────────────────────────
//  §13  std::list PATTERNS
// ─────────────────────────────────────────────────────────────────────────────

// test1253: O(n)
// list.size() cast-aliased, linear loop.
int test1253(list<int>& lst) {
    int n = (int)lst.size();
    int s = 0;
    for (int i = 0; i < n; i++) s++;
    return s;
}

// test1254: O(n)
// Range-for over list — body O(1).
int test1254(list<int>& lst) {
    int s = 0;
    for (auto& x : lst) { (void)x; s++; }
    return s;
}

// test1255: O(n+m)
// list + forward_list sizes, sequential.
int test1255(list<int>& lst, forward_list<int>& fl) {
    int n = (int)lst.size();
    // forward_list has O(n) size() in C++11+; we use distance for forward_list
    // but to stay deterministic: just iterate with a counter alias
    int m = (int)distance(fl.begin(), fl.end());  // this is an opaque call
    (void)m;
    // Since distance() is opaque => Unknown for the m bound.
    // Use lst only:
    int s = 0;
    for (int i = 0; i < n; i++) s++;
    // For m part: cannot determine from AST => produce O(n) for the list part.
    // Actually to keep it fully deterministic, just use lst:
    return s;
}
// EXPECTED for test1255: O(n)
// (only lst.size() is a recognized container-size form; distance() is opaque)

// test1256: O(n*m)
// list.size() for outer, int param for inner.
int test1256(list<int>& lst, int m) {
    int n = (int)lst.size();
    int s = 0;
    for (int i = 0; i < n; i++)
        for (int j = 0; j < m; j++) s++;
    return s;
}

// ─────────────────────────────────────────────────────────────────────────────
//  §14  BIT-MANIPULATION LOOP BOUNDS (purely integer, no pointer)
// ─────────────────────────────────────────────────────────────────────────────

// test1257: Unknown
// Loop bound is n & (n-1) — bitmask clearing the lowest set bit.
// The result is a bitwise operation on a symbolic value, not a recognized
// additive/multiplicative expression.
int test1257(int n) {
    int lim = n & (n - 1);
    int s = 0;
    for (int i = 0; i < lim; i++) s++;
    return s;
}

// test1258: Unknown
// Loop bound is __builtin_popcount(n) — intrinsic call result, opaque.
int test1258(int n) {
    int lim = __builtin_popcount(n);
    int s = 0;
    for (int i = 0; i < lim; i++) s++;
    return s;
}

// test1259: Unknown
// Loop bound is n | m — bitwise OR of two symbolic params.
int test1259(int n, int m) {
    int lim = n | m;
    int s = 0;
    for (int i = 0; i < lim; i++) s++;
    return s;
}

// test1260: Unknown
// Loop bound is n >> 1 (right shift by constant) — division by 2 expressed
// via bit-shift of a parameter rather than /.  The engine recognizes /2 as
// a loop UPDATE (i>>=1) but NOT as a bound alias n>>1 (that is an unsupported
// arithmetic bound form).
int test1260(int n) {
    int lim = n >> 1;
    int s = 0;
    for (int i = 0; i < lim; i++) s++;
    return s;
}

// ─────────────────────────────────────────────────────────────────────────────
//  §15  NESTED LAMBDA CAPTURE + OUTER-SCOPE LOOP COMPOSITION
// ─────────────────────────────────────────────────────────────────────────────

// test1261: O(n^2)
// Outer loop O(n); body invokes a lambda that itself does O(n) work.
int test1261(int n) {
    auto inner = [n]() {
        int s = 0;
        for (int j = 0; j < n; j++) s++;
        return s;
    };
    int total = 0;
    for (int i = 0; i < n; i++) total += inner();
    return total;
    // n * O(n) = O(n^2)
}

// test1262: O(n*m)
// Outer loop O(n); inner lambda captures m and does O(m) work.
int test1262(int n, int m) {
    auto inner = [m]() {
        int s = 0;
        for (int j = 0; j < m; j++) s++;
        return s;
    };
    int total = 0;
    for (int i = 0; i < n; i++) total += inner();
    return total;
}

// test1263: O(n*log(n))
// Outer loop O(n); inner lambda captures n and does O(log n) work.
int test1263(int n) {
    auto inner = [n]() { return fshC(n); };  // O(log n)
    int total = 0;
    for (int i = 0; i < n; i++) total += inner();
    return total;
}

// test1264: O(n)
// Outer loop O(n); inner lambda captures i (loop variable) and does
// O(1) work — since it uses 'i' not 'n' in a call to fshB.
int test1264(int n) {
    int total = 0;
    for (int i = 0; i < n; i++) {
        auto inner = [i]() { return fshB(i); };  // O(1)
        total += inner();
    }
    return total;
}

// ─────────────────────────────────────────────────────────────────────────────
//  §16  CONSTEXPR FUNCTIONS (O(1) at call site since value is compile-time)
// ─────────────────────────────────────────────────────────────────────────────

// test1265: O(1)
// constexpr function computes a fixed result; calling it is O(1) at the
// call site regardless of what it computes.
constexpr int cexpr_fact_1265(int n) {
    int r = 1;
    for (int i = 2; i <= n; i++) r *= i;
    return r;
}
int test1265(int x) {
    constexpr int val = cexpr_fact_1265(5);  // compile-time, O(1)
    return x + val;
}

// test1266: O(n)
// Outer loop bounded by a runtime param n; inside, a constexpr function is
// called with a COMPILE-TIME literal (contributing O(1) per iteration).
int test1266(int n) {
    int s = 0;
    for (int i = 0; i < n; i++) {
        constexpr int k = cexpr_fact_1265(3);  // O(1)
        s += k;
    }
    return s;
    // O(n) * O(1) = O(n)
}

// ─────────────────────────────────────────────────────────────────────────────
//  §17  C++17 IF-INIT AND SWITCH-INIT
// ─────────────────────────────────────────────────────────────────────────────

// test1267: O(n)
// if with initializer: if (int lim = n; lim > 0) { loop over lim }
int test1267(int n) {
    int s = 0;
    if (int lim = n; lim > 0) {
        for (int i = 0; i < lim; i++) s++;
    }
    return s;
    // lim = n declared in if-init; loop uses lim => O(n)
}

// test1268: O(n)
// if-init alias from container size.
int test1268(vector<int>& v) {
    int s = 0;
    if (int n = (int)v.size(); n > 0) {
        for (int i = 0; i < n; i++) s++;
    }
    return s;
}

// test1269: O(n*m)
// Nested if-inits for two bounds: inner has a loop.
int test1269(int n, int m) {
    int s = 0;
    if (int rows = n; rows > 0) {
        if (int cols = m; cols > 0) {
            for (int i = 0; i < rows; i++)
                for (int j = 0; j < cols; j++) s++;
        }
    }
    return s;
}

// test1270: O(n)
// switch with initializer (C++17): switch (int lim = n; lim % 2).
int test1270(int n, int mode) {
    int s = 0;
    switch (int lim = n; mode) {
        case 0:
            for (int i = 0; i < lim; i++) s++;
            break;
        default:
            s = fshA(lim);
            break;
    }
    return s;
    // Both branches are O(lim) = O(n)
}

// test1271: Unknown
// switch-init where different cases use the same init variable but assign
// different multipliers — the engine only sees the for-loop inside, and
// the for-loop bound itself is 'lim' which equals n; however the case
// selection makes the two paths O(n) and O(1), which is still merged
// conservatively.  Actually case 0 is O(n) and default is O(1):
// mixed-complexity switch => Unknown.
int test1271(int n, int mode) {
    int s = 0;
    switch (int lim = n; mode) {
        case 0:
            for (int i = 0; i < lim; i++)
                for (int j = 0; j < lim; j++) s++;  // O(n^2)
            break;
        default:
            s = fshB(lim);  // O(1)
            break;
    }
    return s;
}

// ─────────────────────────────────────────────────────────────────────────────
//  §18  STRUCTURED BINDINGS (C++17 auto [a,b]) AS ALIAS SOURCE
// ─────────────────────────────────────────────────────────────────────────────

// test1272: O(n)
// Structured binding unpacks a pair; first element used as loop bound.
int test1272(pair<int,int>& p) {
    auto [a, b] = p;   // a = p.first = n, b = p.second (unused)
    int s = 0;
    for (int i = 0; i < a; i++) s++;
    (void)b;
    return s;
    // 'a' binds to p.first; loop bound = a => O(n) where n = p.first
}

// test1273: O(n+m)
// Structured binding unpacks pair; both elements used in sequential loops.
int test1273(pair<int,int>& p) {
    auto [n, m] = p;
    int s = 0;
    for (int i = 0; i < n; i++) s++;
    for (int i = 0; i < m; i++) s++;
    return s;
}

// test1274: O(n*m)
// Structured binding from pair; both used in nested loops.
int test1274(pair<int,int>& p) {
    auto [n, m] = p;
    int s = 0;
    for (int i = 0; i < n; i++)
        for (int j = 0; j < m; j++) s++;
    return s;
}

// test1275: O(n)
// Structured binding from array<int,2>; first element loop bound.
int test1275(array<int,2>& arr) {
    auto [first, second] = arr;
    int s = 0;
    for (int i = 0; i < first; i++) s++;
    (void)second;
    return s;
}

// test1276: O(n)
// Structured binding with alias chain: auto [a,b] = p; int c = a; loop on c.
int test1276(pair<int,int>& p) {
    auto [a, b] = p;
    int c = a;
    int s = 0;
    for (int i = 0; i < c; i++) s++;
    (void)b;
    return s;
}

// ─────────────────────────────────────────────────────────────────────────────
//  §19  COMPOUND ADDITIVE TREES — NEW STRUCTURAL SHAPES
// ─────────────────────────────────────────────────────────────────────────────

// test1277: O(a+b+c+d+e+f+g+h)
// Eight-term flat addition used directly as a loop bound.
int test1277(int a, int b, int c, int d, int e, int f, int g, int h) {
    int s = 0;
    for (int i = 0; i < a+b+c+d+e+f+g+h; i++) s++;
    return s;
}

// test1278: O(a+b+c+d+e+f+g+h)
// Eight-term balanced binary tree: (((a+b)+(c+d))+((e+f)+(g+h))).
int test1278(int a, int b, int c, int d, int e, int f, int g, int h) {
    int total = (((a+b)+(c+d))+((e+f)+(g+h)));
    int s = 0;
    for (int i = 0; i < total; i++) s++;
    return s;
}

// test1279: O(a+b+c+d+e)
// Five-term zigzag tree: (a+((b+c)+(d+e))).
int test1279(int a, int b, int c, int d, int e) {
    int total = (a+((b+c)+(d+e)));
    int s = 0;
    for (int i = 0; i < total; i++) s++;
    return s;
}

// test1280: O(n+m)
// Additive alias built via ADD2 macro, then looped.
int test1280(int n, int m) {
    int total = ADD2(n, m);
    int s = 0;
    for (int i = 0; i < total; i++) s++;
    return s;
}

// test1281: O(n+m+r)
// Additive alias via ADD3 macro.
int test1281(int n, int m, int r) {
    int total = ADD3(n, m, r);
    int s = 0;
    for (int i = 0; i < total; i++) s++;
    return s;
}

// test1282: O(n+m+r+t)
// Additive alias via ADD4 macro.
int test1282(int n, int m, int r, int t) {
    int total = ADD4(n, m, r, t);
    int s = 0;
    for (int i = 0; i < total; i++) s++;
    return s;
}

// test1283: O(n+m)
// ADD2 used as direct macro argument to ILOOP.
int test1283(int n, int m) {
    int s = 0;
    ILOOP(i, ADD2(n, m)) s++;
    return s;
}

// test1284: O(n+m+r)
// ADD3 as ILOOP argument.
int test1284(int n, int m, int r) {
    int s = 0;
    ILOOP(i, ADD3(n, m, r)) s++;
    return s;
}

// test1285: O(n+m+r)
// ADD3 inline in for-loop condition with no intermediate alias.
int test1285(int n, int m, int r) {
    int s = 0;
    for (int i = 0; i < ADD3(n, m, r); i++) s++;
    return s;
}

// test1286: O(n+m)
// Deep-nested additive parens from ADD2: (((ADD2(n,m)))).
int test1286(int n, int m) {
    int total = (((ADD2(n, m))));
    int s = 0;
    for (int i = 0; i < total; i++) s++;
    return s;
}

// ─────────────────────────────────────────────────────────────────────────────
//  §20  FULL-STACK COMBOS (new combination shapes, distinct from test1200)
// ─────────────────────────────────────────────────────────────────────────────

// test1287: O(n)
// Lambda captures container-size alias, inside lambda a reference chain
// of 3 hops, fed to a ILOOP macro.
int test1287(vector<int>& v) {
    int raw = (int)v.size();
    auto fn = [raw]() {
        int& r1 = const_cast<int&>(raw);   // reference to captured copy
        int& r2 = r1;
        int s = 0;
        ILOOP(i, r2) s++;
        return s;
    };
    (void)fn;  // fn is callable but we invoke it directly
    // Actually invoke:
    int raw2 = raw;
    auto fn2 = [raw2]() {
        int a = raw2;
        int b = a;
        int& c = b;
        int s = 0;
        ILOOP(i, c) s++;
        return s;
    };
    return fn2();
}

// test1288: O(n^2)
// Struct member alias from container, fed to a nested ILOOP via typedef.
int test1288(vector<int>& v) {
    struct Box2 { int n; };
    typedef int Bound;
    Box2 b{static_cast<Bound>(v.size())};
    Bound n = b.n;
    int s = 0;
    NEST_ILOOP(i, n, j, n) s++;
    return s;
}

// test1289: O(n*m)
// switch-init (C++17) + structured binding + nested ILOOP.
int test1289(pair<int,int>& p, int mode) {
    int s = 0;
    auto [n, m] = p;
    switch (int guard = mode; guard) {
        default:
            NEST_ILOOP(i, n, j, m) s++;
            break;
    }
    return s;
}

// test1290: O(n)
// IIFE + structured binding + ADD2 macro + ILOOP chain.
int test1290(pair<int,int>& p) {
    auto [a, b] = p;
    int total = [a, b]() { return ADD2(a, b); }();
    // Hmm — ADD2(a,b) = a+b.  But 'a' and 'b' come from p.first and p.second.
    // total = a + b.  Loop over total => O(a+b).
    int s = 0;
    ILOOP(i, total) s++;
    return s;
}
// EXPECTED for test1290: O(n+m) where n=p.first, m=p.second

// test1291: O(n)
// Reference + do-while + LOG_LOOP macro in a combined chain.
int test1291(int n) {
    int& r = n;
    int c = 0, i2 = 0;
    if (r <= 0) return 0;
    do {
        LOG_LOOP(k, r) c++;   // O(log n) per outer step
        i2++;
    } while (i2 < 1);         // do-while runs exactly 1 time
    return c;
    // do-while: 1 iteration; body: LOG_LOOP over r=n => O(log n)
}
// EXPECTED for test1291: O(log n)

// test1292: O(n*log(n))
// typedef + alias + ILOOP outer + LOG_LOOP inner.
int test1292(int n) {
    typedef int T;
    T lim = n;
    int s = 0;
    ILOOP(i, lim) {
        LOG_LOOP(j, lim) s++;
    }
    return s;
}

// test1293: O(n)
// Lambda + if-init + ALIAS macro all in one function.
int test1293(int n) {
    int s = 0;
    if (ALIAS(lim, n); lim > 0) {
        auto fn = [lim]() {
            int acc = 0;
            for (int i = 0; i < lim; i++) acc++;
            return acc;
        };
        s = fn();
    }
    return s;
}

// ─────────────────────────────────────────────────────────────────────────────
//  §21  INTEGER OVERFLOW BOUNDARY — Unknown
// ─────────────────────────────────────────────────────────────────────────────

// test1294: Unknown
// Loop bound is INT_MAX itself — the loop would run ~2 billion times;
// the engine cannot determine this is a constant without evaluating the
// macro expansion to a literal.  Additionally, iterating to INT_MAX may
// overflow the counter on some platforms.  Conservative: Unknown.
int test1294(int n) {
    int s = 0;
    for (int i = 0; i < INT_MAX; i++) {
        s++;
        if (i >= n) break;  // break guarded by n, but break analysis is opaque
    }
    return s;
}

// test1295: Unknown
// Bound computed as n + INT_MAX/2 — potential overflow in the bound
// expression itself, and the result depends on runtime value of n.
int test1295(int n) {
    int lim = n + INT_MAX / 2;   // overflow possible
    int s = 0;
    for (int i = 0; i < lim; i++) {
        s++;
        if (s > 100) break;
    }
    return s;
}

// ─────────────────────────────────────────────────────────────────────────────
//  §22  VOLATILE-QUALIFIED BOUNDS — Unknown
// ─────────────────────────────────────────────────────────────────────────────

// test1296: Unknown
// Loop bound is a volatile int parameter — the compiler cannot cache its
// value; from the AST engine's perspective, a volatile-qualified variable
// might change between reads, making the bound indeterminate.
int test1296(volatile int n) {
    int s = 0;
    for (int i = 0; i < n; i++) s++;
    return s;
}

// test1297: Unknown
// Volatile alias of a non-volatile param used as bound.
int test1297(int n) {
    volatile int vlim = n;
    int s = 0;
    for (int i = 0; i < vlim; i++) s++;
    return s;
}

// ─────────────────────────────────────────────────────────────────────────────
//  §23  STATIC LOCAL VARIABLE AS BOUND — Unknown
// ─────────────────────────────────────────────────────────────────────────────

// test1298: Unknown
// Loop bound is a static local variable — its value depends on prior calls,
// making it opaque to single-function analysis.
int test1298(int n) {
    static int slimit = 0;
    slimit = n;   // written here, but static — could have been written before
    int s = 0;
    for (int i = 0; i < slimit; i++) s++;
    return s;
    // slimit is a static variable; its value at loop entry is not locally
    // deterministic (could have been modified by prior calls) => Unknown.
}

// test1299: Unknown
// Static local variable used as an accumulator whose final value drives a
// second loop — doubly opaque.
int test1299() {
    static int acc = 0;
    acc++;
    int s = 0;
    for (int i = 0; i < acc; i++) s++;
    return s;
    // acc grows with each call => opaque bound => Unknown
}

// ─────────────────────────────────────────────────────────────────────────────
//  §24  GLOBAL VARIABLE AS BOUND — Unknown
// ─────────────────────────────────────────────────────────────────────────────

// test1300: Unknown
// Loop bound reads from g_bound_7 (file-scope global) — globally mutable,
// opaque from single-function analysis perspective.
int test1300(int n) {
    (void)n;
    int s = 0;
    for (int i = 0; i < g_bound_7; i++) s++;
    return s;
}

// test1301: Unknown
// Global written from param then read as loop bound — the write makes it
// locally equal to n, but a zero-heuristic engine cannot prove that
// the global wasn't written by another call between the write and the read.
int test1301(int n) {
    g_bound_7 = n;
    int s = 0;
    for (int i = 0; i < g_bound_7; i++) s++;
    return s;
}

// ─────────────────────────────────────────────────────────────────────────────
//  §25  MUTABLE CAPTURE MODIFYING BOUND — Unknown
// ─────────────────────────────────────────────────────────────────────────────

// test1302: Unknown
// Lambda captures n by value as mutable; the loop bound inside the lambda
// is the mutable copy, which could in principle be modified before the loop.
int test1302(int n) {
    auto fn = [n]() mutable {
        n += 0;   // no-op numerically, but 'n' is structurally mutated (written)
        int s = 0;
        for (int i = 0; i < n; i++) s++;   // n is a mutable captured copy
        return s;
    };
    return fn();
    // The captured 'n' is mutable (writable inside the lambda); any write
    // to it before the loop disqualifies simple bound aliasing => Unknown.
}

// test1303: Unknown
// Mutable capture with an actual modification before the loop.
int test1303(int n) {
    auto fn = [n]() mutable {
        n = n + 0;   // assignment to mutable capture (structurally a write)
        int s = 0;
        for (int i = 0; i < n; i++) s++;
        return s;
    };
    return fn();
}

// ─────────────────────────────────────────────────────────────────────────────
//  §26  std::algorithm PATTERNS (for_each, accumulate) — O(n) by structure
// ─────────────────────────────────────────────────────────────────────────────

// test1304: O(n)
// std::for_each over a vector — always visits every element exactly once.
// The lambda body is O(1); total is O(n).
int test1304(vector<int>& v) {
    int s = 0;
    for_each(v.begin(), v.end(), [&s](int x) { s += x; });
    return s;
    // for_each: O(n) where n = v.size()
}

// test1305: O(n)
// std::accumulate over a vector — linear pass.
int test1305(vector<int>& v) {
    return accumulate(v.begin(), v.end(), 0);
    // O(n) linear reduction
}

// test1306: O(n)
// Manual loop equivalent to for_each: range-for with O(1) body.
int test1306(vector<int>& v) {
    int s = 0;
    for (auto& x : v) s += fshB(x);  // fshB is O(1)
    return s;
    // n * O(1) = O(n)
}

// test1307: O(n*m)
// Nested std::for_each: outer over vector v (|v|=n), inner over vector u (|u|=m).
int test1307(vector<int>& v, vector<int>& u) {
    int s = 0;
    for_each(v.begin(), v.end(), [&](int x) {
        for_each(u.begin(), u.end(), [&](int y) {
            s += x + y;
        });
    });
    return s;
}

// test1308: O(n)
// std::count_if over a vector — O(n) linear scan.
int test1308(vector<int>& v) {
    return (int)count_if(v.begin(), v.end(), [](int x) { return x > 0; });
}

// test1309: O(n)
// std::transform producing a new vector of same size — O(n).
int test1309(vector<int>& v) {
    vector<int> out(v.size());
    transform(v.begin(), v.end(), out.begin(), [](int x) { return x * 2; });
    int s = 0;
    for (int x : out) s += x;
    return s;
    // transform O(n) + range-for O(n) = O(n)
}

// ─────────────────────────────────────────────────────────────────────────────
//  §27  TEMPLATE FUNCTION — NON-TYPE TEMPLATE PARAMETER AS BOUND
// ─────────────────────────────────────────────────────────────────────────────

// test1310: O(1)
// Non-type template parameter N is a compile-time constant; the loop runs
// exactly N iterations regardless of any runtime input — O(1).
template<int N>
int tloop_1310() {
    int s = 0;
    for (int i = 0; i < N; i++) s++;
    return s;
}
int test1310(int dummy) {
    (void)dummy;
    return tloop_1310<100>();
    // N=100 is compile-time constant => loop is O(1)
}

// test1311: O(n)
// Template function with a runtime parameter — the template parameter N is
// used as an OFFSET, not the bound; the bound is the runtime param k.
template<int OFFSET>
int tloop_1311(int k) {
    int s = 0;
    for (int i = OFFSET; i < k + OFFSET; i++) s++;
    return s;
}
int test1311(int n) {
    return tloop_1311<0>(n);
    // Loop runs n times => O(n)
}

// test1312: O(n)
// Template specialization called with two different N values;
// in both cases the body is just O(n) from the runtime param.
template<int N>
int tloop_1312(int n) {
    int s = 0;
    for (int i = 0; i < n; i++) s += N;
    return s;
}
int test1312(int n) {
    return tloop_1312<1>(n) + tloop_1312<2>(n);
    // Two O(n) calls => O(n)
}

// ─────────────────────────────────────────────────────────────────────────────
//  §28  MULTIPLE-INHERITANCE LOCAL STRUCT
// ─────────────────────────────────────────────────────────────────────────────

// test1313: O(n)
// Local struct inheriting from TWO base structs; method from one base
// performs an O(n) loop.
int test1313(int n) {
    struct BaseA {
        int work(int k) {
            int s = 0;
            for (int i = 0; i < k; i++) s++;
            return s;
        }
    };
    struct BaseB {
        int extra() { return 0; }   // O(1)
    };
    struct Derived2 : BaseA, BaseB {
        int full(int k) { return work(k) + extra(); }
    };
    Derived2 d;
    return d.full(n);
    // work = O(n), extra = O(1) => O(n)
}

// test1314: O(n^2)
// Multi-inheritance; one base provides O(n), called inside an O(n) outer loop
// through the other base's driver method.
int test1314(int n) {
    struct Worker {
        int go(int k) {
            int s = 0;
            for (int i = 0; i < k; i++) s++;
            return s;
        }
    };
    struct Driver {
        int drive(Worker& w, int k) {
            int total = 0;
            for (int i = 0; i < k; i++) total += w.go(k);
            return total;
        }
    };
    Worker w;
    Driver d;
    return d.drive(w, n);
    // n outer * O(n) inner = O(n^2)
}

// ─────────────────────────────────────────────────────────────────────────────
//  §29  OPERATOR-OVERLOADED LOOP COUNTER — Unknown
// ─────────────────────────────────────────────────────────────────────────────

// test1315: Unknown
// Loop counter is a struct with operator++ and operator< overloaded.
// The engine cannot determine the loop count without analyzing the
// operator implementations.
int test1315(int n) {
    struct Counter {
        int val;
        Counter(int v) : val(v) {}
        Counter& operator++() { ++val; return *this; }
        bool operator<(int rhs) const { return val < rhs; }
    };
    int s = 0;
    for (Counter c(0); c < n; ++c) s++;
    return s;
    // Structurally looks like O(n), but operator++ and operator< are
    // user-defined: the engine cannot determine the iteration count
    // without semantic analysis of the overloaded operators => Unknown.
}

// test1316: Unknown
// Same pattern, but operator++ doubles val each call (hidden inside struct).
int test1316(int n) {
    struct LogCounter {
        int val;
        LogCounter(int v) : val(v) {}
        LogCounter& operator++() { val *= 2; return *this; }  // doubling!
        bool operator<(int rhs) const { return val < rhs; }
    };
    int s = 0;
    for (LogCounter c(1); c < n; ++c) s++;
    return s;
    // Would be O(log n), but operator overloading makes it opaque => Unknown.
}

// ─────────────────────────────────────────────────────────────────────────────
//  §30  NEW MACRO SHAPES (not in any prior batch)
// ─────────────────────────────────────────────────────────────────────────────

// test1317: O(n)
// BODY_LOOP macro (body as last argument) with a simple increment body.
int test1317(int n) {
    int s = 0;
    BODY_LOOP(i, n, s++);
    return s;
}

// test1318: O(n^2)
// NEST_ILOOP macro (two levels, NEST2-like) with same bound.
int test1318(int n) {
    int s = 0;
    NEST_ILOOP(i, n, j, n) s++;
    return s;
}

// test1319: O(n*m)
// NEST_ILOOP with two distinct bounds.
int test1319(int n, int m) {
    int s = 0;
    NEST_ILOOP(i, n, j, m) s++;
    return s;
}

// test1320: O(log n)
// LOG_LOOP macro (right-shift descending) with alias from container size.
int test1320(vector<int>& v) {
    int n = (int)v.size();
    int c = 0;
    LOG_LOOP(i, n) c++;
    return c;
}

// test1321: O(log n)
// MUL_LOOP macro (multiplying by 2 each step) with typedef alias.
int test1321(int n) {
    typedef int Bound;
    Bound lim = n;
    int c = 0;
    MUL_LOOP(i, lim) c++;
    return c;
}

// test1322: O(n*log(n))
// ILOOP outer + LOG_LOOP inner, both using the same alias.
int test1322(int n) {
    int lim = n;
    int s = 0;
    ILOOP(i, lim) {
        LOG_LOOP(j, lim) s++;
    }
    return s;
}

// test1323: O(n*m)
// BODY_LOOP outer; inside body a NEST_ILOOP with m and 1 inner bound.
int test1323(int n, int m) {
    int s = 0;
    BODY_LOOP(i, n, NEST_ILOOP(j, m, k, 1) s++);
    return s;
    // outer n; inner: NEST_ILOOP(j,m,k,1) = m*1 = m => O(n*m)
}

// test1324: O(n)
// ILOOP_R (reverse) macro — iterates n times like ILOOP but in reverse.
int test1324(int n) {
    int s = 0;
    ILOOP_R(i, n) s++;
    return s;
}

// test1325: O(n*m)
// ILOOP_R outer, ILOOP inner.
int test1325(int n, int m) {
    int s = 0;
    ILOOP_R(i, n) ILOOP(j, m) s++;
    return s;
}

// ─────────────────────────────────────────────────────────────────────────────
//  §A  ADDITIONAL STRUCTURAL DIVERSITY (gap-filling)
// ─────────────────────────────────────────────────────────────────────────────

// test1326: O(n)
// pair<int,int> parameter; both elements summed as a compound alias,
// one sequential loop.
int test1326(pair<int,int> p) {
    int total = p.first + p.second;
    int s = 0;
    for (int i = 0; i < total; i++) s++;
    return s;
    // total = n + m => O(n+m)
}
// EXPECTED for test1326: O(n+m) where n=p.first, m=p.second

// test1327: O(n*m)
// pair<int,int>; nested loop using first and second.
int test1327(pair<int,int> p) {
    int s = 0;
    for (int i = 0; i < p.first; i++)
        for (int j = 0; j < p.second; j++) s++;
    return s;
}

// test1328: O(n)
// tuple<int,int,int>; std::get<0> as loop bound.
int test1328(tuple<int,int,int>& t) {
    int n = get<0>(t);
    int s = 0;
    for (int i = 0; i < n; i++) s++;
    return s;
}

// test1329: O(n+m+r)
// tuple<int,int,int>; three sequential loops via get<0>, get<1>, get<2>.
int test1329(tuple<int,int,int>& t) {
    int n = get<0>(t), m = get<1>(t), r = get<2>(t);
    int s = 0;
    for (int i = 0; i < n; i++) s++;
    for (int i = 0; i < m; i++) s++;
    for (int i = 0; i < r; i++) s++;
    return s;
}

// test1330: O(n*m*r)
// tuple<int,int,int>; triple-nested loop via get.
int test1330(tuple<int,int,int>& t) {
    int n = get<0>(t), m = get<1>(t), r = get<2>(t);
    int s = 0;
    for (int i = 0; i < n; i++)
        for (int j = 0; j < m; j++)
            for (int k = 0; k < r; k++) s++;
    return s;
}

// test1331: O(n)
// optional<int>::value() as loop bound (if has_value).
int test1331(optional<int>& opt) {
    if (!opt.has_value()) return 0;
    int n = opt.value();
    int s = 0;
    for (int i = 0; i < n; i++) s++;
    return s;
    // n = opt.value() — deterministic alias via value() call
}

// test1332: Unknown
// optional<int> used as bound without checking has_value — the loop
// could throw or be undefined; regardless the value is from an optional
// whose population is opaque.
int test1332(optional<int>& opt) {
    int n = opt.value_or(0);   // value_or returns a runtime-determined int
    int s = 0;
    for (int i = 0; i < n; i++) s++;
    return s;
    // value_or is a function call whose return value is opaque => Unknown
}

// test1333: O(n)
// Range-for over a span<int> — C++20 span, but usable in C++17 with
// a simple manual span struct.
int test1333(int* data, int n) {
    // Manual span simulation (no pointer arithmetic for the loop bound):
    int s = 0;
    for (int i = 0; i < n; i++) s += fshB(data[i]);  // O(1) per step
    return s;
    // O(n)
}

// test1334: O(n)
// String_view — .size() as loop bound.
int test1334(string_view sv) {
    int n = (int)sv.size();
    int s = 0;
    for (int i = 0; i < n; i++) s++;
    return s;
}

// test1335: O(n)
// Range-for over string_view.
int test1335(string_view sv) {
    int s = 0;
    for (char c : sv) { (void)c; s++; }
    return s;
}

// test1336: O(n+m)
// string_view + string: sizes summed.
int test1336(string_view sv, string& str) {
    int n = (int)sv.size();
    int m = (int)str.size();
    int s = 0;
    for (int i = 0; i < n; i++) s++;
    for (int i = 0; i < m; i++) s++;
    return s;
}

// ─────────────────────────────────────────────────────────────────────────────
//  DEEP DOMINANCE — FULL FIVE-TERM SEQUENCES (new term combinations)
// ─────────────────────────────────────────────────────────────────────────────

// test1337: O(n^3)
// Four sequential helper calls, then a final loop — dominant is the first
// (O(n^3)).
int test1337(int n) {
    int s = fshF(fshE(n,n));   // fshF(fshE(n,n)) — but fshE returns a value
    // Avoid passing return value as bound; just call all helpers and sum:
    int r = 0;
    r += fshH(n);              // O(n*log n)
    r += fshG(n, n);           // O(n)  (n+n)
    r += fshC(n);              // O(log n)
    r += fshF(n);              // O(n^2)
    r += fshA(fshA(0));        // O(1) (fshA(0) = 0)
    // Dominant: O(n^2)
    return r + (int)s;
}
// EXPECTED for test1337: O(n^2)
// (fshH = O(n*log n), fshG(n,n) = O(n), fshC = O(log n), fshF = O(n^2))

// test1338: O(n*log(n))
// fshH(n) [O(n*log n)] + fshA(n) [O(n)] + fshC(n) [O(log n)]
int test1338(int n) {
    return fshH(n) + fshA(n) + fshC(n);
}

// test1339: O(n^2)
// fshF(n) [O(n^2)] + fshH(n) [O(n*log n)] + fshA(n) [O(n)]
int test1339(int n) {
    return fshF(n) + fshH(n) + fshA(n);
}

// test1340: O(n*m)
// fshE(n,m) [O(n*m)] + fshG(n,m) [O(n+m)] + fshA(n) [O(n)]
int test1340(int n, int m) {
    return fshE(n, m) + fshG(n, m) + fshA(n);
}

// ─────────────────────────────────────────────────────────────────────────────
//  CONTINUED STRUCTURAL VARIETY — TESTS 1341–1500
// ─────────────────────────────────────────────────────────────────────────────

// ── Reference + IIFE + container alias combo ──────────────────────────────────

// test1341: O(n)
// Reference to param; IIFE using the reference; loop inside IIFE.
int test1341(int n) {
    int& r = n;
    return [&r]() {
        int s = 0;
        for (int i = 0; i < r; i++) s++;
        return s;
    }();
}

// test1342: O(n*m)
// Two references; nested IIFE returning nested loop result.
int test1342(int n, int m) {
    int& rn = n;
    int& rm = m;
    return [&rn, &rm]() {
        int s = 0;
        for (int i = 0; i < rn; i++)
            for (int j = 0; j < rm; j++) s++;
        return s;
    }();
}

// ── typedef + reference + ILOOP + fshD chain ─────────────────────────────────

// test1343: O(n)
// typedef Idx = int; Idx& ref = n; ILOOP(i, ref) calls fshB (O(1)).
int test1343(int n) {
    typedef int Idx;
    Idx& ref = n;
    int s = 0;
    ILOOP(i, ref) s += fshB(i);
    return s;
}

// test1344: O(n*log(n))
// typedef Bound; Bound lim = n; outer ILOOP + inner fshC(lim).
int test1344(int n) {
    typedef int Bound;
    Bound lim = n;
    int s = 0;
    ILOOP(i, lim) s += fshC(lim);
    return s;
}

// test1345: O(n^2)
// using Cnt = int; Cnt a = n; ILOOP outer (a), inner fshA(a).
int test1345(int n) {
    using Cnt = int;
    Cnt a = n;
    int s = 0;
    ILOOP(i, a) s += fshA(a);
    return s;
}

// ── Const-ref param + alias + deep nesting ────────────────────────────────────

// test1346: O(n)
// const int& param; local alias; loop on alias.
int test1346(const int& n) {
    int lim = n;
    int s = 0;
    for (int i = 0; i < lim; i++) s++;
    return s;
}

// test1347: O(n+m)
// const int& two params; sequential loops via aliases.
int test1347(const int& n, const int& m) {
    int a = n, b = m;
    int s = 0;
    for (int i = 0; i < a; i++) s++;
    for (int i = 0; i < b; i++) s++;
    return s;
}

// test1348: O(n*m)
// const int& two params; nested loops.
int test1348(const int& n, const int& m) {
    int s = 0;
    for (int i = 0; i < n; i++)
        for (int j = 0; j < m; j++) s++;
    return s;
}

// ── Nested scope alias convergence (new patterns) ─────────────────────────────

// test1349: O(n)
// Alias declared in a for-loop init, re-used in a nested inner loop.
int test1349(int n) {
    int total = 0;
    for (int lim = n, i = 0; i < lim; i++) {
        int bound = lim;   // inner alias of for-init alias
        total += bound > 0 ? 1 : 0;   // O(1) per iter
    }
    return total;
    // lim = n in for-init; loop runs n times => O(n)
}

// test1350: O(n^2)
// Alias in for-init used as BOTH outer and inner bound.
int test1350(int n) {
    int s = 0;
    for (int lim = n, i = 0; i < lim; i++)
        for (int j = 0; j < lim; j++) s++;   // lim = n for both
    return s;
}

// ── Five-level scope nesting, new patterns ────────────────────────────────────

// test1351: O(n)
// Five nested scopes; alias chain one-per-scope; loop in deepest.
int test1351(int n) {
    int s = 0;
    int a = n;
    { int b = a;
      { int c = b;
        { int d = c;
          { int e = d;
            { for (int i = 0; i < e; i++) s++; }
          }
        }
      }
    }
    return s;
}

// test1352: O(n*m)
// Two separate five-deep scope chains for n and m; nested loop in innermost.
int test1352(int n, int m) {
    int s = 0;
    int a = n;
    { int b = a;
      { int c = b;
        int p = m;
        { int q = p;
          { for (int i = 0; i < c; i++)
                for (int j = 0; j < q; j++) s++;
          }
        }
      }
    }
    return s;
}

// ── for-range with index-tracking ─────────────────────────────────────────────

// test1353: O(n)
// Range-for over vector with a separately maintained index counter.
int test1353(vector<int>& v) {
    int idx = 0, s = 0;
    for (auto& x : v) { s += fshB(x); idx++; }
    (void)idx;
    return s;
    // |v| = n iterations * O(1) = O(n)
}

// test1354: O(n^2)
// Range-for outer over vector (|v|=n); inner indexed loop over n again.
int test1354(vector<int>& v) {
    int n = (int)v.size();
    int s = 0;
    for (auto& x : v) {
        (void)x;
        for (int j = 0; j < n; j++) s++;
    }
    return s;
    // n * n = O(n^2)
}

// test1355: O(n*m)
// Range-for outer over v (|v|=n); inner range-for over u (|u|=m).
int test1355(vector<int>& v, vector<int>& u) {
    int s = 0;
    for (auto& x : v) {
        (void)x;
        for (auto& y : u) { (void)y; s++; }
    }
    return s;
}

// ── Step forms: i += constant > 1 ─────────────────────────────────────────────

// test1356: O(n)
// for(i=0; i<n; i+=5) — step 5, still O(n/5) = O(n).
int test1356(int n) {
    int s = 0;
    for (int i = 0; i < n; i += 5) s++;
    return s;
}

// test1357: O(n)
// for(i=0; i<n; i+=10) with alias.
int test1357(int n) {
    int lim = n;
    int s = 0;
    for (int i = 0; i < lim; i += 10) s++;
    return s;
}

// test1358: O(n)
// for(i=n-1; i>=0; i-=3) — decreasing, O(n/3) = O(n).
int test1358(int n) {
    int s = 0;
    for (int i = n - 1; i >= 0; i -= 3) s++;
    return s;
}

// ── Multiple assignments to the same alias variable from unrelated sources ─────

// test1359: Unknown
// Three successive assignments to 'lim' from three DIFFERENT symbolic sources
// before the loop — the engine cannot determine which is active at loop entry
// without data-flow / reaching-definitions analysis.
int test1359(int n, int m, int r) {
    int lim = n;
    lim = m;   // overwrites
    lim = r;   // overwrites again
    int s = 0;
    for (int i = 0; i < lim; i++) s++;
    return s;
    // Final value is r, but overwrite chain: structurally ambiguous for an
    // engine that does NOT perform def-use / reaching-definitions analysis.
    // Conservative: Unknown.
}

// test1360: O(n)
// Variable overwritten multiple times, but all from the SAME source.
int test1360(int n) {
    int lim = n;
    lim = n;   // re-assignment from same source
    lim = n;   // again
    int s = 0;
    for (int i = 0; i < lim; i++) s++;
    return s;
    // All assignments are from n => lim = n => O(n)
}

// ── Empty for-loop bodies with non-trivial update expressions ─────────────────

// test1361: O(n)
// for(; s < n; s++) ; — all work in update, empty body.
int test1361(int n) {
    int s = 0;
    for (; s < n; s++) ;
    return s;
}

// test1362: O(log n)
// for(int i=n; i>0; i/=2) ; — empty body, bound from halving update.
int test1362(int n) {
    int c = 0;
    for (int i = n; i > 0; i /= 2, c++) ;
    return c;
}

// test1363: O(n)
// while(n-- > 0) s++; — decrement in condition, O(n) iterations.
int test1363(int n) {
    int s = 0;
    while (n-- > 0) s++;
    return s;
    // n decrements from n to 0 in condition => O(n)
}

// test1364: Unknown
// while(--n > 0) — pre-decrement in condition.  The bound is n-1 but the
// variable n is MUTATED in the condition expression itself, creating an
// assignment-in-condition pattern that is structurally unusual.
int test1364(int n) {
    int s = 0;
    while (--n > 0) s++;
    return s;
    // n is mutated inside the condition; bound variable is written during
    // each condition evaluation => Unknown by bound-mutation policy.
}

// ── Nested containers — size combinations ─────────────────────────────────────

// test1365: O(n)
// vector<vector<int>> outer size.
int test1365(vector<vector<int>>& g) {
    int n = (int)g.size();
    int s = 0;
    for (int i = 0; i < n; i++) s++;
    return s;
}

// test1366: O(n*m)
// vector<vector<int>>, outer n, inner g[0].size() = m (alias of first row).
int test1366(vector<vector<int>>& g) {
    int n = (int)g.size();
    int m = (int)g[0].size();
    int s = 0;
    for (int i = 0; i < n; i++)
        for (int j = 0; j < m; j++) s++;
    return s;
}

// test1367: O(n+m)
// vector<set<int>> outer n; a separate param m for sequential second loop.
int test1367(vector<set<int>>& vs, int m) {
    int n = (int)vs.size();
    int s = 0;
    for (int i = 0; i < n; i++) s++;
    for (int i = 0; i < m; i++) s++;
    return s;
}

// test1368: O(n)
// map<string,int> size alias.
int test1368(map<string,int>& mp) {
    int n = (int)mp.size();
    int s = 0;
    for (int i = 0; i < n; i++) s++;
    return s;
}

// test1369: O(n)
// unordered_map<string,vector<int>> size alias.
int test1369(unordered_map<string,vector<int>>& mp) {
    int n = (int)mp.size();
    int s = 0;
    for (int i = 0; i < n; i++) s++;
    return s;
}

// ── Combination: if-init + structured binding + LOG_LOOP ──────────────────────

// test1370: O(log n)
// if-init declares alias; structured binding is inside the if body;
// LOG_LOOP uses the alias from the init.
int test1370(pair<int,int>& p) {
    int c = 0;
    if (int n = p.first; n > 0) {
        LOG_LOOP(i, n) c++;
    }
    return c;
    // n = p.first; LOG_LOOP runs log(n) times => O(log n)
}

// test1371: O(n)
// Switch-init + auto alias inside case body.
int test1371(vector<int>& v, int mode) {
    int s = 0;
    switch (int n = (int)v.size(); mode) {
        case 0: {
            auto lim = n;
            for (int i = 0; i < lim; i++) s++;
            break;
        }
        default:
            ILOOP(i, n) s++;
    }
    return s;
    // Both paths: O(n)
}

// ── IIFE chain passing result through multiple lambda layers ───────────────────

// test1372: O(n)
// Three nested IIFEs, each passing the result of the outer as an argument
// to the inner (IIFE-of-IIFE-of-IIFE pattern).
int test1372(int n) {
    return [n]() {
        return [n]() {
            return [n]() {
                int s = 0;
                for (int i = 0; i < n; i++) s++;
                return s;
            }();
        }();
    }();
}

// test1373: O(n*m)
// IIFE pair: first IIFE computes n-bound result; second IIFE computes
// m-bound result; their product is the return — but we want structural
// clarity:  outer IIFE runs n*m nested iterations.
int test1373(int n, int m) {
    return [n, m]() {
        return [n, m]() {
            int s = 0;
            for (int i = 0; i < n; i++)
                for (int j = 0; j < m; j++) s++;
            return s;
        }();
    }();
}

// ── Multiple return paths, all converging to O(n), via different code shapes ──

// test1374: O(n)
// if/else if/else with three different loop forms all O(n).
int test1374(int n, int mode) {
    if (mode == 0) {
        int s = 0;
        ILOOP(i, n) s++;
        return s;
    } else if (mode == 1) {
        return fshA(n);
    } else {
        int s = 0;
        ILOOP_R(i, n) s++;
        return s;
    }
}

// test1375: O(n)
// Local struct's run() called from each branch, all O(n).
int test1375(int n, bool flag) {
    struct Runner {
        int run(int k) { int s=0; for(int i=0;i<k;i++) s++; return s; }
    };
    Runner r;
    if (flag) return r.run(n);
    else      return r.run(n);
}

// ── Compound symbolic additive bounds with container sizes ────────────────────

// test1376: O(n+m)
// v.size() + u.size() added via ADD2 macro directly in loop bound.
int test1376(vector<int>& v, vector<int>& u) {
    int n = (int)v.size();
    int m = (int)u.size();
    int s = 0;
    ILOOP(i, ADD2(n, m)) s++;
    return s;
}

// test1377: O(n+m+r)
// Three container sizes added via ADD3 macro.
int test1377(vector<int>& v, set<int>& st, deque<int>& dq) {
    int n = (int)v.size();
    int m = (int)st.size();
    int r = (int)dq.size();
    int s = 0;
    ILOOP(i, ADD3(n, m, r)) s++;
    return s;
}

// test1378: O(n+m+r+t)
// Four container sizes via ADD4 macro.
int test1378(vector<int>& v, deque<int>& dq,
             set<int>& st, multiset<int>& ms) {
    int n = (int)v.size();
    int m = (int)dq.size();
    int r = (int)st.size();
    int t = (int)ms.size();
    int s = 0;
    ILOOP(i, ADD4(n, m, r, t)) s++;
    return s;
}

// ── Compound additive tree aliases fed to helpers ─────────────────────────────

// test1379: O(n+m)
// ADD2(n,m) alias passed to fshA (linear helper) — fshA(n+m) = O(n+m).
int test1379(int n, int m) {
    int total = ADD2(n, m);
    return fshA(total);
}

// test1380: O(n+m+r)
// ADD3 alias fed to fshA.
int test1380(int n, int m, int r) {
    int total = ADD3(n, m, r);
    return fshA(total);
}

// test1381: O(n+m)
// ADD2 alias through a reference, then loop.
int test1381(int n, int m) {
    int sum = ADD2(n, m);
    int& rsm = sum;
    int s = 0;
    for (int i = 0; i < rsm; i++) s++;
    return s;
}

// ── Interesting loop-header combinations ──────────────────────────────────────

// test1382: O(n)
// for-loop with both init AND condition as comma expressions.
int test1382(int n) {
    int s = 0;
    int j = 0;
    for ((void)0, j = 0; (j < n, j < n); j++) s++;  // comma in condition: last operand
    return s;
    // condition's last operand is j < n => O(n)
}

// test1383: O(n)
// for-loop where the init declares a variable that is BOTH an alias for n
// and immediately used in a compound comma expression to also set another var.
int test1383(int n) {
    int s = 0;
    int x;
    for (int lim = (x = n, n); s < lim; s++) ;
    // lim = (x=n, n) = n; loop while s < n; => O(n)
    return s;
}

// test1384: O(n)
// while with compound-assignment condition: while ((i += 1) <= n).
int test1384(int n) {
    int i = 0, s = 0;
    while ((i += 1) <= n) s++;
    return s;
    // i increments from 1..n+1; loop runs n times => O(n)
}

// test1385: O(n)
// for-loop where the update is a POST-increment on a pointer-to-int that
// points to the loop counter, but the counter itself drives the bound.
// Use a plain int form to stay out of pointer-arithmetic Unknown territory:
// int* p = &i; ... (*p)++ in the update clause.
int test1385(int n) {
    int s = 0;
    int i = 0;
    int* p = &i;
    for (; i < n; (*p)++) s++;
    return s;
    // The update (*p)++ increments *p which IS i => O(n). However the update
    // is through a pointer to the loop variable — this is structurally unusual.
    // If the engine does not resolve *p as aliasing i, it may be Unknown.
}
// EXPECTED for test1385: Unknown
// (loop update is (*p)++, not i++; pointer dereference in update clause
// is outside standard counter-increment patterns)

// ── Parametrized helper composition (new combos not in prior batches) ─────────

// test1386: O(n)
// fshD(n) calls fshA(n)+fshB(0) = O(n)+O(1) = O(n).
int test1386(int n) {
    return fshD(n);
}

// test1387: O(n+m)
// fshG(n,m) = O(n+m).
int test1387(int n, int m) {
    return fshG(n, m);
}

// test1388: O(n*m)
// fshE(n,m) = O(n*m).
int test1388(int n, int m) {
    return fshE(n, m);
}

// test1389: O(n^2)
// fshF(n) = fshE(n,n) = O(n^2).
int test1389(int n) {
    return fshF(n);
}

// test1390: O(n*log(n))
// fshH(n) = O(n*log n).
int test1390(int n) {
    return fshH(n);
}

// test1391: O(n^2)
// Outer ILOOP over n, inner fshA(n) per step.
int test1391(int n) {
    int s = 0;
    ILOOP(i, n) s += fshA(n);
    return s;
}

// test1392: O(n*log(n))
// Outer ILOOP over n, inner fshC(n) per step.
int test1392(int n) {
    int s = 0;
    ILOOP(i, n) s += fshC(n);
    return s;
}

// test1393: O(n*m)
// Outer ILOOP over n, inner fshA(m) per step.
int test1393(int n, int m) {
    int s = 0;
    ILOOP(i, n) s += fshA(m);
    return s;
}

// test1394: O(n*m^2)
// Outer ILOOP over n, inner fshF(m) = O(m^2) per step.
int test1394(int n, int m) {
    int s = 0;
    ILOOP(i, n) s += fshF(m);
    return s;
}

// test1395: O(n*(m+r))
// Outer ILOOP over n, inner fshG(m,r) = O(m+r) per step.
int test1395(int n, int m, int r) {
    int s = 0;
    ILOOP(i, n) s += fshG(m, r);
    return s;
}

// ── More lambda-loop combos ────────────────────────────────────────────────────

// test1396: O(n)
// Lambda stored in a local variable; called n times from a loop.
int test1396(int n) {
    auto step = [](int x) { return fshB(x); };  // O(1)
    int s = 0;
    for (int i = 0; i < n; i++) s += step(i);
    return s;
}

// test1397: O(n^2)
// Lambda is O(n); called n times.
int test1397(int n) {
    auto worker = [n]() { int acc=0; for(int i=0;i<n;i++) acc++; return acc; };
    int s = 0;
    for (int k = 0; k < n; k++) s += worker();
    return s;
}

// test1398: O(n+m)
// Two lambdas called sequentially; first O(n), second O(m).
int test1398(int n, int m) {
    auto fn1 = [n]() { int s=0; for(int i=0;i<n;i++) s++; return s; };
    auto fn2 = [m]() { int s=0; for(int i=0;i<m;i++) s++; return s; };
    return fn1() + fn2();
}

// test1399: O(log n)
// Lambda captures n, contains LOG_LOOP.
int test1399(int n) {
    auto fn = [n]() {
        int c = 0;
        LOG_LOOP(i, n) c++;
        return c;
    };
    return fn();
}

// test1400: O(n*log(n))
// Lambda with nested loops: outer n, inner log(n).
int test1400(int n) {
    auto fn = [n]() {
        int s = 0;
        for (int i = 0; i < n; i++)
            for (int j = n; j > 0; j >>= 1) s++;
        return s;
    };
    return fn();
}

// ── Constexpr lambda (C++17) ──────────────────────────────────────────────────

// test1401: O(1)
// constexpr lambda with compile-time constant argument — O(1).
int test1401(int x) {
    constexpr auto square = [](int k) constexpr { return k * k; };
    constexpr int val = square(7);   // 49, compile-time
    return x + val;
    // O(1): only arithmetic, no runtime loops
}

// test1402: O(n)
// constexpr lambda called with a runtime argument — the lambda body contains
// a runtime loop, so the call is O(n) at runtime.
int test1402(int n) {
    auto fn = [](int k) {
        int s = 0;
        for (int i = 0; i < k; i++) s++;
        return s;
    };
    return fn(n);
    // O(n) runtime
}

// ── Unusual but valid C++17 loop patterns ─────────────────────────────────────

// test1403: O(n)
// Ranged-for with a custom iterator class (local struct with begin/end).
int test1403(int n) {
    struct Range {
        struct Iter {
            int cur;
            Iter(int v) : cur(v) {}
            int operator*() const { return cur; }
            Iter& operator++() { ++cur; return *this; }
            bool operator!=(const Iter& o) const { return cur != o.cur; }
        };
        int lo, hi;
        Range(int l, int h) : lo(l), hi(h) {}
        Iter begin() { return Iter(lo); }
        Iter end()   { return Iter(hi); }
    };
    int s = 0;
    for (auto v : Range(0, n)) { (void)v; s++; }
    return s;
    // Iterates n times (0 to n-1) => O(n)
    // NOTE: the engine must recognize the ranged-for as O(n) if it can
    // resolve the begin/end to produce n iterations.  If not: Unknown.
}
// EXPECTED for test1403: Unknown
// (custom iterator class with operator++/!= — the engine cannot statically
// determine the iteration count without analyzing the iterator's increment
// semantics)

// test1404: O(n)
// Nested init-capture lambda (C++14/17): [inner = n]() which is equivalent
// to capturing a COMPUTED value.  The captured value is n (no computation).
int test1404(int n) {
    auto fn = [captured = n]() {
        int s = 0;
        for (int i = 0; i < captured; i++) s++;
        return s;
    };
    return fn();
    // captured = n; loop runs n times => O(n)
}

// test1405: O(n)
// Lambda with init-capture that COPIES a container alias: [sz = (int)v.size()].
int test1405(vector<int>& v) {
    auto fn = [sz = (int)v.size()]() {
        int s = 0;
        for (int i = 0; i < sz; i++) s++;
        return s;
    };
    return fn();
    // sz = v.size() captured at lambda creation; loop runs sz times => O(n)
}

// test1406: O(n)
// Lambda with init-capture computing an alias from n: [lim = n*1].
// n*1 is an arithmetic expression, not a supported additive alias — but
// the result is structurally a multiplication of a parameter by a constant.
// Conservative engine may mark Unknown if it doesn't fold constant multiplications.
int test1406(int n) {
    auto fn = [lim = n * 1]() {   // n*1 = n, but structurally a product
        int s = 0;
        for (int i = 0; i < lim; i++) s++;
        return s;
    };
    return fn();
}
// EXPECTED for test1406: Unknown
// (lim = n*1 is a multiplication expression, not a supported alias form;
// constant folding n*1 requires arithmetic simplification)

// ── Aggregate initialization diversity ────────────────────────────────────────

// test1407: O(n)
// struct with an int and a vector member; int member used as bound.
int test1407(int n) {
    struct Container {
        int cap;
        vector<int> data;
    };
    Container c{n, {}};
    int s = 0;
    for (int i = 0; i < c.cap; i++) s++;
    return s;
}

// test1408: O(n)
// Nested struct aggregate: outer.inner.val used as bound.
int test1408(int n) {
    struct Inner3 { int val; };
    struct Outer3 { Inner3 inner3; };
    Outer3 o{ {n} };
    int s = 0;
    for (int i = 0; i < o.inner3.val; i++) s++;
    return s;
    // o.inner3.val = n => O(n)
}

// test1409: Unknown
// Struct member is itself the RESULT of an O(n) expression at initialization.
int test1409(int n) {
    struct Box3 { int sz; };
    Box3 b{fshA(n)};   // fshA(n) returns value ~n, but is an opaque call result
    int s = 0;
    for (int i = 0; i < b.sz; i++) s++;
    return s;
    // b.sz = fshA(n) — opaque return value used as loop bound => Unknown
}

// ── Sparse structural patterns ────────────────────────────────────────────────

// test1410: O(n)
// Single statement function: return an IIFE that iterates n times.
int test1410(int n) { return [n](){ int s=0; for(int i=0;i<n;i++) s++; return s; }(); }

// test1411: O(n*m)
// Single statement: nested lambda.
int test1411(int n, int m) {
    return [n,m](){ int s=0; for(int i=0;i<n;i++) for(int j=0;j<m;j++) s++; return s; }();
}

// test1412: O(log n)
// Single statement: log IIFE.
int test1412(int n) { return [n](){ int c=0; for(int i=n;i>0;i>>=1) c++; return c; }(); }

// ── switch inside a lambda ────────────────────────────────────────────────────

// test1413: O(n)
// Lambda body contains a switch where all cases loop over n.
int test1413(int n, int mode) {
    auto fn = [n, mode]() {
        int s = 0;
        switch (mode) {
            case 0: for (int i=0; i<n; i++) s++; break;
            case 1: { ILOOP(j, n) s++; } break;
            default: s = fshA(n); break;
        }
        return s;
    };
    return fn();
    // All cases: O(n)
}

// test1414: Unknown
// Lambda body switch where cases differ in complexity.
int test1414(int n, int m, int mode) {
    auto fn = [n, m, mode]() {
        int s = 0;
        switch (mode) {
            case 0: for (int i=0; i<n; i++) s++;          break;  // O(n)
            case 1: for (int i=0; i<n; i++)
                        for(int j=0; j<m; j++) s++;       break;  // O(n*m)
            default: s = fshB(n);                          break;  // O(1)
        }
        return s;
    };
    return fn();
    // Different complexities across cases => Unknown
}

// ── Deep paren + macro + reference combos ─────────────────────────────────────

// test1415: O(n)
// Reference to deeply-parenthesized cast: int& r = (int&)(((n))); — well-formed
// reference initialization from a parenthesized expression.
int test1415(int n) {
    int& r = (n);   // reference to parenthesized lvalue
    int s = 0;
    ILOOP(i, ((r))) s++;
    return s;
}

// test1416: O(n)
// typedef ref type + IIFE + deeply paren alias all combined.
int test1416(int n) {
    typedef int& IRef;
    IRef r = n;
    int lim = (((r)));
    return [lim](){ int s=0; ILOOP(i,lim) s++; return s; }();
}

// test1417: O(n+m)
// using alias for pair reference; structured binding; ADD2 macro; ILOOP.
int test1417(pair<int,int>& p) {
    using PR = pair<int,int>&;
    PR rp = p;
    auto [a, b] = rp;
    int total = ADD2(a, b);
    int s = 0;
    ILOOP(i, total) s++;
    return s;
}

// test1418: O(n*m)
// if-init + structured binding + NEST_ILOOP.
int test1418(pair<int,int>& p) {
    int s = 0;
    if (auto [n, m] = p; n > 0 && m > 0) {
        NEST_ILOOP(i, n, j, m) s++;
    }
    return s;
}

// test1419: O(n)
// Constexpr if with a runtime-evaluated branch (the constexpr false branch is
// discarded at compile time, leaving only the O(n) branch at runtime).
template<bool Fast>
int test1419_impl(int n) {
    if constexpr (Fast) {
        return fshA(n);             // O(n)
    } else {
        int s = 0;
        for (int i = 0; i < n; i++)
            for (int j = 0; j < n; j++) s++;  // O(n^2), discarded
        return s;
    }
}
int test1419(int n) {
    return test1419_impl<true>(n);
    // constexpr if selects O(n) branch => O(n)
}

// test1420: O(n^2)
// Same template with Fast=false.
int test1420(int n) {
    return test1419_impl<false>(n);
    // constexpr if selects O(n^2) branch => O(n^2)
}

// ── Combining previously-novel concepts ───────────────────────────────────────

// test1421: O(n)
// do-while + lambda + ILOOP macro chain.
int test1421(int n) {
    auto fn = [n]() {
        int s = 0;
        if (n > 0) {
            int i = 0;
            do { s++; i++; } while (i < n);
        }
        return s;
    };
    return fn();
}

// test1422: O(n*m)
// switch-init + IIFE + NEST_ILOOP.
int test1422(int n, int m, int mode) {
    return [n, m, mode]() {
        int s = 0;
        switch (int g = mode; g) {
            default: NEST_ILOOP(i, n, j, m) s++;
        }
        return s;
    }();
}

// test1423: O(n)
// Local struct inside a lambda inside a for-loop body — struct created each
// iteration, O(1) per creation, loop is O(n).
int test1423(int n) {
    int s = 0;
    for (int i = 0; i < n; i++) {
        auto fn = [i]() {
            struct Tiny { int v; };
            Tiny t{i};
            return fshB(t.v);  // O(1)
        };
        s += fn();
    }
    return s;
    // n * O(1) = O(n)
}

// test1424: O(n^2)
// IIFE returned from a local struct method; called inside a loop.
int test1424(int n) {
    struct Maker {
        function<int()> make(int k) {
            return [k]() {
                int s = 0;
                for (int i = 0; i < k; i++) s++;
                return s;
            };
        }
    };
    Maker mk;
    auto fn = mk.make(n);   // fn is O(n) lambda
    int s = 0;
    for (int i = 0; i < n; i++) s += fn();  // n * O(n) = O(n^2)
    return s;
}

// test1425: O(n)
// for(;;) with alias-derived break: alias lim = n; inside for(;;), break when
// counter >= lim.
int test1425(int n) {
    int lim = n;
    int& rlim = lim;
    int i = 0, s = 0;
    for (;;) {
        if (i >= rlim) break;
        s++;
        i++;
    }
    return s;
}

// test1426: O(n)
// while(true) with break at container-size cast alias.
int test1426(vector<int>& v) {
    int n = static_cast<int>(v.size());
    int i = 0, s = 0;
    while (true) {
        if (i == n) break;
        s++;
        i++;
    }
    return s;
}

// test1427: O(log n)
// for(;;) halving with break.
int test1427(int n) {
    int i = n, c = 0;
    for (;;) {
        if (i <= 0) break;
        c++;
        i /= 2;
    }
    return c;
}

// ── Regression targets for canonicalization/formatter consistency ─────────────

// test1428: O(n)
// Alias declared with ALIAS macro, then used in LOG_LOOP — alias→macro combo.
int test1428(int n) {
    ALIAS(lim, n);
    int c = 0;
    MUL_LOOP(i, lim) c++;
    return c;
}

// test1429: O(n^2)
// ALIAS for both bounds; NEST_ILOOP.
int test1429(int n) {
    ALIAS(rows, n);
    ALIAS(cols, n);
    int s = 0;
    NEST_ILOOP(i, rows, j, cols) s++;
    return s;
}

// test1430: O(n*m)
// ALIAS for two different params; NEST_ILOOP.
int test1430(int n, int m) {
    ALIAS(r, n);
    ALIAS(c, m);
    int s = 0;
    NEST_ILOOP(i, r, j, c) s++;
    return s;
}

// test1431: O(n+m)
// ALIAS for both, ADD2, ILOOP.
int test1431(int n, int m) {
    ALIAS(a, n);
    ALIAS(b, m);
    int total = ADD2(a, b);
    int s = 0;
    ILOOP(i, total) s++;
    return s;
}

// ── Further canonical boundary tests ──────────────────────────────────────────

// test1432: O(n)
// const auto + static_cast + MUL_LOOP macro.
int test1432(vector<int>& v) {
    const auto n = static_cast<int>(v.size());
    int c = 0;
    MUL_LOOP(i, n) c++;
    return c;
}

// test1433: O(n)
// using + const auto + ILOOP.
int test1433(deque<int>& dq) {
    using Sz = int;
    const Sz n = (Sz)dq.size();
    int s = 0;
    ILOOP(i, n) s++;
    return s;
}

// test1434: O(n*m)
// ALIAS + ADD3 + nested ILOOP (macro arithmetic).
int test1434(int n, int m, int r) {
    ALIAS(a, n);
    ALIAS(b, m);
    int c_val = ADD2(a, b);   // c_val = n+m
    // nested loop outer: n, inner: r
    int s = 0;
    ILOOP(i, a) ILOOP(j, r) s++;
    return s + c_val * 0;   // c_val*0 = 0, just to use c_val
    // ILOOP(i,a) ILOOP(j,r) => O(n*r)
}
// EXPECTED for test1434: O(n*r)

// test1435: O(n+m)
// Reference + structured binding + ILOOP sequential.
int test1435(pair<int,int>& p) {
    int& rp1 = p.first;
    int& rp2 = p.second;
    int s = 0;
    ILOOP(i, rp1) s++;
    ILOOP(i, rp2) s++;
    return s;
}

// test1436: O(n*m)
// Structured binding + reference + NEST_ILOOP.
int test1436(pair<int,int>& p) {
    auto [a, b] = p;
    int& ra = a;
    int& rb = b;
    int s = 0;
    NEST_ILOOP(i, ra, j, rb) s++;
    return s;
}

// ── Heavy-container-size chains ────────────────────────────────────────────────

// test1437: O(n)
// unordered_multiset.size() → static_cast → typedef → 4-hop alias → ILOOP.
int test1437(unordered_multiset<int>& ums) {
    typedef int Sz;
    Sz raw = static_cast<Sz>(ums.size());
    int a = raw;
    int b = a;
    int c = b;
    int d = c;
    int s = 0;
    ILOOP(i, d) s++;
    return s;
}

// test1438: O(n+m)
// Two rare containers; sizes summed via ADD2; ILOOP.
int test1438(unordered_multimap<int,int>& umm, unordered_multiset<int>& ums) {
    int n = static_cast<int>(umm.size());
    int m = static_cast<int>(ums.size());
    int total = ADD2(n, m);
    int s = 0;
    ILOOP(i, total) s++;
    return s;
}

// test1439: O(n*m)
// map<string,vector<int>> size * deque<pair<int,int>> size; nested ILOOP.
int test1439(map<string,vector<int>>& mp, deque<pair<int,int>>& dq) {
    int n = (int)mp.size();
    int m = (int)dq.size();
    int s = 0;
    NEST_ILOOP(i, n, j, m) s++;
    return s;
}

// test1440: O(n)
// priority_queue size alias via static_cast, ALIAS macro, MUL_LOOP.
int test1440(priority_queue<int>& pq) {
    int raw = static_cast<int>(pq.size());
    ALIAS(lim, raw);
    int c = 0;
    MUL_LOOP(i, lim) c++;
    return c;
}

// ── Final batch (1441–1500) ────────────────────────────────────────────────────

// test1441: O(n)
// Local class inside a lambda (class-in-lambda pattern).
int test1441(int n) {
    auto fn = [n]() {
        class Worker2 {
        public:
            int run(int k) { int s=0; for(int i=0;i<k;i++) s++; return s; }
        };
        Worker2 w;
        return w.run(n);
    };
    return fn();
}

// test1442: O(n^2)
// Lambda inside local struct method, called from outer loop.
int test1442(int n) {
    struct Eng2 {
        int run(int k) {
            auto inner = [k]() {
                int s = 0;
                for (int i = 0; i < k; i++) s++;
                return s;
            };
            int total = 0;
            for (int i = 0; i < k; i++) total += inner();
            return total;
        }
    };
    Eng2 e;
    return e.run(n);
    // n outer * O(n) inner = O(n^2)
}

// test1443: O(n)
// Recursive-like alias chain through struct members.
int test1443(int n) {
    struct Node {
        int val;
        int nexval() const { return val; }
    };
    Node nd{n};
    int lim = nd.nexval();
    int s = 0;
    for (int i = 0; i < lim; i++) s++;
    return s;
    // nd.nexval() returns nd.val = n; loop runs n times.
    // NOTE: the return value of nexval() is used as loop bound — if the engine
    // treats it as an opaque function call, this is Unknown.
}
// EXPECTED for test1443: Unknown
// (nexval() is a method call whose return value is used as loop bound)

// test1444: O(n)
// Using std::min with a compile-time constant — std::min(n, INT_MAX).
// The engine should recognize this as opaque (std::min is a function call
// returning an unknown value relative to n) and mark Unknown.
int test1444(int n) {
    int lim = min(n, INT_MAX);   // min(n, INT_MAX) = n for any valid n
    int s = 0;
    for (int i = 0; i < lim; i++) s++;
    return s;
}
// EXPECTED for test1444: Unknown
// (min() is an opaque function call; its return value is not a recognized alias)

// test1445: O(n)
// abs(n) as loop bound — opaque function call result.
int test1445(int n) {
    int lim = abs(n);
    int s = 0;
    for (int i = 0; i < lim; i++) s++;
    return s;
}
// EXPECTED for test1445: Unknown  (abs() is opaque)

// test1446: O(n)
// Swap-then-loop: n and m are swapped before the loop; loop uses 'n' which
// is now the old m value.
int test1446(int n, int m) {
    swap(n, m);   // now n = old m, m = old n
    int s = 0;
    for (int i = 0; i < n; i++) s++;
    return s;
    // After swap, n = old m; loop bound = old m => the bound is structurally
    // the result of swap() which modifies 'n' — Unknown.
}
// EXPECTED for test1446: Unknown
// (swap() writes to n; n is subsequently used as loop bound; bound variable
// was written by an opaque function call)

// test1447: O(n)
// sort(v.begin(), v.end()) then size-alias loop.
int test1447(vector<int>& v) {
    sort(v.begin(), v.end());   // O(n log n) but it's a CALL BEFORE the loop
    int n = (int)v.size();
    int s = 0;
    for (int i = 0; i < n; i++) s++;
    return s;
    // sort is O(n log n); subsequent loop is O(n); together O(n log n).
    // But from AST perspective: sort() is an opaque call (not a loop the
    // engine can analyze directly), followed by a recognized O(n) loop.
    // The engine should report O(n) for the loop it CAN analyze, and may
    // or may not account for the sort() call.
    // Conservative: sort() complexity is unknown to the engine (opaque call),
    // loop is O(n) — result depends on whether the engine includes the
    // sort call's cost.
}
// EXPECTED for test1447: O(n)
// (The loop after sort is O(n); sort() itself is an opaque call whose
// internal loops the engine does not see — the visible structure is O(n))

// test1448: Unknown
// reverse(v.begin(), v.end()) — O(n) STL call — followed by a loop using
// the RETURN VALUE of reverse (void, so s is unchanged — OK).
// Different: use lower_bound which returns an iterator; cast to index as
// distance().  Actually keep simple: use a fill() call whose return value
// is used as loop bound (void, so make it: transform).
// For a genuine Unknown: use std::distance() as loop bound source.
int test1448(vector<int>& v, int target) {
    auto it = lower_bound(v.begin(), v.end(), target);
    int lim = (int)(it - v.begin());   // pointer arithmetic: opaque
    int s = 0;
    for (int i = 0; i < lim; i++) s++;
    return s;
    // lim is from iterator subtraction (pointer arithmetic) => Unknown
}

// test1449: Unknown
// std::find returns iterator; distance to begin used as loop bound.
int test1449(vector<int>& v, int val) {
    auto it = find(v.begin(), v.end(), val);
    ptrdiff_t pos = it - v.begin();   // pointer arithmetic
    int s = 0;
    for (ptrdiff_t i = 0; i < pos; i++) s++;
    return s;
}

// test1450: O(n)
// fill_n on vector of size n, then size-alias loop.
int test1450(vector<int>& v) {
    int n = (int)v.size();
    fill_n(v.begin(), n, 0);   // O(n) opaque call
    int s = 0;
    for (int i = 0; i < n; i++) s++;
    return s;
    // fill_n opaque; loop O(n); combined: depends on engine
    // The visible loop is O(n)
}
// EXPECTED for test1450: O(n)

// ── Final canonical stress tests ───────────────────────────────────────────────

// test1451: O(n)
// Ten-hop alias chain from a container size, ending in BODY_LOOP macro.
int test1451(multimap<int,int>& mm) {
    int x0 = (int)mm.size();
    int x1=x0, x2=x1, x3=x2, x4=x3, x5=x4;
    int x6=x5, x7=x6, x8=x7, x9=x8, x10=x9;
    int s = 0;
    BODY_LOOP(i, x10, s++);
    return s;
}

// test1452: O(n+m)
// Ten-hop chain for each of two containers; ADD2; ILOOP.
int test1452(set<int>& st, unordered_set<int>& us) {
    int a0=(int)st.size(), a1=a0, a2=a1, a3=a2, a4=a3, a5=a4;
    int b0=(int)us.size(), b1=b0, b2=b1, b3=b2, b4=b3, b5=b4;
    int total = ADD2(a5, b5);
    int s = 0;
    ILOOP(i, total) s++;
    return s;
}

// test1453: O(n*m)
// Ten-hop each; NEST_ILOOP.
int test1453(vector<int>& v, deque<int>& dq) {
    int a0=(int)v.size(), a1=a0, a2=a1, a3=a2, a4=a3, a5=a4;
    int b0=(int)dq.size(), b1=b0, b2=b1, b3=b2, b4=b3, b5=b4;
    int s = 0;
    NEST_ILOOP(i, a5, j, b5) s++;
    return s;
}

// test1454: O(n)
// Pair of ten-hop chains; first used for ILOOP, second for a dominated fshA call.
int test1454(int n, int m) {
    int a0=n, a1=a0, a2=a1, a3=a2, a4=a3, a5=a4, a6=a5, a7=a6, a8=a7, a9=a8, a10=a9;
    int b0=m, b1=b0, b2=b1, b3=b2, b4=b3, b5=b4, b6=b5, b7=b6, b8=b7, b9=b8, b10=b9;
    (void)b10;
    int s = 0;
    ILOOP(i, a10) s++;
    return s;
    // O(n) — b10 alias is unused in loop
}

// test1455: O(n+m)
// Two ten-hop chains used in sequential ILOOP calls.
int test1455(int n, int m) {
    int a0=n, a1=a0, a2=a1, a3=a2, a4=a3, a5=a4, a6=a5, a7=a6, a8=a7, a9=a8, aa=a9;
    int b0=m, b1=b0, b2=b1, b3=b2, b4=b3, b5=b4, b6=b5, b7=b6, b8=b7, b9=b8, bb=b9;
    int s = 0;
    ILOOP(i, aa) s++;
    ILOOP(i, bb) s++;
    return s;
}

// test1456: O(n*m)
// Two ten-hop chains used in NEST_ILOOP.
int test1456(int n, int m) {
    int a0=n, a1=a0, a2=a1, a3=a2, a4=a3, a5=a4, a6=a5, a7=a6, a8=a7, a9=a8, aa=a9;
    int b0=m, b1=b0, b2=b1, b3=b2, b4=b3, b5=b4, b6=b5, b7=b6, b8=b7, b9=b8, bb=b9;
    int s = 0;
    NEST_ILOOP(i, aa, j, bb) s++;
    return s;
}

// test1457: O(n)
// Global-variable assignment guard: write n to global, then immediately
// alias from the LOCAL parameter (not the global) — still O(n).
int test1457(int n) {
    g_bound_7 = n;   // side-effect write, but loop doesn't use global
    int lim = n;     // local alias from param, not global
    int s = 0;
    for (int i = 0; i < lim; i++) s++;
    return s;
    // lim = n (local param) => O(n)
}

// test1458: O(n)
// Static constant ARRAY of sizes; loop bound from the array element with a
// COMPILE-TIME index — no pointer arithmetic needed.
int test1458(int n) {
    static const int kSizes[3] = {10, 20, 30};
    int extra = kSizes[0];   // compile-time constant element = 10
    int lim = n + extra;     // n + 10 — additive with a constant
    int s = 0;
    for (int i = 0; i < lim; i++) s++;
    return s;
    // lim = n + 10; loop = O(n+10) = O(n)
}
// EXPECTED for test1458: Unknown
// (lim = n + kSizes[0]: kSizes[0] is an array element read — opaque to
// symbol extraction even if compile-time constant in practice)

// test1459: O(n)
// std::max(n, 0) as loop bound — max with a literal is still opaque.
int test1459(int n) {
    int lim = max(n, 0);
    int s = 0;
    for (int i = 0; i < lim; i++) s++;
    return s;
}
// EXPECTED for test1459: Unknown  (max() is opaque)

// test1460: Unknown
// std::min(n, m) — opaque min of two symbolic params.
int test1460(int n, int m) {
    int lim = min(n, m);
    int s = 0;
    for (int i = 0; i < lim; i++) s++;
    return s;
}

// test1461: O(n)
// Nested local struct inside a lambda inside a function, all O(n).
int test1461(int n) {
    return [n]() {
        struct Mini { int v; int run() { return v; } };
        Mini mi{n};
        // mi.run() returns n — but opaque if not inlined:
        int lim = n;   // use param directly to stay deterministic
        int s = 0;
        for (int i = 0; i < lim; i++) s++;
        return s;
    }();
}

// test1462: O(n)
// IIFE returning a local struct that has an int member; member used as bound.
int test1462(int n) {
    struct Bx { int v; };
    auto bx = [n]() { return Bx{n}; }();
    int s = 0;
    for (int i = 0; i < bx.v; i++) s++;
    return s;
    // bx.v = n (captured in IIFE) => O(n).
    // NOTE: bx.v is a struct member initialized from an IIFE return value.
    // The engine must trace: IIFE captures n → returns Bx{n} → bx.v = n.
    // If struct-member tracking after IIFE return is unsupported: Unknown.
}
// EXPECTED for test1462: Unknown
// (struct member initialized from IIFE return value — opaque member origin)

// test1463: O(n)
// Plain loop to close: fresh unique structure not in any prior batch.
// for-loop with a multi-variable init AND a multi-expression update AND
// a comma-operator condition (three-part comma in condition).
int test1463(int n) {
    int s = 0, x = 0;
    for (int i = 0, j = n; (x = i, i) < j; i++, j--) {
        s++;
    }
    return s;
    // i starts 0, j starts n; each iteration i++ and j--; loop while i < j
    // => runs n/2 times => O(n)
}

// test1464: O(n)
// Alias chain ends in a LOCAL CONST reference to a container alias.
int test1464(vector<int>& v) {
    int n = (int)v.size();
    const int& rn = n;
    int& mrn = const_cast<int&>(rn);
    (void)mrn;
    int s = 0;
    for (int i = 0; i < rn; i++) s++;
    return s;
    // rn = n => O(n)
}

// test1465: O(n)
// std::array range-for + size alias + ILOOP together.
int test1465(array<int,30>& arr) {
    int n = (int)arr.size();
    int s = 0;
    for (auto& x : arr) { (void)x; s++; }
    ILOOP(i, n) s++;   // second pass, same bound
    return s;
    // range-for O(n) + ILOOP O(n) = O(n)
}

// test1466: O(n^2)
// std::array size as both bounds of NEST_ILOOP.
int test1466(array<int,30>& arr) {
    int n = (int)arr.size();
    int s = 0;
    NEST_ILOOP(i, n, j, n) s++;
    return s;
}

// test1467: O(n)
// string_view + typedef + ILOOP.
int test1467(string_view sv) {
    typedef int SzT;
    SzT n = (SzT)sv.size();
    int s = 0;
    ILOOP(i, n) s++;
    return s;
}

// test1468: O(n+m)
// string_view + string + ADD2 + ILOOP.
int test1468(string_view sv, string& str) {
    int n = (int)sv.size();
    int m = (int)str.size();
    int s = 0;
    ILOOP(i, ADD2(n, m)) s++;
    return s;
}

// test1469: O(n*log(n))
// vector + fshH call via container alias.
int test1469(vector<int>& v) {
    int n = (int)v.size();
    return fshH(n);
}

// test1470: O(n^2)
// vector + fshF call via container alias.
int test1470(vector<int>& v) {
    int n = (int)v.size();
    return fshF(n);
}

// test1471: O(n+m)
// fshG with two container aliases.
int test1471(vector<int>& v, set<int>& st) {
    int n = (int)v.size();
    int m = (int)st.size();
    return fshG(n, m);
}

// test1472: O(n*m)
// fshE with two container aliases.
int test1472(vector<int>& v, deque<int>& dq) {
    int n = (int)v.size();
    int m = (int)dq.size();
    return fshE(n, m);
}

// test1473: O(n)
// Lambda captures container reference, takes size inside.
int test1473(vector<int>& v) {
    auto fn = [&v]() {
        int n = (int)v.size();
        int s = 0;
        for (int i = 0; i < n; i++) s++;
        return s;
    };
    return fn();
}

// test1474: O(n*m)
// Lambda captures two containers by reference.
int test1474(vector<int>& v, deque<int>& dq) {
    auto fn = [&v, &dq]() {
        int n = (int)v.size();
        int m = (int)dq.size();
        int s = 0;
        NEST_ILOOP(i, n, j, m) s++;
        return s;
    };
    return fn();
}

// test1475: O(n)
// Local class with operator int() converting to the loop bound.
int test1475(int n) {
    class Bound2 {
        int v;
    public:
        Bound2(int x) : v(x) {}
        explicit operator int() const { return v; }
    };
    Bound2 b(n);
    int lim = (int)b;   // explicit cast uses operator int()
    int s = 0;
    for (int i = 0; i < lim; i++) s++;
    return s;
    // lim = (int)b calls operator int() which returns v = n.
    // Engine sees: lim = (int)b — a C-style cast of a non-arithmetic local
    // object. This is an opaque cast expression => Unknown.
}
// EXPECTED for test1475: Unknown
// (cast of non-arithmetic type via operator int() is opaque)

// test1476: O(n)
// Reference-counted wrapper: int alias via a wrapper struct's .get() method.
int test1476(int n) {
    struct Ref { int v; int get() const { return v; } };
    Ref r{n};
    int lim = r.get();   // method call returning v = n
    int s = 0;
    for (int i = 0; i < lim; i++) s++;
    return s;
    // lim = r.get() — method call, opaque => Unknown
}
// EXPECTED for test1476: Unknown  (method call used as loop bound)

// test1477: O(n)
// Initializer list construction + size alias.
int test1477(int n) {
    vector<int> v = {1, 2, 3};   // fixed size 3
    int extra = (int)v.size();   // = 3, constant
    int lim = n + extra;         // n + 3 — additive with constant
    int s = 0;
    for (int i = 0; i < lim; i++) s++;
    return s;
    // lim = n + 3, so O(n+3) = O(n).
    // But 'extra' = v.size() after init-list — the engine may treat v.size()
    // as a symbolic n here, not as 3.
}
// EXPECTED for test1477: O(n) (if engine recognizes v.size() as a size alias)
// or Unknown (if init-list size is not canonicalized as a constant)
// We mark: O(n) — the loop bound is n + extra where extra is a size alias

// test1478: O(n)
// vector initialized from a parameter via resize(); then size-loop.
int test1478(int n) {
    vector<int> v;
    v.resize(n);   // v now has n elements
    int sz = (int)v.size();
    int s = 0;
    for (int i = 0; i < sz; i++) s++;
    return s;
    // sz = v.size() after resize(n); in absence of semantic knowledge of
    // resize(), sz may be Unknown.
}
// EXPECTED for test1478: Unknown
// (v.size() is read after v.resize(n) — the engine does not track that
// resize sets size to n without semantic reasoning about resize())

// test1479: O(n)
// emplace_back n elements; then range-for over the vector.
int test1479(int n) {
    vector<int> v;
    for (int i = 0; i < n; i++) v.emplace_back(i);
    int s = 0;
    for (auto& x : v) { (void)x; s++; }
    return s;
    // Build loop O(n); range-for: v.size() = n after build, but engine
    // cannot determine v.size() without tracking push_back semantics.
    // However, the BUILD LOOP is recognized as O(n). The range-for bound
    // (v.size()) after the build loop is opaque (Unknown for the range-for
    // specifically). Combined: O(n) build + Unknown range-for.
    // Conservative: Unknown overall? Or just O(n) from the build loop?
    // The range-for complexity depends on the Unknown size => Unknown total.
}
// EXPECTED for test1479: Unknown
// (range-for bound = v.size() after dynamic construction via emplace_back)

// test1480: O(n)
// vector initialized from a range [begin, end); size taken; loop.
int test1480(int* arr, int n) {
    vector<int> v(arr, arr + n);  // range constructor
    int sz = (int)v.size();
    int s = 0;
    for (int i = 0; i < sz; i++) s++;
    return s;
    // v.size() after range constructor = n... but engine cannot verify
    // this without semantic knowledge of the range constructor.
}
// EXPECTED for test1480: Unknown
// (v.size() after range constructor is opaque)

// ── Closing tests 1481–1500 ────────────────────────────────────────────────────

// test1481: O(n)
// Alias via a C-style array element access with a CONSTANT index.
int test1481(int* arr, int n) {
    int lim = arr[0];   // arr[0] is an element read — opaque
    (void)n;
    int s = 0;
    for (int i = 0; i < lim; i++) s++;
    return s;
}
// EXPECTED for test1481: Unknown  (loop bound from array element read)

// test1482: O(n)
// Two distinct functions called in sequence, one O(n) and one O(log n).
int test1482(int n) {
    int a = fshA(n);    // O(n)
    int b = fshC(n);    // O(log n)
    return a + b;
    // O(n) + O(log n) = O(n)
}

// test1483: O(n^2)
// Outer loop O(n); inner IIFE O(n) per step.
int test1483(int n) {
    int s = 0;
    for (int i = 0; i < n; i++) {
        s += [n]() { int acc=0; for(int j=0;j<n;j++) acc++; return acc; }();
    }
    return s;
}

// test1484: O(n*log(n))
// Outer ILOOP; inner IIFE with LOG_LOOP.
int test1484(int n) {
    int s = 0;
    ILOOP(i, n) {
        s += [n]() { int c=0; LOG_LOOP(j,n) c++; return c; }();
    }
    return s;
}

// test1485: O(n)
// for-loop with a compound assignment in the init that also sets a second var.
int test1485(int n) {
    int s = 0, extra = 0;
    for (int i = (extra = 0, 0); i < n; i++) s++;
    return s + extra;
    // init: extra=0, i=0; loop runs n times => O(n)
}

// test1486: O(n)
// while loop where the condition itself is a pre-increment of a counter
// COMPARED against n, expressed as a compound expression.
int test1486(int n) {
    int i = -1, s = 0;
    while (++i < n) s++;
    return s;
    // ++i increments i before comparison; runs n times => O(n)
}

// test1487: O(log n)
// for(;;) with halving in body and ALIAS-derived break.
int test1487(int n) {
    ALIAS(lim, n);
    int i = lim, c = 0;
    for (;;) {
        if (i <= 0) break;
        c++;
        i >>= 1;
    }
    return c;
    // i halves each step => O(log n)
}

// test1488: O(n*m)
// Struct with two int members (from pair); nested ILOOP.
int test1488(pair<int,int> p) {
    struct Dims { int r; int c; };
    Dims d{p.first, p.second};
    int s = 0;
    NEST_ILOOP(i, d.r, j, d.c) s++;
    return s;
    // d.r = p.first = n, d.c = p.second = m => O(n*m).
    // NOTE: struct members accessed via . on a local struct — if engine
    // cannot trace member values from aggregate init, this is Unknown.
}
// EXPECTED for test1488: Unknown
// (struct members d.r, d.c initialized from pair fields via aggregate init;
// member value tracking through struct members is opaque to the engine)

// test1489: O(n)
// IIFE returning a pair; first element used as loop bound.
int test1489(int n) {
    auto [a, b] = [n]() { return make_pair(n, n*0); }();
    int s = 0;
    for (int i = 0; i < a; i++) s++;
    (void)b;
    return s;
    // a = IIFE result's first = n... but structured binding from IIFE
    // return value: opaque => Unknown.
}
// EXPECTED for test1489: Unknown  (structured binding from IIFE return)

// test1490: O(n)
// Triple-nested IIFE, each level doing nothing but forwarding the bound.
int test1490(int n) {
    int r = [n]() {
        return [n]() {
            return [n]() {
                return n;  // just returns n
            }();
        }();
    }();
    int s = 0;
    for (int i = 0; i < r; i++) s++;
    return s;
    // r = IIFE result = n (each IIFE just returns n)... but engine cannot
    // determine that the triply-nested IIFE returns n without evaluating it.
}
// EXPECTED for test1490: Unknown  (loop bound from nested IIFE return value)

// test1491: O(n)
// Reference to structured binding member used as loop bound.
int test1491(pair<int,int>& p) {
    auto& [a, b] = p;   // structured binding by reference
    int s = 0;
    for (int i = 0; i < a; i++) s++;
    (void)b;
    return s;
    // a is a reference to p.first; loop bound = a => O(n)
}

// test1492: O(n+m)
// Reference structured binding; both used in sequential loops.
int test1492(pair<int,int>& p) {
    auto& [n, m] = p;
    int s = 0;
    for (int i = 0; i < n; i++) s++;
    for (int i = 0; i < m; i++) s++;
    return s;
}

// test1493: O(n*m)
// Reference structured binding; NEST_ILOOP.
int test1493(pair<int,int>& p) {
    auto& [n, m] = p;
    int s = 0;
    NEST_ILOOP(i, n, j, m) s++;
    return s;
}

// test1494: O(n)
// if-constexpr selecting log vs linear based on compile-time param.
template<bool IsLog>
int test1494_impl(int n) {
    if constexpr (IsLog) {
        int c = 0;
        for (int i = n; i > 0; i >>= 1) c++;
        return c;  // O(log n)
    } else {
        int s = 0;
        for (int i = 0; i < n; i++) s++;
        return s;  // O(n)
    }
}
int test1494(int n) {
    return test1494_impl<false>(n);
    // Selects O(n) branch
}

// test1495: O(log n)
int test1495(int n) {
    return test1494_impl<true>(n);
    // Selects O(log n) branch
}

// test1496: O(n)
// Deep combination: using alias + ALIAS macro + reference + ADD2 +
// ILOOP — five-concept single-loop.
int test1496(int n, int m) {
    using Sz = int;
    Sz raw = n;
    ALIAS(a, raw);
    int& ra = a;
    int total = ADD2(ra, m);
    int s = 0;
    ILOOP(i, total) s++;
    return s;
    // ra = a = raw = n; total = n + m => O(n+m)
}
// EXPECTED for test1496: O(n+m)

// test1497: O(n*m)
// typedef + structured binding + NEST_ILOOP + container sizes.
int test1497(vector<int>& v, deque<int>& dq) {
    typedef int Dim;
    pair<Dim,Dim> bounds{(Dim)v.size(), (Dim)dq.size()};
    auto& [n, m] = bounds;
    int s = 0;
    NEST_ILOOP(i, n, j, m) s++;
    return s;
}

// test1498: O(n)
// Grand finale §1: lambda + local struct + if-init + structured binding
// + LOG_LOOP all in one function.
int test1498(vector<int>& v, int mode) {
    struct Eng3 {
        int run(int k) {
            int c = 0;
            LOG_LOOP(i, k) c++;  // O(log k)
            return c;
        }
    };
    int result = 0;
    if (int n = (int)v.size(); n > 0) {
        auto fn = [n, mode]() {
            Eng3 e;
            return e.run(n);  // O(log n)
        };
        result = fn();
    }
    return result;
    // O(log n)
}

// test1499: O(n^2)
// Grand finale §2: switch-init + IIFE + local struct method + NEST_ILOOP.
int test1499(int n, int mode) {
    int s = 0;
    switch (int lim = n; mode) {
        default: {
            auto fn = [lim]() {
                struct Grid2 {
                    int run(int k) {
                        int acc = 0;
                        NEST_ILOOP(i, k, j, k) acc++;
                        return acc;
                    }
                };
                Grid2 g;
                return g.run(lim);
            };
            s = fn();  // IIFE equivalent: fn() => Grid2::run(lim) => O(lim^2) = O(n^2)
        }
    }
    return s;
}

// test1500: O(n*m)
// Grand finale §3: reference structured binding + typedef + ADD2 macro
// + ALIAS + BODY_LOOP — the final test of the corpus.
int test1500(pair<int,int>& p, pair<int,int>& q) {
    typedef int T;
    auto& [a, b] = p;
    auto& [c, d] = q;
    ALIAS(n, a);
    ALIAS(m, c);
    T total_rows = n;
    T total_cols = m;
    int s = 0;
    NEST_ILOOP(i, total_rows, j, total_cols) s += fshB(i + j);
    (void)b; (void)d;
    return s;
    // total_rows = n = p.first; total_cols = m = q.first;
    // NEST_ILOOP: n * m iterations, O(1) body => O(n*m)
}

// ─── CONSTANT-OFFSET SUBTRACTION FIX (identifier - number_literal) ───────────

// test_sub1: O(n)
// Classic n-1 upper bound. Constant offset is asymptotically irrelevant.
int test_sub1(int n) {
    int s = 0;
    for (int i = 0; i < n - 1; i++) s++;
    return s;
}

// test_sub2: O(n)
// Larger constant offset. Same reasoning: n - 100 = Theta(n).
int test_sub2(int n) {
    int s = 0;
    for (int i = 0; i < n - 100; i++) s++;
    return s;
}

// test_sub3: O(m)
// Symbolic variable preserved exactly despite constant offset.
int test_sub3(int m) {
    int s = 0;
    for (int j = 0; j < m - 1; j++) s++;
    return s;
}

// test_sub4: O(n * t)
// Inner loop bounded by n-1, nested inside outer t loop.
int test_sub4(int n, int t) {
    int s = 0;
    for (int i = 0; i < t; i++)
        for (int j = 0; j < n - 1; j++) s++;
    return s;
}

// test_sub5: Unknown
// n - m: both sides are symbolic identifiers; bound is indeterminate.
int test_sub5(int n, int m) {
    int s = 0;
    for (int i = 0; i < n - m; i++) s++;
    return s;
}

// test_sub6: Unknown
// n - getLimit6(): RHS is an opaque function call, not a number_literal.
int getLimit6();
int test_sub6(int n) {
    int s = 0;
    for (int i = 0; i < n - getLimit6(); i++) s++;
    return s;
}
