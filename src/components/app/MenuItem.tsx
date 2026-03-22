'use client';

import { memo, useState, useEffect } from 'react';
import { AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';
import { fetchDrinkDetails, type CocktailDBResult } from '@/lib/cocktail-api';
import { explainDrinkMatch } from '@/app/actions/explain-drink';
import type { Drink } from '@/lib/data';

interface MenuItemProps {
    drink: Drink & { score: number; baseScore: number; distance: number };
    userX: number;
    userY: number;
    userFilters: string[];
}

export const MenuItem = memo(function MenuItem({ drink, userX, userY, userFilters }: MenuItemProps) {
    const [details, setDetails] = useState<CocktailDBResult | null>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [explanation, setExplanation] = useState<string | null>(null);
    const [loadingExplanation, setLoadingExplanation] = useState(false);
    const [expanded, setExpanded] = useState(false);

    // Lazy-fetch details only when expanded
    useEffect(() => {
        if (!expanded || details) return;
        let cancelled = false;
        setLoadingDetails(true);
        fetchDrinkDetails(drink.name).then(result => {
            if (!cancelled) {
                setDetails(result);
                setLoadingDetails(false);
            }
        });
        return () => { cancelled = true; };
    }, [expanded, drink.name, details]);

    const handleExplain = async () => {
        setLoadingExplanation(true);
        try {
            const text = await explainDrinkMatch(drink.name, {
                x: userX,
                y: userY,
                dislikesSmoke: userFilters.includes('noSmoke'),
                dislikesBitter: userFilters.includes('noBitter'),
            });
            setExplanation(text);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingExplanation(false);
        }
    };

    return (
        <AccordionItem
            value={drink.name}
            className="border-b border-primary/[0.06]"
            onFocus={() => setExpanded(true)}
        >
            <AccordionTrigger
                className="py-3 px-1 hover:no-underline hover:bg-primary/[0.03] transition-colors group"
                onClick={() => setExpanded(true)}
            >
                <div className="flex items-baseline gap-2 flex-1 min-w-0 pr-2">
                    <span className="font-headline text-sm font-bold text-primary truncate shrink-0">
                        {drink.name}
                    </span>
                    <span className="flex-1 border-b border-dotted border-muted-foreground/20 min-w-4" />
                    <span className="font-condensed text-xs uppercase tracking-wider text-muted-foreground shrink-0">
                        {drink.type}
                    </span>
                </div>
            </AccordionTrigger>
            <AccordionContent className="px-1">
                <div className="space-y-3">
                    {/* Tags as italic text */}
                    <p className="text-xs italic text-muted-foreground/70">
                        {drink.tags.slice(0, 3).join(', ')}
                    </p>

                    {/* Image */}
                    {loadingDetails ? (
                        <Skeleton className="w-full h-48 rounded-sm" />
                    ) : details ? (
                        <div className="relative w-full h-48 rounded-sm overflow-hidden">
                            <Image
                                src={details.strDrinkThumb}
                                alt={drink.name}
                                fill
                                sizes="(max-width: 640px) 100vw, 50vw"
                                className="object-cover"
                            />
                        </div>
                    ) : null}

                    {/* Instructions */}
                    {details && (
                        <p className="text-xs text-muted-foreground italic line-clamp-3">
                            &quot;{details.strInstructions}&quot;
                        </p>
                    )}

                    {/* Explanation */}
                    {explanation ? (
                        <p className="text-sm text-foreground/80">{explanation}</p>
                    ) : (
                        <button
                            onClick={handleExplain}
                            disabled={loadingExplanation}
                            className="font-condensed text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-primary underline underline-offset-4 decoration-primary/30 hover:decoration-primary/60 transition-colors py-2 flex items-center gap-2"
                        >
                            {loadingExplanation && <Loader2 className="h-3 w-3 animate-spin" />}
                            {loadingExplanation ? 'Thinking...' : 'Why This Drink?'}
                        </button>
                    )}
                </div>
            </AccordionContent>
        </AccordionItem>
    );
});
