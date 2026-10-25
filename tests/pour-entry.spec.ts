import { test, expect } from '@playwright/test';
import { glmsWord, toLogOptions, type PourEntry } from '../src/components/app/PourForm';
import { catalogSlug, type Register } from '../src/lib/register';
import { GLMS_ANCHORS } from '../src/lib/atproto/vocab';
import { pour } from '../src/lib/copy';

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
