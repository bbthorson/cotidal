'use client';

import { Wine, Compass, MapPin, Sparkles } from 'lucide-react';

export type ActiveTab = 'palate' | 'log' | 'map' | 'oracle';

interface AppNavigationProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  loggedCount?: number;
}

export function AppNavigation({ activeTab, onTabChange, loggedCount = 0 }: AppNavigationProps) {
  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'palate', label: 'Palate', icon: <Wine className="h-3.5 w-3.5" /> },
    { id: 'log', label: 'Log', icon: <Compass className="h-3.5 w-3.5" />, badge: loggedCount > 0 ? `${loggedCount}` : undefined },
    { id: 'map', label: 'Drink Map', icon: <MapPin className="h-3.5 w-3.5" /> },
    { id: 'oracle', label: 'Oracle', icon: <Sparkles className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="sticky top-0 z-30 mb-6 border-b border-border bg-background/95 py-2.5 backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex items-center gap-2 rounded-sm px-3.5 py-1.5 font-condensed text-xs uppercase tracking-label transition-colors ${
                isActive
                  ? 'border border-foreground bg-secondary font-bold text-secondary-foreground shadow-bar'
                  : 'border border-transparent text-muted-foreground hover:bg-card hover:text-foreground'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.badge && (
                <span
                  className={`rounded-sm px-1.5 py-0.5 font-condensed text-3xs font-bold ${
                    isActive ? 'bg-background text-foreground' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
