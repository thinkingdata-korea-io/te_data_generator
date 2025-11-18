'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Root Page - Redirect Handler
 * @brief: Redirects to login or dashboard based on authentication status
 */
export default function RootPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [isAuthenticated, isLoading, router]);

  // Loading state
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] scan-lines">
      <div className="text-center">
        <div className="text-terminal-cyan text-2xl mb-4 font-mono">
          <span className="cursor-blink">█</span> Initializing TE Platform...
        </div>
        <div className="text-[var(--text-dimmed)] text-sm">
          Please wait while we load your session
        </div>
      </div>
    </div>
  );
}
