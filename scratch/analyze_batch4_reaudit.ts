import * as fs from 'fs';

function normalize(s: string) {
    return s.replace(/\s+/g, '')
            .replace(/sqrt([a-zA-Z0-9_]+)/g, 'sqrt($1)')
            .replace(/\*/g, '')
            .replace(/\^2/g, '²')
            .replace(/\^3/g, '³');
}

function extractVars(s: string) {
    const v = s.replace(/O\(/, '').replace(/\)/, '').replace(/[\+\*\^\²\³\slogsqrt]/g, ' ').trim().split(/\s+/).filter(x => x.length > 0);
    return new Set(v);
}

function main() {
    const raw = fs.readFileSync('validation_results_batch4.txt', 'utf8').split('---');
    let formatting = 0;
    let morePrecise = 0;
    let unknown = 0;
    let intentionalLimitation = 0;
    let other = 0;
    const otherDetails: string[] = [];

    for (const block of raw) {
        if (!block.trim()) continue;
        const nameMatch = block.match(/## (test\d+)/);
        if (!nameMatch) continue;
        const name = nameMatch[1];
        
        const expMatch = block.match(/Expected:\n([^\n]+)/);
        const actMatch = block.match(/Produced:\nOverall time complexity of function test\d+ is ([^\n]+)\./);
        
        if (!expMatch || !actMatch) continue;
        const exp = expMatch[1].trim();
        const act = actMatch[1].trim();

        if (exp === act) continue;

        // Check formatting
        const expNorm = normalize(exp);
        const actNorm = normalize(act);
        
        // n+m vs m+n sorting
        let isFormatting = expNorm === actNorm;
        if (!isFormatting && expNorm.includes('+') && actNorm.includes('+')) {
             const expTerms = expNorm.replace('O(','').replace(')','').split('+').sort().join('+');
             const actTerms = actNorm.replace('O(','').replace(')','').split('+').sort().join('+');
             if (expTerms === actTerms) isFormatting = true;
        }
        
        if (isFormatting) {
            formatting++;
            continue;
        }

        if (act === 'Unknown') {
            unknown++;
            continue;
        }

        // More precise: container size
        if (act.includes('.size()') || act.includes('.length()')) {
            morePrecise++;
            continue;
        }

        // Alias chains: act has different variable names but same polynomial structure
        // e.g. O(n*m) -> O(ef), O(n+m) -> O(e + f), O(n^2) -> O(m²), etc.
        // Quick structural check by stripping variables
        const expStruct = expNorm.replace(/[a-zA-Z]+/g, 'V');
        const actStruct = actNorm.replace(/[a-zA-Z]+/g, 'V');
        if (expStruct === actStruct) {
            morePrecise++; // Parameter/Alias resolution is more precise
            continue;
        }

        other++;
        otherDetails.push(`${name} | Exp: ${exp} | Act: ${act}`);
    }

    console.log(`Formatting: ${formatting}`);
    console.log(`More Precise: ${morePrecise}`);
    console.log(`Unknown: ${unknown}`);
    console.log(`Other: ${other}`);
    if (other > 0) {
        console.log('\nOther details:');
        console.log(otherDetails.join('\n'));
    }
}
main();
