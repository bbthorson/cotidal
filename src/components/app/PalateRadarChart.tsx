'use client';

import { useMemo } from 'react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, Tooltip } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { extractSensoryProfile, calculatePalateArchetype } from '@/lib/archetypes';
import type { PalateRecord, SensoryProfile } from '@/lib/atproto/lexicon';
import type { UserProfile } from '@/hooks/useDiscoveryQuiz';

interface PalateRadarChartProps {
  palate?: PalateRecord | UserProfile | null;
  className?: string;
  customSensoryProfile?: SensoryProfile;
}

export function PalateRadarChart({ palate, className, customSensoryProfile }: PalateRadarChartProps) {
  const profile = useMemo(() => {
    if (customSensoryProfile) return customSensoryProfile;
    return extractSensoryProfile(palate);
  }, [palate, customSensoryProfile]);

  const archetype = useMemo(() => {
    return calculatePalateArchetype(palate);
  }, [palate]);

  const chartData = useMemo(() => [
    { subject: 'Bitter', value: Number(profile.bitter.toFixed(1)), fullMark: 5 },
    { subject: 'Sweet', value: Number(profile.sweet.toFixed(1)), fullMark: 5 },
    { subject: 'Sour', value: Number(profile.sour.toFixed(1)), fullMark: 5 },
    { subject: 'Spirit-Forward', value: Number(profile.spiritForward.toFixed(1)), fullMark: 5 },
    { subject: 'Citrus', value: Number(profile.citrus.toFixed(1)), fullMark: 5 },
    { subject: 'Herbal', value: Number(profile.herbal.toFixed(1)), fullMark: 5 },
  ], [profile]);

  return (
    <Card className={`glass-dark border-primary/10 coaster overflow-hidden ${className || ''}`}>
      <CardContent className="p-5 space-y-5">
        {/* Header & Archetype Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-primary/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">{archetype.icon}</span>
              <h3 className="font-serif text-lg font-bold text-foreground">Palate DNA & Sensory Profile</h3>
            </div>
            <p className="text-3xs font-mono text-muted-foreground uppercase tracking-widest mt-0.5">
              6-Axis Flavor Triangulation
            </p>
          </div>

          <div 
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-mono font-bold"
            style={{ 
              backgroundColor: `${archetype.colorHex}15`,
              borderColor: `${archetype.colorHex}40`,
              color: archetype.colorHex
            }}
          >
            <span>{archetype.icon}</span>
            <span>{archetype.title}</span>
          </div>
        </div>

        {/* Radar Chart Visualizer */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-7 h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
                <PolarGrid stroke="rgba(212, 148, 26, 0.15)" />
                <PolarAngleAxis 
                  dataKey="subject" 
                  tick={{ fill: 'hsl(35, 30%, 82%)', fontSize: 10, fontFamily: 'monospace' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 18, 24, 0.95)',
                    borderColor: 'rgba(212, 148, 26, 0.3)',
                    borderRadius: '8px',
                    color: '#f3e8d3',
                    fontSize: '11px',
                    fontFamily: 'monospace'
                  }}
                  formatter={(val: number) => [`${val} / 5.0`, 'Sensory Score']}
                />
                <Radar
                  name="Taste DNA"
                  dataKey="value"
                  stroke={archetype.colorHex}
                  fill={archetype.colorHex}
                  fillOpacity={0.4}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Archetype Details & Traits */}
          <div className="md:col-span-5 space-y-3 bg-background/20 p-3.5 rounded-lg border border-primary/5 text-xs">
            <div>
              <span className="text-3xs font-mono uppercase tracking-widest text-primary block">Persona Archetype</span>
              <p className="font-bold text-foreground text-sm font-serif">{archetype.title}</p>
              <p className="text-muted-foreground text-3xs italic font-serif mt-0.5">{archetype.subtitle}</p>
            </div>

            <p className="text-3xs text-muted-foreground/90 leading-relaxed font-sans">
              {archetype.description}
            </p>

            <div className="space-y-1 pt-1">
              <span className="text-4xs font-mono uppercase tracking-widest text-muted-foreground/75 block">Key Traits:</span>
              <div className="flex flex-wrap gap-1">
                {archetype.keyTraits.map(trait => (
                  <span 
                    key={trait} 
                    className="px-2 py-0.5 rounded text-4xs font-mono border bg-primary/5 border-primary/15 text-foreground"
                  >
                    {trait}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-1 pt-1">
              <span className="text-4xs font-mono uppercase tracking-widest text-muted-foreground/75 block">Ideal Classics:</span>
              <p className="text-3xs font-serif text-primary/90 italic">
                {archetype.recommendedDrinks.join(' • ')}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
