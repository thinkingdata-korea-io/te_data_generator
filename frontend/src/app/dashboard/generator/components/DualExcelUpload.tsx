'use client';

import { useState, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ExcelPreviewSummary } from '../types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface DualExcelUploadProps {
  onComplete: (taxonomyPath: string, analysisPath: string, taxonomyPreview: ExcelPreviewSummary, analysisPreview: any) => void;
  onCancel: () => void;
}

export default function DualExcelUpload({ onComplete, onCancel }: DualExcelUploadProps) {
  const { t } = useLanguage();

  const [taxonomyFile, setTaxonomyFile] = useState<File | null>(null);
  const [analysisFile, setAnalysisFile] = useState<File | null>(null);
  const [taxonomyPath, setTaxonomyPath] = useState<string>('');
  const [analysisPath, setAnalysisPath] = useState<string>('');
  const [taxonomyPreview, setTaxonomyPreview] = useState<ExcelPreviewSummary | null>(null);
  const [analysisPreview, setAnalysisPreview] = useState<any>(null);
  const [uploadError, setUploadError] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const taxonomyInputRef = useRef<HTMLInputElement>(null);
  const analysisInputRef = useRef<HTMLInputElement>(null);

  const handleTaxonomyUpload = async (file: File) => {
    setUploadError('');
    setIsUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_URL}/api/excel/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Taxonomy Excel 업로드 실패');
      }

      const data = await response.json();
      setTaxonomyPath(data.file.path);
      setTaxonomyPreview(data.preview);
      setTaxonomyFile(file);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setUploadError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAnalysisUpload = async (file: File) => {
    setUploadError('');
    setIsUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_URL}/api/generate/upload-analysis`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'AI 분석 Excel 업로드 실패');
      }

      const data = await response.json();
      setAnalysisPath(data.file.path);
      setAnalysisPreview(data.preview);
      setAnalysisFile(file);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setUploadError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleProceed = () => {
    if (taxonomyPath && analysisPath && taxonomyPreview && analysisPreview) {
      onComplete(taxonomyPath, analysisPath, taxonomyPreview, analysisPreview);
    } else {
      setUploadError('두 파일을 모두 업로드해주세요');
    }
  };

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded p-8 terminal-glow">
      <h2 className="text-2xl font-bold mb-6 text-terminal-cyan font-mono flex items-center gap-2">
        <span>⇪</span> Excel 파일 업로드
      </h2>

      <p className="text-[var(--text-secondary)] text-sm mb-6 font-mono">
        데이터 생성을 위해 Taxonomy Excel과 AI 분석 Excel 두 파일을 모두 업로드해주세요.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Taxonomy Excel Upload */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-[var(--text-primary)] font-mono flex items-center gap-2">
            📋 1. Taxonomy Excel
          </h3>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.classList.add('border-[var(--accent-cyan)]', 'bg-[var(--accent-cyan)]/5');
            }}
            onDragLeave={(e) => {
              e.currentTarget.classList.remove('border-[var(--accent-cyan)]', 'bg-[var(--accent-cyan)]/5');
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove('border-[var(--accent-cyan)]', 'bg-[var(--accent-cyan)]/5');
              const file = e.dataTransfer.files[0];
              if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
                handleTaxonomyUpload(file);
              } else {
                setUploadError('Excel 파일만 업로드 가능합니다 (.xlsx, .xls)');
              }
            }}
            className="border-2 border-dashed border-[var(--border)] rounded p-8 text-center transition-all cursor-pointer hover:border-[var(--accent-cyan)] hover:bg-[var(--bg-tertiary)]"
          >
            {taxonomyFile ? (
              <div className="space-y-2">
                <div className="text-4xl text-[var(--accent-green)]">✓</div>
                <p className="text-sm font-semibold text-[var(--accent-green)] font-mono">
                  {taxonomyFile.name}
                </p>
                {taxonomyPreview && (
                  <div className="text-xs text-[var(--text-dimmed)] font-mono space-y-1">
                    <p>이벤트: {taxonomyPreview.events}개</p>
                    <p>속성: {taxonomyPreview.eventProperties}개</p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setTaxonomyFile(null);
                    setTaxonomyPath('');
                    setTaxonomyPreview(null);
                  }}
                  className="text-xs text-[var(--error-red)] hover:underline"
                >
                  재업로드
                </button>
              </div>
            ) : (
              <div>
                <div className="text-4xl mb-3 text-[var(--accent-cyan)]">📋</div>
                <p className="text-sm font-semibold text-[var(--text-primary)] mb-2 font-mono">
                  드래그 & 드롭
                </p>
                <label className="inline-block mt-2 px-4 py-2 bg-[var(--accent-cyan)] text-[var(--bg-primary)] text-sm font-semibold rounded cursor-pointer hover:bg-[var(--accent-cyan)]/80 transition-all font-mono">
                  파일 선택
                  <input
                    ref={taxonomyInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleTaxonomyUpload(file);
                    }}
                  />
                </label>
              </div>
            )}
          </div>
        </div>

        {/* AI Analysis Excel Upload */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-[var(--text-primary)] font-mono flex items-center gap-2">
            🤖 2. AI 분석 Excel
          </h3>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.classList.add('border-[var(--accent-magenta)]', 'bg-[var(--accent-magenta)]/5');
            }}
            onDragLeave={(e) => {
              e.currentTarget.classList.remove('border-[var(--accent-magenta)]', 'bg-[var(--accent-magenta)]/5');
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove('border-[var(--accent-magenta)]', 'bg-[var(--accent-magenta)]/5');
              const file = e.dataTransfer.files[0];
              if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
                handleAnalysisUpload(file);
              } else {
                setUploadError('Excel 파일만 업로드 가능합니다 (.xlsx, .xls)');
              }
            }}
            className="border-2 border-dashed border-[var(--border)] rounded p-8 text-center transition-all cursor-pointer hover:border-[var(--accent-magenta)] hover:bg-[var(--bg-tertiary)]"
          >
            {analysisFile ? (
              <div className="space-y-2">
                <div className="text-4xl text-[var(--accent-green)]">✓</div>
                <p className="text-sm font-semibold text-[var(--accent-green)] font-mono">
                  {analysisFile.name}
                </p>
                {analysisPreview && (
                  <div className="text-xs text-[var(--text-dimmed)] font-mono space-y-1">
                    <p>세그먼트: {analysisPreview.segments || 0}개</p>
                    <p>트랜잭션: {analysisPreview.transactions || 0}개</p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setAnalysisFile(null);
                    setAnalysisPath('');
                    setAnalysisPreview(null);
                  }}
                  className="text-xs text-[var(--error-red)] hover:underline"
                >
                  재업로드
                </button>
              </div>
            ) : (
              <div>
                <div className="text-4xl mb-3 text-[var(--accent-magenta)]">🤖</div>
                <p className="text-sm font-semibold text-[var(--text-primary)] mb-2 font-mono">
                  드래그 & 드롭
                </p>
                <label className="inline-block mt-2 px-4 py-2 bg-[var(--accent-magenta)] text-[var(--bg-primary)] text-sm font-semibold rounded cursor-pointer hover:bg-[var(--accent-magenta)]/80 transition-all font-mono">
                  파일 선택
                  <input
                    ref={analysisInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleAnalysisUpload(file);
                    }}
                  />
                </label>
              </div>
            )}
          </div>
        </div>
      </div>

      {uploadError && (
        <div className="mb-6 p-4 bg-[var(--error-red)]/10 border-l-4 border-[var(--error-red)] rounded">
          <p className="text-[var(--error-red)] font-semibold font-mono">ERROR: {uploadError}</p>
        </div>
      )}

      {isUploading && (
        <div className="mb-6 p-4 bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)] rounded">
          <p className="text-[var(--accent-cyan)] font-mono">업로드 중...</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={onCancel}
          className="py-4 rounded text-[var(--text-secondary)] font-mono font-semibold bg-[var(--bg-tertiary)] border border-[var(--border)] hover:border-[var(--border-bright)] transition-all"
        >
          &lt; 이전으로
        </button>
        <button
          type="button"
          onClick={handleProceed}
          disabled={!taxonomyPath || !analysisPath || isUploading}
          className={`py-4 rounded font-mono font-semibold transition-all ${
            taxonomyPath && analysisPath && !isUploading
              ? 'bg-[var(--accent-green)] text-[var(--bg-primary)] hover:bg-[var(--accent-green)]/80'
              : 'bg-[var(--bg-tertiary)] text-[var(--text-dimmed)] cursor-not-allowed'
          }`}
        >
          다음 단계 &gt;
        </button>
      </div>
    </div>
  );
}
