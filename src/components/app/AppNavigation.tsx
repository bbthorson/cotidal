'use client';

import { Wine, Compass, MapPin, Bot } from 'lucide-react';

export type ActiveTab = 'palate' | 'log' | 'map' | 'oracle';

interface AppNavigationProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  loggedCount?: number;
}

export function AppNavigation({ activeTab, onTabChange, loggedCount = 0 }: AppNavigationProps) {
  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'palate', label: 'Palate & DNA', icon: <Wine className="w-4 h-4" /> },
    { id: 'log', label: 'Coupe Log', icon: <Compass className="w-4 h-4" />, badge: loggedCount > 0 ? `${loggedCount}` : undefined },
    { id: 'map', label: 'Drink Map', icon: <MapPin className="w-4 h-4" /> },
    { id: 'oracle', label: 'AI Oracle', icon: <Bot className="w-4 h-4" /> },
  ];

  return (
    <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-primary/10 py-2.5 px-4 mb-6">
      <div className="max-w-4xl mx-auto flex items-center justify-center gap-1 sm:gap-2">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono transition-all duration-200 ${
                isActive
                  ? 'bg-primary text-primary-foreground font-bold shadow-[0_0_12px_rgba(212,148,26,0.25)] border border-amber-300/40'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/40 border border-transparent'
              }`}
            >
              {item.icon}
              <span className="hidden sm:inline">{item.label}</span>
              {item.badge && (
                <span className={`px-1.5 py-0.2 rounded-full text-4xs font-mono font-bold ${
                  isActive ? 'bg-primary-foreground text-primary' : 'bg-primary/20 text-primary'
                }`}>
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
