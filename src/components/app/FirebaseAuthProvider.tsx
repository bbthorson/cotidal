'use client';

import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';

export function FirebaseAuthProvider({ children }: { children: React.ReactNode }) {
  const { user, loading, error } = useAuth();

  // For now, we'll just log errors. 
  // In a real app, we might show a 'Service Unavailable' screen if Firebase is critical.
  if (error) {
    console.error("Firebase Auth Error:", error);
  }

  // We show a simple loader while the initial anonymous auth is happening
  if (loading) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="font-serif italic text-primary/60">The Oracle is acknowledging your presence...</p>
        </div>
      </div>
    );
  }

  return (
    <div data-auth-status={user ? 'authenticated' : 'failed'} data-user-id={user?.uid}>
      {children}
    </div>
  );
}
