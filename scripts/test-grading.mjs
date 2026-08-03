// Proves the deterministic gate on its own, with no model in the loop.
// Run: node scripts/test-grading.mjs
import { readFileSync } from 'node:fs';

// tiny inline copy of the rules under test, kept in step with src/lib/grade.ts
const src = readFileSync('src/lib/grade.ts', 'utf8');
const INTENT = new RegExp(
  src.match(/const INTENT =\s*\n?\s*\/(.+)\/i;/s)[1], 'i');
const hasSpecifics = (t) => /\d/.test(t) || /[$%]/.test(t) || /[a-z,]\s+[A-Z][a-zA-Z]{2,}/.test(t);
const isHandWave = (t) => INTENT.test(t) && !hasSpecifics(t);

const cases = [
  // [text, expectHandWave, why]
  ['yeah I am planning to get around to doing this soon', true, 'pure intent, nothing concrete'],
  ['I will set up the spreadsheet next week', true, 'future tense, no specifics'],
  ['not yet, need to do it', true, 'admits it is not done'],
  ['I should probably sort this out eventually', true, 'intent only'],
  ['Tracking contact rate 62%, scheduled 41, show 28, offer 22, close 9, cash collected $18,400. Mele updates it Mondays.',
    false, 'numbers everywhere'],
  ['Wrote the handbook in Google Docs and every person signed it on 14 July.', false, 'tool, date'],
  ['I will keep updating the sheet, last week was 41 shows and 9 closes', false, 'intent but real numbers'],
  ['Hired Kekoa part time to run the setter calls', false, 'proper noun, past tense'],
  ['we have to keep doing this but Kono Cafe and Lanikai Juice are both onboarded now', false, 'intent phrase plus real names'],
  ['Fixed it. Grinder was drifting so I re-dial every machine at 6am until the new burrs land.', false, 'concrete, no intent phrase'],
];

let fail = 0;
for (const [text, expected, why] of cases) {
  const got = isHandWave(text);
  const ok = got === expected;
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  handWave=${String(got).padEnd(5)} expected=${String(expected).padEnd(5)} ${why}`);
  if (!ok) console.log(`      text: ${text}`);
}
console.log(`\n${cases.length - fail}/${cases.length} passed`);
process.exit(fail ? 1 : 0);
