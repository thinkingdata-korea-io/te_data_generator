'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ProgressData } from '../types';

interface DataGenerationProgressProps {
  progress: ProgressData | null;
}

export default function DataGenerationProgress({ progress }: DataGenerationProgressProps) {
  const { t } = useLanguage();
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);

  if (!progress || progress.status === 'error') {
    return null;
  }

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded p-8 terminal-glow">
      <h2 className="text-2xl font-bold mb-6 text-terminal-cyan font-mono flex items-center gap-2">
        <span className="animate-pulse">⚡</span> {t.generator.generatingData}
      </h2>

      {/* Current Phase Badge */}
      <div className="mb-4 flex items-center gap-3">
        <span className={`inline-block px-4 py-2 rounded text-sm font-semibold bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] border border-[var(--accent-cyan)] font-mono animate-pulse-border`}>
          {progress.status === 'parsing' ? '📋 Excel 파싱 중' :
           progress.status === 'analyzing' ? '🤖 AI 분석 중' :
           progress.status === 'generating' ? '📊 데이터 생성 중' :
           progress.status === 'saving' ? '💾 저장 중' :
           progress.step || `⋯ ${t.generator.processing}`}
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
        <p className="text-[var(--text-primary)] font-mono text-sm">&gt; {progress.message}</p>
      </div>

      {/* Detailed Progress Logs */}
      {progress.details && progress.details.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-[var(--text-primary)] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] border border-[var(--border)] hover:border-[var(--accent-cyan)] rounded font-mono transition-all cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <span className="text-[var(--accent-cyan)] text-xl">{isDetailsExpanded ? '▼' : '▶'}</span>
              {t.generator.detailedProgress}
            </span>
            <span className="text-xs text-[var(--text-dimmed)]">
              {isDetailsExpanded ? '접기' : '펼치기'}
            </span>
          </button>
          {isDetailsExpanded && (
            <>
              <div className="bg-[var(--bg-primary)] rounded border border-[var(--border)] p-4 max-h-96 overflow-y-auto terminal-scrollbar">
                <div className="space-y-0.5">
                  {progress.details.map((detail: string, idx: number) => (
                    <div key={idx} className="text-xs font-mono animate-fade-in">
                      <span className={`${
                        detail.includes('✅') || detail.includes('완료') ? 'text-[var(--accent-green)]' :
                        detail.includes('⚠️') || detail.includes('경고') ? 'text-[var(--accent-yellow)]' :
                        detail.includes('❌') || detail.includes('오류') ? 'text-[var(--error-red)]' :
                        detail.includes('⚡') || detail.includes('AI') ? 'text-[var(--accent-cyan)]' :
                        detail.includes('▦') || detail.includes('Phase') ? 'text-[var(--accent-magenta)]' :
                        detail.startsWith('  ') ? 'text-[var(--text-dimmed)]' :
                        'text-[var(--text-secondary)]'
                      }`}>
                        {detail}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-xs text-[var(--text-dimmed)] mt-2 font-mono">
                {progress.details.length}{t.generator.autoUpdate}
              </p>
            </>
          )}
        </div>
      )}

      {/* LogBus Transfer Logs (for sending status) */}
      {progress.logs && progress.logs.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-[var(--text-primary)] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] border border-[var(--border)] hover:border-[var(--accent-magenta)] rounded font-mono transition-all cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <span className="text-[var(--accent-magenta)] text-xl">{isDetailsExpanded ? '▼' : '▶'}</span>
              📡 LogBus 전송 로그
            </span>
            <span className="text-xs text-[var(--text-dimmed)]">
              {isDetailsExpanded ? '접기' : '펼치기'}
            </span>
          </button>
          {isDetailsExpanded && (
            <>
              <div className="bg-[var(--bg-primary)] rounded border border-[var(--border)] p-4 max-h-96 overflow-y-auto terminal-scrollbar">
                <div className="space-y-0.5">
                  {progress.logs.map((log: any, idx: number) => (
                    <div key={idx} className="text-xs font-mono animate-fade-in">
                      <span className={`${
                        log.level === 'info' ? 'text-[var(--accent-cyan)]' :
                        log.level === 'warn' ? 'text-[var(--accent-yellow)]' :
                        log.level === 'error' ? 'text-[var(--error-red)]' :
                        log.level === 'success' ? 'text-[var(--accent-green)]' :
                        'text-[var(--text-secondary)]'
                      }`}>
                        {log.timestamp && `[${new Date(log.timestamp).toLocaleTimeString()}] `}
                        {log.message || log.raw || JSON.stringify(log)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-xs text-[var(--text-dimmed)] mt-2 font-mono">
                {progress.logs.length}개 로그 항목 (실시간 업데이트)
              </p>
            </>
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes bounce-dot {
          0%, 80%, 100% {
            transform: translateY(0);
            opacity: 0.5;
          }
          40% {
            transform: translateY(-6px);
            opacity: 1;
          }
        }

        .animate-bounce-dot {
          animation: bounce-dot 1.4s ease-in-out infinite;
        }

        @keyframes pulse-border {
          0%, 100% {
            box-shadow: 0 0 0 0 var(--accent-cyan), 0 0 8px 0 var(--accent-cyan);
          }
          50% {
            box-shadow: 0 0 0 2px var(--accent-cyan), 0 0 12px 2px var(--accent-cyan);
          }
        }

        .animate-pulse-border {
          animation: pulse-border 2s ease-in-out infinite;
        }

        @keyframes pulse-subtle {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.85;
          }
        }

        .animate-pulse-subtle {
          animation: pulse-subtle 2s ease-in-out infinite;
        }

        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        .animate-shimmer {
          animation: shimmer 2s infinite;
        }

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
