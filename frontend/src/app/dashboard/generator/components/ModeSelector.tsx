'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { AnalysisLanguage } from '../types';

type TaskMode = 'taxonomy-only' | 'analysis-only' | 'data-only' | 'full-process';

interface ModeSelectorProps {
  onSelectMode: (mode: TaskMode, language?: AnalysisLanguage) => void;
}

export default function ModeSelector({ onSelectMode }: ModeSelectorProps) {
  const { t, language: uiLanguage } = useLanguage();
  const [selectedLanguage, setSelectedLanguage] = useState<AnalysisLanguage>(uiLanguage as AnalysisLanguage);

  const tasks = [
    {
      mode: 'taxonomy-only' as TaskMode,
      icon: '📋',
      color: 'cyan',
      title: 'Taxonomy Excel 생성',
      desc: 'AI 없이 이벤트 정의만',
      steps: ['설정 입력', 'Excel 생성', '다운로드']
    },
    {
      mode: 'analysis-only' as TaskMode,
      icon: '🤖',
      color: 'purple',
      title: 'AI 분석 Excel 생성',
      desc: 'Taxonomy → AI 분석 변환',
      steps: ['Taxonomy 업로드', 'AI 분석', '결과 다운로드']
    },
    {
      mode: 'data-only' as TaskMode,
      icon: '📊',
      color: 'green',
      title: '데모 데이터 생성',
      desc: 'AI 분석 Excel → 실제 데이터',
      steps: ['Excel 2개 업로드', '검토/수정', '데이터 생성']
    },
    {
      mode: 'full-process' as TaskMode,
      icon: '🚀',
      color: 'orange',
      title: '전체 프로세스',
      desc: '처음부터 끝까지 한번에',
      steps: ['설정', 'Taxonomy', 'AI 분석', '데이터 생성']
    }
  ];

  const getColorClasses = (color: string) => {
    const colors: Record<string, { border: string; bg: string; text: string }> = {
      cyan: { border: 'hover:border-[var(--accent-cyan)]', bg: 'hover:bg-[var(--accent-cyan)]/5', text: 'text-[var(--accent-cyan)]' },
      purple: { border: 'hover:border-[var(--accent-magenta)]', bg: 'hover:bg-[var(--accent-magenta)]/5', text: 'text-[var(--accent-magenta)]' },
      green: { border: 'hover:border-[var(--accent-green)]', bg: 'hover:bg-[var(--accent-green)]/5', text: 'text-[var(--accent-green)]' },
      orange: { border: 'hover:border-[var(--accent-yellow)]', bg: 'hover:bg-[var(--accent-yellow)]/5', text: 'text-[var(--accent-yellow)]' }
    };
    return colors[color] || colors.cyan;
  };

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded p-8">
      <h2 className="text-2xl font-bold mb-2 text-terminal-cyan font-mono">
        &gt; 무엇을 하고 싶으신가요?
      </h2>
      <p className="text-[var(--text-dimmed)] text-sm mb-6 font-mono">
        작업을 선택하세요. 각 작업은 독립적으로 수행할 수 있습니다.
      </p>

      {/* Language Selection */}
      <div className="mb-8 p-6 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded">
        <label htmlFor="language-select" className="block text-sm font-semibold mb-3 text-[var(--text-primary)] font-mono flex items-center gap-2">
          🌐 {t.generator.analysisLanguage}
        </label>
        <select
          id="language-select"
          value={selectedLanguage}
          onChange={(e) => setSelectedLanguage(e.target.value as AnalysisLanguage)}
          className="w-full p-4 bg-[var(--bg-secondary)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:border-[var(--accent-cyan)] focus:outline-none transition-all font-mono text-lg"
          aria-label={t.generator.analysisLanguage}
        >
          <option value="ko">🇰🇷 한국어 (Korean)</option>
          <option value="en">🇺🇸 English</option>
          <option value="zh">🇨🇳 中文 (Chinese)</option>
          <option value="ja">🇯🇵 日本語 (Japanese)</option>
        </select>
        <p className="mt-3 text-xs text-[var(--text-dimmed)] font-mono">
          💡 선택한 언어로 분석 결과와 데이터가 생성됩니다
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tasks.map((task) => {
          const colorClasses = getColorClasses(task.color);
          return (
            <button
              key={task.mode}
              type="button"
              onClick={() => onSelectMode(task.mode, selectedLanguage)}
              className={`p-8 border border-[var(--border)] rounded ${colorClasses.border} ${colorClasses.bg} transition-all text-left group`}
            >
              <div className={`text-4xl mb-4 ${colorClasses.text}`}>{task.icon}</div>
              <h3 className="text-xl font-bold mb-2 text-[var(--text-primary)] font-mono">{task.title}</h3>
              <p className="text-[var(--text-secondary)] text-sm mb-4 font-mono">
                {task.desc}
              </p>
              <div className="text-xs text-[var(--text-dimmed)] font-mono space-y-1">
                {task.steps.map((step, idx) => (
                  <div key={idx}>→ {step}</div>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
