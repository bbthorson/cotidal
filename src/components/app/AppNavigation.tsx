import { menu } from '@/lib/copy';
import { cn } from '@/lib/utils';

export type ActiveTab = 'menu' | 'map';

interface AppNavigationProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

const TABS: ActiveTab[] = ['menu', 'map'];

/**
 * Menu · Map: two views of one coordinate. A bar along the bottom of a phone,
 * within thumb reach; a ruled strip above the content from `lg` up. Logging a
 * pour is a destination of its own (/log, in the header), not a third tab: it
 * used to be both, two forms with one name. The Palate and Oracle tabs are
 * gone too: the first was a dashboard in front of the menu, the second led
 * nowhere.
 */
export function AppNavigation({ activeTab, onTabChange }: AppNavigationProps) {
  return (
    <nav
      aria-label={menu.tabsLabel}
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-2 border-t border-foreground bg-background pb-safe-b lg:static lg:mb-8 lg:border lg:pb-0"
    >
      {TABS.map((tab) => {
        const active = tab === activeTab;
        return (
          <button
            key={tab}
            type="button"
            onClick={() => onTabChange(tab)}
            aria-current={active ? 'page' : undefined}
            className={cn(
              '-mt-px flex min-h-14 items-center justify-center border-t-3 font-condensed text-meta uppercase tracking-label transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring lg:mt-0 lg:min-h-12',
              active
                ? 'border-primary font-bold text-foreground'
                : 'border-transparent font-semibold text-muted-foreground hover:text-foreground'
            )}
          >
            {menu.tabs[tab]}
          </button>
        );
      })}
    </nav>
  );
}
