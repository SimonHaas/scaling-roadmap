// Every placement option must be something a person can actually CHOOSE.
// The guides' charts are descriptions read in sequence, so a row like
// "Just you." followed by "Still Just you." reads fine down a column but is
// two identical answers in a radio group. This catches that.
import { readFileSync } from 'node:fs';

// read the generated copy inside the project, not the sibling source folder:
// Vercel only uploads this directory, so anything outside it is absent at build time
const QS = JSON.parse(readFileSync('src/data/questions.json', 'utf8'));

const plain = (s) => String(s).replace(/<[^>]+>/g, '');
const key = (s) => plain(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// two options are too close if one is the other plus a filler word
const FILLER = /\b(still|just|only|basically|essentially|literally|yet|now)\b/g;
const core = (s) => key(s).replace(FILLER, ' ').replace(/\s+/g, ' ').trim();

const problems = [];

for (const q of QS) {
  if (!q.opts?.length) problems.push(`${q.id}: no options`);
  if (q.opts.length !== 10) problems.push(`${q.id}: ${q.opts.length} options, expected one per stage`);

  const stages = q.opts.map((o) => o.stage);
  if (new Set(stages).size !== stages.length) problems.push(`${q.id}: two options map to the same stage`);

  const byKey = new Map();
  const byCore = new Map();
  for (const o of q.opts) {
    const k = key(o.label);
    const c = core(o.label);
    if (!plain(o.label).trim()) problems.push(`${q.id}: empty option at stage ${o.stage}`);
    if (byKey.has(k)) problems.push(`${q.id}: stage ${o.stage} repeats stage ${byKey.get(k)} word for word: "${plain(o.label)}"`);
    else if (byCore.has(c)) problems.push(`${q.id}: stage ${o.stage} "${plain(o.label)}" is indistinguishable from stage ${byCore.get(c)}; the only difference is a filler word`);
    byKey.set(k, o.stage);
    byCore.set(c, o.stage);
  }
}

// no two QUESTIONS may be asking the same thing: if option sets overlap heavily
// on wording, one of them is redundant
for (let i = 0; i < QS.length; i++) {
  for (let j = i + 1; j < QS.length; j++) {
    const a = new Set(QS[i].opts.map((o) => core(o.label)));
    const shared = QS[j].opts.filter((o) => a.has(core(o.label))).length;
    if (shared >= 3) problems.push(`"${QS[i].id}" and "${QS[j].id}" share ${shared} identically worded options; one is redundant`);
  }
}

if (problems.length) {
  console.error('\nPlacement question problems:');
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}
console.log(`question check ok: ${QS.length} questions, ${QS.reduce((n, q) => n + q.opts.length, 0)} options, all distinguishable`);
