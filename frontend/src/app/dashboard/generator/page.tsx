'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import FileUploadZone, { UploadedFileInfo } from '@/components/FileUploadZone';

// API URL 설정
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type ProcessStep =
  | 'select-mode'
  | 'input'
  | 'generating-excel'
  | 'excel-completed'
  | 'upload-excel'
  | 'upload-completed'
  | 'combined-config'
  | 'generating-data'
  | 'data-completed'
  | 'sending-data'
  | 'sent';

interface Settings {
  ANTHROPIC_API_KEY: string;
  OPENAI_API_KEY: string;
  GEMINI_API_KEY: string;
  EXCEL_AI_PROVIDER: string;
  DATA_AI_PROVIDER: string;
  DATA_AI_MODEL: string;  // Custom data generation model (optional)
  VALIDATION_MODEL_TIER: string;  // 'fast' or 'balanced'
  CUSTOM_VALIDATION_MODEL: string;  // Custom validation model (optional)
  TE_APP_ID: string;
  TE_RECEIVER_URL: string;
  DATA_RETENTION_DAYS: string;
  EXCEL_RETENTION_DAYS: string;
  AUTO_DELETE_AFTER_SEND: string;
}

interface ExcelPreviewSummary {
  events: number;
  eventProperties: number;
  commonProperties: number;
  userData?: number;
  eventNames?: string[];
  sampleProperties?: { name: string; type: string }[];
  generatedAt?: string;
  provider?: string;
  requestedEventCount?: number;
}

export default function Home() {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    scenario: '',
    dau: '',
    industry: '',
    notes: '',
    dateStart: '2025-01-01',
    dateEnd: '2025-01-03',
  });
  const [currentStep, setCurrentStep] = useState<ProcessStep>('select-mode');
  const [startMode, setStartMode] = useState<'new' | 'upload' | null>(null);
  const [uploadedExcelPath, setUploadedExcelPath] = useState<string>('');
  const [excelPreview, setExcelPreview] = useState<ExcelPreviewSummary | null>(null);
  const [uploadError, setUploadError] = useState<string>('');
  const [generatedExcelPath, setGeneratedExcelPath] = useState<string>('');
  const [runId, setRunId] = useState<string>('');
  const [progress, setProgress] = useState<any>(null);
  const [sendAppId, setSendAppId] = useState<string>('');
  const [settings, setSettings] = useState<Settings>({
    ANTHROPIC_API_KEY: '',
    OPENAI_API_KEY: '',
    EXCEL_AI_PROVIDER: 'anthropic',
    DATA_AI_PROVIDER: 'anthropic',
    DATA_AI_MODEL: '',
    VALIDATION_MODEL_TIER: 'fast',
    CUSTOM_VALIDATION_MODEL: '',
    TE_APP_ID: '',
    TE_RECEIVER_URL: 'https://te-receiver-naver.thinkingdata.kr/',
    DATA_RETENTION_DAYS: '7',
    EXCEL_RETENTION_DAYS: '30',
    AUTO_DELETE_AFTER_SEND: 'false',
  });
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileInfo[]>([]);
  const [fileAnalysisResult, setFileAnalysisResult] = useState<any>(null);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);

  // 설정 로드
  useEffect(() => {
    fetch(`${API_URL}/api/settings`)
      .then(res => res.json())
      .then(data => {
        setSettings(data);
        setSendAppId(data.TE_APP_ID || ''); // 기본값 설정
      })
      .catch(err => console.error('Failed to load settings:', err));
  }, []);

  // 진행 상태 폴링
  useEffect(() => {
    if (!runId || currentStep === 'select-mode' || currentStep === 'input' || currentStep === 'excel-completed' || currentStep === 'data-completed' || currentStep === 'upload-excel' || currentStep === 'upload-completed' || currentStep === 'combined-config') return;

    const interval = setInterval(() => {
      fetch(`${API_URL}/api/generate/status/${runId}`)
        .then(res => res.json())
        .then(data => {
          setProgress(data);

          // 상태에 따라 단계 변경
          if (data.status === 'completed' && currentStep === 'generating-data') {
            setCurrentStep('data-completed');
            clearInterval(interval);
          } else if (data.status === 'sent' && currentStep === 'sending-data') {
            setCurrentStep('sent');
            clearInterval(interval);
          } else if (data.status === 'error' || data.status === 'send-error') {
            clearInterval(interval);
          }
        })
        .catch(err => console.error('Failed to fetch progress:', err));
    }, 2000);

    return () => clearInterval(interval);
  }, [runId, currentStep]);

  // 서비스 정보 검증 (Excel 생성용)
  // 파일 업로드 및 AI 분석 처리
  const handleFilesSelected = async (files: UploadedFileInfo[]) => {
    setUploadedFiles(files);

    if (files.length === 0) {
      setFileAnalysisResult(null);
      return;
    }

    // 파일 업로드 및 AI 분석
    setIsUploadingFiles(true);
    try {
      const uploadFormData = new FormData();
      files.forEach(fileInfo => {
        uploadFormData.append('files', fileInfo.file);
      });

      const response = await fetch(`${API_URL}/api/files/analyze-multi`, {
        method: 'POST',
        body: uploadFormData,
      });

      if (!response.ok) {
        throw new Error('파일 업로드 실패');
      }

      const result = await response.json();
      setFileAnalysisResult(result.analysis);

      console.log('📊 파일 분석 완료:', result);
    } catch (error) {
      console.error('파일 업로드 오류:', error);
      alert('파일 업로드 중 오류가 발생했습니다.');
    } finally {
      setIsUploadingFiles(false);
    }
  };

  const validateServiceInfo = () => {
    if (!formData.scenario.trim()) {
      alert('시나리오 설명을 입력해주세요');
      return false;
    }
    if (!formData.industry.trim()) {
      alert('산업을 입력해주세요');
      return false;
    }
    if (!formData.notes.trim()) {
      alert('서비스 특징을 입력해주세요');
      return false;
    }
    return true;
  };

  // 데이터 생성 설정 검증 (DAU, 날짜 포함)
  const validateDataSettings = () => {
    if (!validateServiceInfo()) return false;

    if (!formData.dau || parseInt(formData.dau) <= 0) {
      alert('DAU를 입력해주세요 (1 이상)');
      return false;
    }
    if (!formData.dateStart) {
      alert('시작 날짜를 입력해주세요');
      return false;
    }
    if (!formData.dateEnd) {
      alert('종료 날짜를 입력해주세요');
      return false;
    }
    if (new Date(formData.dateStart) > new Date(formData.dateEnd)) {
      alert('시작 날짜는 종료 날짜보다 이전이어야 합니다');
      return false;
    }
    return true;
  };

  const handleStartExcelGeneration = async () => {
    if (!validateServiceInfo()) return;

    setCurrentStep('generating-excel');
    setGeneratedExcelPath('');
    setExcelPreview(null);
    setProgress({
      status: 'generating-excel',
      progress: 5,
      message: 'Excel 스키마 생성 시작...',
      details: ['🤖 AI 엔진 초기화 중...']
    });

    try {
      // Use SSE endpoint for real-time progress
      const response = await fetch(`${API_URL}/api/excel/generate-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario: formData.scenario,
          industry: formData.industry,
          notes: formData.notes,
        })
      });

      if (!response.ok) {
        throw new Error('Excel 생성 요청 실패');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Stream reader not available');
      }

      let finalResult: any = null;
      const progressDetails: string[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'progress') {
                // Add detail to progress log
                if (data.detail) {
                  progressDetails.push(data.detail);
                  // Keep only last 50 details for performance
                  if (progressDetails.length > 50) {
                    progressDetails.shift();
                  }
                }

                setProgress({
                  status: 'generating-excel',
                  progress: data.progress,
                  message: data.message,
                  details: [...progressDetails]
                });
              } else if (data.type === 'complete') {
                finalResult = data;
              } else if (data.type === 'error') {
                throw new Error(data.error);
              }
            } catch (e) {
              console.warn('Failed to parse SSE data:', e);
            }
          }
        }
      }

      if (!finalResult) {
        throw new Error('Excel 생성 완료 데이터를 받지 못했습니다');
      }

      const data = finalResult;

      if (!data.file?.path) {
        throw new Error('생성된 Excel 파일 경로를 찾을 수 없습니다');
      }

      setGeneratedExcelPath(data.file.path);
      setExcelPreview({
        events: data.preview?.events ?? 0,
        eventProperties: data.preview?.eventProperties ?? 0,
        commonProperties: data.preview?.commonProperties ?? 0,
        userData: data.preview?.userData ?? 0,
        eventNames: data.preview?.eventNames ?? [],
        generatedAt: data.preview?.generatedAt,
        provider: data.preview?.provider
      });

      setCurrentStep('excel-completed');

    } catch (error) {
      console.error('Excel generation failed:', error);
      const message = error instanceof Error ? error.message : 'Excel 생성 요청 실패';
      alert(message);
      setCurrentStep('input');
      setProgress(null);
    }
  };

  const handleStartDataGeneration = async () => {
    if (!validateDataSettings()) return;

    setCurrentStep('generating-data');
    setProgress({ status: 'starting', progress: 5, message: '생성된 Excel을 바탕으로 데이터 생성 준비 중...' });

    try {
      const response = await fetch(`${API_URL}/api/generate/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          excelPath: generatedExcelPath,
          scenario: formData.scenario,
          dau: formData.dau,
          industry: formData.industry,
          notes: formData.notes,
          dateStart: formData.dateStart,
          dateEnd: formData.dateEnd,
          aiProvider: settings.DATA_AI_PROVIDER || 'anthropic',
          fileAnalysisContext: fileAnalysisResult?.combinedInsights || null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setRunId(data.runId);
      } else {
        alert(`에러: ${data.error}`);
        setCurrentStep('excel-completed');
        setProgress(null);
      }
    } catch (error) {
      console.error('Data generation failed:', error);
      alert('데이터 생성 요청 실패');
      setCurrentStep('excel-completed');
      setProgress(null);
    }
  };

  const handleSendData = async () => {
    if (!sendAppId.trim()) {
      alert('APP_ID를 입력해주세요');
      return;
    }

    setCurrentStep('sending-data');
    setProgress({ status: 'sending', progress: 0, message: 'ThinkingEngine으로 데이터 전송 준비 중...' });

    try {
      const response = await fetch(`${API_URL}/api/send-data/${runId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appId: sendAppId.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send data');
      }
    } catch (error: any) {
      console.error('Data sending failed:', error);
      alert(`데이터 전송 실패: ${error.message}`);
      setCurrentStep('data-completed');
      setProgress(null);
    }
  };

  const handleFileUpload = async (file: File) => {
    setUploadError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_URL}/api/excel/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const data = await response.json();
      setUploadedExcelPath(data.file.path);
      setExcelPreview(data.preview);
      setCurrentStep('upload-completed');
    } catch (error: any) {
      setUploadError(error.message);
    }
  };

  const handleCombinedConfigGenerate = async () => {
    if (!validateDataSettings()) return;

    const payload = {
      excelPath: uploadedExcelPath,
      scenario: formData.scenario,
      dau: formData.dau,
      industry: formData.industry,
      notes: formData.notes,
      dateStart: formData.dateStart,
      dateEnd: formData.dateEnd,
      aiProvider: settings.DATA_AI_PROVIDER || 'anthropic',
      fileAnalysisContext: fileAnalysisResult?.combinedInsights || null,
    };

    try {
      const response = await fetch(`${API_URL}/api/generate/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Generation failed');

      const data = await response.json();
      setRunId(data.runId);
      setCurrentStep('generating-data');
    } catch (error) {
      alert('데이터 생성 시작 실패');
    }
  };

  const handleComplete = () => {
    setCurrentStep('select-mode');
    setStartMode(null);
    setUploadedExcelPath('');
    setExcelPreview(null);
    setUploadError('');
    setGeneratedExcelPath('');
    setRunId('');
    setProgress(null);
    setFormData({
      scenario: '',
      dau: '',
      industry: '',
      notes: '',
      dateStart: '2025-01-01',
      dateEnd: '2025-01-03',
    });
  };


  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-8 scan-lines">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2 text-terminal-cyan">
            &gt; ThinkingEngine
          </h1>
          <p className="text-[var(--text-secondary)] font-mono text-sm">
            {t.dashboard.dataGeneratorDesc}
          </p>
        </div>

        {/* Progress Steps */}
        {currentStep !== 'select-mode' && (
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {[
                { key: 'input', label: startMode === 'new' ? t.generator.stepInput : t.generator.stepUpload, icon: startMode === 'new' ? '✎' : '⇪' },
                { key: 'excel', label: startMode === 'new' ? t.generator.stepExcel : t.generator.stepSettings, icon: startMode === 'new' ? '▦' : '⚙' },
                { key: 'data', label: t.generator.stepData, icon: '⚡' },
                { key: 'send', label: t.generator.stepSend, icon: '⇈' },
                { key: 'complete', label: t.generator.stepComplete, icon: '✓' }
              ].map((step, index) => {
                const isActive =
                  (step.key === 'input' && (currentStep === 'input' || currentStep === 'upload-excel')) ||
                  (step.key === 'excel' && (currentStep === 'generating-excel' || currentStep === 'excel-completed' || currentStep === 'upload-completed' || currentStep === 'combined-config')) ||
                  (step.key === 'data' && (currentStep === 'generating-data' || currentStep === 'data-completed')) ||
                  (step.key === 'send' && currentStep === 'sending-data') ||
                  (step.key === 'complete' && currentStep === 'sent');

                const isCompleted =
                  (step.key === 'input' && !['select-mode', 'input', 'upload-excel'].includes(currentStep)) ||
                  (step.key === 'excel' && ['generating-data', 'data-completed', 'sending-data', 'sent'].includes(currentStep)) ||
                  (step.key === 'data' && ['sending-data', 'sent'].includes(currentStep)) ||
                  (step.key === 'send' && currentStep === 'sent');

                return (
                  <div key={step.key} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1">
                      <div className={`w-10 h-10 rounded border-2 flex items-center justify-center text-xl mb-2 transition-all font-mono ${
                        isActive
                          ? 'border-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] terminal-glow-cyan'
                          : isCompleted
                          ? 'border-[var(--accent-green)] bg-[var(--accent-green)]/10 text-[var(--accent-green)]'
                          : 'border-[var(--border)] text-[var(--text-dimmed)]'
                      }`}>
                        {step.icon}
                      </div>
                      <span className={`text-xs font-mono ${
                        isActive ? 'text-[var(--accent-cyan)]' : 'text-[var(--text-secondary)]'
                      }`}>
                        {step.label}
                      </span>
                    </div>
                    {index < 4 && (
                      <div className={`h-0.5 flex-1 mx-2 transition-all ${
                        isCompleted ? 'bg-[var(--accent-green)]' : 'bg-[var(--border)]'
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Main Content */}
        {/* Select Mode Screen */}
        {currentStep === 'select-mode' && (
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded p-8">
            <h2 className="text-2xl font-bold mb-8 text-terminal-cyan font-mono">
              &gt; {t.generator.title}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* New Start */}
              <button
                onClick={() => {
                  setStartMode('new');
                  setCurrentStep('input');
                }}
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
                onClick={() => {
                  setStartMode('upload');
                  setCurrentStep('upload-excel');
                }}
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
        )}

        {currentStep === 'input' && (
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded p-8 mb-6 terminal-glow">
            <h2 className="text-2xl font-bold mb-6 text-terminal-cyan font-mono flex items-center gap-2">
              <span>▦</span> {t.generator.serviceInfo}
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold mb-2 text-[var(--text-primary)] font-mono">
                  {t.generator.scenario} <span className="text-[var(--error-red)]">*</span>
                </label>
                <textarea
                  value={formData.scenario}
                  onChange={(e) => setFormData({ ...formData, scenario: e.target.value })}
                  className="w-full p-4 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:border-[var(--accent-cyan)] focus:outline-none transition-all font-mono text-sm terminal-scrollbar"
                  rows={4}
                  placeholder={t.generator.scenarioPlaceholder}
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-[var(--text-primary)] font-mono">
                    {t.generator.industry} <span className="text-[var(--error-red)]">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    className="w-full p-4 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:border-[var(--accent-cyan)] focus:outline-none transition-all font-mono text-sm"
                    placeholder={t.generator.industryPlaceholder}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-[var(--text-primary)] font-mono">
                    {t.generator.notes} <span className="text-[var(--error-red)]">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full p-4 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:border-[var(--accent-cyan)] focus:outline-none transition-all font-mono text-sm"
                    placeholder={t.generator.notesPlaceholder}
                  />
                </div>
              </div>
            </div>

            {/* 파일 업로드 섹션 */}
            <div className="mt-8 pt-6 border-t border-[var(--border)]">
              <FileUploadZone
                onFilesSelected={handleFilesSelected}
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
                onClick={handleComplete}
                className="py-4 rounded text-[var(--text-secondary)] font-mono font-semibold bg-[var(--bg-tertiary)] border border-[var(--border)] hover:border-[var(--border-bright)] hover:text-[var(--text-primary)] transition-all"
              >
                &lt; {t.generator.home}
              </button>
              <button
                onClick={handleStartExcelGeneration}
                disabled={isUploadingFiles}
                className="py-4 rounded text-[var(--bg-primary)] font-mono font-bold bg-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/80 transition-all terminal-glow-cyan disabled:opacity-50 disabled:cursor-not-allowed"
              >
                &gt; {t.generator.generateStart}
              </button>
            </div>
          </div>
        )}

        {/* Excel Generation Progress */}
        {currentStep === 'generating-excel' && progress && (
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded p-8 terminal-glow">
            <h2 className="text-2xl font-bold mb-6 text-terminal-cyan font-mono flex items-center gap-2">
              <span className="animate-pulse">▣</span> {t.generator.generatingExcelSchema}
            </h2>

            {/* Current Stage Badge */}
            <div className="mb-4">
              <span className="inline-block px-4 py-2 rounded text-sm font-semibold bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] border border-[var(--accent-cyan)] font-mono">
                {progress.progress < 30 ? '🔹 Stage 1: 이벤트 구조 분석' :
                 progress.progress < 70 ? '🔹 Stage 2: 속성 범위 생성' :
                 progress.progress < 90 ? '🔹 Stage 3: 유저 데이터 생성' :
                 '📝 Excel 파일 작성'}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-[var(--text-secondary)] font-mono">{t.generator.progress}</span>
                <span className="text-sm font-bold text-[var(--accent-cyan)] font-mono">{progress.progress}%</span>
              </div>
              <div className="w-full bg-[var(--bg-tertiary)] rounded h-4 overflow-hidden border border-[var(--border)]">
                <div
                  className="bg-[var(--accent-cyan)] h-4 transition-all duration-500 relative overflow-hidden"
                  style={{ width: `${progress.progress}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                </div>
              </div>
            </div>

            {/* Current Message */}
            <div className="p-4 bg-[var(--bg-tertiary)] rounded border border-[var(--border)] mb-4">
              <p className="text-[var(--text-primary)] font-mono text-sm">&gt; {progress.message}</p>
            </div>

            {/* Detailed Progress Log */}
            {progress.details && progress.details.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-2 font-mono">실시간 진행 상황</h3>
                <div className="bg-[var(--bg-primary)] rounded border border-[var(--border)] p-4 max-h-64 overflow-y-auto terminal-scrollbar">
                  <div className="space-y-1">
                    {progress.details.map((detail: string, idx: number) => (
                      <div key={idx} className="text-xs font-mono text-[var(--text-secondary)]">
                        {detail}
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-[var(--text-dimmed)] mt-2 font-mono">
                  {progress.details.length}개 작업 진행 중 (자동 업데이트)
                </p>
              </div>
            )}
          </div>
        )}

        {/* Excel Completed */}
        {currentStep === 'excel-completed' && (
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
                  <label className="block text-sm font-semibold mb-2 text-[var(--text-primary)] font-mono">
                    {t.generator.dau} <span className="text-[var(--error-red)]">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.dau}
                    onChange={(e) => setFormData({ ...formData, dau: e.target.value })}
                    className="w-full p-4 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:border-[var(--accent-cyan)] focus:outline-none transition-all font-mono"
                    min="1"
                    placeholder={t.generator.dauPlaceholder}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-[var(--text-primary)] font-mono">
                    {t.generator.startDate} <span className="text-[var(--error-red)]">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.dateStart}
                    onChange={(e) => setFormData({ ...formData, dateStart: e.target.value })}
                    className="w-full p-4 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:border-[var(--accent-cyan)] focus:outline-none transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-[var(--text-primary)] font-mono">
                    {t.generator.endDate} <span className="text-[var(--error-red)]">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.dateEnd}
                    onChange={(e) => setFormData({ ...formData, dateEnd: e.target.value })}
                    className="w-full p-4 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:border-[var(--accent-cyan)] focus:outline-none transition-all font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => {
                  const filename = generatedExcelPath.split('/').pop() || '';
                  if (filename) {
                    window.open(`/api/excel/download/${encodeURIComponent(filename)}`, '_blank');
                  } else {
                    alert('Excel 파일 이름을 찾을 수 없습니다.');
                  }
                }}
                className="py-4 rounded text-[var(--accent-green)] font-mono font-semibold bg-[var(--bg-tertiary)] border border-[var(--accent-green)] hover:bg-[var(--accent-green)]/10 transition-all"
              >
                ⇓ {t.generator.downloadExcel}
              </button>
              <button
                onClick={handleComplete}
                className="py-4 rounded text-[var(--text-secondary)] font-mono font-semibold bg-[var(--bg-tertiary)] border border-[var(--border)] hover:border-[var(--border-bright)] transition-all"
              >
                &lt; {t.generator.home}
              </button>
            </div>

            <button
              onClick={handleStartDataGeneration}
              className="w-full mt-4 py-5 rounded text-[var(--bg-primary)] font-mono font-bold text-lg bg-[var(--accent-green)] hover:bg-[var(--accent-green)]/80 transition-all terminal-glow-green"
            >
              &gt; {t.generator.dataGenerationStart}
            </button>
          </div>
        )}

        {/* Upload Excel Screen */}
        {currentStep === 'upload-excel' && (
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded p-8 terminal-glow">
            <h2 className="text-2xl font-bold mb-6 text-terminal-cyan font-mono flex items-center gap-2">
              <span>⇪</span> {t.generator.uploadExcelTitle}
            </h2>

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
                  handleFileUpload(file);
                } else {
                  setUploadError(t.generator.supportedFormats);
                }
              }}
              className="border-2 border-dashed border-[var(--border)] rounded p-12 text-center transition-all cursor-pointer hover:border-[var(--accent-cyan)] hover:bg-[var(--bg-tertiary)]"
            >
              <div className="text-6xl mb-4 text-[var(--accent-cyan)]">⇪</div>
              <p className="text-lg font-semibold text-[var(--text-primary)] mb-2 font-mono">
                {t.generator.dragDrop}
              </p>
              <label className="inline-block mt-4 px-6 py-3 bg-[var(--accent-cyan)] text-[var(--bg-primary)] font-semibold rounded cursor-pointer hover:bg-[var(--accent-cyan)]/80 transition-all font-mono">
                {t.generator.selectFile}
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                />
              </label>
              <p className="text-sm text-[var(--text-dimmed)] mt-4 font-mono">
                {t.generator.supportedFormats}
              </p>
            </div>

            {uploadError && (
              <div className="mt-4 p-4 bg-[var(--error-red)]/10 border-l-4 border-[var(--error-red)] rounded">
                <p className="text-[var(--error-red)] font-semibold font-mono">ERROR: {uploadError}</p>
              </div>
            )}

            <button
              onClick={() => {
                setCurrentStep('select-mode');
                setStartMode(null);
                setUploadError('');
              }}
              className="w-full mt-6 py-3 rounded text-[var(--text-secondary)] font-mono font-semibold bg-[var(--bg-tertiary)] border border-[var(--border)] hover:border-[var(--border-bright)] transition-all"
            >
              &lt; {t.generator.previous}
            </button>
          </div>
        )}

        {/* Upload Completed Screen */}
        {currentStep === 'upload-completed' && excelPreview && (
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded p-8 terminal-glow">
            <h2 className="text-2xl font-bold mb-6 text-terminal-green font-mono flex items-center gap-2">
              <span>✓</span> {t.generator.uploadComplete}
            </h2>

            <div className="p-6 bg-[var(--accent-green)]/10 rounded border border-[var(--accent-green)] mb-6">
              <h3 className="font-bold text-[var(--accent-green)] mb-4 text-lg font-mono">{t.generator.fileInfo}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[var(--bg-tertiary)] border border-[var(--border)] p-4 rounded">
                  <p className="text-xs text-[var(--text-dimmed)] font-mono">{t.generator.eventCount}</p>
                  <p className="text-2xl font-bold text-[var(--accent-cyan)] font-mono">{excelPreview.events || 0}</p>
                </div>
                <div className="bg-[var(--bg-tertiary)] border border-[var(--border)] p-4 rounded">
                  <p className="text-xs text-[var(--text-dimmed)] font-mono">{t.generator.eventProperties}</p>
                  <p className="text-2xl font-bold text-[var(--accent-cyan)] font-mono">{excelPreview.eventProperties || 0}</p>
                </div>
                <div className="bg-[var(--bg-tertiary)] border border-[var(--border)] p-4 rounded">
                  <p className="text-xs text-[var(--text-dimmed)] font-mono">{t.generator.commonProperties}</p>
                  <p className="text-2xl font-bold text-[var(--accent-cyan)] font-mono">{excelPreview.commonProperties || 0}</p>
                </div>
                <div className="bg-[var(--bg-tertiary)] border border-[var(--border)] p-4 rounded">
                  <p className="text-xs text-[var(--text-dimmed)] font-mono">{t.generator.userData}</p>
                  <p className="text-2xl font-bold text-[var(--accent-cyan)] font-mono">{excelPreview.userData || 0}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleComplete}
                className="py-4 rounded text-[var(--text-secondary)] font-mono font-semibold bg-[var(--bg-tertiary)] border border-[var(--border)] hover:border-[var(--border-bright)] transition-all"
              >
                &lt; {t.generator.home}
              </button>
              <button
                onClick={() => setCurrentStep('combined-config')}
                className="py-5 rounded text-[var(--bg-primary)] font-mono font-bold text-lg bg-[var(--accent-green)] hover:bg-[var(--accent-green)]/80 transition-all terminal-glow-green"
              >
                {t.generator.nextServiceInfo} &gt;
              </button>
            </div>
          </div>
        )}

        {/* Combined Config Screen */}
        {currentStep === 'combined-config' && (
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded p-8 mb-6 terminal-glow">
            <h2 className="text-2xl font-bold mb-6 text-terminal-cyan font-mono flex items-center gap-2">
              <span>▦</span> {t.generator.serviceInfoAndSettings}
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold mb-2 text-[var(--text-primary)] font-mono">
                  {t.generator.scenario} <span className="text-[var(--error-red)]">*</span>
                </label>
                <textarea
                  value={formData.scenario}
                  onChange={(e) => setFormData({ ...formData, scenario: e.target.value })}
                  className="w-full p-4 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:border-[var(--accent-cyan)] focus:outline-none transition-all font-mono text-sm terminal-scrollbar"
                  rows={4}
                  placeholder={t.generator.scenarioPlaceholder}
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-[var(--text-primary)] font-mono">
                    {t.generator.industry} <span className="text-[var(--error-red)]">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    className="w-full p-4 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:border-[var(--accent-cyan)] focus:outline-none transition-all font-mono text-sm"
                    placeholder={t.generator.industryPlaceholder}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-[var(--text-primary)] font-mono">
                    {t.generator.notes} <span className="text-[var(--error-red)]">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full p-4 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:border-[var(--accent-cyan)] focus:outline-none transition-all font-mono text-sm"
                    placeholder={t.generator.notesPlaceholder}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-[var(--text-primary)] font-mono">
                    {t.generator.dau}
                  </label>
                  <input
                    type="number"
                    value={formData.dau}
                    onChange={(e) => setFormData({ ...formData, dau: e.target.value })}
                    className="w-full p-4 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:border-[var(--accent-cyan)] focus:outline-none transition-all font-mono"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-[var(--text-primary)] font-mono">
                    {t.generator.startDate}
                  </label>
                  <input
                    type="date"
                    value={formData.dateStart}
                    onChange={(e) => setFormData({ ...formData, dateStart: e.target.value })}
                    className="w-full p-4 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:border-[var(--accent-cyan)] focus:outline-none transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-[var(--text-primary)] font-mono">
                    {t.generator.endDate}
                  </label>
                  <input
                    type="date"
                    value={formData.dateEnd}
                    onChange={(e) => setFormData({ ...formData, dateEnd: e.target.value })}
                    className="w-full p-4 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:border-[var(--accent-cyan)] focus:outline-none transition-all font-mono"
                  />
                </div>
              </div>
            </div>

            {/* 파일 업로드 섹션 */}
            <div className="mt-8 pt-6 border-t border-[var(--border)]">
              <FileUploadZone
                onFilesSelected={handleFilesSelected}
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
                onClick={handleComplete}
                className="py-4 rounded text-[var(--text-secondary)] font-mono font-semibold bg-[var(--bg-tertiary)] border border-[var(--border)] hover:border-[var(--border-bright)] transition-all"
              >
                &lt; {t.generator.home}
              </button>
              <button
                onClick={handleCombinedConfigGenerate}
                disabled={isUploadingFiles}
                className="py-4 rounded text-[var(--bg-primary)] font-mono font-bold text-lg bg-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/80 transition-all terminal-glow-cyan disabled:opacity-50 disabled:cursor-not-allowed"
              >
                &gt; {t.generator.generateStart}
              </button>
            </div>
          </div>
        )}

        {/* Data Generation Progress */}
        {currentStep === 'generating-data' && progress && progress.status !== 'error' && (
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded p-8 terminal-glow">
            <h2 className="text-2xl font-bold mb-6 text-terminal-cyan font-mono flex items-center gap-2">
              <span className="animate-pulse">⚡</span> {t.generator.generatingData}
            </h2>

            {/* Current Phase Badge */}
            <div className="mb-4">
              <span className={`inline-block px-4 py-2 rounded text-sm font-semibold bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] border border-[var(--accent-cyan)] font-mono`}>
                {progress.status === 'parsing' ? '▦ 1/5: Excel 파싱' :
                 progress.status === 'analyzing' && progress.progress < 35 ? '🤖 2/5: AI 전략 분석 (Phase 1)' :
                 progress.status === 'analyzing' && progress.progress < 55 ? '📈 2/5: AI 리텐션/시퀀싱 분석' :
                 progress.status === 'analyzing' && progress.progress < 80 ? '🎯 2/5: AI 이벤트 그룹 분석 (Phase 2)' :
                 progress.status === 'analyzing' ? '⚡ 2/5: AI 분석 완료' :
                 progress.status === 'generating' && progress.progress < 55 ? '👥 3/5: 사용자 코호트 생성' :
                 progress.status === 'generating' ? '📊 4/5: 이벤트 데이터 생성' :
                 progress.status === 'saving' ? '💾 5/5: 메타데이터 저장' :
                 progress.step || `⋯ ${t.generator.processing}`}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-[var(--text-secondary)] font-mono">{t.generator.progress}</span>
                <span className="text-sm font-bold text-[var(--accent-cyan)] font-mono">{progress.progress}%</span>
              </div>
              <div className="w-full bg-[var(--bg-tertiary)] rounded h-4 overflow-hidden border border-[var(--border)]">
                <div
                  className="bg-[var(--accent-cyan)] h-4 transition-all duration-500 relative overflow-hidden"
                  style={{ width: `${progress.progress}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                </div>
              </div>
            </div>

            {/* Current Message */}
            <div className="p-4 bg-[var(--bg-tertiary)] rounded border border-[var(--border)] mb-4">
              <p className="text-[var(--text-primary)] font-mono text-sm">&gt; {progress.message}</p>
            </div>

            {/* AI 분석 상세 로그 */}
            {progress.details && progress.details.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-2 font-mono">{t.generator.detailedProgress}</h3>
                <div className="bg-[var(--bg-primary)] rounded border border-[var(--border)] p-4 max-h-96 overflow-y-auto terminal-scrollbar">
                  <div className="space-y-0.5">
                    {progress.details.map((detail: string, idx: number) => (
                      <div key={idx} className="text-xs font-mono">
                        <span className={`${
                          detail.includes('✅') || detail.includes('완료') ? 'text-[var(--accent-green)]' :
                          detail.includes('⚠️') || detail.includes('경고') ? 'text-[var(--accent-yellow)]' :
                          detail.includes('❌') || detail.includes('오류') ? 'text-[var(--error-red)]' :
                          detail.includes('⚡') || detail.includes('AI') ? 'text-[var(--accent-cyan)]' :
                          detail.includes('▦') || detail.includes('Phase') ? 'text-[var(--accent-magenta)]' :
                          detail.startsWith('  ') ? 'text-[var(--text-dimmed)]' :
                          'text-[var(--text-secondary)]'
                        }`}>
                          {detail}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-[var(--text-dimmed)] mt-2 font-mono">
                  {progress.details.length}{t.generator.autoUpdate}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Data Generation Error */}
        {currentStep === 'generating-data' && progress && progress.status === 'error' && (
          <div className="bg-[var(--bg-secondary)] border border-[var(--error-red)] rounded p-8">
            <h2 className="text-2xl font-bold mb-6 text-[var(--error-red)] font-mono flex items-center gap-2">
              <span>✗</span> {t.generator.errorTitle}
            </h2>
            <div className="p-6 bg-[var(--error-red)]/10 rounded border border-[var(--error-red)] mb-6">
              <p className="text-[var(--error-red)] font-semibold mb-2 font-mono">{t.generator.errorOccurred}</p>
              <p className="text-[var(--text-primary)] mb-4 font-mono">{progress.message}</p>
              {progress.error && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium font-mono">
                    {t.generator.detailedErrorInfo}
                  </summary>
                  <div className="mt-3 p-4 bg-[var(--bg-primary)] rounded border border-[var(--border)]">
                    <pre className="text-xs text-[var(--accent-green)] font-mono overflow-x-auto whitespace-pre-wrap terminal-scrollbar">{progress.error}</pre>
                  </div>
                </details>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => {
                  setCurrentStep('excel-completed');
                  setProgress(null);
                  setRunId('');
                }}
                className="py-4 rounded text-[var(--text-secondary)] font-mono font-semibold bg-[var(--bg-tertiary)] border border-[var(--border)] hover:border-[var(--border-bright)] transition-all"
              >
                &lt; {t.generator.retryPrevious}
              </button>
              <button
                onClick={handleStartDataGeneration}
                className="py-4 rounded text-[var(--bg-primary)] font-mono font-semibold bg-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/80 transition-all"
              >
                ↻ {t.generator.retry}
              </button>
            </div>
          </div>
        )}

        {/* Data Completed */}
        {currentStep === 'data-completed' && progress && progress.result && (
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded p-8 terminal-glow">
            <h2 className="text-2xl font-bold mb-6 text-terminal-green font-mono flex items-center gap-2">
              <span>✓</span> {t.generator.dataGenerationComplete}
            </h2>
            <div className="p-6 bg-[var(--accent-green)]/10 rounded border border-[var(--accent-green)] mb-6">
              <h3 className="font-bold text-[var(--accent-green)] mb-4 text-lg font-mono flex items-center gap-2">
                <span>✓</span> {t.generator.generationComplete}
              </h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-[var(--bg-tertiary)] border border-[var(--border)] p-4 rounded">
                  <p className="text-xs text-[var(--text-dimmed)] font-mono">{t.generator.totalEvents}</p>
                  <p className="text-2xl font-bold text-[var(--accent-cyan)] font-mono">{progress.result.totalEvents?.toLocaleString()}</p>
                </div>
                <div className="bg-[var(--bg-tertiary)] border border-[var(--border)] p-4 rounded">
                  <p className="text-xs text-[var(--text-dimmed)] font-mono">{t.generator.totalUsers}</p>
                  <p className="text-2xl font-bold text-[var(--accent-cyan)] font-mono">{progress.result.totalUsers?.toLocaleString()}</p>
                </div>
                <div className="bg-[var(--bg-tertiary)] border border-[var(--border)] p-4 rounded">
                  <p className="text-xs text-[var(--text-dimmed)] font-mono">{t.generator.totalDays}</p>
                  <p className="text-2xl font-bold text-[var(--accent-cyan)] font-mono">{progress.result.totalDays}일</p>
                </div>
                <div className="bg-[var(--bg-tertiary)] border border-[var(--border)] p-4 rounded">
                  <p className="text-xs text-[var(--text-dimmed)] font-mono">{t.generator.runId}</p>
                  <p className="text-xs font-mono text-[var(--accent-cyan)]">{progress.result.runId}</p>
                </div>
              </div>
              <p className="text-sm text-[var(--text-secondary)] mb-4 font-mono">{t.generator.sendDataToTE}</p>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[var(--text-primary)] font-mono">{t.generator.appId}</label>
                <input
                  type="text"
                  value={sendAppId}
                  onChange={(e) => setSendAppId(e.target.value)}
                  placeholder={t.generator.appIdPlaceholder}
                  className="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:border-[var(--accent-cyan)] focus:outline-none transition-all font-mono"
                />
                <p className="text-xs text-[var(--text-dimmed)] font-mono">{t.generator.appIdDesc}</p>
              </div>
            </div>

            {/* 🆕 AI 분석 결과 다운로드 버튼 */}
            <div className="mb-6 p-4 bg-[var(--accent-cyan)]/10 rounded border border-[var(--accent-cyan)]">
              <h3 className="text-[var(--accent-cyan)] font-semibold mb-2 font-mono flex items-center gap-2">
                <span>📊</span> AI 분석 결과
              </h3>
              <p className="text-sm text-[var(--text-secondary)] mb-3 font-mono">
                AI가 생성한 사용자 세그먼트, 이벤트 순서 규칙, 트랜잭션 정의를 Excel로 다운로드하여 검토할 수 있습니다.
              </p>
              <button
                onClick={async () => {
                  try {
                    const response = await fetch(`${API_URL}/api/generate/analysis-excel`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ runId })
                    });

                    if (!response.ok) {
                      throw new Error('AI 분석 결과 생성 실패');
                    }

                    const data = await response.json();
                    window.open(`${API_URL}${data.file.downloadUrl}`, '_blank');
                  } catch (error) {
                    console.error('Error:', error);
                    alert('AI 분석 결과 다운로드 실패');
                  }
                }}
                className="w-full py-3 rounded text-[var(--accent-cyan)] font-mono font-semibold bg-[var(--bg-tertiary)] border border-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/10 transition-all"
              >
                📥 AI 분석 결과 Excel 다운로드
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleComplete}
                className="py-4 rounded text-[var(--text-secondary)] font-mono font-semibold bg-[var(--bg-tertiary)] border border-[var(--border)] hover:border-[var(--border-bright)] transition-all"
              >
                &lt; {t.generator.home}
              </button>
              <button
                onClick={handleSendData}
                disabled={!sendAppId.trim()}
                className="py-5 rounded text-[var(--bg-primary)] font-mono font-bold text-lg bg-[var(--accent-magenta)] hover:bg-[var(--accent-magenta)]/80 transition-all terminal-glow-magenta disabled:opacity-50 disabled:cursor-not-allowed"
              >
                &gt; {t.generator.sendData}
              </button>
            </div>
          </div>
        )}

        {/* Data Sending Progress */}
        {currentStep === 'sending-data' && progress && progress.status !== 'send-error' && (
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded p-8 terminal-glow">
            <h2 className="text-2xl font-bold mb-6 text-terminal-cyan font-mono flex items-center gap-2">
              <span className="animate-pulse">⇈</span> {t.generator.sendingData}
            </h2>
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-[var(--text-secondary)] font-mono">{t.generator.progress}</span>
                <span className="text-sm font-bold text-[var(--accent-magenta)] font-mono">{progress.progress}%</span>
              </div>
              <div className="w-full bg-[var(--bg-tertiary)] rounded h-4 overflow-hidden border border-[var(--border)]">
                <div
                  className="bg-[var(--accent-magenta)] h-4 transition-all duration-500 relative overflow-hidden"
                  style={{ width: `${progress.progress}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                </div>
              </div>
            </div>
            <div className="p-4 bg-[var(--bg-tertiary)] rounded border border-[var(--border)] mb-4">
              <p className="text-[var(--text-primary)] font-mono text-sm">&gt; {progress.message}</p>
            </div>

            {/* LogBus2 실시간 로그 */}
            {progress.logs && progress.logs.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-2 font-mono">{t.generator.logBusLogs}</h3>
                <div className="bg-[var(--bg-primary)] rounded border border-[var(--border)] p-4 max-h-64 overflow-y-auto terminal-scrollbar">
                  <div className="space-y-1">
                    {progress.logs.map((log: any, idx: number) => (
                      <div key={idx} className="text-xs font-mono">
                        {log.level && (
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold mr-2 ${
                            log.level === 'error' ? 'bg-[var(--error-red)] text-[var(--bg-primary)]' :
                            log.level === 'warn' ? 'bg-[var(--accent-yellow)] text-[var(--bg-primary)]' :
                            log.level === 'info' ? 'bg-[var(--accent-cyan)] text-[var(--bg-primary)]' :
                            'bg-[var(--text-dimmed)] text-[var(--bg-primary)]'
                          }`}>
                            {log.level}
                          </span>
                        )}
                        {log.time && (
                          <span className="text-[var(--text-dimmed)] mr-2">
                            {new Date(log.time).toLocaleTimeString('ko-KR')}
                          </span>
                        )}
                        <span className={`${
                          log.level === 'error' ? 'text-[var(--error-red)]' :
                          log.level === 'warn' ? 'text-[var(--accent-yellow)]' :
                          'text-[var(--accent-green)]'
                        }`}>
                          {log.message || log.raw}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-[var(--text-dimmed)] mt-2 font-mono">
                  {t.generator.recentLogs} {progress.logs.length}{t.generator.logsDisplay}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Data Sending Error */}
        {currentStep === 'sending-data' && progress && progress.status === 'send-error' && (
          <div className="bg-[var(--bg-secondary)] border border-[var(--error-red)] rounded p-8">
            <h2 className="text-2xl font-bold mb-6 text-[var(--error-red)] font-mono flex items-center gap-2">
              <span>✗</span> {t.generator.sendErrorTitle}
            </h2>
            <div className="p-6 bg-[var(--error-red)]/10 rounded border border-[var(--error-red)] mb-6">
              <p className="text-[var(--error-red)] font-semibold mb-2 font-mono">{t.generator.sendErrorOccurred}</p>
              <p className="text-[var(--text-primary)] mb-4 font-mono">{progress.message}</p>
              {progress.error && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium font-mono">
                    {t.generator.detailedErrorInfo}
                  </summary>
                  <div className="mt-3 p-4 bg-[var(--bg-primary)] rounded border border-[var(--border)]">
                    <pre className="text-xs text-[var(--accent-green)] font-mono overflow-x-auto whitespace-pre-wrap terminal-scrollbar">{progress.error}</pre>
                  </div>
                </details>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => {
                  setCurrentStep('data-completed');
                  setProgress({
                    ...progress,
                    status: 'completed'
                  });
                }}
                className="py-4 rounded text-[var(--text-secondary)] font-mono font-semibold bg-[var(--bg-tertiary)] border border-[var(--border)] hover:border-[var(--border-bright)] transition-all"
              >
                &lt; {t.generator.retryPrevious}
              </button>
              <button
                onClick={handleSendData}
                className="py-4 rounded text-[var(--bg-primary)] font-mono font-semibold bg-[var(--accent-magenta)] hover:bg-[var(--accent-magenta)]/80 transition-all"
              >
                ↻ {t.generator.retrySend}
              </button>
            </div>
          </div>
        )}

        {/* Sent Complete */}
        {currentStep === 'sent' && progress && (
          <div className="bg-[var(--bg-secondary)] border border-[var(--accent-green)] rounded p-8 terminal-glow-green">
            <h2 className="text-2xl font-bold mb-6 text-terminal-green font-mono flex items-center gap-2">
              <span>✓</span> {t.generator.allProcessComplete}
            </h2>
            <div className="p-6 bg-[var(--accent-green)]/10 rounded border border-[var(--accent-green)] mb-6">
              <h3 className="font-bold text-[var(--accent-green)] mb-4 text-lg font-mono">✓ {t.generator.dataSentSuccessfully}</h3>
              <p className="text-[var(--text-secondary)] mb-4 font-mono">{t.generator.checkDataInTE}</p>
              {progress.sentInfo && (
                <div className="bg-[var(--bg-tertiary)] border border-[var(--border)] p-4 rounded text-sm text-[var(--text-secondary)] space-y-1 font-mono">
                  <p><strong className="text-[var(--text-primary)]">App ID:</strong> {progress.sentInfo.appId}</p>
                  <p><strong className="text-[var(--text-primary)]">{t.generator.fileSize}:</strong> {progress.sentInfo.fileSizeMB}MB</p>
                  <p><strong className="text-[var(--text-primary)]">Receiver URL:</strong> {progress.sentInfo.receiverUrl}</p>
                </div>
              )}
            </div>
            <button
              onClick={handleComplete}
              className="w-full py-5 rounded text-[var(--bg-primary)] font-mono font-bold text-lg bg-[var(--accent-green)] hover:bg-[var(--accent-green)]/80 transition-all terminal-glow-green"
            >
              ✓ {t.generator.completeAndNew}
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}
