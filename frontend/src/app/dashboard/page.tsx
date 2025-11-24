'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FileManager } from '@/components/dashboard/FileManager';

/**
 * Dashboard Home Page
 * @brief: Main dashboard with quick launch, announcements, and file management
 */
export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [retentionDays, setRetentionDays] = useState({
    data: 7,
    excel: 30,
  });

  // 설정에서 보관 기간 가져오기
  useEffect(() => {
    fetch('http://localhost:3001/api/settings')
      .then((res) => res.json())
      .then((settings) => {
        setRetentionDays({
          data: parseInt(settings.DATA_RETENTION_DAYS || '7'),
          excel: parseInt(settings.EXCEL_RETENTION_DAYS || '30'),
        });
      })
      .catch((error) => console.error('Failed to fetch settings:', error));
  }, []);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[var(--bg-secondary)] border-2 border-[var(--border-bright)] rounded-lg p-6 terminal-glow"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-terminal-cyan mb-2">
              {t.dashboard.welcomeBack}, {user?.username || 'User'}
            </h1>
            <p className="text-[var(--text-secondary)] text-sm">
              {t.dashboard.platformVersion}
            </p>
          </div>
          <div className="text-right text-xs text-[var(--text-dimmed)]">
            <div>{t.dashboard.role}: <span className="text-terminal-green">{user?.role?.toUpperCase()}</span></div>
            <div>{t.dashboard.session}: <span className="text-terminal-cyan">{t.dashboard.active}</span></div>
          </div>
        </div>
      </motion.div>

      {/* Announcements */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-[var(--bg-secondary)] border-2 border-[var(--border-bright)] rounded-lg p-6"
      >
        <h2 className="text-lg font-bold text-terminal-green mb-4 flex items-center gap-2">
          <span>📢</span> {t.dashboard.announcements}
        </h2>
        <div className="space-y-3">
          <div className="bg-[var(--bg-tertiary)] border border-[var(--border)] rounded p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs px-2 py-1 bg-[var(--accent-cyan)] text-[var(--bg-primary)] rounded font-bold">
                {t.dashboard.newBadge}
              </span>
              <span className="text-xs text-[var(--text-dimmed)]">{t.dashboard.announcement1Date}</span>
            </div>
            <div className="text-sm text-[var(--text-primary)] mb-1 font-semibold">
              {t.dashboard.announcement1Title}
            </div>
            <div className="text-xs text-[var(--text-secondary)]">
              {t.dashboard.announcement1Desc}
            </div>
          </div>

          <div className="bg-[var(--bg-tertiary)] border border-[var(--border)] rounded p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs px-2 py-1 bg-[var(--accent-yellow)] text-[var(--bg-primary)] rounded font-bold">
                {t.dashboard.tipBadge}
              </span>
              <span className="text-xs text-[var(--text-dimmed)]">{t.dashboard.tipLabel}</span>
            </div>
            <div className="text-sm text-[var(--text-primary)] mb-1 font-semibold">
              {t.dashboard.tipTitle}
            </div>
            <div className="text-xs text-[var(--text-secondary)]">
              {t.dashboard.tipDesc}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick Launch & External Links */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        {/* Quick Launch */}
        <div className="bg-[var(--bg-secondary)] border-2 border-[var(--border-bright)] rounded-lg p-6">
          <h2 className="text-lg font-bold text-terminal-cyan mb-4 flex items-center gap-2">
            <span>⚡</span> {t.dashboard.quickLaunch}
          </h2>
          <button
            onClick={() => router.push('/dashboard/generator')}
            className="w-full px-6 py-4 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded hover:border-[var(--accent-cyan)] hover:terminal-glow transition-all text-left"
          >
            <div className="text-2xl mb-2">⚡</div>
            <div className="text-sm font-semibold text-[var(--text-primary)]">
              {t.dashboard.dataGeneratorTitle}
            </div>
            <div className="text-xs text-[var(--text-dimmed)] mt-1">
              {t.dashboard.dataGeneratorDesc}
            </div>
          </button>
        </div>

        {/* External Links */}
        <div className="bg-[var(--bg-secondary)] border-2 border-[var(--border-bright)] rounded-lg p-6">
          <h2 className="text-lg font-bold text-terminal-cyan mb-4 flex items-center gap-2">
            <span>🔗</span> {t.dashboard.externalLinks}
          </h2>
          <div className="space-y-3">
            <a
              href="https://www.thinkingdata.kr"
              target="_blank"
              rel="noopener noreferrer"
              className="block px-6 py-4 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded hover:border-[var(--accent-cyan)] hover:terminal-glow transition-all"
            >
              <div className="text-2xl mb-2">🏢</div>
              <div className="text-sm font-semibold text-[var(--text-primary)]">
                {t.dashboard.officialWebsite}
              </div>
              <div className="text-xs text-[var(--text-dimmed)] mt-1">
                ThinkingData Korea
              </div>
            </a>
            <a
              href="https://te-web-naver.thinkingdata.kr/"
              target="_blank"
              rel="noopener noreferrer"
              className="block px-6 py-4 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded hover:border-[var(--accent-cyan)] hover:terminal-glow transition-all"
            >
              <div className="text-2xl mb-2">🚀</div>
              <div className="text-sm font-semibold text-[var(--text-primary)]">
                {t.dashboard.thinkingEngine}
              </div>
              <div className="text-xs text-[var(--text-dimmed)] mt-1">
                Thinking Engine Platform
              </div>
            </a>
            <div className="px-6 py-4 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded opacity-50">
              <div className="text-2xl mb-2">📋</div>
              <div className="text-sm font-semibold text-[var(--text-dimmed)]">
                {t.dashboard.comingSoon}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* File Management */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <FileManager retentionDays={retentionDays} />
      </motion.div>
    </div>
  );
}
