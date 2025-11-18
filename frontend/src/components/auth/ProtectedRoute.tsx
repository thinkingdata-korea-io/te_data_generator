'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, UserRole } from '@/contexts/AuthContext';

/**
 * ProtectedRoute Component
 * @brief: Wrapper component that protects routes from unauthorized access
 */
interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: UserRole[];
}

export function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, hasPermission } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (requiredRoles && !hasPermission(requiredRoles)) {
        router.push('/dashboard'); // Redirect to dashboard if no permission
      }
    }
  }, [isAuthenticated, isLoading, requiredRoles, hasPermission, router]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="text-center">
          <div className="text-terminal-cyan text-2xl mb-4">
            <span className="cursor-blink">█</span> Initializing...
          </div>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated or no permission
  if (!isAuthenticated || (requiredRoles && !hasPermission(requiredRoles))) {
    return null;
  }

  return <>{children}</>;
}
