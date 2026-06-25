'use client';

import { useState } from 'react';
import { useAtprotoContext } from './AtprotoProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Compass, Shield, Database, ArrowRight } from 'lucide-react';

interface MarketingSiteProps {
  onStartQuiz: () => void;
  onExploreAsGuest: () => void;
  hasLocalProfile: boolean;
}

export function MarketingSite({ onStartQuiz, onExploreAsGuest, hasLocalProfile }: MarketingSiteProps) {
  const { isEnabled, connecting, error, connect } = useAtprotoContext();
  const [inputHandle, setInputHandle] = useState('');

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputHandle.trim()) return;
    await connect(inputHandle.trim());
  };

  return (
    <div className="min-h-screen bg-background bar-texture flex flex-col justify-between px-6 py-12 md:py-20 text-foreground overflow-y-auto">
      {/* Header */}
      <div className="max-w-4xl mx-auto w-full flex justify-between items-center border-b border-primary/10 pb-6 mb-12">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full border border-primary/40 flex items-center justify-center font-serif text-primary text-sm font-bold shadow-[0_0_10px_rgba(212,148,26,0.15)] bg-card">
            CC
          </div>
          <span className="font-serif tracking-[0.15em] text-sm uppercase text-muted-foreground">The Crystal Coupe</span>
        </div>
        <div className="text-xs font-mono text-primary/60 border border-primary/20 rounded px-2.5 py-1 uppercase tracking-widest bg-primary/5">
          v2.0 Triangulator
        </div>
      </div>

      {/* Main Hero & Content Grid */}
      <div className="max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-12 gap-12 items-center flex-1 mb-16">
        {/* Left Column: Copy & Presentation */}
        <div className="md:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-secondary/20 bg-secondary/5 text-secondary text-xs uppercase tracking-wider font-semibold font-condensed">
            <Compass className="w-3.5 h-3.5" /> Stage 3 Triangulation Engine
          </div>
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1] text-primary">
            Deconstruct <br />
            <span className="text-foreground">Your Palate.</span>
          </h1>
          <p className="font-serif text-muted-foreground text-base md:text-lg leading-relaxed max-w-lg">
            A Mystic Pharmacy mapping your biological, structural, and environmental flavor preferences into a portable, decentralized profile.
          </p>

          {/* Triangulation Grid */}
          <div className="grid grid-cols-3 gap-3 border-t border-primary/10 pt-6">
            <div className="space-y-1.5">
              <span className="font-mono text-2xs uppercase tracking-widest text-primary/70">Stage 01</span>
              <h4 className="font-bold text-xs uppercase tracking-wider">Calibration</h4>
              <p className="text-3xs text-muted-foreground">Biological mapping of raw taste sensitivities.</p>
            </div>
            <div className="space-y-1.5">
              <span className="font-mono text-2xs uppercase tracking-widest text-secondary/70">Stage 02</span>
              <h4 className="font-bold text-xs uppercase tracking-wider">Architecture</h4>
              <p className="text-3xs text-muted-foreground">Structural preferences for texture, body, and acidity.</p>
            </div>
            <div className="space-y-1.5">
              <span className="font-mono text-2xs uppercase tracking-widest text-muted-foreground">Stage 03</span>
              <h4 className="font-bold text-xs uppercase tracking-wider">Context</h4>
              <p className="text-3xs text-muted-foreground">Adaptation layers matching mood and location.</p>
            </div>
          </div>
        </div>

        {/* Right Column: Connection Box & Actions */}
        <div className="md:col-span-5 w-full">
          <Card className="glass-dark border-primary/10 shadow-[0_8px_30px_rgb(0,0,0,0.4)]">
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <h3 className="font-serif text-lg font-bold text-primary">Establish Connection</h3>
                <p className="text-xs text-muted-foreground">
                  Connect your decentralized AT Protocol account to write drink logs, track locations, and port your profile.
                </p>
              </div>

              {/* AT Protocol Connection Form */}
              {isEnabled ? (
                <form onSubmit={handleConnect} className="space-y-3">
                  <div className="relative">
                    <input
                      type="text"
                      value={inputHandle}
                      onChange={(e) => setInputHandle(e.target.value)}
                      placeholder="your-handle.bsky.social"
                      className="w-full rounded-lg border border-primary/20 bg-background/50 px-3.5 py-2.5 text-sm placeholder:text-muted-foreground/45 focus:outline-none focus:ring-1 focus:ring-primary/40 text-foreground transition-all"
                      disabled={connecting}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={connecting || !inputHandle.trim()}
                    className="w-full tracking-widest uppercase text-xs font-bold py-5"
                  >
                    {connecting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>Connect Bluesky / ATProto <ArrowRight className="w-3.5 h-3.5 ml-1.5" /></>
                    )}
                  </Button>
                  {error && <p className="text-destructive text-3xs text-center">{error}</p>}
                </form>
              ) : (
                <div className="p-3 text-center border border-destructive/20 bg-destructive/5 rounded-md">
                  <p className="text-2xs text-destructive">AT Protocol integration is not enabled in this environment.</p>
                </div>
              )}

              {/* Guest / Quiz Actions */}
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-primary/5"></div>
                <span className="flex-shrink mx-4 text-3xs font-mono text-muted-foreground uppercase tracking-widest">Or</span>
                <div className="flex-grow border-t border-primary/5"></div>
              </div>

              <div className="space-y-2">
                {hasLocalProfile ? (
                  <Button
                    onClick={onExploreAsGuest}
                    variant="outline"
                    className="w-full tracking-widest uppercase text-xs border-primary/20 hover:bg-primary/5"
                  >
                    Enter Tasting Menu
                  </Button>
                ) : (
                  <Button
                    onClick={onStartQuiz}
                    variant="outline"
                    className="w-full tracking-widest uppercase text-xs border-primary/20 hover:bg-primary/5"
                  >
                    Begin Flavor Triangulation
                  </Button>
                )}
                <button
                  type="button"
                  onClick={onExploreAsGuest}
                  className="w-full text-center text-3xs text-muted-foreground hover:text-foreground font-mono transition-colors py-1"
                >
                  Browse Menu as Guest
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Explainer: Why AT Protocol? */}
      <div className="max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-primary/10 pt-12">
        <div className="space-y-3 p-4 rounded-lg bg-card/10 border border-primary/5">
          <div className="w-8 h-8 rounded bg-primary/5 border border-primary/20 flex items-center justify-center text-primary">
            <Shield className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-sm tracking-wider uppercase text-foreground">Decentralized Ownership</h3>
          <p className="text-xs text-muted-foreground font-serif leading-relaxed">
            Your taste profile belongs strictly to you. No centralized server holds your preferences hostage—your data is saved inside your own decentralized repo.
          </p>
        </div>
        <div className="space-y-3 p-4 rounded-lg bg-card/10 border border-primary/5">
          <div className="w-8 h-8 rounded bg-secondary/5 border border-secondary/20 flex items-center justify-center text-secondary">
            <Database className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-sm tracking-wider uppercase text-foreground">Decoupled Tasting Logs</h3>
          <p className="text-xs text-muted-foreground font-serif leading-relaxed">
            Log drinks ordered at specific locations (`app.crystalcoupe.drinkLog`). Your history is signed and appended to your data stream, readable by any client.
          </p>
        </div>
        <div className="space-y-3 p-4 rounded-lg bg-card/10 border border-primary/5">
          <div className="w-8 h-8 rounded bg-muted/20 border border-border flex items-center justify-center text-muted-foreground">
            <Compass className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-sm tracking-wider uppercase text-foreground">Portable Preferences</h3>
          <p className="text-xs text-muted-foreground font-serif leading-relaxed">
            Use your tasting baseline coordinates across other platforms, bar networks, or recipe applications. Connect with any Bluesky handle.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-4xl mx-auto w-full text-center text-3xs font-mono text-muted-foreground/40 mt-16 pt-6 border-t border-primary/5">
        The Crystal Coupe is built on the AT Protocol. Under construction by the Sommelier Guild.
      </div>
    </div>
  );
}
