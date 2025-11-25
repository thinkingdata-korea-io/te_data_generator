'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { ProgressData } from '../types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface DataCompletedProps {
  progress: ProgressData;
  runId: string;
  sendAppId: string;
  onSendAppIdChange: (appId: string) => void;
  onComplete: () => void;
  onSendData: () => void;
}

export default function DataCompleted({
  progress,
  runId,
  sendAppId,
  onSendAppIdChange,
  onComplete,
  onSendData
}: DataCompletedProps) {
  const { t } = useLanguage();

  if (!progress.result) return null;

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded p-8 terminal-glow">
      <h2 className="text-2xl font-bold mb-6 text-terminal-green font-mono flex items-center gap-2">
        <span>✓</span> {t.generator.dataGenerationComplete}
      </h2>
      <div className="p-6 bg-[var(--accent-green)]/10 rounded border border-[var(--accent-green)] mb-6">
        <h3 className="font-bold text-[var(--accent-green)] mb-4 text-lg font-mono flex items-center gap-2">
          <span>✓</span> {t.generator.generationComplete}
        </h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-[var(--bg-tertiary)] border border-[var(--border)] p-4 rounded">
            <p className="text-xs text-[var(--text-dimmed)] font-mono">{t.generator.totalEvents}</p>
            <p className="text-2xl font-bold text-[var(--accent-cyan)] font-mono">{progress.result.totalEvents?.toLocaleString()}</p>
          </div>
          <div className="bg-[var(--bg-tertiary)] border border-[var(--border)] p-4 rounded">
            <p className="text-xs text-[var(--text-dimmed)] font-mono">{t.generator.totalUsers}</p>
            <p className="text-2xl font-bold text-[var(--accent-cyan)] font-mono">{progress.result.totalUsers?.toLocaleString()}</p>
          </div>
          <div className="bg-[var(--bg-tertiary)] border border-[var(--border)] p-4 rounded">
            <p className="text-xs text-[var(--text-dimmed)] font-mono">{t.generator.totalDays}</p>
            <p className="text-2xl font-bold text-[var(--accent-cyan)] font-mono">{progress.result.totalDays}일</p>
          </div>
          <div className="bg-[var(--bg-tertiary)] border border-[var(--border)] p-4 rounded">
            <p className="text-xs text-[var(--text-dimmed)] font-mono">{t.generator.runId}</p>
            <p className="text-xs font-mono text-[var(--accent-cyan)]">{progress.result.runId}</p>
          </div>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mb-4 font-mono">{t.generator.sendDataToTE}</p>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-[var(--text-primary)] font-mono">{t.generator.appId}</label>
          <input
            type="text"
            value={sendAppId}
            onChange={(e) => onSendAppIdChange(e.target.value)}
            placeholder={t.generator.appIdPlaceholder}
            className="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:border-[var(--accent-cyan)] focus:outline-none transition-all font-mono"
          />
          <p className="text-xs text-[var(--text-dimmed)] font-mono">{t.generator.appIdDesc}</p>
        </div>
      </div>

      {/* AI 분석 결과 다운로드 버튼 */}
      <div className="mb-6 p-4 bg-[var(--accent-cyan)]/10 rounded border border-[var(--accent-cyan)]">
        <h3 className="text-[var(--accent-cyan)] font-semibold mb-2 font-mono flex items-center gap-2">
          <span>📊</span> AI 분석 결과
        </h3>
        <p className="text-sm text-[var(--text-secondary)] mb-3 font-mono">
          AI가 생성한 사용자 세그먼트, 이벤트 순서 규칙, 트랜잭션 정의를 Excel로 다운로드하여 검토할 수 있습니다.
        </p>
        <button
          onClick={async () => {
            try {
              const response = await fetch(`${API_URL}/api/generate/analysis-excel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ runId })
              });

              if (!response.ok) {
                throw new Error('AI 분석 결과 생성 실패');
              }

              const data = await response.json();
              window.open(`${API_URL}${data.file.downloadUrl}`, '_blank');
            } catch (error) {
              console.error('Error:', error);
              alert('AI 분석 결과 다운로드 실패');
            }
          }}
          className="w-full py-3 rounded text-[var(--accent-cyan)] font-mono font-semibold bg-[var(--bg-tertiary)] border border-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/10 transition-all"
        >
          📥 AI 분석 결과 Excel 다운로드
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={onComplete}
          className="py-4 rounded text-[var(--text-secondary)] font-mono font-semibold bg-[var(--bg-tertiary)] border border-[var(--border)] hover:border-[var(--border-bright)] transition-all"
        >
          &lt; {t.generator.home}
        </button>
        <button
          onClick={onSendData}
          disabled={!sendAppId.trim()}
          className="py-5 rounded text-[var(--bg-primary)] font-mono font-bold text-lg bg-[var(--accent-magenta)] hover:bg-[var(--accent-magenta)]/80 transition-all terminal-glow-magenta disabled:opacity-50 disabled:cursor-not-allowed"
        >
          &gt; {t.generator.sendData}
        </button>
      </div>
    </div>
  );
}
