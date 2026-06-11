import { initParser, parseOneOff } from '../src/parser/treeSitter';
import { analyzeFunctions } from '../src/engine/inference';
import { resolve } from 'path';

const kmpCode = `
void computeLPS(string pattern, int m, int* lps) {
    int len = 0;
    lps[0] = 0;
    int i = 1;
    while (i < m) {
        if (pattern[i] == pattern[len]) {
            len++;
            lps[i] = len;
            i++;
        }
        else {
            if (len != 0) {
                len = lps[len - 1];
            }
            else {
                lps[i] = 0;
                i++;
            }
        }
    }
}

void KMPSearch(string pat, string txt) {
    int m = pat.length();
    int n = txt.length();
    int lps[m];
    computeLPS(pat, m, lps);

    int i = 0;
    int j = 0;
    while (i < n) {
        if (pat[j] == txt[i]) {
            j++;
            i++;
        }
        if (j == m) {
            j = lps[j - 1];
        }
        else if (i < n && pat[j] != txt[i]) {
            if (j != 0)
                j = lps[j - 1];
            else
                i = i + 1;
        }
    }
}
`;

async function main() {
  await initParser(resolve('./dist'));

  const tree = parseOneOff(kmpCode)!;
  const result = analyzeFunctions(tree);
  for (const fn of result.functions) {
      console.log('Function: ' + fn.name + ' -> ' + fn.complexity);
      console.log('  Confidence: ' + fn.confidence);
      console.log('  Explanation: ', fn.explanation);
  }
}
main().catch(console.error);
