'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ProgressData } from '../types';
import LoadingDots from './LoadingDots';

interface AIAnalysisProgressProps {
  progress: ProgressData | null;
}

export default function AIAnalysisProgress({ progress }: AIAnalysisProgressProps) {
  const { t } = useLanguage();
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);

  // Helper function to replace "..." with LoadingDots component
  const renderMessageWithDots = (message: string) => {
    if (!message) return message;
    const parts = message.split('...');
    return parts.map((part, idx) => (
      <span key={idx}>
        {part}
        {idx < parts.length - 1 && <LoadingDots />}
      </span>
    ));
  };

  if (!progress) {
    return null;
  }

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded p-8 terminal-glow">
      <h2 className="text-2xl font-bold mb-6 text-terminal-cyan font-mono flex items-center gap-2">
        <span className="animate-pulse">🤖</span> {t.generator.aiAnalysisInProgress}
      </h2>

      {/* Current Phase Badge */}
      <div className="mb-4 flex items-center gap-3">
        <span className="inline-block px-4 py-2 rounded text-sm font-semibold bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] border border-[var(--accent-cyan)] font-mono animate-pulse-border">
          {progress.progress < 30 ? <>📋 Excel 파싱 중<LoadingDots /></> :
           progress.progress < 60 ? <>🤖 AI 전략 분석 중<LoadingDots /></> :
           progress.progress < 90 ? <>🎯 사용자 세그먼트 생성 중<LoadingDots /></> :
           <>⚡ 분석 완료 중<LoadingDots /></>}
        </span>
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-[var(--accent-cyan)] rounded-full animate-bounce-dot" style={{ animationDelay: '0ms' }}></span>
          <span className="w-2 h-2 bg-[var(--accent-cyan)] rounded-full animate-bounce-dot" style={{ animationDelay: '150ms' }}></span>
          <span className="w-2 h-2 bg-[var(--accent-cyan)] rounded-full animate-bounce-dot" style={{ animationDelay: '300ms' }}></span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-[var(--text-secondary)] font-mono">{t.generator.progress}</span>
          <span className="text-sm font-bold text-[var(--accent-cyan)] font-mono">{progress.progress}%</span>
        </div>
        <div className="w-full bg-[var(--bg-tertiary)] rounded h-4 overflow-hidden border border-[var(--border)]">
          <div
            className="bg-[var(--accent-cyan)] h-4 transition-all duration-500 relative overflow-hidden animate-pulse-subtle"
            style={{ width: `${progress.progress}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-cyan)]/80"></div>
          </div>
        </div>
      </div>

      {/* Current Message */}
      <div className="p-4 bg-[var(--bg-tertiary)] rounded border border-[var(--border)] mb-4">
        <p className="text-[var(--text-primary)] font-mono text-sm">&gt; {renderMessageWithDots(progress.message)}</p>
      </div>

      {/* AI Analysis Detailed Logs - Collapsible */}
      {progress.details && progress.details.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
            className="w-full flex items-center justify-between text-sm font-semibold text-[var(--text-secondary)] mb-2 font-mono hover:text-[var(--text-primary)] transition-colors p-2 rounded hover:bg-[var(--bg-tertiary)]"
          >
            <span>{t.generator.detailedProgress}</span>
            <span className="text-[var(--accent-cyan)] transition-transform duration-200" style={{ transform: isDetailsExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
              ▶
            </span>
          </button>

          {isDetailsExpanded && (
            <div className="animate-fade-in">
              <div className="bg-[var(--bg-primary)] rounded border border-[var(--border)] p-4 max-h-96 overflow-y-auto terminal-scrollbar">
                <div className="space-y-0.5">
                  {progress.details.map((detail: string, idx: number) => (
                    <div key={idx} className="text-xs text-[var(--text-secondary)] font-mono">
                      <span className="text-[var(--accent-cyan)]">&gt;</span> {renderMessageWithDots(detail)}
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-xs text-[var(--text-dimmed)] mt-2 font-mono">
                {progress.details.length} {t.generator.autoUpdate}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
