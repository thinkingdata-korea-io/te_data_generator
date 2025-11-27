'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import FileUploadZone, { UploadedFileInfo } from '@/components/FileUploadZone';
import { FormData } from '../../types';

interface ServiceInfoFormProps {
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
 * Service Info Form Component
 * Form for entering service scenario, industry, and notes
 */
export default function ServiceInfoForm({
  formData,
  onFormDataChange,
  onNext,
  onCancel,
  onFilesSelected,
  uploadedFiles,
  fileAnalysisResult,
  isUploadingFiles
}: ServiceInfoFormProps) {
  const { t } = useLanguage();

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded p-8 mb-6 terminal-glow">
      <h2 className="text-2xl font-bold mb-6 text-terminal-cyan font-mono flex items-center gap-2">
        <span>▦</span> {t.generator.serviceInfo}
      </h2>

      <div className="space-y-6">
        <div>
          <label htmlFor="scenario-input-new" className="block text-sm font-semibold mb-2 text-[var(--text-primary)] font-mono">
            {t.generator.scenario} <span className="text-[var(--error-red)]">*</span>
          </label>
          <textarea
            id="scenario-input-new"
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
            <label htmlFor="industry-input-new" className="block text-sm font-semibold mb-2 text-[var(--text-primary)] font-mono">
              {t.generator.industry} <span className="text-[var(--error-red)]">*</span>
            </label>
            <input
              id="industry-input-new"
              type="text"
              value={formData.industry}
              onChange={(e) => onFormDataChange({ ...formData, industry: e.target.value })}
              className="w-full p-4 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:border-[var(--accent-cyan)] focus:outline-none transition-all font-mono text-sm"
              placeholder={t.generator.industryPlaceholder}
              aria-required="true"
            />
          </div>
          <div>
            <label htmlFor="notes-input-new" className="block text-sm font-semibold mb-2 text-[var(--text-primary)] font-mono">
              {t.generator.notes} <span className="text-[var(--error-red)]">*</span>
            </label>
            <input
              id="notes-input-new"
              type="text"
              value={formData.notes}
              onChange={(e) => onFormDataChange({ ...formData, notes: e.target.value })}
              className="w-full p-4 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:border-[var(--accent-cyan)] focus:outline-none transition-all font-mono text-sm"
              placeholder={t.generator.notesPlaceholder}
              aria-required="true"
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
          className="py-4 rounded text-[var(--text-secondary)] font-mono font-semibold bg-[var(--bg-tertiary)] border border-[var(--border)] hover:border-[var(--border-bright)] hover:text-[var(--text-primary)] transition-all"
        >
          &lt; {t.generator.home}
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={isUploadingFiles}
          className="py-4 rounded text-[var(--bg-primary)] font-mono font-bold bg-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/80 transition-all terminal-glow-cyan disabled:opacity-50 disabled:cursor-not-allowed"
        >
          &gt; {t.generator.generateStart}
        </button>
      </div>
    </div>
  );
}
