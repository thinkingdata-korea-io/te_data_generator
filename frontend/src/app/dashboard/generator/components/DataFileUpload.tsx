'use client';

import { useState, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface DataFileUploadProps {
  onComplete: () => void;
  onCancel: () => void;
  onSendStart?: (sessionId: string) => void;
  sendAppId: string;
  onSendAppIdChange: (appId: string) => void;
}

interface UploadedDataFile {
  file: File;
  path: string;
  lineCount: number;
  sizeKB: number;
}

export default function DataFileUpload({ onComplete, onCancel, onSendStart, sendAppId, onSendAppIdChange }: DataFileUploadProps) {
  const { t } = useLanguage();
  const { handleUnauthorized } = useAuth();

  const [uploadedFiles, setUploadedFiles] = useState<UploadedDataFile[]>([]);
  const [uploadError, setUploadError] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (files: FileList) => {
    setUploadError('');
    setIsUploading(true);

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('인증이 필요합니다. 다시 로그인해주세요.');
      }

      const formData = new FormData();

      // Add all .jsonl files to form data
      const jsonlFiles = Array.from(files).filter(file => file.name.endsWith('.jsonl'));

      if (jsonlFiles.length === 0) {
        throw new Error('.jsonl 파일만 업로드 가능합니다');
      }

      jsonlFiles.forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch(`${API_URL}/api/data/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        if (response.status === 401) {
          handleUnauthorized();
          return;
        }
        const error = await response.json();
        throw new Error(error.error || '파일 업로드 실패');
      }

      const data = await response.json();

      // Add uploaded files to state
      const newUploadedFiles: UploadedDataFile[] = data.files.map((fileInfo: any, index: number) => ({
        file: jsonlFiles[index],
        path: fileInfo.path,
        lineCount: fileInfo.lineCount,
        sizeKB: fileInfo.sizeKB
      }));

      setUploadedFiles(prev => [...prev, ...newUploadedFiles]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setUploadError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSendData = async () => {
    if (!sendAppId.trim()) {
      setUploadError('APP_ID를 입력해주세요');
      return;
    }

    if (uploadedFiles.length === 0) {
      setUploadError('최소 1개 이상의 파일을 업로드해주세요');
      return;
    }

    setIsSending(true);
    setUploadError('');

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('인증이 필요합니다. 다시 로그인해주세요.');
      }

      const filePaths = uploadedFiles.map(f => f.path);

      const response = await fetch(`${API_URL}/api/data/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          filePaths,
          appId: sendAppId
        })
      });

      if (!response.ok) {
        if (response.status === 401) {
          handleUnauthorized();
          return;
        }
        const error = await response.json();
        throw new Error(error.error || '데이터 전송 실패');
      }

      const data = await response.json();
      console.log('전송 시작:', data);

      // Notify parent that sending has started with sessionId
      if (onSendStart && data.sessionId) {
        onSendStart(data.sessionId);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setUploadError(errorMessage);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded p-8 terminal-glow">
      <h2 className="text-2xl font-bold mb-6 text-terminal-cyan font-mono flex items-center gap-2">
        <span>📤</span> {t.generator.sendOnlyTitle || '데이터 전송만'}
      </h2>

      <p className="text-[var(--text-secondary)] text-sm mb-6 font-mono">
        저장된 .jsonl 데이터 파일을 업로드하고 ThinkingEngine으로 전송합니다.
      </p>

      {/* File Upload Zone */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-[var(--text-primary)] font-mono flex items-center gap-2 mb-4">
          📁 1. {t.generator.sendStep1 || '데이터 파일 업로드'}
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
            const files = e.dataTransfer.files;
            if (files.length > 0) {
              handleFileUpload(files);
            }
          }}
          className="border-2 border-dashed border-[var(--border)] rounded p-8 text-center transition-all cursor-pointer hover:border-[var(--accent-cyan)] hover:bg-[var(--bg-tertiary)]"
        >
          <div className="text-5xl mb-3 text-[var(--accent-cyan)]">📤</div>
          <p className="text-sm font-semibold text-[var(--text-primary)] mb-2 font-mono">
            .jsonl 파일을 드래그 & 드롭하거나 클릭하여 선택
          </p>
          <label className="inline-block mt-2 px-4 py-2 bg-[var(--accent-cyan)] text-[var(--bg-primary)] text-sm font-semibold rounded cursor-pointer hover:bg-[var(--accent-cyan)]/80 transition-all font-mono">
            파일 선택
            <input
              ref={fileInputRef}
              type="file"
              accept=".jsonl"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = e.target.files;
                if (files && files.length > 0) {
                  handleFileUpload(files);
                }
              }}
            />
          </label>
          <p className="text-xs text-[var(--text-dimmed)] mt-3 font-mono">
            여러 개의 .jsonl 파일을 한 번에 업로드할 수 있습니다
          </p>
        </div>

        {/* Uploaded Files List */}
        {uploadedFiles.length > 0 && (
          <div className="mt-4 space-y-2">
            <h4 className="text-sm font-semibold text-[var(--text-primary)] font-mono">
              업로드된 파일 ({uploadedFiles.length}개)
            </h4>
            {uploadedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">📄</span>
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)] font-mono">
                      {file.file.name}
                    </p>
                    <p className="text-xs text-[var(--text-dimmed)] font-mono">
                      {file.lineCount.toLocaleString()}줄 • {file.sizeKB.toFixed(2)} KB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveFile(index)}
                  className="text-sm text-[var(--error-red)] hover:underline font-mono"
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* APP_ID Input */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-[var(--text-primary)] font-mono flex items-center gap-2 mb-4">
          🔑 2. {t.generator.sendStep2 || 'APP_ID 입력'}
        </h3>
        <input
          type="text"
          value={sendAppId}
          onChange={(e) => onSendAppIdChange(e.target.value)}
          placeholder="ThinkingEngine APP_ID를 입력하세요"
          className="w-full p-4 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:border-[var(--accent-cyan)] focus:outline-none transition-all font-mono"
        />
        <p className="mt-2 text-xs text-[var(--text-dimmed)] font-mono">
          데이터를 전송할 ThinkingEngine의 APP_ID를 입력해주세요
        </p>
      </div>

      {uploadError && (
        <div className="mb-6 p-4 bg-[var(--error-red)]/10 border-l-4 border-[var(--error-red)] rounded">
          <p className="text-[var(--error-red)] font-semibold font-mono">ERROR: {uploadError}</p>
        </div>
      )}

      {isUploading && (
        <div className="mb-6 p-4 bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)] rounded">
          <p className="text-[var(--accent-cyan)] font-mono">파일 업로드 중...</p>
        </div>
      )}

      {isSending && (
        <div className="mb-6 p-4 bg-[var(--accent-magenta)]/10 border border-[var(--accent-magenta)] rounded animate-pulse">
          <p className="text-[var(--accent-magenta)] font-mono">ThinkingEngine으로 데이터 전송 중...</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSending}
          className="py-4 rounded text-[var(--text-secondary)] font-mono font-semibold bg-[var(--bg-tertiary)] border border-[var(--border)] hover:border-[var(--border-bright)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          &lt; 이전으로
        </button>
        <button
          type="button"
          onClick={handleSendData}
          disabled={uploadedFiles.length === 0 || !sendAppId.trim() || isUploading || isSending}
          className={`py-4 rounded font-mono font-semibold transition-all ${
            uploadedFiles.length > 0 && sendAppId.trim() && !isUploading && !isSending
              ? 'bg-[var(--accent-magenta)] text-[var(--bg-primary)] hover:bg-[var(--accent-magenta)]/80'
              : 'bg-[var(--bg-tertiary)] text-[var(--text-dimmed)] cursor-not-allowed'
          }`}
        >
          {t.generator.sendStep3 || 'ThinkingEngine 전송'} &gt;
        </button>
      </div>
    </div>
  );
}
