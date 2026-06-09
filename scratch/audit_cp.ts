import { initParser, parseOneOff } from '../src/parser/treeSitter';
import { analyzeFunctions } from '../src/engine/inference';
import * as path from 'path';

const distDir = path.join(__dirname, '../dist');

async function testCP() {
  await initParser(distDir);

  const code = `
void factorize(int n) {
    for (int i = 2; i * i <= n; i++) {
        while (n % i == 0) n /= i;
    }
}

int sum_of_factor(int n) {
    int sum = 0;
    for (int i = 1; i * i <= n; i++) {
        if (n % i == 0) {
            sum += i;
            if (i * i != n) sum += n / i;
        }
    }
    return sum;
}

void build_spf(int n) {
    for (int i = 2; i <= n; i++) spf[i] = i;
    for (int i = 2; i * i <= n; i++) {
        if (spf[i] == i) {
            for (int j = i * i; j <= n; j += i) {
                if (spf[j] == j) spf[j] = i;
            }
        }
    }
}

int biggest_prime_divisor(int n) {
    int ans = 1;
    while (n > 1) {
        ans = max(ans, spf[n]);
        n /= spf[n];
    }
    return ans;
}

void sieve(int n) {
    for (int i = 2; i * i <= n; i++) {
        if (is_prime[i]) {
            for (int j = i * i; j <= n; j += i) {
                is_prime[j] = false;
            }
        }
    }
}
  `;

  const tree = parseOneOff(code)!;
  const res = analyzeFunctions(tree);
  for (const fn of res.functions) {
    console.log(fn.name, '->', fn.complexity);
  }
}

testCP().catch(console.error);
