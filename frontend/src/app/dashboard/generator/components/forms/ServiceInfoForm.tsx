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
        <span>▦</span> 서비스 기본 정보
      </h2>

      <p className="text-sm text-[var(--text-secondary)] mb-6 font-mono">
        💡 이벤트 Taxonomy 생성에 필요한 기본 정보를 입력하세요
      </p>

      <div className="space-y-6">
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

        {/* Event Count Range Section */}
        <div className="mt-6 pt-6 border-t border-[var(--border)]">
          <label className="block text-sm font-semibold mb-4 text-[var(--text-primary)] font-mono">
            📊 이벤트 Taxonomy 복잡도
          </label>

          {/* Preset Buttons */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <button
              type="button"
              onClick={() => onFormDataChange({ ...formData, eventCountMin: 10, eventCountMax: 20 })}
              className={`p-3 rounded border transition-all font-mono text-sm ${
                formData.eventCountMin === 10 && formData.eventCountMax === 20
                  ? 'bg-[var(--accent-cyan)]/20 border-[var(--accent-cyan)] text-[var(--accent-cyan)]'
                  : 'bg-[var(--bg-tertiary)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent-cyan)]'
              }`}
            >
              <div className="font-semibold">간단</div>
              <div className="text-xs mt-1">10-20개</div>
            </button>
            <button
              type="button"
              onClick={() => onFormDataChange({ ...formData, eventCountMin: 20, eventCountMax: 40 })}
              className={`p-3 rounded border transition-all font-mono text-sm ${
                formData.eventCountMin === 20 && formData.eventCountMax === 40
                  ? 'bg-[var(--accent-cyan)]/20 border-[var(--accent-cyan)] text-[var(--accent-cyan)]'
                  : 'bg-[var(--bg-tertiary)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent-cyan)]'
              }`}
            >
              <div className="font-semibold">표준</div>
              <div className="text-xs mt-1">20-40개</div>
            </button>
            <button
              type="button"
              onClick={() => onFormDataChange({ ...formData, eventCountMin: 40, eventCountMax: 60 })}
              className={`p-3 rounded border transition-all font-mono text-sm ${
                formData.eventCountMin === 40 && formData.eventCountMax === 60
                  ? 'bg-[var(--accent-cyan)]/20 border-[var(--accent-cyan)] text-[var(--accent-cyan)]'
                  : 'bg-[var(--bg-tertiary)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent-cyan)]'
              }`}
            >
              <div className="font-semibold">상세</div>
              <div className="text-xs mt-1">40-60개</div>
            </button>
            <button
              type="button"
              onClick={() => onFormDataChange({ ...formData, eventCountMin: 60, eventCountMax: 100 })}
              className={`p-3 rounded border transition-all font-mono text-sm ${
                formData.eventCountMin === 60 && formData.eventCountMax === 100
                  ? 'bg-[var(--accent-cyan)]/20 border-[var(--accent-cyan)] text-[var(--accent-cyan)]'
                  : 'bg-[var(--bg-tertiary)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent-cyan)]'
              }`}
            >
              <div className="font-semibold">매우 상세</div>
              <div className="text-xs mt-1">60-100개</div>
            </button>
          </div>

          {/* Custom Range Inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="event-count-min" className="block text-xs font-semibold mb-2 text-[var(--text-secondary)] font-mono">
                최소 이벤트 수
              </label>
              <input
                id="event-count-min"
                type="number"
                min="5"
                max="200"
                value={formData.eventCountMin || 20}
                onChange={(e) => onFormDataChange({ ...formData, eventCountMin: parseInt(e.target.value) || 20 })}
                className="w-full p-3 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:border-[var(--accent-cyan)] focus:outline-none transition-all font-mono text-sm"
              />
            </div>
            <div>
              <label htmlFor="event-count-max" className="block text-xs font-semibold mb-2 text-[var(--text-secondary)] font-mono">
                최대 이벤트 수
              </label>
              <input
                id="event-count-max"
                type="number"
                min="5"
                max="200"
                value={formData.eventCountMax || 40}
                onChange={(e) => onFormDataChange({ ...formData, eventCountMax: parseInt(e.target.value) || 40 })}
                className="w-full p-3 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:border-[var(--accent-cyan)] focus:outline-none transition-all font-mono text-sm"
              />
            </div>
          </div>
          <p className="text-xs text-[var(--text-dimmed)] mt-2 font-mono">
            💡 AI가 시나리오 복잡도에 맞춰 이 범위 내에서 최적의 이벤트 수를 결정합니다
          </p>
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
