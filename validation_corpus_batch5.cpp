// validation_corpus_batch5.cpp
// Compiler-Grade AST Complexity Validation Corpus — Batch 5 (test801–test1000)
// C++17 — Compilable
//
// Design philosophy for Batch 5:
//   Every function introduces a structural dimension absent from tests 1–800.
//   Priority areas:
//     § A  Alias DIAMOND convergence — two paths, one alias sink
//     § B  Alias DIVERGENCE — one alias feeds two independent loops
//     § C  10+ level alias chains (new depth record)
//     § D  Branching helper DAGs — A→B,C; B,C→D (helper fan-out/fan-in)
//     § E  Permuted / reordered argument stress
//     § F  Duplicate / repeated argument stress
//     § G  SumNode 5-8 term symbolic propagation
//     § H  Deep dominance: large + small term sequences
//     § I  Long helper chain returning into another long helper chain
//     § J  Container-size forwarded through multi-level helper chain
//     § K  Step forms: i+=i, i=i+i, i=i*3, <<=2 (new variants)
//     § L  Harmonic outer + log inner compositions (new combos)
//     § M  Sqrt-bound composed with helper calls
//     § N  STL container range-for with inner helper-chain bodies
//     § O  Unknown-boundary tests (unsupported / opaque patterns)
//     § P  Deep dominance verification (sum complexity mergeAndReduce)
//     § Q  Recursive-wrapper chains around log/linear/quadratic helpers
//     § R  Alternating shadow/unshadow multi-level patterns
//     § S  Container size as sum-alias expression fed to helper
//     § T  for-init compound-expression alias + deep chain combo

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
//  ALL PREVIOUSLY DEFINED HELPERS  (helpers 1–120, self-contained)
// ─────────────────────────────────────────────────────────────────
int helper1(int n)  { int s=0; for(int i=0;i<n;i++) s+=i; return s; }
int helper2(int m)  { int s=0; for(int i=0;i<m;i++) s+=i; return s; }
int helper3(int n)  { int c=0; for(int i=1;i<n;i*=2) c++; return c; }
int helper4(int m)  { int c=0; for(int i=1;i<m;i*=2) c++; return c; }
int helper5(int x)  { return x*x+3; }
int helper6(int n, int m) { int s=0; for(int i=0;i<n;i++) for(int j=0;j<m;j++) s++; return s; }
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
int helper26(int p) { int s=0; for(int i=0;i<p;i++) s+=2; return s; }
int helper27(int q) { int s=0; for(int i=0;i<q;i++) s++; return s; }
int helper28(int p) { int c=0; for(int i=1;i<p;i*=3) c++; return c; }
int helper29(int p, int q) { int s=0; for(int i=0;i<p;i++) s++; for(int i=0;i<q;i++) s++; return s; }
int helper30(int p, int q) { int s=0; for(int i=0;i<p;i++) for(int j=0;j<q;j++) s++; return s; }
int helper31(int p) { return helper26(p)+p; }
int helper32(int p) { return helper31(p)-1; }
int helper33(int p) { return helper32(p)+0; }
int helper34(int p) { int c=0; for(int i=p;i>0;i>>=1) c++; return c; }
int helper35(int p) { int s=0; for(int i=0;i<p;i++) for(int j=0;j<p;j++) s++; return s; }
int helper36(int p) { int s=0; for(int i=0;i<p;i++) for(int j=0;j<p;j++) for(int k=0;k<p;k++) s++; return s; }
int helper37(int p) { return helper35(p)+p; }
int helper38(int p, int q, int r) { int s=0; for(int i=0;i<p;i++) for(int j=0;j<q;j++) for(int k=0;k<r;k++) s++; return s; }
int helper39(int p, int q, int r) { int s=0; for(int i=0;i<p;i++) s++; for(int i=0;i<q;i++) s++; for(int i=0;i<r;i++) s++; return s; }
int helper40(int depth) { int s=0; for(int i=0;i<depth;i++) s++; return s; }
int helper41(int depth) { return helper40(depth)*2; }
int helper42(int depth) { return helper41(depth)+1; }
int helper43(int q) { int c=0; for(int i=1;i<q;i<<=1) c++; return c; }
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
int helper55(int n) { int s=0; for(int i=1;i<=n;i++) s+=helper34(i); return s; }
int helper56(int p, int q) { int s=0; for(int i=0;i<p;i++) for(int j=0;j<p;j++) for(int k=0;k<q;k++) s++; return s; }
int helper57(int p, int q) { int s=0; for(int i=0;i<p;i++) for(int j=0;j<q;j++) for(int k=0;k<q;k++) s++; return s; }
int helper58(int p) { int s=0; fo(i,p) s++; return s; }
int helper59(int p) { return helper58(p)+0; }
int helper60(int p) { return helper59(p)+1; }
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
int helper73(int n) { int s=0; fo(i,n) s+=1; return s; }
int helper74(int n) { return helper73(n)+0; }
int helper75(int n) { return helper74(n)-1; }
int helper76(int n, int m) { int s=0; fo(i,n) fo(j,m) s++; return s; }
int helper77(int n, int m) { return helper76(n,m)+1; }
int helper78(int n, int m) { return helper77(n,m)*1; }
int helper79(int n) { int s=0; for(int i=0;i<n;i++) for(int j=0;j<n;j++) for(int k=n;k>0;k>>=1) s++; return s; }
int helper80(int n) { return helper68(n,n); }
int helper81(int wid, int hgt) { int s=0; for(int i=0;i<wid;i++) s++; for(int j=0;j<hgt;j++) s++; return s; }
int helper82(int wid, int hgt) { return helper81(wid,hgt)+0; }
int helper83(int cap, int lim) { int s=0; for(int i=0;i<cap;i++) for(int j=0;j<lim;j++) s++; return s; }
int helper84(long long n) { long long s=0; for(long long i=0;i<n;i++) s++; return (int)s; }
int helper85(int n, int m, int r, int t) { int s=0; for(int i=0;i<n;i++) s++; for(int i=0;i<m;i++) s++; for(int i=0;i<r;i++) s++; for(int i=0;i<t;i++) s++; return s; }
int helper86(int n, int m, int r, int t) { int s=0; for(int i=0;i<n;i++) for(int j=0;j<m;j++) for(int k=0;k<r;k++) for(int l=0;l<t;l++) s++; return s; }
int helper87(int n) { int s=0; rep(i,0,n) s++; return s; }
int helper88(int n) { return helper87(n)+n; }
int helper89(int n) { return helper88(n)-1; }
int helper90(int n, int m) { int s=0; rep(i,0,n) rep(j,0,m) s++; return s; }
int helper91(int e) { int s=0; for(int i=0;i<e;i++) s++; return s; }
int helper92(int e) { return helper91(e)+0; }
int helper93(int e) { return helper92(e)+1; }
int helper94(int e) { return helper93(e)-1; }
int helper95(int e) { return helper94(e)+0; }
int helper96(int e) { return helper95(e)*1; }
int helper97(int e) { int c=0; for(int i=1;i<e;i*=2) c++; return c; }
int helper98(int e) { return helper97(e)+0; }
int helper99(int e) { int s=0; for(int i=0;i<e;i++) for(int j=0;j<e;j++) s++; return s; }
int helper100(int e, int f) { int s=0; for(int i=0;i<e;i++) for(int j=0;j<f;j++) s++; return s; }
int helper101(int e, int f) { int s=0; for(int i=0;i<e;i++) s++; for(int i=0;i<f;i++) s++; return s; }
int helper102(int e, int f) { return helper100(e,f)+1; }
int helper103(int e, int f) { return helper102(e,f)-1; }
int helper104(int e, int f) { return helper101(e,f)+0; }
int helper105(int e, int f) { return helper104(e,f)*1; }
int helper106(int n) { int s=0; for(int i=0;i<n;i++) for(int j=n;j>0;j>>=1) s++; return s; }
int helper107(int n) { return helper106(n)+0; }
int helper108(int n, int m) { int s=0; for(int i=1;i<n;i*=2) for(int j=1;j<m;j*=2) s++; return s; }
int helper109(int n, int m) { return helper108(n,m)+0; }
int helper110(int n, int m, int r, int t) { return helper85(n,m,r,t)+0; }
int helper111(int n, int m, int r, int t) { return helper86(n,m,r,t)+0; }
int helper112(int e) { int s=0; for(int i=0;i<e;i++) for(int j=0;j<e;j++) for(int k=0;k<e;k++) s++; return s; }
int helper113(int e) { return helper112(e)+0; }
int helper114(int e, int f, int g) { int s=0; for(int i=0;i<e;i++) for(int j=0;j<f;j++) for(int k=0;k<g;k++) s++; return s; }
int helper115(int e, int f, int g) { int s=0; for(int i=0;i<e;i++) s++; for(int i=0;i<f;i++) s++; for(int i=0;i<g;i++) s++; return s; }
int helper116(int e) { int n=static_cast<int>(e); int s=0; for(int i=0;i<n;i++) s++; return s; }
int helper117(int e) { return helper116(e)+0; }
int helper118(int e, int f) { int s=0; fo(i,e) fo(j,f) s++; return s; }
int helper119(int e, int f) { return helper118(e,f)-1; }
int helper120(int e, int f) { return helper119(e,f)+2; }

// ─────────────────────────────────────────────────────────────────
//  NEW HELPERS FOR BATCH 5  (helper121 – helper160)
// ─────────────────────────────────────────────────────────────────

// ── Linear leaf nodes on new param names ──────────────────────────

// helper121: O(u)  new param "u"
int helper121(int u) { int s=0; for(int i=0;i<u;i++) s++; return s; }

// helper122: O(v2)  param "v2" (avoids conflict with STL "v")
int helper122(int v2) { int s=0; for(int i=0;i<v2;i++) s++; return s; }

// helper123: O(w)  param "w"
int helper123(int w) { int s=0; for(int i=0;i<w;i++) s++; return s; }

// helper124: O(x)  param "x"  (fresh — no prior helper had param "x")
int helper124(int x) { int s=0; for(int i=0;i<x;i++) s++; return s; }

// ── Branching DAG helpers ─────────────────────────────────────────

// helper125: O(u)  calls helper121  [DAG branch A leaf]
int helper125(int u) { return helper121(u)+0; }

// helper126: O(u)  calls helper122  [DAG branch B leaf — param u maps to v2]
int helper126(int u) { return helper122(u)+0; }

// helper127: O(u)  merges helper125 + helper126  [DAG fan-in]
//   Both branches O(u); max = O(u)
int helper127(int u) { return helper125(u) + helper126(u); }

// helper128: O(u)  wraps helper127  [DAG level 4]
int helper128(int u) { return helper127(u)+1; }

// helper129: O(u)  wraps helper128  [DAG level 5]
int helper129(int u) { return helper128(u)-1; }

// ── Branching DAG with distinct complexity per branch ─────────────

// helper130: O(u^2)  quadratic leaf
int helper130(int u) { int s=0; for(int i=0;i<u;i++) for(int j=0;j<u;j++) s++; return s; }

// helper131: O(u)    linear leaf
int helper131(int u) { int s=0; for(int i=0;i<u;i++) s++; return s; }

// helper132: O(u^2)  merges helper130(u) + helper131(u)  → O(u^2) dominant
int helper132(int u) { return helper130(u) + helper131(u); }

// helper133: O(u^2)  wraps helper132
int helper133(int u) { return helper132(u)+0; }

// ── Permuted-argument helpers (same body, different param order) ───

// helper134: O(p*q)  body: outer p, inner q
int helper134(int p, int q) { int s=0; for(int i=0;i<p;i++) for(int j=0;j<q;j++) s++; return s; }

// helper135: O(p*q)  body: outer q, inner p  (structurally equivalent result)
int helper135(int q, int p) { int s=0; for(int i=0;i<q;i++) for(int j=0;j<p;j++) s++; return s; }

// helper136: O(p+q)  body: p then q
int helper136(int p, int q) { int s=0; for(int i=0;i<p;i++) s++; for(int i=0;i<q;i++) s++; return s; }

// helper137: O(p+q)  body: q then p (structurally equivalent)
int helper137(int q, int p) { int s=0; for(int i=0;i<q;i++) s++; for(int i=0;i<p;i++) s++; return s; }

// ── Repeated-argument helpers (same param used twice) ─────────────

// helper138: O(u^2)  called as helper138(n,n) — receives same value twice
int helper138(int p, int q) { int s=0; for(int i=0;i<p;i++) for(int j=0;j<q;j++) s++; return s; }

// helper139: O(u+u)=O(u)  called as helper139(n,n) — sum alias
int helper139(int p, int q) { int s=0; for(int i=0;i<p;i++) s++; for(int i=0;i<q;i++) s++; return s; }

// ── Wrapper chains around existing helpers ─────────────────────────

// helper140: O(n*log(n))  wraps helper106 (n-loop × log-loop)
int helper140(int n) { return helper106(n)+0; }

// helper141: O(n*log(n))  wraps helper140
int helper141(int n) { return helper140(n)+0; }

// helper142: O(n*log(n))  wraps helper141  [3-deep wrapper around n*log(n)]
int helper142(int n) { return helper141(n)+0; }

// helper143: O(n^2*log(n))  wraps helper79 [n^2 * log(n) leaf]
int helper143(int n) { return helper79(n)+0; }

// helper144: O(n^2*log(n))  wraps helper143
int helper144(int n) { return helper143(n)+0; }

// ── Sum-chain helpers (new term counts) ───────────────────────────

// helper145: O(a+b+c+d+e)  five-term sequential
int helper145(int a, int b, int c, int d, int e) {
    int s=0;
    for(int i=0;i<a;i++) s++;
    for(int i=0;i<b;i++) s++;
    for(int i=0;i<c;i++) s++;
    for(int i=0;i<d;i++) s++;
    for(int i=0;i<e;i++) s++;
    return s;
}

// helper146: O(a+b+c+d+e+f)  six-term sequential
int helper146(int a, int b, int c, int d, int e, int f) {
    int s=0;
    for(int i=0;i<a;i++) s++;
    for(int i=0;i<b;i++) s++;
    for(int i=0;i<c;i++) s++;
    for(int i=0;i<d;i++) s++;
    for(int i=0;i<e;i++) s++;
    for(int i=0;i<f;i++) s++;
    return s;
}

// helper147: O(a+b+c+d+e+f+g)  seven-term sequential
int helper147(int a, int b, int c, int d, int e, int f, int g) {
    int s=0;
    for(int i=0;i<a;i++) s++;
    for(int i=0;i<b;i++) s++;
    for(int i=0;i<c;i++) s++;
    for(int i=0;i<d;i++) s++;
    for(int i=0;i<e;i++) s++;
    for(int i=0;i<f;i++) s++;
    for(int i=0;i<g;i++) s++;
    return s;
}

// helper148: O(u)  — used as a "transport" wrapper for container-forwarding tests
int helper148(int u) { return helper121(u)+0; }

// helper149: O(u)  calls helper148 (two hops from leaf)
int helper149(int u) { return helper148(u)+0; }

// helper150: O(u)  calls helper149 (three hops)
int helper150(int u) { return helper149(u)+0; }

// helper151: O(u)  calls helper150 (four hops)
int helper151(int u) { return helper150(u)+0; }

// helper152: O(u)  calls helper151 (five hops from leaf — container forwarding target)
int helper152(int u) { return helper151(u)+0; }

// helper153: O(log u)  log leaf on param "u"
int helper153(int u) { int c=0; for(int i=1;i<u;i*=2) c++; return c; }

// helper154: O(log u)  wraps helper153
int helper154(int u) { return helper153(u)+0; }

// helper155: O(log u)  wraps helper154
int helper155(int u) { return helper154(u)+0; }

// helper156: O(u^2)  calls helper130 (quadratic)
int helper156(int u) { return helper130(u)+0; }

// helper157: O(u^2)  calls helper156 → helper130
int helper157(int u) { return helper156(u)+0; }

// helper158: O(u*w)  two-param product, new names u, w
int helper158(int u, int w) { int s=0; for(int i=0;i<u;i++) for(int j=0;j<w;j++) s++; return s; }

// helper159: O(u*w)  wraps helper158
int helper159(int u, int w) { return helper158(u,w)+0; }

// helper160: O(u+w)  two-param sum, new names
int helper160(int u, int w) { int s=0; for(int i=0;i<u;i++) s++; for(int i=0;i<w;i++) s++; return s; }

// ─────────────────────────────────────────────────────────────────
//  TEST FUNCTIONS  test801 – test1000
// ─────────────────────────────────────────────────────────────────

// ══════════════════════════════════════════════════════════════════
//  §A  ALIAS DIAMOND CONVERGENCE
//      Two independent paths reaching the same alias sink
// ══════════════════════════════════════════════════════════════════

// test801: O(n)  diamond: n→a via path1 (a=n); n→b=n; sink c = a (not b); loop on c
int test801(int n) {
    int a = n;      // path 1
    int b = n;      // path 2 (unused in loop)
    int c = a;      // sink: uses path 1
    int s = 0;
    for (int i = 0; i < c; i++) s++;
    (void)b;
    return s;
}

// test802: O(n)  diamond: n→a, n→b; c = a; d = b; sink e chooses a-path
int test802(int n) {
    int a = n;
    int b = n;
    int c = a;
    int d = b;
    int e = c;  // e follows a-chain = n
    int s = 0;
    fo(i, e) s++;
    (void)d;
    return s;
}

// test803: O(n)  diamond with different param aliases converging
//   left:  n → lft → lft2
//   right: n → rgt → rgt2
//   sink uses lft2
int test803(int n) {
    int lft  = n;
    int lft2 = lft;
    int rgt  = n;
    int rgt2 = rgt;
    (void)rgt2;
    int s = 0;
    for (int i = 0; i < lft2; i++) s++;
    return s;
}

// test804: O(n+m)  diamond sum: left path n, right path m; both fed to helper29
int test804(int n, int m) {
    int a = n;   // left path
    int b = m;   // right path
    int c = a;   // left chain
    int d = b;   // right chain
    return helper29(c, d);
    // helper29(c,d): c=n, d=m => O(n+m)
}

// test805: O(n*m)  diamond product: left path n, right path m; both fed to helper30
int test805(int n, int m) {
    int p = n;
    int q = m;
    int r = p;
    int s2 = q;
    return helper30(r, s2);
    // O(n*m)
}

// ══════════════════════════════════════════════════════════════════
//  §B  ALIAS DIVERGENCE — ONE ALIAS FEEDS TWO INDEPENDENT LOOPS
// ══════════════════════════════════════════════════════════════════

// test806: O(n)  single alias a=n; used in TWO sequential loops (both O(n))
int test806(int n) {
    int a = n;
    int s = 0;
    for (int i = 0; i < a; i++) s++;
    for (int i = 0; i < a; i++) s++;
    return s;
    // O(n) + O(n) = O(n)
}

// test807: O(n^2)  single alias a=n; used in NESTED loops (both a)
int test807(int n) {
    int a = n;
    int s = 0;
    for (int i = 0; i < a; i++)
        for (int j = 0; j < a; j++) s++;
    return s;
}

// test808: O(n+m)  alias a=n used in first loop; alias b=m in second;
//   but first alias re-used in helper call (O(1)) after second loop
int test808(int n, int m) {
    int a = n;
    int b = m;
    int s = 0;
    for (int i = 0; i < a; i++) s++;
    for (int i = 0; i < b; i++) s++;
    s += helper5(a);  // O(1) extra
    return s;
    // O(n) + O(m) + O(1) = O(n+m)
}

// test809: O(n*m)  divergence: alias a=n fed to outer loop; alias b=m fed to inner;
//   same 'a' also passed to a post-loop O(n) call — dominated by n*m
int test809(int n, int m) {
    int a = n;
    int b = m;
    int s = 0;
    for (int i = 0; i < a; i++)
        for (int j = 0; j < b; j++) s++;
    s += helper7(a);  // O(n) dominated
    return s;
    // O(n*m)
}

// ══════════════════════════════════════════════════════════════════
//  §C  10+ LEVEL ALIAS CHAINS (new depth record)
// ══════════════════════════════════════════════════════════════════

// test810: O(n)  10-hop alias chain
int test810(int n) {
    int a1  = n;
    int a2  = a1;
    int a3  = a2;
    int a4  = a3;
    int a5  = a4;
    int a6  = a5;
    int a7  = a6;
    int a8  = a7;
    int a9  = a8;
    int a10 = a9;
    int s = 0;
    for (int i = 0; i < a10; i++) s++;
    return s;
}

// test811: O(n)  12-hop alias chain with varied names
int test811(int n) {
    int aa = n;
    int bb = aa;
    int cc = bb;
    int dd = cc;
    int ee = dd;
    int ff = ee;
    int gg = ff;
    int hh = gg;
    int ii = hh;
    int jj = ii;
    int kk = jj;
    int ll = kk;
    int s = 0;
    fo(i, ll) s++;
    return s;
}

// test812: O(m)  10-hop chain on param m, ends in helper call
int test812(int m) {
    int b1 = m;
    int b2 = b1;
    int b3 = b2;
    int b4 = b3;
    int b5 = b4;
    int b6 = b5;
    int b7 = b6;
    int b8 = b7;
    int b9 = b8;
    int b10 = b9;
    return helper121(b10);
    // O(m)
}

// test813: O(k)  10-hop chain via container size
int test813(vector<int>& v) {
    int c1 = static_cast<int>(v.size());
    int c2 = c1;
    int c3 = c2;
    int c4 = c3;
    int c5 = c4;
    int c6 = c5;
    int c7 = c6;
    int c8 = c7;
    int c9 = c8;
    int c10 = c9;
    int s = 0;
    for (int i = 0; i < c10; i++) s++;
    return s;
    // O(n) where n = v.size()
}

// test814: O(n^2)  10-hop alias then double loop
int test814(int n) {
    int x1 = n, x2 = x1, x3 = x2, x4 = x3, x5 = x4;
    int x6 = x5, x7 = x6, x8 = x7, x9 = x8, x10 = x9;
    int s = 0;
    for (int i = 0; i < x10; i++)
        for (int j = 0; j < x10; j++) s++;
    return s;
}

// test815: O(n)  15-hop alias chain
int test815(int n) {
    int h1=n, h2=h1, h3=h2, h4=h3, h5=h4,
        h6=h5, h7=h6, h8=h7, h9=h8, h10=h9,
        h11=h10, h12=h11, h13=h12, h14=h13, h15=h14;
    int s = 0;
    rep(i, 0, h15) s++;
    return s;
}

// ══════════════════════════════════════════════════════════════════
//  §D  BRANCHING HELPER DAGs (fan-out, fan-in, converging)
// ══════════════════════════════════════════════════════════════════

// test816: O(u)  DAG level 5: helper129 → 128 → 127 → (125,126) → (121,122)
int test816(int n) {
    return helper129(n);
    // O(n)
}

// test817: O(u)  DAG fan-in: helper127(n) merges two O(n) branches
int test817(int n) {
    return helper127(n);
    // O(n)
}

// test818: O(u^2)  DAG dominance: helper132(n) = helper130(n)+helper131(n) = O(n^2)+O(n) = O(n^2)
int test818(int n) {
    return helper132(n);
}

// test819: O(u^2)  helper133 wraps helper132
int test819(int n) {
    return helper133(n);
}

// test820: O(n)  helper128 called with container alias
int test820(vector<int>& v) {
    int u = static_cast<int>(v.size());
    return helper128(u);
    // O(n)
}

// test821: O(n^2*log(n))  helper144 → helper143 → helper79
int test821(int n) {
    return helper144(n);
}

// test822: O(n*log(n))  helper142 → helper141 → helper140 → helper106
int test822(int n) {
    return helper142(n);
}

// test823: O(n)  helper152 → 151 → 150 → 149 → 148 → 121
int test823(int n) {
    return helper152(n);
}

// test824: O(n)  helper152 called with string length alias
int test824(string& s) {
    int u = static_cast<int>(s.size());
    return helper152(u);
}

// ══════════════════════════════════════════════════════════════════
//  §E  PERMUTED / REORDERED ARGUMENT STRESS
// ══════════════════════════════════════════════════════════════════

// helper134 is O(p*q) outer-p inner-q; helper135 is O(q*p) outer-q inner-p
// Both produce O(n*m) when called with (n,m) regardless of order.

// test825: O(n*m)  helper134(n, m) — outer n, inner m
int test825(int n, int m) {
    return helper134(n, m);
}

// test826: O(n*m)  helper135(n, m) — outer n (helper's q), inner m (helper's p)
//   helper135(q,p): outer q=n, inner p=m => O(n*m)
int test826(int n, int m) {
    return helper135(n, m);
}

// test827: O(n*m)  helper134(m, n) — args swapped; outer m, inner n => O(m*n)=O(n*m)
int test827(int n, int m) {
    return helper134(m, n);
    // outer=m, inner=n => O(m*n)
}

// test828: O(n+m)  helper136(n, m) — n then m
int test828(int n, int m) {
    return helper136(n, m);
}

// test829: O(n+m)  helper137(n, m) — outer n (helper's q), inner m (helper's p) — still O(n+m)
int test829(int n, int m) {
    return helper137(n, m);
}

// test830: O(n+m)  helper136(m, n) — m then n => O(m+n)=O(n+m)
int test830(int n, int m) {
    return helper136(m, n);
}

// test831: O(n*m*r)  helper38(m, n, r) — reordered but product is same
int test831(int n, int m, int r) {
    return helper38(m, n, r);
    // helper38(p,q,r): p=m, q=n, r=r => O(m*n*r)=O(n*m*r)
}

// test832: O(n*m*r)  helper38(r, m, n) — different reorder
int test832(int n, int m, int r) {
    return helper38(r, m, n);
    // O(r*m*n)=O(n*m*r)
}

// test833: O(n+m+r)  helper39(r, n, m) — reordered three-sum
int test833(int n, int m, int r) {
    return helper39(r, n, m);
    // O(r+n+m)=O(n+m+r)
}

// test834: O(n+m+r)  helper39(m, r, n)
int test834(int n, int m, int r) {
    return helper39(m, r, n);
}

// ══════════════════════════════════════════════════════════════════
//  §F  DUPLICATE / REPEATED ARGUMENT STRESS
// ══════════════════════════════════════════════════════════════════

// test835: O(n^2)  helper138(n, n) — same arg twice in product helper
int test835(int n) {
    return helper138(n, n);
    // helper138(p,q) = O(p*q) = O(n*n) = O(n^2)
}

// test836: O(n)  helper139(n, n) — same arg twice in sum helper
int test836(int n) {
    return helper139(n, n);
    // helper139(p,q) = O(p+q) = O(n+n) = O(n)
}

// test837: O(n^2)  helper30(n, n) — product helper with same arg
int test837(int n) {
    return helper30(n, n);
    // O(n*n) = O(n^2)
}

// test838: O(n)  helper29(n, n) — sum helper with same arg
int test838(int n) {
    return helper29(n, n);
    // O(n+n) = O(n)
}

// test839: O(n^3)  helper38(n, n, n) — three-way product, same arg
int test839(int n) {
    return helper38(n, n, n);
    // O(n*n*n) = O(n^3)
}

// test840: O(n)  helper39(n, n, n) — three-way sum, same arg
int test840(int n) {
    return helper39(n, n, n);
    // O(n+n+n) = O(n)
}

// test841: O(n^2)  helper100(n, n) — product helper, same arg
int test841(int n) {
    return helper100(n, n);
    // O(n^2)
}

// test842: O(n)  helper101(n, n) — sum helper, same arg
int test842(int n) {
    return helper101(n, n);
    // O(n+n) = O(n)
}

// test843: O(n^2*m)  helper56(n, m) — helper56 is O(p^2*q): p=n, q=m
int test843(int n, int m) {
    return helper56(n, m);
}

// test844: O(n*m^2)  helper57(n, m) — helper57 is O(p*q^2): p=n, q=m
int test844(int n, int m) {
    return helper57(n, m);
}

// test845: O(n^3)  helper56(n, n) — p=n, q=n => O(n^2*n)=O(n^3)
int test845(int n) {
    return helper56(n, n);
}

// ══════════════════════════════════════════════════════════════════
//  §G  SumNode 5–7 TERM SYMBOLIC PROPAGATION
// ══════════════════════════════════════════════════════════════════

// test846: O(a+b+c+d+e)  calls helper145 directly
int test846(int a, int b, int c, int d, int e) {
    return helper145(a, b, c, d, e);
}

// test847: O(a+b+c+d+e+f)  calls helper146 directly
int test847(int a, int b, int c, int d, int e, int f) {
    return helper146(a, b, c, d, e, f);
}

// test848: O(a+b+c+d+e+f+g)  calls helper147 directly
int test848(int a, int b, int c, int d, int e, int f, int g) {
    return helper147(a, b, c, d, e, f, g);
}

// test849: O(n+m+r+t+u)  five sequential inline loops (no helper)
int test849(int n, int m, int r, int t, int u) {
    int s = 0;
    for (int i = 0; i < n; i++) s++;
    for (int i = 0; i < m; i++) s++;
    for (int i = 0; i < r; i++) s++;
    for (int i = 0; i < t; i++) s++;
    for (int i = 0; i < u; i++) s++;
    return s;
}

// test850: O(n+m+r+t+u+v2)  six sequential inline loops
int test850(int n, int m, int r, int t, int u, int v2) {
    int s = 0;
    for (int i = 0; i < n;  i++) s++;
    for (int i = 0; i < m;  i++) s++;
    for (int i = 0; i < r;  i++) s++;
    for (int i = 0; i < t;  i++) s++;
    for (int i = 0; i < u;  i++) s++;
    for (int i = 0; i < v2; i++) s++;
    return s;
}

// test851: O(a+b+c+d+e)  five-term sum via aliased params then helper145
int test851(int a, int b, int c, int d, int e) {
    int x = a, y = b, z = c, w = d, q = e;
    return helper145(x, y, z, w, q);
}

// test852: O(n+m+r+t+u)  five container sizes, sequential loops
int test852(vector<int>& v1, vector<int>& v2,
            deque<int>& dq, set<int>& st,
            multiset<int>& ms) {
    int n = (int)v1.size();
    int m = (int)v2.size();
    int r = (int)dq.size();
    int t = (int)st.size();
    int u = (int)ms.size();
    int s = 0;
    for (int i = 0; i < n; i++) s++;
    for (int i = 0; i < m; i++) s++;
    for (int i = 0; i < r; i++) s++;
    for (int i = 0; i < t; i++) s++;
    for (int i = 0; i < u; i++) s++;
    return s;
}

// test853: O(a+b+c+d+e+f+g)  helper147 with aliased params
int test853(int a, int b, int c, int d, int e, int f, int g) {
    int aa=a, bb=b, cc=c, dd=d, ee=e, ff=f, gg=g;
    return helper147(aa, bb, cc, dd, ee, ff, gg);
}

// ══════════════════════════════════════════════════════════════════
//  §H  DEEP DOMINANCE — LARGE + SMALL TERM SEQUENCES
// ══════════════════════════════════════════════════════════════════

// test854: O(n^3)  O(n^3) then O(n^2) then O(n) — dominant is n^3
int test854(int n) {
    int s = helper14(n);   // O(n^3)
    s += helper13(n);      // O(n^2) dominated
    s += helper1(n);       // O(n)   dominated
    return s;
}

// test855: O(n^2*m)  O(n^2*m) then O(n*m) then O(n) — dominant is n^2*m
int test855(int n, int m) {
    int s = helper56(n, m);    // O(n^2*m)
    s += helper6(n, m);        // O(n*m) dominated
    s += helper1(n);           // O(n)   dominated
    return s;
}

// test856: O(n*m)  O(n*m) then O(n+m) — dominant is n*m
int test856(int n, int m) {
    int s = helper30(n, m);   // O(n*m)
    s += helper29(n, m);      // O(n+m) dominated
    return s;
}

// test857: O(n*log(n))  O(n*log(n)) then O(n) — dominant is n*log(n)
int test857(int n) {
    int s = helper106(n);     // O(n*log(n))
    s += helper1(n);          // O(n) dominated
    return s;
}

// test858: O(n^2*log(n))  O(n^2*log(n)) then O(n*log(n)) then O(n^2)
int test858(int n) {
    int s = helper79(n);      // O(n^2*log(n))
    s += helper106(n);        // O(n*log(n)) dominated
    s += helper13(n);         // O(n^2) dominated
    return s;
}

// test859: O(n*m*r*t)  four-nested then four-sum — dominant is product
int test859(int n, int m, int r, int t) {
    int s = helper86(n, m, r, t);   // O(n*m*r*t)
    s += helper85(n, m, r, t);      // O(n+m+r+t) dominated
    return s;
}

// test860: O(n^2)  n^2 loop then n*log(n) helper — both positive, dominant n^2
int test860(int n) {
    int s = 0;
    for (int i = 0; i < n; i++)
        for (int j = 0; j < n; j++) s++;
    s += helper106(n);  // O(n*log n) dominated by n^2
    return s;
}

// ══════════════════════════════════════════════════════════════════
//  §I  LONG HELPER CHAIN RETURNING INTO ANOTHER LONG CHAIN
// ══════════════════════════════════════════════════════════════════

// test861: O(n)  result of helper96 (6-deep) used as input to helper152 (5-deep)
//   BUT: helper96(n) returns an INTEGER VALUE ~n; that value is then passed to helper152.
//   Pure AST engine cannot determine the runtime value of helper96(n).
//   => Unknown (same as test710-712 pattern)
// EXPECTED: Unknown
int test861(int n) {
    return helper152(helper96(n));
}

// test862: O(n)  result of helper7(n) passed to helper121
//   helper7(n) returns a value proportional to n; cannot be determined from AST.
// EXPECTED: Unknown
int test862(int n) {
    return helper121(helper7(n));
}

// test863: O(n)  helper97(n) [log value] passed to helper121
// EXPECTED: Unknown
int test863(int n) {
    return helper121(helper97(n));
}

// ══════════════════════════════════════════════════════════════════
//  §J  CONTAINER SIZE FORWARDED THROUGH MULTI-LEVEL HELPER CHAIN
// ══════════════════════════════════════════════════════════════════

// test864: O(n)  v.size()→static_cast→alias u→helper152 (5-deep chain)
int test864(vector<int>& v) {
    int u = static_cast<int>(v.size());
    return helper152(u);
    // O(n)
}

// test865: O(n)  string.size()→alias u→helper129 (5-deep DAG chain)
int test865(string& s) {
    int u = static_cast<int>(s.size());
    return helper129(u);
    // O(n)
}

// test866: O(n)  deque.size()→alias u→10-hop local chain→helper121
int test866(deque<int>& dq) {
    int u = (int)dq.size();
    int a1=u, a2=a1, a3=a2, a4=a3, a5=a4;
    int a6=a5, a7=a6, a8=a7, a9=a8, a10=a9;
    return helper121(a10);
    // O(n)
}

// test867: O(n*w)  v.size()→u; second param w; helper158(u,w)
int test867(vector<int>& v, int w) {
    int u = static_cast<int>(v.size());
    return helper158(u, w);
    // O(n*w)
}

// test868: O(n+w)  v.size()→u; second param w; helper160(u,w)
int test868(vector<int>& v, int w) {
    int u = static_cast<int>(v.size());
    return helper160(u, w);
    // O(n+w)
}

// test869: O(n^2)  v.size()→u; helper130(u) [quadratic on u]
int test869(vector<int>& v) {
    int u = (int)v.size();
    return helper130(u);
    // O(n^2)
}

// test870: O(log n)  v.size()→u; helper153(u) [log on u]
int test870(vector<int>& v) {
    int u = (int)v.size();
    return helper153(u);
    // O(log n)
}

// ══════════════════════════════════════════════════════════════════
//  §K  NEW LOOP STEP FORMS
// ══════════════════════════════════════════════════════════════════

// test871: O(log n)  step: i=i+i (equivalent to i*=2)
int test871(int n) {
    int c = 0;
    for (int i = 1; i < n; i = i + i) c++;
    return c;
}

// test872: O(log n)  step: i=i*2 (explicit multiply)
int test872(int n) {
    int c = 0;
    for (int i = 1; i < n; i = i * 2) c++;
    return c;
}

// test873: O(log n)  step: i<<=2 (shift by 2 = ×4)
int test873(int n) {
    int c = 0;
    for (int i = 1; i < n; i <<= 2) c++;
    return c;
}

// test874: O(log m)  step: i=i+i, param m
int test874(int m) {
    int c = 0;
    for (int i = 1; i < m; i = i + i) c++;
    return c;
}

// test875: O(log n)  while-form, step i = i + i
int test875(int n) {
    int i = 1, c = 0;
    while (i < n) { c++; i = i + i; }
    return c;
}

// test876: O(log n)  alias then i=i+i loop
int test876(int n) {
    int bound = n;
    int c = 0;
    for (int i = 1; i < bound; i = i + i) c++;
    return c;
}

// test877: O(n*log(n))  outer n, inner i=i+i step
int test877(int n) {
    int s = 0;
    for (int i = 0; i < n; i++)
        for (int j = 1; j < n; j = j + j) s++;
    return s;
}

// test878: O(log(n)*log(m))  outer i=i+i, inner i<<=2
int test878(int n, int m) {
    int s = 0;
    for (int i = 1; i < n; i = i + i)
        for (int j = 1; j < m; j <<= 2) s++;
    return s;
}

// ══════════════════════════════════════════════════════════════════
//  §L  HARMONIC OUTER + LOG INNER (new compositions)
// ══════════════════════════════════════════════════════════════════

// test879: O(n*log(n))  harmonic outer: for(d=1;d<=n;d++) inner log: for(i=d;i<=n;i+=d)
//   Classic harmonic = O(n*log(n))
int test879(int n) {
    int s = 0;
    for (int d = 1; d <= n; d++)
        for (int i = d; i <= n; i += d) s++;
    return s;
}

// test880: O(n*log(n))  same harmonic with alias
int test880(int n) {
    int lim = n;
    int s = 0;
    for (int d = 1; d <= lim; d++)
        for (int k = d; k <= lim; k += d) s++;
    return s;
}

// test881: O(n*log(n))  harmonic via while-forms
int test881(int n) {
    int s = 0, d = 1;
    while (d <= n) {
        int k = d;
        while (k <= n) { s++; k += d; }
        d++;
    }
    return s;
}

// test882: O(n*log(n))  harmonic inner, outer n loop, helper3 called inside
//   harmonic sum produces n*log(n); calling helper3 inside adds O(log n) per iter =>
//   n * log(n) total outer steps * O(log n) per helper3 call = O(n*log^2(n))?
//   No — the harmonic pattern already includes the stepping; helper3 is called once
//   per (d,i) pair, and total pairs is O(n*log(n)), each helper3 = O(log n).
//   => O(n * log^2(n))
//   But this may be beyond deterministic AST inference — keep as concrete structure.
//   Actually the outer d loop is O(n); inner harmonic step is O(n/d).
//   helper3(n) = O(log n) is called once per (d,i) pair.
//   Total = sum_{d=1}^{n} (n/d) * log(n) = O(n*log(n)) * O(log n) = O(n*log^2(n))
//   For safety, we mark this O(n*log(n)*log(n)) = O(n*log^2(n)).
//   However, the engine must recognize the harmonic structure. If it cannot, Unknown.
//   We mark it Unknown for the conservative engine.
// EXPECTED: Unknown  (harmonic recognition + log inner composition)
int test882(int n) {
    int s = 0;
    for (int d = 1; d <= n; d++)
        for (int i = d; i <= n; i += d)
            s += helper3(n);
    return s;
}

// test883: O(n*log(n))  harmonic loop calling helper5 (O(1)) per step
int test883(int n) {
    int s = 0;
    for (int d = 1; d <= n; d++)
        for (int i = d; i <= n; i += d)
            s += helper5(d);  // O(1) per inner step
    return s;
    // Total steps = n*log(n), each O(1) => O(n*log(n))
}

// ══════════════════════════════════════════════════════════════════
//  §M  SQRT-BOUND COMPOSED WITH HELPER CALLS
// ══════════════════════════════════════════════════════════════════

// test884: O(sqrt(n))  trial division loop (i*i <= n), body calls helper5 (O(1))
int test884(int n) {
    int c = 0;
    for (int i = 1; (long long)i * i <= n; i++)
        c += helper5(i);  // O(1) per step
    return c;
    // O(sqrt(n))
}

// test885: O(sqrt(n))  alias lim=n, trial division loop
int test885(int n) {
    int lim = n;
    int c = 0;
    for (int i = 1; i * i <= lim; i++) c++;
    return c;
}

// test886: O(sqrt(n)*log(n))  trial division outer, inner log loop
int test886(int n) {
    int s = 0;
    for (int i = 1; i * i <= n; i++)
        for (int j = 1; j < n; j *= 2) s++;
    return s;
    // O(sqrt(n)) outer * O(log n) inner = O(sqrt(n)*log(n))
}

// ══════════════════════════════════════════════════════════════════
//  §N  STL RANGE-FOR WITH INNER HELPER-CHAIN BODIES
// ══════════════════════════════════════════════════════════════════

// test887: O(n)  FORV over vector, inner helper152 (5-deep, O(1) because arg=1)
//   Wait — helper152(1) runs a single-step loop => O(1) per iteration
//   Total: n * O(1) = O(n)
int test887(vector<int>& v) {
    int s = 0;
    FORV(x, v) {
        (void)x;
        s += helper152(1);  // O(1) fixed arg
    }
    return s;
    // O(n)
}

// test888: O(n*m)  FORV outer (|v|=n), inner helper100(m, 1) — but helper100(m,1) = O(m)
//   Each outer iteration: helper100(m,1) = m*1 = O(m) => O(n*m) total
int test888(vector<int>& v, int m) {
    int s = 0;
    FORV(x, v) {
        (void)x;
        s += helper100(m, 1);  // O(m)
    }
    return s;
}

// test889: O(n*log(n))  range-for over set (|set|=n), inner helper153(n) [log]
int test889(set<int>& st) {
    int n = static_cast<int>(st.size());
    int s = 0;
    for (auto& x : st) {
        (void)x;
        s += helper153(n);  // O(log n) each
    }
    return s;
    // n * log(n) = O(n*log(n))
}

// test890: O(n^2)  range-for outer over multiset (|ms|=n), inner helper121(n)
int test890(multiset<int>& ms) {
    int n = static_cast<int>(ms.size());
    int s = 0;
    for (auto& x : ms) {
        (void)x;
        s += helper121(n);  // O(n) each
    }
    return s;
    // n * n = O(n^2)
}

// test891: O(n+m)  range-for over map (|mp|=n), then range-for over set (|st|=m)
int test891(map<int,int>& mp, set<int>& st) {
    int s = 0;
    for (auto& kv : mp) { (void)kv; s += helper5(1); }   // n * O(1) = O(n)
    for (auto& x  : st) { (void)x;  s += helper5(1); }   // m * O(1) = O(m)
    return s;
    // O(n+m)
}

// ══════════════════════════════════════════════════════════════════
//  §O  UNKNOWN-BOUNDARY TESTS
// ══════════════════════════════════════════════════════════════════

// test892: Unknown — loop bound is bitwise-AND of two params (unsupported)
int test892(int n, int m) {
    int lim = n & m;
    int s = 0;
    for (int i = 0; i < lim; i++) s++;
    return s;
}

// test893: Unknown — loop bound is XOR of two params (unsupported)
int test893(int n, int m) {
    int lim = n ^ m;
    int s = 0;
    for (int i = 0; i < lim; i++) s++;
    return s;
}

// test894: Unknown — loop bound depends on ternary expression with params
int test894(int n, int m) {
    int lim = (n > m) ? n : m;
    int s = 0;
    for (int i = 0; i < lim; i++) s++;
    return s;
    // min/max reasoning requires semantic inference
}

// test895: Unknown — loop bound is result of complex arithmetic (n*m + r)
int test895(int n, int m, int r) {
    int lim = n * m + r;
    int s = 0;
    for (int i = 0; i < lim; i++) s++;
    return s;
}

// test896: Unknown — loop variable modified by inner conditional (non-linear advance)
int test896(int n) {
    int s = 0;
    for (int i = 0; i < n; ) {
        s++;
        i += (i < n / 2) ? 1 : 2;
    }
    return s;
}

// test897: Unknown — bound is function return where function is opaque
//   helper7 returns a value = k (its linear loop count) but engine cannot
//   trace returned VALUE from AST alone when used as loop bound.
int test897(int n) {
    int lim = helper7(n);  // returns value proportional to n, but opaque at call site
    int s = 0;
    for (int i = 0; i < lim; i++) s++;
    return s;
}

// test898: Unknown — same pattern with log helper
int test898(int n) {
    int lim = helper3(n);  // returns ~log2(n), opaque
    int s = 0;
    for (int i = 0; i < lim; i++) s++;
    return s;
}

// ══════════════════════════════════════════════════════════════════
//  §P  DEEP DOMINANCE VERIFICATION (mergeAndReduce stress)
// ══════════════════════════════════════════════════════════════════

// test899: O(n^3)  5 terms added sequentially, dominant is n^3
int test899(int n) {
    int s = helper14(n);    // O(n^3)
    s += helper13(n);       // O(n^2)
    s += helper106(n);      // O(n*log n)
    s += helper1(n);        // O(n)
    s += helper3(n);        // O(log n)
    return s;
    // dominant: O(n^3)
}

// test900: O(n^2*log(n))  two terms: n^2*log(n) + n^2
int test900(int n) {
    int s = helper79(n);    // O(n^2*log n)
    s += helper13(n);       // O(n^2) dominated
    return s;
}

// test901: O(n*m)  helper30(n,m) + helper29(n,m) — product dominates sum
int test901(int n, int m) {
    int s = helper30(n, m);   // O(n*m)
    s += helper29(n, m);      // O(n+m) dominated
    s += helper5(n);          // O(1)   dominated
    return s;
}

// test902: O(n*m*r*t)  helper86 + helper85 + helper30 — max dominates
int test902(int n, int m, int r, int t) {
    int s = helper86(n, m, r, t);  // O(n*m*r*t)
    s += helper85(n, m, r, t);     // O(n+m+r+t)
    s += helper30(n, m);           // O(n*m)
    return s;
}

// test903: O(n*log(n))  three helpers: n*log(n) + n*log(m) + n
int test903(int n, int m) {
    int s = helper106(n);            // O(n*log n)
    s += helper68(n, m);             // O(n*log m) — same order
    s += helper1(n);                 // O(n)
    return s;
    // max = O(n*log n) (assuming m <= n; if m > n then O(n*log m))
    // For determinism: both n*log(n) and n*log(m) are independent terms
    // => O(n*log(n) + n*log(m)) = O(n*(log(n)+log(m)))
    // This requires SumNode with product factors — may be Unknown for conservative engine
    // Mark conservatively:
}
// EXPECTED for test903: O(n*log(n))  [engine takes dominant term if symbolic comparison available,
//   or may produce Unknown if SumNode with log products unsupported]
// We mark the known dominant: O(n*log(n))

// test904: O(n^2)  loop then call to helper13(n), then helper1(n): two O(n^2) + O(n)
int test904(int n) {
    int s = 0;
    for (int i = 0; i < n; i++)
        for (int j = 0; j < n; j++) s++;
    s += helper13(n);   // O(n^2) — same order, dominated
    s += helper1(n);    // O(n)
    return s;
    // O(n^2)
}

// ══════════════════════════════════════════════════════════════════
//  §Q  RECURSIVE-WRAPPER CHAINS AROUND HELPERS
// ══════════════════════════════════════════════════════════════════

// test905: O(n)  helper129 (5-deep linear DAG) with m substituted
int test905(int m) {
    return helper129(m);
    // O(m)
}

// test906: O(n)  helper129 with container alias
int test906(vector<int>& v) {
    auto u = static_cast<int>(v.size());
    return helper129(u);
}

// test907: O(n*log(n))  helper142 (3-deep n*log(n) wrapper) with k
int test907(int k) {
    return helper142(k);
    // O(k*log(k))
}

// test908: O(n^2*log(n))  helper144 (2-deep n^2*log(n) wrapper) with sz
int test908(int sz) {
    return helper144(sz);
    // O(sz^2*log(sz))
}

// test909: O(n^2)  helper157 (2-deep quadratic wrapper) with r
int test909(int r) {
    return helper157(r);
    // O(r^2)
}

// test910: O(log n)  helper155 (2-deep log wrapper) with t
int test910(int t) {
    return helper155(t);
    // O(log t)
}

// test911: O(n)  helper152 (5-deep linear) with alias chain: n→a→b→u→helper152
int test911(int n) {
    int a = n;
    int b = a;
    int u = b;
    return helper152(u);
    // O(n)
}

// test912: O(n*w)  helper159 (wraps helper158) with aliases
int test912(int n, int w) {
    int u = n;
    return helper159(u, w);
    // O(n*w)
}

// test913: O(n+w)  helper160 with container aliases
int test913(vector<int>& v, int w) {
    int u = (int)v.size();
    return helper160(u, w);
    // O(n+w)
}

// ══════════════════════════════════════════════════════════════════
//  §R  ALTERNATING SHADOW / UNSHADOW MULTI-LEVEL PATTERNS
// ══════════════════════════════════════════════════════════════════

// test914: O(n)  shadow then unshadow: outer x=n, inner shadows x=m,
//   after inner block, outer x=n used in loop
int test914(int n, int m) {
    int x = n;       // outer x = n
    {
        int x = m;   // shadow: inner x = m (unused in outer loop)
        (void)x;
    }
    // after inner block: x refers to outer = n
    int s = 0;
    for (int i = 0; i < x; i++) s++;
    return s;
    // O(n)
}

// test915: O(m)  four-level alternating shadow: outermost = n, level2 = m, level3 = n again
//   loop in level2 uses level2 value = m
int test915(int n, int m) {
    int v2 = n;        // level 1: v2 = n
    int s = 0;
    {
        int v2 = m;    // level 2: v2 = m (shadows)
        for (int i = 0; i < v2; i++) s++;   // O(m)
        {
            int v2 = n;  // level 3: v2 = n (shadows level 2)
            (void)v2;    // not used in any loop
        }
        // back in level 2: v2 still = m
    }
    (void)v2;  // avoid unused warning (outer v2 = n, not used in loop)
    return s;
    // O(m)
}

// test916: O(n)  five-level scope, outermost alias used for the loop
int test916(int n, int m) {
    int a = n;     // scope 1
    int s = 0;
    {
        int a = m; // scope 2 shadows
        {
            int a = n; // scope 3 shadows back
            {
                int a = m; // scope 4 shadows
                (void)a;
            }
            (void)a;   // scope 3: a = n
        }
        (void)a;   // scope 2: a = m (no loop here)
    }
    // back in scope 1: a = n
    for (int i = 0; i < a; i++) s++;
    return s;
    // O(n)
}

// test917: O(n)  alias declared then shadowed then re-aliased from outer after block
int test917(int n, int m) {
    int bound = n;
    {
        int bound = m;
        (void)bound;  // inner block: bound = m, unused in loop
    }
    // outer bound = n survives
    int c = bound;   // c = outer bound = n
    int s = 0;
    for (int i = 0; i < c; i++) s++;
    return s;
    // O(n)
}

// test918: O(n*m)  shadow in outer loop body: inner block shadows the inner loop bound
int test918(int n, int m) {
    int s = 0;
    for (int i = 0; i < n; i++) {
        int limit = m;        // new alias per outer iteration
        for (int j = 0; j < limit; j++) s++;
    }
    return s;
    // O(n*m)
}

// ══════════════════════════════════════════════════════════════════
//  §S  CONTAINER SIZE AS SUM-ALIAS EXPRESSION FED TO HELPER
// ══════════════════════════════════════════════════════════════════

// test919: O(n+m)  v.size()+u.size() summed into alias, fed to helper7
int test919(vector<int>& v, vector<int>& u) {
    int n = (int)v.size();
    int m = (int)u.size();
    int total = n + m;
    return helper7(total);
    // helper7(k) = O(k) = O(n+m)
}

// test920: O(n+m)  sum alias fed to helper121 (leaf via new chain)
int test920(vector<int>& v, deque<int>& dq) {
    int n = (int)v.size();
    int m = (int)dq.size();
    int total = n + m;
    return helper121(total);
    // O(n+m)
}

// test921: O(n+m)  sum alias fed to helper152 (5-deep)
int test921(string& s1, string& s2) {
    int n = static_cast<int>(s1.size());
    int m = static_cast<int>(s2.size());
    int u = n + m;
    return helper152(u);
    // O(n+m)
}

// test922: O(n+m)  sum alias then 5-hop local chain then helper121
int test922(int n, int m) {
    int sum = n + m;
    int x1=sum, x2=x1, x3=x2, x4=x3, x5=x4;
    return helper121(x5);
    // O(n+m)
}

// test923: O(n+m+r)  three container sizes summed, single alias, fo macro
int test923(vector<int>& v, set<int>& st, deque<int>& dq) {
    int n = (int)v.size();
    int m = (int)st.size();
    int r = (int)dq.size();
    int total = n + m + r;
    int s = 0;
    fo(i, total) s++;
    return s;
    // O(n+m+r)
}

// ══════════════════════════════════════════════════════════════════
//  §T  for-init COMPOUND-EXPRESSION ALIAS + DEEP CHAIN COMBO
// ══════════════════════════════════════════════════════════════════

// test924: O(n+m)  for-init: total=n+m; loop bound = total
int test924(int n, int m) {
    int s = 0;
    for (int total = n + m, i = 0; i < total; i++) s++;
    return s;
    // total = n+m in init => O(n+m)
}

// test925: O(n*m)  for-init: bound=n; outer loop; inner rep(j,0,m)
int test925(int n, int m) {
    int s = 0;
    for (int bound = n, i = 0; i < bound; i++)
        rep(j, 0, m) s++;
    return s;
    // O(n*m)
}

// test926: O(n)  for-init with static_cast from container, 10-hop alias chain in body
int test926(vector<int>& v) {
    int s = 0;
    for (int n = static_cast<int>(v.size()), i = 0; i < n; i++) {
        int a=1, b=a, c=b, d=c, e=d;  // O(1) chain per iteration
        s += e;
    }
    return s;
    // O(n) outer, O(1) inner
}

// test927: O(n^2)  for-init alias n=v.size(); outer loop on n; inner helper121(n)
int test927(vector<int>& v) {
    int s = 0;
    for (int n = (int)v.size(), i = 0; i < n; i++)
        s += helper121(n);  // O(n) inner
    return s;
    // n * O(n) = O(n^2)
}

// ══════════════════════════════════════════════════════════════════
//  §U  ADDITIONAL STRUCTURAL COVERAGE (closing remaining gaps)
// ══════════════════════════════════════════════════════════════════

// test928: O(n)  const + typedef + static_cast combo alias chain
int test928(vector<int>& v) {
    typedef int Elem;
    const Elem n = static_cast<Elem>(v.size());
    int s = 0;
    for (int i = 0; i < n; i++) s++;
    return s;
}

// test929: O(n*m)  auto + const int + static_cast combo, nested
int test929(vector<int>& v, int m) {
    auto n = static_cast<int>(v.size());
    const int mm = m;
    int s = 0;
    fo(i, n) fo(j, mm) s++;
    return s;
}

// test930: O(n)  using alias with static_cast inside rep macro
int test930(vector<int>& v) {
    using Idx = int;
    Idx n = static_cast<Idx>(v.size());
    int s = 0;
    rep(i, 0, n) s++;
    return s;
}

// test931: O(n+m)  typedef alias for both, helper101 call
int test931(int n, int m) {
    typedef int T;
    T e = n;
    T f = m;
    return helper101(e, f);
    // O(n+m)
}

// test932: O(n*m)  using alias for both, helper100 call
int test932(int n, int m) {
    using T = int;
    T e = n;
    T f = m;
    return helper100(e, f);
    // O(n*m)
}

// test933: O(n)  12-hop chain ending in helper152 (5-deep)
int test933(int n) {
    int a1=n,  a2=a1,  a3=a2,  a4=a3,
        a5=a4, a6=a5,  a7=a6,  a8=a7,
        a9=a8, a10=a9, a11=a10, a12=a11;
    return helper152(a12);
    // O(n)
}

// test934: O(n)  container→static_cast→10-hop→helper129 (5-deep DAG)
int test934(vector<int>& v) {
    int u0 = static_cast<int>(v.size());
    int u1=u0, u2=u1, u3=u2, u4=u3, u5=u4;
    int u6=u5, u7=u6, u8=u7, u9=u8, u10=u9;
    return helper129(u10);
    // O(n)
}

// test935: O(log n)  10-hop alias chain then log loop
int test935(int n) {
    int p1=n,  p2=p1,  p3=p2,  p4=p3,  p5=p4,
        p6=p5, p7=p6,  p8=p7,  p9=p8,  p10=p9;
    int c = 0;
    for (int i = 1; i < p10; i *= 2) c++;
    return c;
    // O(log n)
}

// test936: O(n^2)  diamond + double loop:
//   left path: n → a; right path: n → b
//   nested loop uses a for outer, b for inner — both = n
int test936(int n) {
    int a = n;   // left diamond arm
    int b = n;   // right diamond arm
    int s = 0;
    for (int i = 0; i < a; i++)
        for (int j = 0; j < b; j++) s++;
    return s;
    // a=n, b=n => O(n^2)
}

// test937: O(n*m)  diamond with two params:
//   left path n→a, right path m→b; nested loop a*b
int test937(int n, int m) {
    int a = n;
    int b = m;
    int s = 0;
    for (int i = 0; i < a; i++)
        for (int j = 0; j < b; j++) s++;
    return s;
    // O(n*m)
}

// test938: O(n)  helper129 called with itself via intermediate param
//   helper129 is 5-deep linear, so this is simply O(n)
int test938(int n) {
    int u = n;
    int r = helper129(u);  // O(n), returns value ~n
    (void)r;
    // Only the call itself runs; we do NOT pass r back as a loop bound
    int s = 0;
    for (int i = 0; i < u; i++) s++;  // O(n) — separate from call
    return s + r;
    // Total: O(n) call + O(n) loop = O(n)
}

// test939: O(n*m)  NEST2 with const auto aliases from containers
int test939(vector<int>& v, vector<int>& u) {
    const auto n = static_cast<int>(v.size());
    const auto m = static_cast<int>(u.size());
    int s = 0;
    NEST2(i, n, j, m, { s++; });
    return s;
}

// test940: O(n^3)  NEST3 with 10-hop alias for each bound
int test940(int n) {
    int a1=n,  a2=a1, a3=a2, a4=a3, a5=a4,
        a6=a5, a7=a6, a8=a7, a9=a8, a10=a9;
    int s = 0;
    NEST3(i, a10, j, a10, k, a10, { s++; });
    return s;
}

// test941: O(n+m)  helper104 (2-deep e+f sum) with container aliases
int test941(vector<int>& v, vector<int>& u) {
    int e = static_cast<int>(v.size());
    int f = static_cast<int>(u.size());
    return helper104(e, f);
    // O(n+m)
}

// test942: O(n*m)  helper103 (2-deep e*f product) with container aliases
int test942(vector<int>& v, vector<int>& u) {
    int e = static_cast<int>(v.size());
    int f = static_cast<int>(u.size());
    return helper103(e, f);
    // O(n*m)
}

// test943: O(n+m+r)  three params; aliases; helper39; then dominated O(1) call
int test943(int n, int m, int r) {
    int p = n, q = m, s2 = r;
    int result = helper39(p, q, s2);  // O(n+m+r)
    result += helper5(n);              // O(1) dominated
    return result;
}

// test944: O(n*m*r)  three params; aliases; helper38; then dominated sum call
int test944(int n, int m, int r) {
    int p = n, q = m, s2 = r;
    int result = helper38(p, q, s2);  // O(n*m*r)
    result += helper39(p, q, s2);     // O(n+m+r) dominated
    return result;
}

// test945: O(u)  helper129(n) called then unused result; separate loop on u=n
int test945(int n) {
    int u = n;
    (void)helper129(u);  // O(n) called — dominates
    return helper129(u); // O(n) again — max = O(n)
}

// test946: O(n*m)  helper159(n,m) then dominated helper160(n,m)
int test946(int n, int m) {
    int s = helper159(n, m);  // O(n*m)
    s += helper160(n, m);     // O(n+m) dominated
    return s;
}

// test947: O(n*log(n))  helper107(n) + helper3(n) — n*log(n) dominates log(n)
int test947(int n) {
    return helper107(n) + helper3(n);
    // O(n*log n) + O(log n) = O(n*log n)
}

// test948: O(n^2)  helper133(n) + helper129(n) — n^2 dominates n
int test948(int n) {
    return helper133(n) + helper129(n);
    // O(n^2) + O(n) = O(n^2)
}

// test949: O(n)  helper129 called three times sequentially — all O(n)
int test949(int n) {
    return helper129(n) + helper129(n) + helper129(n);
    // O(n) + O(n) + O(n) = O(n)
}

// test950: O(n*m)  outer n loop; inner helper159(m, 1) = helper158(m,1) = O(m*1)=O(m)
int test950(int n, int m) {
    int s = 0;
    for (int i = 0; i < n; i++)
        s += helper159(m, 1);  // O(m)
    return s;
    // n * O(m) = O(n*m)
}

// ── Remaining tests: further structural variety ────────────────────

// test951: O(n)  range-for over unordered_multimap, O(1) body
int test951(unordered_multimap<int,int>& umm) {
    int s = 0;
    for (auto& kv : umm) { (void)kv; s += helper5(1); }
    return s;
    // |umm| = n iterations * O(1) = O(n)
}

// test952: O(n*m)  range-for over multimap (|mm|=n), inner repe(j,0,m)
int test952(multimap<int,int>& mm, int m) {
    int s = 0;
    for (auto& kv : mm) {
        (void)kv;
        repe(j, 0, m) s++;
    }
    return s;
    // n * O(m) = O(n*m)
}

// test953: O(n*log(n))  outer fo(i,n), inner helper155(n) [2-deep log wrapper]
int test953(int n) {
    int s = 0;
    fo(i, n) s += helper155(n);  // O(log n) per step
    return s;
    // O(n*log n)
}

// test954: O(n*m)  outer fo(i,n), inner helper158(m,1) = O(m)
int test954(int n, int m) {
    int s = 0;
    fo(i, n) s += helper158(m, 1);
    return s;
    // O(n*m)
}

// test955: O(n*m)  outer fo(i,n), inner helper160(m, 0) = O(m) + O(0) = O(m)
int test955(int n, int m) {
    int s = 0;
    fo(i, n) s += helper160(m, 0);
    return s;
    // helper160(m,0): loop m then loop 0 => O(m)
    // n * O(m) = O(n*m)
}

// test956: O(log(n)*log(m))  helper109 called with container aliases
int test956(vector<int>& v, vector<int>& u) {
    int n = static_cast<int>(v.size());
    int m = static_cast<int>(u.size());
    return helper109(n, m);
    // O(log(n)*log(m))
}

// test957: O(n*m*r)  helper114 with three container aliases
int test957(vector<int>& v, vector<int>& u, deque<int>& dq) {
    int e = static_cast<int>(v.size());
    int f = static_cast<int>(u.size());
    int g = static_cast<int>(dq.size());
    return helper114(e, f, g);
    // O(n*m*r)
}

// test958: O(n+m+r)  helper115 with three container aliases
int test958(set<int>& st, multiset<int>& ms, map<int,int>& mp) {
    int e = static_cast<int>(st.size());
    int f = static_cast<int>(ms.size());
    int g = static_cast<int>(mp.size());
    return helper115(e, f, g);
    // O(n+m+r)
}

// test959: O(n^3)  helper112 called with container alias
int test959(vector<int>& v) {
    int e = (int)v.size();
    return helper112(e);
    // O(n^3)
}

// test960: O(log n)  helper98 (2-deep log) with container alias
int test960(vector<int>& v) {
    int e = static_cast<int>(v.size());
    return helper98(e);
    // O(log n)
}

// test961: O(n*m)  helper118 (fo×fo macro helper) with params
int test961(int n, int m) {
    return helper118(n, m);
    // O(n*m)
}

// test962: O(n*m)  helper120 (3-deep macro chain) with container aliases
int test962(vector<int>& v, vector<int>& u) {
    int e = static_cast<int>(v.size());
    int f = static_cast<int>(u.size());
    return helper120(e, f);
    // O(n*m)
}

// test963: O(n^2)  helper99 with container alias
int test963(vector<int>& v) {
    int e = (int)v.size();
    return helper99(e);
    // O(n^2)
}

// test964: O(n)  helper96 (6-deep linear) with multiset alias
int test964(multiset<int>& ms) {
    int e = static_cast<int>(ms.size());
    return helper96(e);
    // O(n)
}

// test965: O(n)  helper129 (5-deep DAG) with unordered_set alias
int test965(unordered_set<int>& us) {
    int u = static_cast<int>(us.size());
    return helper129(u);
    // O(n)
}

// test966: O(n)  helper152 (5-deep linear) with array alias
int test966(array<int,100>& arr) {
    int u = (int)arr.size();
    return helper152(u);
    // O(n) where n = arr.size() = 100 (but symbolically O(n))
}

// test967: O(n*log(n))  helper107 with container alias
int test967(vector<int>& v) {
    int n = static_cast<int>(v.size());
    return helper107(n);
    // O(n*log n)
}

// test968: O(n^2*log(n))  helper143 with container alias
int test968(vector<int>& v) {
    int n = (int)v.size();
    return helper143(n);
    // O(n^2*log n)
}

// test969: O(n*m)  helper134 with permuted container aliases (swapped)
int test969(vector<int>& v, vector<int>& u) {
    int a = static_cast<int>(v.size());  // maps to p in helper134
    int b = static_cast<int>(u.size());  // maps to q
    return helper134(b, a);  // outer b=|u|=m, inner a=|v|=n => O(m*n)
    // O(n*m)
}

// test970: O(n+m)  helper136 with permuted container aliases
int test970(vector<int>& v, vector<int>& u) {
    int a = static_cast<int>(v.size());
    int b = static_cast<int>(u.size());
    return helper136(b, a);
    // helper136(p,q): p=b=|u|=m, q=a=|v|=n => O(m+n) = O(n+m)
}

// test971: O(n)  sequential: helper129(n), helper121(n), helper96(n) — all O(n)
int test971(int n) {
    int s = helper129(n);
    s += helper121(n);
    s += helper96(n);
    return s;
    // O(n)
}

// test972: O(n^2)  sequential: helper130(n) [O(n^2)], helper129(n) [O(n)] — dominated
int test972(int n) {
    return helper130(n) + helper129(n);
    // O(n^2)
}

// test973: O(n^3)  sequential: helper112(n) [O(n^3)], helper130(n) [O(n^2)], helper121(n) [O(n)]
int test973(int n) {
    return helper112(n) + helper130(n) + helper121(n);
    // O(n^3)
}

// test974: O(n*log(n))  sequential: helper142(n) [O(n*log n)], helper121(n) [O(n)]
int test974(int n) {
    return helper142(n) + helper121(n);
    // O(n*log n)
}

// test975: O(n)  range-for over vector → inner helper5(1) calls (O(1) each)
int test975(vector<int>& v) {
    int s = 0;
    for (auto& x : v) {
        (void)x;
        s += helper5(1);  // O(1) per step
    }
    return s;
    // n * O(1) = O(n)
}

// test976: O(n*m)  range-for outer (|v|=n), inner helper158(m, 1) = O(m)
int test976(vector<int>& v, int m) {
    int s = 0;
    FORV(x, v) {
        (void)x;
        s += helper158(m, 1);
    }
    return s;
}

// test977: O(n^2)  range-for outer (|v|=n), inner helper121(n)
int test977(vector<int>& v) {
    int n = (int)v.size();
    int s = 0;
    FORV(x, v) {
        (void)x;
        s += helper121(n);
    }
    return s;
}

// test978: O(n)  six-hop mixed alias: param→int→auto→const int→using→int→fo
int test978(int n) {
    int a = n;
    auto b = a;
    const int c = b;
    using MyT = int;
    MyT d = c;
    int e = d;
    int s = 0;
    fo(i, e) s++;
    return s;
}

// test979: O(n*m)  two six-hop alias chains, nested fo macros
int test979(int n, int m) {
    int a1=n; auto a2=a1; const int a3=a2; int a4=a3; auto a5=a4; const int a6=a5;
    int b1=m; auto b2=b1; const int b3=b2; int b4=b3; auto b5=b4; const int b6=b5;
    int s = 0;
    fo(i, a6) fo(j, b6) s++;
    return s;
}

// test980: O(n+m)  two six-hop chains, sequential loops
int test980(int n, int m) {
    int a1=n; auto a2=a1; int a3=a2; const int a4=a3; auto a5=a4; int a6=a5;
    int b1=m; auto b2=b1; int b3=b2; const int b4=b3; auto b5=b4; int b6=b5;
    int s = 0;
    for (int i = 0; i < a6; i++) s++;
    for (int i = 0; i < b6; i++) s++;
    return s;
}

// test981: O(n)  stack drain — while loop on stack (|stack|=n initial)
int test981(stack<int> st) {
    int c = 0;
    while (!st.empty()) { st.pop(); c++; }
    return c;
    // O(n)
}

// test982: O(n)  queue drain — while loop on queue
int test982(queue<int> q) {
    int c = 0;
    while (!q.empty()) { q.pop(); c++; }
    return c;
    // O(n)
}

// test983: O(n)  priority_queue drain — while loop
int test983(priority_queue<int> pq) {
    int c = 0;
    while (!pq.empty()) { pq.pop(); c++; }
    return c;
    // O(n)
}

// test984: O(n+m)  stack drain then queue drain
int test984(stack<int> st, queue<int> q) {
    int c = 0;
    while (!st.empty()) { st.pop(); c++; }
    while (!q.empty())  { q.pop();  c++; }
    return c;
    // O(|st| + |q|) = O(n+m)
}

// test985: O(n)  binary search in while form with named lo/hi (new naming)
int test985(int arr[], int n, int key) {
    int alpha = 0, omega = n - 1;
    while (alpha <= omega) {
        int pivot = alpha + (omega - alpha) / 2;
        if (arr[pivot] == key) return pivot;
        if (arr[pivot] < key) alpha = pivot + 1;
        else                  omega = pivot - 1;
    }
    return -1;
    // O(log n)
}

// test986: O(log n)  exponential search: doubling phase then binary
int test986(int n) {
    int pos = 1;
    while (pos < n) pos *= 2;           // O(log n)
    int lo = pos / 2, hi = pos;
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (mid < n / 2) lo = mid + 1;
        else             hi = mid;
    }
    return lo;
    // O(log n) + O(log n) = O(log n)
}

// test987: O(n*log(n))  outer n loop, inner binary search style (O(log n))
int test987(int n) {
    int s = 0;
    for (int i = 0; i < n; i++) {
        int lo = 0, hi = n - 1;
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            if (mid < i) lo = mid + 1;
            else         hi = mid;
        }
        s += lo;
    }
    return s;
    // n outer * O(log n) inner = O(n*log n)
}

// test988: O(n^2)  helper138(n, n) via container alias
int test988(vector<int>& v) {
    int u = (int)v.size();
    return helper138(u, u);
    // helper138(p,q)=O(p*q)=O(u^2)=O(n^2)
}

// test989: O(n)  helper139(n, n) via container alias
int test989(vector<int>& v) {
    int u = (int)v.size();
    return helper139(u, u);
    // O(u+u) = O(n)
}

// test990: O(n*m)  helper134(n,m) with container aliases for both
int test990(vector<int>& v, vector<int>& u) {
    int p = static_cast<int>(v.size());
    int q = static_cast<int>(u.size());
    return helper134(p, q);
    // O(n*m)
}

// test991: O(n+m)  helper136(n,m) with container aliases
int test991(set<int>& st, map<int,int>& mp) {
    int p = static_cast<int>(st.size());
    int q = static_cast<int>(mp.size());
    return helper136(p, q);
    // O(n+m)
}

// test992: O(n*log(n))  outer for-init alias n=v.size(); inner i=i+i loop
int test992(vector<int>& v) {
    int s = 0;
    for (int n = (int)v.size(), i = 0; i < n; i++)
        for (int j = 1; j < n; j = j + j) s++;
    return s;
    // O(n*log n)
}

// test993: O(n)  helper145 called with all args = n/5 parts — sum = n
//   alias: a=n/5 (unsupported division — this is Unknown)
// EXPECTED: Unknown
int test993(int n) {
    int a = n / 5;  // division by constant
    return helper145(a, a, a, a, a);
    // helper145(a,a,a,a,a) = O(5a) = O(n) mathematically
    // but engine sees alias a = n/5 which is unsupported division => Unknown
}

// test994: O(n*m)  repe macro outer, fo inner
int test994(int n, int m) {
    int s = 0;
    repe(i, 1, n) fo(j, m) s++;
    return s;
    // n iterations * m = O(n*m)
}

// test995: O(n*m)  fod outer, repe inner
int test995(int n, int m) {
    int s = 0;
    fod(i, n) repe(j, 0, m) s++;
    return s;
    // O(n*m)
}

// test996: O(n*m*r)  three macros: fo, FORI, repe
int test996(int n, int m, int r) {
    int s = 0;
    fo(i, n) FORI(j, 0, m) repe(k, 0, r) s++;
    return s;
}

// test997: O(n^3)  three macros same param: fod, FORI, repe
int test997(int n) {
    int s = 0;
    fod(i, n) FORI(j, 0, n) repe(k, 0, n) s++;
    return s;
}

// test998: O(n)  helper152 called three times with same param — all O(n), sum O(n)
int test998(int n) {
    return helper152(n) + helper129(n) + helper128(n);
    // O(n) + O(n) + O(n) = O(n)
}

// test999: O(n^2)  helper133(n) + helper130(n) + helper121(n) — max is n^2
int test999(int n) {
    return helper133(n) + helper130(n) + helper121(n);
    // O(n^2)
}

// test1000: O(n*m)
//  Most complex composition in this batch:
//  n = static_cast<int>(v.size()) via typedef Bound
//  m = static_cast<int>(u.size()) via const auto
//  10-hop alias chain on n → nn; 10-hop on m → mm
//  NEST2(i, nn, j, mm, { s += helper5(i+j); })
//  Body: O(1) per cell; n*m cells => O(n*m)
int test1000(vector<int>& v, vector<int>& u) {
    typedef int Bound;
    Bound raw_n = static_cast<Bound>(v.size());
    const auto raw_m = static_cast<int>(u.size());
    // 10-hop on n
    int n1=raw_n, n2=n1, n3=n2, n4=n3, n5=n4,
        n6=n5,   n7=n6, n8=n7, n9=n8, nn=n9;
    // 10-hop on m
    int m1=raw_m, m2=m1, m3=m2, m4=m3, m5=m4,
        m6=m5,   m7=m6, m8=m7, m9=m8, mm=m9;
    int s = 0;
    NEST2(i, nn, j, mm, { s += helper5(i + j); });
    return s;
    // O(n*m) — n*m cells, O(1) per cell
}
