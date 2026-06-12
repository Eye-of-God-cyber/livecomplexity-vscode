// validation_corpus_batch3.cpp
// Compiler-Grade AST Complexity Validation Corpus — Batch 3 (test401–test600)
// C++17 — Compilable
//
// Design philosophy:
//   Every function introduces a structural dimension absent from tests 1-400.
//   Priority areas: cast handling, parenthesized bounds, multi-concept chains,
//   new loop structures, amortized patterns, scope edges, triple macro nesting,
//   container-size multi-hop, symbolic expressions, cross-concept compositions.

#include <bits/stdc++.h>
using namespace std;

// ─────────────────────────────────────────────────────────────────
//  MACROS  (re-declare all macros so file is self-contained)
// ─────────────────────────────────────────────────────────────────
#define fo(i,n)      for(int i=0;i<(n);i++)
#define rep(i,a,b)   for(int i=(a);i<(b);i++)
#define fod(i,n)     for(int i=(n)-1;i>=0;i--)
#define repe(i,a,b)  for(int i=(a);i<=(b);i++)
#define FORV(x,v)    for(auto& x : (v))
// New macros for Batch 3
#define foLL(i,n)    for(long long i=0;i<(n);i++)
#define repLL(i,a,b) for(long long i=(a);i<(b);i++)
#define FORI(i,a,b)  for(int i=(a);i<(b);i++)
#define NEST2(I,N,J,M,body) for(int I=0;I<(N);I++) for(int J=0;J<(M);J++) body
#define NEST3(I,N,J,M,K,R,body) \
    for(int I=0;I<(N);I++) for(int J=0;J<(M);J++) for(int K=0;K<(R);K++) body

// ─────────────────────────────────────────────────────────────────
//  FORWARD DECLARATIONS of Batch 1+2 helpers used here
// ─────────────────────────────────────────────────────────────────
int helper1(int n) {
    int s = 0;
    for (int i = 0; i < n; i++) s += i;
    return s;
}

// helper2: O(m)
int helper2(int m) {
    int s = 0;
    for (int i = 0; i < m; i++) s += i;
    return s;
}

// helper3: O(log n)
int helper3(int n) {
    int c = 0;
    for (int i = 1; i < n; i *= 2) c++;
    return c;
}

// helper4: O(log m)
int helper4(int m) {
    int c = 0;
    for (int i = 1; i < m; i *= 2) c++;
    return c;
}

// helper5: O(1)
int helper5(int x) {
    return x * x + 3;
}

// helper6: O(n*m)
int helper6(int n, int m) {
    int s = 0;
    for (int i = 0; i < n; i++)
        for (int j = 0; j < m; j++) s++;
    return s;
}

// helper7: O(k)
int helper7(int k) {
    int s = 0;
    for (int i = 0; i < k; i++) s++;
    return s;
}

// helper8: O(r)
int helper8(int r) {
    int s = 0;
    for (int i = 0; i < r; i++) s++;
    return s;
}

// helper9: O(n)  (calls helper1)
int helper9(int n) {
    return helper1(n) + 1;
}

// helper10: O(n*m)  (calls helper6)
int helper10(int n, int m) {
    return helper6(n, m) + helper5(n);
}

// helper11: O(log k)
int helper11(int k) {
    int c = 0;
    for (int i = k; i >= 1; i /= 2) c++;
    return c;
}

// helper12: O(a+b)
int helper12(int a, int b) {
    int s = 0;
    for (int i = 0; i < a; i++) s++;
    for (int i = 0; i < b; i++) s++;
    return s;
}

// helper13: O(n^2)
int helper13(int n) {
    int s = 0;
    for (int i = 0; i < n; i++)
        for (int j = 0; j < n; j++) s++;
    return s;
}

// helper14: O(n^3)
int helper14(int n) {
    int s = 0;
    for (int i = 0; i < n; i++)
        for (int j = 0; j < n; j++)
            for (int k = 0; k < n; k++) s++;
    return s;
}

// helper15: O(n)  deep chain leaf
int helper15(int n) {
    int s = 0;
    for (int i = 0; i < n; i++) s += i * 2;
    return s;
}

// helper16: O(n)  calls helper15
int helper16(int n) {
    return helper15(n) + n;
}

// helper17: O(n)  calls helper16
int helper17(int n) {
    return helper16(n) - 1;
}

// helper18: O(sz)
int helper18(int sz) {
    int s = 0;
    for (int i = 0; i < sz; i++) s++;
    return s;
}

// helper19: O(len)
int helper19(int len) {
    int s = 0;
    for (int i = 0; i < len; i++) s++;
    return s;
}

// helper20: O(rows*cols)
int helper20(int rows, int cols) {
    int s = 0;
    for (int i = 0; i < rows; i++)
        for (int j = 0; j < cols; j++) s++;
    return s;
}

// helper21: O(n*m*r)
int helper21(int n, int m, int r) {
    int s = 0;
    for (int i = 0; i < n; i++)
        for (int j = 0; j < m; j++)
            for (int k = 0; k < r; k++) s++;
    return s;
}

// helper22: O(log n)  bit-shift style
int helper22(int n) {
    int c = 0;
    for (int i = 1; i < n; i <<= 1) c++;
    return c;
}

// helper23: O(a+b+c)
int helper23(int a, int b, int c) {
    int s = 0;
    for (int i = 0; i < a; i++) s++;
    for (int i = 0; i < b; i++) s++;
    for (int i = 0; i < c; i++) s++;
    return s;
}

// helper24: O(n^2)  calls helper13
int helper24(int n) {
    return helper13(n) * 2;
}

// helper25: O(n*m)  three-param, calls helper6
int helper25(int n, int m, int x) {
    return helper6(n, m) + helper5(x);
}


// helper26: O(p)
int helper26(int p) {
    int s = 0;
    for (int i = 0; i < p; i++) s += 2;
    return s;
}

// helper27: O(q)
int helper27(int q) {
    int s = 0;
    for (int i = 0; i < q; i++) s++;
    return s;
}

// helper28: O(log p)  multiply-by-3
int helper28(int p) {
    int c = 0;
    for (int i = 1; i < p; i *= 3) c++;
    return c;
}

// helper29: O(p+q)
int helper29(int p, int q) {
    int s = 0;
    for (int i = 0; i < p; i++) s++;
    for (int i = 0; i < q; i++) s++;
    return s;
}

// helper30: O(p*q)
int helper30(int p, int q) {
    int s = 0;
    for (int i = 0; i < p; i++)
        for (int j = 0; j < q; j++) s++;
    return s;
}

// helper31: O(p)  calls helper26
int helper31(int p) {
    return helper26(p) + p;
}

// helper32: O(p)  calls helper31 -> helper26
int helper32(int p) {
    return helper31(p) - 1;
}

// helper33: O(p)  calls helper32 -> helper31 -> helper26
int helper33(int p) {
    return helper32(p) + 0;
}

// helper34: O(log p)  right-shift
int helper34(int p) {
    int c = 0;
    for (int i = p; i > 0; i >>= 1) c++;
    return c;
}

// helper35: O(p^2)
int helper35(int p) {
    int s = 0;
    for (int i = 0; i < p; i++)
        for (int j = 0; j < p; j++) s++;
    return s;
}

// helper36: O(p^3)
int helper36(int p) {
    int s = 0;
    for (int i = 0; i < p; i++)
        for (int j = 0; j < p; j++)
            for (int k = 0; k < p; k++) s++;
    return s;
}

// helper37: O(p^2)  calls helper35
int helper37(int p) {
    return helper35(p) + p;
}

// helper38: O(p*q*r)
int helper38(int p, int q, int r) {
    int s = 0;
    for (int i = 0; i < p; i++)
        for (int j = 0; j < q; j++)
            for (int k = 0; k < r; k++) s++;
    return s;
}

// helper39: O(p+q+r)
int helper39(int p, int q, int r) {
    int s = 0;
    for (int i = 0; i < p; i++) s++;
    for (int i = 0; i < q; i++) s++;
    for (int i = 0; i < r; i++) s++;
    return s;
}

// helper40: O(depth)
int helper40(int depth) {
    int s = 0;
    for (int i = 0; i < depth; i++) s++;
    return s;
}

// helper41: O(depth)  calls helper40
int helper41(int depth) {
    return helper40(depth) * 2;
}

// helper42: O(depth)  calls helper41 -> helper40
int helper42(int depth) {
    return helper41(depth) + 1;
}

// helper43: O(log q)  left-shift
int helper43(int q) {
    int c = 0;
    for (int i = 1; i < q; i <<= 1) c++;
    return c;
}

// helper44: O(p+q)  calls helper29
int helper44(int p, int q) {
    return helper29(p, q) + 0;
}

// helper45: O(p*q)  calls helper30
int helper45(int p, int q) {
    return helper30(p, q) + 1;
}

// helper46: O(p*q)  calls helper45 -> helper30
int helper46(int p, int q) {
    return helper45(p, q) - 1;
}

// helper47: O(cnt)
int helper47(int cnt) {
    int s = 0;
    for (int i = 0; i < cnt; i++) s++;
    return s;
}

// helper48: O(cnt)  calls helper47
int helper48(int cnt) {
    return helper47(cnt) + cnt;
}

// helper49: O(cnt)  calls helper48 -> helper47
int helper49(int cnt) {
    return helper48(cnt) - 1;
}

// helper50: O(cnt)  calls helper49 -> helper48 -> helper47
//           four-deep chain on 'cnt'
int helper50(int cnt) {
    return helper49(cnt) + 0;
}

// helper51: O(rows*cols)
int helper51(int rows, int cols) {
    int s = 0;
    for (int i = 0; i < rows; i++)
        for (int j = 0; j < cols; j++) s++;
    return s;
}

// helper52: O(rows*cols)  calls helper51
int helper52(int rows, int cols) {
    return helper51(rows, cols) + rows;
}

// helper53: O(rows*cols)  calls helper52 -> helper51
int helper53(int rows, int cols) {
    return helper52(rows, cols) * 1;
}

// helper54: O(a+b+c+d)  four-term sum
int helper54(int a, int b, int c, int d) {
    int s = 0;
    for (int i = 0; i < a; i++) s++;
    for (int i = 0; i < b; i++) s++;
    for (int i = 0; i < c; i++) s++;
    for (int i = 0; i < d; i++) s++;
    return s;
}

// helper55: O(n*log(n))  loop calling helper34 each iteration
int helper55(int n) {
    int s = 0;
    for (int i = 1; i <= n; i++)
        s += helper34(i);
    return s;
}

// helper56: O(p^2*q)
int helper56(int p, int q) {
    int s = 0;
    for (int i = 0; i < p; i++)
        for (int j = 0; j < p; j++)
            for (int k = 0; k < q; k++) s++;
    return s;
}

// helper57: O(p*q^2)
int helper57(int p, int q) {
    int s = 0;
    for (int i = 0; i < p; i++)
        for (int j = 0; j < q; j++)
            for (int k = 0; k < q; k++) s++;
    return s;
}

// helper58: O(p)  fo-macro style body
int helper58(int p) {
    int s = 0;
    fo(i, p) s++;
    return s;
}

// helper59: O(p)  calls helper58
int helper59(int p) {
    return helper58(p) + 0;
}

// helper60: O(p)  calls helper59 -> helper58
int helper60(int p) {
    return helper59(p) + 1;
}

// ─────────────────────────────────────────────────────────────────
//  NEW HELPER FUNCTIONS  helper61 – helper90
// ─────────────────────────────────────────────────────────────────

// helper61: O(wid)  — spatial naming
int helper61(int wid) {
    int s = 0;
    for (int i = 0; i < wid; i++) s++;
    return s;
}

// helper62: O(hgt)  — spatial naming
int helper62(int hgt) {
    int s = 0;
    for (int i = 0; i < hgt; i++) s++;
    return s;
}

// helper63: O(wid*hgt)  — spatial product
int helper63(int wid, int hgt) {
    int s = 0;
    for (int i = 0; i < wid; i++)
        for (int j = 0; j < hgt; j++) s++;
    return s;
}

// helper64: O(cap)  — capacity naming
int helper64(int cap) {
    int s = 0;
    for (int i = 0; i < cap; i++) s++;
    return s;
}

// helper65: O(lim)  — limit naming
int helper65(int lim) {
    int s = 0;
    for (int i = 0; i < lim; i++) s++;
    return s;
}

// helper66: O(cap)  calls helper64
int helper66(int cap) {
    return helper64(cap) + cap;
}

// helper67: O(lim)  calls helper65
int helper67(int lim) {
    return helper65(lim) - 1;
}

// helper68: O(n*log(m))  — log-linear with two distinct params
int helper68(int n, int m) {
    int s = 0;
    for (int i = 0; i < n; i++)
        for (int j = m; j > 0; j >>= 1) s++;
    return s;
}

// helper69: O(wid*hgt)  calls helper63
int helper69(int wid, int hgt) {
    return helper63(wid, hgt) + wid;
}

// helper70: O(wid*hgt)  calls helper69 -> helper63
int helper70(int wid, int hgt) {
    return helper69(wid, hgt) * 1;
}

// helper71: O(cap+lim)
int helper71(int cap, int lim) {
    int s = 0;
    for (int i = 0; i < cap; i++) s++;
    for (int i = 0; i < lim; i++) s++;
    return s;
}

// helper72: O(cap+lim)  calls helper71
int helper72(int cap, int lim) {
    return helper71(cap, lim) + 0;
}

// helper73: O(n)  uses fo macro internally — macro-body helper
int helper73(int n) {
    int s = 0;
    fo(i, n) s += 1;
    return s;
}

// helper74: O(n)  calls helper73 — macro-body chain
int helper74(int n) {
    return helper73(n) + 0;
}

// helper75: O(n)  calls helper74 -> helper73
int helper75(int n) {
    return helper74(n) - 1;
}

// helper76: O(n*m)  uses nested fo macros
int helper76(int n, int m) {
    int s = 0;
    fo(i, n) fo(j, m) s++;
    return s;
}

// helper77: O(n*m)  calls helper76
int helper77(int n, int m) {
    return helper76(n, m) + 1;
}

// helper78: O(n*m)  calls helper77 -> helper76
int helper78(int n, int m) {
    return helper77(n, m) * 1;
}

// helper79: O(n^2*log(n))  — n^2 loop with inner log step
int helper79(int n) {
    int s = 0;
    for (int i = 0; i < n; i++)
        for (int j = 0; j < n; j++)
            for (int k = n; k > 0; k >>= 1) s++;
    return s;
}

// helper80: O(n*log(n))  calls helper68(n, n)
int helper80(int n) {
    return helper68(n, n);
}

// helper81: O(wid+hgt)
int helper81(int wid, int hgt) {
    int s = 0;
    for (int i = 0; i < wid; i++) s++;
    for (int j = 0; j < hgt; j++) s++;
    return s;
}

// helper82: O(wid+hgt)  calls helper81
int helper82(int wid, int hgt) {
    return helper81(wid, hgt) + 0;
}

// helper83: O(cap*lim)
int helper83(int cap, int lim) {
    int s = 0;
    for (int i = 0; i < cap; i++)
        for (int j = 0; j < lim; j++) s++;
    return s;
}

// helper84: O(n)  long-long loop internally
int helper84(long long n) {
    long long s = 0;
    for (long long i = 0; i < n; i++) s++;
    return (int)s;
}

// helper85: O(n+m+r+t)  four-loop sequential
int helper85(int n, int m, int r, int t) {
    int s = 0;
    for (int i = 0; i < n; i++) s++;
    for (int i = 0; i < m; i++) s++;
    for (int i = 0; i < r; i++) s++;
    for (int i = 0; i < t; i++) s++;
    return s;
}

// helper86: O(n*m*r*t)  four-loop nested
int helper86(int n, int m, int r, int t) {
    int s = 0;
    for (int i = 0; i < n; i++)
        for (int j = 0; j < m; j++)
            for (int k = 0; k < r; k++)
                for (int l = 0; l < t; l++) s++;
    return s;
}

// helper87: O(n)  rep macro internally, different name context
int helper87(int n) {
    int s = 0;
    rep(i, 0, n) s++;
    return s;
}

// helper88: O(n)  calls helper87
int helper88(int n) {
    return helper87(n) + n;
}

// helper89: O(n)  calls helper88 -> helper87  (rep-macro chain)
int helper89(int n) {
    return helper88(n) - 1;
}

// helper90: O(n*m)  rep nested macros internally
int helper90(int n, int m) {
    int s = 0;
    rep(i, 0, n) rep(j, 0, m) s++;
    return s;
}

// ─────────────────────────────────────────────────────────────────
//  TEST FUNCTIONS  test401 – test600
// ─────────────────────────────────────────────────────────────────

// ══════════════════════════════════════════════════════════════════
//  §A  CAST HANDLING
//      (int), (long long), (size_t), nested casts, casts in
//      macro args, casts in helper args, casts in expressions
// ══════════════════════════════════════════════════════════════════

// test401: O(n)  (long long) cast on v.size(), alias to int n, loop
int test401(vector<int>& v) {
    int n = (int)(long long)v.size();
    int s = 0;
    for (int i = 0; i < n; i++) s++;
    return s;
}

// test402: O(n)  (size_t) no-op cast on v.size(), alias n, loop
int test402(vector<int>& v) {
    int n = (int)(size_t)v.size();
    int s = 0;
    for (int i = 0; i < n; i++) s++;
    return s;
}

// test403: O(n)  cast directly inside fo macro arg: fo(i, (int)v.size())
int test403(vector<int>& v) {
    int s = 0;
    fo(i, (int)v.size()) s++;
    return s;
}

// test404: O(n)  (long long) cast directly inside fo macro arg
int test404(vector<int>& v) {
    long long n = (long long)v.size();
    long long s = 0;
    foLL(i, n) s++;
    return (int)s;
}

// test405: O(n)  cast inside rep macro args: rep(i, 0, (int)v.size())
int test405(vector<int>& v) {
    int s = 0;
    rep(i, 0, (int)v.size()) s++;
    return s;
}

// test406: O(n)  cast as helper argument: helper26((int)v.size())
int test406(vector<int>& v) {
    return helper26((int)v.size());
}

// test407: O(n)  (long long) cast into helper84 (helper accepts long long)
int test407(vector<int>& v) {
    return helper84((long long)v.size());
}

// test408: O(n)  double-cast alias chain: (int)(long long)s.size() -> n
int test408(string& str) {
    int n = (int)(long long)str.size();
    int s = 0;
    for (int i = 0; i < n; i++) s++;
    return s;
}

// test409: O(n+m)  two cast-based aliases, sequential loops
int test409(vector<int>& v, deque<int>& dq) {
    int n = (int)(long long)v.size();
    int m = (int)(long long)dq.size();
    int s = 0;
    for (int i = 0; i < n; i++) s++;
    for (int i = 0; i < m; i++) s++;
    return s;
}

// test410: O(n*m)  two cast aliases, nested loops
int test410(vector<int>& v, vector<int>& u) {
    int n = (int)(size_t)v.size();
    int m = (int)(size_t)u.size();
    int s = 0;
    for (int i = 0; i < n; i++)
        for (int j = 0; j < m; j++) s++;
    return s;
}

// test411: O(n)  cast alias fed into helper50 (4-deep chain)
int test411(vector<int>& v) {
    int n = (int)(long long)v.size();
    return helper50(n);
}

// test412: O(n)  cast alias -> 2-hop alias -> loop
int test412(vector<int>& v) {
    int n = (int)(size_t)v.size();
    int x = n;
    int y = x;
    int s = 0;
    for (int i = 0; i < y; i++) s++;
    return s;
}

// test413: O(n*m)  cast aliases fed to helper30
int test413(set<int>& st, multiset<int>& ms) {
    int n = (int)(size_t)st.size();
    int m = (int)(size_t)ms.size();
    return helper30(n, m);
}

// test414: O(n)  cast inside FORI macro: FORI(i, 0, (int)v.size())
int test414(vector<int>& v) {
    int s = 0;
    FORI(i, 0, (int)v.size()) s++;
    return s;
}

// test415: O(n)  (int) cast on string.length() directly in loop bound
int test415(string& str) {
    int s = 0;
    for (int i = 0; i < (int)str.length(); i++) s++;
    return s;
}

// test416: O(n)  (int) cast on string.size() directly in loop bound
int test416(string& str) {
    int s = 0;
    for (int i = 0; i < (int)str.size(); i++) s++;
    return s;
}

// test417: O(n+m)  cast-size + param, sequential loops
int test417(int n, vector<int>& v) {
    int m = (int)(long long)v.size();
    int s = 0;
    for (int i = 0; i < n; i++) s++;
    for (int i = 0; i < m; i++) s++;
    return s;
}

// test418: O(n*m)  cast-size + param, nested loops
int test418(int n, vector<int>& v) {
    int m = (int)(size_t)v.size();
    int s = 0;
    for (int i = 0; i < n; i++)
        for (int j = 0; j < m; j++) s++;
    return s;
}

// test419: O(n)  array<int,N>.size() cast alias, loop
int test419(array<int,100>& arr) {
    int n = (int)arr.size();
    int s = 0;
    for (int i = 0; i < n; i++) s++;
    return s;
}

// test420: O(n+m)  array.size() + vector.size(), cast aliases, sequential
int test420(array<int,100>& arr, vector<int>& v) {
    int n = (int)arr.size();
    int m = (int)v.size();
    int s = 0;
    for (int i = 0; i < n; i++) s++;
    for (int i = 0; i < m; i++) s++;
    return s;
}

// ══════════════════════════════════════════════════════════════════
//  §B  PARENTHESIZED EXPRESSIONS AS BOUNDS
// ══════════════════════════════════════════════════════════════════

// test421: O(n)  (((n))) triple-paren loop bound
int test421(int n) {
    int s = 0;
    for (int i = 0; i < (((n))); i++) s++;
    return s;
}

// test422: O(n)  int alias from (((n))), loop on alias
int test422(int n) {
    int x = (((n)));
    int s = 0;
    for (int i = 0; i < x; i++) s++;
    return s;
}

// test423: O(n)  fo macro with (n) paren: fo(i, (n))
int test423(int n) {
    int s = 0;
    fo(i, (n)) s++;
    return s;
}

// test424: O(n)  fo macro with ((n)) double-paren
int test424(int n) {
    int s = 0;
    fo(i, ((n))) s++;
    return s;
}

// test425: O(n)  rep macro with (n) paren upper: rep(i, 0, (n))
int test425(int n) {
    int s = 0;
    rep(i, 0, (n)) s++;
    return s;
}

// test426: O(n)  ((v.size())) double-paren cast alias
int test426(vector<int>& v) {
    int n = (int)((v.size()));
    int s = 0;
    for (int i = 0; i < n; i++) s++;
    return s;
}

// test427: O(n)  fo(i, ((int)v.size())) — paren wrapping cast in macro
int test427(vector<int>& v) {
    int s = 0;
    fo(i, ((int)v.size())) s++;
    return s;
}

// test428: O(n+m)  ((n+m)) double-paren compound alias, loop
int test428(int n, int m) {
    int total = ((n + m));
    int s = 0;
    for (int i = 0; i < total; i++) s++;
    return s;
}

// test429: O(n+m)  fo macro with ((n+m)) directly
int test429(int n, int m) {
    int total = n + m;
    int s = 0;
    fo(i, ((total))) s++;
    return s;
}

// test430: O(n)  int alias = (((alias2))) where alias2 = n
int test430(int n) {
    int a = n;
    int b = (((a)));
    int s = 0;
    for (int i = 0; i < b; i++) s++;
    return s;
}

// test431: O(n)  while loop, paren bound: while(i < (((n))))
int test431(int n) {
    int i = 0, s = 0;
    while (i < (((n)))) { s++; i++; }
    return s;
}

// test432: O(n)  paren cast alias: int x = (int)((n)), loop on x
int test432(int n) {
    int x = (int)((n));
    int s = 0;
    for (int i = 0; i < x; i++) s++;
    return s;
}

// test433: O(n^2)  double-paren nested loops
int test433(int n) {
    int s = 0;
    for (int i = 0; i < ((n)); i++)
        for (int j = 0; j < ((n)); j++) s++;
    return s;
}

// test434: O(n*m)  paren bounds, two different params
int test434(int n, int m) {
    int s = 0;
    for (int i = 0; i < (n); i++)
        for (int j = 0; j < (m); j++) s++;
    return s;
}

// ══════════════════════════════════════════════════════════════════
//  §C  TRIPLE-NESTED MACROS
// ══════════════════════════════════════════════════════════════════

// test435: O(n^3)  fo(fo(fo())) three levels, same param
int test435(int n) {
    int s = 0;
    fo(i, n) fo(j, n) fo(k, n) s++;
    return s;
}

// test436: O(n*m*r)  fo three levels, three distinct params
int test436(int n, int m, int r) {
    int s = 0;
    fo(i, n) fo(j, m) fo(k, r) s++;
    return s;
}

// test437: O(n^2*m)  fo three levels: n, n, m
int test437(int n, int m) {
    int s = 0;
    fo(i, n) fo(j, n) fo(k, m) s++;
    return s;
}

// test438: O(n*m^2)  fo three levels: n, m, m
int test438(int n, int m) {
    int s = 0;
    fo(i, n) fo(j, m) fo(k, m) s++;
    return s;
}

// test439: O(n^3)  rep(rep(rep())) three levels, same param
int test439(int n) {
    int s = 0;
    rep(i, 0, n) rep(j, 0, n) rep(k, 0, n) s++;
    return s;
}

// test440: O(n*m*r)  rep three levels, three params
int test440(int n, int m, int r) {
    int s = 0;
    rep(i, 0, n) rep(j, 0, m) rep(k, 0, r) s++;
    return s;
}

// test441: O(n^3)  fo outer, fod middle, rep inner, same param
int test441(int n) {
    int s = 0;
    fo(i, n) fod(j, n) rep(k, 0, n) s++;
    return s;
}

// test442: O(n*m*r)  fo outer, rep middle, fod inner, distinct params
int test442(int n, int m, int r) {
    int s = 0;
    fo(i, n) rep(j, 0, m) fod(k, r) s++;
    return s;
}

// test443: O(n^3)  NEST3 macro: three levels same param
int test443(int n) {
    int s = 0;
    NEST3(i, n, j, n, k, n, { s++; });
    return s;
}

// test444: O(n*m*r)  NEST3 macro: three distinct params
int test444(int n, int m, int r) {
    int s = 0;
    NEST3(i, n, j, m, k, r, { s++; });
    return s;
}

// test445: O(n*m)  NEST2 macro: two distinct params
int test445(int n, int m) {
    int s = 0;
    NEST2(i, n, j, m, { s++; });
    return s;
}

// test446: O(n^2)  NEST2 macro: same param
int test446(int n) {
    int s = 0;
    NEST2(i, n, j, n, { s++; });
    return s;
}

// test447: O(n*m)  fo triple: outer n, inner m, innermost 1 (constant)
int test447(int n, int m) {
    int s = 0;
    fo(i, n) fo(j, m) fo(k, 1) s++;
    return s;
}

// test448: O(n^2*m)  four-level macro nesting: fo four times
int test448(int n, int m) {
    int s = 0;
    fo(i, n) fo(j, n) fo(k, m) fo(l, 1) s++;
    return s;
}

// ══════════════════════════════════════════════════════════════════
//  §D  ALIAS → CAST → CONTAINER → MACRO  (multi-concept chains)
// ══════════════════════════════════════════════════════════════════

// test449: O(n)  v.size()->(int)cast->alias->fo macro (full 4-concept chain)
int test449(vector<int>& v) {
    int n = (int)v.size();
    int alias = n;
    int s = 0;
    fo(i, alias) s++;
    return s;
}

// test450: O(n)  v.size()->(long long)cast->alias x->(int) alias y->fo macro
int test450(vector<int>& v) {
    long long ll = (long long)v.size();
    int x = (int)ll;
    int y = x;
    int s = 0;
    fo(i, y) s++;
    return s;
}

// test451: O(n^2)  v.size()->cast->alias->nested fo macros
int test451(vector<int>& v) {
    int n = (int)v.size();
    int s = 0;
    fo(i, n) fo(j, n) s++;
    return s;
}

// test452: O(n*m)  two containers, cast aliases, nested fo macros
int test452(vector<int>& v, vector<int>& u) {
    int n = (int)v.size();
    int m = (int)u.size();
    int s = 0;
    fo(i, n) fo(j, m) s++;
    return s;
}

// test453: O(n)  string.size()->(int)cast->alias x->rep macro
int test453(string& str) {
    int x = (int)str.size();
    int s = 0;
    rep(i, 0, x) s++;
    return s;
}

// test454: O(n+m)  v.size()->cast->a, str.size()->cast->b, fo a then fo b
int test454(vector<int>& v, string& str) {
    int a = (int)v.size();
    int b = (int)str.size();
    int s = 0;
    fo(i, a) s++;
    fo(j, b) s++;
    return s;
}

// test455: O(n)  map.size()->(long long)cast->alias->helper64
int test455(map<int,int>& mp) {
    int n = (int)(long long)mp.size();
    return helper64(n);
}

// test456: O(n)  unordered_map.size()->(size_t)cast->alias->helper73 (macro-body helper)
int test456(unordered_map<int,int>& mp) {
    int n = (int)(size_t)mp.size();
    return helper73(n);
}

// test457: O(n)  v.size()->cast->alias a->alias b->alias c->helper75 (macro-chain helper)
int test457(vector<int>& v) {
    int a = (int)v.size();
    int b = a;
    int c = b;
    return helper75(c);
}

// test458: O(n*m)  v.size()->cast->alias n, u.size()->cast->alias m, helper30(n,m)
int test458(vector<int>& v, vector<int>& u) {
    int n = (int)(long long)v.size();
    int m = (int)(long long)u.size();
    return helper30(n, m);
}

// test459: O(n+m)  v.size()->cast->alias, alias->alias, compound sum->fo
int test459(vector<int>& v, int extra) {
    int vsz = (int)v.size();
    int n   = vsz;
    int total = n + extra;
    int s = 0;
    fo(i, total) s++;
    return s;
}

// test460: O(n*m)  cast->alias->symbolic->helper30
//          n = (int)(long long)v.size(), m = param, helper30(n, m)
int test460(vector<int>& v, int m) {
    int n = (int)(long long)v.size();
    return helper30(n, m);
}

// test461: O(n)  nested cast + paren: int n = (int)(((v.size())))
int test461(vector<int>& v) {
    int n = (int)(((v.size())));
    int s = 0;
    for (int i = 0; i < n; i++) s++;
    return s;
}

// test462: O(n+m)  cast+paren combo for two sizes, sequential loops
int test462(vector<int>& v, deque<int>& dq) {
    int n = (int)((v.size()));
    int m = (int)((dq.size()));
    int s = 0;
    for (int i = 0; i < n; i++) s++;
    for (int j = 0; j < m; j++) s++;
    return s;
}

// ══════════════════════════════════════════════════════════════════
//  §E  SYMBOLIC EXPRESSIONS — NEW STRUCTURAL FORMS
// ══════════════════════════════════════════════════════════════════

// test463: O(n+m)  loop bound is inline expression (n+m), no alias
int test463(int n, int m) {
    int s = 0;
    for (int i = 0; i < n + m; i++) s++;
    return s;
}

// test464: O(n+m)  while loop bound is inline (n+m), no alias
int test464(int n, int m) {
    int i = 0, s = 0;
    while (i < n + m) { s++; i++; }
    return s;
}

// test465: O(n+m+r)  inline three-term bound
int test465(int n, int m, int r) {
    int s = 0;
    for (int i = 0; i < n + m + r; i++) s++;
    return s;
}

// test466: O(n+v.size())  inline param + cast-container
int test466(int n, vector<int>& v) {
    int s = 0;
    for (int i = 0; i < n + (int)v.size(); i++) s++;
    return s;
}

// test467: O(a+b)  inline sum as fo macro argument (alias-free)
int test467(int a, int b) {
    int total = a + b;
    int s = 0;
    fo(i, total) s++;
    return s;
}

// test468: O(n+m)  alias = n+m, alias fed to helper29 via single-step
int test468(int n, int m) {
    int a = n;
    int b = m;
    int s = helper29(a, b);
    return s;
}

// test469: O(a+b+c)  three-term alias, then helper39 with aliased vars
int test469(int a, int b, int c) {
    int x = a;
    int y = b;
    int z = c;
    return helper39(x, y, z);
}

// test470: O(wid+hgt)  spatial param names, inline sum loop
int test470(int wid, int hgt) {
    int s = 0;
    for (int i = 0; i < wid + hgt; i++) s++;
    return s;
}

// test471: O(wid*hgt)  spatial params, nested loop
int test471(int wid, int hgt) {
    return helper63(wid, hgt);
}

// test472: O(cap+lim)  capacity/limit params, helper71
int test472(int cap, int lim) {
    return helper71(cap, lim);
}

// test473: O(cap*lim)  capacity/limit params, helper83
int test473(int cap, int lim) {
    return helper83(cap, lim);
}

// test474: O(n+v.size())  alias n, inline add in fo macro
int test474(int n, vector<int>& v) {
    int vsz = (int)v.size();
    int total = n + vsz;
    int s = 0;
    fo(i, total) s++;
    return s;
}

// test475: O(n+m+r)  three-term sum via helper85 with aliased params
int test475(int n, int m, int r) {
    int a = n;
    int b = m;
    int c = r;
    return helper85(a, b, c, 0);
    // helper85 is O(n+m+r+t), t=0 contributes nothing => O(n+m+r)
}

// test476: O(n+m+r+t)  four-term sum, helper85
int test476(int n, int m, int r, int t) {
    return helper85(n, m, r, t);
}

// test477: O(n*m*r*t)  four-term product, helper86
int test477(int n, int m, int r, int t) {
    return helper86(n, m, r, t);
}

// ══════════════════════════════════════════════════════════════════
//  §F  AMORTIZED / SPECIAL LOOP PATTERNS
// ══════════════════════════════════════════════════════════════════

// test478: O(n)  step += 2 (non-unit linear increment)
int test478(int n) {
    int s = 0;
    for (int i = 0; i < n; i += 2) s++;
    return s;
}

// test479: O(n)  step += 3
int test479(int n) {
    int s = 0;
    for (int i = 0; i < n; i += 3) s++;
    return s;
}

// test480: O(n)  step += k (k is a positive constant parameter, treated as O(1))
int test480(int n, int k) {
    int s = 0;
    for (int i = 0; i < n; i += k) s++;
    return s;
    // k treated as O(1) per-step divisor; loop is O(n/k) = O(n)
}

// test481: O(n)  loop with continue inside (still O(n))
int test481(int n) {
    int s = 0;
    for (int i = 0; i < n; i++) {
        if (i % 2 == 0) continue;
        s++;
    }
    return s;
}

// test482: O(n)  loop with break on impossible condition (break never fires)
int test482(int n) {
    int s = 0;
    for (int i = 0; i < n; i++) {
        s++;
        if (s < 0) break;  // structurally unreachable — loop is O(n)
    }
    return s;
}

// test483: O(sqrt(n))  trial division pattern: for(i=2; i*i<=n; i++)
int test483(int n) {
    int c = 0;
    for (int i = 2; (long long)i * i <= n; i++) c++;
    return c;
}

// test484: O(sqrt(n))  trial division — while form
int test484(int n) {
    int c = 0;
    int i = 2;
    while ((long long)i * i <= n) { c++; i++; }
    return c;
}

// test485: O(sqrt(n))  trial division — i*i bound, alias n via param
int test485(int n) {
    int lim = n;
    int c = 0;
    for (int i = 1; i * i <= lim; i++) c++;
    return c;
}

// test486: O(n)  two-pointer: lo starts 0, hi starts n-1, both move inward
//          total moves = n/2 so O(n)
int test486(int n) {
    int lo = 0, hi = n - 1, c = 0;
    while (lo < hi) {
        lo++;
        hi--;
        c++;
    }
    return c;
}

// test487: O(n)  two-pointer on vector: lo and hi indices converge
int test487(vector<int>& v) {
    int lo = 0, hi = (int)v.size() - 1;
    int c = 0;
    while (lo < hi) {
        if (v[lo] < v[hi]) lo++;
        else               hi--;
        c++;
    }
    return c;
    // each iteration advances lo or retracts hi => O(n) total
}

// test488: O(n)  sliding window: r advances n times total across outer loop
//          classic amortized O(n): outer while(r<n) r++, inner if condition retracts l
int test488(int n) {
    int l = 0, r = 0, s = 0;
    while (r < n) {
        s += r;
        while (l < r && l < r - 1) l++;
        r++;
    }
    return s;
    // r advances n times, l only advances, total work = O(n)
}

// test489: O(n)  sliding window on vector: r sweeps, l chases
int test489(vector<int>& v) {
    int n = (int)v.size();
    int l = 0, r = 0, best = 0;
    while (r < n) {
        best += v[r];
        while (l <= r && v[l] < 0) l++;
        r++;
    }
    return best;
    // r: 0..n-1, l: monotone non-decreasing => O(n)
}

// test490: O(n)  i += step where step doubles each outer pass (tricky but still O(n) total)
//          inner while: i advances monotonically from 0 to n, total O(n)
int test490(int n) {
    int i = 0, s = 0;
    int step = 1;
    while (i < n) {
        s++;
        i += step;
    }
    return s;
    // step=1 constant => O(n) iterations
}

// ══════════════════════════════════════════════════════════════════
//  §G  SCOPE / DECLARATION EDGE CASES
// ══════════════════════════════════════════════════════════════════

// test491: O(n)  alias declared after an O(1) block, used in later loop
int test491(int n, int m) {
    {
        int tmp = m;   // inner block, m only, no loop
        (void)tmp;
    }
    int lim = n;       // alias declared after inner block
    int s = 0;
    for (int i = 0; i < lim; i++) s++;
    return s;
    // lim = n => O(n)
}

// test492: O(m)  alias inside if-branch, loop uses it
int test492(int n, int m) {
    int bound = 0;
    if (n > 0) {
        bound = m;  // assigned in branch
    }
    int s = 0;
    for (int i = 0; i < bound; i++) s++;
    return s;
    // structurally: bound = m (branch taken), loop O(m)
}

// test493: O(n)  for-loop init declares two vars: for(int lim=n, i=0; i<lim; i++)
int test493(int n) {
    int s = 0;
    for (int lim = n, i = 0; i < lim; i++) s++;
    return s;
    // lim = n in init => O(n)
}

// test494: O(m)  for-loop init: for(int lim=m, i=0; i<lim; i++)
int test494(int n, int m) {
    (void)n;
    int s = 0;
    for (int lim = m, i = 0; i < lim; i++) s++;
    return s;
}

// test495: O(n)  scope-local alias in for-init, with cast
int test495(vector<int>& v) {
    int s = 0;
    for (int n = (int)v.size(), i = 0; i < n; i++) s++;
    return s;
    // n = v.size() in for-init => O(n)
}

// test496: O(n)  shadow in for-loop init: outer n exists, for-init re-declares n2
int test496(int n) {
    int n2 = n;
    int s = 0;
    for (int lim = n2, i = 0; i < lim; i++) s++;
    return s;
}

// test497: O(n)  alias in if-else branch, outer loop
int test497(int n, int m) {
    int lim;
    if (n > m) lim = n;
    else       lim = n;  // both branches set lim = n
    int s = 0;
    for (int i = 0; i < lim; i++) s++;
    return s;
    // both branches => lim = n => O(n)
}

// test498: O(rows*cols)  alias declared inside nested block then used in loop
int test498(int rows, int cols) {
    int r, c;
    {
        r = rows;
        c = cols;
    }
    int s = 0;
    for (int i = 0; i < r; i++)
        for (int j = 0; j < c; j++) s++;
    return s;
}

// test499: O(n)  scope with re-use of loop variable name in inner scope (not shadowing loop var)
int test499(int n) {
    int s = 0;
    for (int i = 0; i < n; i++) {
        {
            int val = i * 2;  // inner declaration, O(1) per iter
            s += val;
        }
    }
    return s;
    // inner block doesn't affect loop count => O(n)
}

// test500: O(n)  alias chain partially inside block: a defined outer, b defined inner
int test500(int n) {
    int a = n;
    int s = 0;
    {
        int b = a;
        for (int i = 0; i < b; i++) s++;
    }
    return s;
    // b = a = n => O(n)
}

// ══════════════════════════════════════════════════════════════════
//  §H  MULTI-CONTAINER SIZE COMBINATIONS
// ══════════════════════════════════════════════════════════════════

// test501: O(n+m+r)  three containers, sequential loops
int test501(vector<int>& v, set<int>& st, deque<int>& dq) {
    int n = (int)v.size();
    int m = (int)st.size();
    int r = (int)dq.size();
    int s = 0;
    for (int i = 0; i < n; i++) s++;
    for (int i = 0; i < m; i++) s++;
    for (int i = 0; i < r; i++) s++;
    return s;
}

// test502: O(n*m*r)  three container sizes, triple nested loop
int test502(vector<int>& v, vector<int>& u, vector<int>& w) {
    int n = (int)v.size();
    int m = (int)u.size();
    int r = (int)w.size();
    int s = 0;
    for (int i = 0; i < n; i++)
        for (int j = 0; j < m; j++)
            for (int k = 0; k < r; k++) s++;
    return s;
}

// test503: O(n^2)  same container size aliased twice, nested loop
int test503(vector<int>& v) {
    int n1 = (int)v.size();
    int n2 = (int)v.size();   // same source, two aliases
    int s = 0;
    for (int i = 0; i < n1; i++)
        for (int j = 0; j < n2; j++) s++;
    return s;
    // n1 == n2 == v.size() => O(n^2)
}

// test504: O(n+m)  map.size() + unordered_map.size(), sequential
int test504(map<int,int>& mp, unordered_map<int,int>& ump) {
    int n = (int)mp.size();
    int m = (int)ump.size();
    int s = 0;
    for (int i = 0; i < n; i++) s++;
    for (int i = 0; i < m; i++) s++;
    return s;
}

// test505: O(n*m)  map.size() * unordered_map.size(), nested
int test505(map<int,int>& mp, unordered_map<int,int>& ump) {
    int n = (int)mp.size();
    int m = (int)ump.size();
    int s = 0;
    for (int i = 0; i < n; i++)
        for (int j = 0; j < m; j++) s++;
    return s;
}

// test506: O(n)  multimap.size() alias, range-for over it
int test506(multimap<int,int>& mm) {
    int n = (int)mm.size();
    int s = 0;
    rep(i, 0, n) s++;
    return s;
}

// test507: O(n+m+r)  three container sizes, helper85 with fourth=0
int test507(vector<int>& v, set<int>& st, deque<int>& dq) {
    int n = (int)v.size();
    int m = (int)st.size();
    int r = (int)dq.size();
    return helper85(n, m, r, 0);
    // O(n+m+r+0) = O(n+m+r)
}

// test508: O(n+m)  s1.size()+s2.size() summed, compound alias, loop
int test508(string& s1, string& s2) {
    int n = (int)s1.size();
    int m = (int)s2.size();
    int total = n + m;
    int s = 0;
    for (int i = 0; i < total; i++) s++;
    return s;
}

// test509: O(n)  v.size() aliased three times from same source, last alias used
int test509(vector<int>& v) {
    int n1 = (int)v.size();
    int n2 = n1;
    int n3 = n2;
    int s = 0;
    for (int i = 0; i < n3; i++) s++;
    return s;
    // n3 = n2 = n1 = v.size() => O(n)
}

// test510: O(n*m)  v.size() and w.size() each aliased twice, nested loop
int test510(vector<int>& v, vector<int>& w) {
    int n1 = (int)v.size();
    int n  = n1;          // second alias
    int m1 = (int)w.size();
    int m  = m1;          // second alias
    int s = 0;
    for (int i = 0; i < n; i++)
        for (int j = 0; j < m; j++) s++;
    return s;
}

// ══════════════════════════════════════════════════════════════════
//  §I  SPATIAL / CAPACITY NAMING — HELPER61–83 REUSE
// ══════════════════════════════════════════════════════════════════

// test511: O(wid)  direct call to helper61
int test511(int wid) {
    return helper61(wid);
}

// test512: O(hgt)  direct call to helper62
int test512(int hgt) {
    return helper62(hgt);
}

// test513: O(wid*hgt)  direct call to helper63
int test513(int wid, int hgt) {
    return helper63(wid, hgt);
}

// test514: O(wid*hgt)  3-deep chain: helper70->helper69->helper63
int test514(int wid, int hgt) {
    return helper70(wid, hgt);
}

// test515: O(wid+hgt)  calls helper82->helper81
int test515(int wid, int hgt) {
    return helper82(wid, hgt);
}

// test516: O(cap)  calls helper66->helper64
int test516(int cap) {
    return helper66(cap);
}

// test517: O(lim)  calls helper67->helper65
int test517(int lim) {
    return helper67(lim);
}

// test518: O(cap+lim)  calls helper72->helper71
int test518(int cap, int lim) {
    return helper72(cap, lim);
}

// test519: O(cap*lim)  helper83 with aliased params
int test519(int cap, int lim) {
    int c = cap;
    int l = lim;
    return helper83(c, l);
}

// test520: O(wid*hgt)  container sizes as wid/hgt
int test520(vector<int>& v, vector<int>& u) {
    int wid = (int)v.size();
    int hgt = (int)u.size();
    return helper63(wid, hgt);
}

// test521: O(wid)  v.size() cast alias named 'wid', helper61
int test521(vector<int>& v) {
    int wid = (int)v.size();
    return helper61(wid);
}

// test522: O(n)  wid alias -> helper75 (rep-macro-body chain)
int test522(int wid) {
    return helper75(wid);
}

// test523: O(n)  cap alias -> helper89 (rep-macro chain)
int test523(int cap) {
    return helper89(cap);
}

// ══════════════════════════════════════════════════════════════════
//  §J  LOG-LINEAR WITH TWO DISTINCT PARAMS — helper68
// ══════════════════════════════════════════════════════════════════

// test524: O(n*log(m))  helper68(n, m)
int test524(int n, int m) {
    return helper68(n, m);
}

// test525: O(rows*log(cols))  helper68(rows, cols)
int test525(int rows, int cols) {
    return helper68(rows, cols);
}

// test526: O(a*log(b))  helper68(a, b)
int test526(int a, int b) {
    return helper68(a, b);
}

// test527: O(n*log(n))  helper80 (calls helper68(n,n))
int test527(int n) {
    return helper80(n);
}

// test528: O(n*log(m))  outer n loop, inner right-shift on m
int test528(int n, int m) {
    int s = 0;
    for (int i = 0; i < n; i++) {
        int j = m;
        while (j > 0) { s++; j >>= 1; }
    }
    return s;
}

// test529: O(n*log(m))  outer fo macro, inner divide-by-2 on m
int test529(int n, int m) {
    int s = 0;
    fo(i, n) {
        for (int j = m; j >= 1; j /= 2) s++;
    }
    return s;
}

// test530: O(rows*log(cols))  outer rows loop, inner left-shift on cols
int test530(int rows, int cols) {
    int s = 0;
    for (int i = 0; i < rows; i++) {
        for (int j = 1; j < cols; j <<= 1) s++;
    }
    return s;
}

// test531: O(n*log(m))  v.size() as n, param m, nested log
int test531(vector<int>& v, int m) {
    int n = (int)v.size();
    int s = 0;
    for (int i = 0; i < n; i++)
        for (int j = m; j > 0; j /= 2) s++;
    return s;
}

// test532: O(n^2*log(n))  n^2 outer, inner log n — helper79
int test532(int n) {
    return helper79(n);
}

// ══════════════════════════════════════════════════════════════════
//  §K  MACRO-BODY HELPER CHAINS — helper73/74/75/87/88/89
// ══════════════════════════════════════════════════════════════════

// test533: O(n)  helper73(n) — fo macro inside helper
int test533(int n) {
    return helper73(n);
}

// test534: O(n)  helper74(n) — calls helper73
int test534(int n) {
    return helper74(n);
}

// test535: O(n)  helper75(n) — calls helper74->helper73
int test535(int n) {
    return helper75(n);
}

// test536: O(m)  helper75(m) — substitution of m
int test536(int m) {
    return helper75(m);
}

// test537: O(k)  helper75(k) — substitution of k
int test537(int k) {
    return helper75(k);
}

// test538: O(n)  helper89(n) — rep chain (helper89->helper88->helper87)
int test538(int n) {
    return helper89(n);
}

// test539: O(m)  helper89(m) — rep chain with m
int test539(int m) {
    return helper89(m);
}

// test540: O(n*m)  helper90(n,m) — nested rep inside helper
int test540(int n, int m) {
    return helper90(n, m);
}

// test541: O(n*m)  helper78(n,m) — nested fo chain (helper78->helper77->helper76)
int test541(int n, int m) {
    return helper78(n, m);
}

// test542: O(a*b)  helper78(a,b) — substitution of a,b
int test542(int a, int b) {
    return helper78(a, b);
}

// test543: O(rows*cols)  helper78(rows,cols)
int test543(int rows, int cols) {
    return helper78(rows, cols);
}

// test544: O(n)  v.size()->cast->alias->helper75 (macro-body chain with container source)
int test544(vector<int>& v) {
    int n = (int)v.size();
    return helper75(n);
}

// test545: O(n*m)  v.size()->cast->alias n, m param, helper90(n,m) (rep-nested helper)
int test545(vector<int>& v, int m) {
    int n = (int)v.size();
    return helper90(n, m);
}

// ══════════════════════════════════════════════════════════════════
//  §L  DEEP CROSS-CONCEPT CHAINS (priority per spec §M)
// ══════════════════════════════════════════════════════════════════

// test546: O(n)
//  chain: v.size() -> (int)cast -> alias n -> alias n2 -> alias n3
//         -> helper75 (fo-macro chain)
int test546(vector<int>& v) {
    int n  = (int)v.size();
    int n2 = n;
    int n3 = n2;
    return helper75(n3);
}

// test547: O(n)
//  chain: map.size() -> (long long)cast -> (int)cast -> alias -> rep macro
int test547(map<int,int>& mp) {
    int n = (int)(long long)mp.size();
    int lim = n;
    int s = 0;
    rep(i, 0, lim) s++;
    return s;
}

// test548: O(n*m)
//  chain: v.size()->(int)cast->alias n, u.size()->(int)cast->alias m
//         -> nested fo macros (triple concept: cast+alias+macro)
int test548(vector<int>& v, vector<int>& u) {
    int n = (int)v.size();
    int m = (int)u.size();
    int s = 0;
    fo(i, n) fo(j, m) s++;
    return s;
}

// test549: O(n^2)
//  chain: v.size()->(size_t)cast->(int)cast->alias n
//         -> double-paren in fo macro: fo(i, ((n)))
int test549(vector<int>& v) {
    int n = (int)(size_t)v.size();
    int s = 0;
    fo(i, ((n))) fo(j, ((n))) s++;
    return s;
}

// test550: O(n+m)
//  chain: v.size()->alias n, str.size()->alias m
//         -> compound sum alias 'total' -> fo macro
int test550(vector<int>& v, string& str) {
    int n     = (int)v.size();
    int m     = (int)str.size();
    int total = n + m;
    int s = 0;
    fo(i, total) s++;
    return s;
}

// test551: O(wid*hgt)
//  chain: v.size()->wid, u.size()->hgt -> helper70 (3-deep chain)
int test551(vector<int>& v, vector<int>& u) {
    int wid = (int)v.size();
    int hgt = (int)u.size();
    return helper70(wid, hgt);
}

// test552: O(n+m+r)
//  chain: three containers -> three cast aliases -> helper39 (sum helper)
int test552(vector<int>& v, set<int>& st, deque<int>& dq) {
    int n = (int)v.size();
    int m = (int)st.size();
    int r = (int)dq.size();
    return helper39(n, m, r);
}

// test553: O(n*log(m))
//  chain: v.size()->cast->alias n, u.size()->cast->alias m -> helper68(n,m)
int test553(vector<int>& v, vector<int>& u) {
    int n = (int)v.size();
    int m = (int)u.size();
    return helper68(n, m);
}

// test554: O(n)
//  chain: v.size()->(long long)cast->alias ll->(int)cast->alias n
//         -> 4-hop alias chain -> helper50 (4-deep linear chain)
int test554(vector<int>& v) {
    long long ll = (long long)v.size();
    int n  = (int)ll;
    int a  = n;
    int b  = a;
    return helper50(b);
}

// test555: O(n*m)
//  chain: macro arg cast: NEST2(i,(int)v.size(), j,(int)u.size(), {s++;})
int test555(vector<int>& v, vector<int>& u) {
    int s = 0;
    NEST2(i, (int)v.size(), j, (int)u.size(), { s++; });
    return s;
}

// test556: O(n^3)
//  chain: (((n))) triple-paren in NEST3 macro
int test556(int n) {
    int s = 0;
    NEST3(i, (((n))), j, (((n))), k, (((n))), { s++; });
    return s;
}

// test557: O(n*m)
//  chain: alias a = (int)v.size(), alias b = a (2-hop), compound total = b + 0,
//         rep macro inner, fo outer
int test557(vector<int>& v, int m) {
    int a = (int)v.size();
    int b = a;
    int s = 0;
    fo(i, b) rep(j, 0, m) s++;
    return s;
    // b = v.size() = n, m = m => O(n*m)
}

// test558: O(n+m)
//  macro -> cast -> symbolic: fo(i, (int)v.size() + m) — inline symbolic in macro
int test558(vector<int>& v, int m) {
    int s = 0;
    int n = (int)v.size();
    int total = n + m;
    fo(i, total) s++;
    return s;
}

// ══════════════════════════════════════════════════════════════════
//  §M  NEW LOOP STRUCTURES
// ══════════════════════════════════════════════════════════════════

// test559: O(n)  indexed loop on string with .size()-1 as upper bound alias
int test559(string& str) {
    int n = (int)str.size() - 1;
    int s = 0;
    for (int i = 0; i <= n; i++) s++;
    return s;
    // n = |str|-1, loop i in [0,n] => |str| iterations => O(|str|)
}

// test560: O(n)  loop bound = v.size()-1 aliased, repe macro (inclusive)
int test560(vector<int>& v) {
    int n = (int)v.size() - 1;
    int s = 0;
    repe(i, 0, n) s++;
    return s;
    // repe i=0..n (inclusive) => v.size() iterations => O(n)
}

// test561: O(n)  for loop, bound is O(1) arithmetic on param: n/2+n/2 = n (simplified)
int test561(int n) {
    int half = n / 2;
    int s = 0;
    for (int i = 0; i < half; i++) s++;
    return s;
    // half = n/2 => O(n/2) = O(n)
}

// test562: O(n)  reverse step-1 loop via repe: repe(i,0,n-1) effectively same bound
int test562(int n) {
    int s = 0;
    fod(i, n) {
        s += (i >= 0 ? 1 : 0);
    }
    return s;
}

// test563: O(n)  loop with multiple continues (O(n) total iterations)
int test563(int n) {
    int s = 0;
    for (int i = 0; i < n; i++) {
        if (i % 3 == 0) continue;
        if (i % 7 == 0) continue;
        s++;
    }
    return s;
}

// test564: O(n*m)  outer loop n, inner two sequential loops each m/2 (sum = m)
int test564(int n, int m) {
    int half = m / 2;
    int s = 0;
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < half; j++) s++;
        for (int j = 0; j < half; j++) s++;
    }
    return s;
    // inner total = 2*(m/2) = m => O(n*m)
}

// test565: O(log n)  loop: i = i*i (super-logarithmic step, fewer iterations)
//          Note: i starts at 2, each step i*=2 variant won't compile cleanly,
//          so use: for(int i=2; i<n; i=i*2) which is O(log n)
int test565(int n) {
    int c = 0;
    for (int i = 2; i < n; i = i * 2) c++;
    return c;
}

// test566: O(n)  loop where inner does O(1) via helper5 with loop variable
int test566(int n) {
    int s = 0;
    for (int i = 0; i < n; i++) {
        s += (i * i + 1);  // O(1) per iteration
    }
    return s;
}

// test567: O(n*m)  two independent loops, outer n inner m, different bodies
int test567(int n, int m) {
    int s = 0;
    for (int i = 0; i < n; i++) {
        int acc = 0;
        for (int j = 0; j < m; j++) acc += j;
        s += acc;
    }
    return s;
}

// test568: O(n^2)  loop where inner bound depends on outer var (i+1 to n)
//          triangle pattern: sum over i from 0 to n-1 of (n-i) = O(n^2)
int test568(int n) {
    int s = 0;
    for (int i = 0; i < n; i++)
        for (int j = i; j < n; j++) s++;
    return s;
    // sum = n + (n-1) + ... + 1 = n*(n+1)/2 = O(n^2)
}

// test569: O(n^2)  upper triangle with alias
int test569(int n) {
    int lim = n;
    int s = 0;
    for (int i = 0; i < lim; i++)
        for (int j = i + 1; j < lim; j++) s++;
    return s;
    // strictly upper triangle = n*(n-1)/2 = O(n^2)
}

// ══════════════════════════════════════════════════════════════════
//  §N  ADDITIONAL FUNCTION REUSE —
//      NEW HELPERS CALLED FROM 3+ TESTS
// ══════════════════════════════════════════════════════════════════

// helper68 reuse: test524/525/526/527/528/529/530/531/553 cover it.
// Below: additional callers of helper63, helper71, helper83.

// test570: O(n*m)  helper63 with n=rows, m=cols (matrix naming)
int test570(int rows, int cols) {
    return helper63(rows, cols);
}

// test571: O(n*m)  helper63 with aliased container sizes
int test571(vector<int>& v, vector<int>& u) {
    int n = (int)v.size();
    int m = (int)u.size();
    return helper63(n, m);
}

// test572: O(cap+lim)  helper71 with different naming
int test572(int n, int m) {
    return helper71(n, m);
    // helper71's params are cap,lim => maps n->cap, m->lim: O(n+m)
}

// test573: O(cap*lim)  helper83 with n,m substituted
int test573(int n, int m) {
    return helper83(n, m);
    // O(n*m)
}

// test574: O(n*m)  helper90 with aliased container sizes
int test574(vector<int>& v, int m) {
    int n = (int)v.size();
    return helper90(n, m);
}

// test575: O(wid*hgt)  helper70 with param names n, m (different from wid/hgt)
int test575(int n, int m) {
    return helper70(n, m);
}

// ══════════════════════════════════════════════════════════════════
//  §O  COMBINED ALIAS-CHAIN + SCOPE + CAST STRESS TESTS
// ══════════════════════════════════════════════════════════════════

// test576: O(n)
//  v.size()->(long long)cast->alias ll->(int)cast->alias n
//  ->scope block: inner alias p = n -> fo(i, p)
int test576(vector<int>& v) {
    long long ll = (long long)v.size();
    int n = (int)ll;
    int s = 0;
    {
        int p = n;
        fo(i, p) s++;
    }
    return s;
}

// test577: O(n)
//  v.size()->(size_t)cast->alias n, inner scope shadows n with 1,
//  outer loop uses outer n
int test577(vector<int>& v) {
    int n = (int)(size_t)v.size();
    {
        int n = 1;   // shadows: inner n = 1
        (void)n;
    }
    int s = 0;
    for (int i = 0; i < n; i++) s++;  // outer n = v.size()
    return s;
}

// test578: O(m)
//  outer param n alias, inner block shadows with m, fo uses inner alias
int test578(int n, int m) {
    int lim = n;
    int s = 0;
    {
        int lim = m;   // shadow
        int a   = lim;
        fo(i, a) s++;
    }
    return s;
    // inner: lim = m, a = lim = m => O(m)
}

// test579: O(n*m)
//  outer: n = (int)v.size(), inner scope: m from param -> nested macros
int test579(vector<int>& v, int m) {
    int n = (int)v.size();
    int s = 0;
    {
        int mm = m;
        fo(i, n) fo(j, mm) s++;
    }
    return s;
}

// test580: O(n)
//  for-init alias: for(int n=(int)v.size(), i=0; i<n; i++)
int test580(vector<int>& v) {
    int s = 0;
    for (int n = (int)v.size(), i = 0; i < n; i++) s++;
    return s;
}

// test581: O(n^2)
//  for-init outer: int n=(int)v.size(); inner loop up to n
int test581(vector<int>& v) {
    int s = 0;
    for (int n = (int)v.size(), i = 0; i < n; i++)
        for (int j = 0; j < n; j++) s++;
    return s;
    // n = v.size() => O(n^2)
}

// ══════════════════════════════════════════════════════════════════
//  §P  RARE STRUCTURAL FORMS (remaining gaps)
// ══════════════════════════════════════════════════════════════════

// test582: O(n)  long long loop variable, foLL macro
int test582(int n) {
    long long ll = n;
    long long s  = 0;
    foLL(i, ll) s++;
    return (int)s;
}

// test583: O(n*m)  repLL nested: long long bounds
int test583(int n, int m) {
    long long nn = n;
    long long mm = m;
    long long s  = 0;
    repLL(i, 0, nn) repLL(j, 0, mm) s++;
    return (int)s;
}

// test584: O(n)  string.size() direct in loop with (int) cast, no alias
int test584(string& str) {
    int s = 0;
    for (int i = 0; i < (int)str.size(); i++) s++;
    return s;
}

// test585: O(n)  v.size() with no cast, used directly as unsigned — no alias
int test585(vector<int>& v) {
    int s = 0;
    for (size_t i = 0; i < v.size(); i++) s++;
    return s;
}

// test586: O(n+m)  size_t loop vars, two containers
int test586(vector<int>& v, deque<int>& dq) {
    int s = 0;
    for (size_t i = 0; i < v.size();  i++) s++;
    for (size_t i = 0; i < dq.size(); i++) s++;
    return s;
}

// test587: O(n^2)  size_t outer, size_t inner, same container
int test587(vector<int>& v) {
    int s = 0;
    for (size_t i = 0; i < v.size(); i++)
        for (size_t j = 0; j < v.size(); j++) s++;
    return s;
}

// test588: O(n)  ptrdiff_t as alias type
int test588(vector<int>& v) {
    ptrdiff_t n = (ptrdiff_t)v.size();
    int s = 0;
    for (ptrdiff_t i = 0; i < n; i++) s++;
    return s;
}

// test589: O(n*m)  one cast alias, one param, helper68 (n*log(m)) — different
//          Here: outer n-loop, inner alias mm -> multiply, O(n*m) raw nested
int test589(int n, int m) {
    int mm = m;
    int s = 0;
    for (int i = 0; i < n; i++)
        for (int j = 0; j < mm; j++) s++;
    return s;
}

// test590: O(n*log(n))  n loop outer, inner helper43 (left-shift log) on n
int test590(int n) {
    int s = 0;
    for (int i = 0; i < n; i++) s += helper43(n);
    return s;
}

// test591: O(n*log(n))  n loop outer, inner helper28 (log base 3) on n
int test591(int n) {
    int s = 0;
    fo(i, n) s += helper28(n);
    return s;
}

// test592: O(n*m*log(r))  three params: outer n*m loop, inner log on r
int test592(int n, int m, int r) {
    int s = 0;
    for (int i = 0; i < n; i++)
        for (int j = 0; j < m; j++)
            for (int k = r; k > 0; k >>= 1) s++;
    return s;
}

// test593: O(n*log(m))  outer fo alias, inner right-shift on m alias
int test593(int n, int m) {
    int nn = n;
    int mm = m;
    int s  = 0;
    fo(i, nn) {
        for (int j = mm; j > 0; j >>= 1) s++;
    }
    return s;
}

// test594: O(n)  inner block declares alias, outer loop references outer alias
int test594(int n, int m) {
    int outer = n;
    int s = 0;
    for (int i = 0; i < outer; i++) {
        int inner_alias = m;  // inner alias per iter, O(1)
        s += (inner_alias > 0 ? 1 : 0);
    }
    return s;
    // outer loop O(n), inner O(1) => O(n)
}

// test595: O(n)  alias chain: param -> alias in outer scope ->
//          alias in for-init -> loop
int test595(int n) {
    int a = n;
    int s = 0;
    for (int b = a, i = 0; i < b; i++) s++;
    return s;
    // b = a = n in for-init => O(n)
}

// test596: O(n+m)  two separate for-init aliases, sequential loops
int test596(int n, int m) {
    int s = 0;
    for (int lim = n, i = 0; i < lim; i++) s++;
    for (int lim = m, i = 0; i < lim; i++) s++;
    return s;
}

// test597: O(rows*cols)
//  g.size()->(int)cast->alias rows, g[0].size()->(int)cast->alias cols
//  -> helper63(rows, cols)  (full chain)
int test597(vector<vector<int>>& g) {
    int rows = (int)g.size();
    int cols = (g.empty() ? 0 : (int)g[0].size());
    return helper63(rows, cols);
}

// test598: O(n+m)
//  n = (int)v.size(), m = (int)u.size()
//  -> compound alias total = n + m -> while loop
int test598(vector<int>& v, vector<int>& u) {
    int n     = (int)v.size();
    int m     = (int)u.size();
    int total = n + m;
    int i = 0, s = 0;
    while (i < total) { s++; i++; }
    return s;
}

// test599: O(n*m)
//  n = (int)(long long)v.size()
//  m = (int)(long long)u.size()
//  -> three-hop alias chain each -> NEST2 macro
int test599(vector<int>& v, vector<int>& u) {
    int n1 = (int)(long long)v.size();
    int n2 = n1;
    int m1 = (int)(long long)u.size();
    int m2 = m1;
    int s  = 0;
    NEST2(i, n2, j, m2, { s++; });
    return s;
}

// test600: O(n^2*log(n))
//  n from v.size(), cast alias, nested fo(fo), inner helper34(n)
int test600(vector<int>& v) {
    int n = (int)v.size();
    int s = 0;
    fo(i, n) fo(j, n) s += helper34(n);
    return s;
    // n^2 macro iterations * O(log n) per helper34 => O(n^2*log(n))
}
