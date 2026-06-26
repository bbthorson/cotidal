'use client';

import { useState, useEffect } from 'react';
import { useAtprotoContext } from './AtprotoProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Plus, History, MapPin, Star, MessageSquare } from 'lucide-react';
import { logDrinkFeedback } from '@/app/actions/atproto-publish';
import type { DrinkLogRecord } from '@/lib/atproto/lexicon';
import type { UserProfile } from '@/hooks/useDiscoveryQuiz';

interface DrinkLogFormProps {
  recommendedDrinks: string[];
  onPalateUpdated: (profile: UserProfile) => void;
  selectedLocation?: string | null;
  history: DrinkLogRecord[];
  loadingHistory?: boolean;
  onLogAdded: () => void;
}

const HEDONIC_LABELS: Record<number, string> = {
  1: "Dislike Extremely",
  2: "Dislike Very Much",
  3: "Dislike Moderately",
  4: "Dislike Slightly",
  5: "Neutral",
  6: "Like Slightly",
  7: "Like Moderately",
  8: "Like Very Much",
  9: "Like Extremely",
};

const DEVIATION_OPTIONS = [
  { value: "too-sweet", label: "Too Sweet" },
  { value: "not-sweet-enough", label: "Needs More Sweet" },
  { value: "too-sour", label: "Too Sour" },
  { value: "not-sour-enough", label: "Needs More Sour" },
  { value: "too-bitter", label: "Too Bitter" },
  { value: "too-smoky", label: "Too Smoky" },
  { value: "too-anise", label: "Too Anise (Licorice)" },
  { value: "too-rich", label: "Too Rich / Heavy" },
  { value: "too-crisp", label: "Too Dry / Crisp" },
  { value: "too-flat", label: "Flat / Still" },
  { value: "too-fizzy", label: "Too Carbonated" },
];

export function DrinkLogForm({
  recommendedDrinks,
  onPalateUpdated,
  selectedLocation,
  history,
  loadingHistory = false,
  onLogAdded,
}: DrinkLogFormProps) {
  const { isConnected } = useAtprotoContext();
  
  // Form State
  const [selectedDrink, setSelectedDrink] = useState(recommendedDrinks[0] || '');
  const [customDrinkName, setCustomDrinkName] = useState('');
  const [isCustomDrink, setIsCustomDrink] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [rating, setRating] = useState<number>(5); // Default Neutral
  const [selectedDeviations, setSelectedDeviations] = useState<string[]>([]);
  const [note, setNote] = useState('');
  
  // UI States
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync selectedLocation prop to input state
  useEffect(() => {
    if (selectedLocation) {
      setLocationName(selectedLocation);
    }
  }, [selectedLocation]);

  const toggleDeviation = (value: string) => {
    setSelectedDeviations(prev => 
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalDrinkName = isCustomDrink ? customDrinkName.trim() : selectedDrink;
    if (!finalDrinkName) {
      setError("Please specify a drink name.");
      return;
    }
    if (!locationName.trim()) {
      setError("Please specify a location.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const result = await logDrinkFeedback(
        finalDrinkName,
        locationName.trim(),
        rating,
        selectedDeviations,
        note.trim() || undefined
      );

      if (result.success && result.profile) {
        setSuccessMsg(`Logged "${finalDrinkName}"! Your flavor profile coordinates have been adjusted.`);
        onPalateUpdated(result.profile);
        
        // Reset form inputs except location for convenience
        setCustomDrinkName('');
        setSelectedDeviations([]);
        setNote('');
        setRating(5);
        
        // Trigger history reload in parent
        onLogAdded();
      } else {
        setError(result.error || "Failed to log feedback.");
      }
    } catch (e) {
      console.error(e);
      setError("An error occurred during submission.");
    } finally {
      setSubmitting(false);
    }
  };

  const uniqueLocations = Array.from(
    new Set(
      history
        .map(h => h.location)
        .filter((loc): loc is string => !!loc && loc.trim().length > 0)
    )
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pt-6 border-t border-primary/10">
      {/* Log Form Card */}
      <Card className="md:col-span-7 glass-dark border-primary/5 coaster">
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center gap-2 pb-2 border-b border-primary/5">
            <Plus className="w-5 h-5 text-primary" />
            <h3 className="font-serif text-lg font-bold text-foreground">Log Ordered Drink</h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-sm">
            {/* Drink Selection */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="font-mono text-2xs uppercase tracking-widest text-muted-foreground">Select Beverage</label>
                <button
                  type="button"
                  onClick={() => setIsCustomDrink(!isCustomDrink)}
                  className="text-3xs font-mono text-primary hover:underline uppercase tracking-wider"
                >
                  {isCustomDrink ? "Choose from recommended" : "Custom drink name"}
                </button>
              </div>

              {isCustomDrink ? (
                <input
                  type="text"
                  value={customDrinkName}
                  onChange={(e) => setCustomDrinkName(e.target.value)}
                  placeholder="e.g. Sidecar, Smoky Mezcalita..."
                  className="w-full rounded-lg border border-primary/10 bg-background/40 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30"
                  required
                />
              ) : (
                <select
                  value={selectedDrink}
                  onChange={(e) => setSelectedDrink(e.target.value)}
                  className="w-full rounded-lg border border-primary/10 bg-background/50 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30 text-foreground"
                >
                  {recommendedDrinks.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Location Input */}
            <div className="space-y-1.5">
              <label className="font-mono text-2xs uppercase tracking-widest text-muted-foreground block">Location / Bar</label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground/60" />
                <input
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="e.g. Pegu Club, Sage Apothecary, Home"
                  className="w-full rounded-lg border border-primary/10 bg-background/40 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30"
                  list="location-suggestions"
                  required
                />
                <datalist id="location-suggestions">
                  {uniqueLocations.map(loc => (
                    <option key={loc} value={loc} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Hedonic Scale */}
            <div className="space-y-2">
              <label className="font-mono text-2xs uppercase tracking-widest text-muted-foreground block">
                Hedonic Rating: <span className="text-primary font-bold">{rating}/9</span>
              </label>
              <div className="flex justify-between items-center gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setRating(num)}
                    className={`flex-1 py-2 rounded text-xs font-mono border transition-all ${
                      rating === num
                        ? "bg-primary border-primary text-primary-foreground shadow-[0_0_10px_rgba(212,148,26,0.2)]"
                        : "border-primary/10 bg-background/20 hover:border-primary/30"
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
              <p className="text-3xs text-muted-foreground/80 italic text-center font-serif">
                &ldquo;{HEDONIC_LABELS[rating]}&rdquo;
              </p>
            </div>

            {/* Deviations Checkboxes (Pills) */}
            <div className="space-y-2">
              <label className="font-mono text-2xs uppercase tracking-widest text-muted-foreground block">Taste Feedback (Perceived Deviations)</label>
              <div className="flex flex-wrap gap-1.5">
                {DEVIATION_OPTIONS.map(opt => {
                  const active = selectedDeviations.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleDeviation(opt.value)}
                      className={`text-3xs px-2.5 py-1.5 rounded-full border transition-all ${
                        active
                          ? "bg-secondary/20 border-secondary text-secondary-foreground"
                          : "border-primary/5 bg-background/10 hover:border-primary/20 text-muted-foreground"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional Note */}
            <div className="space-y-1.5">
              <label className="font-mono text-2xs uppercase tracking-widest text-muted-foreground block">Tasting Note (Optional)</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Write your impressions..."
                rows={2}
                maxLength={300}
                className="w-full rounded-lg border border-primary/10 bg-background/40 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none"
              />
            </div>

            <Button
              type="submit"
              disabled={submitting || (!isConnected)}
              className="w-full tracking-widest uppercase text-xs font-bold"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : !isConnected ? (
                "Connect Bluesky to Log Drinks"
              ) : (
                "Log Drink to Repository"
              )}
            </Button>

            {error && <p className="text-destructive text-3xs text-center">{error}</p>}
            {successMsg && <p className="text-emerald-400 text-3xs text-center">{successMsg}</p>}
          </form>
        </CardContent>
      </Card>

      {/* History Card */}
      <Card className="md:col-span-5 glass-dark border-primary/5 coaster flex flex-col">
        <CardContent className="p-6 space-y-6 flex-1 flex flex-col justify-between">
          <div className="space-y-4 flex-1">
            <div className="flex items-center gap-2 pb-2 border-b border-primary/5">
              <History className="w-5 h-5 text-secondary" />
              <h3 className="font-serif text-lg font-bold text-foreground">Tasted History</h3>
            </div>

            {!isConnected ? (
              <div className="text-center py-10 space-y-3">
                <p className="text-xs text-muted-foreground font-serif leading-relaxed">
                  Logins are stored directly on the Bluesky/AT Protocol firehose. Connect your handle to view a ledger of your historical drink ratings.
                </p>
                <div className="inline-block px-3 py-1 rounded border border-secondary/20 bg-secondary/5 text-secondary text-3xs uppercase tracking-widest">
                  Secure Data Vault
                </div>
              </div>
            ) : loadingHistory ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-primary/50" />
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-12 text-xs text-muted-foreground font-serif">
                No drinks logged on your repository yet. Order something and submit your first log above!
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto max-h-[360px] pr-1">
                {history.map((log, i) => (
                  <div key={i} className="p-3 rounded border border-primary/5 bg-background/20 space-y-2 text-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-foreground">{log.drinkName}</h4>
                        <div className="flex items-center gap-1 text-3xs text-muted-foreground/80 font-mono mt-0.5">
                          <MapPin className="w-2.5 h-2.5 text-secondary/70" />
                          <span>{log.location}</span>
                        </div>
                      </div>
                      <span className="bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded text-3xs font-mono font-bold flex items-center gap-1">
                        <Star className="w-2.5 h-2.5 fill-current" /> {log.hedonicScale}/9
                      </span>
                    </div>

                    {/* Deviations Badges */}
                    {log.deviations && log.deviations.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {log.deviations.map(dev => (
                          <span key={dev} className="px-1.5 py-0.5 rounded-full bg-secondary/5 border border-secondary/15 text-4xs uppercase tracking-wider text-secondary">
                            {dev.replace(/-/g, ' ')}
                          </span>
                        ))}
                      </div>
                    )}

                    {log.note && (
                      <div className="flex gap-1.5 p-2 rounded bg-card/40 border border-primary/5 text-3xs text-muted-foreground font-serif italic">
                        <MessageSquare className="w-3 h-3 flex-shrink-0 mt-0.5" />
                        <span>&ldquo;{log.note}&rdquo;</span>
                      </div>
                    )}

                    <div className="text-4xs text-right text-muted-foreground/60 font-mono">
                      {new Date(log.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {isConnected && (
            <div className="border-t border-primary/5 pt-4 text-center">
              <span className="text-4xs font-mono text-muted-foreground/45 uppercase tracking-widest">
                Decentralized Repository Ledger
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
