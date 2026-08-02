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
import { getConnectedDrinkLogs } from '@/lib/api-client';
import { MapPin } from 'lucide-react';
import type { UserProfile } from '@/hooks/useDiscoveryQuiz';
import type { DrinkLogRecord } from '@/lib/atproto/lexicon';

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
    const [history, setHistory] = useState<DrinkLogRecord[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

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
                    .map(h => h.location)
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

        const minimalLogs = history.map(log => ({
            drinkName: log.drinkName,
            location: log.location,
            hedonicScale: log.hedonicScale || (log.rating ? Math.round(log.rating * 0.8 + 1) : 5),
            createdAt: log.createdAt,
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
                                    <span className="font-mono text-[9px] text-muted-foreground/75 block">Previously Visited:</span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {uniqueLocations.slice(0, 5).map(loc => {
                                            const active = selectedLocation?.toLowerCase().trim() === loc.toLowerCase().trim();
                                            return (
                                                <button
                                                    key={loc}
                                                    onClick={() => setSelectedLocation(active ? null : loc)}
                                                    className={`px-2.5 py-1 rounded-full text-3xs font-mono border transition-all ${
                                                        active
                                                            ? 'bg-primary border-primary text-primary-foreground shadow-[0_0_8px_rgba(212,148,26,0.15)]'
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

