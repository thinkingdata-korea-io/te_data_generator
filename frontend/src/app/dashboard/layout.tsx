'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { ScanLines } from '@/components/effects/ScanLines';
import { LanguageProvider } from '@/contexts/LanguageContext';

/**
 * Dashboard Layout
 * @brief: Main layout wrapper for authenticated dashboard pages
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <LanguageProvider>
        <div className="flex h-screen overflow-hidden bg-[var(--bg-primary)]">
          {/* Scan Lines Effect */}
          <ScanLines />

          {/* Sidebar */}
          <Sidebar />

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <Header />

            {/* Page Content */}
            <main className="flex-1 overflow-auto terminal-scrollbar p-6">
              {children}
            </main>
          </div>
        </div>
      </LanguageProvider>
    </ProtectedRoute>
  );
}
