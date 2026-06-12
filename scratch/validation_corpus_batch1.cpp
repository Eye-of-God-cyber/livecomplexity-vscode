// validation_corpus_batch1.cpp
// Compiler-Grade AST Complexity Validation Corpus — Batch 1 (test1–test200)
// C++17 — Compilable

#include <bits/stdc++.h>
using namespace std;

// ─────────────────────────────────────────────
//  MACROS
// ─────────────────────────────────────────────
#define fo(i,n)   for(int i=0;i<(n);i++)
#define rep(i,a,b) for(int i=(a);i<(b);i++)

// ─────────────────────────────────────────────
//  HELPER FUNCTIONS
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

// ─────────────────────────────────────────────
//  TEST FUNCTIONS  test1 – test200
// ─────────────────────────────────────────────

// ── O(1) block ──────────────────────────────

// test1: O(1) — arithmetic only
int test1(int n) {
    return n * n + 2 * n + 1;
}

// test2: O(1) — conditional, no loop
int test2(int n, int m) {
    if (n > m) return n;
    return m;
}

// test3: O(1) — array index access
int test3(int arr[], int n) {
    return arr[0] + arr[n-1];
}

// test4: O(1) — multiple returns, no loop
int test4(int a, int b, int c) {
    int x = a + b;
    int y = x * c;
    return y;
}

// test5: O(1) — calls helper5
int test5(int n) {
    return helper5(n);
}

// test6: O(1) — bit operations
int test6(int n) {
    return (n & (n-1)) == 0 ? 1 : 0;
}

// test7: O(1) — nested helper5 calls
int test7(int n) {
    return helper5(helper5(n));
}

// test8: O(1) — swap via XOR
void test8(int &a, int &b) {
    a ^= b; b ^= a; a ^= b;
}

// test9: O(1) — modulo and division
int test9(int n, int m) {
    return (n / m) + (n % m);
}

// test10: O(1) — STL vector index
int test10(vector<int>& v) {
    return v[0] + v[v.size()-1];
}

// ── O(log n) block ────────────────────────────

// test11: O(log n) — multiply by 2
int test11(int n) {
    int c = 0;
    for (int i = 1; i < n; i *= 2) c++;
    return c;
}

// test12: O(log n) — divide by 2
int test12(int n) {
    int c = 0;
    for (int i = n; i >= 1; i /= 2) c++;
    return c;
}

// test13: O(log n) — left-shift
int test13(int n) {
    int c = 0;
    for (int i = 1; i < n; i <<= 1) c++;
    return c;
}

// test14: O(log n) — right-shift
int test14(int n) {
    int c = 0;
    for (int i = n; i > 0; i >>= 1) c++;
    return c;
}

// test15: O(log m) — multiply, different var
int test15(int m) {
    int c = 0;
    for (int i = 1; i < m; i *= 2) c++;
    return c;
}

// test16: O(log k) — calls helper11
int test16(int k) {
    return helper11(k);
}

// test17: O(log n) — binary search skeleton
int test17(int arr[], int n, int target) {
    int lo = 0, hi = n - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (arr[mid] == target) return mid;
        else if (arr[mid] < target) lo = mid + 1;
        else hi = mid - 1;
    }
    return -1;
}

// test18: O(log n) — binary search, hi=n
int test18(int arr[], int n, int target) {
    int lo = 0, hi = n;
    while (lo < hi) {
        int mid = (lo + hi) / 2;
        if (arr[mid] < target) lo = mid + 1;
        else hi = mid;
    }
    return lo;
}

// test19: O(log n) — bit-shift binary search
int test19(int n) {
    int lo = 0, hi = n - 1;
    while (lo < hi) {
        int mid = lo + ((hi - lo) >> 1);
        if (mid * mid <= n) lo = mid + 1;
        else hi = mid;
    }
    return lo;
}

// test20: O(log n) — multiply by 3
int test20(int n) {
    int c = 0;
    for (int i = 1; i < n; i *= 3) c++;
    return c;
}

// test21: O(log r) — different param
int test21(int r) {
    int c = 0;
    for (int i = r; i > 0; i /= 2) c++;
    return c;
}

// test22: O(log sz) — sz param
int test22(int sz) {
    int c = 0;
    for (int i = 1; i < sz; i *= 2) c++;
    return c;
}

// test23: O(log n) — calls helper3
int test23(int n) {
    return helper3(n) + 1;
}

// test24: O(log m) — calls helper4
int test24(int m) {
    return helper4(m);
}

// test25: O(log n) — binary search with named bounds
int test25(int n) {
    int left = 0, right = n - 1;
    while (left <= right) {
        int mid = left + (right - left) / 2;
        if (mid == 0) break;
        right = mid - 1;
    }
    return left;
}

// ── O(n) block ────────────────────────────────

// test26: O(n)
int test26(int n) {
    int s = 0;
    for (int i = 0; i < n; i++) s += i;
    return s;
}

// test27: O(m) — param m
int test27(int m) {
    int s = 0;
    for (int i = 0; i < m; i++) s++;
    return s;
}

// test28: O(k) — param k
int test28(int k) {
    int s = 0;
    for (int i = 0; i < k; i++) s++;
    return s;
}

// test29: O(r) — param r
int test29(int r) {
    int s = 0;
    for (int i = 0; i < r; i++) s++;
    return s;
}

// test30: O(t) — param t
int test30(int t) {
    int s = 0;
    for (int i = 0; i < t; i++) s++;
    return s;
}

// test31: O(x) — param x
int test31(int x) {
    int s = 0;
    for (int i = 0; i < x; i++) s++;
    return s;
}

// test32: O(y) — param y
int test32(int y) {
    int s = 0;
    for (int i = 0; i < y; i++) s++;
    return s;
}

// test33: O(z) — param z
int test33(int z) {
    int s = 0;
    for (int i = 0; i < z; i++) s++;
    return s;
}

// test34: O(a) — param a
int test34(int a) {
    int s = 0;
    for (int i = 0; i < a; i++) s++;
    return s;
}

// test35: O(b) — param b
int test35(int b) {
    int s = 0;
    for (int i = 0; i < b; i++) s++;
    return s;
}

// test36: O(c) — param c
int test36(int c) {
    int s = 0;
    for (int i = 0; i < c; i++) s++;
    return s;
}

// test37: O(len) — param len
int test37(int len) {
    return helper19(len);
}

// test38: O(sz) — param sz
int test38(int sz) {
    return helper18(sz);
}

// test39: O(cnt) — param cnt
int test39(int cnt) {
    int s = 0;
    for (int i = 0; i < cnt; i++) s++;
    return s;
}

// test40: O(limit) — param limit
int test40(int limit) {
    int s = 0;
    for (int i = 0; i < limit; i++) s++;
    return s;
}

// test41: O(rows) — param rows
int test41(int rows) {
    int s = 0;
    for (int i = 0; i < rows; i++) s++;
    return s;
}

// test42: O(cols) — param cols
int test42(int cols) {
    int s = 0;
    for (int i = 0; i < cols; i++) s++;
    return s;
}

// test43: O(n) — while loop
int test43(int n) {
    int s = 0, i = 0;
    while (i < n) { s++; i++; }
    return s;
}

// test44: O(n) — reverse loop
int test44(int n) {
    int s = 0;
    for (int i = n - 1; i >= 0; i--) s++;
    return s;
}

// test45: O(n) — calls helper1
int test45(int n) {
    return helper1(n);
}

// test46: O(m) — calls helper2
int test46(int m) {
    return helper2(m);
}

// test47: O(k) — calls helper7
int test47(int k) {
    return helper7(k);
}

// test48: O(n) — vector iteration by index
int test48(vector<int>& v, int n) {
    int s = 0;
    for (int i = 0; i < n; i++) s += v[i];
    return s;
}

// test49: O(n) — range-for over vector of size n
int test49(vector<int>& v) {
    int s = 0;
    for (int x : v) s += x;
    return s;
    // bound = v.size()
}

// test50: O(n) — string iteration
int test50(string& s) {
    int c = 0;
    for (char ch : s) { (void)ch; c++; }
    return c;
    // bound = s.size() => n
}

// ── O(n) — alias variants ─────────────────────

// test51: O(n) — single alias
int test51(int n) {
    int limit = n;
    int s = 0;
    for (int i = 0; i < limit; i++) s++;
    return s;
}

// test52: O(m) — alias chain
int test52(int m) {
    int a = m;
    int b = a;
    int s = 0;
    for (int i = 0; i < b; i++) s++;
    return s;
}

// test53: O(k) — alias with arithmetic-free assignment
int test53(int k) {
    int sz = k;
    int s = 0;
    for (int i = 0; i < sz; i++) s++;
    return s;
}

// test54: O(n) — container size alias
int test54(vector<int>& v) {
    int n = (int)v.size();
    int s = 0;
    for (int i = 0; i < n; i++) s++;
    return s;
}

// test55: O(n) — string length alias
int test55(string& s) {
    int n = (int)s.length();
    int c = 0;
    for (int i = 0; i < n; i++) c++;
    return c;
}

// ── O(n+m) block ─────────────────────────────

// test56: O(n+m) — two sequential loops
int test56(int n, int m) {
    int s = 0;
    for (int i = 0; i < n; i++) s++;
    for (int i = 0; i < m; i++) s++;
    return s;
}

// test57: O(a+b) — params a,b
int test57(int a, int b) {
    return helper12(a, b);
}

// test58: O(a+b+c) — three sequential
int test58(int a, int b, int c) {
    return helper23(a, b, c);
}

// test59: O(n+m) — while loops
int test59(int n, int m) {
    int s = 0, i = 0;
    while (i < n) { s++; i++; }
    i = 0;
    while (i < m) { s++; i++; }
    return s;
}

// test60: O(x+y) — params x,y
int test60(int x, int y) {
    int s = 0;
    for (int i = 0; i < x; i++) s++;
    for (int i = 0; i < y; i++) s++;
    return s;
}

// test61: O(r+t) — params r,t
int test61(int r, int t) {
    int s = 0;
    for (int i = 0; i < r; i++) s++;
    for (int i = 0; i < t; i++) s++;
    return s;
}

// test62: O(n+m) — calls helper12(n,m) — note: helper12 uses a,b; parent uses n,m
int test62(int n, int m) {
    return helper12(n, m);
}

// test63: O(a+b+c) — calls helper23
int test63(int a, int b, int c) {
    return helper23(a, b, c);
}

// test64: O(rows+cols) — params rows,cols
int test64(int rows, int cols) {
    int s = 0;
    for (int i = 0; i < rows; i++) s++;
    for (int i = 0; i < cols; i++) s++;
    return s;
}

// test65: O(sz+len) — container alias combo
int test65(vector<int>& v, string& s) {
    int sz = (int)v.size();
    int len = (int)s.length();
    int c = 0;
    for (int i = 0; i < sz; i++) c++;
    for (int i = 0; i < len; i++) c++;
    return c;
}

// ── O(n*m) block ─────────────────────────────

// test66: O(n*m) — nested loops
int test66(int n, int m) {
    int s = 0;
    for (int i = 0; i < n; i++)
        for (int j = 0; j < m; j++) s++;
    return s;
}

// test67: O(a*b) — params a,b
int test67(int a, int b) {
    int s = 0;
    for (int i = 0; i < a; i++)
        for (int j = 0; j < b; j++) s++;
    return s;
}

// test68: O(r*t) — params r,t
int test68(int r, int t) {
    int s = 0;
    for (int i = 0; i < r; i++)
        for (int j = 0; j < t; j++) s++;
    return s;
}

// test69: O(rows*cols) — calls helper20
int test69(int rows, int cols) {
    return helper20(rows, cols);
}

// test70: O(n*m) — calls helper6
int test70(int n, int m) {
    return helper6(n, m);
}

// test71: O(k*r) — params k,r
int test71(int k, int r) {
    int s = 0;
    for (int i = 0; i < k; i++)
        for (int j = 0; j < r; j++) s++;
    return s;
}

// test72: O(x*y) — params x,y
int test72(int x, int y) {
    int s = 0;
    for (int i = 0; i < x; i++)
        for (int j = 0; j < y; j++) s++;
    return s;
}

// test73: O(sz*len) — container sizes
int test73(vector<int>& v, string& s) {
    int sz = (int)v.size();
    int len = (int)s.length();
    int c = 0;
    for (int i = 0; i < sz; i++)
        for (int j = 0; j < len; j++) c++;
    return c;
}

// ── O(n^2) block ─────────────────────────────

// test74: O(n^2)
int test74(int n) {
    int s = 0;
    for (int i = 0; i < n; i++)
        for (int j = 0; j < n; j++) s++;
    return s;
}

// test75: O(m^2)
int test75(int m) {
    int s = 0;
    for (int i = 0; i < m; i++)
        for (int j = 0; j < m; j++) s++;
    return s;
}

// test76: O(k^2)
int test76(int k) {
    int s = 0;
    for (int i = 0; i < k; i++)
        for (int j = 0; j < k; j++) s++;
    return s;
}

// test77: O(n^2) — calls helper13
int test77(int n) {
    return helper13(n);
}

// test78: O(n^2) — calls helper24
int test78(int n) {
    return helper24(n);
}

// test79: O(a^2) — alias a
int test79(int a) {
    int s = 0;
    for (int i = 0; i < a; i++)
        for (int j = 0; j < a; j++) s++;
    return s;
}

// test80: O(r^2) — param r
int test80(int r) {
    int s = 0;
    for (int i = 0; i < r; i++)
        for (int j = 0; j < r; j++) s++;
    return s;
}

// ── O(n^3) block ─────────────────────────────

// test81: O(n^3)
int test81(int n) {
    int s = 0;
    for (int i = 0; i < n; i++)
        for (int j = 0; j < n; j++)
            for (int k = 0; k < n; k++) s++;
    return s;
}

// test82: O(m^3) — param m
int test82(int m) {
    int s = 0;
    for (int i = 0; i < m; i++)
        for (int j = 0; j < m; j++)
            for (int k = 0; k < m; k++) s++;
    return s;
}

// test83: O(n^3) — calls helper14
int test83(int n) {
    return helper14(n);
}

// test84: O(a^3) — param a
int test84(int a) {
    int s = 0;
    for (int i = 0; i < a; i++)
        for (int j = 0; j < a; j++)
            for (int k = 0; k < a; k++) s++;
    return s;
}

// ── O(n*m*r) block ───────────────────────────

// test85: O(n*m*r) — three distinct params
int test85(int n, int m, int r) {
    int s = 0;
    for (int i = 0; i < n; i++)
        for (int j = 0; j < m; j++)
            for (int k = 0; k < r; k++) s++;
    return s;
}

// test86: O(n*m*r) — calls helper21
int test86(int n, int m, int r) {
    return helper21(n, m, r);
}

// test87: O(a*b*c) — three distinct params
int test87(int a, int b, int c) {
    int s = 0;
    for (int i = 0; i < a; i++)
        for (int j = 0; j < b; j++)
            for (int k = 0; k < c; k++) s++;
    return s;
}

// test88: O(k*r*t) — three distinct params
int test88(int k, int r, int t) {
    int s = 0;
    for (int i = 0; i < k; i++)
        for (int j = 0; j < r; j++)
            for (int l = 0; l < t; l++) s++;
    return s;
}

// ── O(n^2 * m) block ─────────────────────────

// test89: O(n^2*m) — two loops on n, one on m
int test89(int n, int m) {
    int s = 0;
    for (int i = 0; i < n; i++)
        for (int j = 0; j < n; j++)
            for (int k = 0; k < m; k++) s++;
    return s;
}

// test90: O(a^2*b) — params a,b
int test90(int a, int b) {
    int s = 0;
    for (int i = 0; i < a; i++)
        for (int j = 0; j < a; j++)
            for (int k = 0; k < b; k++) s++;
    return s;
}

// test91: O(n*m^2) — one loop on n, two on m
int test91(int n, int m) {
    int s = 0;
    for (int i = 0; i < n; i++)
        for (int j = 0; j < m; j++)
            for (int k = 0; k < m; k++) s++;
    return s;
}

// test92: O(a*b^2) — params a,b
int test92(int a, int b) {
    int s = 0;
    for (int i = 0; i < a; i++)
        for (int j = 0; j < b; j++)
            for (int k = 0; k < b; k++) s++;
    return s;
}

// test93: O(n^2*m*r) — four levels, two on n
int test93(int n, int m, int r) {
    int s = 0;
    for (int i = 0; i < n; i++)
        for (int j = 0; j < n; j++)
            for (int k = 0; k < m; k++)
                for (int l = 0; l < r; l++) s++;
    return s;
}

// test94: O(a^3*b^2) — five levels
int test94(int a, int b) {
    int s = 0;
    for (int i = 0; i < a; i++)
        for (int j = 0; j < a; j++)
            for (int k = 0; k < a; k++)
                for (int l = 0; l < b; l++)
                    for (int p = 0; p < b; p++) s++;
    return s;
}

// ── function composition — deep chains ────────

// test95: O(n) — calls helper9 which calls helper1
int test95(int n) {
    return helper9(n);
}

// test96: O(n) — calls helper17 -> helper16 -> helper15
int test96(int n) {
    return helper17(n);
}

// test97: O(n^2) — calls helper13
int test97(int n) {
    return helper13(n) + n;
}

// test98: O(n*m) — calls helper10 -> helper6
int test98(int n, int m) {
    return helper10(n, m);
}

// test99: O(m) — calls helper1 with m
int test99(int m) {
    return helper1(m);
}

// test100: O(k) — calls helper1 with k
int test100(int k) {
    return helper1(k);
}

// test101: O(r) — calls helper2 with r
int test101(int r) {
    return helper2(r);
}

// test102: O(sz) — calls helper7 with sz
int test102(int sz) {
    return helper7(sz);
}

// test103: O(log m) — calls helper3 with m
int test103(int m) {
    return helper3(m);
}

// test104: O(log k) — calls helper3 with k
int test104(int k) {
    return helper3(k);
}

// test105: O(a+b) — calls helper12
int test105(int a, int b) {
    return helper12(a, b);
}

// test106: O(n+m) — calls helper12(n,m)
int test106(int n, int m) {
    return helper12(n, m);
}

// test107: O(n*m) — calls helper6
int test107(int n, int m) {
    return helper6(n, m);
}

// test108: O(rows*cols) — calls helper20
int test108(int rows, int cols) {
    return helper20(rows, cols);
}

// test109: O(n*m*r) — calls helper21
int test109(int n, int m, int r) {
    return helper21(n, m, r);
}

// ── parameter substitution: same helper, different params ──

// test110: O(n) — helper18(n)
int test110(int n) {
    return helper18(n);
}

// test111: O(m) — helper18(m)
int test111(int m) {
    return helper18(m);
}

// test112: O(k) — helper18(k)
int test112(int k) {
    return helper18(k);
}

// test113: O(r) — helper18(r)
int test113(int r) {
    return helper18(r);
}

// test114: O(t) — helper18(t)
int test114(int t) {
    return helper18(t);
}

// test115: O(n) — helper7 called with n
int test115(int n) {
    return helper7(n);
}

// test116: O(m) — helper7 called with m
int test116(int m) {
    return helper7(m);
}

// ── container size propagation ────────────────

// test117: O(n) — v.size() passed to helper1
int test117(vector<int>& v) {
    return helper1((int)v.size());
}

// test118: O(n) — s.length() loop
int test118(string& s) {
    int c = 0;
    int n = (int)s.length();
    for (int i = 0; i < n; i++) c++;
    return c;
}

// test119: O(n) — deque size
int test119(deque<int>& d) {
    int n = (int)d.size();
    int c = 0;
    for (int i = 0; i < n; i++) c++;
    return c;
}

// test120: O(n) — set iteration
int test120(set<int>& st) {
    int c = 0;
    for (auto it = st.begin(); it != st.end(); ++it) c++;
    return c;
}

// test121: O(n) — map iteration
int test121(map<int,int>& mp) {
    int c = 0;
    for (auto& kv : mp) { (void)kv; c++; }
    return c;
}

// test122: O(n) — unordered_map iteration
int test122(unordered_map<int,int>& mp) {
    int c = 0;
    for (auto& kv : mp) { (void)kv; c++; }
    return c;
}

// test123: O(n) — priority_queue drain
int test123(priority_queue<int> pq) {
    int c = 0;
    while (!pq.empty()) { pq.pop(); c++; }
    return c;
}

// test124: O(n) — queue drain
int test124(queue<int> q) {
    int c = 0;
    while (!q.empty()) { q.pop(); c++; }
    return c;
}

// test125: O(n) — stack drain
int test125(stack<int> st) {
    int c = 0;
    while (!st.empty()) { st.pop(); c++; }
    return c;
}

// ── macro usage ───────────────────────────────

// test126: O(n) — fo macro
int test126(int n) {
    int s = 0;
    fo(i, n) s++;
    return s;
}

// test127: O(m) — fo macro
int test127(int m) {
    int s = 0;
    fo(i, m) s++;
    return s;
}

// test128: O(k) — fo macro
int test128(int k) {
    int s = 0;
    fo(i, k) s++;
    return s;
}

// test129: O(n) — rep macro
int test129(int n) {
    int s = 0;
    rep(i, 0, n) s++;
    return s;
}

// test130: O(m) — rep macro
int test130(int m) {
    int s = 0;
    rep(i, 0, m) s++;
    return s;
}

// test131: O(n*m) — fo nested macros
int test131(int n, int m) {
    int s = 0;
    fo(i, n) fo(j, m) s++;
    return s;
}

// test132: O(n^2) — fo nested, same param
int test132(int n) {
    int s = 0;
    fo(i, n) fo(j, n) s++;
    return s;
}

// test133: O(n) — fo + helper call
int test133(int n) {
    int s = 0;
    fo(i, n) s += helper5(i);
    return s;
}

// test134: O(n) — rep + helper5
int test134(int n) {
    int s = 0;
    rep(i, 0, n) s += helper5(i);
    return s;
}

// test135: O(n*m) — rep nested
int test135(int n, int m) {
    int s = 0;
    rep(i, 0, n) rep(j, 0, m) s++;
    return s;
}

// ── compound symbolic bounds ──────────────────

// test136: O(n+m) — fo macro with n+m not possible directly;
//   use regular loop with compound bound alias
int test136(int n, int m) {
    int total = n + m;
    int s = 0;
    for (int i = 0; i < total; i++) s++;
    return s;
    // bound = n+m
}

// Note: for compound bound, engine sees total = n+m then loop(total)
// test137: O(a+b)
int test137(int a, int b) {
    int bound = a + b;
    int s = 0;
    for (int i = 0; i < bound; i++) s++;
    return s;
}

// test138: O(a+b+c)
int test138(int a, int b, int c) {
    int total = a + b + c;
    int s = 0;
    for (int i = 0; i < total; i++) s++;
    return s;
}

// test139: O(n+m) — two loops no alias
int test139(int n, int m) {
    int s = 0;
    for (int i = 0; i < n; i++) s++;
    for (int j = 0; j < m; j++) s++;
    return s;
}

// test140: O(x+y+z) — three loops
int test140(int x, int y, int z) {
    int s = 0;
    for (int i = 0; i < x; i++) s++;
    for (int i = 0; i < y; i++) s++;
    for (int i = 0; i < z; i++) s++;
    return s;
}

// ── harmonic patterns ─────────────────────────

// test141: O(n*log(n)) — harmonic sum pattern
int test141(int n) {
    int s = 0;
    for (int i = 1; i <= n; i++)
        for (int j = i; j <= n; j += i) s++;
    return s;
}

// test142: O(n*log(n)) — divisor enumeration harmonic
int test142(int n) {
    int s = 0;
    for (int d = 1; d <= n; d++)
        for (int m = d; m <= n; m += d) s++;
    return s;
}

// ── DSU / path-compression patterns ──────────

// test143: O(α(n)) amortized — simple path-compression find
//   We approximate structural recognition as O(log n) per call
int dsu_parent143[1000];
int test143_find(int x) {
    while (dsu_parent143[x] != x)
        x = dsu_parent143[x] = dsu_parent143[dsu_parent143[x]];
    return x;
}
int test143(int n) {
    for (int i = 0; i < n; i++) dsu_parent143[i] = i;
    int c = 0;
    for (int i = 0; i < n; i++) c += test143_find(i);
    return c;
}

// ── binary search — structural variety ────────

// test144: O(log n) — upper_bound style
int test144(int n) {
    int lo = 0, hi = n;
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (mid < n / 2) lo = mid + 1;
        else hi = mid;
    }
    return lo;
}

// test145: O(log m) — binary search on m
int test145(int m) {
    int lo = 0, hi = m - 1;
    while (lo <= hi) {
        int mid = (lo + hi) / 2;
        if (mid * 2 < m) lo = mid + 1;
        else hi = mid - 1;
    }
    return lo;
}

// test146: O(log k) — binary search on k, named vars
int test146(int k) {
    int left = 0, right = k;
    while (left < right) {
        int pivot = left + (right - left) / 2;
        if (pivot < k / 3) left = pivot + 1;
        else right = pivot;
    }
    return left;
}

// test147: O(log n) — binary search, right = n-1, bit shift
int test147(int arr[], int n, int val) {
    int lo = 0, hi = n - 1;
    while (lo < hi) {
        int mid = lo + ((hi - lo) >> 1);
        if (arr[mid] >= val) hi = mid;
        else lo = mid + 1;
    }
    return lo;
}

// test148: O(log n) — exponential then binary
int test148(int n) {
    int step = 1;
    while (step < n) step *= 2;
    int lo = step / 2, hi = step;
    while (lo < hi) {
        int mid = (lo + hi) / 2;
        if (mid < n) lo = mid + 1;
        else hi = mid;
    }
    return lo;
}

// ── n log n — loop + log helper ───────────────

// test149: O(n*log(n)) — loop calling log helper
int test149(int n) {
    int s = 0;
    for (int i = 1; i <= n; i++)
        s += helper3(i);
    return s;
}

// test150: O(m*log(m)) — loop calling log helper on m
int test150(int m) {
    int s = 0;
    for (int i = 1; i <= m; i++)
        s += helper4(i);
    return s;
}

// ── O(n^2) + log ─────────────────────────────

// test151: O(n^2*log(n))
int test151(int n) {
    int s = 0;
    for (int i = 0; i < n; i++)
        for (int j = 0; j < n; j++)
            s += helper3(n);
    return s;
}

// test152: O(n*m*log(n))
int test152(int n, int m) {
    int s = 0;
    for (int i = 0; i < n; i++)
        for (int j = 0; j < m; j++)
            s += helper3(n);
    return s;
}

// ── alias shadowing ────────────────────────────

// test153: O(n) — outer alias, inner shadowed (inner used)
int test153(int n, int m) {
    int limit = n;
    {
        int limit = m;   // shadows outer
        int s = 0;
        for (int i = 0; i < limit; i++) s++;
        return s;
    }
}
// inner limit = m, so O(m)

// test154: O(n) — alias then re-alias
int test154(int n) {
    int a = n;
    int b = a;
    int c = b;
    int s = 0;
    for (int i = 0; i < c; i++) s++;
    return s;
}

// test155: O(sz) — container alias chain
int test155(vector<int>& v) {
    int sz = (int)v.size();
    int len = sz;
    int s = 0;
    for (int i = 0; i < len; i++) s++;
    return s;
}

// ── mixed: O(n) + O(log n) = O(n) dominant ───

// test156: O(n) — sequential: linear then log
int test156(int n) {
    int s = 0;
    for (int i = 0; i < n; i++) s++;
    for (int i = 1; i < n; i *= 2) s++;
    return s;
}

// test157: O(n^2) — sequential: n^2 then n
int test157(int n) {
    int s = 0;
    for (int i = 0; i < n; i++)
        for (int j = 0; j < n; j++) s++;
    for (int i = 0; i < n; i++) s++;
    return s;
}

// test158: O(n*m) — sequential: n*m then n then m
int test158(int n, int m) {
    int s = 0;
    for (int i = 0; i < n; i++)
        for (int j = 0; j < m; j++) s++;
    for (int i = 0; i < n; i++) s++;
    for (int j = 0; j < m; j++) s++;
    return s;
}

// ── deep composition chains ────────────────────

// test159: O(n) — test uses helper17->helper16->helper15, param n
int test159(int n) {
    return helper17(n) + 1;
}

// test160: O(m) — helper17 with m
int test160(int m) {
    return helper17(m);
}

// test161: O(k) — helper9(k) -> helper1(k)
int test161(int k) {
    return helper9(k);
}

// test162: O(r) — helper9(r) -> helper1(r)
int test162(int r) {
    return helper9(r);
}

// test163: O(n*m) — helper10(n,m) -> helper6(n,m) + helper5
int test163(int n, int m) {
    return helper10(n, m);
}

// test164: O(a*b) — helper6(a,b)
int test164(int a, int b) {
    return helper6(a, b);
}

// test165: O(n^2) — helper24(n) -> helper13(n)
int test165(int n) {
    return helper24(n);
}

// test166: O(n^3) — helper14(n)
int test166(int n) {
    return helper14(n);
}

// ── fo/rep macro + container sizes ────────────

// test167: O(n) — fo with v.size()
int test167(vector<int>& v) {
    int n = (int)v.size();
    int s = 0;
    fo(i, n) s++;
    return s;
}

// test168: O(n) — rep with s.length()
int test168(string& s) {
    int n = (int)s.length();
    int c = 0;
    rep(i, 0, n) c++;
    return c;
}

// test169: O(n*m) — fo nested with two sizes
int test169(vector<int>& v, vector<int>& u) {
    int n = (int)v.size();
    int m = (int)u.size();
    int s = 0;
    fo(i, n) fo(j, m) s++;
    return s;
}

// test170: O(n^2) — fo nested, same container size
int test170(vector<int>& v) {
    int n = (int)v.size();
    int s = 0;
    fo(i, n) fo(j, n) s++;
    return s;
}

// ── compound bounds + composition ─────────────

// test171: O(n+m) — helper12 with (n, v.size())
int test171(int n, vector<int>& v) {
    int m = (int)v.size();
    return helper12(n, m);
}

// test172: O(a+b) — loops with container alias
int test172(vector<int>& v, string& s) {
    int a = (int)v.size();
    int b = (int)s.size();
    int c = 0;
    for (int i = 0; i < a; i++) c++;
    for (int i = 0; i < b; i++) c++;
    return c;
}

// test173: O(n*m) — fo macro + rep, different bound vars
int test173(int n, int m) {
    int s = 0;
    fo(i, n) rep(j, 0, m) s++;
    return s;
}

// ── varied STL patterns ────────────────────────

// test174: O(n) — adjacent_find style (linear scan)
int test174(vector<int>& v) {
    int n = (int)v.size();
    int c = 0;
    for (int i = 0; i + 1 < n; i++) {
        if (v[i] == v[i+1]) c++;
    }
    return c;
}

// test175: O(n) — two-pointer scan
int test175(vector<int>& v) {
    int n = (int)v.size();
    int lo = 0, hi = n - 1;
    int c = 0;
    while (lo < hi) { lo++; hi--; c++; }
    return c;
}

// test176: O(n*m) — 2D vector
int test176(vector<vector<int>>& g) {
    int n = (int)g.size();
    int m = (int)g[0].size();
    int c = 0;
    for (int i = 0; i < n; i++)
        for (int j = 0; j < m; j++) { (void)g[i][j]; c++; }
    return c;
}

// test177: O(n^2) — 2D square grid
int test177(vector<vector<int>>& g) {
    int n = (int)g.size();
    int c = 0;
    for (int i = 0; i < n; i++)
        for (int j = 0; j < n; j++) c++;
    return c;
}

// ── log + alias variants ──────────────────────

// test178: O(log n) — alias then log loop
int test178(int n) {
    int sz = n;
    int c = 0;
    for (int i = 1; i < sz; i *= 2) c++;
    return c;
}

// test179: O(log m) — alias chain then log loop
int test179(int m) {
    int a = m;
    int b = a;
    int c = 0;
    for (int i = b; i > 0; i /= 2) c++;
    return c;
}

// test180: O(log k) — calls helper22 with k
int test180(int k) {
    return helper22(k);
}

// test181: O(log r) — calls helper11 with r
int test181(int r) {
    return helper11(r);
}

// ── miscellaneous structural forms ────────────

// test182: O(n) — loop, inner O(1) call to helper5
int test182(int n) {
    int s = 0;
    for (int i = 0; i < n; i++) s += helper5(i);
    return s;
}

// test183: O(n^2) — loop calls helper1 each iteration
int test183(int n) {
    int s = 0;
    for (int i = 0; i < n; i++) s += helper1(n);
    return s;
}

// test184: O(n*log(n)) — loop calls helper3 each iteration
int test184(int n) {
    int s = 0;
    for (int i = 0; i < n; i++) s += helper3(n);
    return s;
}

// test185: O(n*m) — outer n loop, inner calls helper2(m)
int test185(int n, int m) {
    int s = 0;
    for (int i = 0; i < n; i++) s += helper2(m);
    return s;
}

// test186: O(n*m^2) — outer n, inner calls helper13(m)
int test186(int n, int m) {
    int s = 0;
    for (int i = 0; i < n; i++) s += helper13(m);
    return s;
}

// test187: O(n*m*log(m)) — outer n, inner calls helper4(m) per i
int test187(int n, int m) {
    int s = 0;
    for (int i = 0; i < n; i++) s += helper4(m) * i;
    return s;
}

// test188: O(n^2*log(n)) — n^2 loop calls helper3(n)
int test188(int n) {
    int s = 0;
    for (int i = 0; i < n; i++)
        for (int j = 0; j < n; j++) s += helper3(n);
    return s;
}

// test189: O(a+b+c) — calls helper23
int test189(int a, int b, int c) {
    return helper23(a, b, c) + helper5(a);
}

// test190: O(a*b*c) — helper21 mapping a->n, b->m, c->r
int test190(int a, int b, int c) {
    return helper21(a, b, c);
}

// test191: O(n) — while loop, step += 1
int test191(int n) {
    int i = 0, s = 0;
    while (i < n) { s++; i += 1; }
    return s;
}

// test192: O(log n) — while loop, step *= 2
int test192(int n) {
    int i = 1, c = 0;
    while (i < n) { c++; i *= 2; }
    return c;
}

// test193: O(n) — do-while
int test193(int n) {
    int i = 0, s = 0;
    if (n <= 0) return 0;
    do { s++; i++; } while (i < n);
    return s;
}

// test194: O(n*m) — calls helper25(n, m, 0) — helper25 = helper6(n,m)+helper5(x) = O(n*m)+O(1) = O(n*m)
int test194(int n, int m) {
    return helper25(n, m, 0);
}

// test195: O(n) — map size alias then loop
int test195(map<int,int>& mp) {
    int n = (int)mp.size();
    int c = 0;
    for (int i = 0; i < n; i++) c++;
    return c;
}

// test196: O(n) — unordered_map size alias then loop
int test196(unordered_map<int,int>& mp) {
    int n = (int)mp.size();
    int c = 0;
    for (int i = 0; i < n; i++) c++;
    return c;
}

// test197: O(n+m) — two range-for over different containers
int test197(vector<int>& v, vector<int>& u) {
    int c = 0;
    for (int x : v) { (void)x; c++; }
    for (int x : u) { (void)x; c++; }
    return c;
    // |v|=n, |u|=m => O(n+m)
}

// test198: O(n*m) — range-for outer, index-for inner
int test198(vector<int>& v, int m) {
    int c = 0;
    for (int x : v) {
        (void)x;
        for (int j = 0; j < m; j++) c++;
    }
    return c;
    // |v|=n => O(n*m)
}

// test199: O(n^2) — range-for outer, range-for inner, same container
int test199(vector<int>& v) {
    int c = 0;
    for (int x : v) {
        (void)x;
        for (int y : v) { (void)y; c++; }
    }
    return c;
    // |v|=n => O(n^2)
}

// test200: O(n*m) — rep macro, two levels, then +helper3 call (n*m dominates n*log(n) when m>=log(n))
//   Kept as O(n*m) because m is independent
int test200(int n, int m) {
    int s = 0;
    rep(i, 0, n) rep(j, 0, m) s++;
    s += helper3(n);
    return s;
}
