import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { searchHandles, type HandleSuggestion } from '@bbthorson/atproto-cf-auth/client';
import type { FollowedOverlap } from '@/lib/atproto/follows-overlap';
import { publicMapPath } from '@/lib/atproto/paths';
import { quadrantFor } from '@/lib/quadrant';
import { logPage } from '@/lib/copy';
import { titleOf, type Register } from '@/lib/register';
import { logTotals } from '@/lib/pour-history';
import { distanceRun } from '@/lib/track';
import { closestDrinks } from '@/lib/drink-search';
import { usePours } from '@/hooks/usePours';
import { useProfile } from '@/hooks/useProfile';
import { useRateSheet } from '@/hooks/useRateSheet';
import { useTrack } from '@/hooks/useTrack';

const COMPARE_DEBOUNCE_MS = 180;
const COMPARE_MIN_LENGTH = 2;
const COMPARE_LIMIT = 5;

/**
 * Everything Log knows and can do, so `LogScreen.tsx` only draws it: your
 * coordinate and region, your track, what your pours add up to, followed
 * friends on Cotidal, friend-handle comparison with live Bluesky typeahead,
 * and the rating sheet.
 */
export function useLog(register: Register, member: { did: string; handle: string | null } | null) {
  const isMember = !!member;
  const [profile, setProfile] = useProfile(isMember);
  const { pours, reload } = usePours(isMember);
  const rate = useRateSheet();
  const history = useMemo(() => pours ?? [], [pours]);

  const [follows, setFollows] = useState<FollowedOverlap[]>([]);
  useEffect(() => {
    if (!isMember) return;
    let cancelled = false;
    fetch('/api/follows-overlap')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { friends?: FollowedOverlap[] } | null) => {
        if (!cancelled && Array.isArray(data?.friends)) setFollows(data.friends);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isMember]);

  // Friend-comparison input with debounced, abortable Bluesky handle typeahead.
  const [compareQuery, setCompareQueryState] = useState('');
  const [compareSuggestions, setCompareSuggestions] = useState<HandleSuggestion[]>([]);
  const [compareActive, setCompareActive] = useState(-1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const abortRef = useRef<AbortController | undefined>(undefined);

  const cancelCompareSearch = useCallback(() => {
    clearTimeout(timerRef.current);
    abortRef.current?.abort();
    abortRef.current = undefined;
  }, []);

  useEffect(() => cancelCompareSearch, [cancelCompareSearch]);

  const setCompareQuery = useCallback(
    (next: string) => {
      setCompareQueryState(next);
      cancelCompareSearch();
      const term = next.normalize('NFKC').trim().replace(/^@/, '');
      if (term.length < COMPARE_MIN_LENGTH || term.startsWith('did:')) {
        setCompareSuggestions([]);
        setCompareActive(-1);
        return;
      }
      timerRef.current = setTimeout(() => {
        const ac = new AbortController();
        abortRef.current = ac;
        searchHandles(term, { limit: COMPARE_LIMIT, signal: ac.signal })
          .then((hits) => {
            if (ac.signal.aborted) return;
            setCompareSuggestions(hits.slice(0, COMPARE_LIMIT));
            setCompareActive(-1);
          })
          .catch(() => {
            if (!ac.signal.aborted) {
              setCompareSuggestions([]);
              setCompareActive(-1);
            }
          });
      }, COMPARE_DEBOUNCE_MS);
    },
    [cancelCompareSearch]
  );

  const closeCompareSuggestions = useCallback(() => {
    cancelCompareSearch();
    setCompareSuggestions([]);
    setCompareActive(-1);
  }, [cancelCompareSearch]);

  const moveCompareActive = useCallback((delta: number) => {
    setCompareActive((prev) => {
      const n = compareSuggestions.length;
      if (!n) return -1;
      const from = prev < 0 ? (delta > 0 ? -1 : n) : prev;
      return (((from + delta) % n) + n) % n;
    });
  }, [compareSuggestions.length]);

  const openFriend = useCallback(
    (handle: string) => {
      const cleaned = handle.trim().replace(/^@/, '');
      if (!cleaned) return;
      closeCompareSuggestions();
      window.location.assign(publicMapPath(cleaned));
    },
    [closeCompareSuggestions]
  );

  const submitCompare = useCallback(() => {
    const picked = compareSuggestions[compareActive];
    openFriend(picked ? picked.handle : compareQuery);
  }, [compareActive, compareQuery, compareSuggestions, openFriend]);

  const x = profile?.x ?? 0;
  const y = profile?.y ?? 0;

  const { track, fromQuiz } = useTrack(isMember, profile, pours);
  const name = (n: string) => titleOf(register, n);

  // The drink closest to you, for the account's "share" line.
  const nearest = useMemo(() => closestDrinks({ x, y }, 1)[0]?.name ?? '', [x, y]);

  const totals = logTotals(history);
  // No figures before the first pour: "Pours 0 · Bars 0" only repeated the
  // log's own empty line under it.
  const stats = totals.pours === 0 ? [] : [
    { label: logPage.stats.pours, value: String(totals.pours) },
    { label: logPage.stats.bars, value: String(totals.bars) },
    ...(track && track.length > 1 ? [{ label: logPage.stats.moved, value: String(distanceRun(track)) }] : []),
    ...(totals.first
      ? [
          {
            label: logPage.stats.since,
            value: new Date(totals.first.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
          },
        ]
      : []),
  ];

  const t = profile?.tolerances;
  const tolerances =
    t && t.eventCount >= 3
      ? [
          { label: logPage.tolerances.bitter, value: t.bitter.toFixed(1) },
          { label: logPage.tolerances.tannin, value: t.tannin.toFixed(1) },
          { label: logPage.tolerances.complexity, value: t.complexity.toFixed(1) },
        ]
      : null;

  return {
    isMember,
    profile,
    setProfile,
    pours,
    reload,
    history,
    follows,
    compare: {
      query: compareQuery,
      setQuery: setCompareQuery,
      suggestions: compareSuggestions,
      activeIndex: compareActive,
      setActive: setCompareActive,
      moveActive: moveCompareActive,
      closeSuggestions: closeCompareSuggestions,
      choose: (s: HandleSuggestion) => openFriend(s.handle),
      submit: submitCompare,
    },
    rate,
    name,
    /** A stranger with no coordinate: the page says what it is, and the ways in. */
    cold: !profile && !isMember,
    you: { x, y },
    region: quadrantFor(x, y),
    /** Your track when it adds up (`useTrack`), and what it starts from. */
    track,
    startLabel: fromQuiz ? logPage.started : logPage.startedCentre,
    nearestName: name(nearest),
    stats,
    tolerances,
  };
}
