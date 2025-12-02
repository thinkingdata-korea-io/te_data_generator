'use client';

import { useState, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

// 파일 타입 아이콘 매핑
const getFileIcon = (fileName: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const iconMap: Record<string, string> = {
    pdf: '📄',
    txt: '📝',
    md: '📋',
    docx: '📘',
    doc: '📘',
    xlsx: '📊',
    xls: '📊',
    png: '🖼️',
    jpg: '🖼️',
    jpeg: '🖼️',
    gif: '🖼️',
    webp: '🖼️',
    json: '📋',
    js: '📜',
    ts: '📜',
    tsx: '📜',
    jsx: '📜',
    py: '🐍',
    java: '☕',
    go: '🔵',
    rs: '⚙️',
    swift: '🍎',
    kt: '🟣',
  };
  return iconMap[ext] || '📎';
};

// 파일 크기 포맷
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

export interface UploadedFileInfo {
  file: File;
  preview?: string; // 이미지일 경우 미리보기 URL
}

interface FileUploadZoneProps {
  onFilesSelected: (files: UploadedFileInfo[]) => void;
  maxFiles?: number;
  maxFileSize?: number; // MB 단위
  maxTotalSize?: number; // MB 단위
  disabled?: boolean;
}

export default function FileUploadZone({
  onFilesSelected,
  maxFiles = 5,
  maxFileSize = 10,
  maxTotalSize = 50,
  disabled = false,
}: FileUploadZoneProps) {
  const { t } = useLanguage();
  const [selectedFiles, setSelectedFiles] = useState<UploadedFileInfo[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string>('');
  const [showTooltip, setShowTooltip] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 허용된 파일 확장자
  const allowedExtensions = [
    '.pdf',
    '.png', '.jpg', '.jpeg', '.gif', '.webp',
    '.json', '.js', '.ts', '.tsx', '.jsx', '.py', '.java', '.go', '.rs', '.swift', '.kt'
  ];

  // 파일 검증
  const validateFiles = (files: FileList | File[]): { valid: File[], errors: string[] } => {
    const fileArray = Array.from(files);
    const errors: string[] = [];
    const valid: File[] = [];

    // 파일 개수 체크
    if (selectedFiles.length + fileArray.length > maxFiles) {
      errors.push(t.generator.fileUpload.errorMaxFiles.replace('{max}', maxFiles.toString()));
      return { valid: [], errors };
    }

    // 각 파일 검증
    for (const file of fileArray) {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();

      // 확장자 체크
      if (!allowedExtensions.includes(ext)) {
        errors.push(t.generator.fileUpload.errorUnsupportedFormat.replace('{fileName}', file.name));
        continue;
      }

      // 파일 크기 체크
      if (file.size > maxFileSize * 1024 * 1024) {
        errors.push(t.generator.fileUpload.errorFileSize.replace('{fileName}', file.name).replace('{maxSize}', maxFileSize.toString()));
        continue;
      }

      valid.push(file);
    }

    // 전체 크기 체크
    const currentTotalSize = selectedFiles.reduce((sum, f) => sum + f.file.size, 0);
    const newTotalSize = valid.reduce((sum, f) => sum + f.size, 0);
    const totalMB = (currentTotalSize + newTotalSize) / (1024 * 1024);

    if (totalMB > maxTotalSize) {
      errors.push(t.generator.fileUpload.errorTotalSize.replace('{maxSize}', maxTotalSize.toString()));
      return { valid: [], errors };
    }

    return { valid, errors };
  };

  // 파일 추가 처리
  const handleFiles = async (files: FileList | File[]) => {
    setError('');
    const { valid, errors } = validateFiles(files);

    if (errors.length > 0) {
      setError(errors.join(' '));
      return;
    }

    if (valid.length === 0) return;

    // 이미지 파일은 미리보기 생성
    const fileInfos: UploadedFileInfo[] = await Promise.all(
      valid.map(async (file) => {
        if (file.type.startsWith('image/')) {
          const preview = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.readAsDataURL(file);
          });
          return { file, preview };
        }
        return { file };
      })
    );

    const updatedFiles = [...selectedFiles, ...fileInfos];
    setSelectedFiles(updatedFiles);
    onFilesSelected(updatedFiles);
  };

  // 파일 제거
  const removeFile = (index: number) => {
    const updatedFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(updatedFiles);
    onFilesSelected(updatedFiles);
  };

  // 드래그 앤 드롭 핸들러
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!disabled && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  // 파일 선택 핸들러
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  // 총 파일 크기 계산
  const totalSize = selectedFiles.reduce((sum, f) => sum + f.file.size, 0);

  return (
    <div className="space-y-4">
      {/* 설명 및 툴팁 */}
      <div className="flex items-center gap-2">
        <label className="block text-sm font-semibold text-[var(--text-primary)] font-mono">
          {t.generator.fileUpload.label}
        </label>
        <div
          className="relative"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <span className="text-[var(--accent-cyan)] cursor-help font-mono">ⓘ</span>
          {showTooltip && (
            <div className="absolute left-0 top-6 z-50 w-80 p-4 bg-[var(--bg-primary)] border border-[var(--accent-cyan)] rounded shadow-lg">
              <div className="text-xs font-mono space-y-2 text-[var(--text-secondary)]">
                <div className="text-[var(--accent-cyan)] font-semibold">📋 {t.generator.fileUpload.tooltipTitle}</div>
                <div>• {t.generator.fileUpload.maxFiles}: {maxFiles}{t.generator.fileUpload.filesUnit}</div>
                <div>• {t.generator.fileUpload.maxFileSize}: {maxFileSize}MB</div>
                <div>• {t.generator.fileUpload.maxTotalSize}: {maxTotalSize}MB</div>
                <div className="text-[var(--accent-cyan)] font-semibold mt-2">📁 {t.generator.fileUpload.supportedFormatsTitle}</div>
                <div>• {t.generator.fileUpload.supportedDocs}</div>
                <div>• {t.generator.fileUpload.supportedImages}</div>
                <div>• {t.generator.fileUpload.supportedCode}</div>
                <div className="text-[var(--text-dimmed)] mt-2">
                  ※ {t.generator.fileUpload.aiAnalysisNote}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 드래그 앤 드롭 영역 */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded p-8 text-center transition-all ${
          disabled
            ? 'border-[var(--border)] bg-[var(--bg-tertiary)] opacity-50 cursor-not-allowed'
            : isDragging
            ? 'border-[var(--accent-cyan)] bg-[var(--accent-cyan)]/5'
            : 'border-[var(--border)] hover:border-[var(--accent-cyan)] hover:bg-[var(--bg-tertiary)] cursor-pointer'
        }`}
      >
        <div className="text-4xl mb-3">📁</div>
        <p className="text-sm font-semibold text-[var(--text-primary)] mb-2 font-mono">
          {disabled ? t.generator.fileUpload.uploadDisabled : t.generator.fileUpload.dragDropText}
        </p>
        <label
          className={`inline-block mt-2 px-5 py-2 rounded font-semibold font-mono transition-all ${
            disabled
              ? 'bg-[var(--border)] text-[var(--text-dimmed)] cursor-not-allowed'
              : 'bg-[var(--accent-cyan)] text-[var(--bg-primary)] cursor-pointer hover:bg-[var(--accent-cyan)]/80'
          }`}
        >
          {t.generator.fileUpload.selectFileButton}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={allowedExtensions.join(',')}
            className="hidden"
            onChange={handleFileSelect}
            disabled={disabled}
          />
        </label>
        <p className="text-xs text-[var(--text-dimmed)] mt-3 font-mono">
          {t.generator.fileUpload.limitText} {maxFiles}{t.generator.fileUpload.filesUnit}, {t.generator.fileUpload.perFile} {maxFileSize}MB, {t.generator.fileUpload.total} {maxTotalSize}MB
        </p>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="p-3 bg-[var(--error-red)]/10 border-l-4 border-[var(--error-red)] rounded">
          <p className="text-[var(--error-red)] font-semibold text-sm font-mono">ERROR: {error}</p>
        </div>
      )}

      {/* 선택된 파일 목록 */}
      {selectedFiles.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[var(--text-primary)] font-mono">
              {t.generator.fileUpload.selectedFiles} ({selectedFiles.length}/{maxFiles})
            </p>
            <p className="text-xs text-[var(--text-dimmed)] font-mono">
              {t.generator.fileUpload.totalSize}: {formatFileSize(totalSize)} / {maxTotalSize}MB
            </p>
          </div>

          <div className="space-y-2">
            {selectedFiles.map((fileInfo, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded hover:border-[var(--accent-cyan)] transition-all"
              >
                {/* 파일 아이콘 또는 이미지 미리보기 */}
                {fileInfo.preview ? (
                  <img
                    src={fileInfo.preview}
                    alt={fileInfo.file.name}
                    className="w-10 h-10 object-cover rounded border border-[var(--border)]"
                  />
                ) : (
                  <span className="text-2xl">{getFileIcon(fileInfo.file.name)}</span>
                )}

                {/* 파일 정보 */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--text-primary)] font-mono truncate">
                    {fileInfo.file.name}
                  </p>
                  <p className="text-xs text-[var(--text-dimmed)] font-mono">
                    {formatFileSize(fileInfo.file.size)}
                  </p>
                </div>

                {/* 삭제 버튼 */}
                <button
                  onClick={() => removeFile(index)}
                  className="px-3 py-1 text-xs font-semibold text-[var(--error-red)] border border-[var(--error-red)] rounded hover:bg-[var(--error-red)]/10 transition-all font-mono"
                >
                  {t.generator.fileUpload.deleteButton}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
