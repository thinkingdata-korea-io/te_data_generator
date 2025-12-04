'use client';

import { useState, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { AIAnalysisResult, TaskMode } from '../types';

interface AIAnalysisCompletedProps {
  aiAnalysisResult: AIAnalysisResult;
  analysisExcelFileName?: string;
  analysisId?: string;
  onComplete: () => void;
  onProceedToGeneration: () => void;
  onAnalysisUpdate?: (updatedResult: AIAnalysisResult) => void;
  startMode?: TaskMode | null;
}

export default function AIAnalysisCompleted({
  aiAnalysisResult,
  analysisExcelFileName,
  analysisId,
  onComplete,
  onProceedToGeneration,
  onAnalysisUpdate,
  startMode
}: AIAnalysisCompletedProps) {
  const { t } = useLanguage();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const handleDownloadExcel = () => {
    if (analysisExcelFileName) {
      window.open(`${API_URL}/api/generate/analysis-excel/${encodeURIComponent(analysisExcelFileName)}`, '_blank');
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (analysisId) {
        formData.append('analysisId', analysisId);
      }

      const response = await fetch(`${API_URL}/api/generate/update-analysis-excel`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const data = await response.json();

      // Update analysis result
      if (onAnalysisUpdate && data.updatedAnalysis) {
        onAnalysisUpdate(data.updatedAnalysis);
      }

      alert('✅ AI 분석 결과가 업데이트되었습니다!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setUploadError(errorMessage);
      alert(`❌ 업로드 실패: ${errorMessage}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Analysis-only 모드: 간단한 완료 화면
  if (startMode === 'analysis-only') {
    return (
      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded p-8 terminal-glow">
        <h2 className="text-2xl font-bold mb-6 text-terminal-green font-mono flex items-center gap-2">
          <span>✓</span> {t.generator.aiAnalysisTitle}
        </h2>
        <div className="p-6 bg-[var(--accent-green)]/10 rounded border border-[var(--accent-green)] mb-6">
          <p className="text-[var(--accent-green)] mb-4 font-mono">{t.generator.excelSchemaSuccess}</p>
          <p className="text-sm text-[var(--text-secondary)] font-mono">{t.generator.analysisOnlyComplete}</p>
        </div>

        {aiAnalysisResult && (
          <div className="mb-6 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-[var(--bg-tertiary)] border border-[var(--border)] rounded p-4">
                <p className="text-xs text-[var(--text-dimmed)] mb-1 font-mono">{t.generator.userSegments}</p>
                <p className="text-2xl font-bold text-[var(--accent-cyan)] font-mono">
                  {aiAnalysisResult.userSegments?.length ?? 0}{t.generator.segmentCount}
                </p>
              </div>
              <div className="bg-[var(--bg-tertiary)] border border-[var(--border)] rounded p-4">
                <p className="text-xs text-[var(--text-dimmed)] mb-1 font-mono">{t.generator.eventSequenceRules}</p>
                <p className="text-2xl font-bold text-[var(--accent-cyan)] font-mono">
                  {aiAnalysisResult.eventSequences?.length ?? aiAnalysisResult.eventSequencing?.logicalSequences?.length ?? 0}{t.generator.sequenceCount}
                </p>
              </div>
              <div className="bg-[var(--bg-tertiary)] border border-[var(--border)] rounded p-4">
                <p className="text-xs text-[var(--text-dimmed)] mb-1 font-mono">{t.generator.transactionDefinitions}</p>
                <p className="text-2xl font-bold text-[var(--accent-cyan)] font-mono">
                  {aiAnalysisResult.transactions?.length ?? aiAnalysisResult.eventSequencing?.transactions?.length ?? 0}{t.generator.transactionsCount}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {analysisExcelFileName && (
            <button
              type="button"
              onClick={handleDownloadExcel}
              className="py-4 rounded text-[var(--accent-green)] font-mono font-semibold bg-[var(--bg-tertiary)] border-2 border-[var(--accent-green)] hover:bg-[var(--accent-green)]/10 transition-all"
            >
              ⇓ {t.generator.downloadExcel}
            </button>
          )}
          <button
            type="button"
            onClick={onComplete}
            className="py-4 rounded text-[var(--text-primary)] font-mono font-semibold bg-[var(--bg-tertiary)] border-2 border-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/10 transition-all"
          >
            ← {t.generator.backToHome}
          </button>
        </div>
      </div>
    );
  }

  // Full Process 모드: 기존 화면 (수정/데이터 생성 진행)
  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded p-8 terminal-glow">
      <h2 className="text-2xl font-bold mb-6 text-terminal-green font-mono flex items-center gap-2">
        <span>✓</span> {t.generator.aiAnalysisTitle}
      </h2>

      {/* Analysis Summary */}
      <div className="p-6 bg-[var(--accent-green)]/10 rounded border border-[var(--accent-green)] mb-6">
        <h3 className="font-bold text-[var(--accent-green)] mb-4 text-lg font-mono">{t.generator.analysisResultSummary}</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[var(--bg-tertiary)] border border-[var(--border)] p-4 rounded">
            <p className="text-xs text-[var(--text-dimmed)] font-mono">{t.generator.userSegments}</p>
            <p className="text-2xl font-bold text-[var(--accent-cyan)] font-mono">
              {aiAnalysisResult?.userSegments?.length || 0}{t.generator.segmentCount}
            </p>
          </div>
          <div className="bg-[var(--bg-tertiary)] border border-[var(--border)] p-4 rounded">
            <p className="text-xs text-[var(--text-dimmed)] font-mono">{t.generator.eventSequenceRules}</p>
            <p className="text-2xl font-bold text-[var(--accent-cyan)] font-mono">
              {aiAnalysisResult?.eventSequences?.length || 0}{t.generator.sequenceCount}
            </p>
          </div>
          <div className="bg-[var(--bg-tertiary)] border border-[var(--border)] p-4 rounded">
            <p className="text-xs text-[var(--text-dimmed)] font-mono">{t.generator.transactionDefinitions}</p>
            <p className="text-2xl font-bold text-[var(--accent-cyan)] font-mono">
              {aiAnalysisResult?.transactions?.length || 0}{t.generator.transactionsCount}
            </p>
          </div>
        </div>
      </div>

      {/* Excel Download & Upload Section */}
      {analysisExcelFileName && (
        <div className="p-6 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded mb-6">
          <h3 className="font-semibold text-[var(--text-primary)] mb-3 font-mono">
            📄 {t.generator.aiAnalysisExcelFile}
          </h3>
          <p className="text-sm text-[var(--text-secondary)] mb-4 font-mono">
            {t.generator.aiAnalysisExcelDescription}
          </p>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleDownloadExcel}
              className="py-3 rounded text-[var(--bg-primary)] font-mono font-semibold bg-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/80 transition-all"
            >
              📥 {t.generator.downloadExcel}
            </button>
            <button
              type="button"
              onClick={handleFileSelect}
              disabled={isUploading}
              className="py-3 rounded text-[var(--bg-primary)] font-mono font-semibold bg-[var(--accent-magenta)] hover:bg-[var(--accent-magenta)]/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? t.generator.uploading : `📤 ${t.generator.uploadModifiedExcel}`}
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            onChange={handleFileChange}
            aria-label="Upload modified Excel file"
            className="hidden"
          />

          {uploadError && (
            <div className="mt-3 p-3 bg-[var(--error-red)]/10 border-l-4 border-[var(--error-red)] rounded">
              <p className="text-[var(--error-red)] font-semibold font-mono text-sm">ERROR: {uploadError}</p>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={onComplete}
          className="py-4 rounded text-[var(--text-secondary)] font-mono font-semibold bg-[var(--bg-tertiary)] border border-[var(--border)] hover:border-[var(--border-bright)] transition-all"
        >
          &lt; {t.generator.home}
        </button>
        <button
          type="button"
          onClick={onProceedToGeneration}
          className="py-5 rounded text-[var(--bg-primary)] font-mono font-bold text-lg bg-[var(--accent-green)] hover:bg-[var(--accent-green)]/80 transition-all terminal-glow-green"
        >
          {t.generator.proceedToDataGeneration} &gt;
        </button>
      </div>

      {/* Info Note */}
      <div className="mt-4 p-4 bg-[var(--bg-tertiary)]/50 border border-[var(--border)] rounded">
        <p className="text-xs text-[var(--text-dimmed)] font-mono">
          💡 {t.generator.aiAnalysisTip}
        </p>
      </div>
    </div>
  );
}
