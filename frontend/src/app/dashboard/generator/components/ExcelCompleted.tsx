'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { ExcelPreviewSummary, FormData } from '../types';

interface ExcelCompletedProps {
  excelPreview: ExcelPreviewSummary | null;
  generatedExcelPath: string;
  formData: FormData;
  onFormDataChange: (data: FormData) => void;
  onDownloadExcel: () => void;
  onComplete: () => void;
  onStartAIAnalysis: () => void;
}

export default function ExcelCompleted({
  excelPreview,
  generatedExcelPath,
  formData,
  onFormDataChange,
  onDownloadExcel,
  onComplete,
  onStartAIAnalysis
}: ExcelCompletedProps) {
  const { t } = useLanguage();

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded p-8 terminal-glow">
      <h2 className="text-2xl font-bold mb-6 text-terminal-green font-mono flex items-center gap-2">
        <span>✓</span> {t.generator.excelSchemaComplete}
      </h2>
      <div className="p-6 bg-[var(--accent-green)]/10 rounded border border-[var(--accent-green)] mb-6">
        <p className="text-[var(--accent-green)] mb-4 font-mono">{t.generator.excelSchemaSuccess}</p>
        <p className="text-sm text-[var(--text-secondary)] font-mono">{t.generator.enterDataSettings}</p>
      </div>

      {excelPreview && (
        <div className="mb-6 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[var(--bg-tertiary)] border border-[var(--border)] rounded p-4">
              <p className="text-xs text-[var(--text-dimmed)] mb-1 font-mono">{t.generator.eventCount}</p>
              <p className="text-2xl font-bold text-[var(--accent-cyan)] font-mono">{excelPreview.events ?? 0}</p>
            </div>
            <div className="bg-[var(--bg-tertiary)] border border-[var(--border)] rounded p-4">
              <p className="text-xs text-[var(--text-dimmed)] mb-1 font-mono">{t.generator.eventProperties}</p>
              <p className="text-2xl font-bold text-[var(--accent-cyan)] font-mono">{excelPreview.eventProperties ?? 0}</p>
            </div>
            <div className="bg-[var(--bg-tertiary)] border border-[var(--border)] rounded p-4">
              <p className="text-xs text-[var(--text-dimmed)] mb-1 font-mono">{t.generator.commonProperties}</p>
              <p className="text-2xl font-bold text-[var(--accent-cyan)] font-mono">{excelPreview.commonProperties ?? 0}</p>
            </div>
            <div className="bg-[var(--bg-tertiary)] border border-[var(--border)] rounded p-4">
              <p className="text-xs text-[var(--text-dimmed)] mb-1 font-mono">{t.generator.userData}</p>
              <p className="text-2xl font-bold text-[var(--accent-cyan)] font-mono">{excelPreview.userData ?? 0}</p>
            </div>
          </div>
          {excelPreview.provider && (
            <p className="text-xs text-[var(--text-dimmed)] font-mono">
              {t.generator.generationMethod}: {excelPreview.provider === 'fallback' ? 'Rule-based Template' : excelPreview.provider === 'anthropic' ? 'Claude' : 'GPT'} · {excelPreview.generatedAt ? new Date(excelPreview.generatedAt).toLocaleString() : ''}
            </p>
          )}
        </div>
      )}

      <div className="space-y-6 mb-6">
        <h3 className="text-lg font-bold text-[var(--text-primary)] font-mono">&gt; {t.generator.generationConfig}</h3>

        <div className="grid grid-cols-3 gap-6">
          <div>
            <label htmlFor="dau-input-excel" className="block text-sm font-semibold mb-2 text-[var(--text-primary)] font-mono">
              {t.generator.dau} <span className="text-[var(--error-red)]">*</span>
            </label>
            <input
              id="dau-input-excel"
              type="number"
              value={formData.dau}
              onChange={(e) => onFormDataChange({ ...formData, dau: e.target.value })}
              className="w-full p-4 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:border-[var(--accent-cyan)] focus:outline-none transition-all font-mono"
              min="1"
              placeholder={t.generator.dauPlaceholder}
              aria-required="true"
            />
          </div>
          <div>
            <label htmlFor="start-date-excel" className="block text-sm font-semibold mb-2 text-[var(--text-primary)] font-mono">
              {t.generator.startDate} <span className="text-[var(--error-red)]">*</span>
            </label>
            <input
              id="start-date-excel"
              type="date"
              value={formData.dateStart}
              onChange={(e) => onFormDataChange({ ...formData, dateStart: e.target.value })}
              className="w-full p-4 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:border-[var(--accent-cyan)] focus:outline-none transition-all font-mono"
              aria-required="true"
            />
          </div>
          <div>
            <label htmlFor="end-date-excel" className="block text-sm font-semibold mb-2 text-[var(--text-primary)] font-mono">
              {t.generator.endDate} <span className="text-[var(--error-red)]">*</span>
            </label>
            <input
              id="end-date-excel"
              type="date"
              value={formData.dateEnd}
              onChange={(e) => onFormDataChange({ ...formData, dateEnd: e.target.value })}
              className="w-full p-4 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:border-[var(--accent-cyan)] focus:outline-none transition-all font-mono"
              aria-required="true"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={onDownloadExcel}
          className="py-4 rounded text-[var(--accent-green)] font-mono font-semibold bg-[var(--bg-tertiary)] border border-[var(--accent-green)] hover:bg-[var(--accent-green)]/10 transition-all"
        >
          ⇓ {t.generator.downloadExcel}
        </button>
        <button
          type="button"
          onClick={onComplete}
          className="py-4 rounded text-[var(--text-secondary)] font-mono font-semibold bg-[var(--bg-tertiary)] border border-[var(--border)] hover:border-[var(--border-bright)] transition-all"
        >
          &lt; {t.generator.home}
        </button>
      </div>

      <button
        type="button"
        onClick={onStartAIAnalysis}
        className="w-full mt-4 py-5 rounded text-[var(--bg-primary)] font-mono font-bold text-lg bg-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/80 transition-all terminal-glow-cyan"
      >
        &gt; AI 전략 분석 시작
      </button>
    </div>
  );
}
