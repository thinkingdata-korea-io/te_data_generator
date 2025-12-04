'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { AnalysisLanguage } from '../types';

type TaskMode = 'taxonomy-only' | 'analysis-only' | 'data-only' | 'send-only' | 'full-process';

interface ModeSelectorProps {
  onSelectMode: (mode: TaskMode, language?: AnalysisLanguage) => void;
}

export default function ModeSelector({ onSelectMode }: ModeSelectorProps) {
  const { t, language: uiLanguage } = useLanguage();
  const [selectedLanguage, setSelectedLanguage] = useState<AnalysisLanguage>(uiLanguage as AnalysisLanguage);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Featured tasks (큰 카드 2개) - 가장 많이 사용하는 순서
  const featuredTasks = [
    {
      mode: 'full-process' as TaskMode,
      icon: '🚀',
      color: 'orange',
      title: t.generator.fullProcessTitle,
      desc: t.generator.fullProcessDesc,
      steps: [t.generator.fullProcessStep1, t.generator.fullProcessStep2, t.generator.fullProcessStep3, t.generator.fullProcessStep4]
    },
    {
      mode: 'taxonomy-only' as TaskMode,
      icon: '📋',
      color: 'cyan',
      title: t.generator.taxonomyOnlyTitle,
      desc: t.generator.taxonomyOnlyDesc,
      steps: [t.generator.taxonomyStep1, t.generator.taxonomyStep2, t.generator.taxonomyStep3]
    }
  ];

  // Advanced options (접을 수 있는 섹션)
  const advancedTasks = [
    {
      mode: 'analysis-only' as TaskMode,
      icon: '🤖',
      color: 'purple',
      title: t.generator.analysisOnlyTitle,
      desc: t.generator.analysisOnlyDesc,
      steps: [t.generator.analysisStep1, t.generator.analysisStep2, t.generator.analysisStep3]
    },
    {
      mode: 'data-only' as TaskMode,
      icon: '📊',
      color: 'green',
      title: t.generator.dataOnlyTitle,
      desc: t.generator.dataOnlyDesc,
      steps: [t.generator.dataStep1, t.generator.dataStep2, t.generator.dataStep3]
    },
    {
      mode: 'send-only' as TaskMode,
      icon: '📤',
      color: 'pink',
      title: t.generator.sendOnlyTitle,
      desc: t.generator.sendOnlyDesc,
      steps: [t.generator.sendStep1, t.generator.sendStep2, t.generator.sendStep3]
    }
  ];

  const getColorClasses = (color: string) => {
    const colors: Record<string, { border: string; bg: string; text: string; glow: string }> = {
      cyan: {
        border: 'hover:border-[var(--accent-cyan)]',
        bg: 'hover:bg-[var(--accent-cyan)]/5',
        text: 'text-[var(--accent-cyan)]',
        glow: 'hover:shadow-[0_0_20px_rgba(34,211,238,0.3)]'
      },
      purple: {
        border: 'hover:border-[var(--accent-magenta)]',
        bg: 'hover:bg-[var(--accent-magenta)]/5',
        text: 'text-[var(--accent-magenta)]',
        glow: 'hover:shadow-[0_0_20px_rgba(236,72,153,0.3)]'
      },
      green: {
        border: 'hover:border-[var(--accent-green)]',
        bg: 'hover:bg-[var(--accent-green)]/5',
        text: 'text-[var(--accent-green)]',
        glow: 'hover:shadow-[0_0_20px_rgba(34,197,94,0.3)]'
      },
      orange: {
        border: 'hover:border-[var(--accent-yellow)]',
        bg: 'hover:bg-[var(--accent-yellow)]/5',
        text: 'text-[var(--accent-yellow)]',
        glow: 'hover:shadow-[0_0_20px_rgba(251,191,36,0.3)]'
      },
      pink: {
        border: 'hover:border-pink-500',
        bg: 'hover:bg-pink-500/5',
        text: 'text-pink-500',
        glow: 'hover:shadow-[0_0_20px_rgba(236,72,153,0.3)]'
      }
    };
    return colors[color] || colors.cyan;
  };

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded p-8">
      <h2 className="text-2xl font-bold mb-2 text-terminal-cyan font-mono">
        &gt; {t.generator.whatDoYouWant}
      </h2>
      <p className="text-[var(--text-dimmed)] text-sm mb-6 font-mono">
        {t.generator.selectTask}
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
          💡 {t.generator.languageSelectionTip}
        </p>
      </div>

      {/* Featured Tasks - 큰 카드 2개 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {featuredTasks.map((task) => {
          const colorClasses = getColorClasses(task.color);
          return (
            <button
              key={task.mode}
              type="button"
              onClick={() => onSelectMode(task.mode, selectedLanguage)}
              className={`p-8 border-2 border-[var(--border)] rounded ${colorClasses.border} ${colorClasses.bg} ${colorClasses.glow} transition-all text-left group relative overflow-hidden`}
            >
              {/* Gradient overlay on hover */}
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity ${task.color === 'cyan' ? 'bg-gradient-to-br from-cyan-500/5 to-transparent' : task.color === 'orange' ? 'bg-gradient-to-br from-yellow-500/5 to-transparent' : ''}`} />

              <div className="relative z-10">
                <div className={`text-5xl mb-4 ${colorClasses.text} transform group-hover:scale-110 transition-transform`}>{task.icon}</div>
                <h3 className="text-2xl font-bold mb-3 text-[var(--text-primary)] font-mono">{task.title}</h3>
                <p className="text-[var(--text-secondary)] text-base mb-4 font-mono">
                  {task.desc}
                </p>
                <div className="text-sm text-[var(--text-dimmed)] font-mono space-y-2">
                  {task.steps.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className={colorClasses.text}>→</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Advanced Options - 접을 수 있는 섹션 */}
      <div className="border border-[var(--border)] rounded overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full p-4 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)] transition-colors flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">⚙️</span>
            <span className="font-mono text-[var(--text-primary)] font-semibold">
              {t.generator.advancedOptions}
            </span>
          </div>
          <span className={`text-[var(--text-dimmed)] transform transition-transform ${showAdvanced ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>

        {/* Collapsible content */}
        <div className={`transition-all duration-300 ease-in-out ${showAdvanced ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
          <div className="p-6 bg-[var(--bg-secondary)] grid grid-cols-1 md:grid-cols-3 gap-4">
            {advancedTasks.map((task) => {
              const colorClasses = getColorClasses(task.color);
              return (
                <button
                  key={task.mode}
                  type="button"
                  onClick={() => onSelectMode(task.mode, selectedLanguage)}
                  className={`p-6 border border-[var(--border)] rounded ${colorClasses.border} ${colorClasses.bg} transition-all text-left group hover:scale-105`}
                >
                  <div className={`text-3xl mb-3 ${colorClasses.text}`}>{task.icon}</div>
                  <h3 className="text-lg font-bold mb-2 text-[var(--text-primary)] font-mono">{task.title}</h3>
                  <p className="text-[var(--text-secondary)] text-sm mb-3 font-mono">
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
      </div>

      {/* File Management Section */}
      <div className="mt-8 border border-[var(--border)] rounded overflow-hidden">
        <Link
          href="/dashboard/files"
          className="block p-6 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)] transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="text-4xl">📁</div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-[var(--text-primary)] font-mono mb-2 group-hover:text-blue-500 transition-colors">
                {t.generator.fileManagementTitle}
              </h3>
              <p className="text-[var(--text-secondary)] text-sm font-mono mb-3">
                {t.generator.fileManagementCardDesc}
              </p>
              <div className="flex flex-wrap gap-4 text-xs text-[var(--text-dimmed)] font-mono">
                <span>→ {t.generator.fileManagementStep1}</span>
                <span>→ {t.generator.fileManagementStep2}</span>
                <span>→ {t.generator.fileManagementStep3}</span>
              </div>
            </div>
            <div className="text-2xl text-[var(--text-dimmed)] group-hover:text-blue-500 transition-colors">
              →
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
