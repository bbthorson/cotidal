import { describe, expect, it } from 'vitest';
import { waitingPick } from '@/lib/copy';
import { draftFromPick, entryFromPick, pickAge, REORDER_HEDONIC, STALE_PICK_HOURS } from '@/lib/pours/pick-age';

const NOW = Date.parse('2026-11-28T20:00:00.000Z');
const ago = (minutes: number) => new Date(NOW - minutes * 60 * 1000).toISOString();

describe('pickAge', () => {
  it('formats fresh picks in minutes and hours under 12 hours', () => {
    expect(pickAge(ago(0), NOW)).toEqual({ stale: false, label: waitingPick.justPicked });
    expect(pickAge(ago(1), NOW)).toEqual({ stale: false, label: waitingPick.justPicked });
    expect(pickAge(ago(40), NOW)).toEqual({ stale: false, label: waitingPick.pickedMinutes(40) });
    expect(pickAge(ago(60), NOW)).toEqual({ stale: false, label: waitingPick.pickedHours(1) });
    expect(pickAge(ago(180), NOW)).toEqual({ stale: false, label: waitingPick.pickedHours(3) });
    expect(pickAge(ago(STALE_PICK_HOURS * 60 - 1), NOW)?.stale).toBe(false);
  });

  it('marks picks at or beyond 12 hours as stale with past-tense age', () => {
    expect(pickAge(ago(STALE_PICK_HOURS * 60), NOW)).toEqual({ stale: true, label: waitingPick.lastNight });
    expect(pickAge(ago(20 * 60), NOW)).toEqual({ stale: true, label: waitingPick.lastNight });
    expect(pickAge(ago(48 * 60), NOW)).toEqual({ stale: true, label: waitingPick.pickedDays(2) });
  });

  it('returns null for missing or invalid timestamps', () => {
    expect(pickAge(undefined, NOW)).toBeNull();
    expect(pickAge('not-a-date', NOW)).toBeNull();
  });
});

describe('entryFromPick & draftFromPick', () => {
  it('carries bar and geo point for a bar pick', () => {
    const pick = {
      drink: 'Negroni',
      bar: 'Attaboy',
      at: { lat: 40.7224, lon: -73.9883 },
      pickedAt: ago(15),
    };
    const draft = draftFromPick(pick);
    expect(draft).toEqual({ drink: 'Negroni', bar: 'Attaboy', at: { lat: 40.7224, lon: -73.9883 } });
    expect(entryFromPick(pick, 7)).toMatchObject({
      drinkName: 'Negroni',
      hedonic: 7,
      isHomePour: false,
      venue: 'Attaboy',
    });
    expect(entryFromPick(pick, REORDER_HEDONIC, true)).toMatchObject({
      drinkName: 'Negroni',
      hedonic: REORDER_HEDONIC,
      wouldOrderAgain: true,
      isHomePour: false,
      venue: 'Attaboy',
    });
  });

  it('treats a pick without a bar as a home pour', () => {
    const pick = { drink: 'Daiquiri', pickedAt: ago(10) };
    expect(entryFromPick(pick, 8)).toMatchObject({
      drinkName: 'Daiquiri',
      hedonic: 8,
      isHomePour: true,
      venue: '',
    });
  });
});
