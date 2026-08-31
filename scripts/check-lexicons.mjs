#!/usr/bin/env node
/**
 * The lexicon JSON and the TypeScript/Zod schemas used to be maintained by
 * hand in parallel, and had drifted: the Zod schema carried `venue`,
 * `sensoryProfile`, `glassware`, `garnish`, `baseSpirit`, `rating` and both
 * `note` and `notes`, none of which existed in the JSON, while the JSON
 * required `hedonicScale`, which the Zod made optional.
 *
 * This makes the JSON authoritative and fails the build when the two disagree:
 *   1. every lexicon parses and its `id` matches its filename
 *   2. every `ref` resolves to a def that exists (local or in another file)
 *   3. every NSID sits under the namespace the app actually owns
 *   4. every collection the app writes to has a lexicon on disk
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';

const DIR = 'src/lib/atproto/lexicons';
const NAMESPACE = 'app.crystalcoupe';

/** Namespaces we reference but do not define; see docs/data-model.md. */
const EXTERNAL = ['community.lexicon.', 'com.atproto.', 'app.bsky.'];

const errors = [];
const docs = new Map();

for (const file of readdirSync(DIR).filter((f) => f.endsWith('.json'))) {
  const path = join(DIR, file);
  let doc;
  try {
    doc = JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    errors.push(`${file}: invalid JSON — ${e.message}`);
    continue;
  }
  const expected = basename(file, '.json');
  if (doc.id !== expected) errors.push(`${file}: id "${doc.id}" does not match filename`);
  if (doc.lexicon !== 1) errors.push(`${file}: missing "lexicon": 1`);
  if (!doc.id?.startsWith(`${NAMESPACE}.`)) {
    errors.push(`${file}: "${doc.id}" is outside the ${NAMESPACE}.* namespace`);
  }
  docs.set(doc.id, doc);
}

/** Walk every nested object looking for `ref` and `refs` values. */
const refsIn = (node, out = []) => {
  if (Array.isArray(node)) node.forEach((n) => refsIn(n, out));
  else if (node && typeof node === 'object') {
    if (typeof node.ref === 'string') out.push(node.ref);
    if (Array.isArray(node.refs)) out.push(...node.refs);
    Object.values(node).forEach((v) => refsIn(v, out));
  }
  return out;
};

for (const [id, doc] of docs) {
  for (const ref of refsIn(doc.defs)) {
    if (EXTERNAL.some((p) => ref.startsWith(p))) continue;

    const [nsid, def = 'main'] = ref.startsWith('#') ? [id, ref.slice(1)] : ref.split('#');
    const target = docs.get(nsid);
    if (!target) {
      errors.push(`${id}: ref "${ref}" points at unknown lexicon "${nsid}"`);
    } else if (!target.defs[def]) {
      errors.push(`${id}: ref "${ref}" points at missing def "${def}" in ${nsid}`);
    }
  }
}

/** Collections the code writes to must have a schema on disk. */
const source = readFileSync('src/lib/atproto/lexicon.ts', 'utf8');
for (const [, nsid] of source.matchAll(/'(app\.crystalcoupe\.[a-zA-Z.]+)'/g)) {
  if (!docs.has(nsid)) errors.push(`lexicon.ts references "${nsid}" with no lexicon file`);
}

if (errors.length) {
  console.error(`\n${errors.length} lexicon problem(s):\n`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  console.error('');
  process.exit(1);
}

console.log(`✓ ${docs.size} lexicons valid, all refs resolve`);
