'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileManager } from '@/components/dashboard/FileManager';
import { useLanguage } from '@/contexts/LanguageContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function FilesPage() {
  const { t } = useLanguage();
  const [retentionDays, setRetentionDays] = useState({
    data: 7,
    excel: 30,
  });

  // 설정에서 보관 기간 가져오기
  useEffect(() => {
    fetch(`${API_URL}/api/settings`)
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
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[var(--bg-secondary)] border-2 border-[var(--border-bright)] rounded-lg p-6 terminal-glow"
      >
        <h1 className="text-2xl font-bold text-terminal-cyan mb-2">
          📁 {t.dashboard.fileManagement}
        </h1>
        <p className="text-[var(--text-secondary)] text-sm">
          {t.dashboard.fileManagementDesc}
        </p>
      </motion.div>

      {/* File Manager */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <FileManager retentionDays={retentionDays} />
      </motion.div>
    </div>
  );
}
