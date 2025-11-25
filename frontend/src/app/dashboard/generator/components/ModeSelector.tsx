'use client';

import { useLanguage } from '@/contexts/LanguageContext';

interface ModeSelectorProps {
  onSelectMode: (mode: 'new' | 'upload') => void;
}

export default function ModeSelector({ onSelectMode }: ModeSelectorProps) {
  const { t } = useLanguage();

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded p-8">
      <h2 className="text-2xl font-bold mb-8 text-terminal-cyan font-mono">
        &gt; {t.generator.title}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* New Start */}
        <button
          type="button"
          onClick={() => onSelectMode('new')}
          className="p-8 border border-[var(--border)] rounded hover:border-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/5 transition-all text-left group"
        >
          <div className="text-4xl mb-4 text-[var(--accent-cyan)]">▣</div>
          <h3 className="text-xl font-bold mb-2 text-[var(--text-primary)] font-mono">{t.generator.newStart}</h3>
          <p className="text-[var(--text-secondary)] text-sm mb-4 font-mono whitespace-pre-line">
            {t.generator.newStartDesc}
          </p>
          <div className="text-xs text-[var(--text-dimmed)] font-mono space-y-1">
            <div>{t.generator.newStartStep1}</div>
            <div>{t.generator.newStartStep2}</div>
            <div>{t.generator.newStartStep3}</div>
          </div>
        </button>

        {/* Use Excel */}
        <button
          type="button"
          onClick={() => onSelectMode('upload')}
          className="p-8 border border-[var(--border)] rounded hover:border-[var(--accent-green)] hover:bg-[var(--accent-green)]/5 transition-all text-left group"
        >
          <div className="text-4xl mb-4 text-[var(--accent-green)]">⇪</div>
          <h3 className="text-xl font-bold mb-2 text-[var(--text-primary)] font-mono">{t.generator.useExcel}</h3>
          <p className="text-[var(--text-secondary)] text-sm mb-4 font-mono whitespace-pre-line">
            {t.generator.useExcelDesc}
          </p>
          <div className="text-xs text-[var(--text-dimmed)] font-mono space-y-1">
            <div>{t.generator.useExcelStep1}</div>
            <div>{t.generator.useExcelStep2}</div>
            <div>{t.generator.useExcelStep3}</div>
          </div>
        </button>
      </div>
    </div>
  );
}
