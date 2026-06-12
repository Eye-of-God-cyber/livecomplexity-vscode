// validation_corpus_batch2.cpp
// Compiler-Grade AST Complexity Validation Corpus — Batch 2 (test201–test400)
// C++17 — Compilable

#include <bits/stdc++.h>
using namespace std;

// ─────────────────────────────────────────────
//  MACROS  (extend Batch 1)
// ─────────────────────────────────────────────
#define fo(i,n)    for(int i=0;i<(n);i++)
#define rep(i,a,b) for(int i=(a);i<(b);i++)
#define fod(i,n)   for(int i=(n)-1;i>=0;i--)
#define repe(i,a,b) for(int i=(a);i<=(b);i++)
#define FORV(x,v)  for(auto& x : (v))

// ─────────────────────────────────────────────
//  HELPER FUNCTIONS  (new helpers h26–h60)
// ─────────────────────────────────────────────

// helper1: O(n)
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

// ─────────────────────────────────────────────
//  TEST FUNCTIONS  test201 – test400
// ─────────────────────────────────────────────

// ══════════════════════════════════════════════
//  §A  DEEP FUNCTION COMPOSITION CHAINS
// ══════════════════════════════════════════════

// test201: O(p)  5-deep chain: helper33->helper32->helper31->helper26
int test201(int p) {
    return helper33(p);
}

// test202: O(depth)  3-deep chain: helper42->helper41->helper40
int test202(int depth) {
    return helper42(depth);
}

// test203: O(cnt)  4-deep chain: helper50->helper49->helper48->helper47
int test203(int cnt) {
    return helper50(cnt);
}

// test204: O(rows*cols)  3-deep chain: helper53->helper52->helper51
int test204(int rows, int cols) {
    return helper53(rows, cols);
}

// test205: O(p*q)  3-deep chain: helper46->helper45->helper30
int test205(int p, int q) {
    return helper46(p, q);
}

// test206: O(p)  calls helper60->helper59->helper58  (fo-macro chain)
int test206(int p) {
    return helper60(p);
}

// test207: O(p+q)  calls helper44->helper29
int test207(int p, int q) {
    return helper44(p, q);
}

// test208: O(p^2)  calls helper37->helper35
int test208(int p) {
    return helper37(p);
}

// test209: O(n)  chain: helper33 with parent param n
int test209(int n) {
    return helper33(n);
}

// test210: O(m)  chain: helper50 with parent param m
int test210(int m) {
    return helper50(m);
}

// test211: O(k)  chain: helper42 with parent param k
int test211(int k) {
    return helper42(k);
}

// test212: O(r)  chain: helper60 with parent param r
int test212(int r) {
    return helper60(r);
}

// test213: O(sz)  chain: helper33 with parent param sz
int test213(int sz) {
    return helper33(sz);
}

// test214: O(len)  chain: helper50 with parent param len
int test214(int len) {
    return helper50(len);
}

// test215: O(rows*cols)  chain: helper53 with parent params rows, cols
int test215(int rows, int cols) {
    return helper53(rows, cols);
}

// test216: O(a*b)  chain: helper46 with parent params a, b
int test216(int a, int b) {
    return helper46(a, b);
}

// ══════════════════════════════════════════════
//  §B  PARAMETER SUBSTITUTION — SAME HELPER,
//      MANY DIFFERENT PARENT PARAMETER NAMES
// ══════════════════════════════════════════════

// helper30 is O(p*q); each call below substitutes different parent vars.

// test217: O(x*y)  helper30(x, y)
int test217(int x, int y) {
    return helper30(x, y);
}

// test218: O(k*r)  helper30(k, r)
int test218(int k, int r) {
    return helper30(k, r);
}

// test219: O(rows*cols)  helper30(rows, cols)
int test219(int rows, int cols) {
    return helper30(rows, cols);
}

// test220: O(sz*len)  helper30(sz, len)
int test220(int sz, int len) {
    return helper30(sz, len);
}

// test221: O(a*b)  helper30(a, b)
int test221(int a, int b) {
    return helper30(a, b);
}

// test222: O(depth*cnt)  helper30(depth, cnt)
int test222(int depth, int cnt) {
    return helper30(depth, cnt);
}

// helper29 is O(p+q); substitute different parent vars below.

// test223: O(n+m)  helper29(n, m)
int test223(int n, int m) {
    return helper29(n, m);
}

// test224: O(a+b)  helper29(a, b)
int test224(int a, int b) {
    return helper29(a, b);
}

// test225: O(rows+cols)  helper29(rows, cols)
int test225(int rows, int cols) {
    return helper29(rows, cols);
}

// test226: O(sz+len)  helper29(sz, len)
int test226(int sz, int len) {
    return helper29(sz, len);
}

// test227: O(k+r)  helper29(k, r)
int test227(int k, int r) {
    return helper29(k, r);
}

// helper39 is O(p+q+r); substitute different parent vars.

// test228: O(a+b+c)  helper39(a, b, c)
int test228(int a, int b, int c) {
    return helper39(a, b, c);
}

// test229: O(n+m+r)  helper39(n, m, r)
int test229(int n, int m, int r) {
    return helper39(n, m, r);
}

// test230: O(rows+cols+depth)  helper39(rows, cols, depth)
int test230(int rows, int cols, int depth) {
    return helper39(rows, cols, depth);
}

// test231: O(x+y+z)  helper39(x, y, z)
int test231(int x, int y, int z) {
    return helper39(x, y, z);
}

// helper38 is O(p*q*r).

// test232: O(n*m*r)  helper38(n, m, r)
int test232(int n, int m, int r) {
    return helper38(n, m, r);
}

// test233: O(a*b*c)  helper38(a, b, c)
int test233(int a, int b, int c) {
    return helper38(a, b, c);
}

// test234: O(rows*cols*depth)  helper38(rows, cols, depth)
int test234(int rows, int cols, int depth) {
    return helper38(rows, cols, depth);
}

// test235: O(k*r*t)  helper38(k, r, t)
int test235(int k, int r, int t) {
    return helper38(k, r, t);
}

// ══════════════════════════════════════════════
//  §C  MULTI-HOP ALIASES  (new chain lengths
//      and variable names not in Batch 1)
// ══════════════════════════════════════════════

// test236: O(n)  4-hop alias n->a->b->c->d, loop on d
int test236(int n) {
    int a = n;
    int b = a;
    int c = b;
    int d = c;
    int s = 0;
    for (int i = 0; i < d; i++) s++;
    return s;
}

// test237: O(m)  5-hop alias m->p->q->r->s->t, loop on t
int test237(int m) {
    int p = m;
    int q = p;
    int r = q;
    int s = r;
    int t = s;
    int acc = 0;
    for (int i = 0; i < t; i++) acc++;
    return acc;
}

// test238: O(k)  alias via container size: v.size()->n->k (k is param, n is alias)
int test238(vector<int>& v) {
    int k = (int)v.size();
    int n = k;
    int s = 0;
    for (int i = 0; i < n; i++) s++;
    return s;
    // n aliases k = v.size() -> O(k)
}

// test239: O(sz)  3-hop alias chain from param sz
int test239(int sz) {
    int a = sz;
    int b = a;
    int c = b;
    int s = 0;
    for (int i = 0; i < c; i++) s++;
    return s;
}

// test240: O(rows)  alias rows->rr->bound, loop on bound
int test240(int rows) {
    int rr = rows;
    int bound = rr;
    int s = 0;
    for (int i = 0; i < bound; i++) s++;
    return s;
}

// test241: O(cnt)  alias cnt->total, fo macro on total
int test241(int cnt) {
    int total = cnt;
    int s = 0;
    fo(i, total) s++;
    return s;
}

// test242: O(len)  alias via string length: s.length()->n->len, loop on len
int test242(string& str) {
    int n  = (int)str.length();
    int len = n;
    int c = 0;
    for (int i = 0; i < len; i++) c++;
    return c;
}

// test243: O(depth)  6-hop alias chain
int test243(int depth) {
    int a = depth;
    int b = a;
    int c = b;
    int d = c;
    int e = d;
    int f = e;
    int s = 0;
    for (int i = 0; i < f; i++) s++;
    return s;
}

// test244: O(p)  alias p->x, pass x to helper26
int test244(int p) {
    int x = p;
    return helper26(x);
}

// test245: O(p)  alias p->x->y, pass y to helper33 (deep helper chain)
int test245(int p) {
    int x = p;
    int y = x;
    return helper33(y);
}

// test246: O(cnt)  alias cnt->c2->c3, pass c3 to helper50 (4-deep helper chain)
int test246(int cnt) {
    int c2 = cnt;
    int c3 = c2;
    return helper50(c3);
}

// ══════════════════════════════════════════════
//  §D  SHADOWING — LOCAL SCOPE VARIANTS
// ══════════════════════════════════════════════

// test247: O(m)  outer alias limit=n, inner scope shadows with limit=m
int test247(int n, int m) {
    int limit = n;
    int s = 0;
    {
        int limit = m;   // shadows outer
        for (int i = 0; i < limit; i++) s++;
    }
    return s;
    // inner limit = m => O(m)
}

// test248: O(k)  double-nested shadowing; innermost used
int test248(int n, int m, int k) {
    int x = n;
    {
        int x = m;   // first shadow
        {
            int x = k;  // second shadow
            int s = 0;
            for (int i = 0; i < x; i++) s++;
            return s;
        }
    }
}

// test249: O(r)  alias then shadow in separate block
int test249(int p, int r) {
    int bound = p;
    int s = 0;
    {
        int bound = r;   // shadows
        for (int i = 0; i < bound; i++) s++;
    }
    return s;
    // inner bound = r => O(r)
}

// test250: O(n)  alias a=n in outer, shadow a=m used only for O(1) call,
//               outer loop on original alias after inner scope
int test250(int n, int m) {
    int a = n;
    {
        int a = m;   // shadow: used for O(1) call only
        (void)a;
    }
    int s = 0;
    for (int i = 0; i < a; i++) s++;   // a is outer = n
    return s;
    // outer a = n => O(n)
}

// test251: O(sz)  container size alias, then shadow in inner scope
int test251(vector<int>& v, int sz2) {
    int sz = (int)v.size();
    int s = 0;
    {
        int sz = sz2;   // shadows container alias
        for (int i = 0; i < sz; i++) s++;
    }
    return s;
    // inner sz = sz2 => O(sz2)
    // Note: expected in terms of parent param sz2 => O(sz2)
}

// test252: O(len)  string length alias, then shadow
int test252(string& str, int len2) {
    int len = (int)str.length();
    int c = 0;
    {
        int len = len2;   // shadows
        for (int i = 0; i < len; i++) c++;
    }
    return c;
    // inner len = len2 => O(len2)
}

// test253: O(cols)  outer used, inner scope shadows but doesn't loop
int test253(int rows, int cols) {
    int bound = rows;
    {
        int bound = cols;  // shadow: loop happens here
        int s = 0;
        for (int i = 0; i < bound; i++) s++;
        return s;
    }
}

// test254: O(n)  alias + shadow, fo macro in inner scope
int test254(int n, int m) {
    int lim = n;
    int s = 0;
    {
        int lim = m;  // shadow
        (void)lim;
    }
    fo(i, lim) s++;   // outer lim = n
    return s;
}

// ══════════════════════════════════════════════
//  §E  CONTAINER PROPAGATION — NEW CONTAINERS
//      AND HELPER PASSING
// ══════════════════════════════════════════════

// test255: O(n)  multiset size alias then loop
int test255(multiset<int>& ms) {
    int n = (int)ms.size();
    int c = 0;
    for (int i = 0; i < n; i++) c++;
    return c;
}

// test256: O(n)  unordered_set size alias then loop
int test256(unordered_set<int>& us) {
    int n = (int)us.size();
    int c = 0;
    for (int i = 0; i < n; i++) c++;
    return c;
}

// test257: O(n)  vector size passed directly to helper26
int test257(vector<int>& v) {
    return helper26((int)v.size());
}

// test258: O(n)  string length passed to helper33 (4-deep chain)
int test258(string& str) {
    return helper33((int)str.length());
}

// test259: O(n*m)  two vector sizes passed to helper30
int test259(vector<int>& v, vector<int>& u) {
    return helper30((int)v.size(), (int)u.size());
}

// test260: O(n+m)  vector + string sizes passed to helper29
int test260(vector<int>& v, string& str) {
    return helper29((int)v.size(), (int)str.length());
}

// test261: O(n)  list size alias then fo macro
int test261(list<int>& lst) {
    int n = (int)lst.size();
    int s = 0;
    fo(i, n) s++;
    return s;
}

// test262: O(n)  forward_list size computed manually, aliased
int test262(forward_list<int>& fl) {
    int n = (int)distance(fl.begin(), fl.end());
    int c = 0;
    for (int i = 0; i < n; i++) c++;
    return c;
}

// test263: O(n)  adj list: outer size alias, loop
int test263(vector<vector<int>>& adj) {
    int n = (int)adj.size();
    int c = 0;
    for (int i = 0; i < n; i++) c++;
    return c;
}

// test264: O(n+m)  adj.size() + second param
int test264(vector<vector<int>>& adj, int m) {
    int n = (int)adj.size();
    int c = 0;
    for (int i = 0; i < n; i++) c++;
    for (int j = 0; j < m; j++) c++;
    return c;
}

// test265: O(n)  range-for over unordered_set
int test265(unordered_set<int>& us) {
    int c = 0;
    for (int x : us) { (void)x; c++; }
    return c;
}

// test266: O(n)  range-for over multimap
int test266(multimap<int,int>& mm) {
    int c = 0;
    for (auto& kv : mm) { (void)kv; c++; }
    return c;
}

// test267: O(n)  deque range-for
int test267(deque<int>& dq) {
    int c = 0;
    for (int x : dq) { (void)x; c++; }
    return c;
}

// test268: O(n)  size alias from g (graph-like name), then helper47
int test268(vector<vector<int>>& g) {
    int n = (int)g.size();
    return helper47(n);
}

// test269: O(n*m)  g.size() and adj.size() passed to helper30
int test269(vector<vector<int>>& g, vector<vector<int>>& adj) {
    int n = (int)g.size();
    int m = (int)adj.size();
    return helper30(n, m);
}

// ══════════════════════════════════════════════
//  §F  COMPOUND SYMBOLIC BOUNDS — RICHER FORMS
// ══════════════════════════════════════════════

// test270: O(a+b+c+d)  four-term alias sum loop
int test270(int a, int b, int c, int d) {
    int total = a + b + c + d;
    int s = 0;
    for (int i = 0; i < total; i++) s++;
    return s;
}

// test271: O(a+b+c+d)  calls helper54
int test271(int a, int b, int c, int d) {
    return helper54(a, b, c, d);
}

// test272: O(n+v.size())  param n plus container size
int test272(int n, vector<int>& v) {
    int vsz = (int)v.size();
    int total = n + vsz;
    int s = 0;
    for (int i = 0; i < total; i++) s++;
    return s;
    // bound = n + v.size()
}

// test273: O(a+v.size())  param a plus container size
int test273(int a, vector<int>& v) {
    int b = (int)v.size();
    int s = 0;
    for (int i = 0; i < a; i++) s++;
    for (int i = 0; i < b; i++) s++;
    return s;
}

// test274: O(rows+cols+depth)  three params, three sequential loops
int test274(int rows, int cols, int depth) {
    int s = 0;
    for (int i = 0; i < rows;  i++) s++;
    for (int i = 0; i < cols;  i++) s++;
    for (int i = 0; i < depth; i++) s++;
    return s;
}

// test275: O(rows+cols+depth)  calls helper39(rows, cols, depth)
int test275(int rows, int cols, int depth) {
    return helper39(rows, cols, depth);
}

// test276: O(n+m)  compound alias then fo macro
int test276(int n, int m) {
    int total = n + m;
    int s = 0;
    fo(i, total) s++;
    return s;
}

// test277: O(a+b+c)  compound alias then rep macro
int test277(int a, int b, int c) {
    int bound = a + b + c;
    int s = 0;
    rep(i, 0, bound) s++;
    return s;
}

// test278: O(sz+len)  two container sizes aliased and summed
int test278(vector<int>& v, string& str) {
    int sz  = (int)v.size();
    int len = (int)str.length();
    int total = sz + len;
    int s = 0;
    for (int i = 0; i < total; i++) s++;
    return s;
}

// test279: O(p+q)  compound alias passed to helper44->helper29
int test279(int p, int q) {
    return helper44(p, q);
}

// test280: O(n+m)  compound alias in while loop
int test280(int n, int m) {
    int total = n + m;
    int i = 0, s = 0;
    while (i < total) { s++; i++; }
    return s;
}

// ══════════════════════════════════════════════
//  §G  MACROS — NEW MACRO + HEAVIER USAGE
// ══════════════════════════════════════════════

// test281: O(n)  fod (reverse) macro
int test281(int n) {
    int s = 0;
    fod(i, n) s++;
    return s;
}

// test282: O(m)  fod macro
int test282(int m) {
    int s = 0;
    fod(i, m) s++;
    return s;
}

// test283: O(n*m)  fod nested
int test283(int n, int m) {
    int s = 0;
    fod(i, n) fod(j, m) s++;
    return s;
}

// test284: O(n^2)  fod nested same param
int test284(int n) {
    int s = 0;
    fod(i, n) fod(j, n) s++;
    return s;
}

// test285: O(n)  repe (inclusive range) macro: i=0..n-1 equivalent
int test285(int n) {
    int s = 0;
    repe(i, 0, n-1) s++;
    return s;
}

// test286: O(n*m)  fo outer, fod inner
int test286(int n, int m) {
    int s = 0;
    fo(i, n) fod(j, m) s++;
    return s;
}

// test287: O(n*m)  rep outer, fod inner
int test287(int n, int m) {
    int s = 0;
    rep(i, 0, n) fod(j, m) s++;
    return s;
}

// test288: O(n)  fo macro with container size alias
int test288(vector<int>& v) {
    int n = (int)v.size();
    int s = 0;
    fo(i, n) s++;
    return s;
}

// test289: O(n*m)  fo macro, inner calls helper26 (O(p) per iteration)
int test289(int n, int m) {
    int s = 0;
    fo(i, n) s += helper26(m);
    return s;
    // n * O(m) = O(n*m)
}

// test290: O(n*log(m))  fo outer, helper34 (O(log p)) inner
int test290(int n, int m) {
    int s = 0;
    fo(i, n) s += helper34(m);
    return s;
}

// test291: O(n^2)  fo outer, inner calls helper26(n)
int test291(int n) {
    int s = 0;
    fo(i, n) s += helper26(n);
    return s;
}

// test292: O(n)  FORV macro over vector
int test292(vector<int>& v) {
    int s = 0;
    FORV(x, v) { (void)x; s++; }
    return s;
}

// test293: O(n)  FORV macro over set
int test293(set<int>& st) {
    int s = 0;
    FORV(x, st) { (void)x; s++; }
    return s;
}

// test294: O(n)  FORV over map
int test294(map<int,int>& mp) {
    int s = 0;
    FORV(kv, mp) { (void)kv; s++; }
    return s;
}

// test295: O(n+m)  FORV over two containers
int test295(vector<int>& v, vector<int>& u) {
    int s = 0;
    FORV(x, v) { (void)x; s++; }
    FORV(x, u) { (void)x; s++; }
    return s;
}

// test296: O(n*m)  fo outer, FORV inner over u of size m
int test296(int n, vector<int>& u) {
    int s = 0;
    fo(i, n) {
        FORV(x, u) { (void)x; s++; }
    }
    return s;
    // n * |u| = O(n*m)
}

// ══════════════════════════════════════════════
//  §H  BINARY SEARCH — NEW STRUCTURAL FORMS
// ══════════════════════════════════════════════

// test297: O(log n)  ternary-free binary search, lo/hi named start/end
int test297(int n) {
    int start = 0, end = n - 1;
    while (start <= end) {
        int mid = start + (end - start) / 2;
        if (mid == 0) break;
        end = mid - 1;
    }
    return start;
}

// test298: O(log n)  binary search with explicit underflow guard (hi-lo>>1)
int test298(int arr[], int n, int key) {
    int lo = 0, hi = n - 1;
    while (lo <= hi) {
        int mid = lo + ((hi - lo) >> 1);
        if (arr[mid] == key) return mid;
        if (arr[mid] < key) lo = mid + 1;
        else               hi = mid - 1;
    }
    return -1;
}

// test299: O(log m)  binary search on m, named ptr/fence
int test299(int m) {
    int ptr = 0, fence = m;
    while (ptr < fence) {
        int mid = ptr + (fence - ptr) / 2;
        if (mid < m / 2) ptr = mid + 1;
        else             fence = mid;
    }
    return ptr;
}

// test300: O(log k)  binary search, named lo/up
int test300(int k) {
    int lo = 0, up = k;
    while (lo < up) {
        int med = (lo + up) / 2;
        if (med * 3 < k) lo = med + 1;
        else             up = med;
    }
    return lo;
}

// test301: O(log r)  binary search on r, variables a/b
int test301(int r) {
    int a = 0, b = r - 1;
    while (a <= b) {
        int c = a + (b - a) / 2;
        if (c < r / 4) a = c + 1;
        else           b = c - 1;
    }
    return a;
}

// test302: O(log sz)  binary search on sz, bit-shift mid
int test302(int sz) {
    int lo = 0, hi = sz;
    while (lo < hi) {
        int mid = lo + ((hi - lo) >> 1);
        if (mid < sz / 3) lo = mid + 1;
        else              hi = mid;
    }
    return lo;
}

// test303: O(log n)  binary search: start at 1, double until >= n,
//          then bisect — different doubling style from test148
int test303(int n) {
    int step = 1;
    while (step * 2 < n) step <<= 1;
    int lo = 0, hi = step;
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (mid < n) lo = mid + 1;
        else         hi = mid;
    }
    return lo;
}

// test304: O(log n)  calls helper34 (right-shift style log)
int test304(int n) {
    return helper34(n);
}

// test305: O(log p)  calls helper28 (multiply-by-3 style)
int test305(int p) {
    return helper28(p);
}

// test306: O(log q)  calls helper43 (left-shift style)
int test306(int q) {
    return helper43(q);
}

// test307: O(log n)  binary search on vector, hi = v.size()-1
int test307(vector<int>& v, int target) {
    int lo = 0, hi = (int)v.size() - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (v[mid] == target) return mid;
        if (v[mid] < target)  lo = mid + 1;
        else                  hi = mid - 1;
    }
    return -1;
}

// test308: O(log n)  binary search, two-phase: both phases O(log n)
int test308(int n) {
    // phase 1: step up
    int hi = 1;
    while (hi < n) hi *= 2;
    // phase 2: bisect
    int lo = hi / 2;
    while (lo < hi) {
        int mid = (lo + hi) / 2;
        if (mid < n) lo = mid + 1;
        else         hi = mid;
    }
    return lo;
}

// ══════════════════════════════════════════════
//  §I  LOGARITHMIC LOOPS — NEW STEP OPERATORS
// ══════════════════════════════════════════════

// test309: O(log n)  i *= 4
int test309(int n) {
    int c = 0;
    for (int i = 1; i < n; i *= 4) c++;
    return c;
}

// test310: O(log n)  i /= 4
int test310(int n) {
    int c = 0;
    for (int i = n; i >= 1; i /= 4) c++;
    return c;
}

// test311: O(log m)  i *= 2 with different start
int test311(int m) {
    int c = 0;
    for (int i = 2; i < m; i *= 2) c++;
    return c;
}

// test312: O(log k)  i >>= 1, downward
int test312(int k) {
    int c = 0;
    for (int i = k; i > 1; i >>= 1) c++;
    return c;
}

// test313: O(log r)  while loop, r >>= 1
int test313(int r) {
    int c = 0;
    int i = r;
    while (i > 0) { c++; i >>= 1; }
    return c;
}

// test314: O(log n)  while loop, i <<= 1
int test314(int n) {
    int c = 0;
    int i = 1;
    while (i < n) { c++; i <<= 1; }
    return c;
}

// test315: O(log n)  alias then i *= 2 loop
int test315(int n) {
    int lim = n;
    int c = 0;
    for (int i = 1; i < lim; i *= 2) c++;
    return c;
}

// test316: O(log sz)  alias sz from vector, then i /= 2 loop
int test316(vector<int>& v) {
    int sz = (int)v.size();
    int c = 0;
    for (int i = sz; i >= 1; i /= 2) c++;
    return c;
}

// test317: O(log n)  calls helper34 with alias
int test317(int n) {
    int x = n;
    return helper34(x);
}

// test318: O(log p)  alias p->q->r, then log loop on r
int test318(int p) {
    int q = p;
    int r = q;
    int c = 0;
    for (int i = 1; i < r; i *= 2) c++;
    return c;
}

// ══════════════════════════════════════════════
//  §J  HARMONIC PATTERNS — NEW FORMS
// ══════════════════════════════════════════════

// test319: O(m*log(m))  harmonic on m
int test319(int m) {
    int s = 0;
    for (int i = 1; i <= m; i++)
        for (int j = i; j <= m; j += i) s++;
    return s;
}

// test320: O(k*log(k))  harmonic on k (alias-based)
int test320(int k) {
    int lim = k;
    int s = 0;
    for (int i = 1; i <= lim; i++)
        for (int j = i; j <= lim; j += i) s++;
    return s;
}

// test321: O(n*log(n))  calls helper55 (which does loop+helper34)
int test321(int n) {
    return helper55(n);
}

// test322: O(n*log(n))  outer linear, inner log (helper43) per element
int test322(int n) {
    int s = 0;
    for (int i = 1; i <= n; i++)
        s += helper43(i);
    return s;
}

// test323: O(p*log(p))  outer linear on p, inner log (helper28) per element
int test323(int p) {
    int s = 0;
    for (int i = 1; i <= p; i++)
        s += helper28(i);
    return s;
}

// test324: O(rows*log(rows))  outer linear on rows, inner helper34
int test324(int rows) {
    int s = 0;
    for (int i = 1; i <= rows; i++)
        s += helper34(i);
    return s;
}

// ══════════════════════════════════════════════
//  §K  RANGE-FOR — NEW CONTAINERS AND COMBOS
// ══════════════════════════════════════════════

// test325: O(n*m)  range-for outer over v, index-for inner over u
int test325(vector<int>& v, vector<int>& u) {
    int c = 0;
    for (int x : v) {
        (void)x;
        for (int y : u) { (void)y; c++; }
    }
    return c;
    // |v|=n, |u|=m => O(n*m)
}

// test326: O(n)  range-for over set, helper call O(1) per element
int test326(set<int>& st) {
    int s = 0;
    for (int x : st) s += (x > 0 ? 1 : 0);
    return s;
}

// test327: O(n+m)  range-for over map then over set
int test327(map<int,int>& mp, set<int>& st) {
    int c = 0;
    for (auto& kv : mp) { (void)kv; c++; }
    for (int x  : st)   { (void)x;  c++; }
    return c;
}

// test328: O(n*m)  range-for outer over map, inner param loop
int test328(map<int,int>& mp, int m) {
    int c = 0;
    for (auto& kv : mp) {
        (void)kv;
        for (int j = 0; j < m; j++) c++;
    }
    return c;
    // |mp|=n => O(n*m)
}

// test329: O(n)  range-for over deque with helper5 (O(1)) call
int test329(deque<int>& dq) {
    int s = 0;
    for (int x : dq) s += (x * 2 + 1);
    return s;
}

// test330: O(n^2)  range-for outer and inner over same map
int test330(map<int,int>& mp) {
    int c = 0;
    for (auto& kv1 : mp)
        for (auto& kv2 : mp) { (void)kv1; (void)kv2; c++; }
    return c;
    // |mp|=n => O(n^2)
}

// test331: O(n)  range-for over unordered_map, alias size first
int test331(unordered_map<int,int>& mp) {
    int n = (int)mp.size();
    (void)n;  // alias declared but loop is range-for
    int c = 0;
    for (auto& kv : mp) { (void)kv; c++; }
    return c;
}

// test332: O(n+m)  range-for over string then vector
int test332(string& str, vector<int>& v) {
    int c = 0;
    for (char ch : str) { (void)ch; c++; }
    for (int  x  : v)   { (void)x;  c++; }
    return c;
}

// ══════════════════════════════════════════════
//  §L  FUNCTION REUSE — ONE HELPER, MANY CALLERS
// ══════════════════════════════════════════════

// helper30 is O(p*q). Many tests call it with different parent params.
// (See §B above for substitution tests.)

// The following reuse helper56 (O(p^2*q)) with different parent params.

// test333: O(n^2*m)  helper56(n, m)
int test333(int n, int m) {
    return helper56(n, m);
}

// test334: O(a^2*b)  helper56(a, b)
int test334(int a, int b) {
    return helper56(a, b);
}

// test335: O(rows^2*cols)  helper56(rows, cols)
int test335(int rows, int cols) {
    return helper56(rows, cols);
}

// test336: O(k^2*r)  helper56(k, r)
int test336(int k, int r) {
    return helper56(k, r);
}

// The following reuse helper57 (O(p*q^2)) with different parent params.

// test337: O(n*m^2)  helper57(n, m)
int test337(int n, int m) {
    return helper57(n, m);
}

// test338: O(a*b^2)  helper57(a, b)
int test338(int a, int b) {
    return helper57(a, b);
}

// test339: O(rows*cols^2)  helper57(rows, cols)
int test339(int rows, int cols) {
    return helper57(rows, cols);
}

// test340: O(sz*len^2)  helper57(sz, len)
int test340(int sz, int len) {
    return helper57(sz, len);
}

// ══════════════════════════════════════════════
//  §M  MIXED SEQUENTIAL — DOMINANCE CASES
// ══════════════════════════════════════════════

// test341: O(n*m)  n*m loop then n+m sequential (dominated)
int test341(int n, int m) {
    int s = 0;
    for (int i = 0; i < n; i++)
        for (int j = 0; j < m; j++) s++;
    for (int i = 0; i < n; i++) s++;
    for (int j = 0; j < m; j++) s++;
    return s;
}

// test342: O(p^3)  p^3 loop then p^2 then p (dominated)
int test342(int p) {
    int s = 0;
    for (int i = 0; i < p; i++)
        for (int j = 0; j < p; j++)
            for (int k = 0; k < p; k++) s++;
    for (int i = 0; i < p; i++)
        for (int j = 0; j < p; j++) s++;
    for (int i = 0; i < p; i++) s++;
    return s;
}

// test343: O(n*m)  helper30(n,m) then helper29(n,m) — product dominates sum
int test343(int n, int m) {
    int s = helper30(n, m);
    s    += helper29(n, m);
    return s;
}

// test344: O(n*log(n))  n*log(n) then n (dominated)
int test344(int n) {
    int s = 0;
    for (int i = 1; i <= n; i++)
        s += helper34(i);
    for (int i = 0; i < n; i++) s++;
    return s;
}

// test345: O(rows*cols)  helper51(rows,cols) then helper29(rows,cols)
int test345(int rows, int cols) {
    return helper51(rows, cols) + helper29(rows, cols);
}

// test346: O(n^2)  n^2 via helper35 then n via helper26 — dominated
int test346(int n) {
    return helper35(n) + helper26(n);
}

// test347: O(p^3)  helper36(p) then helper35(p) — p^3 dominates p^2
int test347(int p) {
    return helper36(p) + helper35(p);
}

// test348: O(n*m*r)  helper38(n,m,r) then helper30(n,m)
int test348(int n, int m, int r) {
    return helper38(n, m, r) + helper30(n, m);
}

// ══════════════════════════════════════════════
//  §N  WHILE LOOPS — NEW STRUCTURAL FORMS
// ══════════════════════════════════════════════

// test349: O(n)  while, decrement
int test349(int n) {
    int i = n, s = 0;
    while (i > 0) { s++; i--; }
    return s;
}

// test350: O(n)  while, two-pointer convergence (same container)
int test350(vector<int>& v) {
    int lo = 0, hi = (int)v.size() - 1;
    int c = 0;
    while (lo < hi) { lo++; hi--; c++; }
    return c;
}

// test351: O(log n)  while, i = i / 3
int test351(int n) {
    int c = 0;
    int i = n;
    while (i > 1) { c++; i /= 3; }
    return c;
}

// test352: O(n*m)  while outer on n, inner while on m
int test352(int n, int m) {
    int i = 0, s = 0;
    while (i < n) {
        int j = 0;
        while (j < m) { s++; j++; }
        i++;
    }
    return s;
}

// test353: O(n)  while loop with alias
int test353(int n) {
    int lim = n;
    int i = 0, s = 0;
    while (i < lim) { s++; i++; }
    return s;
}

// test354: O(n)  do-while, increment, aliased limit
int test354(int n) {
    int lim = n;
    int i = 0, s = 0;
    if (lim <= 0) return 0;
    do { s++; i++; } while (i < lim);
    return s;
}

// ══════════════════════════════════════════════
//  §O  PARAMETER PASSING — EXPRESSIONS
//      (a+b, v.size(), compound exprs)
// ══════════════════════════════════════════════

// test355: O(a+b)  helper12(a, b) — Batch 1 helper, new mapping
int test355(int a, int b) {
    return helper12(a, b);
    // helper12 uses params (a,b), parent uses (a,b): O(a+b)
}

// Note: helper12 from Batch 1 is O(a+b).
// test356: O(n+m)  helper12(n, m) — already in Batch 1 test62 but with macro context here
int test356(int n, int m) {
    int s = helper12(n, m);
    fo(i, 1) s++;   // O(1) extra — dominated
    return s;
}

// test357: O(p+q)  helper29(p, q)  — passes raw params
int test357(int p, int q) {
    return helper29(p, q);
}

// test358: O(a+b)  manual alias before passing: a2=a, b2=b, helper29(a2,b2)
int test358(int a, int b) {
    int a2 = a;
    int b2 = b;
    return helper29(a2, b2);
}

// test359: O(n+v.size())  alias n and vsz = v.size(), helper29(n, vsz)
int test359(int n, vector<int>& v) {
    int vsz = (int)v.size();
    return helper29(n, vsz);
}

// test360: O(sz+len)  alias sz from v.size(), len from str.length(), helper29
int test360(vector<int>& v, string& str) {
    int sz  = (int)v.size();
    int len = (int)str.length();
    return helper29(sz, len);
}

// test361: O(a*b)  manual alias then helper30(x, y)
int test361(int a, int b) {
    int x = a;
    int y = b;
    return helper30(x, y);
}

// test362: O(n*m)  v.size() and u.size() passed to helper30 via aliases
int test362(vector<int>& v, vector<int>& u) {
    int n = (int)v.size();
    int m = (int)u.size();
    return helper30(n, m);
}

// test363: O(rows+cols+depth)  three aliases then helper39
int test363(int rows, int cols, int depth) {
    int r2 = rows;
    int c2 = cols;
    int d2 = depth;
    return helper39(r2, c2, d2);
}

// test364: O(n*m*r)  three aliases then helper38
int test364(int n, int m, int r) {
    int a = n;
    int b = m;
    int c = r;
    return helper38(a, b, c);
}

// ══════════════════════════════════════════════
//  §P  NESTED HELPERS + LOOP COMBOS
//      (loop calling helper inside iteration)
// ══════════════════════════════════════════════

// test365: O(n*p)  outer n loop, inner helper26(p) per iteration
int test365(int n, int p) {
    int s = 0;
    for (int i = 0; i < n; i++) {
        s += helper26(p);
    }
    return s;
}
