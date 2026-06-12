// validation_corpus_batch4.cpp
// Compiler-Grade AST Complexity Validation Corpus — Batch 4 (test601–test800)
// C++17 — Compilable
//
// Design philosophy:
//   Every function introduces a structural dimension absent from tests 1–600.
//   Priority areas:
//     - const/auto/typedef/using declaration styles as alias sources
//     - static_cast<> and C++ cast expressions (not C-style only)
//     - deeply parenthesized bounds ((((n))))
//     - multiset/unordered_set/multimap container sizes
//     - new helper chains: five-deep and six-deep, new param names
//     - for-range over map/set/unordered_map with inner nesting
//     - const alias propagation
//     - using-alias and typedef-alias for loop bounds
//     - helper returning a helper (propagated through return value alias)
//     - compound-sum alias passed to macro / helper in same expression
//     - conservative/ambiguous boundary tests (engine should stay Unknown)
//     - new four-param and five-param helper combos
//     - n*log(n) via nested log×linear compositions not previously seen
//     - O(n+m+r+t) four-sequential, called via helper85 and inline
//     - O(n*m*r*t) four-nested inline and via helper86
//     - log(n)*log(m) double-logarithmic nested
//     - sum-alias (n+m) → passed into nested loop as single bound
//     - for-init alias + inner block + cast combo
//     - auto keyword as alias type
//     - const int as alias type
//     - typedef int MyInt / using MyInt = int chains
//     - anonymous scope blocks with multi-hop aliases
//     - range-for over map key/value pairs → inner indexed loop
//     - range-for over set → inner log helper
//     - NEST2/NEST3 macros with container-derived aliases
//     - repLL over long long alias of container size → inner fo
//     - ptrdiff_t chain with cast + helper
//     - helper returning container-derived value passed to another helper

#include <bits/stdc++.h>
using namespace std;

// ─────────────────────────────────────────────────────────────────
//  MACROS (self-contained)
// ─────────────────────────────────────────────────────────────────
#define fo(i,n)        for(int i=0;i<(n);i++)
#define rep(i,a,b)     for(int i=(a);i<(b);i++)
#define fod(i,n)       for(int i=(n)-1;i>=0;i--)
#define repe(i,a,b)    for(int i=(a);i<=(b);i++)
#define FORV(x,v)      for(auto& x : (v))
#define foLL(i,n)      for(long long i=0;i<(n);i++)
#define repLL(i,a,b)   for(long long i=(a);i<(b);i++)
#define FORI(i,a,b)    for(int i=(a);i<(b);i++)
#define NEST2(I,N,J,M,body) for(int I=0;I<(N);I++) for(int J=0;J<(M);J++) body
#define NEST3(I,N,J,M,K,R,body) \
    for(int I=0;I<(N);I++) for(int J=0;J<(M);J++) for(int K=0;K<(R);K++) body

// ─────────────────────────────────────────────────────────────────
//  ALL PREVIOUSLY DEFINED HELPERS  (helpers 1–90, self-contained)
// ─────────────────────────────────────────────────────────────────

// ── helpers 1–25 ──────────────────────────────────────────────────
int helper1(int n)  { int s=0; for(int i=0;i<n;i++) s+=i; return s; }
int helper2(int m)  { int s=0; for(int i=0;i<m;i++) s+=i; return s; }
int helper3(int n)  { int c=0; for(int i=1;i<n;i*=2) c++; return c; }
int helper4(int m)  { int c=0; for(int i=1;i<m;i*=2) c++; return c; }
int helper5(int x)  { return x*x+3; }
int helper6(int n, int m)  { int s=0; for(int i=0;i<n;i++) for(int j=0;j<m;j++) s++; return s; }
int helper7(int k)  { int s=0; for(int i=0;i<k;i++) s++; return s; }
int helper8(int r)  { int s=0; for(int i=0;i<r;i++) s++; return s; }
int helper9(int n)  { return helper1(n)+1; }
int helper10(int n, int m) { return helper6(n,m)+helper5(n); }
int helper11(int k) { int c=0; for(int i=k;i>=1;i/=2) c++; return c; }
int helper12(int a, int b) { int s=0; for(int i=0;i<a;i++) s++; for(int i=0;i<b;i++) s++; return s; }
int helper13(int n) { int s=0; for(int i=0;i<n;i++) for(int j=0;j<n;j++) s++; return s; }
int helper14(int n) { int s=0; for(int i=0;i<n;i++) for(int j=0;j<n;j++) for(int k=0;k<n;k++) s++; return s; }
int helper15(int n) { int s=0; for(int i=0;i<n;i++) s+=i*2; return s; }
int helper16(int n) { return helper15(n)+n; }
int helper17(int n) { return helper16(n)-1; }
int helper18(int sz){ int s=0; for(int i=0;i<sz;i++) s++; return s; }
int helper19(int len){ int s=0; for(int i=0;i<len;i++) s++; return s; }
int helper20(int rows, int cols) { int s=0; for(int i=0;i<rows;i++) for(int j=0;j<cols;j++) s++; return s; }
int helper21(int n, int m, int r) { int s=0; for(int i=0;i<n;i++) for(int j=0;j<m;j++) for(int k=0;k<r;k++) s++; return s; }
int helper22(int n) { int c=0; for(int i=1;i<n;i<<=1) c++; return c; }
int helper23(int a, int b, int c) { int s=0; for(int i=0;i<a;i++) s++; for(int i=0;i<b;i++) s++; for(int i=0;i<c;i++) s++; return s; }
int helper24(int n) { return helper13(n)*2; }
int helper25(int n, int m, int x) { return helper6(n,m)+helper5(x); }

// ── helpers 26–60 ─────────────────────────────────────────────────
int helper26(int p)  { int s=0; for(int i=0;i<p;i++) s+=2; return s; }
int helper27(int q)  { int s=0; for(int i=0;i<q;i++) s++; return s; }
int helper28(int p)  { int c=0; for(int i=1;i<p;i*=3) c++; return c; }
int helper29(int p, int q) { int s=0; for(int i=0;i<p;i++) s++; for(int i=0;i<q;i++) s++; return s; }
int helper30(int p, int q) { int s=0; for(int i=0;i<p;i++) for(int j=0;j<q;j++) s++; return s; }
int helper31(int p)  { return helper26(p)+p; }
int helper32(int p)  { return helper31(p)-1; }
int helper33(int p)  { return helper32(p)+0; }
int helper34(int p)  { int c=0; for(int i=p;i>0;i>>=1) c++; return c; }
int helper35(int p)  { int s=0; for(int i=0;i<p;i++) for(int j=0;j<p;j++) s++; return s; }
int helper36(int p)  { int s=0; for(int i=0;i<p;i++) for(int j=0;j<p;j++) for(int k=0;k<p;k++) s++; return s; }
int helper37(int p)  { return helper35(p)+p; }
int helper38(int p, int q, int r) { int s=0; for(int i=0;i<p;i++) for(int j=0;j<q;j++) for(int k=0;k<r;k++) s++; return s; }
int helper39(int p, int q, int r) { int s=0; for(int i=0;i<p;i++) s++; for(int i=0;i<q;i++) s++; for(int i=0;i<r;i++) s++; return s; }
int helper40(int depth) { int s=0; for(int i=0;i<depth;i++) s++; return s; }
int helper41(int depth) { return helper40(depth)*2; }
int helper42(int depth) { return helper41(depth)+1; }
int helper43(int q)  { int c=0; for(int i=1;i<q;i<<=1) c++; return c; }
int helper44(int p, int q) { return helper29(p,q)+0; }
int helper45(int p, int q) { return helper30(p,q)+1; }
int helper46(int p, int q) { return helper45(p,q)-1; }
int helper47(int cnt){ int s=0; for(int i=0;i<cnt;i++) s++; return s; }
int helper48(int cnt){ return helper47(cnt)+cnt; }
int helper49(int cnt){ return helper48(cnt)-1; }
int helper50(int cnt){ return helper49(cnt)+0; }
int helper51(int rows, int cols) { int s=0; for(int i=0;i<rows;i++) for(int j=0;j<cols;j++) s++; return s; }
int helper52(int rows, int cols) { return helper51(rows,cols)+rows; }
int helper53(int rows, int cols) { return helper52(rows,cols)*1; }
int helper54(int a, int b, int c, int d) { int s=0; for(int i=0;i<a;i++) s++; for(int i=0;i<b;i++) s++; for(int i=0;i<c;i++) s++; for(int i=0;i<d;i++) s++; return s; }
int helper55(int n)  { int s=0; for(int i=1;i<=n;i++) s+=helper34(i); return s; }
int helper56(int p, int q) { int s=0; for(int i=0;i<p;i++) for(int j=0;j<p;j++) for(int k=0;k<q;k++) s++; return s; }
int helper57(int p, int q) { int s=0; for(int i=0;i<p;i++) for(int j=0;j<q;j++) for(int k=0;k<q;k++) s++; return s; }
int helper58(int p)  { int s=0; fo(i,p) s++; return s; }
int helper59(int p)  { return helper58(p)+0; }
int helper60(int p)  { return helper59(p)+1; }

// ── helpers 61–90 ─────────────────────────────────────────────────
int helper61(int wid){ int s=0; for(int i=0;i<wid;i++) s++; return s; }
int helper62(int hgt){ int s=0; for(int i=0;i<hgt;i++) s++; return s; }
int helper63(int wid, int hgt) { int s=0; for(int i=0;i<wid;i++) for(int j=0;j<hgt;j++) s++; return s; }
int helper64(int cap){ int s=0; for(int i=0;i<cap;i++) s++; return s; }
int helper65(int lim){ int s=0; for(int i=0;i<lim;i++) s++; return s; }
int helper66(int cap){ return helper64(cap)+cap; }
int helper67(int lim){ return helper65(lim)-1; }
int helper68(int n, int m) { int s=0; for(int i=0;i<n;i++) for(int j=m;j>0;j>>=1) s++; return s; }
int helper69(int wid, int hgt) { return helper63(wid,hgt)+wid; }
int helper70(int wid, int hgt) { return helper69(wid,hgt)*1; }
int helper71(int cap, int lim) { int s=0; for(int i=0;i<cap;i++) s++; for(int i=0;i<lim;i++) s++; return s; }
int helper72(int cap, int lim) { return helper71(cap,lim)+0; }
int helper73(int n)  { int s=0; fo(i,n) s+=1; return s; }
int helper74(int n)  { return helper73(n)+0; }
int helper75(int n)  { return helper74(n)-1; }
int helper76(int n, int m) { int s=0; fo(i,n) fo(j,m) s++; return s; }
int helper77(int n, int m) { return helper76(n,m)+1; }
int helper78(int n, int m) { return helper77(n,m)*1; }
int helper79(int n)  { int s=0; for(int i=0;i<n;i++) for(int j=0;j<n;j++) for(int k=n;k>0;k>>=1) s++; return s; }
int helper80(int n)  { return helper68(n,n); }
int helper81(int wid, int hgt) { int s=0; for(int i=0;i<wid;i++) s++; for(int j=0;j<hgt;j++) s++; return s; }
int helper82(int wid, int hgt) { return helper81(wid,hgt)+0; }
int helper83(int cap, int lim) { int s=0; for(int i=0;i<cap;i++) for(int j=0;j<lim;j++) s++; return s; }
int helper84(long long n) { long long s=0; for(long long i=0;i<n;i++) s++; return (int)s; }
int helper85(int n, int m, int r, int t) { int s=0; for(int i=0;i<n;i++) s++; for(int i=0;i<m;i++) s++; for(int i=0;i<r;i++) s++; for(int i=0;i<t;i++) s++; return s; }
int helper86(int n, int m, int r, int t) { int s=0; for(int i=0;i<n;i++) for(int j=0;j<m;j++) for(int k=0;k<r;k++) for(int l=0;l<t;l++) s++; return s; }
int helper87(int n)  { int s=0; rep(i,0,n) s++; return s; }
int helper88(int n)  { return helper87(n)+n; }
int helper89(int n)  { return helper88(n)-1; }
int helper90(int n, int m) { int s=0; rep(i,0,n) rep(j,0,m) s++; return s; }

// ─────────────────────────────────────────────────────────────────
//  NEW HELPERS FOR BATCH 4  (helper91 – helper120)
// ─────────────────────────────────────────────────────────────────

// helper91: O(e)  — new param name "e"
int helper91(int e) {
    int s = 0;
    for (int i = 0; i < e; i++) s++;
    return s;
}

// helper92: O(e)  calls helper91
int helper92(int e) {
    return helper91(e) + 0;
}

// helper93: O(e)  calls helper92 -> helper91
int helper93(int e) {
    return helper92(e) + 1;
}

// helper94: O(e)  calls helper93 -> helper92 -> helper91  (4-deep, new param)
int helper94(int e) {
    return helper93(e) - 1;
}

// helper95: O(e)  calls helper94 (5-deep chain)
int helper95(int e) {
    return helper94(e) + 0;
}

// helper96: O(e)  calls helper95 (6-deep chain)
int helper96(int e) {
    return helper95(e) * 1;
}

// helper97: O(log e)  — log on param "e"
int helper97(int e) {
    int c = 0;
    for (int i = 1; i < e; i *= 2) c++;
    return c;
}

// helper98: O(log e)  calls helper97
int helper98(int e) {
    return helper97(e) + 0;
}

// helper99: O(e^2)  — quadratic on "e"
int helper99(int e) {
    int s = 0;
    for (int i = 0; i < e; i++)
        for (int j = 0; j < e; j++) s++;
    return s;
}

// helper100: O(e*f)  — product with two new params "e","f"
int helper100(int e, int f) {
    int s = 0;
    for (int i = 0; i < e; i++)
        for (int j = 0; j < f; j++) s++;
    return s;
}

// helper101: O(e+f)  — sum of two new params
int helper101(int e, int f) {
    int s = 0;
    for (int i = 0; i < e; i++) s++;
    for (int i = 0; i < f; i++) s++;
    return s;
}

// helper102: O(e*f)  calls helper100
int helper102(int e, int f) {
    return helper100(e, f) + 1;
}

// helper103: O(e*f)  calls helper102 -> helper100
int helper103(int e, int f) {
    return helper102(e, f) - 1;
}

// helper104: O(e+f)  calls helper101
int helper104(int e, int f) {
    return helper101(e, f) + 0;
}

// helper105: O(e+f)  calls helper104 -> helper101
int helper105(int e, int f) {
    return helper104(e, f) * 1;
}

// helper106: O(n*log(n))  — outer n loop, inner log(n) right-shift
int helper106(int n) {
    int s = 0;
    for (int i = 0; i < n; i++)
        for (int j = n; j > 0; j >>= 1) s++;
    return s;
}

// helper107: O(n*log(n))  calls helper106
int helper107(int n) {
    return helper106(n) + 0;
}

// helper108: O(log(n)*log(m))  — two nested logarithmic loops
int helper108(int n, int m) {
    int s = 0;
    for (int i = 1; i < n; i *= 2)
        for (int j = 1; j < m; j *= 2) s++;
    return s;
}

// helper109: O(log(n)*log(m))  calls helper108
int helper109(int n, int m) {
    return helper108(n, m) + 0;
}

// helper110: O(n+m+r+t)  calls helper85
int helper110(int n, int m, int r, int t) {
    return helper85(n, m, r, t) + 0;
}

// helper111: O(n*m*r*t)  calls helper86
int helper111(int n, int m, int r, int t) {
    return helper86(n, m, r, t) + 0;
}

// helper112: O(e^3)  — cubic on "e"
int helper112(int e) {
    int s = 0;
    for (int i = 0; i < e; i++)
        for (int j = 0; j < e; j++)
            for (int k = 0; k < e; k++) s++;
    return s;
}

// helper113: O(e^3)  calls helper112
int helper113(int e) {
    return helper112(e) + 0;
}

// helper114: O(e*f*g)  — three new param names
int helper114(int e, int f, int g) {
    int s = 0;
    for (int i = 0; i < e; i++)
        for (int j = 0; j < f; j++)
            for (int k = 0; k < g; k++) s++;
    return s;
}

// helper115: O(e+f+g)  — three-way sum with new names
int helper115(int e, int f, int g) {
    int s = 0;
    for (int i = 0; i < e; i++) s++;
    for (int i = 0; i < f; i++) s++;
    for (int i = 0; i < g; i++) s++;
    return s;
}

// helper116: O(e)  — static_cast<int> used internally
int helper116(int e) {
    int n = static_cast<int>(e);
    int s = 0;
    for (int i = 0; i < n; i++) s++;
    return s;
}

// helper117: O(e)  calls helper116
int helper117(int e) {
    return helper116(e) + 0;
}

// helper118: O(e*f)  — fo macro inside, new names
int helper118(int e, int f) {
    int s = 0;
    fo(i, e) fo(j, f) s++;
    return s;
}

// helper119: O(e*f)  calls helper118
int helper119(int e, int f) {
    return helper118(e, f) - 1;
}

// helper120: O(e*f)  calls helper119 -> helper118  (3-deep macro-helper chain)
int helper120(int e, int f) {
    return helper119(e, f) + 2;
}

// ─────────────────────────────────────────────────────────────────
//  TEST FUNCTIONS  test601 – test800
// ─────────────────────────────────────────────────────────────────

// ══════════════════════════════════════════════════════════════════
//  §A  typedef / using ALIAS DECLARATIONS AS LOOP BOUNDS
// ══════════════════════════════════════════════════════════════════

// test601: O(n)  — typedef int MyInt; MyInt n = param; loop
int test601(int n) {
    typedef int MyInt;
    MyInt lim = n;
    int s = 0;
    for (MyInt i = 0; i < lim; i++) s++;
    return s;
}

// test602: O(n)  — using MyInt = int; MyInt alias chain
int test602(int n) {
    using MyInt = int;
    MyInt a = n;
    MyInt b = a;
    int s = 0;
    for (MyInt i = 0; i < b; i++) s++;
    return s;
}

// test603: O(n*m)  — typedef int Dim; Dim n, m; nested loops
int test603(int n, int m) {
    typedef int Dim;
    Dim r = n;
    Dim c = m;
    int s = 0;
    for (Dim i = 0; i < r; i++)
        for (Dim j = 0; j < c; j++) s++;
    return s;
}

// test604: O(n)  — using Sz = int; container alias via Sz
int test604(vector<int>& v) {
    using Sz = int;
    Sz n = static_cast<Sz>(v.size());
    int s = 0;
    for (Sz i = 0; i < n; i++) s++;
    return s;
}

// test605: O(n+m)  — typedef double-hop: MyLen = int; MyLen a = v.size(), b = u.size()
int test605(vector<int>& v, vector<int>& u) {
    typedef int MyLen;
    MyLen a = (MyLen)v.size();
    MyLen b = (MyLen)u.size();
    int s = 0;
    for (MyLen i = 0; i < a; i++) s++;
    for (MyLen i = 0; i < b; i++) s++;
    return s;
}

// ══════════════════════════════════════════════════════════════════
//  §B  const / const auto / auto ALIAS DECLARATIONS
// ══════════════════════════════════════════════════════════════════

// test606: O(n)  — const int alias
int test606(int n) {
    const int lim = n;
    int s = 0;
    for (int i = 0; i < lim; i++) s++;
    return s;
}

// test607: O(n)  — auto alias from param
int test607(int n) {
    auto lim = n;
    int s = 0;
    for (int i = 0; i < lim; i++) s++;
    return s;
}

// test608: O(n)  — const auto alias from v.size()
int test608(vector<int>& v) {
    const auto n = (int)v.size();
    int s = 0;
    for (int i = 0; i < n; i++) s++;
    return s;
}

// test609: O(n*m)  — auto aliases, nested loops
int test609(int n, int m) {
    auto rr = n;
    auto cc = m;
    int s = 0;
    for (auto i = 0; i < rr; i++)
        for (auto j = 0; j < cc; j++) s++;
    return s;
}

// test610: O(n)  — const auto alias chain: const auto a = n; const auto b = a;
int test610(int n) {
    const auto a = n;
    const auto b = a;
    int s = 0;
    for (int i = 0; i < b; i++) s++;
    return s;
}

// test611: O(n+m)  — const int + const int, two sequential loops
int test611(int n, int m) {
    const int p = n;
    const int q = m;
    int s = 0;
    for (int i = 0; i < p; i++) s++;
    for (int i = 0; i < q; i++) s++;
    return s;
}

// test612: O(n)  — auto deduced from container size, fo macro
int test612(vector<int>& v) {
    auto n = (int)v.size();
    int s = 0;
    fo(i, n) s++;
    return s;
}

// test613: O(log n)  — const int alias then log loop
int test613(int n) {
    const int sz = n;
    int c = 0;
    for (int i = 1; i < sz; i *= 2) c++;
    return c;
}

// test614: O(log n)  — auto alias then right-shift loop
int test614(int n) {
    auto bound = n;
    int c = 0;
    for (int i = bound; i > 0; i >>= 1) c++;
    return c;
}

// test615: O(n^2)  — const auto from v.size(), nested loops
int test615(vector<int>& v) {
    const auto n = (int)v.size();
    int s = 0;
    for (int i = 0; i < n; i++)
        for (int j = 0; j < n; j++) s++;
    return s;
}

// ══════════════════════════════════════════════════════════════════
//  §C  static_cast<> EXPRESSIONS (C++ cast, not C-style)
// ══════════════════════════════════════════════════════════════════

// test616: O(n)  — static_cast<int>(v.size()) as alias
int test616(vector<int>& v) {
    int n = static_cast<int>(v.size());
    int s = 0;
    for (int i = 0; i < n; i++) s++;
    return s;
}

// test617: O(n)  — static_cast<int>(str.size()) as alias
int test617(string& str) {
    int n = static_cast<int>(str.size());
    int s = 0;
    for (int i = 0; i < n; i++) s++;
    return s;
}

// test618: O(n)  — static_cast<long long>(v.size()) -> static_cast<int> chain
int test618(vector<int>& v) {
    long long ll = static_cast<long long>(v.size());
    int n = static_cast<int>(ll);
    int s = 0;
    for (int i = 0; i < n; i++) s++;
    return s;
}

// test619: O(n*m)  — static_cast aliases, nested loops
int test619(vector<int>& v, vector<int>& u) {
    int n = static_cast<int>(v.size());
    int m = static_cast<int>(u.size());
    int s = 0;
    for (int i = 0; i < n; i++)
        for (int j = 0; j < m; j++) s++;
    return s;
}

// test620: O(n)  — static_cast<int> inside fo macro arg directly
int test620(vector<int>& v) {
    int s = 0;
    fo(i, static_cast<int>(v.size())) s++;
    return s;
}

// test621: O(n)  — static_cast<int> as helper argument
int test621(vector<int>& v) {
    return helper91(static_cast<int>(v.size()));
}

// test622: O(n)  — static_cast<int> passed into helper7
int test622(deque<int>& dq) {
    return helper7(static_cast<int>(dq.size()));
}

// test623: O(n+m)  — static_cast aliases passed to helper29
int test623(set<int>& st, multiset<int>& ms) {
    int n = static_cast<int>(st.size());
    int m = static_cast<int>(ms.size());
    return helper29(n, m);
}

// test624: O(n*m)  — static_cast aliases passed to helper100
int test624(vector<int>& v, vector<int>& u) {
    int e = static_cast<int>(v.size());
    int f = static_cast<int>(u.size());
    return helper100(e, f);
}

// ══════════════════════════════════════════════════════════════════
//  §D  DEEPLY PARENTHESIZED BOUNDS  ((((n))))
// ══════════════════════════════════════════════════════════════════

// test625: O(n)  — double-paren bound in loop
int test625(int n) {
    int s = 0;
    for (int i = 0; i < ((n)); i++) s++;
    return s;
}

// test626: O(n)  — triple-paren bound in loop
int test626(int n) {
    int s = 0;
    for (int i = 0; i < (((n))); i++) s++;
    return s;
}

// test627: O(n)  — four-paren bound in loop
int test627(int n) {
    int s = 0;
    for (int i = 0; i < ((((n)))); i++) s++;
    return s;
}

// test628: O(n)  — six-paren bound in while loop
int test628(int n) {
    int i = 0, s = 0;
    while (i < ((((((n))))))) { s++; i++; }
    return s;
}

// test629: O(n)  — paren alias then paren loop
int test629(int n) {
    int lim = ((n));
    int s = 0;
    for (int i = 0; i < ((lim)); i++) s++;
    return s;
}

// test630: O(n)  — parens around v.size() alias
int test630(vector<int>& v) {
    int n = (int)((v.size()));
    int s = 0;
    for (int i = 0; i < n; i++) s++;
    return s;
}

// test631: O(n)  — triple-paren v.size() in fo macro
int test631(vector<int>& v) {
    int n = (int)(((v.size())));
    int s = 0;
    fo(i, n) s++;
    return s;
}

// test632: O(n+m)  — paren around sum alias
int test632(int n, int m) {
    int total = ((n + m));
    int s = 0;
    for (int i = 0; i < total; i++) s++;
    return s;
}

// test633: O(n+m)  — deeply paren sum: (((n+m)))
int test633(int n, int m) {
    int bound = (((n + m)));
    int s = 0;
    for (int i = 0; i < bound; i++) s++;
    return s;
}

// test634: O(n+m+r)  — paren sum three terms
int test634(int n, int m, int r) {
    int total = (((n + m + r)));
    int s = 0;
    for (int i = 0; i < total; i++) s++;
    return s;
}

// test635: O(n)  — paren in helper arg: helper91(((n)))
int test635(int n) {
    return helper91(((n)));
}

// test636: O(log n)  — paren in log loop bound
int test636(int n) {
    int c = 0;
    for (int i = 1; i < ((n)); i *= 2) c++;
    return c;
}

// test637: O(n^2)  — paren bounds on nested loops
int test637(int n) {
    int s = 0;
    for (int i = 0; i < ((n)); i++)
        for (int j = 0; j < ((n)); j++) s++;
    return s;
}

// ══════════════════════════════════════════════════════════════════
//  §E  NEW CONTAINER TYPES: multiset, multimap, unordered_set,
//      unordered_multiset, unordered_multimap, array
// ══════════════════════════════════════════════════════════════════

// test638: O(n)  — multiset.size() alias, linear loop
int test638(multiset<int>& ms) {
    int n = (int)ms.size();
    int s = 0;
    for (int i = 0; i < n; i++) s++;
    return s;
}

// test639: O(n)  — unordered_set.size() alias, fo macro
int test639(unordered_set<int>& us) {
    int n = static_cast<int>(us.size());
    int s = 0;
    fo(i, n) s++;
    return s;
}

// test640: O(n)  — unordered_multiset.size() alias, while loop
int test640(unordered_multiset<int>& ums) {
    int n = (int)ums.size();
    int i = 0, s = 0;
    while (i < n) { s++; i++; }
    return s;
}

// test641: O(n)  — multimap.size() alias, loop
int test641(multimap<int,int>& mm) {
    int n = static_cast<int>(mm.size());
    int s = 0;
    for (int i = 0; i < n; i++) s++;
    return s;
}

// test642: O(n)  — unordered_multimap.size() alias, rep macro
int test642(unordered_multimap<int,int>& umm) {
    int n = (int)umm.size();
    int s = 0;
    rep(i, 0, n) s++;
    return s;
}

// test643: O(n)  — std::array .size() alias, loop
int test643(array<int,100>& arr) {
    int n = (int)arr.size();
    int s = 0;
    for (int i = 0; i < n; i++) s++;
    return s;
}

// test644: O(n+m)  — multiset + unordered_set sizes, sequential
int test644(multiset<int>& ms, unordered_set<int>& us) {
    int n = (int)ms.size();
    int m = static_cast<int>(us.size());
    int s = 0;
    for (int i = 0; i < n; i++) s++;
    for (int i = 0; i < m; i++) s++;
    return s;
}

// test645: O(n*m)  — multimap * multiset sizes, nested
int test645(multimap<int,int>& mm, multiset<int>& ms) {
    int n = (int)mm.size();
    int m = (int)ms.size();
    int s = 0;
    for (int i = 0; i < n; i++)
        for (int j = 0; j < m; j++) s++;
    return s;
}

// test646: O(n)  — range-for over multiset, body O(1)
int test646(multiset<int>& ms) {
    int c = 0;
    for (auto& x : ms) { (void)x; c++; }
    return c;
    // |ms| iterations = n => O(n)
}

// test647: O(n)  — range-for over unordered_set, body O(1)
int test647(unordered_set<int>& us) {
    int c = 0;
    for (auto& x : us) { (void)x; c++; }
    return c;
}

// test648: O(n)  — range-for over multimap key-value, body O(1)
int test648(multimap<int,int>& mm) {
    int c = 0;
    for (auto& kv : mm) { (void)kv; c++; }
    return c;
}

// ══════════════════════════════════════════════════════════════════
//  §F  DEEP HELPER CHAINS: 5-deep and 6-deep on new params
// ══════════════════════════════════════════════════════════════════

// test649: O(e)  — calls helper96 (6-deep chain via 91-96)
int test649(int e) {
    return helper96(e);
}

// test650: O(e)  — calls helper95 (5-deep) with param renamed
int test650(int n) {
    return helper95(n);
    // param n mapped to helper95's e => O(n)
}

// test651: O(e)  — calls helper94 (4-deep), param k
int test651(int k) {
    return helper94(k);
    // O(k)
}

// test652: O(e)  — calls helper96 with container alias
int test652(vector<int>& v) {
    int e = static_cast<int>(v.size());
    return helper96(e);
    // O(n) where n = v.size()
}

// test653: O(e*f)  — calls helper120 (3-deep macro chain)
int test653(int e, int f) {
    return helper120(e, f);
}

// test654: O(e*f)  — calls helper120 with param renaming
int test654(int n, int m) {
    return helper120(n, m);
    // O(n*m)
}

// test655: O(e+f)  — calls helper105 (2-deep sum chain)
int test655(int a, int b) {
    return helper105(a, b);
    // O(a+b)
}

// test656: O(e*f*g)  — calls helper114 with n,m,r
int test656(int n, int m, int r) {
    return helper114(n, m, r);
    // O(n*m*r)
}

// test657: O(e+f+g)  — calls helper115 with a,b,c
int test657(int a, int b, int c) {
    return helper115(a, b, c);
    // O(a+b+c)
}

// test658: O(e^3)  — calls helper113 (calls helper112)
int test658(int n) {
    return helper113(n);
    // O(n^3)
}

// test659: O(e^2)  — calls helper99 with k
int test659(int k) {
    return helper99(k);
    // O(k^2)
}

// test660: O(n*log(n))  — calls helper107 (calls helper106)
int test660(int n) {
    return helper107(n);
    // O(n*log(n))
}

// test661: O(log(n)*log(m))  — calls helper109 (calls helper108)
int test661(int n, int m) {
    return helper109(n, m);
    // O(log(n)*log(m))
}

// test662: O(n+m+r+t)  — calls helper110 (calls helper85)
int test662(int n, int m, int r, int t) {
    return helper110(n, m, r, t);
    // O(n+m+r+t)
}

// test663: O(n*m*r*t)  — calls helper111 (calls helper86)
int test663(int n, int m, int r, int t) {
    return helper111(n, m, r, t);
    // O(n*m*r*t)
}

// ══════════════════════════════════════════════════════════════════
//  §G  log(n)*log(m) — DOUBLE LOGARITHMIC LOOPS (inline, not helper)
// ══════════════════════════════════════════════════════════════════

// test664: O(log(n)*log(m))  — nested multiply loops
int test664(int n, int m) {
    int s = 0;
    for (int i = 1; i < n; i *= 2)
        for (int j = 1; j < m; j *= 2) s++;
    return s;
}

// test665: O(log(n)*log(m))  — one left-shift, one right-shift
int test665(int n, int m) {
    int s = 0;
    for (int i = 1; i < n; i <<= 1)
        for (int j = m; j > 0; j >>= 1) s++;
    return s;
}

// test666: O(log(n)*log(m))  — aliases then nested log loops
int test666(int n, int m) {
    int a = n;
    int b = m;
    int s = 0;
    for (int i = 1; i < a; i *= 2)
        for (int j = b; j > 1; j /= 2) s++;
    return s;
}

// test667: O(log(n)*log(n))  — same param, two nested log loops
int test667(int n) {
    int s = 0;
    for (int i = 1; i < n; i *= 2)
        for (int j = 1; j < n; j *= 2) s++;
    return s;
}

// test668: O(log(n)*log(m))  — container aliases then double-log
int test668(vector<int>& v, vector<int>& u) {
    int n = static_cast<int>(v.size());
    int m = static_cast<int>(u.size());
    int s = 0;
    for (int i = 1; i < n; i *= 2)
        for (int j = 1; j < m; j *= 2) s++;
    return s;
}

// test669: O(n*log(n)*log(m))  — outer linear, inner double-log
int test669(int n, int m) {
    int s = 0;
    for (int i = 0; i < n; i++)
        for (int j = 1; j < n; j *= 2)
            for (int k = 1; k < m; k *= 2) s++;
    return s;
}

// ══════════════════════════════════════════════════════════════════
//  §H  O(n+m+r+t) FOUR-SEQUENTIAL (inline, alias, macro forms)
// ══════════════════════════════════════════════════════════════════

// test670: O(n+m+r+t)  — inline four sequential loops
int test670(int n, int m, int r, int t) {
    int s = 0;
    for (int i = 0; i < n; i++) s++;
    for (int i = 0; i < m; i++) s++;
    for (int i = 0; i < r; i++) s++;
    for (int i = 0; i < t; i++) s++;
    return s;
}

// test671: O(a+b+c+d)  — helper54 with new param names
int test671(int a, int b, int c, int d) {
    return helper54(a, b, c, d);
}

// test672: O(n+m+r+t)  — fo macro four-sequential
int test672(int n, int m, int r, int t) {
    int s = 0;
    fo(i, n) s++;
    fo(i, m) s++;
    fo(i, r) s++;
    fo(i, t) s++;
    return s;
}

// test673: O(n+m+r+t)  — aliases then four loops
int test673(int n, int m, int r, int t) {
    int a = n, b = m, c = r, d = t;
    int s = 0;
    for (int i = 0; i < a; i++) s++;
    for (int i = 0; i < b; i++) s++;
    for (int i = 0; i < c; i++) s++;
    for (int i = 0; i < d; i++) s++;
    return s;
}

// test674: O(n+m+r+t)  — four container size aliases, sequential
int test674(vector<int>& v, deque<int>& dq,
            multiset<int>& ms, unordered_set<int>& us) {
    int n = (int)v.size();
    int m = (int)dq.size();
    int r = (int)ms.size();
    int t = static_cast<int>(us.size());
    int s = 0;
    for (int i = 0; i < n; i++) s++;
    for (int i = 0; i < m; i++) s++;
    for (int i = 0; i < r; i++) s++;
    for (int i = 0; i < t; i++) s++;
    return s;
}

// ══════════════════════════════════════════════════════════════════
//  §I  O(n*m*r*t) FOUR-NESTED (inline, alias, macro forms)
// ══════════════════════════════════════════════════════════════════

// test675: O(n*m*r*t)  — inline four-nested
int test675(int n, int m, int r, int t) {
    int s = 0;
    for (int i = 0; i < n; i++)
        for (int j = 0; j < m; j++)
            for (int k = 0; k < r; k++)
                for (int l = 0; l < t; l++) s++;
    return s;
}

// test676: O(a*b*c*d)  — aliases then four nested
int test676(int a, int b, int c, int d) {
    int s = 0;
    for (int i = 0; i < a; i++)
        for (int j = 0; j < b; j++)
            for (int k = 0; k < c; k++)
                for (int l = 0; l < d; l++) s++;
    return s;
}

// test677: O(n*m*r*t)  — calls helper86
int test677(int n, int m, int r, int t) {
    return helper86(n, m, r, t);
}

// test678: O(n*m*r*t)  — fo macro nested four levels
int test678(int n, int m, int r, int t) {
    int s = 0;
    fo(i, n) fo(j, m) fo(k, r) fo(l, t) s++;
    return s;
}

// ══════════════════════════════════════════════════════════════════
//  §J  RANGE-FOR OVER map/set WITH INNER NESTED LOOPS
// ══════════════════════════════════════════════════════════════════

// test679: O(n*m)  — range-for over map (|map|=n), inner fo(m)
int test679(map<int,int>& mp, int m) {
    int s = 0;
    for (auto& kv : mp) {
        (void)kv;
        fo(j, m) s++;
    }
    return s;
    // n = mp.size(), inner O(m) => O(n*m)
}

// test680: O(n*m)  — range-for over set (|set|=n), inner for(m)
int test680(set<int>& st, int m) {
    int s = 0;
    for (auto& x : st) {
        (void)x;
        for (int j = 0; j < m; j++) s++;
    }
    return s;
}

// test681: O(n*log(n))  — range-for over set, inner helper3 per element
int test681(set<int>& st) {
    int n = static_cast<int>(st.size());
    int s = 0;
    for (auto& x : st) {
        (void)x;
        s += helper3(n);
    }
    return s;
    // n iterations * O(log n) each => O(n*log(n))
}

// test682: O(n^2)  — range-for over map, inner range-for over same map
int test682(map<int,int>& mp) {
    int s = 0;
    for (auto& kv1 : mp) {
        (void)kv1;
        for (auto& kv2 : mp) { (void)kv2; s++; }
    }
    return s;
    // |mp|=n => O(n^2)
}

// test683: O(n+m)  — range-for over set + range-for over map, sequential
int test683(set<int>& st, map<int,int>& mp) {
    int s = 0;
    for (auto& x : st) { (void)x; s++; }
    for (auto& kv : mp) { (void)kv; s++; }
    return s;
    // |st|=n, |mp|=m => O(n+m)
}

// ══════════════════════════════════════════════════════════════════
//  §K  COMPOUND SUM ALIAS → HELPER / NESTED LOOP
// ══════════════════════════════════════════════════════════════════

// test684: O(n+m)  — sum alias passed to helper7
int test684(int n, int m) {
    int total = n + m;
    return helper7(total);
    // helper7(k): O(k) = O(n+m)
}

// test685: O(n+m)  — sum alias passed to helper26
int test685(int n, int m) {
    int sum = n + m;
    return helper26(sum);
    // O(n+m)
}

// test686: O(n+m)  — sum alias, then fo macro
int test686(int n, int m) {
    int bound = n + m;
    int s = 0;
    fo(i, bound) s++;
    return s;
}

// test687: O(n+m)  — sum alias via container sizes, then rep macro
int test687(vector<int>& v, string& str) {
    int n = static_cast<int>(v.size());
    int m = static_cast<int>(str.size());
    int sum = n + m;
    int s = 0;
    rep(i, 0, sum) s++;
    return s;
}

// test688: O(n+m+r)  — three-term sum alias, while loop
int test688(int n, int m, int r) {
    int total = n + m + r;
    int i = 0, s = 0;
    while (i < total) { s++; i++; }
    return s;
}

// test689: O(n+m)  — sum alias passed to helper91
int test689(int n, int m) {
    int e = n + m;
    return helper91(e);
    // O(n+m)
}

// test690: O(n+m)  — sum alias alias chain, then loop
int test690(int n, int m) {
    int s1 = n + m;
    int s2 = s1;
    int c = 0;
    for (int i = 0; i < s2; i++) c++;
    return c;
}

// test691: O(n+m)  — const int sum alias, fo macro
int test691(int n, int m) {
    const int total = n + m;
    int s = 0;
    fo(i, total) s++;
    return s;
}

// ══════════════════════════════════════════════════════════════════
//  §L  FOR-INIT ALIAS + INNER BLOCK + CAST COMBOS
//      (patterns not covered: for-init with static_cast, const)
// ══════════════════════════════════════════════════════════════════

// test692: O(n)  — for-init static_cast alias, loop
int test692(vector<int>& v) {
    int s = 0;
    for (int n = static_cast<int>(v.size()), i = 0; i < n; i++) s++;
    return s;
}

// test693: O(n)  — for-init sum alias
int test693(int n, int m) {
    int s = 0;
    for (int total = n + m, i = 0; i < total; i++) s++;
    return s;
    // total = n+m => O(n+m)
}

// test694: O(n)  — for-init alias into inner block helper call
int test694(int n) {
    int s = 0;
    for (int lim = n, i = 0; i < lim; i++) {
        s += helper5(i);  // O(1) per call
    }
    return s;
    // O(n) * O(1) = O(n)
}

// test695: O(n^2)  — for-init alias outer, plain for inner up to same bound
int test695(vector<int>& v) {
    int s = 0;
    for (int n = static_cast<int>(v.size()), i = 0; i < n; i++)
        for (int j = 0; j < n; j++) s++;
    return s;
    // n = v.size() => O(n^2)
}

// test696: O(n*m)  — for-init outer (n=v.size()), inner param m
int test696(vector<int>& v, int m) {
    int s = 0;
    for (int n = (int)v.size(), i = 0; i < n; i++)
        for (int j = 0; j < m; j++) s++;
    return s;
}

// ══════════════════════════════════════════════════════════════════
//  §M  ANONYMOUS SCOPE BLOCKS — MULTI-HOP ALIASES
// ══════════════════════════════════════════════════════════════════

// test697: O(n)  — three nested scope blocks, alias chain
int test697(int n) {
    int s = 0;
    {
        int a = n;
        {
            int b = a;
            {
                int c = b;
                for (int i = 0; i < c; i++) s++;
            }
        }
    }
    return s;
}

// test698: O(n*m)  — two-dim alias through nested scopes
int test698(int n, int m) {
    int s = 0;
    {
        int r = n;
        {
            int c = m;
            for (int i = 0; i < r; i++)
                for (int j = 0; j < c; j++) s++;
        }
    }
    return s;
}

// test699: O(n)  — outer block creates alias; inner block creates
//          further alias; loop uses innermost
int test699(int n) {
    int s = 0;
    {
        int x = n;
        {
            int y = x;
            fo(i, y) s++;
        }
    }
    return s;
}

// test700: O(n)  — scope block with cast inside
int test700(vector<int>& v) {
    int s = 0;
    {
        int n = static_cast<int>(v.size());
        {
            const int lim = n;
            rep(i, 0, lim) s++;
        }
    }
    return s;
}

// test701: O(n^2)  — nested scope alias feeding nested loops
int test701(int n) {
    int s = 0;
    {
        auto a = n;
        {
            auto b = a;
            for (int i = 0; i < b; i++)
                for (int j = 0; j < b; j++) s++;
        }
    }
    return s;
}

// ══════════════════════════════════════════════════════════════════
//  §N  repLL + foLL WITH CONTAINER-DERIVED LONG LONG BOUNDS
// ══════════════════════════════════════════════════════════════════

// test702: O(n)  — repLL over long long alias of v.size()
int test702(vector<int>& v) {
    long long n = static_cast<long long>(v.size());
    long long s = 0;
    repLL(i, 0, n) s++;
    return (int)s;
}

// test703: O(n*m)  — repLL nested, both from container aliases
int test703(vector<int>& v, vector<int>& u) {
    long long n = (long long)v.size();
    long long m = (long long)u.size();
    long long s = 0;
    repLL(i, 0, n) repLL(j, 0, m) s++;
    return (int)s;
}

// test704: O(n)  — foLL then inner O(1) helper
int test704(int n) {
    long long ll = (long long)n;
    long long s  = 0;
    foLL(i, ll) s += helper5((int)i);
    return (int)s;
    // O(n) iterations, O(1) each
}

// test705: O(n^2)  — foLL nested same long long bound
int test705(int n) {
    long long ll = (long long)n;
    long long s  = 0;
    foLL(i, ll) foLL(j, ll) s++;
    return (int)s;
}

// test706: O(n+m)  — repLL two sequential, container aliases
int test706(vector<int>& v, deque<int>& dq) {
    long long n = (long long)v.size();
    long long m = (long long)dq.size();
    long long s = 0;
    repLL(i, 0, n) s++;
    repLL(i, 0, m) s++;
    return (int)s;
}

// ══════════════════════════════════════════════════════════════════
//  §O  ptrdiff_t CHAINS WITH CAST + HELPER
// ══════════════════════════════════════════════════════════════════

// test707: O(n)  — ptrdiff_t alias then helper91
int test707(vector<int>& v) {
    ptrdiff_t n = (ptrdiff_t)v.size();
    return helper91((int)n);
    // O(n)
}

// test708: O(n)  — ptrdiff_t alias chain then loop
int test708(vector<int>& v) {
    ptrdiff_t a = (ptrdiff_t)v.size();
    ptrdiff_t b = a;
    int s = 0;
    for (ptrdiff_t i = 0; i < b; i++) s++;
    return s;
}

// test709: O(n*m)  — ptrdiff_t two aliases, nested loops
int test709(vector<int>& v, vector<int>& u) {
    ptrdiff_t n = (ptrdiff_t)v.size();
    ptrdiff_t m = (ptrdiff_t)u.size();
    int s = 0;
    for (ptrdiff_t i = 0; i < n; i++)
        for (ptrdiff_t j = 0; j < m; j++) s++;
    return s;
}

// ══════════════════════════════════════════════════════════════════
//  §P  HELPER RETURNING VALUE USED AS ANOTHER HELPER'S ARGUMENT
// ══════════════════════════════════════════════════════════════════

// test710: O(n)  — helper5(n) returns O(1) value; that value passed to helper91
//          => helper91(helper5(n)): outer call O(n^2+3) steps, but structure:
//          the argument is an O(1) expression evaluated once,
//          so complexity is O(n^2+3) ≈ O(n^2). But wait —
//          helper5(n) = n*n+3, which is O(1) to evaluate but O(n^2) in magnitude.
//          AST-structurally: helper91(expr) where expr = helper5(n) is an O(1) call.
//          The complexity of the containing call is O(helper5(n)) = O(n^2).
//          This is a CONSERVATIVE BOUNDARY test: the engine sees helper91(helper5(n)).
//          helper91 runs a loop up to its argument. helper5(n) is O(1) to compute
//          but its VALUE is n^2+3. A pure-AST engine without value reasoning
//          should mark this UNKNOWN (cannot determine the loop count from AST alone
//          without evaluating helper5). We mark this conservatively.
// EXPECTED: Unknown
int test710(int n) {
    return helper91(helper5(n));
}

// test711: O(n)  — helper7(helper1(n)): helper1 returns a value proportional to n^2/2
//          but AST-structurally the inner call is O(n) to run; the value passed is unknown
//          from pure AST. Conservative boundary.
// EXPECTED: Unknown
int test711(int n) {
    return helper7(helper1(n));
}

// test712: O(n)  — helper91 called with result of helper97(n) (log value)
//          helper97(n) is O(log n) to run but returns ~log(n).
//          AST engine cannot determine returned integer value.
// EXPECTED: Unknown
int test712(int n) {
    return helper91(helper97(n));
}

// ══════════════════════════════════════════════════════════════════
//  §Q  CONSERVATIVE / AMBIGUOUS BOUNDARY TESTS
//      Engine should produce Unknown for these.
// ══════════════════════════════════════════════════════════════════

// test713: Unknown — loop bound is result of subtraction (n - m)
//          Subtraction not supported as compound bound.
int test713(int n, int m) {
    int lim = n - m;
    int s = 0;
    for (int i = 0; i < lim; i++) s++;
    return s;
}

// test714: Unknown — loop bound is result of multiplication (n * m) in alias
//          Multiplication not supported as compound alias bound synthesis.
int test714(int n, int m) {
    int lim = n * m;
    int s = 0;
    for (int i = 0; i < lim; i++) s++;
    return s;
    // This LOOKS like O(n*m) but the engine sees a single alias lim = n*m
    // and a single-level loop. Without ProductNode support for alias bounds,
    // a conservative engine marks Unknown.
}

// test715: Unknown — loop bound depends on runtime division: n / m
int test715(int n, int m) {
    int lim = n / m;
    int s = 0;
    for (int i = 0; i < lim; i++) s++;
    return s;
}

// test716: Unknown — loop bound is modulo: n % m
int test716(int n, int m) {
    int lim = n % m;
    int s = 0;
    for (int i = 0; i < lim; i++) s++;
    return s;
}

// test717: Unknown — loop variable mutated inside body (non-standard step)
int test717(int n) {
    int s = 0;
    for (int i = 0; i < n; ) {
        s++;
        if (s % 3 == 0) i += 2;
        else i += 1;
    }
    return s;
}

// test718: Unknown — bound is a parameter written inside the loop
int test718(int n) {
    int s = 0;
    for (int i = 0; i < n; i++) {
        s++;
        if (i == n / 2) n = n / 2;  // n mutated
    }
    return s;
}

// ══════════════════════════════════════════════════════════════════
//  §R  NEST2 / NEST3 MACROS WITH CONTAINER-DERIVED ALIASES
// ══════════════════════════════════════════════════════════════════

// test719: O(n*m)  — NEST2 with static_cast aliases
int test719(vector<int>& v, vector<int>& u) {
    int n = static_cast<int>(v.size());
    int m = static_cast<int>(u.size());
    int s = 0;
    NEST2(i, n, j, m, { s++; });
    return s;
}

// test720: O(n^2)  — NEST2 same container alias
int test720(vector<int>& v) {
    int n = static_cast<int>(v.size());
    int s = 0;
    NEST2(i, n, j, n, { s++; });
    return s;
}

// test721: O(n*m*r)  — NEST3 with three aliases
int test721(int n, int m, int r) {
    int s = 0;
    NEST3(i, n, j, m, k, r, { s++; });
    return s;
}

// test722: O(n*m*r)  — NEST3 with container + param aliases
int test722(vector<int>& v, int m, int r) {
    int n = (int)v.size();
    int s = 0;
    NEST3(i, n, j, m, k, r, { s++; });
    return s;
}

// test723: O(n^3)  — NEST3 all same container alias
int test723(vector<int>& v) {
    int n = static_cast<int>(v.size());
    int s = 0;
    NEST3(i, n, j, n, k, n, { s++; });
    return s;
}

// ══════════════════════════════════════════════════════════════════
//  §S  MIXED NEW-HELPER COMPOSITIONS NOT IN BATCHES 1–3
// ══════════════════════════════════════════════════════════════════

// test724: O(n*m)  — outer n loop calls helper102(m, k) [O(m*k)] per step
//          Wait — that would be O(n*m*k). Let's do: outer n loop, inner helper100(e,f)
//          with e=m, f=constant=1 => O(n*m). Use correctly:
// outer n loop, inner helper91(m) = O(m) => total O(n*m)
int test724(int n, int m) {
    int s = 0;
    for (int i = 0; i < n; i++) s += helper91(m);
    return s;
}

// test725: O(n*e)  — alias e=m, outer n loop, inner helper96(e) [6-deep chain, O(e)]
int test725(int n, int m) {
    int e = m;
    int s = 0;
    for (int i = 0; i < n; i++) s += helper96(e);
    return s;
    // O(n*m)
}

// test726: O(n*log(m))  — outer n, inner helper98(m) [log, 2-deep]
int test726(int n, int m) {
    int s = 0;
    for (int i = 0; i < n; i++) s += helper98(m);
    return s;
}

// test727: O(n*m^2)  — outer n loop, inner helper99(m) [O(m^2)]
int test727(int n, int m) {
    int s = 0;
    for (int i = 0; i < n; i++) s += helper99(m);
    return s;
}

// test728: O(n*m^3)  — outer n loop, inner helper113(m) [O(m^3)]
int test728(int n, int m) {
    int s = 0;
    for (int i = 0; i < n; i++) s += helper113(m);
    return s;
}

// test729: O(n*(m+r))  — outer n loop, inner helper101(m,r) [O(m+r)]
int test729(int n, int m, int r) {
    int s = 0;
    for (int i = 0; i < n; i++) s += helper101(m, r);
    return s;
}

// test730: O(n*m*r)  — outer n*m loop (helper100), inner r loop
int test730(int n, int m, int r) {
    int s = 0;
    for (int i = 0; i < n; i++)
        for (int j = 0; j < m; j++)
            s += helper91(r);
    return s;
}

// test731: O(n*(e+f))  — outer n, inner helper104(e,f) [2-deep sum chain]
int test731(int n, int e, int f) {
    int s = 0;
    for (int i = 0; i < n; i++) s += helper104(e, f);
    return s;
}

// test732: O(n*log(n)*log(m))  — outer n, inner helper108(n,m) [log*log]
int test732(int n, int m) {
    int s = 0;
    for (int i = 0; i < n; i++) s += helper108(n, m);
    return s;
}

// ══════════════════════════════════════════════════════════════════
//  §T  NEW PARAM NAMES: e, f, g, h, u, w, v2 AS EXPLICIT PARAMS
// ══════════════════════════════════════════════════════════════════

// test733: O(e) — single loop param e
int test733(int e) {
    int s = 0;
    for (int i = 0; i < e; i++) s++;
    return s;
}

// test734: O(f) — single loop param f
int test734(int f) {
    int s = 0;
    for (int i = 0; i < f; i++) s++;
    return s;
}

// test735: O(g) — single loop param g
int test735(int g) {
    int s = 0;
    for (int i = 0; i < g; i++) s++;
    return s;
}

// test736: O(h) — single loop param h
int test736(int h) {
    int s = 0;
    for (int i = 0; i < h; i++) s++;
    return s;
}

// test737: O(e*f) — nested loops, params e,f
int test737(int e, int f) {
    int s = 0;
    for (int i = 0; i < e; i++)
        for (int j = 0; j < f; j++) s++;
    return s;
}

// test738: O(e+f+g) — three sequential, params e,f,g
int test738(int e, int f, int g) {
    int s = 0;
    for (int i = 0; i < e; i++) s++;
    for (int i = 0; i < f; i++) s++;
    for (int i = 0; i < g; i++) s++;
    return s;
}

// test739: O(log e) — log loop on param e
int test739(int e) {
    int c = 0;
    for (int i = 1; i < e; i *= 2) c++;
    return c;
}

// test740: O(e^2) — nested same param e
int test740(int e) {
    int s = 0;
    for (int i = 0; i < e; i++)
        for (int j = 0; j < e; j++) s++;
    return s;
}

// test741: O(e*f*g) — three-nested distinct params
int test741(int e, int f, int g) {
    int s = 0;
    for (int i = 0; i < e; i++)
        for (int j = 0; j < f; j++)
            for (int k = 0; k < g; k++) s++;
    return s;
}

// ══════════════════════════════════════════════════════════════════
//  §U  STATIC_CAST ALIAS → DEEP CHAIN COMPOSITION
// ══════════════════════════════════════════════════════════════════

// test742: O(n)  — static_cast -> const int alias -> helper96 (6-deep)
int test742(vector<int>& v) {
    const int e = static_cast<int>(v.size());
    return helper96(e);
}

// test743: O(n*m)  — static_cast for both, helper100 (O(e*f))
int test743(vector<int>& v, vector<int>& u) {
    int e = static_cast<int>(v.size());
    int f = static_cast<int>(u.size());
    return helper100(e, f);
}

// test744: O(n+m)  — static_cast for both, helper101 (O(e+f))
int test744(vector<int>& v, vector<int>& u) {
    int e = static_cast<int>(v.size());
    int f = static_cast<int>(u.size());
    return helper101(e, f);
}

// test745: O(n*m)  — static_cast + const auto + nested macro
int test745(vector<int>& v, int m) {
    const auto n = static_cast<int>(v.size());
    int s = 0;
    fo(i, n) rep(j, 0, m) s++;
    return s;
}

// test746: O(n^2)  — static_cast + typedef + nested loops
int test746(vector<int>& v) {
    typedef int Bound;
    Bound n = static_cast<Bound>(v.size());
    int s = 0;
    for (Bound i = 0; i < n; i++)
        for (Bound j = 0; j < n; j++) s++;
    return s;
}

// ══════════════════════════════════════════════════════════════════
//  §V  TRIPLE ALIAS CHAIN + CAST + MACRO + HELPER COMBO
// ══════════════════════════════════════════════════════════════════

// test747: O(n)
//  param n → static_cast alias e1 = static_cast<int>(n)
//            → auto alias e2 = e1
//            → const int alias e3 = e2
//            → fo(i, e3)
int test747(int n) {
    int e1 = static_cast<int>(n);
    auto e2 = e1;
    const int e3 = e2;
    int s = 0;
    fo(i, e3) s++;
    return s;
}

// test748: O(n)
//  v.size() → (long long) cast → static_cast<int> → typedef alias → helper93
int test748(vector<int>& v) {
    typedef int Elem;
    long long ll = (long long)v.size();
    Elem e = static_cast<Elem>(ll);
    return helper93(e);
    // O(n)
}

// test749: O(n*m)
//  v.size() → auto n, u.size() → const int m
//  → NEST2 macro
int test749(vector<int>& v, vector<int>& u) {
    auto n = (int)v.size();
    const int m = (int)u.size();
    int s = 0;
    NEST2(i, n, j, m, { s++; });
    return s;
}

// test750: O(n)
//  string.size() → (size_t) → static_cast<int> → const auto → repLL
int test750(string& str) {
    const auto n = static_cast<int>((size_t)str.size());
    long long ll = (long long)n;
    long long s  = 0;
    repLL(i, 0, ll) s++;
    return (int)s;
}

// ══════════════════════════════════════════════════════════════════
//  §W  NEW STRUCTURAL FORMS: step*=3, step*=4, step /= 3
// ══════════════════════════════════════════════════════════════════

// test751: O(log n)  — multiply by 4 (base-4 log)
int test751(int n) {
    int c = 0;
    for (int i = 1; i < n; i *= 4) c++;
    return c;
}

// test752: O(log n)  — divide by 3
int test752(int n) {
    int c = 0;
    for (int i = n; i >= 1; i /= 3) c++;
    return c;
}

// test753: O(log n)  — divide by 4
int test753(int n) {
    int c = 0;
    for (int i = n; i > 0; i /= 4) c++;
    return c;
}

// test754: O(log m)  — step *= 3, param m
int test754(int m) {
    int c = 0;
    for (int i = 1; i < m; i *= 3) c++;
    return c;
}

// test755: O(log e)  — step *= 4, param e
int test755(int e) {
    int c = 0;
    for (int i = 1; i < e; i *= 4) c++;
    return c;
}

// test756: O(log n)  — alias then multiply-by-4 loop
int test756(int n) {
    const int bound = n;
    int c = 0;
    for (int i = 1; i < bound; i *= 4) c++;
    return c;
}

// test757: O(log n)  — alias then divide-by-3 loop
int test757(int n) {
    auto sz = n;
    int c = 0;
    for (int i = sz; i >= 1; i /= 3) c++;
    return c;
}

// test758: O(n*log(n))  — outer n, inner ×4 log loop
int test758(int n) {
    int s = 0;
    for (int i = 0; i < n; i++)
        for (int j = 1; j < n; j *= 4) s++;
    return s;
}

// test759: O(log(n)*log(m))  — one ×3 loop, one ÷3 loop
int test759(int n, int m) {
    int s = 0;
    for (int i = 1; i < n; i *= 3)
        for (int j = m; j >= 1; j /= 3) s++;
    return s;
}

// ══════════════════════════════════════════════════════════════════
//  §X  FORI MACRO + NEW COMBINATIONS
// ══════════════════════════════════════════════════════════════════

// test760: O(n)  — FORI macro (from batch 3 macro set, not yet in test form below)
int test760(int n) {
    int s = 0;
    FORI(i, 0, n) s++;
    return s;
}

// test761: O(m)  — FORI macro, param m
int test761(int m) {
    int s = 0;
    FORI(i, 0, m) s++;
    return s;
}

// test762: O(n*m)  — FORI nested
int test762(int n, int m) {
    int s = 0;
    FORI(i, 0, n) FORI(j, 0, m) s++;
    return s;
}

// test763: O(n^2)  — FORI nested same param
int test763(int n) {
    int s = 0;
    FORI(i, 0, n) FORI(j, 0, n) s++;
    return s;
}

// test764: O(n)  — FORI + static_cast alias
int test764(vector<int>& v) {
    int n = static_cast<int>(v.size());
    int s = 0;
    FORI(i, 0, n) s++;
    return s;
}

// test765: O(n+m)  — FORI two sequential, different params
int test765(int n, int m) {
    int s = 0;
    FORI(i, 0, n) s++;
    FORI(i, 0, m) s++;
    return s;
}

// test766: O(n*m)  — FORI outer, fo inner
int test766(int n, int m) {
    int s = 0;
    FORI(i, 0, n) fo(j, m) s++;
    return s;
}

// ══════════════════════════════════════════════════════════════════
//  §Y  repe (<=) MACRO FORMS
// ══════════════════════════════════════════════════════════════════

// test767: O(n)  — repe macro (inclusive), param n
int test767(int n) {
    int s = 0;
    repe(i, 1, n) s++;
    return s;
    // iterates n times (1..n)
}

// test768: O(m)  — repe macro, param m
int test768(int m) {
    int s = 0;
    repe(i, 0, m) s++;
    return s;
}

// test769: O(n*m)  — repe nested
int test769(int n, int m) {
    int s = 0;
    repe(i, 1, n) repe(j, 1, m) s++;
    return s;
}

// test770: O(n^2)  — repe nested same param
int test770(int n) {
    int s = 0;
    repe(i, 0, n) repe(j, 0, n) s++;
    return s;
}

// ══════════════════════════════════════════════════════════════════
//  §Z  fod (REVERSE) MACRO COMBOS NOT PREVIOUSLY SEEN
// ══════════════════════════════════════════════════════════════════

// test771: O(n)  — fod macro only
int test771(int n) {
    int s = 0;
    fod(i, n) s++;
    return s;
}

// test772: O(n*m)  — fod outer, fo inner
int test772(int n, int m) {
    int s = 0;
    fod(i, n) fo(j, m) s++;
    return s;
}

// test773: O(n*m)  — fo outer, fod inner
int test773(int n, int m) {
    int s = 0;
    fo(i, n) fod(j, m) s++;
    return s;
}

// test774: O(n^2)  — fod nested same param
int test774(int n) {
    int s = 0;
    fod(i, n) fod(j, n) s++;
    return s;
}

// test775: O(n*m)  — fod with container alias
int test775(vector<int>& v, int m) {
    int n = (int)v.size();
    int s = 0;
    fod(i, n) for (int j = 0; j < m; j++) s++;
    return s;
}

// ══════════════════════════════════════════════════════════════════
//  §AA  FORV MACRO + INNER HELPERS / LOOPS
// ══════════════════════════════════════════════════════════════════

// test776: O(n*m)  — FORV outer over v (|v|=n), inner fo(m)
int test776(vector<int>& v, int m) {
    int s = 0;
    FORV(x, v) {
        (void)x;
        fo(j, m) s++;
    }
    return s;
}

// test777: O(n^2)  — FORV outer, inner FORV same container
int test777(vector<int>& v) {
    int s = 0;
    FORV(x, v) {
        (void)x;
        FORV(y, v) { (void)y; s++; }
    }
    return s;
    // O(n^2)
}

// test778: O(n*log(n))  — FORV outer, inner helper3 per element
int test778(vector<int>& v) {
    int n = (int)v.size();
    int s = 0;
    FORV(x, v) {
        (void)x;
        s += helper3(n);
    }
    return s;
}

// test779: O(n*m)  — FORV outer over v, inner FORV over u (|v|=n, |u|=m)
int test779(vector<int>& v, vector<int>& u) {
    int s = 0;
    FORV(x, v) {
        (void)x;
        FORV(y, u) { (void)y; s++; }
    }
    return s;
}

// ══════════════════════════════════════════════════════════════════
//  §BB  ADDITIONAL DEEP MULTI-CONCEPT CHAINS (final batch)
// ══════════════════════════════════════════════════════════════════

// test780: O(n*log(n))
//  typedef Bound = int; Bound n = v.size() via static_cast;
//  outer fo(i, n); inner helper97(n) [log, 2-deep chain via helper97->97];
//  => n * O(log n) = O(n*log(n))
int test780(vector<int>& v) {
    typedef int Bound;
    Bound n = static_cast<Bound>(v.size());
    int s = 0;
    fo(i, n) s += helper97(n);
    return s;
}

// test781: O(n*m)
//  const auto from two container sizes → NEST2
int test781(const vector<int>& v, const vector<int>& u) {
    const auto n = (int)v.size();
    const auto m = (int)u.size();
    int s = 0;
    NEST2(i, n, j, m, { s++; });
    return s;
}

// test782: O(n^2*log(n))
//  n = static_cast from v.size(); NEST2(i,n,j,n); inner helper97(n) per step
int test782(vector<int>& v) {
    int n = static_cast<int>(v.size());
    int s = 0;
    NEST2(i, n, j, n, { s += helper97(n); });
    return s;
}

// test783: O(n+m)
//  typedef + auto combo: typedef int T; T a = n; auto b = m;
//  sequential loops
int test783(int n, int m) {
    typedef int T;
    T a = n;
    auto b = m;
    int s = 0;
    for (T i = 0; i < a; i++) s++;
    for (int i = 0; i < b; i++) s++;
    return s;
}

// test784: O(n*m)
//  using + const auto: using Idx = int; const auto n; nested FORI macros
int test784(int n, int m) {
    using Idx = int;
    const Idx rows = n;
    const Idx cols = m;
    int s = 0;
    FORI(i, 0, rows) FORI(j, 0, cols) s++;
    return s;
}

// test785: O(n)
//  six-hop alias chain (param → a → b → c → d → e → f) then loop
int test785(int n) {
    int a = n;
    int b = a;
    int c = b;
    int d = c;
    int e = d;
    int f = e;
    int s = 0;
    for (int i = 0; i < f; i++) s++;
    return s;
}

// test786: O(n)
//  six-hop const alias chain
int test786(int n) {
    const int a = n;
    const int b = a;
    const int c = b;
    const int d = c;
    const int e = d;
    const int f = e;
    int s = 0;
    fo(i, f) s++;
    return s;
}

// test787: O(n)
//  mixing alias types: int → auto → const int → typedef alias → loop
int test787(int n) {
    int a = n;
    auto b = a;
    const int c = b;
    typedef int MyT;
    MyT d = c;
    int s = 0;
    for (MyT i = 0; i < d; i++) s++;
    return s;
}

// test788: O(n*m)
//  container size → long long cast → int alias → auto alias → nested loop
int test788(vector<int>& v, int m) {
    long long ll = static_cast<long long>(v.size());
    int n = static_cast<int>(ll);
    auto nn = n;
    int s = 0;
    fo(i, nn) fo(j, m) s++;
    return s;
}

// test789: O(log n)
//  six-hop alias then log loop
int test789(int n) {
    const int a = n;
    int b = a;
    const auto c = b;
    int d = c;
    auto e = d;
    const int f = e;
    int cnt = 0;
    for (int i = 1; i < f; i *= 2) cnt++;
    return cnt;
}

// test790: O(n+m+r)
//  three container sizes → static_cast aliases → helper39 (p+q+r)
int test790(vector<int>& v, deque<int>& dq, multiset<int>& ms) {
    int p = static_cast<int>(v.size());
    int q = static_cast<int>(dq.size());
    int r = static_cast<int>(ms.size());
    return helper39(p, q, r);
    // O(n+m+r)
}

// test791: O(n*m*r)
//  three container sizes → static_cast → helper38
int test791(vector<int>& v, vector<int>& u, deque<int>& dq) {
    int p = static_cast<int>(v.size());
    int q = static_cast<int>(u.size());
    int r = static_cast<int>(dq.size());
    return helper38(p, q, r);
    // O(n*m*r)
}

// test792: O(n*log(m))
//  outer static_cast alias n; inner static_cast alias m;
//  outer fo(i,n), inner helper34(m) [log via right-shift]
int test792(vector<int>& v, vector<int>& u) {
    int n = static_cast<int>(v.size());
    int m = static_cast<int>(u.size());
    int s = 0;
    fo(i, n) s += helper34(m);
    return s;
}

// test793: O(n*m)
//  typedef + range-for over map × fo inner
int test793(map<int,int>& mp, int m) {
    typedef int Cnt;
    Cnt s = 0;
    for (auto& kv : mp) {
        (void)kv;
        fo(j, m) s++;
    }
    return s;
    // |mp| = n => O(n*m)
}

// test794: O(n^2*log(n))
//  auto n = v.size(); FORV outer, inner FORV, innermost helper97(n)
int test794(vector<int>& v) {
    auto n = (int)v.size();
    int s = 0;
    FORV(x, v) {
        (void)x;
        FORV(y, v) {
            (void)y;
            s += helper97(n);
        }
    }
    return s;
    // n * n * log(n) = O(n^2*log(n))
}

// test795: O(n*(m+r))
//  outer n loop; inner helper101(m, r) [O(m+r)]
//  — new combination: 2-deep sum helper called per outer step
int test795(int n, int m, int r) {
    int s = 0;
    for (int i = 0; i < n; i++) s += helper101(m, r);
    return s;
}

// test796: O(e*f)
//  using-alias types for both params, helper120 (3-deep macro chain)
int test796(int e, int f) {
    using E = int;
    using F = int;
    E ee = e;
    F ff = f;
    return helper120(ee, ff);
    // O(e*f)
}

// test797: O(n)
//  for-init sum alias total=n+m inside for; loop runs total times;
//  then a subsequent O(1) helper call — dominated
int test797(int n, int m) {
    int s = 0;
    for (int total = n + m, i = 0; i < total; i++) s++;
    s += helper5(n);  // O(1) extra — dominated
    return s;
    // O(n+m)
}

// test798: O(n*m)
//  const int n from static_cast; const int m param; NEST2; inner helper5 (O(1)) per cell
int test798(vector<int>& v, int m) {
    const int n = static_cast<int>(v.size());
    int s = 0;
    NEST2(i, n, j, m, { s += helper5(i + j); });
    return s;
    // n*m cells * O(1) = O(n*m)
}

// test799: O(n+m)
//  multimap + unordered_multimap sizes; const auto aliases;
//  helper101(n, m) call
int test799(multimap<int,int>& mm, unordered_multimap<int,int>& umm) {
    const auto n = static_cast<int>(mm.size());
    const auto m = static_cast<int>(umm.size());
    return helper101(n, m);
    // O(n+m)
}

// test800: O(n*m*log(r))
//  n = v.size(), m = u.size(), r = param;
//  NEST2(i,n,j,m) then inner log loop on r
int test800(vector<int>& v, vector<int>& u, int r) {
    int n = static_cast<int>(v.size());
    int m = static_cast<int>(u.size());
    int s = 0;
    NEST2(i, n, j, m, {
        for (int k = r; k > 0; k >>= 1) s++;
    });
    return s;
    // n*m*log(r) iterations
}
