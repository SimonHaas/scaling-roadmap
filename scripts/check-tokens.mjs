// Fails the build if any var(--x) used anywhere is not defined in globals.css.
// A dead custom property does not error, it silently renders the wrong colour,
// which is exactly how the rejection panel shipped violet instead of amber.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const css = readFileSync('src/app/globals.css', 'utf8');
const defined = new Set([...css.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
defined.add('--font-poppins'); // injected by next/font at runtime

const files = [];
(function walk(d) {
  for (const e of readdirSync(d)) {
    const p = join(d, e);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx|ts|css)$/.test(e)) files.push(p);
  }
})('src');

const dead = [];
for (const f of files) {
  const t = readFileSync(f, 'utf8');
  for (const m of t.matchAll(/var\((--[a-z0-9-]+)\)/g)) {
    if (!defined.has(m[1])) dead.push(`${f}: ${m[1]}`);
  }
}

if (dead.length) {
  console.error('\nUndefined CSS variables (these render as nothing):');
  for (const d of [...new Set(dead)]) console.error('  ' + d);
  process.exit(1);
}
console.log(`token check ok: ${defined.size} defined, none missing across ${files.length} files`);
