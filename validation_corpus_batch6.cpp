// validation_corpus_batch6.cpp
// FINAL ADVERSARIAL VALIDATION CORPUS — Batch 6 (test1001–test1200)
// Deterministic AST-only complexity inference — D5.6 frozen engine
// C++17 — Compilable
//
// Every test is annotated with its deterministically-correct expected
// complexity, OR "Unknown" when deterministic AST-only reasoning cannot
// (and should not) resolve a definite bound. Unknown is a SUCCESSFUL
// outcome, not a failure.

#include <bits/stdc++.h>
using namespace std;

// ─────────────────────────────────────────────
//  MACROS (fresh set for Batch 6 — macro stress)
// ─────────────────────────────────────────────
#define LOOP(i,n)        for(int i=0;i<(n);i++)
#define LOOPR(i,n)       for(int i=(n)-1;i>=0;i--)
#define M_INDIR1(i,n)    LOOP(i,n)
#define M_INDIR2(i,n)    M_INDIR1(i,n)
#define M_INDIR3(i,n)    M_INDIR2(i,n)
#define WRAP_LOOP(i,n,body)  for(int i=0;i<(n);i++){ body }
#define DBL_LOOP(i,n,j,m,body) for(int i=0;i<(n);i++) for(int j=0;j<(m);j++){ body }
#define HALF_OPEN(i,a,b) for(int i=(a);i<(b);i++)

// ─────────────────────────────────────────────
//  SMALL SHARED HELPERS
// ─────────────────────────────────────────────

// helperA: O(n)
int helperA(int n) { int s=0; for(int i=0;i<n;i++) s++; return s; }

// helperB: O(1)
int helperB(int x) { return x*2+1; }

// helperC: O(n)  calls helperA
int helperC(int n) { return helperA(n) + helperB(n); }

// helperD: O(log n)
int helperD(int n) { int c=0; for(int i=n;i>1;i>>=1) c++; return c; }

// recursiveHelper: recursion — engine documented as NOT supporting recursion
int recursiveHelper(int n) {
    if (n <= 0) return 0;
    return recursiveHelper(n-1) + 1;
}

// indirectCaller: applies a caller-supplied function pointer
int indirectCaller(int n, int(*f)(int)) { return f(n); }

// ══════════════════════════════════════════════════════════════════
//  GROUP 1 (1001–1010): SWITCH INSIDE LOOPS / LOOPS INSIDE SWITCH
// ══════════════════════════════════════════════════════════════════

// test1001: O(n)
// switch inside loop, every case body is O(1) — switch doesn't change
// the loop's per-iteration cost class.
int test1001(int n, int mode) {
    int s = 0;
    for (int i = 0; i < n; i++) {
        switch (mode) {
            case 0: s += 1; break;
            case 1: s += 2; break;
            default: s += 3; break;
        }
    }
    return s;
}

// test1002: O(n)
// switch inside loop where every case body calls helperB (O(1)).
int test1002(int n, int mode) {
    int s = 0;
    for (int i = 0; i < n; i++) {
        switch (mode) {
            case 0: s += helperB(i); break;
            case 1: s += helperB(i+1); break;
            case 2: s += helperB(i+2); break;
            default: break;
        }
    }
    return s;
}

// test1003: O(n)
// loop inside a single switch case, other cases are O(1); switch itself
// is evaluated once (not in a loop) — overall driven by the loop inside
// the chosen case.
int test1003(int n, int mode) {
    int s = 0;
    switch (mode) {
        case 0:
            for (int i = 0; i < n; i++) s++;
            break;
        case 1:
            s = 1;
            break;
        default:
            s = 2;
            break;
    }
    return s;
}

// test1004: Unknown
// loop inside switch where DIFFERENT cases loop to DIFFERENT symbolic
// bounds (n vs m). Deterministic AST reasoning cannot merge two distinct
// branch-dependent bounds without symbolic min/max algebra, which is
// disallowed — conservatively Unknown.
int test1004(int n, int m, int mode) {
    int s = 0;
    switch (mode) {
        case 0:
            for (int i = 0; i < n; i++) s++;
            break;
        default:
            for (int j = 0; j < m; j++) s++;
            break;
    }
    return s;
}

// test1005: O(n)
// switch inside loop, every case body itself contains a fixed-size
// (literal-bounded) inner loop — inner loop is O(1), outer dominates.
int test1005(int n, int mode) {
    int s = 0;
    for (int i = 0; i < n; i++) {
        switch (mode) {
            case 0:
                for (int k = 0; k < 4; k++) s++;
                break;
            case 1:
                for (int k = 0; k < 7; k++) s++;
                break;
            default:
                s++;
        }
    }
    return s;
}

// test1006: O(n^2)
// switch is OUTSIDE the nested loops entirely (selects which of two
// structurally-identical O(n^2) blocks runs) — both branches are O(n^2)
// on the same symbol n, so deterministic merge is valid.
int test1006(int n, int mode) {
    int s = 0;
    switch (mode) {
        case 0:
            for (int i = 0; i < n; i++)
                for (int j = 0; j < n; j++) s++;
            break;
        default:
            for (int i = 0; i < n; i++)
                for (int j = 0; j < n; j++) s += 2;
            break;
    }
    return s;
}

// test1007: O(n)
// nested switch statements inside a loop — both layers O(1) per case.
int test1007(int n, int mode, int submode) {
    int s = 0;
    for (int i = 0; i < n; i++) {
        switch (mode) {
            case 0:
                switch (submode) {
                    case 0: s += 1; break;
                    default: s += 2; break;
                }
                break;
            default:
                s += 3;
        }
    }
    return s;
}

// test1008: O(n)
// switch with fallthrough (no break) inside loop — fallthrough still
// executes O(1) total work per iteration.
int test1008(int n, int mode) {
    int s = 0;
    for (int i = 0; i < n; i++) {
        switch (mode) {
            case 0: s += 1; // fallthrough
            case 1: s += 2; // fallthrough
            default: s += 3;
        }
    }
    return s;
}

// test1009: O(n)
// switch on loop-induced value (i % 3) — value depends on iteration
// variable but each case is O(1), so total remains O(n).
int test1009(int n) {
    int s = 0;
    for (int i = 0; i < n; i++) {
        switch (i % 3) {
            case 0: s += 1; break;
            case 1: s += 2; break;
            default: s += 3; break;
        }
    }
    return s;
}

// test1010: O(n*m)
// loop nested inside a switch case, where that case's loop body itself
// contains a second loop over a different symbol — both symbols appear
// only in the chosen branch, deterministic product of the two bounds.
int test1010(int n, int m, int mode) {
    int s = 0;
    switch (mode) {
        case 7:
            for (int i = 0; i < n; i++)
                for (int j = 0; j < m; j++) s++;
            break;
        default:
            s = -1;
    }
    return s;
}

// ══════════════════════════════════════════════════════════════════
//  GROUP 2 (1011–1020): LAMBDAS / IMMEDIATELY-INVOKED LAMBDAS
// ══════════════════════════════════════════════════════════════════

// test1011: O(n)
// lambda capturing nothing, called once, body is a loop over n — IIFE
// pattern; the lambda's body is the only complexity contributor.
int test1011(int n) {
    auto f = [](int n) {
        int s = 0;
        for (int i = 0; i < n; i++) s++;
        return s;
    };
    return f(n);
}

// test1012: O(n)
// immediately-invoked lambda (IIFE) — defined and called in one
// expression, no intermediate named binding.
int test1012(int n) {
    return [](int n){
        int s = 0;
        for (int i = 0; i < n; i++) s++;
        return s;
    }(n);
}

// test1013: O(n)
// lambda capturing n by value ([n]), invoked with no arguments — the
// captured variable is structurally equivalent to a parameter.
int test1013(int n) {
    auto f = [n]() {
        int s = 0;
        for (int i = 0; i < n; i++) s++;
        return s;
    };
    return f();
}

// test1014: O(n)
// lambda capturing n by reference ([&n]) — reference capture, body
// loops over the referenced symbol.
int test1014(int n) {
    auto f = [&n]() {
        int s = 0;
        for (int i = 0; i < n; i++) s++;
        return s;
    };
    return f();
}

// test1015: O(n*m)
// lambda called inside a loop, where the lambda itself contains a loop
// over m — n outer iterations, each invoking an O(m) lambda.
int test1015(int n, int m) {
    auto inner = [m]() {
        int c = 0;
        for (int j = 0; j < m; j++) c++;
        return c;
    };
    int s = 0;
    for (int i = 0; i < n; i++) s += inner();
    return s;
}

// test1016: O(n)
// std::function wrapping a lambda whose body loops over n — type-erased
// callable, but the lambda body itself is statically visible.
int test1016(int n) {
    function<int(int)> f = [](int k) {
        int s = 0;
        for (int i = 0; i < k; i++) s++;
        return s;
    };
    return f(n);
}

// test1017: Unknown
// lambda passed as a parameter and invoked — its body is NOT visible at
// the call site, so the complexity of f is unresolvable structurally.
int test1017(int n, function<int(int)> f) {
    int s = 0;
    for (int i = 0; i < n; i++) s += 0;
    return s + f(n);
    // the loop itself is O(n), but f(n)'s contribution is Unknown since
    // f's body is an opaque external callable — conservatively Unknown.
}

// test1018: O(n^2)
// lambda defined inside a loop body and immediately invoked each
// iteration; the lambda's own body is an O(n) loop, executed n times.
int test1018(int n) {
    int s = 0;
    for (int i = 0; i < n; i++) {
        s += [n]() {
            int c = 0;
            for (int j = 0; j < n; j++) c++;
            return c;
        }();
    }
    return s;
}

// test1019: O(n)
// generic lambda (auto parameter) invoked once with an int argument.
int test1019(int n) {
    auto f = [](auto k) {
        int s = 0;
        for (int i = 0; i < k; i++) s++;
        return s;
    };
    return f(n);
}

// test1020: O(n)
// lambda assigned to a variable, that variable aliased to another name,
// then the ALIAS is invoked (alias-of-callable).
int test1020(int n) {
    auto f = [](int k){ int s=0; for(int i=0;i<k;i++) s++; return s; };
    auto g = f;       // alias of the callable
    return g(n);
}

// ══════════════════════════════════════════════════════════════════
//  GROUP 3 (1021–1030): LOCAL STRUCTS / CLASSES
// ══════════════════════════════════════════════════════════════════

// test1021: O(n)
// local struct with a member function containing a loop over n,
// instantiated and called once.
int test1021(int n) {
    struct Local {
        int run(int k) {
            int s = 0;
            for (int i = 0; i < k; i++) s++;
            return s;
        }
    };
    Local L;
    return L.run(n);
}

// test1022: O(n)
// local struct holding n as a member (constructor-stored), member
// function loops over the stored member.
int test1022(int n) {
    struct Box {
        int val;
        Box(int v) : val(v) {}
        int run() {
            int s = 0;
            for (int i = 0; i < val; i++) s++;
            return s;
        }
    };
    Box b(n);
    return b.run();
}

// test1023: O(n*m)
// local struct with two members (n, m), member function with nested
// loop over both — both symbols are parent-scope parameters threaded
// through the constructor.
int test1023(int n, int m) {
    struct Pair2 {
        int a, b;
        Pair2(int x, int y) : a(x), b(y) {}
        int run() {
            int s = 0;
            for (int i = 0; i < a; i++)
                for (int j = 0; j < b; j++) s++;
            return s;
        }
    };
    Pair2 p(n, m);
    return p.run();
}

// test1024: O(n)
// local struct with a static member function (no instance needed),
// called via ClassName::method(n).
int test1024(int n) {
    struct Util {
        static int run(int k) {
            int s = 0;
            for (int i = 0; i < k; i++) s++;
            return s;
        }
    };
    return Util::run(n);
}

// test1025: O(n)
// local class (default-private) with a public method, instantiated
// on the stack, method invoked once.
int test1025(int n) {
    class Worker {
    public:
        int go(int k) {
            int s = 0;
            for (int i = 0; i < k; i++) s++;
            return s;
        }
    };
    Worker w;
    return w.go(n);
}

// test1026: O(n)
// local struct whose constructor itself contains the loop (work done
// at construction time, not via a separate call).
int test1026(int n) {
    struct Eager {
        int result;
        Eager(int k) {
            result = 0;
            for (int i = 0; i < k; i++) result++;
        }
    };
    Eager e(n);
    return e.result;
}

// test1027: O(n)
// local struct with operator() overload (functor), invoked like a
// callable — functor body loops over its argument.
int test1027(int n) {
    struct Functor {
        int operator()(int k) const {
            int s = 0;
            for (int i = 0; i < k; i++) s++;
            return s;
        }
    };
    Functor f;
    return f(n);
}

// test1028: O(n)
// local struct contains a vector member sized via push_back loop over
// n, then a range-for over that vector — two structurally-linked loops
// both bounded by n (construction loop is O(n), range-for is O(n)).
int test1028(int n) {
    struct Holder {
        vector<int> data;
        Holder(int k) {
            for (int i = 0; i < k; i++) data.push_back(i);
        }
    };
    Holder h(n);
    int s = 0;
    for (int x : h.data) s += x;
    return s;
    // construction O(n) + range-for O(|data|)=O(n) => O(n)
}

// test1029: O(n)
// local struct with a nested local struct inside one of its methods
// (struct-in-struct), inner struct's method loops over n.
int test1029(int n) {
    struct Outer {
        int run(int k) {
            struct Inner {
                int go(int j) {
                    int s = 0;
                    for (int i = 0; i < j; i++) s++;
                    return s;
                }
            };
            Inner in;
            return in.go(k);
        }
    };
    Outer o;
    return o.run(n);
}

// test1030: O(n^2)
// local struct method invoked inside a loop; method itself is O(n),
// invoked n times — n outer iterations * O(n) per call.
int test1030(int n) {
    struct Helper2 {
        int go(int k) {
            int s = 0;
            for (int i = 0; i < k; i++) s++;
            return s;
        }
    };
    Helper2 h;
    int total = 0;
    for (int i = 0; i < n; i++) total += h.go(n);
    return total;
}

// ══════════════════════════════════════════════════════════════════
//  GROUP 4 (1031–1040): COMMA OPERATOR / UNUSUAL FOR-LOOP SYNTAX
// ══════════════════════════════════════════════════════════════════

// test1031: O(n)
// comma operator in for-loop init: two variables initialized via comma,
// only one is the loop counter.
int test1031(int n) {
    int s = 0;
    for (int i = 0, junk = 99; i < n; i++) { s += (junk > 0 ? 1 : 0); }
    return s;
}

// test1032: O(n)
// comma operator in the update clause: two updates separated by comma,
// both advance in lockstep (i drives the bound).
int test1032(int n) {
    int s = 0;
    for (int i = 0, j = n; i < n; i++, j--) s++;
    return s;
}

// test1033: O(n)
// comma operator literally used as an expression inside the loop body
// (evaluates left, discards, returns right) — purely a syntactic form,
// O(1) per iteration.
int test1033(int n) {
    int s = 0;
    for (int i = 0; i < n; i++) {
        int x = (s++, i);
        (void)x;
    }
    return s;
}

// test1034: O(n)
// for-loop with an empty body (semicolon statement) that performs all
// work in the update clause — still O(n) iterations.
int test1034(int n) {
    int s = 0;
    for (int i = 0; i < n; i++, s++) ;
    return s;
}

// test1035: O(n)
// for-loop with empty init and empty update, condition only — body
// manually increments.
int test1035(int n) {
    int i = 0, s = 0;
    for (; i < n; ) { s++; i++; }
    return s;
}

// test1036: O(n)
// for-loop with multiple comma-separated declarations of the SAME type
// in init, one used as bound source via alias.
int test1036(int n) {
    int s = 0;
    for (int lim = n, i = 0, dummy = 0; i < lim; i++) { s += dummy; }
    return s;
}

// test1037: O(n^2)
// nested for-loops where the OUTER loop's update clause uses a comma
// operator to also reset an inner-related counter — outer n, inner n.
int test1037(int n) {
    int s = 0;
    int j = 0;
    for (int i = 0; i < n; i++, j = 0) {
        for (; j < n; j++) s++;
    }
    return s;
    // outer runs n times; inner resets j=0 each outer iter and runs to n
    // => n * n = O(n^2)
}

// test1038: O(n)
// while loop whose condition itself contains a comma operator
// (left side is a side-effecting no-op, right side is the real test).
int test1038(int n) {
    int i = 0, s = 0;
    while ( (void)0, i < n ) { s++; i++; }
    return s;
}

// test1039: O(n)
// for-loop with THREE comma-separated init declarations and THREE
// comma-separated update expressions, only one pair drives the bound.
int test1039(int n) {
    int s = 0;
    for (int i = 0, a = 1, b = 2; i < n; i++, a *= 1, b += 0) s += (a+b > 0 ? 1 : 0);
    return s;
}

// test1040: O(n)
// for-loop using a comma expression as the CONDITION's last term,
// where the first term is an assignment with side effect each check.
int test1040(int n) {
    int s = 0;
    int probe = 0;
    for (int i = 0; (probe = i, i) < n; i++) s++;
    return s;
}

// ══════════════════════════════════════════════════════════════════
//  GROUP 5 (1041–1050): DO-WHILE / MULTI-UPDATE FOR
// ══════════════════════════════════════════════════════════════════

// test1041: O(n)
// do-while loop, guard checked AFTER body — classic post-test loop.
int test1041(int n) {
    int i = 0, s = 0;
    if (n <= 0) return 0;
    do { s++; i++; } while (i < n);
    return s;
}

// test1042: O(n)
// do-while loop with the test expression wrapped in redundant parens
// and a unary-not-of-not.
int test1042(int n) {
    int i = 0, s = 0;
    if (n <= 0) return 0;
    do { s++; i++; } while ( !(!(i < n)) );
    return s;
}

// test1043: O(n)
// nested do-while loops, inner do-while resets each outer pass —
// outer n, inner n => but inner bound is a FIXED literal here (5),
// so overall is O(n) (inner is O(1)).
int test1043(int n) {
    int s = 0;
    int i = 0;
    if (n <= 0) return 0;
    do {
        int j = 0;
        do { s++; j++; } while (j < 5);
        i++;
    } while (i < n);
    return s;
}

// test1044: O(n^2)
// nested do-while loops, BOTH bounded by n — genuine O(n^2).
int test1044(int n) {
    int s = 0;
    int i = 0;
    if (n <= 0) return 0;
    do {
        int j = 0;
        if (n > 0) {
            do { s++; j++; } while (j < n);
        }
        i++;
    } while (i < n);
    return s;
}

// test1045: O(n)
// for-loop with two independent update expressions where the SECOND
// one (j) does not affect the loop condition at all (j is dead for
// bound purposes) — only i (bounded by n) matters.
int test1045(int n) {
    int s = 0;
    int j = 100;
    for (int i = 0; i < n; i++, j++) s += (j > 0 ? 1 : 0);
    return s;
}

// test1046: O(n)
// for-loop with update clause performing a DECREMENT on a second
// variable that starts at n and is otherwise unused — i drives bound.
int test1046(int n) {
    int s = 0;
    for (int i = 0, k = n; i < n; i++, k--) s += (k >= 0 ? 1 : 0);
    return s;
}

// test1047: O(n)
// do-while loop where the loop variable is declared OUTSIDE and the
// condition references an alias of n computed before the loop.
int test1047(int n) {
    int lim = n;
    int i = 0, s = 0;
    if (lim <= 0) return 0;
    do { s++; i++; } while (i < lim);
    return s;
}

// test1048: O(n*m)
// do-while outer (bounded by n), standard for inner (bounded by m) —
// mixed loop kinds nested.
int test1048(int n, int m) {
    int s = 0;
    int i = 0;
    if (n <= 0) return 0;
    do {
        for (int j = 0; j < m; j++) s++;
        i++;
    } while (i < n);
    return s;
}

// test1049: O(n)
// for-loop with update clause containing a nested comma AND a
// compound assignment operator together: i++, acc += 1.
int test1049(int n) {
    int s = 0, acc = 0;
    for (int i = 0; i < n; i++, acc += 1) s += acc - acc; // always 0, O(1)/iter
    return s;
}

// test1050: O(n)
// while loop whose body contains an internal do-while that always
// executes exactly once (condition is a literal false) — inner
// do-while is O(1), outer while is O(n).
int test1050(int n) {
    int i = 0, s = 0;
    while (i < n) {
        do { s++; } while (false);
        i++;
    }
    return s;
}

// ══════════════════════════════════════════════════════════════════
//  GROUP 6 (1051–1060): for(;;) WITH BREAK
// ══════════════════════════════════════════════════════════════════

// test1051: O(n)
// for(;;) with a single break condition tied to a counter compared
// against n — structurally a disguised bounded loop.
int test1051(int n) {
    int i = 0, s = 0;
    for (;;) {
        if (i >= n) break;
        s++;
        i++;
    }
    return s;
}

// test1052: O(n)
// for(;;) with the increment happening BEFORE the break check.
int test1052(int n) {
    int i = 0, s = 0;
    for (;;) {
        i++;
        if (i > n) break;
        s++;
    }
    return s;
}

// test1053: O(n)
// while(true) (spelled-out) variant of the disguised bounded loop.
int test1053(int n) {
    int i = 0, s = 0;
    while (true) {
        if (i == n) break;
        s++;
        i++;
    }
    return s;
}

// test1054: O(n)
// for(;;) with TWO break statements, both guarding the same counter
// against the same bound n (redundant but structurally duplicated).
int test1054(int n) {
    int i = 0, s = 0;
    for (;;) {
        if (i >= n) break;
        if (i >= n) break; // redundant duplicate guard
        s++;
        i++;
    }
    return s;
}

// test1055: O(n)
// for(;;) where the break condition uses an ALIAS of n computed
// before the loop, not n directly.
int test1055(int n) {
    int lim = n;
    int i = 0, s = 0;
    for (;;) {
        if (i >= lim) break;
        s++;
        i++;
    }
    return s;
}

// test1056: O(n)
// for(;;) with a halving update PLUS a break — disguised logarithmic
// loop (i starts at n, halves each round, breaks at <= 0... wait this
// is log, not linear). NOTE: this is intentionally log, see comment.
int test1056(int n) {
    int i = n, c = 0;
    for (;;) {
        if (i <= 0) break;
        c++;
        i /= 2;
    }
    return c;
    // i halves each iteration => O(log n)
}
// test1056 expected: O(log n)

// test1057: Unknown
// for(;;) whose break condition depends on a value read from a
// container that is mutated inside the loop in a way not reducible to
// a simple counter (push_back growing a vector each iteration while
// breaking when vector reaches size n — circular dependency between
// the mutation and the bound is structurally fine actually)... instead:
// break condition depends on the RETURN VALUE of an opaque function
// pointer — genuinely unresolvable.
int test1057(int n, bool(*done)(int)) {
    int i = 0, s = 0;
    for (;;) {
        if (done(i)) break;
        s++;
        i++;
        (void)n;
    }
    return s;
    // termination predicate is an opaque callable parameter => Unknown
}

// test1058: O(n)
// for(;;) with break inside a nested if/else (else branch never
// breaks, if branch does) — single structural break path to n.
int test1058(int n) {
    int i = 0, s = 0;
    for (;;) {
        if (i >= n) { break; }
        else        { s++; }
        i++;
    }
    return s;
}

// test1059: O(n^2)
// outer for(;;)-with-break bounded by n, inner standard for-loop
// bounded by n — nested disguised + explicit loop.
int test1059(int n) {
    int i = 0, s = 0;
    for (;;) {
        if (i >= n) break;
        for (int j = 0; j < n; j++) s++;
        i++;
    }
    return s;
}

// test1060: O(n)
// for(;;) where the break condition compares the counter to a
// container size taken once before the loop (no alias variable,
// inline call inside the if).
int test1060(vector<int>& v) {
    int i = 0, s = 0;
    for (;;) {
        if (i >= (int)v.size()) break;
        s++;
        i++;
    }
    return s;
}

// ══════════════════════════════════════════════════════════════════
//  GROUP 7 (1061–1070): REFERENCE CHAINS
// ══════════════════════════════════════════════════════════════════

// test1061: O(n)
// reference-to-reference: int& r1 = n; int& r2 = r1; loop on r2.
int test1061(int n) {
    int& r1 = n;
    int& r2 = r1;
    int s = 0;
    for (int i = 0; i < r2; i++) s++;
    return s;
}

// test1062: O(n)
// const reference chain: const int& r1 = n; const int& r2 = r1; loop.
int test1062(int n) {
    const int& r1 = n;
    const int& r2 = r1;
    int s = 0;
    for (int i = 0; i < r2; i++) s++;
    return s;
}

// test1063: O(n)
// function parameter taken by reference, used directly as loop bound
// — no local alias at all.
int test1063(int& n) {
    int s = 0;
    for (int i = 0; i < n; i++) s++;
    return s;
}

// test1064: O(n)
// function parameter by const reference, aliased locally by value
// (copy breaks the reference chain but preserves the symbol n).
int test1064(const int& n) {
    int local = n;
    int s = 0;
    for (int i = 0; i < local; i++) s++;
    return s;
}

// test1065: O(n)
// reference to a container, .size() taken through the reference,
// cast and aliased.
int test1065(vector<int>& v) {
    vector<int>& rv = v;
    int n = (int)rv.size();
    int s = 0;
    for (int i = 0; i < n; i++) s++;
    return s;
}

// test1066: O(n)
// reference-of-reference-of-reference (3 hops) to an int parameter.
int test1066(int n) {
    int& r1 = n;
    int& r2 = r1;
    int& r3 = r2;
    int s = 0;
    for (int i = 0; i < r3; i++) s++;
    return s;
}

// test1067: O(n+m)
// two independent reference chains (one per parameter), sequential
// loops driven by the final reference in each chain.
int test1067(int n, int m) {
    int& a1 = n;
    int& a2 = a1;
    int& b1 = m;
    int& b2 = b1;
    int s = 0;
    for (int i = 0; i < a2; i++) s++;
    for (int j = 0; j < b2; j++) s++;
    return s;
}

// test1068: O(n)
// reference bound to a PARENTHESIZED expression that is itself just
// the variable — int& r = (n); — paren on the reference initializer.
int test1068(int n) {
    int& r = (n);
    int s = 0;
    for (int i = 0; i < r; i++) s++;
    return s;
}

// test1069: O(n)
// reference chain crossing a nested block boundary — r1 declared
// outer, r2 declared in an inner block referencing r1, loop in inner
// block uses r2.
int test1069(int n) {
    int& r1 = n;
    int s = 0;
    {
        int& r2 = r1;
        for (int i = 0; i < r2; i++) s++;
    }
    return s;
}

// test1070: O(rows*cols)
// two reference parameters (rows, cols), each chained once, fed into
// a nested loop — symbol-preserving two-parameter product via refs.
int test1070(int& rows, int& cols) {
    int& r = rows;
    int& c = cols;
    int s = 0;
    for (int i = 0; i < r; i++)
        for (int j = 0; j < c; j++) s++;
    return s;
}

// ══════════════════════════════════════════════════════════════════
//  GROUP 8 (1071–1080): DEEP ALIAS CHAINS ACROSS NESTED BLOCKS
// ══════════════════════════════════════════════════════════════════

// test1071: O(n)
// 5-hop alias chain, each hop introduced in a successively deeper
// nested block (blocks remain open at point of use).
int test1071(int n) {
    int a1 = n;
    {
        int a2 = a1;
        {
            int a3 = a2;
            {
                int a4 = a3;
                {
                    int a5 = a4;
                    int s = 0;
                    for (int i = 0; i < a5; i++) s++;
                    return s;
                }
            }
        }
    }
}

// test1072: O(n)
// 4-hop alias chain where each alias is declared in a SIBLING block
// (block closes before the next alias is declared), final alias used
// in an outer-scope loop after all blocks close.
int test1072(int n) {
    int a1 = n;
    int a2;
    { a2 = a1; }
    int a3;
    { a3 = a2; }
    int a4;
    { a4 = a3; }
    int s = 0;
    for (int i = 0; i < a4; i++) s++;
    return s;
}

// test1073: O(n)
// alias chain where one hop is the RETURN VALUE of a helper that is
// itself an identity (helperA-like passthrough via arithmetic)... use
// a genuinely O(1) identity helper.
int test1073(int n) {
    int a1 = n;
    int a2 = helperB(a1) / 2 - a1 / 2; // structurally O(1), but value-wise
                                        // simplifies to ~a1; however the
                                        // AST shows an O(1) helper call,
                                        // not a pass-through alias.
    int s = 0;
    for (int i = 0; i < a1; i++) s++; // loop uses a1, not the O(1)-derived a2
    (void)a2;
    return s;
}

// test1074: O(n)
// alias chain with a PARENTHESIZED alias in the middle:
// a1 = n; a2 = (a1); a3 = ((a2)); loop on a3.
int test1074(int n) {
    int a1 = n;
    int a2 = (a1);
    int a3 = ((a2));
    int s = 0;
    for (int i = 0; i < a3; i++) s++;
    return s;
}

// test1075: O(n)
// alias chain with a CAST in the middle hop:
// a1 = n; a2 = (long long)a1; a3 = (int)a2; loop on a3.
int test1075(int n) {
    int a1 = n;
    long long a2 = (long long)a1;
    int a3 = (int)a2;
    int s = 0;
    for (int i = 0; i < a3; i++) s++;
    return s;
}

// test1076: O(n)
// alias chain where the FIRST hop is a container-size cast, and
// subsequent hops cross THREE nested blocks.
int test1076(vector<int>& v) {
    int a1 = (int)v.size();
    {
        int a2 = a1;
        {
            int a3 = a2;
            int s = 0;
            for (int i = 0; i < a3; i++) s++;
            return s;
        }
    }
}

// test1077: O(n)
// alias chain interleaved with UNRELATED declarations of other types
// (string, double) that do not participate in the chain.
int test1077(int n) {
    int a1 = n;
    string tag = "x";
    int a2 = a1;
    double ratio = 3.14;
    int a3 = a2;
    (void)tag; (void)ratio;
    int s = 0;
    for (int i = 0; i < a3; i++) s++;
    return s;
}

// test1078: O(n)
// alias chain where the SAME NAME is reused at each hop via shadowing
// in successively nested blocks (a -> a -> a -> a, each shadows outer).
int test1078(int n) {
    int a = n;
    {
        int a = a; // NOTE: self-referential shadow is UB in real C++
                   // (reads uninitialized 'a'); replaced below with a
                   // well-defined pattern instead.
        (void)a;
    }
    int s = 0;
    for (int i = 0; i < a; i++) s++;
    return s;
    // outer a = n => O(n). (inner shadow intentionally unused/discarded)
}

// test1079: O(n)
// alias chain where hop 3 is declared via a comma-operator declaration
// list: int a3 = a2, junk = 0;
int test1079(int n) {
    int a1 = n;
    int a2 = a1;
    int a3 = a2, junk = 0;
    (void)junk;
    int s = 0;
    for (int i = 0; i < a3; i++) s++;
    return s;
}

// test1080: O(n)
// alias chain of length 6 entirely on one line via sequential
// declarations (stress AST node count without structural change).
int test1080(int n) {
    int a1=n; int a2=a1; int a3=a2; int a4=a3; int a5=a4; int a6=a5;
    int s=0; for(int i=0;i<a6;i++) s++; return s;
}

// ══════════════════════════════════════════════════════════════════
//  GROUP 9 (1081–1090): CONTAINER STRESS (stack/queue/pq/multiset)
// ══════════════════════════════════════════════════════════════════

// test1081: O(n)
// alias n = (int)st.size() taken BEFORE a counting while-loop that
// decrements a separate counter (does not call .pop()) — counter
// pattern is structurally a simple bounded while.
int test1081(stack<int>& st) {
    int n = (int)st.size();
    int c = 0;
    while (n > 0) { c++; n--; }
    return c;
}

// test1082: Unknown
// while(!st.empty()) st.pop(); — loop bound is governed by container
// mutation via .empty()/.pop(), not a size() alias or counter. The
// engine performs zero semantic reasoning about pop()'s effect on
// .empty(), so this is Unknown.
int test1082(stack<int>& st) {
    int c = 0;
    while (!st.empty()) {
        st.pop();
        c++;
    }
    return c;
}

// test1083: O(n)
// queue.size() cast-aliased, then a standard counting for-loop (NOT
// querying the queue again) — deterministic via the alias.
int test1083(queue<int>& q) {
    int n = (int)q.size();
    int s = 0;
    for (int i = 0; i < n; i++) s++;
    return s;
}

// test1084: O(n)
// priority_queue.size() cast-aliased, fed through a 2-hop alias chain,
// then used in a fo-style loop via the LOOP macro.
int test1084(priority_queue<int>& pq) {
    int a = (int)pq.size();
    int b = a;
    int s = 0;
    LOOP(i, b) s++;
    return s;
}

// test1085: O(n)
// multiset.size() and the SAME multiset's .size() called again later
// (no mutation between calls) — two calls to the same size() on the
// same object, both aliasing to the same symbol, summed sequential
// loops both driven by that symbol.
int test1085(multiset<int>& ms) {
    int a = (int)ms.size();
    int s = 0;
    for (int i = 0; i < a; i++) s++;
    int b = (int)ms.size();
    for (int j = 0; j < b; j++) s++;
    return s;
    // a and b both equal ms.size() (no mutation) => 2*O(n) = O(n)
}

// test1086: O(n)
// deque used with push_back in a loop bounded by n, then range-for
// over the deque — construction O(n) + iteration O(n) = O(n).
int test1086(int n) {
    deque<int> dq;
    for (int i = 0; i < n; i++) dq.push_back(i);
    int s = 0;
    for (int x : dq) s += x;
    return s;
}

// test1087: O(n*m)
// vector of stacks: outer range-for over a vector<stack<int>> of size
// n, inner loop drains... no — inner uses .size() alias of m (a
// SEPARATE parameter) to avoid the pop-drain Unknown pattern.
int test1087(vector<stack<int>>& vs, int m) {
    int s = 0;
    for (auto& st : vs) {
        (void)st;
        for (int j = 0; j < m; j++) s++;
    }
    return s;
    // |vs| = n (range-for) * m inner => O(n*m)
}

// test1088: O(n)
// unordered_multiset.size() cast, nested parens, alias, loop — combines
// a rare container with parenthesization.
int test1088(unordered_multiset<int>& ums) {
    int n = (int)((ums.size()));
    int s = 0;
    for (int i = 0; i < n; i++) s++;
    return s;
}

// test1089: Unknown
// queue is mutated by push() INSIDE the loop based on the loop
// variable, and the loop condition re-checks q.size() each iteration
// — the bound grows during iteration in a way that requires runtime
// reasoning to determine termination.
int test1089(queue<int>& q, int n) {
    int c = 0;
    while ((int)q.size() < n) {
        q.push(c);
        c++;
    }
    return c;
    // NOTE: this particular instance happens to terminate at n pushes,
    // but recognizing that requires reasoning that q.size() increases
    // by exactly 1 per push() — semantic reasoning about push() is
    // disallowed, so the engine must report Unknown.
}

// test1090: O(n+m)
// two DIFFERENT container types (list and unordered_set), sizes cast
// and aliased independently, sequential loops — exercises container
// type diversity in one function.
int test1090(list<int>& lst, unordered_set<int>& us) {
    int n = (int)lst.size();
    int m = (int)us.size();
    int s = 0;
    for (int i = 0; i < n; i++) s++;
    for (int j = 0; j < m; j++) s++;
    return s;
}

// ══════════════════════════════════════════════════════════════════
//  GROUP 10 (1091–1100): DEEPLY NESTED PARENTHESIZED ASTs
// ══════════════════════════════════════════════════════════════════

// test1091: O(n)
// loop bound is n wrapped in SIX nested parentheses.
int test1091(int n) {
    int s = 0;
    for (int i = 0; i < ((((((n)))))); i++) s++;
    return s;
}

// test1092: O(n)
// alias declared as SIX-deep parenthesized v.size() with a single cast
// at the outermost layer.
int test1092(vector<int>& v) {
    int n = (int)((((((v.size()))))));
    int s = 0;
    for (int i = 0; i < n; i++) s++;
    return s;
}

// test1093: O(n)
// alias-of-alias where the SECOND alias is wrapped in six parens
// around the first alias.
int test1093(int n) {
    int a = n;
    int b = ((((((a))))));
    int s = 0;
    for (int i = 0; i < b; i++) s++;
    return s;
}

// test1094: O(a+b)
// six-deep-parenthesized additive expression: ((((((a+b)))))) used
// directly as a loop bound (no intermediate alias).
int test1094(int a, int b) {
    int s = 0;
    for (int i = 0; i < ((((((a+b)))))); i++) s++;
    return s;
}

// test1095: O(a+b+c)
// nested-parenthesized additive TREE with explicit grouping:
// ((a+(b+c))) — right-leaning tree, three terms.
int test1095(int a, int b, int c) {
    int total = ((a + (b + c)));
    int s = 0;
    for (int i = 0; i < total; i++) s++;
    return s;
}

// test1096: O(a+b+c+d)
// left-leaning additive tree, fully parenthesized at every level:
// ((((a+b)+c)+d)).
int test1096(int a, int b, int c, int d) {
    int total = ((((a+b)+c)+d));
    int s = 0;
    for (int i = 0; i < total; i++) s++;
    return s;
}

// test1097: O(a+b+c+d)
// BALANCED additive tree: ((a+b)+(c+d)) — two parenthesized pairs
// summed together.
int test1097(int a, int b, int c, int d) {
    int total = ((a+b)+(c+d));
    int s = 0;
    for (int i = 0; i < total; i++) s++;
    return s;
}

// test1098: O(n)
// for-loop condition itself is a deeply parenthesized COMPARISON:
// (((i)) < ((n))) — both operands individually wrapped.
int test1098(int n) {
    int s = 0;
    for (int i = 0; (((i)) < ((n))); i++) s++;
    return s;
}

// test1099: O(n*m)
// nested loops where EACH bound is independently 4-deep parenthesized,
// and the outer parens differ in nesting depth from the inner.
int test1099(int n, int m) {
    int s = 0;
    for (int i = 0; i < ((((n)))); i++)
        for (int j = 0; j < ((m)); j++) s++;
    return s;
}

// test1100: O(n)
// deeply parenthesized alias chain feeding into a macro:
// a = n; b = (((a))); LOOP(i, ((b))).
int test1100(int n) {
    int a = n;
    int b = (((a)));
    int s = 0;
    LOOP(i, ((b))) s++;
    return s;
}

// ══════════════════════════════════════════════════════════════════
//  GROUP 11 (1101–1110): MACRO INDIRECTION / CHAINED MACROS
// ══════════════════════════════════════════════════════════════════

// test1101: O(n)
// single level of macro indirection: M_INDIR1 forwards to LOOP.
int test1101(int n) {
    int s = 0;
    M_INDIR1(i, n) s++;
    return s;
}

// test1102: O(n)
// two levels of macro indirection: M_INDIR2 -> M_INDIR1 -> LOOP.
int test1102(int n) {
    int s = 0;
    M_INDIR2(i, n) s++;
    return s;
}

// test1103: O(n)
// three levels of macro indirection: M_INDIR3 -> M_INDIR2 -> M_INDIR1
// -> LOOP. Maximal indirection depth in this corpus.
int test1103(int n) {
    int s = 0;
    M_INDIR3(i, n) s++;
    return s;
}

// test1104: O(n^2)
// nested macro indirection: outer uses M_INDIR3, inner uses
// M_INDIR1 — two different indirection depths combined.
int test1104(int n) {
    int s = 0;
    M_INDIR3(i, n) M_INDIR1(j, n) s++;
    return s;
}

// test1105: O(n)
// WRAP_LOOP macro (body passed as macro argument) used to express a
// single loop — body is a macro parameter, not literal source at the
// loop site.
int test1105(int n) {
    int s = 0;
    WRAP_LOOP(i, n, s++;)
    return s;
}

// test1106: O(n*m)
// DBL_LOOP macro expressing a nested loop in one macro invocation,
// with the body containing a compound statement passed as argument.
int test1106(int n, int m) {
    int s = 0;
    DBL_LOOP(i, n, j, m, s++;)
    return s;
}

// test1107: O(n)
// macro whose ARGUMENT is itself a macro-indirection call (macro
// nesting through arguments rather than body): WRAP_LOOP body invokes
// M_INDIR2 is not legal as nested macro-in-arg easily, so instead: the
// bound argument to LOOP is produced by evaluating an alias that was
// itself set via a macro-style for written manually. Simplify: LOOP
// bound is the RESULT of M_INDIR1 having run earlier (count stored).
int test1107(int n) {
    int count = 0;
    M_INDIR1(i, n) count++;   // count becomes n
    int s = 0;
    LOOP(j, count) s++;       // second loop, bound = count = n
    return s;
    // two sequential O(n) loops => O(n)
}

// test1108: O(n)
// HALF_OPEN macro (renamed rep-style) used with a cast expression as
// both bounds: HALF_OPEN(i, 0, (int)v.size()).
int test1108(vector<int>& v) {
    int s = 0;
    HALF_OPEN(i, 0, (int)v.size()) s++;
    return s;
}

// test1109: O(n*log(n))
// macro-driven outer loop (LOOP) over n, inner loop is a classic
// halving log-loop written manually (not macro) — combination of
// macro and non-macro loop forms in one function.
int test1109(int n) {
    int s = 0;
    LOOP(i, n) {
        for (int j = n; j > 0; j /= 2) s++;
    }
    return s;
}

// test1110: O(n)
// macro LOOP used with a PARENTHESIZED ALIAS that itself came from a
// chained macro-indirection counting pass (combines groups 8, 10, 11).
int test1110(int n) {
    int cnt = 0;
    M_INDIR3(i, n) cnt++;     // cnt = n via 3-level macro indirection
    int alias = ((cnt));      // parenthesized alias
    int s = 0;
    LOOP(j, alias) s++;
    return s;
}

// ══════════════════════════════════════════════════════════════════
//  GROUP 12 (1111–1120): TYPEDEF / USING CHAINS
// ══════════════════════════════════════════════════════════════════

// test1111: O(n)
// single typedef for int, variable of that type used as loop bound.
int test1111(int n) {
    typedef int Count;
    Count c = n;
    int s = 0;
    for (int i = 0; i < c; i++) s++;
    return s;
}

// test1112: O(n)
// chained typedefs: typedef int A; typedef A B; typedef B C; variable
// of type C used as loop bound.
int test1112(int n) {
    typedef int A;
    typedef A B;
    typedef B C;
    C c = n;
    int s = 0;
    for (int i = 0; i < c; i++) s++;
    return s;
}

// test1113: O(n)
// using-alias (C++11 style) instead of typedef, single level.
int test1113(int n) {
    using Count = int;
    Count c = n;
    int s = 0;
    for (int i = 0; i < c; i++) s++;
    return s;
}

// test1114: O(n)
// chained using-aliases, three levels deep.
int test1114(int n) {
    using A = int;
    using B = A;
    using C = B;
    C c = n;
    int s = 0;
    for (int i = 0; i < c; i++) s++;
    return s;
}

// test1115: O(n)
// mixed chain: typedef then using then typedef again (alternating
// declaration styles across the chain).
int test1115(int n) {
    typedef int A;
    using B = A;
    typedef B C;
    C c = n;
    int s = 0;
    for (int i = 0; i < c; i++) s++;
    return s;
}

// test1116: O(n)
// typedef for a reference type: typedef int& IntRef; variable of that
// type bound to n, used as loop bound.
int test1116(int n) {
    typedef int& IntRef;
    IntRef r = n;
    int s = 0;
    for (int i = 0; i < r; i++) s++;
    return s;
}

// test1117: O(n)
// using-alias for vector<int>&, then .size() through the aliased
// reference type, cast and used as loop bound.
int test1117(vector<int>& v) {
    using VecRef = vector<int>&;
    VecRef rv = v;
    int n = (int)rv.size();
    int s = 0;
    for (int i = 0; i < n; i++) s++;
    return s;
}

// test1118: O(n)
// typedef chain (2 levels) applied to a value derived from a cast
// container size, then further aliased once more (typedef + alias
// combination).
int test1118(vector<int>& v) {
    typedef int Sz;
    typedef Sz Sz2;
    Sz2 n = (Sz2)(int)v.size();
    Sz2 m = n;
    int s = 0;
    for (int i = 0; i < m; i++) s++;
    return s;
}

// test1119: O(n*m)
// two independent using-alias chains (one per parameter), each 2
// levels, used as the two bounds of a nested loop.
int test1119(int n, int m) {
    using A1 = int;
    using A2 = A1;
    using B1 = int;
    using B2 = B1;
    A2 nn = n;
    B2 mm = m;
    int s = 0;
    for (int i = 0; i < nn; i++)
        for (int j = 0; j < mm; j++) s++;
    return s;
}

// test1120: O(n)
// using-alias for a FUNCTION POINTER TYPE, variable of that type
// assigned helperB, called once (O(1)) — the loop itself is plain O(n)
// and the function-pointer call contributes O(1).
int test1120(int n) {
    using FnPtr = int(*)(int);
    FnPtr f = helperB;
    int s = 0;
    for (int i = 0; i < n; i++) s += 0;
    return s + f(n);
    // loop O(n) dominates the single O(1) call => O(n)
}

// ══════════════════════════════════════════════════════════════════
//  GROUP 13 (1121–1130): COMPOUND ADDITIVE TREES
// ══════════════════════════════════════════════════════════════════

// test1121: O(a+b+c+d+e)
// flat 5-term additive chain, no parens, used directly as loop bound.
int test1121(int a, int b, int c, int d, int e) {
    int s = 0;
    for (int i = 0; i < a+b+c+d+e; i++) s++;
    return s;
}

// test1122: O(a+b+c+d+e)
// fully left-nested 5-term tree: ((((a+b)+c)+d)+e).
int test1122(int a, int b, int c, int d, int e) {
    int total = ((((a+b)+c)+d)+e);
    int s = 0;
    for (int i = 0; i < total; i++) s++;
    return s;
}

// test1123: O(a+b+c+d+e)
// fully right-nested 5-term tree: (a+(b+(c+(d+e)))).
int test1123(int a, int b, int c, int d, int e) {
    int total = (a+(b+(c+(d+e))));
    int s = 0;
    for (int i = 0; i < total; i++) s++;
    return s;
}

// test1124: O(a+b+c+d+e+f)
// 6-term BALANCED binary tree: ((a+b)+(c+d)) + (e+f), outer grouping
// itself further parenthesized.
int test1124(int a, int b, int c, int d, int e, int f) {
    int total = (((a+b)+(c+d))+(e+f));
    int s = 0;
    for (int i = 0; i < total; i++) s++;
    return s;
}

// test1125: O(n+m)
// additive tree where two of the "leaves" are themselves aliases of
// container sizes (mixing additive-tree structure with container
// propagation): ((n)+(m)) where n,m are cast sizes.
int test1125(vector<int>& v, vector<int>& u) {
    int n = (int)v.size();
    int m = (int)u.size();
    int total = ((n)+(m));
    int s = 0;
    for (int i = 0; i < total; i++) s++;
    return s;
}

// test1126: O(a+b+c)
// additive tree built across TWO statements: first compute (a+b) into
// an alias, then add c to that alias in a second statement (tree built
// incrementally via reassignment-free accumulation into a NEW name).
int test1126(int a, int b, int c) {
    int partial = (a+b);
    int total   = partial + c;
    int s = 0;
    for (int i = 0; i < total; i++) s++;
    return s;
}

// test1127: O(a+b+c+d)
// additive tree with a redundant "+0" leaf injected at the deepest
// level: (((a+b)+c)+(d+0)).
int test1127(int a, int b, int c, int d) {
    int total = (((a+b)+c)+(d+0));
    int s = 0;
    for (int i = 0; i < total; i++) s++;
    return s;
}

// test1128: O(n+m)
// additive tree used as the bound of BOTH loops in a sequential pair,
// each loop re-deriving the SAME sum independently via differently-
// grouped parens — both must canonicalize to the same symbolic sum.
int test1128(int n, int m) {
    int s = 0;
    for (int i = 0; i < (n+m); i++) s++;
    for (int j = 0; j < ((n)+(m)); j++) s++;
    return s;
    // both loops bound by n+m => O(n+m)
}

// test1129: O(a+b+c+d+e+f+g)
// 7-term additive tree, mixed grouping (some left, some right, some
// flat): ((a+b+c)+((d+e)+(f+g))).
int test1129(int a, int b, int c, int d, int e, int f, int g) {
    int total = ((a+b+c)+((d+e)+(f+g)));
    int s = 0;
    for (int i = 0; i < total; i++) s++;
    return s;
}

// test1130: O(a+b)
// additive expression where ONE term is multiplied by the literal 1
// (identity multiplication) — (a*1 + b) — tests whether a trivial
// multiplicative leaf inside an additive context is still treated as
// additive overall (it is: a*1 is structurally a product, but the
// TOP-level operator is +, and a*1's presence as one additive term
// does not introduce a second dimension since the other factor is the
// literal 1).
int test1130(int a, int b) {
    int total = (a*1 + b);
    int s = 0;
    for (int i = 0; i < total; i++) s++;
    return s;
}

// ══════════════════════════════════════════════════════════════════
//  GROUP 14 (1131–1140): NEW LOGARITHMIC VARIANTS
// ══════════════════════════════════════════════════════════════════

// test1131: O(log n)
// i <<= 2 (shift by 2 == multiply by 4 per step) — generalizes the
// <<=1 pattern to a larger constant shift, still logarithmic.
int test1131(int n) {
    int c = 0;
    for (int i = 1; i < n; i <<= 2) c++;
    return c;
}

// test1132: O(log n)
// i /= 3 (division by a constant other than 2) — descending
// logarithmic loop with base-3 reduction.
int test1132(int n) {
    int c = 0;
    for (int i = n; i > 1; i /= 3) c++;
    return c;
}

// test1133: Unknown
// i += i (doubling expressed via self-addition rather than *=2 or
// <<=). The update is structurally an ADDITION assignment, not a
// recognized multiplicative/shift update — deterministic reasoning
// must not infer "doubling" from "+= i" without symbolic algebra.
int test1133(int n) {
    int c = 0;
    for (int i = 1; i < n; i += i) c++;
    return c;
}

// test1134: Unknown
// i = i * i (squaring each step) — not a documented multiplicative-
// update form (those are i*=k for constant k); squaring by self-
// multiplication requires symbolic exponent reasoning, which is
// disallowed.
int test1134(int n) {
    int c = 0;
    for (int i = 2; i < n; i = i * i) c++;
    return c;
}

// test1135: O(log n)
// while-loop halving via subtraction of a HALF computed each round:
// i -= i/2 is itself ambiguous, so instead use the documented-safe
// form: i = i/2 inside while — included here for completeness as a
// SUPPORTED baseline contrasted against 1133/1134/1136.
int test1135(int n) {
    int i = n, c = 0;
    while (i > 1) { c++; i = i/2; }
    return c;
}

// test1136: Unknown
// i -= i/2 — subtraction of a computed half. Structurally this is an
// additive update whose operand happens to be a division expression;
// the engine does not evaluate that the net effect is halving, since
// doing so requires symbolic algebraic simplification of "i - i/2".
int test1136(int n) {
    int i = n, c = 0;
    while (i > 1) { c++; i -= i/2; }
    return c;
}

// test1137: O(log n)*O(log m)  i.e. O(log(n)*log(m))
// two SEPARATE, sequential (not nested) logarithmic loops over two
// different symbols, with the SECOND loop nested inside the first —
// genuine product of two independent logarithms.
int test1137(int n, int m) {
    int c = 0;
    for (int i = n; i > 1; i /= 2)
        for (int j = m; j > 1; j /= 2) c++;
    return c;
}

// test1138: O(n*log(n))
// linear loop over n, inner loop is logarithmic over the OUTER LOOP
// VARIABLE i (not over n itself) — bound on inner log loop varies per
// outer iteration but is always <= n, so worst case is O(log n) per
// outer step.
int test1138(int n) {
    int s = 0;
    for (int i = 1; i <= n; i++)
        for (int j = i; j > 1; j /= 2) s++;
    return s;
}

// test1139: O(log(n)*log(n)) i.e. O(log(n)^2)
// nested logarithmic loops both over the SAME symbol n — log(n) outer
// times log(n) inner.
int test1139(int n) {
    int c = 0;
    for (int i = n; i > 1; i /= 2)
        for (int j = n; j > 1; j /= 2) c++;
    return c;
}

// test1140: O(log n)
// alias chain feeding a CAST value into a right-shift logarithmic
// loop: n -> (long long) -> (int) -> alias -> shift loop.
int test1140(int n) {
    long long ll = (long long)n;
    int x = (int)ll;
    int lim = x;
    int c = 0;
    for (int i = lim; i > 0; i >>= 1) c++;
    return c;
}

// ══════════════════════════════════════════════════════════════════
//  GROUP 15 (1141–1150): RECURSION — UNKNOWN BY POLICY
// ══════════════════════════════════════════════════════════════════
// The engine documentation states recursion is not analyzed
// (helper propagation explicitly excludes recursive call graphs).
// Every test in this group is therefore Unknown, but each exercises a
// DIFFERENT recursive AST SHAPE so the engine's recursion-DETECTION
// (not its complexity inference) can be validated across forms.

// test1141: Unknown
// simple linear self-recursion (direct call to itself).
int test1141(int n) {
    if (n <= 0) return 0;
    return 1 + test1141(n-1);
}

// test1142: Unknown
// recursion with TWO recursive calls (tree recursion shape), each on
// n-1 — classically exponential, but the engine must not attempt to
// evaluate that; it should report Unknown due to recursion alone.
int test1142(int n) {
    if (n <= 1) return n;
    return test1142(n-1) + test1142(n-1);
}

// test1143: Unknown
// recursion via an intermediate helper: testA -> helperRecB ->
// testA (mutual recursion through a local pair).
int helperRecB1143(int n);
int test1143(int n) {
    if (n <= 0) return 0;
    return helperRecB1143(n);
}
int helperRecB1143(int n) { return 1 + test1143(n-1); }

// test1144: Unknown
// recursion where the recursive call is INSIDE a loop body — a loop
// of n iterations, each performing one recursive call on a DECREASING
// argument. Even though each call individually reduces, the overall
// recursive structure makes this Unknown by policy.
int test1144(int n) {
    int s = 0;
    for (int i = 0; i < n; i++) {
        if (n - i > 0) s += test1144((n-i)-1) >= 0 ? 0 : 0; // guarded, never deep
    }
    return s + n;
}

// test1145: Unknown
// recursion guarded by a non-trivial condition involving a
// container's size (recursive descent shape, common in tree-walking
// code) — still Unknown regardless of the guard's form.
int test1145(vector<int>& v, int idx) {
    if (idx >= (int)v.size()) return 0;
    return v[idx] + test1145(v, idx+1);
}

// test1146: Unknown
// recursion where the function calls a DIFFERENT function, which in
// turn calls the FIRST function again (2-cycle mutual recursion across
// two distinctly-named functions).
int test1146B(int n);
int test1146(int n) {
    if (n <= 0) return 0;
    return test1146B(n-1);
}
int test1146B(int n) {
    if (n <= 0) return 0;
    return test1146(n-1) + 1;
}

// test1147: Unknown
// recursive lambda via std::function (self-referencing lambda) — a
// structurally unusual recursion shape not expressible as a plain
// named-function call cycle.
int test1147(int n) {
    function<int(int)> fact = [&](int k) -> int {
        if (k <= 1) return 1;
        return k * fact(k-1);
    };
    return fact(n);
}

// test1148: Unknown
// recursion where the base case ITSELF contains a loop over n (mixing
// a resolvable O(n) loop with an unresolvable recursive shape) — the
// presence of recursion anywhere in the call graph forces Unknown for
// the whole function by policy.
int test1148(int n) {
    if (n <= 0) {
        int s = 0;
        for (int i = 0; i < 10; i++) s++; // O(1), irrelevant
        return s;
    }
    return test1148(n-1) + 1;
}

// test1149: Unknown
// recursion with THREE parameters, only one of which decreases —
// multi-parameter recursive descent (common in DP-style recursive
// signatures).
int test1149(int n, int memoFlag, int depth) {
    if (n <= 0) return depth;
    return test1149(n-1, memoFlag, depth+1);
}

// test1150: Unknown
// indirect recursion through a FUNCTION POINTER stored in a local
// variable that points back to the enclosing function — recursion
// expressed via an indirection layer rather than a direct name.
int test1150(int n) {
    int (*self)(int) = test1150;
    if (n <= 0) return 0;
    return self(n-1) + 1;
}

// ══════════════════════════════════════════════════════════════════
//  GROUP 16 (1151–1160): POINTER ARITHMETIC — UNKNOWN
// ══════════════════════════════════════════════════════════════════

// test1151: Unknown
// raw pointer walked from arr to arr+n via pointer increment, loop
// condition compares pointers directly (p != end) — pointer-difference
// bound is not a recognized container-size or counter form.
int test1151(int* arr, int n) {
    int s = 0;
    int* end = arr + n;
    for (int* p = arr; p != end; p++) s++;
    return s;
}

// test1152: Unknown
// pointer arithmetic where the bound is computed via subtraction of
// two pointers (ptrdiff_t) compared against a loop counter — the
// pointer-difference expression is opaque to size()-based reasoning.
int test1152(int* begin, int* finish) {
    ptrdiff_t len = finish - begin;
    int s = 0;
    for (ptrdiff_t i = 0; i < len; i++) s++;
    return s;
    // NOTE: 'len' is derived from raw pointer subtraction, not from a
    // recognized container.size() call — Unknown.
}

// test1153: Unknown
// nested pointer dereference used as a loop bound: **pp where pp is a
// pointer-to-pointer-to-int — indirection depth obscures the symbol.
int test1153(int** pp) {
    int s = 0;
    for (int i = 0; i < **pp; i++) s++;
    return s;
}

// test1154: Unknown
// array decays to pointer when passed as a function parameter
// (int arr[]) and is then walked via pointer arithmetic with a
// sentinel value (-1) rather than a count — sentinel-terminated loops
// are inherently runtime-dependent.
int test1154(int arr[]) {
    int c = 0;
    for (int* p = arr; *p != -1; p++) c++;
    return c;
}

// test1155: Unknown
// pointer arithmetic combined with a cast: (int)(long)(end - begin) —
// cast wraps a pointer-difference expression rather than a
// container.size() or plain variable.
int test1155(int* begin, int* end) {
    int n = (int)(long)(end - begin);
    int s = 0;
    for (int i = 0; i < n; i++) s++;
    return s;
}

// test1156: Unknown
// loop bound is the result of dereferencing a pointer ALIAS of an int
// parameter (int* pn = &n; loop on *pn) — indirection through address-
// of/dereference is not a recognized alias form.
int test1156(int n) {
    int* pn = &n;
    int s = 0;
    for (int i = 0; i < *pn; i++) s++;
    return s;
}

// test1157: Unknown
// two-dimensional pointer arithmetic: a matrix represented as
// int** with row/col pointer walks, bound derived from pointer
// subtraction on the row pointer.
int test1157(int** mat, int* rowEnd) {
    int s = 0;
    for (int** r = mat; r != (int**)rowEnd; r++) s++;
    return s;
}

// test1158: Unknown
// pointer arithmetic used only to COMPUTE an alias, but the alias is
// then used in an otherwise-normal loop — Unknown propagates from the
// alias's definition even though the loop SHAPE looks ordinary.
int test1158(int* a, int* b) {
    int n = (int)(b - a);  // pointer difference defines n
    int alias = n;
    int s = 0;
    for (int i = 0; i < alias; i++) s++;
    return s;
}

// test1159: Unknown
// void* pointer cast to int* then walked — extra cast layer around an
// already-unsupported pointer-walk pattern.
int test1159(void* vp, int n) {
    int* p = (int*)vp;
    int* end = p + n;
    int s = 0;
    for (; p != end; p++) s++;
    return s;
    // NOTE: even though 'n' appears, the loop bound is expressed via
    // pointer comparison (p != end), not via n directly — Unknown.
}

// test1160: Unknown
// pointer arithmetic inside a macro argument: WRAP_LOOP's bound
// computed from (end - begin) — Unknown form reaching the engine
// THROUGH a macro expansion.
int test1160(int* begin, int* end) {
    int s = 0;
    WRAP_LOOP(i, (int)(end - begin), s++;)
    return s;
}

// ══════════════════════════════════════════════════════════════════
//  GROUP 17 (1161–1170): FUNCTION POINTERS / std::function — UNKNOWN
// ══════════════════════════════════════════════════════════════════

// test1161: Unknown
// loop bound is the result of CALLING a function-pointer parameter —
// the callee's return value (and hence the bound) is opaque.
int test1161(int(*getBound)(void)) {
    int n = getBound();
    int s = 0;
    for (int i = 0; i < n; i++) s++;
    return s;
}

// test1162: Unknown
// std::function member of a local struct, invoked inside a loop whose
// bound IS known (n) but whose PER-ITERATION cost is opaque — overall
// complexity cannot be bounded without knowing the callable's cost.
int test1162(int n, function<void(int)> visit) {
    int s = 0;
    for (int i = 0; i < n; i++) {
        visit(i);
        s++;
    }
    return s;
    // NOTE: the loop trip-count is O(n), but per-iteration cost via
    // 'visit' is unbounded/opaque — conservatively Unknown overall.
}

// test1163: Unknown
// a function pointer is REASSIGNED inside a loop based on a condition,
// then called — the call target varies per iteration and is not
// statically resolvable.
int test1163(int n) {
    int (*f)(int) = helperB;
    int s = 0;
    for (int i = 0; i < n; i++) {
        if (i % 2 == 0) f = helperB;
        else            f = helperB; // both branches same target here,
                                       // but the REASSIGNMENT pattern
                                       // itself is what's structurally
                                       // unresolved (target is a
                                       // variable, not a fixed name).
        s += f(i);
    }
    return s;
}

// test1164: Unknown
// array of function pointers, indexed by a loop variable and invoked
// — dispatch table pattern, callee identity varies per index.
int test1164(int n, int(*table[4])(int)) {
    int s = 0;
    for (int i = 0; i < n; i++) {
        s += table[i % 4](i);
    }
    return s;
}

// test1165: Unknown
// std::function used to wrap a CONTAINER-SIZE-RETURNING callable, then
// called to obtain a loop bound — the size-relationship is hidden
// behind the std::function boundary.
int test1165(vector<int>& v, function<int()> sizer) {
    int n = sizer();
    int s = 0;
    for (int i = 0; i < n; i++) s++;
    (void)v;
    return s;
}

// test1166: Unknown
// member function pointer (pointer-to-member) invoked via ->* on an
// object — rare C++ syntax, callee body not visible through the
// pointer-to-member expression.
struct PMStruct1166 { int run(int k) { int s=0; for(int i=0;i<k;i++) s++; return s; } };
int test1166(PMStruct1166* obj, int (PMStruct1166::*method)(int), int n) {
    return (obj->*method)(n);
}

// test1167: Unknown
// indirectCaller helper (defined at file scope) is invoked with
// helperB — the loop bound passed to the indirected call is n, but the
// engine must treat indirectCaller's behavior as opaque since its
// parameter is a function pointer.
int test1167(int n) {
    return indirectCaller(n, helperB);
}

// test1168: Unknown
// a std::function is stored in a std::vector and each element is
// invoked in a loop — heterogeneous opaque callables collection.
int test1168(int n, vector<function<int(int)>>& fns) {
    int s = 0;
    for (int i = 0; i < n && i < (int)fns.size(); i++) {
        s += fns[i](i);
    }
    return s;
}

// test1169: Unknown
// function pointer typedef'd (combines Group 12's typedef chains with
// Group 17's opacity) — using-alias for a function pointer type, then
// called to determine a bound.
int test1169(int n) {
    using BoundFn = int(*)(int);
    BoundFn f = helperB;
    int b = f(n);  // O(1) call, but result used as a loop bound whose
                   // relationship to n is via an opaque function value
    int s = 0;
    for (int i = 0; i < b; i++) s++;
    return s;
    // NOTE: helperB(n) = 2n+1 numerically, but the engine cannot derive
    // that 'b' is proportional to n from an opaque function-pointer
    // call result — Unknown.
}

// test1170: Unknown
// recursive-shaped indirection: a function pointer variable is
// assigned the address of the CURRENT function and conditionally
// invoked (combines Group 15's self-pointer recursion with explicit
// opacity).
int test1170(int n, bool recurseFlag) {
    int (*self)(int, bool) = test1170;
    if (!recurseFlag || n <= 0) return 0;
    return 1 + self(n-1, recurseFlag);
}

// ══════════════════════════════════════════════════════════════════
//  GROUP 18 (1171–1180): AMBIGUOUS MULTI-WRITE / MUTATED BOUNDS
// ══════════════════════════════════════════════════════════════════

// test1171: Unknown
// the loop bound variable is MUTATED inside the loop body (n
// incremented each iteration) — non-constant bound during iteration,
// termination cannot be determined structurally.
int test1171(int n) {
    int s = 0;
    for (int i = 0; i < n; i++) {
        if (i == 0) n += 0; // structurally a write to n inside the loop
        s++;
    }
    return s;
    // NOTE: even though the increment here is +0 (a no-op numerically),
    // the AST shows an assignment to the bound variable 'n' inside the
    // loop body — the engine does not evaluate the RHS to discover it
    // is a no-op, so this is conservatively Unknown.
}

// test1172: Unknown
// loop counter 'i' is reassigned mid-body to an unrelated expression,
// breaking the simple increment pattern the engine recognizes.
int test1172(int n) {
    int s = 0;
    for (int i = 0; i < n; i++) {
        s++;
        if (s == -999) i = n * 2; // unreachable in practice, but
                                   // structurally an extra write to the
                                   // loop variable from inside the body
    }
    return s;
}

// test1173: Unknown
// a single variable is assigned from THREE DIFFERENT symbolic sources
// across three sequential if-blocks with DIFFERENT conditions (not the
// same condition repeated, so the engine cannot determine which write
// is "live" at the point of use without control-flow value tracking).
int test1173(int n, int m, int k, int mode) {
    int bound = 0;
    if (mode == 0) bound = n;
    if (mode == 1) bound = m;
    if (mode == 2) bound = k;
    int s = 0;
    for (int i = 0; i < bound; i++) s++;
    return s;
}

// test1174: Unknown
// alias variable is declared, then REASSIGNED (not re-declared) to a
// completely different symbol before use — last-write-wins is
// structurally TWO writes to one name with different RHS symbols; if
// the second write's symbol itself depends on a runtime branch this
// becomes Unknown. Here the second write depends on an external bool.
int test1174(int n, int m, bool flag) {
    int x = n;
    if (flag) x = m;   // conditional overwrite with a DIFFERENT symbol
    int s = 0;
    for (int i = 0; i < x; i++) s++;
    return s;
}

// test1175: Unknown
// global-like static local variable accumulates ACROSS calls (state
// persists between invocations via `static`), so the "loop bound" on
// any given call depends on call history, not just parameters.
int test1175(int n) {
    static int carry = 0;
    int bound = n + carry;
    carry = n; // mutates persistent state for next call
    int s = 0;
    for (int i = 0; i < bound; i++) s++;
    return s;
}

// test1176: Unknown
// the loop bound is read from a GLOBAL/EXTERN variable that is not a
// parameter and not derived from any container — its value is
// externally mutable and unconstrained.
int g_externalBound1176 = 10;
int test1176(int n) {
    (void)n;
    int s = 0;
    for (int i = 0; i < g_externalBound1176; i++) s++;
    return s;
}

// test1177: Unknown
// two variables are SWAPPED (via std::swap) before being used as
// sequential loop bounds — the swap itself is fine structurally, but
// combined with a preceding conditional swap based on an external
// flag, the post-swap identity of "which symbol is which" becomes
// branch-dependent.
int test1177(int n, int m, bool flag) {
    if (flag) swap(n, m);
    int s = 0;
    for (int i = 0; i < n; i++) s++;
    for (int j = 0; j < m; j++) s++;
    return s;
    // NOTE: without the swap this would be a clean O(n+m); WITH a
    // branch-conditional swap, n and m's roles after the swap are
    // exchanged only on one path — still O(n+m) overall by symmetry,
    // BUT the engine's zero-heuristic alias tracker sees a write to
    // both 'n' and 'm' from each other under a branch, which the
    // documented alias-resolution rules do not cover -> Unknown.
}

// test1178: Unknown
// a reference parameter is REBOUND... (not possible in C++ for
// references) — instead: a POINTER parameter is reseated to point at
// a different int mid-function, then dereferenced as a loop bound,
// combining pointer indirection (Group 16) with multi-write ambiguity.
int test1178(int* pBound, int n, int m, bool flag) {
    if (flag) pBound = &n;
    else      pBound = &m;
    int s = 0;
    for (int i = 0; i < *pBound; i++) s++;
    return s;
}

// test1179: Unknown
// the SAME alias name is assigned in BOTH branches of an if/else to
// DIFFERENT symbols (n vs m) — unlike test497 in batch3 (both branches
// same symbol), here the branches diverge, so the post-merge value of
// the alias is genuinely branch-dependent between two distinct
// dimensions.
int test1179(int n, int m, bool flag) {
    int bound;
    if (flag) bound = n;
    else      bound = m;
    int s = 0;
    for (int i = 0; i < bound; i++) s++;
    return s;
}

// test1180: Unknown
// a loop bound is computed by XOR-ing two parameters together
// (bound = n ^ m) — a bitwise operator applied to two symbolic
// variables produces a value with no defined symbolic relationship to
// either operand under purely structural (non-semantic) reasoning.
int test1180(int n, int m) {
    int bound = n ^ m;
    int s = 0;
    for (int i = 0; i < bound; i++) s++;
    return s;
}

// ══════════════════════════════════════════════════════════════════
//  GROUP 19 (1181–1190): EMPTY BODIES / ISOLATED DECLARATIONS /
//                         NESTED EMPTY LOOPS
// ══════════════════════════════════════════════════════════════════

// test1181: O(n)
// loop with a completely empty compound-statement body: for(...) {}
int test1181(int n) {
    int s = 0;
    for (int i = 0; i < n; i++) { }
    s = n; // work done outside the loop, after it
    return s;
}

// test1182: O(n)
// loop with an empty body via bare semicolon, immediately followed by
// an UNRELATED isolated declaration statement (declared but never
// used in any loop).
int test1182(int n) {
    for (int i = 0; i < n; i++) ;
    int unused_alias = n; // isolated declaration, no loop references it
    (void)unused_alias;
    return n;
    // the ONLY loop present is the empty-bodied one, bounded by n
    // => O(n) (the function's dominant cost is that loop's trip count,
    // even though it does no per-iteration work).
}

// test1183: O(n^2)
// nested empty loops: outer over n, inner over n, BOTH with empty
// bodies — trip count is still O(n^2) even though no work is done.
int test1183(int n) {
    for (int i = 0; i < n; i++)
        for (int j = 0; j < n; j++) ;
    return n;
}

// test1184: O(n+m)
// two SEQUENTIAL empty-bodied loops with different bounds (n and m).
int test1184(int n, int m) {
    for (int i = 0; i < n; i++) ;
    for (int j = 0; j < m; j++) ;
    return n + m;
}

// test1185: O(n)
// a block containing ONLY declarations (no statements with effect),
// followed by a loop over n — the declaration-only block is O(1) and
// does not affect the result.
int test1185(int n) {
    {
        int a;
        int b;
        double c;
        (void)a; (void)b; (void)c;
    }
    int s = 0;
    for (int i = 0; i < n; i++) s++;
    return s;
}

// test1186: O(n)
// an empty inner loop NESTED inside a non-empty outer loop — outer
// does O(1) work per iteration plus spawns an empty inner loop with a
// FIXED (literal) bound; overall still O(n) from the outer trip count.
int test1186(int n) {
    int s = 0;
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < 100; j++) { }
        s++;
    }
    return s;
}

// test1187: O(n)
// completely empty if-block and empty else-block inside a loop —
// control flow with no effect, loop trip count is still O(n).
int test1187(int n) {
    int s = 0;
    for (int i = 0; i < n; i++) {
        if (i % 2 == 0) { }
        else            { }
        s++;
    }
    return s;
}

// test1188: O(n)
// a labeled empty statement used as a `continue` TARGET via a
// goto-free pattern is not applicable; instead: a nested block whose
// ONLY content is a single empty statement (`;`) inside a loop body.
int test1188(int n) {
    int s = 0;
    for (int i = 0; i < n; i++) {
        {
            ;
        }
        s++;
    }
    return s;
}

// test1189: O(1)
// a function whose ENTIRE body is a sequence of isolated declarations
// with no loops at all — establishes the O(1) floor explicitly amidst
// an otherwise loop-heavy corpus.
int test1189(int n) {
    int a = n;
    int b = a;
    int c = b;
    return c;
}

// test1190: O(n)
// triple-nested blocks where only the INNERMOST block contains a loop,
// and the two enclosing blocks contain nothing but empty statements.
int test1190(int n) {
    int s = 0;
    {
        ;
        {
            ;
            {
                for (int i = 0; i < n; i++) s++;
            }
        }
    }
    return s;
}

// ══════════════════════════════════════════════════════════════════
//  GROUP 20 (1191–1200): FULL-STACK COMBINATION STRESS
// ══════════════════════════════════════════════════════════════════

// test1191: O(n)
// alias -> cast -> deeply-parenthesized -> helper -> macro -> single
// loop, ALL SIX layers in one chain.
int test1191(vector<int>& v) {
    int raw   = (int)v.size();          // container size + cast
    int alias = ((((raw))));            // 4-deep paren alias
    int via_helper = helperA(0) + alias; // helper call (O(1) contributes
                                          // nothing since helperA(0)=O(0)
                                          // structurally still a call,
                                          // but argument is literal 0)
    int s = 0;
    LOOP(i, via_helper) s++;            // macro-driven loop
    return s;
}

// test1192: O(n*m)
// using-alias chain -> reference -> container size cast -> nested
// macro (DBL_LOOP) — five concepts combined for a 2D bound.
int test1192(vector<int>& v, int m) {
    using Sz = int;
    Sz n = (Sz)(int)v.size();
    Sz& nref = n;
    int s = 0;
    DBL_LOOP(i, nref, j, m, s++;)
    return s;
}

// test1193: O(n+v.size())
// parameter n combined with a container size via a deeply-nested
// additive tree, fed through a typedef'd alias, into a single loop —
// macro-free this time to contrast with 1191/1192.
int test1193(int n, vector<int>& v) {
    typedef int Bound;
    Bound total = ((n) + ((int)v.size()));
    int s = 0;
    for (int i = 0; i < total; i++) s++;
    return s;
}

// test1194: O(n^2*log(n))
// local struct (Group 3) whose method performs a nested loop (n^2),
// invoked once per outer-loop iteration is too expensive — instead:
// the struct's method itself contains the FULL n^2*log(n) shape
// (nested loop + inner logarithmic reduction), invoked exactly once.
int test1194(int n) {
    struct Worker3 {
        int run(int k) {
            int s = 0;
            for (int i = 0; i < k; i++)
                for (int j = 0; j < k; j++)
                    for (int x = k; x > 0; x /= 2) s++;
            return s;
        }
    };
    Worker3 w;
    return w.run(n);
}

// test1195: O(n)
// reference-to-reference (Group 7) combined with a do-while (Group 5)
// and a comma-operator update (Group 4) — three concepts in one loop.
int test1195(int n) {
    int& r1 = n;
    int& r2 = r1;
    int i = 0, s = 0;
    if (r2 <= 0) return 0;
    do { s++, i++; } while (i < r2);
    return s;
}

// test1196: O(log(n)*log(m))
// two independent alias chains (Group 8 style, 3 hops each) each
// feeding a DIFFERENT logarithmic loop (Group 14), the two log loops
// nested together — product of two independent logs via long alias
// chains.
int test1196(int n, int m) {
    int a1=n; int a2=a1; int a3=a2;
    int b1=m; int b2=b1; int b3=b2;
    int c = 0;
    for (int i = a3; i > 1; i /= 2)
        for (int j = b3; j > 1; j /= 2) c++;
    return c;
}

// test1197: O(n)
// switch (Group 1) selects between two structurally-IDENTICAL local
// lambdas (Group 2) that both loop over n — both branches resolve to
// the same O(n), valid deterministic merge.
int test1197(int n, int mode) {
    auto fA = [](int k){ int s=0; for(int i=0;i<k;i++) s++; return s; };
    auto fB = [](int k){ int s=0; for(int i=0;i<k;i++) s+=1; return s; };
    switch (mode) {
        case 0:  return fA(n);
        default: return fB(n);
    }
}

// test1198: O(n)
// triple-nested parentheses (Group 10) around a typedef'd (Group 12)
// alias of an alias (Group 8) of a container size (Group "B" from
// batch5), passed through a single level of macro indirection
// (Group 11) into the loop.
int test1198(deque<int>& dq) {
    typedef int Sz;
    Sz raw   = (Sz)dq.size();
    Sz alias = raw;
    Sz wrapped = ((( alias )));
    int s = 0;
    M_INDIR1(i, wrapped) s++;
    return s;
}

// test1199: Unknown
// combination of an Unknown-producing pattern (function-pointer call,
// Group 17) used to compute one operand of an additive tree (Group 13)
// whose OTHER operand is a perfectly normal container size — the
// Unknown operand contaminates the whole additive bound.
int test1199(vector<int>& v, int(*extra)(void)) {
    int n = (int)v.size();
    int total = (n + extra());
    int s = 0;
    for (int i = 0; i < total; i++) s++;
    return s;
}

// test1200: O(n^2)
// the grand finale: local struct (Group 3) with a reference member
// (Group 7) initialized via a typedef'd alias (Group 12) of a
// deeply-parenthesized (Group 10) container-size cast (Group B),
// whose method is invoked inside a switch's default case (Group 1)
// nested inside a for(;;)-with-break (Group 6) that runs exactly once,
// and the method itself performs an O(n^2) nested loop using a
// 3-hop alias chain (Group 8) for both bounds.
int test1200(vector<int>& v, int mode) {
    typedef int Sz;
    Sz raw = (Sz)((((int)v.size())));   // deeply-parenthesized cast
    struct Engine {
        int& bound;                      // reference member
        Engine(int& b) : bound(b) {}
        int run() {
            int a1 = bound;
            int a2 = a1;
            int a3 = a2;                 // 3-hop alias chain
            int s = 0;
            for (int i = 0; i < a3; i++)
                for (int j = 0; j < a3; j++) s++;
            return s;
        }
    };
    Engine eng(raw);
    int result = 0;
    int guard = 0;
    for (;;) {
        if (guard >= 1) break;
        switch (mode) {
            default:
                result = eng.run();
        }
        guard++;
    }
    return result;
    // raw == v.size() == n  =>  O(n^2)
}
