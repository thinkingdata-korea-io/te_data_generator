'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Sidebar Component
 * @brief: Terminal-style navigation sidebar with sectioned menu (BUILD/SETTINGS/ADMIN)
 */

interface NavItem {
  nameKey: keyof typeof import('@/i18n/locales/ko').ko.nav;
  path: string;
  icon: string;
  roles?: ('admin' | 'user' | 'viewer')[];
}

interface NavSection {
  titleKey: keyof typeof import('@/i18n/locales/ko').ko.nav;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    titleKey: 'sectionBuild',
    items: [
      { nameKey: 'dashboard', path: '/dashboard', icon: '⌂', roles: ['admin', 'user', 'viewer'] },
      { nameKey: 'dataGenerator', path: '/dashboard/generator', icon: '⚡', roles: ['admin', 'user'] },
    ],
  },
  {
    titleKey: 'sectionSettings',
    items: [
      { nameKey: 'settings', path: '/dashboard/settings', icon: '⚙', roles: ['admin', 'user', 'viewer'] },
    ],
  },
  {
    titleKey: 'sectionAdmin',
    items: [
      { nameKey: 'userManagement', path: '/dashboard/users', icon: '👥', roles: ['admin'] },
      { nameKey: 'auditLogs', path: '/dashboard/audit', icon: '📜', roles: ['admin'] },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, hasPermission } = useAuth();
  const { t } = useLanguage();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Filter sections based on user permissions
  const filteredSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) => !item.roles || hasPermission(item.roles)
      ),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <motion.div
      initial={{ x: -300 }}
      animate={{ x: 0, width: isCollapsed ? 80 : 280 }}
      transition={{ duration: 0.3 }}
      className="h-screen bg-[var(--bg-secondary)] border-r-2 border-[var(--border-bright)] flex flex-col relative terminal-scrollbar"
    >
      {/* Header */}
      <div className="p-4 border-b border-[var(--border)]">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1"
            >
              <div className="text-terminal-cyan font-bold text-lg mb-1">TE_Platform</div>
              <div className="text-xs text-[var(--text-dimmed)]">v1.0.0</div>
            </motion.div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 hover:bg-[var(--bg-tertiary)] rounded transition-colors text-terminal-cyan"
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? '»' : '«'}
          </button>
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-tertiary)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--bg-primary)] border-2 border-[var(--accent-cyan)] flex items-center justify-center text-terminal-cyan font-bold terminal-glow overflow-hidden">
            {user?.profileImage ? (
              <img
                src={user.profileImage}
                alt={user.username}
                className="w-full h-full object-cover"
              />
            ) : (
              user?.username?.[0]?.toUpperCase() || 'U'
            )}
          </div>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 min-w-0"
            >
              <div className="text-sm font-semibold truncate text-[var(--text-primary)]">
                {user?.username}
              </div>
              <div className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    user?.role === 'admin'
                      ? 'bg-[var(--error-red)]'
                      : user?.role === 'user'
                      ? 'bg-[var(--accent-green)]'
                      : 'bg-[var(--accent-yellow)]'
                  }`}
                />
                {user?.role?.toUpperCase()}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Navigation - Sectioned */}
      <nav className="flex-1 overflow-y-auto p-2">
        {filteredSections.map((section, sectionIdx) => (
          <div key={section.titleKey} className={sectionIdx > 0 ? 'mt-6' : ''}>
            {/* Section Title */}
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="px-4 py-2 text-xs font-bold text-[var(--text-dimmed)] tracking-wider"
              >
                {t.nav[section.titleKey]}
              </motion.div>
            )}
            {isCollapsed && sectionIdx > 0 && (
              <div className="my-2 mx-auto w-8 h-px bg-[var(--border)]" />
            )}

            {/* Section Items */}
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded transition-all
                      ${
                        isActive
                          ? 'bg-[var(--bg-primary)] text-terminal-cyan border-l-2 border-[var(--accent-cyan)] terminal-glow'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                      }
                    `}
                  >
                    <span className="text-xl">{item.icon}</span>
                    {!isCollapsed && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-sm font-medium"
                      >
                        {t.nav[item.nameKey]}
                      </motion.span>
                    )}
                    {isActive && !isCollapsed && (
                      <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="ml-auto text-terminal-green text-xs"
                      >
                        &gt;_
                      </motion.span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-[var(--border)]">
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-xs text-[var(--text-dimmed)] space-y-1"
          >
            <div className="flex justify-between">
              <span>{t.dashboard.uptime}:</span>
              <span className="text-terminal-green">99.9%</span>
            </div>
            <div className="flex justify-between">
              <span>{t.dashboard.status}:</span>
              <span className="text-terminal-green">● {t.dashboard.online}</span>
            </div>
          </motion.div>
        )}
        {isCollapsed && (
          <div className="text-center">
            <div className="w-2 h-2 rounded-full bg-[var(--accent-green)] mx-auto cursor-blink" />
          </div>
        )}
      </div>
    </motion.div>
  );
}
