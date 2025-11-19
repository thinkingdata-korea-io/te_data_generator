'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import LanguageSwitcher from '@/components/LanguageSwitcher';

/**
 * Header Component
 * @brief: Terminal-style header with user info, time, and logout
 */
export function Header() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [currentTime, setCurrentTime] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Update time every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const formatted = now.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setCurrentTime(formatted);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="h-16 bg-[var(--bg-secondary)] border-b-2 border-[var(--border-bright)] px-6 flex items-center justify-between">
      {/* Left: Breadcrumb / Terminal Prompt */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm font-mono">
          <span className="text-terminal-green">{user?.username}</span>
          <span className="text-[var(--text-dimmed)]">@</span>
          <span className="text-terminal-cyan">te-platform</span>
          <span className="text-[var(--text-dimmed)]">:</span>
          <span className="text-terminal-magenta">~</span>
          <span className="text-[var(--accent-yellow)]">$</span>
        </div>
      </div>

      {/* Right: Time, Language, User Menu */}
      <div className="flex items-center gap-6">
        {/* System Time */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-[var(--text-dimmed)]">SYS_TIME</span>
          <span className="text-terminal-cyan font-mono">{currentTime}</span>
          <span className="w-2 h-2 bg-[var(--accent-green)] rounded-full cursor-blink" />
        </div>

        {/* Language Switcher */}
        <LanguageSwitcher />

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 px-4 py-2 rounded border border-[var(--border)] hover:border-[var(--accent-cyan)] hover:bg-[var(--bg-tertiary)] transition-all"
          >
            <div className="w-8 h-8 rounded-full bg-[var(--bg-primary)] border-2 border-[var(--accent-cyan)] flex items-center justify-center text-terminal-cyan font-bold text-sm terminal-glow">
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="text-left">
              <div className="text-sm font-medium text-[var(--text-primary)]">
                {user?.username}
              </div>
              <div className="text-xs text-[var(--text-dimmed)]">
                {user?.role?.toUpperCase()}
              </div>
            </div>
            <motion.span
              animate={{ rotate: showUserMenu ? 180 : 0 }}
              className="text-[var(--text-secondary)]"
            >
              ▼
            </motion.span>
          </button>

          {/* Dropdown Menu */}
          <AnimatePresence>
            {showUserMenu && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 mt-2 w-64 bg-[var(--bg-tertiary)] border-2 border-[var(--border-bright)] rounded-lg overflow-hidden terminal-glow z-50"
              >
                {/* User Info */}
                <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
                  <div className="text-sm font-semibold text-[var(--text-primary)]">
                    {user?.fullName || user?.username}
                  </div>
                  <div className="text-xs text-[var(--text-dimmed)] mt-1">
                    {user?.email}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${
                        user?.role === 'admin'
                          ? 'bg-[var(--error-red)]'
                          : user?.role === 'user'
                          ? 'bg-[var(--accent-green)]'
                          : 'bg-[var(--accent-yellow)]'
                      }`}
                    />
                    <span className="text-xs text-[var(--text-secondary)]">
                      Role: <span className="text-terminal-cyan">{user?.role}</span>
                    </span>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="p-2">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      router.push('/dashboard/settings');
                    }}
                    className="w-full text-left px-4 py-2 rounded text-sm text-[var(--text-primary)] hover:bg-[var(--bg-primary)] hover:text-terminal-cyan transition-all flex items-center gap-2"
                  >
                    <span>⚙</span> Settings
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 rounded text-sm text-[var(--error-red)] hover:bg-[var(--bg-primary)] transition-all flex items-center gap-2"
                  >
                    <span>⏻</span> Logout
                  </button>
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-[var(--border)] bg-[var(--bg-secondary)]">
                  <div className="text-xs text-[var(--text-dimmed)]">
                    Last login: {user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'N/A'}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Close menu when clicking outside */}
      {showUserMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </header>
  );
}
