'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAtprotoContext, AtprotoProvider } from './AtprotoProvider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { MapBackground } from './MapBackground';
import { UserPin } from './UserPin';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Compass,
  MapPin,
  Home,
  Star,
  Plus,
  Loader2,
  Sparkles,
  MessageSquare,
  ArrowRight,
  Share2,
  History,
} from 'lucide-react';
import { drinkDatabase, type User } from '@/lib/data';
import { quadrantFor } from '@/lib/quadrant';
import { DEVIATIONS, type PourRecord } from '@/lib/atproto/records';
import {
  logDrinkFeedback,
  getConnectedPours,
  getConnectedPalate,
} from '@/lib/api-client';
import { toPct } from '@/lib/scoring';
import { returnVisit } from '@/lib/copy';
import type { UserProfile } from '@/hooks/useDiscoveryQuiz';

const DEVIATION_LABELS: Record<(typeof DEVIATIONS)[number], string> = {
  'too-sweet': 'Too sweet',
  'not-sweet-enough': 'Needs more sweet',
  'too-sour': 'Too sour',
  'not-sour-enough': 'Needs more sour',
  'too-bitter': 'Too bitter',
  'too-smoky': 'Too smoky',
  'too-anise': 'Too anise / licorice',
  'too-rich': 'Too rich / heavy',
  'too-crisp': 'Too crisp / dry',
  'too-flat': 'Too flat',
  'too-fizzy': 'Too fizzy',
};

const HEDONIC_DESCRIPTIONS: Record<number, { label: string; badgeClass: string }> = {
  9: { label: 'Like extremely (Masterpiece)', badgeClass: 'text-primary border-primary/40 bg-primary/10' },
  8: { label: 'Like very much (Outstanding)', badgeClass: 'text-secondary border-secondary/40 bg-secondary/10' },
  7: { label: 'Like moderately (Very Good)', badgeClass: 'text-secondary/80 border-secondary/30 bg-secondary/5' },
  6: { label: 'Like slightly (Good)', badgeClass: 'text-foreground/80 border-border bg-card' },
  5: { label: 'Neutral (Average)', badgeClass: 'text-muted-foreground border-border bg-muted/20' },
  4: { label: 'Dislike slightly (Subpar)', badgeClass: 'text-destructive/80 border-destructive/30 bg-destructive/5' },
  3: { label: 'Dislike moderately (Flawed)', badgeClass: 'text-destructive border-destructive/40 bg-destructive/10' },
  2: { label: 'Dislike very much (Poor)', badgeClass: 'text-destructive border-destructive/50 bg-destructive/15' },
  1: { label: 'Dislike extremely (Undrinkable)', badgeClass: 'text-destructive border-destructive/60 bg-destructive/20' },
};

function slugifyDrink(name: string): string {
  return name
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function getInitialLocalProfile(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem('user_profile');
    return saved ? (JSON.parse(saved) as UserProfile) : null;
  } catch {
    return null;
  }
}

function ReturnVisitContent() {
  const { isConnected } = useAtprotoContext();

  const [profile, setProfile] = useState<UserProfile | null>(getInitialLocalProfile);
  const [pours, setPours] = useState<PourRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previousCoord, setPreviousCoord] = useState<{ x: number; y: number } | null>(null);

  // Form State
  const [drinkSearch, setDrinkSearch] = useState('');
  const [selectedDrink, setSelectedDrink] = useState(drinkDatabase[0]?.name || '');
  const [isCustomDrink, setIsCustomDrink] = useState(false);
  const [customDrinkName, setCustomDrinkName] = useState('');
  const [isHomePour, setIsHomePour] = useState(false);
  const [venueName, setVenueName] = useState('');
  const [hedonic, setHedonic] = useState<number>(8);
  const [selectedDeviations, setSelectedDeviations] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [crosspost, setCrosspost] = useState(false);

  // Load profile and pours
  const loadData = useCallback(async () => {
    if (isConnected) {
      setLoading(true);
      try {
        const [palateData, pourData] = await Promise.all([
          getConnectedPalate(),
          getConnectedPours(50),
        ]);
        if (palateData) {
          setProfile(palateData);
          localStorage.setItem('user_profile', JSON.stringify(palateData));
        }
        setPours(pourData);
      } catch (err) {
        console.error('Failed to load data from AT Protocol:', err);
      } finally {
        setLoading(false);
      }
    } else {
      const local = getInitialLocalProfile();
      if (local) {
        setProfile(local);
      }
    }
  }, [isConnected]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter drinks for selector
  const filteredDrinks = useMemo(() => {
    if (!drinkSearch.trim()) return drinkDatabase;
    const query = drinkSearch.toLowerCase().trim();
    return drinkDatabase.filter(
      (d) =>
        d.name.toLowerCase().includes(query) ||
        d.tags.some((t) => t.toLowerCase().includes(query)) ||
        d.type.toLowerCase().includes(query)
    );
  }, [drinkSearch]);

  const toggleDeviation = (dev: string) => {
    setSelectedDeviations((prev) =>
      prev.includes(dev) ? prev.filter((d) => d !== dev) : [...prev, dev]
    );
  };

  const handleTestPourGuest = () => {
    const neutralProfile: UserProfile = {
      x: 0,
      y: 0,
      dislikesSmoke: false,
      dislikesBitter: false,
      dislikesAnise: false,
      vibeTags: {},
    };
    setProfile(neutralProfile);
    localStorage.setItem('user_profile', JSON.stringify(neutralProfile));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalDrink = isCustomDrink ? customDrinkName.trim() : selectedDrink;
    if (!finalDrink) {
      setError('Please select or enter a drink name.');
      return;
    }
    if (!isHomePour && !venueName.trim()) {
      setError("Please specify a venue or choose 'Home Pour'.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    // Record previous position for shift animation
    if (profile) {
      setPreviousCoord({ x: profile.x, y: profile.y });
    }

    // Equivalent 0-10 rating for internal calibration
    const numericRating = (hedonic - 1) * 1.25;

    try {
      if (isConnected) {
        const result = await logDrinkFeedback({
          drinkName: finalDrink,
          rating: numericRating,
          isHomePour,
          location: isHomePour ? 'Home Pour' : venueName.trim(),
          venue: isHomePour ? undefined : { name: venueName.trim() },
          deviations: selectedDeviations,
          note: note.trim() || undefined,
          crosspostToFeed: crosspost,
        });

        if (result.success && result.profile) {
          setProfile(result.profile);
          localStorage.setItem('user_profile', JSON.stringify(result.profile));
          setSuccess(`Logged "${finalDrink}" to your AT Protocol repository.`);
          setCustomDrinkName('');
          setSelectedDeviations([]);
          setNote('');
          await loadData();
        } else {
          setError(result.error || 'Failed to log pour.');
        }
      } else {
        // Guest mode shift calculation
        const currentX = profile?.x ?? 0;
        const currentY = profile?.y ?? 0;
        let deltaX = 0;
        let deltaY = 0;

        for (const dev of selectedDeviations) {
          if (dev === 'too-sweet') deltaY -= 1.2;
          else if (dev === 'not-sweet-enough') deltaY += 1.2;
          else if (dev === 'too-sour') deltaX += 0.6;
          else if (dev === 'not-sour-enough') deltaX -= 0.6;
          else if (dev === 'too-rich') deltaX += 1.2;
          else if (dev === 'too-crisp') deltaX -= 1.2;
        }

        const matchedDrink = drinkDatabase.find(
          (d) => d.name.toLowerCase() === finalDrink.toLowerCase()
        );
        if (matchedDrink && hedonic >= 7) {
          deltaX += 0.15 * (matchedDrink.x - currentX);
          deltaY += 0.15 * (matchedDrink.y - currentY);
        }

        const newX = Math.max(-10, Math.min(10, currentX + deltaX));
        const newY = Math.max(-10, Math.min(10, currentY + deltaY));

        const updated: UserProfile = {
          x: Math.round(newX * 10) / 10,
          y: Math.round(newY * 10) / 10,
          dislikesSmoke: profile?.dislikesSmoke ?? false,
          dislikesBitter: profile?.dislikesBitter ?? false,
          dislikesAnise: profile?.dislikesAnise ?? false,
          vibeTags: profile?.vibeTags ?? {},
        };

        setProfile(updated);
        localStorage.setItem('user_profile', JSON.stringify(updated));

        const guestPour: PourRecord = {
          $type: 'app.crystalcoupe.pour',
          drink: { name: finalDrink, slug: slugifyDrink(finalDrink) },
          venue: isHomePour
            ? undefined
            : { entity: { name: venueName.trim() || 'Guest Venue' } },
          rating: { hedonic, wouldOrderAgain: hedonic >= 7 },
          deviations: selectedDeviations as PourRecord['deviations'],
          palateShift: {
            x: Math.round(newX - currentX),
            y: Math.round(newY - currentY),
          },
          note: note.trim() || undefined,
          isHomePour,
          createdAt: new Date().toISOString(),
        };

        setPours((prev) => [guestPour, ...prev]);
        setSuccess(`Logged "${finalDrink}" (Guest specimen).`);
        setCustomDrinkName('');
        setSelectedDeviations([]);
        setNote('');
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred while logging the pour.');
    } finally {
      setSubmitting(false);
    }
  };

  const userModel: User = useMemo(() => {
    return {
      x: profile?.x ?? 0,
      y: profile?.y ?? 0,
      filters: [],
    };
  }, [profile]);

  const currentQuadrant = useMemo(() => {
    return quadrantFor(userModel.x, userModel.y);
  }, [userModel.x, userModel.y]);

  const hedonicMeta = HEDONIC_DESCRIPTIONS[hedonic] ?? HEDONIC_DESCRIPTIONS[5];

  // Cold state: stranger with no profile
  if (!profile && !isConnected) {
    return (
      <div className="py-12 space-y-12 max-w-3xl mx-auto">
        <div className="border border-border bg-card p-8 md:p-12 shadow-bar space-y-6 text-center">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-secondary/10 border border-secondary/20 text-secondary mb-2">
            <Compass className="w-6 h-6" />
          </div>
          <p className="label-caps text-secondary tracking-label">{returnVisit.eyebrow}</p>
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground">
            {returnVisit.coldTitle}
          </h1>
          <p className="font-serif text-base text-muted-foreground leading-relaxed max-w-xl mx-auto">
            {returnVisit.coldBody}
          </p>

          <div className="pt-6 flex flex-wrap items-center justify-center gap-4">
            <a
              href="/taste"
              className="inline-flex items-center gap-2 border border-foreground bg-secondary px-6 py-3 font-condensed text-xs font-bold uppercase tracking-label text-secondary-foreground transition-colors hover:bg-primary shadow-bar"
            >
              {returnVisit.quizCta}
              <ArrowRight className="w-3.5 h-3.5" />
            </a>

            <a
              href="/#connect"
              className="inline-flex items-center gap-2 border border-border bg-card px-6 py-3 font-condensed text-xs uppercase tracking-label text-foreground transition-colors hover:border-foreground shadow-bar"
            >
              {returnVisit.signInCta}
            </a>

            <button
              onClick={handleTestPourGuest}
              className="inline-flex items-center gap-2 border border-dashed border-primary/40 bg-background/50 px-5 py-3 font-condensed text-xs uppercase tracking-label text-primary hover:bg-primary/5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {returnVisit.guestCta}
            </button>
          </div>
        </div>

        <div className="border-t border-border pt-8 text-center">
          <p className="font-serif text-xs italic text-muted-foreground">
            {returnVisit.intro}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 space-y-10">
      {/* Top Ledger Header */}
      <div className="border-b border-foreground pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="label-caps text-secondary tracking-label">{returnVisit.eyebrow}</p>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-foreground">
            {returnVisit.title}
          </h1>
          <p className="font-serif text-xs italic text-muted-foreground">
            {returnVisit.intro}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="border border-border bg-card px-3 py-1.5 shadow-bar">
            <span className="font-mono text-3xs text-muted-foreground block uppercase tracking-widest">
              Coordinate
            </span>
            <span className="font-mono text-xs font-bold text-primary">
              X: {profile?.x.toFixed(1)} · Y: {profile?.y.toFixed(1)}
            </span>
          </div>

          <div className="border border-border bg-card px-3 py-1.5 shadow-bar">
            <span className="font-mono text-3xs text-muted-foreground block uppercase tracking-widest">
              Region
            </span>
            <span className="font-serif text-xs font-bold text-foreground">
              {currentQuadrant.name}
            </span>
          </div>

          <div className="border border-border bg-card px-3 py-1.5 shadow-bar">
            <span className="font-mono text-3xs text-muted-foreground block uppercase tracking-widest">
              Pours Logged
            </span>
            <span className="font-mono text-xs font-bold text-secondary">
              {pours.length}
            </span>
          </div>
        </div>
      </div>

      {/* Dynamic Feedback Banner */}
      {previousCoord && profile && (
        <div className="border-l-2 border-primary bg-secondary/10 p-4 space-y-1 animate-in fade-in duration-300">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="font-condensed text-xs uppercase tracking-label font-bold text-primary">
              Palate Shift Recorded
            </span>
          </div>
          <p className="font-serif text-sm text-foreground">
            Coordinate shifted from ({previousCoord.x.toFixed(1)}, {previousCoord.y.toFixed(1)}) to (
            {profile.x.toFixed(1)}, {profile.y.toFixed(1)}). Current region:{' '}
            <strong className="font-serif">{currentQuadrant.name}</strong> ({currentQuadrant.axis}).
          </p>
        </div>
      )}

      {/* Main Two-Column Working Surface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Mini Palate Map & Region Context */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="glass-dark border-primary/10 coaster">
            <CardContent className="p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-primary/10 pb-3">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-primary" />
                  <h2 className="font-serif text-base font-bold text-foreground">
                    Your Flavor Position
                  </h2>
                </div>
                <span className="label-caps text-secondary text-3xs">{currentQuadrant.axis}</span>
              </div>

              {/* Map Surface */}
              <div className="relative w-full aspect-2/1 border border-primary/10 overflow-hidden rounded-sm">
                <MapBackground />
                <TooltipProvider>
                  <UserPin
                    x={userModel.x}
                    y={userModel.y}
                    xPct={toPct(userModel.x)}
                    yPct={toPct(userModel.y)}
                  />
                </TooltipProvider>
              </div>

              <div className="space-y-2 border-t border-border pt-4 text-xs font-serif leading-relaxed text-muted-foreground">
                <p>
                  <strong className="text-foreground">{currentQuadrant.name}:</strong>{' '}
                  {currentQuadrant.gloss}
                </p>
              </div>

              <div className="border-t border-border pt-3 flex justify-between items-center text-3xs font-condensed uppercase tracking-label">
                <a
                  href="/taste"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  View full recommendations &rarr;
                </a>
                <a
                  href={`/regions/${currentQuadrant.id}`}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Region guide &rarr;
                </a>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: The Return Pour Form */}
        <div className="lg:col-span-7">
          <Card className="glass-dark border-primary/10 coaster">
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-primary/10 pb-3">
                <div className="flex items-center gap-2">
                  <Plus className="w-5 h-5 text-primary" />
                  <h2 className="font-serif text-lg font-bold text-foreground">
                    {returnVisit.logTitle}
                  </h2>
                </div>
                <span className="font-mono text-3xs uppercase tracking-widest text-primary/80 border border-primary/20 px-2 py-0.5 rounded">
                  {isConnected ? 'AT Protocol PDS' : 'Guest Ledger'}
                </span>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5 text-sm">
                {/* Drink Selection */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label
                      htmlFor="drink-select"
                      className="font-mono text-2xs uppercase tracking-widest text-muted-foreground"
                    >
                      Cocktail / Pour Name
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCustomDrink(!isCustomDrink)}
                      className="text-3xs font-mono text-primary hover:underline uppercase tracking-wider"
                    >
                      {isCustomDrink ? 'Choose from 94 catalog drinks' : 'Enter custom drink'}
                    </button>
                  </div>

                  {isCustomDrink ? (
                    <input
                      type="text"
                      value={customDrinkName}
                      onChange={(e) => setCustomDrinkName(e.target.value)}
                      placeholder="e.g. Paper Plane, Oaxaca Old Fashioned, Last Word..."
                      className="w-full rounded-sm border border-primary/10 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground font-serif"
                      required
                    />
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={drinkSearch}
                        onChange={(e) => setDrinkSearch(e.target.value)}
                        placeholder="Search drinks by name, spirit, or tag..."
                        className="w-full rounded-sm border border-primary/10 bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary font-serif"
                      />
                      <select
                        id="drink-select"
                        value={selectedDrink}
                        onChange={(e) => setSelectedDrink(e.target.value)}
                        className="w-full rounded-sm border border-primary/10 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground font-serif"
                      >
                        {filteredDrinks.map((d) => (
                          <option key={d.name} value={d.name}>
                            {d.name} ({d.type} · {quadrantFor(d.x, d.y).name})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Venue vs Home Context */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="venue-input"
                      className="font-mono text-2xs uppercase tracking-widest text-muted-foreground"
                    >
                      Context
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsHomePour(!isHomePour)}
                      className={`flex items-center gap-1.5 text-3xs font-mono px-2.5 py-1 rounded-full border transition-all ${
                        isHomePour
                          ? 'bg-secondary/20 border-secondary text-secondary-foreground font-bold'
                          : 'border-primary/10 bg-background/20 text-muted-foreground hover:border-primary/30'
                      }`}
                    >
                      <Home className="w-3 h-3" />
                      {isHomePour ? 'Home Pour Active' : 'Switch to Home Pour'}
                    </button>
                  </div>

                  {!isHomePour && (
                    <div className="relative">
                      <MapPin className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground/60" />
                      <input
                        id="venue-input"
                        type="text"
                        value={venueName}
                        onChange={(e) => setVenueName(e.target.value)}
                        placeholder="Bar or venue name (e.g. Attaboy, Dante, The Dead Rabbit)..."
                        className="w-full rounded-sm border border-primary/10 bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground font-serif"
                        required={!isHomePour}
                      />
                    </div>
                  )}
                </div>

                {/* Hedonic Rating Slider (1 to 9) */}
                <div className="space-y-3 bg-background/30 p-4 rounded-sm border border-primary/10">
                  <div className="flex justify-between items-center">
                    <label
                      htmlFor="hedonic-range"
                      className="font-mono text-2xs uppercase tracking-widest text-muted-foreground flex items-center gap-1.5"
                    >
                      <Star className="w-3.5 h-3.5 text-primary fill-primary/30" />
                      Hedonic Rating (1 to 9)
                    </label>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-3xs font-mono uppercase tracking-wider border ${hedonicMeta.badgeClass}`}
                      >
                        {hedonicMeta.label}
                      </span>
                      <span className="text-base font-bold font-mono text-primary">
                        {hedonic} <span className="text-3xs text-muted-foreground">/ 9</span>
                      </span>
                    </div>
                  </div>

                  <input
                    id="hedonic-range"
                    type="range"
                    min="1"
                    max="9"
                    step="1"
                    value={hedonic}
                    onChange={(e) => setHedonic(parseInt(e.target.value, 10))}
                    className="w-full h-2 bg-muted/60 rounded-sm appearance-none cursor-pointer accent-primary"
                  />

                  <div className="flex justify-between text-3xs font-mono text-muted-foreground/60 px-1">
                    <span>1 (Dislike Extremely)</span>
                    <span>5 (Neutral)</span>
                    <span>9 (Like Extremely)</span>
                  </div>
                </div>

                {/* Deviations Pills */}
                <div className="space-y-2">
                  <label className="font-mono text-2xs uppercase tracking-widest text-muted-foreground block">
                    Taste Deviations / Adjustments (Moves Coordinate)
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {DEVIATIONS.map((dev) => {
                      const active = selectedDeviations.includes(dev);
                      return (
                        <button
                          key={dev}
                          type="button"
                          onClick={() => toggleDeviation(dev)}
                          className={`text-3xs px-2.5 py-1.5 rounded-full border transition-all ${
                            active
                              ? 'bg-secondary/20 border-secondary text-secondary-foreground font-bold'
                              : 'border-primary/5 bg-background hover:border-primary/20 text-muted-foreground'
                          }`}
                        >
                          {DEVIATION_LABELS[dev]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Tasting Note */}
                <div className="space-y-1">
                  <label
                    htmlFor="tasting-notes"
                    className="font-mono text-2xs uppercase tracking-widest text-muted-foreground block"
                  >
                    Tasting Note (Optional)
                  </label>
                  <textarea
                    id="tasting-notes"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Private sensory notes, spirit specs, or impressions..."
                    rows={2}
                    maxLength={1000}
                    className="w-full rounded-sm border border-primary/10 bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary resize-none font-serif text-foreground"
                  />
                </div>

                {/* Bluesky Crosspost */}
                {isConnected && (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="crosspost-check"
                      checked={crosspost}
                      onChange={(e) => setCrosspost(e.target.checked)}
                      className="w-4 h-4 rounded border-primary/20 bg-background text-primary focus:ring-primary/30 cursor-pointer"
                    />
                    <label
                      htmlFor="crosspost-check"
                      className="text-xs font-mono text-muted-foreground flex items-center gap-1.5 cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5 text-primary" />
                      Mirror check-in post to Bluesky feed
                    </label>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full tracking-widest uppercase text-xs font-bold py-3"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Log Pour & Calibrate Map'
                  )}
                </Button>

                {error && <p className="text-destructive text-3xs text-center font-mono">{error}</p>}
                {success && <p className="text-secondary text-3xs text-center font-mono">{success}</p>}
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Chronicle / Ledger Section ("What moved it") */}
      <section className="border-t border-foreground pt-8 space-y-6">
        <div className="flex items-baseline justify-between border-b border-border pb-2">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-secondary" />
            <h2 className="font-serif text-xl font-bold text-foreground">
              {returnVisit.ledgerTitle}
            </h2>
          </div>
          <span className="label-caps text-secondary">
            {pours.length} {pours.length === 1 ? 'Pour' : 'Pours'}
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary/50" />
          </div>
        ) : pours.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground font-serif border border-border bg-card/40 p-8 rounded-sm">
            {returnVisit.ledgerEmpty}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pours.map((pour, idx) => {
              const hedonicVal = pour.rating.hedonic;
              const meta = HEDONIC_DESCRIPTIONS[hedonicVal] ?? HEDONIC_DESCRIPTIONS[5];
              const venueStr = pour.isHomePour
                ? 'Home Pour'
                : pour.venue?.entity?.name || 'Unknown Venue';
              const drinkSlug = slugifyDrink(pour.drink.name);
              const isCatalogDrink = drinkDatabase.some(
                (d) => d.name.toLowerCase() === pour.drink.name.toLowerCase()
              );

              return (
                <div
                  key={idx}
                  className="border border-border bg-card p-4 rounded-sm shadow-bar space-y-2 text-xs"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      {isCatalogDrink ? (
                        <a
                          href={`/drinks/${drinkSlug}`}
                          className="font-bold font-serif text-sm text-foreground hover:text-primary transition-colors underline underline-offset-4 decoration-border"
                        >
                          {pour.drink.name}
                        </a>
                      ) : (
                        <span className="font-bold font-serif text-sm text-foreground">
                          {pour.drink.name}
                        </span>
                      )}
                      <div className="flex items-center gap-1.5 text-3xs text-muted-foreground font-mono mt-0.5">
                        {pour.isHomePour ? (
                          <Home className="w-3 h-3 text-secondary" />
                        ) : (
                          <MapPin className="w-3 h-3 text-secondary" />
                        )}
                        <span>{venueStr}</span>
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end gap-1">
                      <span
                        className={`px-2 py-0.5 rounded text-3xs font-mono uppercase tracking-wider border ${meta.badgeClass}`}
                      >
                        {hedonicVal}/9 Hedonic
                      </span>
                      {pour.palateShift && (
                        <span className="text-4xs font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                          ΔX: {pour.palateShift.x >= 0 ? `+${pour.palateShift.x}` : pour.palateShift.x} · ΔY:{' '}
                          {pour.palateShift.y >= 0 ? `+${pour.palateShift.y}` : pour.palateShift.y}
                        </span>
                      )}
                    </div>
                  </div>

                  {pour.deviations && pour.deviations.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {pour.deviations.map((dev) => (
                        <span
                          key={dev}
                          className="px-2 py-0.5 rounded-full bg-secondary/5 border border-secondary/15 text-4xs uppercase tracking-wider text-secondary font-mono"
                        >
                          {dev.replace(/-/g, ' ')}
                        </span>
                      ))}
                    </div>
                  )}

                  {pour.note && (
                    <div className="flex gap-1.5 p-2.5 rounded bg-muted/30 border border-primary/5 text-xs text-muted-foreground font-serif italic">
                      <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-primary" />
                      <span>&ldquo;{pour.note}&rdquo;</span>
                    </div>
                  )}

                  <div className="text-4xs text-right text-muted-foreground/60 font-mono pt-1">
                    {new Date(pour.createdAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default function ReturnVisit() {
  return (
    <AtprotoProvider>
      <ReturnVisitContent />
    </AtprotoProvider>
  );
}
