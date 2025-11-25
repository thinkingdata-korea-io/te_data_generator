'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import FileUploadZone, { UploadedFileInfo } from '@/components/FileUploadZone';
import AIAnalysisProgress from './components/AIAnalysisProgress';
import AIAnalysisReview from './components/AIAnalysisReview';
import DataGenerationProgress from './components/DataGenerationProgress';
import ModeSelector from './components/ModeSelector';
import ExcelCompleted from './components/ExcelCompleted';
import DataCompleted from './components/DataCompleted';
import ProgressSteps from './components/ProgressSteps';
import { ProcessStep, Settings, ExcelPreviewSummary } from './types';

// API URL 설정
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
    GEMINI_API_KEY: '',
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
  const [analysisId, setAnalysisId] = useState<string>('');
  const [aiAnalysisResult, setAiAnalysisResult] = useState<any>(null);
  const [editedSegments, setEditedSegments] = useState<any[]>([]);
  const [editedEventSequences, setEditedEventSequences] = useState<any[]>([]);
  const [editedTransactions, setEditedTransactions] = useState<any[]>([]);

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

  // AI 분석 진행률 폴링
  useEffect(() => {
    if (!analysisId || currentStep !== 'analyzing-ai') return;

    const interval = setInterval(() => {
      fetch(`${API_URL}/api/generate/analysis/${analysisId}`)
        .then(res => res.json())
        .then(data => {
          setProgress(data);

          // AI 분석 완료 시
          if (data.status === 'completed') {
            setAiAnalysisResult(data.result);
            setEditedSegments(data.result.userSegments || []);
            setEditedEventSequences(data.result.eventSequences || []);
            setEditedTransactions(data.result.transactions || []);
            setCurrentStep('ai-analysis-review');
            clearInterval(interval);
          } else if (data.status === 'error') {
            clearInterval(interval);
            alert('AI 분석 실패: ' + (data.message || '알 수 없는 오류'));
            setCurrentStep('excel-completed');
          }
        })
        .catch(err => {
          console.error('Failed to fetch AI analysis progress:', err);
        });
    }, 2000);

    return () => clearInterval(interval);
  }, [analysisId, currentStep]);

  // 데이터 생성 진행률 폴링
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

  const handleStartAIAnalysis = async () => {
    if (!validateDataSettings()) return;

    setCurrentStep('analyzing-ai');
    setProgress({ status: 'analyzing', progress: 10, message: 'AI 전략 분석 시작...' });

    try {
      const response = await fetch(`${API_URL}/api/generate/analyze`, {
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
        setAnalysisId(data.analysisId);
      } else {
        alert(`에러: ${data.error}`);
        setCurrentStep('excel-completed');
        setProgress(null);
      }
    } catch (error) {
      console.error('AI analysis failed:', error);
      alert('AI 분석 요청 실패');
      setCurrentStep('excel-completed');
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
    // Excel 파일 경로 확인
    console.log('[DEBUG] uploadedExcelPath:', uploadedExcelPath);
    console.log('[DEBUG] formData:', formData);

    if (!uploadedExcelPath || uploadedExcelPath.trim() === '') {
      alert(`엑셀 파일을 먼저 업로드해주세요\n현재 경로: "${uploadedExcelPath}"`);
      return;
    }

    if (!validateDataSettings()) return;

    setCurrentStep('analyzing-ai');
    setProgress({ status: 'analyzing', progress: 10, message: 'AI 전략 분석 시작...' });

    console.log('[DEBUG] Sending to backend:', {
      excelPath: uploadedExcelPath,
      scenario: formData.scenario,
      dau: formData.dau,
      industry: formData.industry
    });

    try {
      const response = await fetch(`${API_URL}/api/generate/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          excelPath: uploadedExcelPath,
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
        setAnalysisId(data.analysisId);
      } else {
        const errorMsg = data.missing
          ? `${data.error}\n누락된 필드: ${data.missing.join(', ')}`
          : data.error;
        alert(`에러: ${errorMsg}`);
        setCurrentStep('combined-config');
        setProgress(null);
      }
    } catch (error) {
      console.error('AI analysis failed:', error);
      alert('AI 분석 요청 실패');
      setCurrentStep('combined-config');
      setProgress(null);
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

  const handleSegmentChange = (index: number, field: string, value: any) => {
    const updated = [...editedSegments];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    setEditedSegments(updated);
  };

  const handleEventSequenceChange = (index: number, field: string, value: any) => {
    const updated = [...editedEventSequences];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    setEditedEventSequences(updated);
  };

  const handleTransactionChange = (index: number, field: string, value: any) => {
    const updated = [...editedTransactions];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    setEditedTransactions(updated);
  };

  const handleStartDataGenerationWithAnalysis = async () => {
    try {
      // First, update the analysis with edited results
      const updateResponse = await fetch(`${API_URL}/api/generate/analysis/${analysisId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userSegments: editedSegments,
          eventSequences: editedEventSequences,
          transactions: editedTransactions
        })
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        alert(`분석 결과 저장 실패: ${errorData.error}`);
        return;
      }

      // Now start data generation with the modified analysis
      const response = await fetch(`${API_URL}/api/generate/start-with-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisId })
      });

      const data = await response.json();

      if (response.ok) {
        setRunId(data.runId);
        setCurrentStep('generating-data');
        setProgress({ status: 'starting', progress: 0, message: '수정된 분석 결과로 데이터 생성 시작...' });
      } else {
        alert(`에러: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to start data generation with analysis:', error);
      alert('데이터 생성 시작 실패');
    }
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
          <ProgressSteps currentStep={currentStep} startMode={startMode} />
        )}

        {/* Main Content */}
        {/* Select Mode Screen */}
        {currentStep === 'select-mode' && (
          <ModeSelector
            onSelectMode={(mode) => {
              setStartMode(mode);
              setCurrentStep(mode === 'new' ? 'input' : 'upload-excel');
            }}
          />
        )}

        {currentStep === 'input' && (
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
                  onChange={(e) => setFormData({ ...formData, scenario: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full p-4 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:border-[var(--accent-cyan)] focus:outline-none transition-all font-mono text-sm"
                    placeholder={t.generator.notesPlaceholder}
                    aria-required="true"
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
                type="button"
                onClick={handleComplete}
                className="py-4 rounded text-[var(--text-secondary)] font-mono font-semibold bg-[var(--bg-tertiary)] border border-[var(--border)] hover:border-[var(--border-bright)] hover:text-[var(--text-primary)] transition-all"
              >
                &lt; {t.generator.home}
              </button>
              <button
                type="button"
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
            <div className="mb-4 flex items-center gap-3">
              <span className="inline-block px-4 py-2 rounded text-sm font-semibold bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] border border-[var(--accent-cyan)] font-mono animate-pulse-border">
                {progress.progress < 30 ? '🔹 Stage 1: 이벤트 구조 분석' :
                 progress.progress < 70 ? '🔹 Stage 2: 속성 범위 생성' :
                 progress.progress < 90 ? '🔹 Stage 3: 유저 데이터 생성' :
                 '📝 Excel 파일 작성'}
              </span>
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-[var(--accent-cyan)] rounded-full animate-bounce-dot" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-[var(--accent-cyan)] rounded-full animate-bounce-dot" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-[var(--accent-cyan)] rounded-full animate-bounce-dot" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-[var(--text-secondary)] font-mono">{t.generator.progress}</span>
                <span className="text-sm font-bold text-[var(--accent-cyan)] font-mono">{progress.progress}%</span>
              </div>
              <div className="w-full bg-[var(--bg-tertiary)] rounded h-4 overflow-hidden border border-[var(--border)]">
                <div
                  className="bg-[var(--accent-cyan)] h-4 transition-all duration-500 relative overflow-hidden animate-pulse-subtle"
                  style={{ width: `${progress.progress}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-cyan)]/80"></div>
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
                      <div key={idx} className="text-xs font-mono text-[var(--text-secondary)] animate-fade-in">
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
          <ExcelCompleted
            excelPreview={excelPreview}
            generatedExcelPath={generatedExcelPath}
            formData={formData}
            onFormDataChange={setFormData}
            onDownloadExcel={() => {
              const filename = generatedExcelPath.split('/').pop() || '';
              if (filename) {
                window.open(`/api/excel/download/${encodeURIComponent(filename)}`, '_blank');
              } else {
                alert('Excel 파일 이름을 찾을 수 없습니다.');
              }
            }}
            onComplete={handleComplete}
            onStartAIAnalysis={handleStartAIAnalysis}
          />
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
                <label htmlFor="scenario-input-combined" className="block text-sm font-semibold mb-2 text-[var(--text-primary)] font-mono">
                  {t.generator.scenario} <span className="text-[var(--error-red)]">*</span>
                </label>
                <textarea
                  id="scenario-input-combined"
                  value={formData.scenario}
                  onChange={(e) => setFormData({ ...formData, scenario: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, dau: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, dateStart: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, dateEnd: e.target.value })}
                    className="w-full p-4 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:border-[var(--accent-cyan)] focus:outline-none transition-all font-mono"
                    aria-label={t.generator.endDate}
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

        {/* AI Analysis Progress */}
        {currentStep === 'analyzing-ai' && progress && (
          <AIAnalysisProgress progress={progress} />
        )}

        {/* AI Analysis Review Screen */}
        {currentStep === 'ai-analysis-review' && aiAnalysisResult && (
          <AIAnalysisReview
            aiAnalysisResult={aiAnalysisResult}
            editedSegments={editedSegments}
            editedEventSequences={editedEventSequences}
            editedTransactions={editedTransactions}
            onSegmentChange={handleSegmentChange}
            onEventSequenceChange={handleEventSequenceChange}
            onTransactionChange={handleTransactionChange}
            onComplete={handleComplete}
            onProceedToGeneration={handleStartDataGenerationWithAnalysis}
          />
        )}

        {/* Data Generation Progress */}
        {currentStep === 'generating-data' && progress && progress.status !== 'error' && (
          <DataGenerationProgress progress={progress} />
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
          <DataCompleted
            progress={progress}
            runId={runId}
            sendAppId={sendAppId}
            onSendAppIdChange={setSendAppId}
            onComplete={handleComplete}
            onSendData={handleSendData}
          />
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
                  className="bg-[var(--accent-magenta)] h-4 transition-all duration-500 relative overflow-hidden animate-pulse-subtle"
                  style={{ width: `${progress.progress}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent-magenta)] to-[var(--accent-magenta)]/80"></div>
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

        @keyframes pulse-subtle {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.85;
          }
        }

        .animate-pulse-subtle {
          animation: pulse-subtle 2s ease-in-out infinite;
        }

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }

        @keyframes pulse-border {
          0%, 100% {
            box-shadow: 0 0 0 0 var(--accent-cyan), 0 0 8px 0 var(--accent-cyan);
          }
          50% {
            box-shadow: 0 0 0 2px var(--accent-cyan), 0 0 12px 2px var(--accent-cyan);
          }
        }

        .animate-pulse-border {
          animation: pulse-border 2s ease-in-out infinite;
        }

        @keyframes bounce-dot {
          0%, 80%, 100% {
            transform: translateY(0);
            opacity: 0.5;
          }
          40% {
            transform: translateY(-6px);
            opacity: 1;
          }
        }

        .animate-bounce-dot {
          animation: bounce-dot 1.4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
