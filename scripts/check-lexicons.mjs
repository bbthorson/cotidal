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
 *   5. no lexicon uses `number`, which is not a Lexicon type: the AT Protocol
 *      data model has no floats
 *   6. every record lexicon has a Zod schema in `RECORD_SCHEMAS`, and the two
 *      agree field by field: names, required, types, integer bounds, array
 *      lengths, string limits and formats, and closed sets against
 *      `knownValues`
 *   7. every vocabulary the app writes (vocab.ts: `DEVIATIONS`, `CATA`,
 *      `GLASSWARE`, `BASE_SPIRITS`, `VIBE_TAGS`) is the `knownValues` of each
 *      field that declares it
 *   8. every file loads in `@atproto/lexicon`, the protocol's reference
 *      parser, so a schema it would refuse never reaches a repository
 *
 * Checks 1–5 once said "the two disagree" and compared nothing between them;
 * a pour lexicon with float fields and a route writing unchecked request
 * bodies both passed. Check 6 is the comparison.
 *
 * It imports records.ts directly, which needs Node's built-in TypeScript type
 * stripping (on by default from Node 22.18; .nvmrc pins 22.22).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';

const DIR = 'src/lib/atproto/lexicons';
const NAMESPACE = 'app.cotidal';

/** Namespaces we reference but do not define; see docs/data-model.md. */
const EXTERNAL = ['community.lexicon.', 'com.atproto.', 'app.bsky.', 'site.standard.'];

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

/** Collections the code names (vocab.ts, records.ts) must have a schema on disk. */
const source = ['records.ts', 'vocab.ts'].map((f) => readFileSync(`src/lib/atproto/${f}`, 'utf8')).join('\n');
for (const [, nsid] of source.matchAll(/'(app\.cotidal\.[a-zA-Z.]+)'/g)) {
  if (!docs.has(nsid)) errors.push(`records.ts references "${nsid}" with no lexicon file`);
}

/** 5. `number` is not a Lexicon type. */
const numbersIn = (node, path, out = []) => {
  if (Array.isArray(node)) node.forEach((n, i) => numbersIn(n, `${path}[${i}]`, out));
  else if (node && typeof node === 'object') {
    if (node.type === 'number') out.push(path);
    for (const [k, v] of Object.entries(node)) numbersIn(v, `${path}.${k}`, out);
  }
  return out;
};
for (const [id, doc] of docs) {
  for (const path of numbersIn(doc.defs, id)) {
    errors.push(`${path}: "number" is not a Lexicon type — store an integer named for its unit (e.g. xHundredths)`);
  }
}

/** 6. Each record's Zod schema against its lexicon. */
const { RECORD_SCHEMAS, STRING_LIMITS, isLexInteger } = await import('../src/lib/atproto/records.ts');
const VOCAB = await import('../src/lib/atproto/vocab.ts');

/*
 * Zod 4 keeps a schema's definition at `_zod.def`: `type` names the kind
 * ('object', 'string', 'optional', ...) and `checks` lists what chained
 * methods added, each with its own `_zod.def` (`check: 'greater_than'`,
 * `value`, `inclusive`, ...). A refinement is one of those checks, not a
 * wrapper around the schema as Zod 3's ZodEffects was, so nothing needs
 * peeling but `.optional()`.
 */
const defOf = (schema) => schema?._zod?.def;
const kind = (schema) => defOf(schema)?.type;

/** Peel the wrappers that do not change a field's shape; report whether it was optional. */
function unwrap(schema) {
  let optional = false;
  while (kind(schema) === 'optional') {
    optional = true;
    schema = defOf(schema).innerType;
  }
  return { schema, optional };
}

const checksOf = (schema) => defOf(schema).checks ?? [];
const check = (schema, name) => checksOf(schema).find((c) => c._zod.def.check === name)?._zod.def;

function resolve(ref, fromId) {
  const [nsid, def = 'main'] = ref.startsWith('#') ? [fromId, ref.slice(1)] : ref.split('#');
  return docs.get(nsid) ? { def: docs.get(nsid).defs[def], id: nsid } : null;
}

const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const sorted = (a) => [...a].sort();

function compare(lex, zod, path, fromId) {
  const fail = (msg) => errors.push(`${path}: ${msg}`);
  const { schema } = unwrap(zod);
  const k = kind(schema);

  switch (lex.type) {
    case 'ref': {
      if (lex.ref.split('#')[0] && EXTERNAL.some((p) => lex.ref.startsWith(p))) return;
      const target = resolve(lex.ref, fromId);
      if (!target?.def) return; // reported by the ref check above
      return compare(target.def, schema, path, target.id);
    }
    case 'object': {
      if (!lex.properties) {
        // A property-less object is an open dictionary.
        if (k !== 'record') fail(`lexicon has an open object, Zod has ${k}`);
        return;
      }
      if (k !== 'object') return fail(`lexicon has an object, Zod has ${k}`);
      const shape = schema.shape;
      const lexKeys = Object.keys(lex.properties);
      const zodKeys = Object.keys(shape).filter((key) => key !== '$type');
      for (const key of lexKeys) if (!(key in shape)) fail(`"${key}" is in the lexicon but not in Zod`);
      for (const key of zodKeys) if (!lexKeys.includes(key)) fail(`"${key}" is in Zod but not in the lexicon`);
      const required = lex.required ?? [];
      for (const key of lexKeys.filter((key) => key in shape)) {
        const optional = unwrap(shape[key]).optional;
        if (required.includes(key) && optional) fail(`"${key}" is required by the lexicon, optional in Zod`);
        if (!required.includes(key) && !optional) fail(`"${key}" is optional in the lexicon, required in Zod`);
        compare(lex.properties[key], shape[key], `${path}.${key}`, fromId);
      }
      return;
    }
    case 'integer': {
      // `lexInteger()`, not `.int()`: the lexicon's integers are not capped at 2^53.
      if (k !== 'number' || !checksOf(schema).some((c) => c._zod.check === isLexInteger)) {
        return fail(`lexicon has an integer, Zod has ${k} not built with lexInteger()`);
      }
      const min = check(schema, 'greater_than');
      const max = check(schema, 'less_than');
      if (min && !min.inclusive) fail(`minimum: the lexicon's is inclusive, Zod's .gt() is not`);
      if (max && !max.inclusive) fail(`maximum: the lexicon's is inclusive, Zod's .lt() is not`);
      if (!same(lex.minimum, min?.value)) fail(`minimum: lexicon ${lex.minimum}, Zod ${min?.value}`);
      if (!same(lex.maximum, max?.value)) fail(`maximum: lexicon ${lex.maximum}, Zod ${max?.value}`);
      return;
    }
    case 'boolean':
      if (k !== 'boolean') fail(`lexicon has a boolean, Zod has ${k}`);
      return;
    case 'string': {
      if (k === 'enum') {
        // A closed set in Zod must be exactly the lexicon's known values.
        const values = Object.values(defOf(schema).entries);
        if (!same(sorted(values), sorted(lex.knownValues ?? lex.enum ?? []))) {
          fail(`Zod enum ${JSON.stringify(values)} is not the lexicon's knownValues`);
        }
        return;
      }
      const limits = STRING_LIMITS.get(schema);
      if (!limits) return fail(`lexicon has a string, Zod has ${k} not built with lexString()`);
      for (const key of ['minLength', 'maxLength', 'maxGraphemes', 'format']) {
        if (!same(lex[key], limits[key])) fail(`${key}: lexicon ${lex[key]}, Zod ${limits[key]}`);
      }
      return;
    }
    case 'array': {
      if (k !== 'array') return fail(`lexicon has an array, Zod has ${k}`);
      const exact = check(schema, 'length_equals')?.length;
      const min = exact ?? check(schema, 'min_length')?.minimum;
      const max = exact ?? check(schema, 'max_length')?.maximum;
      if (!same(lex.minLength, min)) fail(`minLength: lexicon ${lex.minLength}, Zod ${min}`);
      if (!same(lex.maxLength, max)) fail(`maxLength: lexicon ${lex.maxLength}, Zod ${max}`);
      return compare(lex.items, defOf(schema).element, `${path}[]`, fromId);
    }
    case 'union':
      // Borrowed vocabularies (community.lexicon.location.*): carried as-is, tagged by $type.
      if (k !== 'object' || !('$type' in schema.shape)) fail(`lexicon has a union, Zod has ${k} without $type`);
      return;
    case 'blob':
    case 'unknown':
      return;
    default:
      return fail(`no comparison for lexicon type "${lex.type}"`);
  }
}

for (const [id, doc] of docs) {
  if (doc.defs.main?.type !== 'record') continue;
  const zod = RECORD_SCHEMAS[id];
  if (!zod) {
    errors.push(`${id}: a record lexicon with no Zod schema in RECORD_SCHEMAS (records.ts)`);
    continue;
  }
  const typeField = zod.shape?.$type;
  if (kind(typeField) !== 'literal' || !same(defOf(typeField).values, [id])) {
    errors.push(`${id}: Zod $type is not the literal "${id}"`);
  }
  compare(doc.defs.main.record, zod, id, id);
}
for (const id of Object.keys(RECORD_SCHEMAS)) {
  if (docs.get(id)?.defs.main?.type !== 'record') errors.push(`RECORD_SCHEMAS has "${id}", which is not a record lexicon`);
}

/**
 * 8. The reference parser accepts every file. `parseLexiconDoc`, not
 * `new Lexicons()`: the constructor loads anything, `"type": "foo"` included.
 */
const { parseLexiconDoc } = await import('@atproto/lexicon');
for (const [id, doc] of docs) {
  try {
    parseLexiconDoc(doc);
  } catch (e) {
    const issues = Array.isArray(e.issues) ? e.issues : [];
    const where = issues.map((i) => i.path?.join('.')).filter(Boolean).join(', ');
    errors.push(`${id}: @atproto/lexicon refuses it${where ? ` at ${where}` : ''}`);
  }
}

/** 7. The vocabularies written are the ones declared, wherever they are declared. */
const VOCABULARIES = [
  ['app.cotidal.pour', ['defs', 'main', 'record', 'properties', 'deviations', 'items'], 'DEVIATIONS'],
  ['app.cotidal.pour', ['defs', 'main', 'record', 'properties', 'cata', 'items'], 'CATA'],
  ['app.cotidal.pour', ['defs', 'main', 'record', 'properties', 'glassware'], 'GLASSWARE'],
  ['app.cotidal.recipe', ['defs', 'main', 'record', 'properties', 'glassware'], 'GLASSWARE'],
  ['app.cotidal.defs', ['defs', 'drinkRef', 'properties', 'baseSpirit'], 'BASE_SPIRITS'],
  ['app.cotidal.palate', ['defs', 'vibeTagWeight', 'properties', 'tag'], 'VIBE_TAGS'],
];
for (const [id, path, name] of VOCABULARIES) {
  const field = path.reduce((node, key) => node?.[key], docs.get(id));
  if (!field) errors.push(`${id}: no field at ${path.join('.')} for ${name}`);
  else if (!same(sorted(field.knownValues ?? []), sorted(VOCAB[name]))) {
    errors.push(`${id} ${path.slice(-2).join('.')}: knownValues are not ${name} in vocab.ts`);
  }
}

if (errors.length) {
  console.error(`\n${errors.length} lexicon problem(s):\n`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  console.error('');
  process.exit(1);
}

console.log(`✓ ${docs.size} lexicons valid, all refs resolve`);
