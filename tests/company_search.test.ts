import {
  DSE_COMPANY_NAMES,
  getCompanyName,
  searchByNameOrSymbol,
  searchCompanies,
} from '../lib/dseCompanyNames';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    failed++;
  } else {
    console.log(`✅ PASS: ${msg}`);
    passed++;
  }
}

console.log('=== TEST SUITE: DSE COMPANY NAME SEARCH ENGINE ===\n');

// 1. Dataset Integrity Checks
const totalEntries = Object.keys(DSE_COMPANY_NAMES).length;
assert(totalEntries >= 415 && totalEntries <= 430, `Total companies count is within expected range (got ${totalEntries})`);

const tbonds = Object.keys(DSE_COMPANY_NAMES).filter((k) => k.startsWith('TB'));
assert(tbonds.length === 0, `No Treasury Bonds in company directory (got ${tbonds.length})`);

// 2. Previously Missing Companies Checks
const missingKeys = [
  'SUMITPOWER',
  'SSSTEEL',
  'TECHNODRUG',
  'ATLASBANG',
  'AZIZPIPES',
  'STYLECRAFT',
  'SUNLIFEINS',
  'TRUSTBANK',
  'KAY&QUE',
];
for (const k of missingKeys) {
  assert(!!DSE_COMPANY_NAMES[k], `Missing company ${k} is now registered: "${DSE_COMPANY_NAMES[k]}"`);
}

// 3. getCompanyName Checks
assert(getCompanyName('GP') === 'Grameenphone Ltd.', 'getCompanyName("GP") returns "Grameenphone Ltd."');
assert(getCompanyName('gp') === 'Grameenphone Ltd.', 'getCompanyName handles lowercase');
assert(getCompanyName('SUMITPOWER') === 'Summit Power Limited', 'getCompanyName("SUMITPOWER") returns "Summit Power Limited"');
assert(getCompanyName('NON_EXISTENT') === null, 'getCompanyName for non-existent symbol returns null');

// 4. Exact Symbol Queries
const gpResults = searchByNameOrSymbol('GP');
assert(gpResults[0] === 'GP', `Exact symbol "GP" ranks #1 (got ${gpResults[0]})`);

const batbcResults = searchByNameOrSymbol('BATBC');
assert(batbcResults[0] === 'BATBC', `Exact symbol "BATBC" ranks #1 (got ${batbcResults[0]})`);

// 5. Company Name Queries
const gramResults = searchByNameOrSymbol('Grameenphone');
assert(gramResults.includes('GP') && gramResults[0] === 'GP', `Company name "Grameenphone" resolves to GP as top match`);

const sumResults = searchByNameOrSymbol('Summit Power');
assert(sumResults.includes('SUMITPOWER'), `Company name "Summit Power" matches SUMITPOWER`);

const squrResults = searchByNameOrSymbol('Square Pharma');
assert(squrResults[0] === 'SQURPHARMA', `Query "Square Pharma" resolves to SQURPHARMA as top match`);

// 6. Punctuation Insensitivity & Normalization
const ss1 = searchByNameOrSymbol('SS Steel');
const ss2 = searchByNameOrSymbol('S. S. Steel');
const ss3 = searchByNameOrSymbol('S.S. Steel');
assert(ss1.includes('SSSTEEL') && ss1[0] === 'SSSTEEL', 'Query "SS Steel" matches SSSTEEL');
assert(ss2.includes('SSSTEEL') && ss2[0] === 'SSSTEEL', 'Query "S. S. Steel" matches SSSTEEL');
assert(ss3.includes('SSSTEEL') && ss3[0] === 'SSSTEEL', 'Query "S.S. Steel" matches SSSTEEL');

const kq1 = searchByNameOrSymbol('Kay & Que');
const kq2 = searchByNameOrSymbol('Kay Que');
assert(kq1.includes('KAY&QUE'), 'Query "Kay & Que" matches KAY&QUE');
assert(kq2.includes('KAY&QUE'), 'Query "Kay Que" matches KAY&QUE');

// 7. Multi-Result Relevance Ordering
const squareAll = searchByNameOrSymbol('Square');
assert(
  squareAll.includes('SQURPHARMA') && squareAll.includes('SQUARETEXT'),
  'Query "Square" finds both SQURPHARMA and SQUARETEXT'
);

const beximcoAll = searchByNameOrSymbol('Beximco');
assert(
  beximcoAll.includes('BEXIMCO') && beximcoAll.includes('BXPHARMA'),
  'Query "Beximco" finds both BEXIMCO and BXPHARMA'
);

// 8. Edge Cases
assert(searchByNameOrSymbol('').length === 0, 'Empty string returns empty array');
assert(searchByNameOrSymbol('   ').length === 0, 'Whitespace string returns empty array');
assert(searchByNameOrSymbol('NONEXISTENT_XYZ_12345').length === 0, 'Gibberish returns empty array');
assert(searchByNameOrSymbol('!@#$%^&*()').length === 0, 'Special characters only returns empty array without throwing');

// 10. Acronyms & Banking Tickers
const dbbl = searchByNameOrSymbol('DBBL');
assert(dbbl.includes('DUTCHBANGL') && dbbl[0] === 'DUTCHBANGL', 'Retail alias "DBBL" matches DUTCHBANGL as top result');

const ebl = searchByNameOrSymbol('EBL');
assert(ebl.includes('EBL') && ebl[0] === 'EBL', 'Acronym "EBL" matches EBL as top result');

const fsib = searchByNameOrSymbol('FSIB');
assert(fsib.includes('FIRSTSBANK') && fsib[0] === 'FIRSTSBANK', 'Retail alias "FSIB" matches FIRSTSBANK (First Security Islami Bank)');

const pran = searchByNameOrSymbol('PRAN');
assert(pran.includes('AMCL(PRAN)') && pran[0] === 'AMCL(PRAN)', 'Retail alias "PRAN" matches AMCL(PRAN)');

// 11. Numbered Symbols & Mutual Funds
const num1 = searchByNameOrSymbol('1JANATAMF');
assert(num1[0] === '1JANATAMF', 'Numbered symbol "1JANATAMF" matches');

const numQuery = searchByNameOrSymbol('Janata Mutual');
assert(numQuery.includes('1JANATAMF'), 'Query "Janata Mutual" matches 1JANATAMF');

// 12. Case Insensitivity Rigor
const c1 = searchByNameOrSymbol('gp');
const c2 = searchByNameOrSymbol('GP');
const c3 = searchByNameOrSymbol('Gp');
assert(c1.length === c2.length && c2.length === c3.length, 'Search is perfectly case-invariant');
assert(c1[0] === 'GP' && c2[0] === 'GP' && c3[0] === 'GP', 'Top match for all case variants is GP');

// 13. Non-Latin / Unicode Resilience
const bengali = searchByNameOrSymbol('গ্রামীনফোন');
assert(Array.isArray(bengali), 'Non-Latin unicode characters do not crash the engine');

// 14. Performance Stress Test: 10,000 queries in tight loop
const perfStart = Date.now();
const sampleQueries = ['GP', 'Square', 'Summit', 'Bank', 'Beximco', 'Pharma', 'Steel', 'Cement', 'Insurance', 'Telecom'];
const iterations = 1000;
for (let i = 0; i < iterations; i++) {
  for (const q of sampleQueries) {
    searchByNameOrSymbol(q);
  }
}
const perfDuration = Date.now() - perfStart;
const totalQueries = iterations * sampleQueries.length;
const avgUs = (perfDuration * 1000) / totalQueries;
console.log(`\n⚡ Performance Benchmark: ${totalQueries} queries completed in ${perfDuration}ms (~${avgUs.toFixed(1)}µs per search)`);
assert(perfDuration < 10000, `Benchmark took < 10000ms (got ${perfDuration}ms)`);

console.log(`\n=== RESULTS: ${passed} PASSED, ${failed} FAILED ===\n`);
if (failed > 0) {
  process.exit(1);
}

