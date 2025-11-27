'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import FileUploadZone, { UploadedFileInfo } from '@/components/FileUploadZone';
import { FormData } from '../../types';

interface CombinedConfigFormProps {
  formData: FormData;
  onFormDataChange: (data: FormData) => void;
  onNext: () => void;
  onCancel: () => void;
  onFilesSelected: (files: UploadedFileInfo[]) => void;
  uploadedFiles: UploadedFileInfo[];
  fileAnalysisResult: { combinedInsights?: string; [key: string]: unknown } | null;
  isUploadingFiles: boolean;
}

/**
 * Combined Config Form Component
 * Combined form for service info AND data generation settings
 * Used in the upload mode workflow
 */
export default function CombinedConfigForm({
  formData,
  onFormDataChange,
  onNext,
  onCancel,
  onFilesSelected,
  uploadedFiles,
  fileAnalysisResult,
  isUploadingFiles
}: CombinedConfigFormProps) {
  const { t } = useLanguage();

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded p-8 mb-6 terminal-glow">
      <h2 className="text-2xl font-bold mb-6 text-terminal-cyan font-mono flex items-center gap-2">
        <span>▦</span> {t.generator.serviceInfoAndSettings}
      </h2>

      <div className="space-y-6">
        <div>
          <label htmlFor="scenario-input-combined" className="block text-sm font-semibold mb-2 text-[var(--text-primary)] font-mono">
            {t.generator.scenario} <span className="text-[var(--error-red)]">*</span>
          </label>
          <textarea
            id="scenario-input-combined"
            value={formData.scenario}
            onChange={(e) => onFormDataChange({ ...formData, scenario: e.target.value })}
            className="w-full p-4 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:border-[var(--accent-cyan)] focus:outline-none transition-all font-mono text-sm terminal-scrollbar"
            rows={4}
            placeholder={t.generator.scenarioPlaceholder}
            aria-required="true"
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label htmlFor="industry-input-combined" className="block text-sm font-semibold mb-2 text-[var(--text-primary)] font-mono">
              {t.generator.industry} <span className="text-[var(--error-red)]">*</span>
            </label>
            <input
              id="industry-input-combined"
              type="text"
              value={formData.industry}
              onChange={(e) => onFormDataChange({ ...formData, industry: e.target.value })}
              className="w-full p-4 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:border-[var(--accent-cyan)] focus:outline-none transition-all font-mono text-sm"
              placeholder={t.generator.industryPlaceholder}
              aria-required="true"
            />
          </div>
          <div>
            <label htmlFor="notes-input-combined" className="block text-sm font-semibold mb-2 text-[var(--text-primary)] font-mono">
              {t.generator.notes} <span className="text-[var(--error-red)]">*</span>
            </label>
            <input
              id="notes-input-combined"
              type="text"
              value={formData.notes}
              onChange={(e) => onFormDataChange({ ...formData, notes: e.target.value })}
              className="w-full p-4 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:border-[var(--accent-cyan)] focus:outline-none transition-all font-mono text-sm"
              placeholder={t.generator.notesPlaceholder}
              aria-required="true"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div>
            <label htmlFor="dau-input-combined" className="block text-sm font-semibold mb-2 text-[var(--text-primary)] font-mono">
              {t.generator.dau}
            </label>
            <input
              id="dau-input-combined"
              type="number"
              value={formData.dau}
              onChange={(e) => onFormDataChange({ ...formData, dau: e.target.value })}
              className="w-full p-4 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:border-[var(--accent-cyan)] focus:outline-none transition-all font-mono"
              min="1"
              placeholder="Daily Active Users"
              aria-label={t.generator.dau}
            />
          </div>
          <div>
            <label htmlFor="start-date-combined" className="block text-sm font-semibold mb-2 text-[var(--text-primary)] font-mono">
              {t.generator.startDate}
            </label>
            <input
              id="start-date-combined"
              type="date"
              value={formData.dateStart}
              onChange={(e) => onFormDataChange({ ...formData, dateStart: e.target.value })}
              className="w-full p-4 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:border-[var(--accent-cyan)] focus:outline-none transition-all font-mono"
              aria-label={t.generator.startDate}
            />
          </div>
          <div>
            <label htmlFor="end-date-combined" className="block text-sm font-semibold mb-2 text-[var(--text-primary)] font-mono">
              {t.generator.endDate}
            </label>
            <input
              id="end-date-combined"
              type="date"
              value={formData.dateEnd}
              onChange={(e) => onFormDataChange({ ...formData, dateEnd: e.target.value })}
              className="w-full p-4 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:border-[var(--accent-cyan)] focus:outline-none transition-all font-mono"
              aria-label={t.generator.endDate}
            />
          </div>
        </div>
      </div>

      {/* File Upload Section */}
      <div className="mt-8 pt-6 border-t border-[var(--border)]">
        <FileUploadZone
          onFilesSelected={onFilesSelected}
          maxFiles={5}
          maxFileSize={10}
          maxTotalSize={50}
          disabled={isUploadingFiles}
        />

        {/* File upload status */}
        {isUploadingFiles && (
          <div className="mt-4 p-4 bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)] rounded">
            <p className="text-[var(--accent-cyan)] font-mono text-sm">🤖 {t.generator.analyzingFiles}</p>
          </div>
        )}

        {fileAnalysisResult && uploadedFiles.length > 0 && !isUploadingFiles && (
          <div className="mt-4 p-4 bg-[var(--accent-green)]/10 border border-[var(--accent-green)] rounded">
            <h3 className="text-[var(--accent-green)] font-semibold mb-2 font-mono">✅ {t.generator.fileAnalysisComplete}</h3>
            <p className="text-sm text-[var(--text-secondary)] font-mono">
              {uploadedFiles.length}{t.generator.filesUploadedMessage}
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mt-8">
        <button
          type="button"
          onClick={onCancel}
          className="py-4 rounded text-[var(--text-secondary)] font-mono font-semibold bg-[var(--bg-tertiary)] border border-[var(--border)] hover:border-[var(--border-bright)] transition-all"
        >
          &lt; {t.generator.home}
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={isUploadingFiles}
          className="py-4 rounded text-[var(--bg-primary)] font-mono font-bold text-lg bg-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/80 transition-all terminal-glow-cyan disabled:opacity-50 disabled:cursor-not-allowed"
        >
          &gt; {t.generator.generateStart}
        </button>
      </div>
    </div>
  );
}
