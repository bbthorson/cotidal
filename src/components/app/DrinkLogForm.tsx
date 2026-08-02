import { useState, useEffect } from 'react';
import { useAtprotoContext } from './AtprotoProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Plus, History, MapPin, Star, MessageSquare, Home, Sparkles, Share2 } from 'lucide-react';
import { logDrinkFeedback } from '@/lib/api-client';
import type { DrinkLogRecord, SensoryProfile } from '@/lib/atproto/lexicon';
import type { UserProfile } from '@/hooks/useDiscoveryQuiz';

interface DrinkLogFormProps {
  recommendedDrinks: string[];
  onPalateUpdated: (profile: UserProfile) => void;
  selectedLocation?: string | null;
  history: DrinkLogRecord[];
  loadingHistory?: boolean;
  onLogAdded: () => void;
}

const BASE_SPIRITS = [
  'Bourbon', 'Mezcal', 'Gin', 'Rum', 'Tequila', 
  'Rye', 'Vodka', 'Cognac / Brandy', 'Scotch', 'Amaro / Aperitif', 'Non-Alcoholic'
];

const GLASSWARE_OPTIONS = [
  'Coupe', 'Rocks / Lowball', 'Highball / Collins', 'Nick & Nora', 'Martini / Cocktail', 'Tiki Mug'
];

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

function getRatingBadge(score: number): { label: string; color: string } {
  if (score >= 9.5) return { label: 'Masterpiece', color: 'text-amber-400 border-amber-400/40 bg-amber-400/10' };
  if (score >= 8.5) return { label: 'Outstanding', color: 'text-emerald-400 border-emerald-400/40 bg-emerald-400/10' };
  if (score >= 7.0) return { label: 'Very Good', color: 'text-sky-400 border-sky-400/40 bg-sky-400/10' };
  if (score >= 5.5) return { label: 'Solid / Good', color: 'text-secondary border-secondary/40 bg-secondary/10' };
  if (score >= 4.0) return { label: 'Average', color: 'text-muted-foreground border-muted-foreground/30 bg-muted/20' };
  return { label: 'Subpar', color: 'text-destructive border-destructive/40 bg-destructive/10' };
}

export function DrinkLogForm({
  recommendedDrinks,
  onPalateUpdated,
  selectedLocation,
  history,
  loadingHistory = false,
  onLogAdded,
}: DrinkLogFormProps) {
  const { isConnected } = useAtprotoContext();
  
  // Core Form State
  const [selectedDrink, setSelectedDrink] = useState(recommendedDrinks[0] || '');
  const [customDrinkName, setCustomDrinkName] = useState('');
  const [isCustomDrink, setIsCustomDrink] = useState(false);
  
  // PRD Contextual Metadata
  const [isHomePour, setIsHomePour] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [baseSpirit, setBaseSpirit] = useState<string>('Bourbon');
  const [glassware, setGlassware] = useState<string>('Coupe');
  const [garnish, setGarnish] = useState<string>('');
  
  // 10-Point Precision Rating
  const [rating, setRating] = useState<number>(8.0);
  
  // 6-Axis Sensory Input Sliders (0.0 to 5.0)
  const [showSensorySliders, setShowSensorySliders] = useState(false);
  const [sensoryProfile, setSensoryProfile] = useState<SensoryProfile>({
    bitter: 2.5,
    sweet: 2.5,
    sour: 2.5,
    spiritForward: 3.0,
    citrus: 2.5,
    herbal: 2.0,
  });

  const [selectedDeviations, setSelectedDeviations] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [crosspostToFeed, setCrosspostToFeed] = useState(false);
  
  // UI States
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync selectedLocation prop to input state
  useEffect(() => {
    if (selectedLocation && !isHomePour) {
      setLocationName(selectedLocation);
    }
  }, [selectedLocation, isHomePour]);

  const toggleDeviation = (value: string) => {
    setSelectedDeviations(prev => 
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  const updateSensoryAxis = (axis: keyof SensoryProfile, val: number) => {
    setSensoryProfile(prev => ({ ...prev, [axis]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalDrinkName = isCustomDrink ? customDrinkName.trim() : selectedDrink;
    if (!finalDrinkName) {
      setError("Please specify a drink name.");
      return;
    }
    if (!isHomePour && !locationName.trim()) {
      setError("Please specify a location or check 'Home Pour'.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const result = await logDrinkFeedback({
        drinkName: finalDrinkName,
        rating,
        baseSpirit,
        isHomePour,
        location: isHomePour ? 'Home Pour' : locationName.trim(),
        venue: isHomePour ? undefined : { name: locationName.trim() },
        sensoryProfile: showSensorySliders ? sensoryProfile : undefined,
        glassware,
        garnish: garnish.trim() || undefined,
        deviations: selectedDeviations,
        note: note.trim() || undefined,
        crosspostToFeed,
      });

      if (result.success && result.profile) {
        setSuccessMsg(`Logged "${finalDrinkName}" (${rating.toFixed(1)}/10) to your AT Protocol repository!`);
        onPalateUpdated(result.profile);
        
        // Reset form inputs
        setCustomDrinkName('');
        setSelectedDeviations([]);
        setNote('');
        setGarnish('');
        
        // Trigger history reload in parent
        onLogAdded();
      } else {
        setError(result.error || "Failed to log drink entry.");
      }
    } catch (e) {
      console.error(e);
      setError("An error occurred during submission.");
    } finally {
      setSubmitting(false);
    }
  };

  const ratingBadge = getRatingBadge(rating);

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pt-6 border-t border-primary/10">
      {/* Log Form Card */}
      <Card className="md:col-span-7 glass-dark border-primary/10 coaster">
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-primary/10">
            <div className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              <h3 className="font-serif text-lg font-bold text-foreground">Log Drink Entry (&quot;Coupe Log&quot;)</h3>
            </div>
            <span className="text-4xs font-mono uppercase tracking-widest text-primary/80 border border-primary/20 px-2 py-0.5 rounded">
              ATProto PDS Sync
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 text-sm">
            {/* Drink Selection */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="font-mono text-2xs uppercase tracking-widest text-muted-foreground">Cocktail / Drink Name</label>
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
                  placeholder="e.g. Paper Plane, Oaxaca Old Fashioned, Last Word..."
                  className="w-full rounded-lg border border-primary/10 bg-background/40 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30 text-foreground"
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

            {/* Base Spirit & Glassware Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-mono text-2xs uppercase tracking-widest text-muted-foreground block">Base Spirit</label>
                <select
                  value={baseSpirit}
                  onChange={(e) => setBaseSpirit(e.target.value)}
                  className="w-full rounded-lg border border-primary/10 bg-background/40 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30 text-foreground"
                >
                  {BASE_SPIRITS.map(spirit => (
                    <option key={spirit} value={spirit}>{spirit}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-mono text-2xs uppercase tracking-widest text-muted-foreground block">Glassware</label>
                <select
                  value={glassware}
                  onChange={(e) => setGlassware(e.target.value)}
                  className="w-full rounded-lg border border-primary/10 bg-background/40 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30 text-foreground"
                >
                  {GLASSWARE_OPTIONS.map(glass => (
                    <option key={glass} value={glass}>{glass}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Venue vs Home Pour Context */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-mono text-2xs uppercase tracking-widest text-muted-foreground">Tasting Context</label>
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
                    type="text"
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    placeholder="Bar or Venue name (e.g. Sage Apothecary, Pegu Club)..."
                    className="w-full rounded-lg border border-primary/10 bg-background/40 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30 text-foreground"
                    required={!isHomePour}
                  />
                </div>
              )}
            </div>

            {/* 10-Point Precision Rating Slider (PRD Spec) */}
            <div className="space-y-3 bg-background/30 p-4 rounded-xl border border-primary/10">
              <div className="flex justify-between items-center">
                <label className="font-mono text-2xs uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-primary fill-primary/30" />
                  Precision Rating (0.0 to 10.0)
                </label>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-4xs font-mono uppercase tracking-wider border ${ratingBadge.color}`}>
                    {ratingBadge.label}
                  </span>
                  <span className="text-lg font-bold font-mono text-primary">
                    {rating.toFixed(1)} <span className="text-3xs text-muted-foreground">/ 10</span>
                  </span>
                </div>
              </div>

              <input
                type="range"
                min="0.0"
                max="10.0"
                step="0.1"
                value={rating}
                onChange={(e) => setRating(parseFloat(e.target.value))}
                className="w-full h-2 bg-muted/60 rounded-lg appearance-none cursor-pointer accent-primary"
              />

              <div className="flex justify-between text-4xs font-mono text-muted-foreground/60 px-1">
                <span>0.0 (Undrinkable)</span>
                <span>5.0 (Average)</span>
                <span>10.0 (Masterpiece)</span>
              </div>
            </div>

            {/* Optional 6-Axis Sensory Input Sliders Toggle */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setShowSensorySliders(!showSensorySliders)}
                className="flex items-center gap-2 text-xs font-mono text-primary hover:underline uppercase tracking-wider"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {showSensorySliders ? "Hide 6-Axis Sensory Radar Sliders" : "+ Add 6-Axis Sensory Radar Sliders (Bitter, Sweet, Citrus, Spirit)"}
              </button>

              {showSensorySliders && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-background/20 p-4 rounded-lg border border-primary/10 animate-in fade-in duration-300">
                  {(['bitter', 'sweet', 'sour', 'spiritForward', 'citrus', 'herbal'] as const).map(axis => (
                    <div key={axis} className="space-y-1">
                      <div className="flex justify-between text-3xs font-mono">
                        <span className="capitalize text-muted-foreground">{axis === 'spiritForward' ? 'Spirit-Forward' : axis}</span>
                        <span className="text-primary font-bold">{sensoryProfile[axis].toFixed(1)} / 5</span>
                      </div>
                      <input
                        type="range"
                        min="0.0"
                        max="5.0"
                        step="0.5"
                        value={sensoryProfile[axis]}
                        onChange={(e) => updateSensoryAxis(axis, parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-muted/50 rounded-lg appearance-none cursor-pointer accent-secondary"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Deviations Pills */}
            <div className="space-y-2">
              <label className="font-mono text-2xs uppercase tracking-widest text-muted-foreground block">Taste Deviations / Adjustments</label>
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
                          ? "bg-secondary/20 border-secondary text-secondary-foreground font-bold"
                          : "border-primary/5 bg-background/10 hover:border-primary/20 text-muted-foreground"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional Garnish & Note */}
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-1">
                <label className="font-mono text-2xs uppercase tracking-widest text-muted-foreground block">Garnish (Optional)</label>
                <input
                  type="text"
                  value={garnish}
                  onChange={(e) => setGarnish(e.target.value)}
                  placeholder="e.g. Dehydrated Lime, Brandied Cherry, Orange Peel..."
                  className="w-full rounded-lg border border-primary/10 bg-background/40 px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>

              <div className="space-y-1">
                <label className="font-mono text-2xs uppercase tracking-widest text-muted-foreground block">Tasting Notes (Optional)</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Private tasting log notes, aroma notes, finish..."
                  rows={2}
                  maxLength={1000}
                  className="w-full rounded-lg border border-primary/10 bg-background/40 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none"
                />
              </div>
            </div>

            {/* Bluesky Crossposting Checkbox */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="crosspost"
                checked={crosspostToFeed}
                onChange={(e) => setCrosspostToFeed(e.target.checked)}
                className="w-4 h-4 rounded border-primary/20 bg-background/50 text-primary focus:ring-primary/30 cursor-pointer"
              />
              <label htmlFor="crosspost" className="text-xs font-mono text-muted-foreground flex items-center gap-1.5 cursor-pointer">
                <Share2 className="w-3.5 h-3.5 text-sky-400" />
                Mirror check-in post to Bluesky feed
              </label>
            </div>

            <Button
              type="submit"
              disabled={submitting || (!isConnected)}
              className="w-full tracking-widest uppercase text-xs font-bold py-3"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : !isConnected ? (
                "Connect Bluesky to Log Drinks"
              ) : (
                "Log Drink to ATProto Repository"
              )}
            </Button>

            {error && <p className="text-destructive text-3xs text-center">{error}</p>}
            {successMsg && <p className="text-emerald-400 text-3xs text-center">{successMsg}</p>}
          </form>
        </CardContent>
      </Card>

      {/* History Card */}
      <Card className="md:col-span-5 glass-dark border-primary/10 coaster flex flex-col">
        <CardContent className="p-6 space-y-6 flex-1 flex flex-col justify-between">
          <div className="space-y-4 flex-1">
            <div className="flex items-center gap-2 pb-3 border-b border-primary/10">
              <History className="w-5 h-5 text-secondary" />
              <h3 className="font-serif text-lg font-bold text-foreground">Tasted History Ledger</h3>
            </div>

            {!isConnected ? (
              <div className="text-center py-10 space-y-3">
                <p className="text-xs text-muted-foreground font-serif leading-relaxed">
                  Logins are stored directly on your personal Bluesky/AT Protocol server (PDS). Connect your handle to access your decentralized drink ledger.
                </p>
                <div className="inline-block px-3 py-1 rounded border border-secondary/20 bg-secondary/5 text-secondary text-3xs uppercase tracking-widest font-mono">
                  Decentralized Storage
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
              <div className="space-y-3 overflow-y-auto max-h-[420px] pr-1">
                {history.map((log, i) => {
                  const displayRating = log.rating ?? (log.hedonicScale ? (log.hedonicScale - 1) * 1.25 : 5.0);
                  return (
                    <div key={i} className="p-3.5 rounded-lg border border-primary/10 bg-background/20 space-y-2 text-xs">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-bold text-foreground">{log.drinkName}</h4>
                            {log.baseSpirit && (
                              <span className="text-4xs font-mono text-muted-foreground bg-primary/5 border border-primary/10 px-1.5 py-0.2 rounded">
                                {log.baseSpirit}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-3xs text-muted-foreground/80 font-mono mt-0.5">
                            {log.isHomePour ? <Home className="w-2.5 h-2.5 text-secondary" /> : <MapPin className="w-2.5 h-2.5 text-secondary" />}
                            <span>{log.location || log.venue?.name || 'Unknown Venue'}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded text-xs font-mono font-bold inline-flex items-center gap-1">
                            <Star className="w-3 h-3 fill-current text-primary" /> {displayRating.toFixed(1)}/10
                          </span>
                        </div>
                      </div>

                      {/* Deviations & Notes */}
                      {log.deviations && log.deviations.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {log.deviations.map(dev => (
                            <span key={dev} className="px-1.5 py-0.5 rounded-full bg-secondary/5 border border-secondary/15 text-4xs uppercase tracking-wider text-secondary">
                              {dev.replace(/-/g, ' ')}
                            </span>
                          ))}
                        </div>
                      )}

                      {(log.notes || log.note) && (
                        <div className="flex gap-1.5 p-2 rounded bg-card/40 border border-primary/5 text-3xs text-muted-foreground font-serif italic">
                          <MessageSquare className="w-3 h-3 flex-shrink-0 mt-0.5" />
                          <span>&ldquo;{log.notes || log.note}&rdquo;</span>
                        </div>
                      )}

                      <div className="text-4xs text-right text-muted-foreground/60 font-mono">
                        {new Date(log.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {isConnected && (
            <div className="border-t border-primary/5 pt-4 text-center">
              <span className="text-4xs font-mono text-muted-foreground/45 uppercase tracking-widest">
                Personal Data Server (PDS) Ledger
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
