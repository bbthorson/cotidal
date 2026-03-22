'use client';

import { memo, useState, useEffect } from 'react';
import { AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
                <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                    <div className="min-w-0 flex-1 text-left">
                        <span className="font-headline text-sm font-bold text-primary truncate block">
                            {drink.name}
                        </span>
                        <span className="text-[11px] text-muted-foreground">{drink.type}</span>
                    </div>
                    <div className="flex gap-1 shrink-0">
                        {drink.tags.slice(0, 2).map(tag => (
                            <Badge key={tag} variant="outline" className="text-[9px] uppercase px-1.5 py-0 h-4 border-primary/10">
                                {tag}
                            </Badge>
                        ))}
                    </div>
                </div>
            </AccordionTrigger>
            <AccordionContent className="px-1">
                <div className="space-y-3">
                    {/* Image */}
                    {loadingDetails ? (
                        <Skeleton className="w-full h-48 rounded-lg" />
                    ) : details ? (
                        <div className="relative w-full h-48 rounded-lg overflow-hidden">
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
                        <Button
                            onClick={handleExplain}
                            disabled={loadingExplanation}
                            variant="outline"
                            size="sm"
                            className="w-full border-primary/20 text-primary hover:bg-primary/5 tracking-widest uppercase text-[10px] font-bold"
                        >
                            {loadingExplanation ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : null}
                            {loadingExplanation ? "Thinking..." : "Why This Drink?"}
                        </Button>
                    )}

                    {/* Future: Tried It feedback */}
                    {/* <TriedItButton drinkName={drink.name} /> */}
                </div>
            </AccordionContent>
        </AccordionItem>
    );
});
