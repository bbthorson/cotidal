'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Star, Search, Filter, Navigation } from 'lucide-react';
import type { DrinkLogRecord } from '@/lib/atproto/lexicon';

interface DrinkPin {
  id: string;
  drinkName: string;
  venueName: string;
  city: string;
  latPct: number; // 0 - 100% position on interactive map grid
  lngPct: number; // 0 - 100% position on interactive map grid
  rating: number; // 0.0 to 10.0
  baseSpirit: string;
  tags: string[];
  glassware: string;
  description: string;
}

// Curated Dish-First Drink Map Pins across top cocktail destinations
const CURATED_DRINK_PINS: DrinkPin[] = [
  {
    id: '1',
    drinkName: 'Oaxaca Old Fashioned',
    venueName: 'Pegu Club',
    city: 'New York, NY',
    latPct: 35,
    lngPct: 42,
    rating: 9.6,
    baseSpirit: 'Mezcal',
    tags: ['smoky', 'spirit-forward', 'agave'],
    glassware: 'Rocks',
    description: 'Reposado Tequila, Artisanal Mezcal, Agave Nectar, Angostura & Mole Bitters.',
  },
  {
    id: '2',
    drinkName: 'Paper Plane',
    venueName: 'The NoMad Bar',
    city: 'New York, NY',
    latPct: 48,
    lngPct: 58,
    rating: 9.4,
    baseSpirit: 'Bourbon',
    tags: ['bitter', 'citrus', 'balanced'],
    glassware: 'Coupe',
    description: 'Bourbon, Aperol, Amaro Nonino, Fresh Lemon Juice.',
  },
  {
    id: '3',
    drinkName: 'Last Word',
    venueName: 'The Violet Hour',
    city: 'Chicago, IL',
    latPct: 28,
    lngPct: 25,
    rating: 9.7,
    baseSpirit: 'Gin',
    tags: ['herbal', 'citrus', 'classic'],
    glassware: 'Coupe',
    description: 'Equal parts Plymouth Gin, Green Chartreuse, Maraschino Liqueur, Lime.',
  },
  {
    id: '4',
    drinkName: 'Naked & Famous',
    venueName: 'Death & Co',
    city: 'New York, NY',
    latPct: 62,
    lngPct: 35,
    rating: 9.5,
    baseSpirit: 'Mezcal',
    tags: ['smoky', 'bitter', 'citrus'],
    glassware: 'Coupe',
    description: 'Mezcal, Yellow Chartreuse, Aperol, Fresh Lime Juice.',
  },
  {
    id: '5',
    drinkName: 'Toronto',
    venueName: 'Bar Raval',
    city: 'Toronto, ON',
    latPct: 20,
    lngPct: 65,
    rating: 9.2,
    baseSpirit: 'Rye',
    tags: ['bitter', 'spirit-forward'],
    glassware: 'Rocks',
    description: 'Canadian Rye Whisky, Fernet-Branca, Simple Syrup, Bitters.',
  },
  {
    id: '6',
    drinkName: 'Penicillin',
    venueName: 'Attaboy',
    city: 'New York, NY',
    latPct: 70,
    lngPct: 72,
    rating: 9.8,
    baseSpirit: 'Scotch',
    tags: ['smoky', 'spicy', 'refreshing'],
    glassware: 'Rocks',
    description: 'Blended Scotch, Islay Float, Honey-Ginger Syrup, Fresh Lemon.',
  },
  {
    id: '7',
    drinkName: 'Vieux Carré',
    venueName: 'The Carousel Bar',
    city: 'New Orleans, LA',
    latPct: 80,
    lngPct: 40,
    rating: 9.6,
    baseSpirit: 'Rye',
    tags: ['spirit-forward', 'complex', 'classic'],
    glassware: 'Rocks',
    description: 'Rye Whiskey, Cognac, Sweet Vermouth, Bénédictine, Peychaud’s & Angostura.',
  },
];

interface DrinkMapViewProps {
  userLogs?: DrinkLogRecord[];
}

export function DrinkMapView({ userLogs = [] }: DrinkMapViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpirit, setSelectedSpirit] = useState<string>('All');
  const [minRating, setMinRating] = useState<number>(8.0);
  const [activePin, setActivePin] = useState<DrinkPin | null>(CURATED_DRINK_PINS[0]);

  // Combine curated pins with user ATProto logs if geotagged
  const allPins = useMemo(() => {
    const userPins: DrinkPin[] = userLogs
      .filter(l => l.venue?.name || l.location)
      .map((l, idx) => ({
        id: `user-${idx}`,
        drinkName: l.drinkName,
        venueName: l.venue?.name || l.location || 'Logged Location',
        city: 'Your History',
        latPct: 30 + ((idx * 17) % 55),
        lngPct: 25 + ((idx * 23) % 55),
        rating: l.rating ?? (l.hedonicScale ? (l.hedonicScale - 1) * 1.25 : 8.0),
        baseSpirit: l.baseSpirit || 'Cocktail',
        tags: l.deviations || ['logged'],
        glassware: l.glassware || 'Coupe',
        description: l.notes || l.note || 'Logged via AT Protocol PDS',
      }));

    return [...CURATED_DRINK_PINS, ...userPins];
  }, [userLogs]);

  const filteredPins = useMemo(() => {
    return allPins.filter(pin => {
      const matchesSearch = 
        pin.drinkName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pin.venueName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pin.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSpirit = selectedSpirit === 'All' || pin.baseSpirit.toLowerCase() === selectedSpirit.toLowerCase();
      const matchesRating = pin.rating >= minRating;

      return matchesSearch && matchesSpirit && matchesRating;
    });
  }, [allPins, searchQuery, selectedSpirit, minRating]);

  return (
    <div className="space-y-6">
      {/* Header & Description */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-3xs font-mono uppercase tracking-widest">
          <Navigation className="w-3 h-3 text-primary" />
          Dish-First Cocktail Map
        </div>
        <h2 className="font-serif text-2xl font-bold text-foreground">Top Drink Pins Near You</h2>
        <p className="text-xs text-muted-foreground font-serif italic max-w-lg mx-auto">
          Discover specific cocktail masterpieces pinned at bars rather than generic venue-level ratings.
        </p>
      </div>

      {/* Filter Controls Bar */}
      <Card className="glass-dark border-primary/10 coaster">
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Search Input */}
            <div className="md:col-span-5 relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground/60" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search cocktail or venue (e.g. Paper Plane, Pegu Club)..."
                className="w-full rounded-lg border border-primary/10 bg-background/40 pl-9 pr-3 py-1.5 text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30 text-foreground"
              />
            </div>

            {/* Base Spirit Filter */}
            <div className="md:col-span-4 flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-muted-foreground" />
              <select
                value={selectedSpirit}
                onChange={(e) => setSelectedSpirit(e.target.value)}
                className="w-full rounded-lg border border-primary/10 bg-background/40 px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30 text-foreground font-mono"
              >
                <option value="All">All Base Spirits</option>
                <option value="Bourbon">Bourbon</option>
                <option value="Mezcal">Mezcal</option>
                <option value="Gin">Gin</option>
                <option value="Rye">Rye</option>
                <option value="Scotch">Scotch</option>
              </select>
            </div>

            {/* Minimum Rating Threshold Slider */}
            <div className="md:col-span-3 space-y-1">
              <div className="flex justify-between text-4xs font-mono text-muted-foreground">
                <span>Min Rating</span>
                <span className="text-primary font-bold">{minRating.toFixed(1)}+</span>
              </div>
              <input
                type="range"
                min="5.0"
                max="9.5"
                step="0.5"
                value={minRating}
                onChange={(e) => setMinRating(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-muted/50 rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interactive Map Grid Container */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Interactive Map Canvas */}
        <div className="md:col-span-7 relative aspect-video w-full border border-border rounded-sm overflow-hidden bg-card shadow-bar">
          {/* Grid Background Pattern */}
          <div 
            className="absolute inset-0 opacity-15"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--foreground) / 0.4) 1px, transparent 0)`,
              backgroundSize: '24px 24px'
            }}
          />

          <div className="absolute top-3 left-3 bg-card px-3 py-1 rounded-sm border border-border text-3xs font-condensed text-muted-foreground uppercase tracking-label flex items-center gap-1.5 shadow-bar">
            <span className="w-2 h-2 rounded-sm bg-secondary animate-pulse" />
            Live Dish Map ({filteredPins.length} Pins)
          </div>

          {/* Render Geolocation Drink Pins */}
          {filteredPins.map((pin) => {
            const isActive = activePin?.id === pin.id;
            return (
              <button
                key={pin.id}
                onClick={() => setActivePin(pin)}
                style={{ top: `${pin.latPct}%`, left: `${pin.lngPct}%` }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 group transition-all duration-300 z-10 ${
                  isActive ? 'scale-125 z-30' : 'hover:scale-110'
                }`}
              >
                <div className={`flex items-center gap-1 px-2 py-1 rounded-sm border shadow-bar font-condensed text-3xs uppercase tracking-label transition-all ${
                  isActive 
                    ? 'bg-secondary text-secondary-foreground border-foreground font-bold'
                    : 'bg-card text-foreground border-border group-hover:border-primary'
                }`}>
                  <MapPin className="w-3 h-3 text-primary fill-primary/30" />
                  <span className="truncate max-w-24">{pin.drinkName}</span>
                  <span className="text-3xs opacity-80">({pin.rating.toFixed(1)})</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Drink Pin Detail Card */}
        <div className="md:col-span-5 space-y-4">
          {activePin ? (
            <Card className="glass-dark border-primary/20 coaster">
              <CardContent className="p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-4xs font-mono text-primary uppercase tracking-widest block">
                      {activePin.baseSpirit} Cocktail
                    </span>
                    <h3 className="font-serif text-xl font-bold text-foreground">{activePin.drinkName}</h3>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-secondary" />
                      <span>{activePin.venueName} • {activePin.city}</span>
                    </div>
                  </div>

                  <div className="text-right bg-primary/10 border border-primary/20 px-3 py-1 rounded-lg">
                    <div className="flex items-center gap-1 font-mono text-base font-bold text-primary">
                      <Star className="w-4 h-4 fill-primary text-primary" />
                      {activePin.rating.toFixed(1)}
                    </div>
                    <span className="text-4xs font-mono text-muted-foreground block">Precision Rating</span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed font-serif italic border-y border-primary/10 py-3">
                  &ldquo;{activePin.description}&rdquo;
                </p>

                <div className="space-y-2">
                  <div className="flex justify-between text-3xs font-mono">
                    <span className="text-muted-foreground">Glassware:</span>
                    <span className="text-foreground font-bold">{activePin.glassware}</span>
                  </div>

                  <div className="flex flex-wrap gap-1 pt-1">
                    {activePin.tags.map(tag => (
                      <span key={tag} className="px-2 py-0.5 rounded-full bg-secondary/10 border border-secondary/20 text-4xs font-mono uppercase tracking-wider text-secondary">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="p-8 text-center text-xs font-serif text-muted-foreground border border-border rounded-sm bg-card shadow-bar">
              Click any pin on the map to inspect dish-level rating and venue details.
            </div>
          )}

          {/* List View of Matches */}
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            <span className="label-caps block px-1">
              Top Ranked Dishes ({filteredPins.length})
            </span>
            {filteredPins.slice(0, 5).map(pin => (
              <button
                key={pin.id}
                onClick={() => setActivePin(pin)}
                className={`w-full text-left p-3 rounded-lg border transition-all text-xs flex justify-between items-center ${
                  activePin?.id === pin.id
                    ? 'border-primary bg-primary/10 text-foreground font-bold'
                    : 'border-primary/5 bg-background/20 text-muted-foreground hover:border-primary/20'
                }`}
              >
                <div>
                  <p className="text-foreground font-serif">{pin.drinkName}</p>
                  <p className="text-4xs font-mono text-muted-foreground">{pin.venueName}</p>
                </div>
                <span className="font-mono text-primary font-bold">★ {pin.rating.toFixed(1)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
