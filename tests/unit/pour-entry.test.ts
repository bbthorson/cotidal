import { test, expect } from 'vitest';
import {
  barPointFor,
  entryFromFields,
  glmsWord,
  guestPourRecord,
  menuChange,
  toLogOptions,
  type PourEntry,
  type PourFields,
} from '../../src/lib/pour-entry';
import { catalogSlug, type Register } from '../../src/lib/register';
import { GLMS_ANCHORS } from '../../src/lib/atproto/vocab';
import { pour } from '../../src/lib/copy';

/**
 * What the pour form sends is what the drinker said: a field they did not
 * touch is absent, not a default. The form used to send "Bourbon" and
 * "Coupe" for every signed-in pour, and slider positions nobody moved.
 */

const entry: PourEntry = {
  drinkName: 'Negroni',
  hedonic: 8,
  isHomePour: true,
  venue: '',
  deviations: [],
  note: '',
  crosspost: false,
};

test('Pour entry: nothing chosen, nothing sent', () => {
  const options = toLogOptions(entry);
  for (const key of ['baseSpirit', 'glassware', 'garnish', 'perceivedIntensities', 'wouldOrderAgain'] as const) {
    expect(options[key], key).toBeUndefined();
  }
});

test('Pour entry: what was chosen is sent as stored', () => {
  const options = toLogOptions({
    ...entry,
    detail: { baseSpirit: 'gin', glassware: 'rocks', intensities: { bitterness: 35 } },
  });
  expect(options).toMatchObject({ baseSpirit: 'gin', glassware: 'rocks', perceivedIntensities: { bitterness: 35 } });
});

test('gLMS: a position reads as the anchor at or below it', () => {
  expect(glmsWord(0)).toBe(pour.glmsNone);
  for (const a of GLMS_ANCHORS) expect(glmsWord(a.at)).toBe(pour.glms[a.id]);
  expect(glmsWord(20)).toBe(pour.glms.moderate);
  expect(glmsWord(99)).toBe(pour.glms['very-strong']);
});

test('Catalog slug: the /drinks entry, or nothing', () => {
  const register: Register = {
    'Daiquiri (Classic)': { slug: 'daiquiri', title: 'Daiquiri', build: '' },
    'Naked & Famous': { slug: 'naked-and-famous', title: 'Naked & Famous', build: '' },
  };
  expect(catalogSlug(register, 'daiquiri (classic)')).toBe('daiquiri');
  expect(catalogSlug(register, ' Naked & Famous ')).toBe('naked-and-famous');
  // Not slugified from the name: that would point at a page that does not exist.
  expect(catalogSlug(register, 'House Sour')).toBeUndefined();
});

const fields: PourFields = {
  drinkName: '  Negroni ',
  isHomePour: false,
  venue: ' Attaboy ',
  hedonic: 8,
  deviations: [],
  cata: [],
  note: '  ',
  crosspost: true,
  baseSpirit: '',
  glassware: '',
  garnish: ' ',
  intensities: {},
};

test('Pour fields: what is missing is said, in the order the form asks', () => {
  expect(entryFromFields({ ...fields, drinkName: ' ' }, true)).toEqual({ error: pour.needDrink, field: 'drink' });
  expect(entryFromFields({ ...fields, venue: '' }, true)).toEqual({ error: pour.needBar, field: 'where' });
  expect(entryFromFields({ ...fields, venue: '', isHomePour: true }, true)).not.toHaveProperty('error');
  expect(entryFromFields({ ...fields, hedonic: null }, true)).toEqual({ error: pour.needRating, field: 'rating' });
});

test('Pour fields: trimmed, and an untouched field is absent', () => {
  const result = entryFromFields(fields, true);
  expect(result).toEqual({
    entry: {
      drinkName: 'Negroni',
      hedonic: 8,
      isHomePour: false,
      venue: 'Attaboy',
      deviations: [],
      cata: undefined,
      note: '',
      crosspost: true,
      detail: undefined,
    },
  });
});

test('Pour fields: a guest sends no cross-post and no detail', () => {
  const result = entryFromFields({ ...fields, baseSpirit: 'gin', intensities: { bitterness: 40 } }, false);
  expect(result).toMatchObject({ entry: { crosspost: false, detail: undefined } });
  const member = entryFromFields({ ...fields, baseSpirit: 'gin', garnish: ' twist ' }, true);
  expect(member).toMatchObject({ entry: { detail: { baseSpirit: 'gin', garnish: 'twist' } } });
});

test('Bar point: only while the pour is at the bar the draft named', () => {
  const at = { lat: 40.7, lon: -74 };
  const draft = { drink: 'Negroni', bar: 'Attaboy', at };
  expect(barPointFor({ ...entry, isHomePour: false, venue: 'Attaboy' }, draft)).toEqual(at);
  expect(barPointFor({ ...entry, isHomePour: false, venue: 'Dante' }, draft)).toBeNull();
  expect(barPointFor({ ...entry, isHomePour: true, venue: 'Attaboy' }, draft)).toBeNull();
  expect(barPointFor({ ...entry, isHomePour: false, venue: 'Attaboy' }, undefined)).toBeNull();
});

test('Guest pour: the record a member would write, with nothing unset filled in', () => {
  const record = guestPourRecord(
    { ...entry, isHomePour: false, venue: 'Attaboy', deviations: ['too-sweet'] },
    { slug: 'negroni', at: { lat: 40.7, lon: -74 }, createdAt: '2026-11-24T00:00:00.000Z' }
  );
  expect(record).toMatchObject({
    $type: 'app.cotidal.pour',
    drink: { name: 'Negroni', slug: 'negroni' },
    venue: { entity: { name: 'Attaboy' }, address: { $type: 'community.lexicon.location.geo' } },
    rating: { hedonic: 8 },
    deviations: ['too-sweet'],
    isHomePour: false,
    createdAt: '2026-11-24T00:00:00.000Z',
  });
  expect(record.cata).toBeUndefined();
  expect(record.note).toBeUndefined();
  const home = guestPourRecord(entry, { slug: undefined, at: null, createdAt: '2026-11-24T00:00:00.000Z' });
  expect(home.venue).toBeUndefined();
});

test('Menu change: the rated drink’s rank now, and a drink that joined', () => {
  expect(menuChange(['A', 'B', 'C'], ['B', 'a', 'D'], 'A')).toEqual({ rank: 2, newcomer: 'D' });
  expect(menuChange(['A', 'B'], ['A', 'B'], 'Z')).toEqual({ rank: null, newcomer: null });
});
