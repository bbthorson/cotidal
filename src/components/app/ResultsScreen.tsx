import { useMemo, useState, useEffect } from 'react';
import { drinkDatabase, type User, type ContextType } from '@/lib/data';
import { calculateContextScore, calculateWeightedRelevance, getQuadrantName } from '@/lib/scoring';
import { ConnectBluesky } from './ConnectBluesky';
import { MiniFlavorMap } from './MiniFlavorMap';
import { HeroDrinkCard } from './HeroDrinkCard';
import { MenuSection } from './MenuSection';
import { DrinkLogForm } from './DrinkLogForm';
import { PalateRadarChart } from './PalateRadarChart';
import { DrinkMapView } from './DrinkMapView';
import { AppNavigation, type ActiveTab } from './AppNavigation';
import { useAtprotoContext } from './AtprotoProvider';
import { getConnectedDrinkLogs, refinePalateWithAI } from '@/lib/api-client';
import { MapPin, Sparkles } from 'lucide-react';
import type { UserProfile } from '@/hooks/useDiscoveryQuiz';
import type { PourRecord } from '@/lib/atproto/records';

interface ResultsScreenProps {
    user: User;
    vibeTags?: Record<string, number>;
    onPalateUpdated?: (profile: UserProfile) => void;
}

const MENU_SECTIONS: { context: ContextType; title: string; count: number }[] = [
    { context: 'usual',    title: "Your Go-To's",         count: 8 },
    { context: 'party',    title: "For a Night Out",      count: 6 },
    { context: 'business', title: "Making an Impression", count: 6 },
    { context: 'holiday',  title: "Holiday Warmth",       count: 6 },
];

export function ResultsScreen({ user, vibeTags, onPalateUpdated }: ResultsScreenProps) {
    const { isConnected } = useAtprotoContext();
    const [activeTab, setActiveTab] = useState<ActiveTab>('palate');
    const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
    const [history, setHistory] = useState<PourRecord[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [refineNotes, setRefineNotes] = useState('');
    const [isRefining, setIsRefining] = useState(false);
    const [dossier, setDossier] = useState<string | null>(null);

    const handleRefinePalate = async () => {
        if (!refineNotes.trim() || isRefining) return;
        setIsRefining(true);
        try {
            const currentProfile: UserProfile = {
                x: user.x,
                y: user.y,
                dislikesSmoke: user.filters.includes('noSmoke'),
                dislikesBitter: user.filters.includes('noBitter'),
                dislikesAnise: user.filters.includes('noAnise'),
                vibeTags: vibeTags || {},
            };
            const result = await refinePalateWithAI(refineNotes, currentProfile);
            setDossier(result.dossier);
            if (onPalateUpdated) {
                onPalateUpdated(result.profile);
            }
        } catch (err) {
            console.error('Failed to refine palate:', err);
        } finally {
            setIsRefining(false);
        }
    };

    const fetchHistory = async () => {
        if (!isConnected) return;
        setLoadingHistory(true);
        try {
            const logs = await getConnectedDrinkLogs(50);
            setHistory(logs);
        } catch (e) {
            console.error("Failed to load tasted history:", e);
        } finally {
            setLoadingHistory(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isConnected]);

    // Unique venues logged in history
    const uniqueLocations = useMemo(() => {
        return Array.from(
            new Set(
                history
                    .map(h => (h.isHomePour ? 'Home Pour' : h.venue?.entity?.name))
                    .filter((loc): loc is string => !!loc && loc.trim().length > 0)
            )
        );
    }, [history]);

    // Stage 1: Filter & Base Score using Weighted User Relevance
    const baseScoredDrinks = useMemo(() => {
        const dislikesSmoke = user.filters.includes('noSmoke');
        const dislikesBitter = user.filters.includes('noBitter');
        const dislikesAnise = user.filters.includes('noAnise');

        const availableDrinks = drinkDatabase.filter(d => {
            if (dislikesSmoke && d.hasSmoke) return false;
            if (dislikesBitter && d.isBitter) return false;
            if (dislikesAnise && d.hasAnise) return false;
            return true;
        });

        const userWithVibe = {
            x: user.x,
            y: user.y,
            vibeTags: vibeTags || null,
        };

        const minimalLogs = history.map(pour => ({
            drinkName: pour.drink.name,
            location: pour.isHomePour ? 'Home Pour' : pour.venue?.entity?.name,
            hedonicScale: pour.rating.hedonic,
            createdAt: pour.createdAt,
        }));

        return availableDrinks.map(drink => {
            const score = calculateWeightedRelevance(
                userWithVibe,
                drink,
                minimalLogs,
                selectedLocation
            );

            const latestLog = minimalLogs
                .filter(log => log.drinkName.toLowerCase() === drink.name.toLowerCase())
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
            const isHardDislike = latestLog && latestLog.hedonicScale <= 3;

            const distance = Math.sqrt(Math.pow(user.x - drink.x, 2) + Math.pow(user.y - drink.y, 2));

            return {
                ...drink,
                distance,
                baseScore: score,
                relevanceScore: score,
                isHardDislike,
            };
        }).filter(d => !d.isHardDislike);
    }, [user, vibeTags, history, selectedLocation]);

    const sections = useMemo(() => {
        return MENU_SECTIONS.map(({ context, title, count }) => {
            const drinks = baseScoredDrinks.map(drink => {
                const contextBoost = calculateContextScore(drink, context);
                const finalScore = Math.max(0, Math.min(100, drink.relevanceScore + (contextBoost * 2)));
                return {
                    ...drink,
                    score: finalScore,
                };
            }).sort((a, b) => b.score - a.score).slice(0, count);
            return { title, drinks };
        });
    }, [baseScoredDrinks]);

    const topDrinks = sections[0].drinks;
    const heroDrink = topDrinks[0];
    const restOfTopDrinks = topDrinks.slice(1);

    const userProfileForRadar = useMemo(() => ({
        x: user.x,
        y: user.y,
        dislikesSmoke: user.filters.includes('noSmoke'),
        dislikesBitter: user.filters.includes('noBitter'),
        dislikesAnise: user.filters.includes('noAnise'),
        vibeTags: vibeTags || {},
    }), [user, vibeTags]);

    return (
        <div className="animate-in fade-in duration-500 pb-16">
            <AppNavigation
                activeTab={activeTab}
                onTabChange={setActiveTab}
                loggedCount={history.length}
            />

            <div className="px-5 max-w-4xl mx-auto space-y-10">
                {/* Tab 1: Palate & DNA */}
                {activeTab === 'palate' && (
                    <div className="space-y-8 animate-in fade-in duration-300">
                        {/* 6-Axis Palate Radar Chart & Dynamic Archetype */}
                        <PalateRadarChart palate={userProfileForRadar} />

                        {/* AI Palate Refinement (Member Feature) */}
                        <div className="border border-border bg-card p-6 rounded-sm shadow-bar space-y-4">
                            <div className="flex items-center justify-between border-b border-border/60 pb-3">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-primary" />
                                    <h3 className="font-serif text-lg font-bold text-foreground">AI Palate Refinement</h3>
                                </div>
                                <span className="label-caps text-primary">Member Instrument</span>
                            </div>

                            {isConnected ? (
                                <div className="space-y-4">
                                    <p className="font-serif text-sm text-muted-foreground leading-relaxed">
                                        Have specific quirks or house rules? Tell us anything you avoid, crave, or swear by. The model will calibrate your coordinate and update your AT Protocol record.
                                    </p>
                                    <textarea
                                        value={refineNotes}
                                        onChange={(e) => setRefineNotes(e.target.value)}
                                        placeholder="e.g., I get migraines from red wine tannins, love dry gin martinis with a twist, but absolutely despise licorice or absinthe."
                                        rows={3}
                                        className="w-full p-3 bg-background border border-border text-foreground font-serif text-sm rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary placeholder:text-muted-foreground/60 resize-none"
                                    />
                                    <div className="flex items-center justify-between">
                                        <button
                                            onClick={handleRefinePalate}
                                            disabled={isRefining || refineNotes.trim().length < 2}
                                            className="px-4 py-2 font-condensed text-xs uppercase tracking-label font-bold bg-secondary text-secondary-foreground hover:bg-secondary/90 transition-colors rounded-sm shadow-bar disabled:opacity-50"
                                        >
                                            {isRefining ? 'Calibrating…' : 'Refine Coordinate &rarr;'}
                                        </button>
                                        <span className="font-mono text-3xs text-muted-foreground/60">
                                            Metered via AT Protocol
                                        </span>
                                    </div>
                                    {dossier && (
                                        <div className="mt-4 p-4 border-l-2 border-primary bg-secondary/10 space-y-1">
                                            <span className="label-caps text-primary block">Palate Colophon</span>
                                            <p className="font-serif text-sm italic text-foreground leading-relaxed">
                                                {dossier}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <p className="font-serif text-sm text-muted-foreground leading-relaxed">
                                        Sign in with your Bluesky / AT Protocol handle to unlock continuous AI palate refinement, custom ingredient tolerances, and personalized palate colophons.
                                    </p>
                                    <div className="pt-2">
                                        <ConnectBluesky
                                            user={user}
                                            vibeTags={vibeTags || {}}
                                            heroDrinkName={heroDrink?.name || ''}
                                            quadrant={getQuadrantName(user.x, user.y)}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Location Selector Widget */}
                        <div className="glass-dark border-primary/10 rounded-xl p-5 space-y-4 shadow-md coaster">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-primary" />
                                    <span className="font-mono text-2xs uppercase tracking-widest text-muted-foreground">Tasting Venue Context</span>
                                </div>
                                {selectedLocation && (
                                    <button
                                        onClick={() => setSelectedLocation(null)}
                                        className="text-3xs font-mono text-secondary hover:underline uppercase tracking-wider"
                                    >
                                        Reset Location
                                    </button>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={selectedLocation || ''}
                                    onChange={(e) => setSelectedLocation(e.target.value || null)}
                                    placeholder="Filter recommendations by venue (e.g. Sage Apothecary, The Nomad Bar)..."
                                    className="flex-1 rounded-lg border border-primary/10 bg-background/40 px-3.5 py-2 text-xs placeholder:text-muted-foreground/45 focus:outline-none focus:ring-1 focus:ring-primary/30 text-foreground"
                                />
                            </div>

                            {uniqueLocations.length > 0 && (
                                <div className="space-y-1">
                                    <span className="font-mono text-3xs text-muted-foreground/75 block">Previously Visited:</span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {uniqueLocations.slice(0, 5).map(loc => {
                                            const active = selectedLocation?.toLowerCase().trim() === loc.toLowerCase().trim();
                                            return (
                                                <button
                                                    key={loc}
                                                    onClick={() => setSelectedLocation(active ? null : loc)}
                                                    className={`px-2.5 py-1 rounded-full text-3xs font-mono border transition-all ${
                                                        active
                                                            ? 'bg-primary border-primary text-primary-foreground shadow-glow'
                                                            : 'border-primary/10 bg-background/20 text-muted-foreground hover:border-primary/30 hover:text-foreground'
                                                    }`}
                                                >
                                                    {loc}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Hero & 2D Flavor Map Section */}
                        <div className="space-y-6">
                            <p className="text-center text-muted-foreground/60 italic font-serif text-base">
                                {selectedLocation 
                                    ? `Curated for your palate at ${selectedLocation}.`
                                    : "Curated for your taste DNA."
                                }
                            </p>

                            <MiniFlavorMap user={user} topDrinks={topDrinks} />

                            {heroDrink && (
                                <HeroDrinkCard
                                    drink={heroDrink}
                                    userX={user.x}
                                    userY={user.y}
                                    userFilters={user.filters}
                                />
                            )}
                        </div>

                        {/* Rest of Go-To's */}
                        {restOfTopDrinks.length > 0 && (
                            <MenuSection
                                title={sections[0].title}
                                drinks={restOfTopDrinks}
                                userX={user.x}
                                userY={user.y}
                                userFilters={user.filters}
                                startRank={2}
                            />
                        )}

                        {/* Other context sections */}
                        {sections.slice(1).map(({ title, drinks }) => (
                            <MenuSection
                                key={title}
                                title={title}
                                drinks={drinks}
                                userX={user.x}
                                userY={user.y}
                                userFilters={user.filters}
                            />
                        ))}

                        <ConnectBluesky
                            user={user}
                            vibeTags={vibeTags || {}}
                            heroDrinkName={heroDrink?.name || ''}
                            quadrant={getQuadrantName(user.x, user.y)}
                        />
                    </div>
                )}

                {/* Tab 2: Coupe Log */}
                {activeTab === 'log' && (
                    <div className="animate-in fade-in duration-300">
                        <DrinkLogForm
                            recommendedDrinks={topDrinks.map(d => d.name)}
                            onPalateUpdated={(profile) => {
                                if (onPalateUpdated) {
                                    onPalateUpdated(profile);
                                }
                            }}
                            selectedLocation={selectedLocation}
                            history={history}
                            loadingHistory={loadingHistory}
                            onLogAdded={fetchHistory}
                        />
                    </div>
                )}

                {/* Tab 3: Drink Map */}
                {activeTab === 'map' && (
                    <div className="animate-in fade-in duration-300">
                        <DrinkMapView userLogs={history} />
                    </div>
                )}

                {/* Tab 4: AI Oracle */}
                {activeTab === 'oracle' && (
                    <div className="animate-in fade-in duration-300 p-8 text-center text-muted-foreground font-serif">
                        The AI Bartender Oracle is available directly in the conversational quiz mode.
                    </div>
                )}
            </div>
        </div>
    );
}

