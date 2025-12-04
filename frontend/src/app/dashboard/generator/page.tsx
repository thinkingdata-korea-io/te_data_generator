'use client';

import { useEffect, useCallback, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { UploadedFileInfo } from '@/components/FileUploadZone';
import api from '@/lib/api-client';
import AIAnalysisProgress from './components/AIAnalysisProgress';
import AIAnalysisCompleted from './components/AIAnalysisCompleted';
import DataGenerationProgress from './components/DataGenerationProgress';
import ModeSelector from './components/ModeSelector';
import ExcelCompleted from './components/ExcelCompleted';
import DataCompleted from './components/DataCompleted';
import ProgressSteps from './components/ProgressSteps';
import ServiceInfoForm from './components/forms/ServiceInfoForm';
import CombinedConfigForm from './components/forms/CombinedConfigForm';
import LoadingDots from './components/LoadingDots';
import DualExcelUpload from './components/DualExcelUpload';
import DataFileUpload from './components/DataFileUpload';
import { useGeneratorState } from './hooks/useGeneratorState';
import { useExcelGeneration } from './hooks/useExcelGeneration';
import { useAIAnalysis } from './hooks/useAIAnalysis';
import { useDataGeneration } from './hooks/useDataGeneration';
import { AnalysisLanguage, UserSegment, EventSequence, Transaction, TaskMode } from './types';

// API URL 설정
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function Home() {
  const { t, language: uiLanguage } = useLanguage();

  // Helper function to replace "..." with LoadingDots component
  const renderMessageWithDots = (message: string) => {
    if (!message) return message;
    const parts = message.split('...');
    return parts.map((part, idx) => (
      <span key={idx}>
        {part}
        {idx < parts.length - 1 && <LoadingDots />}
      </span>
    ));
  };

  // ✅ Centralized state management using custom hook
  const {
    formData,
    setFormData,
    currentStep,
    setCurrentStep,
    startMode,
    setStartMode,
    uploadedExcelPath,
    setUploadedExcelPath,
    excelPreview,
    setExcelPreview,
    uploadError,
    setUploadError,
    generatedExcelPath,
    setGeneratedExcelPath,
    runId,
    setRunId,
    progress,
    setProgress,
    sendAppId,
    setSendAppId,
    sendSessionId,
    setSendSessionId,
    settings,
    setSettings,
    uploadedFiles,
    setUploadedFiles,
    fileAnalysisResult,
    setFileAnalysisResult,
    isUploadingFiles,
    setIsUploadingFiles,
    analysisId,
    setAnalysisId,
    aiAnalysisResult,
    setAiAnalysisResult,
    editedSegments,
    setEditedSegments,
    editedEventSequences,
    setEditedEventSequences,
    editedTransactions,
    setEditedTransactions,
  } = useGeneratorState(uiLanguage as AnalysisLanguage);

  // Excel Generation Hook
  const excelGeneration = useExcelGeneration({
    onProgressUpdate: setProgress,
    onComplete: (excelPath, preview) => {
      setGeneratedExcelPath(excelPath);
      setExcelPreview(preview);
      setCurrentStep('excel-completed');
    },
    onError: () => {
      setCurrentStep('input');
      setProgress(null);
    }
  });

  // AI Analysis Hook
  const aiAnalysis = useAIAnalysis({
    onProgressUpdate: setProgress,
    onAnalysisStart: setAnalysisId,
    onError: () => {
      setCurrentStep('combined-config');
      setProgress(null);
    }
  });

  // Data Generation Hook
  const dataGeneration = useDataGeneration({
    onProgressUpdate: setProgress,
    onGenerationStart: (runId) => {
      setRunId(runId);
      setCurrentStep('generating-data');
    },
    onError: (step) => {
      setCurrentStep(step as any);
      setProgress(null);
    }
  });

  // 설정 로드
  useEffect(() => {
    api.get('/api/settings')
      .then(data => {
        setSettings(data);
        setSendAppId(data.TE_APP_ID || ''); // 기본값 설정
      })
      .catch(err => {
        // 401 errors are handled by API client (redirects to login)
        // Other errors are logged but don't block the UI
        if (err.status !== 401) {
          console.error('Failed to load settings:', err);
        }
      });
  }, []);

  // AI 분석 진행률 폴링
  useEffect(() => {
    if (!analysisId || currentStep !== 'analyzing-ai') return;

    const interval = setInterval(() => {
      api.get(`/api/generate/analysis/${analysisId}`)
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

  // 데이터 생성 및 전송 진행률 폴링
  useEffect(() => {
    // 데이터 생성 진행률 폴링
    if (runId && currentStep !== 'select-mode' && currentStep !== 'input' && currentStep !== 'excel-completed' && currentStep !== 'data-completed' && currentStep !== 'upload-excel' && currentStep !== 'upload-completed' && currentStep !== 'combined-config' && currentStep !== 'upload-data-file') {
      const interval = setInterval(() => {
        api.get(`/api/generate/status/${runId}`)
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
          .catch(err => console.error('Failed to fetch generate progress:', err));
      }, 2000);

      return () => clearInterval(interval);
    }

    // 데이터 전송 전용 진행률 폴링
    if (sendSessionId && currentStep === 'sending-data') {
      const interval = setInterval(() => {
        api.get(`/api/data/send-status/${sendSessionId}`)
          .then(data => {
            setProgress(data);

            // 상태에 따라 단계 변경
            if (data.status === 'sent' || data.status === 'completed') {
              setCurrentStep('sent');
              clearInterval(interval);
            } else if (data.status === 'send-error' || data.status === 'error') {
              clearInterval(interval);
            }
          })
          .catch(err => console.error('Failed to fetch send progress:', err));
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [runId, sendSessionId, currentStep]);

  // 파일 선택 처리 (분석은 생성 시작 시점으로 지연)
  const handleFilesSelected = useCallback((files: UploadedFileInfo[]) => {
    setUploadedFiles(files);

    // 파일이 변경되면 기존 분석 결과 초기화
    if (files.length === 0) {
      setFileAnalysisResult(null);
    } else {
      // 새 파일이 선택되면 이전 분석 결과 무효화
      setFileAnalysisResult(null);
    }
  }, [setUploadedFiles, setFileAnalysisResult]);

  // 파일 분석 헬퍼 함수 (필요 시에만 실행)
  const analyzeFilesIfNeeded = useCallback(async (): Promise<boolean> => {
    // 이미 분석된 결과가 있으면 스킵
    if (fileAnalysisResult) {
      return true;
    }

    // 분석할 파일이 없으면 스킵
    if (uploadedFiles.length === 0) {
      return true;
    }

    // 파일 분석 시작 - 프로그레스 표시
    setIsUploadingFiles(true);
    setProgress({
      status: 'analyzing',
      progress: 15,
      message: '📄 업로드된 파일 분석 중...',
      detail: `${uploadedFiles.length}개 파일 분석 (PDF, 텍스트 등)`
    });

    try {
      const uploadFormData = new FormData();
      uploadedFiles.forEach(fileInfo => {
        uploadFormData.append('files', fileInfo.file);
      });
      uploadFormData.append('language', formData.language || 'ko');

      const result = await api.upload('/api/files/analyze-multi', uploadFormData);
      setFileAnalysisResult(result.analysis);

      console.log('📊 파일 분석 완료:', result);

      // 분석 완료 표시
      setProgress({
        status: 'analyzing',
        progress: 20,
        message: '✅ 파일 분석 완료',
        detail: 'AI 전략 분석을 시작합니다...'
      });

      return true;
    } catch (error) {
      console.error('파일 분석 오류:', error);
      alert('파일 분석 중 오류가 발생했습니다.');
      return false;
    } finally {
      setIsUploadingFiles(false);
    }
  }, [uploadedFiles, fileAnalysisResult, formData.language, setFileAnalysisResult, setIsUploadingFiles, setProgress]);

  // Handlers using new hooks
  const handleStartExcelGeneration = async () => {
    setCurrentStep('generating-excel');
    setGeneratedExcelPath('');
    setExcelPreview(null);
    await excelGeneration.startGeneration(formData);
  };

  const handleStartAIAnalysis = async () => {
    // Validate BEFORE changing step to prevent UI from advancing on validation failure
    if (!aiAnalysis.validateDataSettings(formData)) {
      return; // Validation failed, don't proceed
    }

    // 즉시 화면 전환 (사용자 경험 개선)
    setCurrentStep('analyzing-ai');

    // 파일 분석을 두 번째 화면에서 진행
    const analysisSuccess = await analyzeFilesIfNeeded();
    if (!analysisSuccess) {
      // 파일 분석 실패 시 초기 화면으로 복귀
      setCurrentStep('initial');
      return;
    }

    await aiAnalysis.startAnalysis(generatedExcelPath, formData, settings, fileAnalysisResult);
  };

  const handleStartDataGeneration = async () => {
    // Validate data settings before starting generation
    if (!dataGeneration.validateDataSettings(formData)) {
      return; // Validation failed, don't proceed
    }

    // 🔥 FIX: uploadedFiles를 직접 전달 (파일 분석은 백엔드에서 수행)
    await dataGeneration.startGeneration(generatedExcelPath, formData, settings, uploadedFiles);
  };

  const handleSendData = async () => {
    setCurrentStep('sending-data');
    await dataGeneration.sendData(runId, sendAppId);
  };

  const handleFileUpload = async (file: File) => {
    setUploadError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const data = await api.upload('/api/excel/upload', formData);
      setUploadedExcelPath(data.file.path);
      setExcelPreview(data.preview);
      setCurrentStep('upload-completed');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setUploadError(errorMessage);
    }
  };

  const handleCombinedConfigGenerate = async () => {
    // Validate BEFORE changing step to prevent UI from advancing on validation failure
    if (!aiAnalysis.validateDataSettings(formData)) {
      return; // Validation failed, don't proceed
    }

    // 🔥 FIX: 파일 분석은 AI 분석 단계에서 백엔드가 수행
    setCurrentStep('analyzing-ai');
    await aiAnalysis.startAnalysis(uploadedExcelPath, formData, settings, uploadedFiles);
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
      language: uiLanguage as AnalysisLanguage, // Use system/UI language
    });
  };

  const handleSegmentChange = (index: number, field: string, value: string | number) => {
    const updated = [...editedSegments] as UserSegment[];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    setEditedSegments(updated);
  };

  const handleEventSequenceChange = (index: number, field: string, value: string | number | string[]) => {
    const updated = [...editedEventSequences] as EventSequence[];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    setEditedEventSequences(updated);
  };

  const handleTransactionChange = (index: number, field: string, value: string | number | string[]) => {
    const updated = [...editedTransactions] as Transaction[];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    setEditedTransactions(updated);
  };

  const handleStartDataGenerationWithAnalysis = async () => {
    await dataGeneration.startGenerationWithAnalysis(
      analysisId,
      editedSegments,
      editedEventSequences,
      editedTransactions
    );
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
            onSelectMode={(mode, language) => {
              setStartMode(mode);
              setFormData((prev) => ({ ...prev, language: language || 'ko' }));

              // Route based on selected task mode
              switch (mode) {
                case 'taxonomy-only':
                case 'full-process':
                  setCurrentStep('input');
                  break;
                case 'analysis-only':
                  setCurrentStep('upload-excel');
                  break;
                case 'data-only':
                  setCurrentStep('dual-upload');
                  break;
                case 'send-only':
                  setCurrentStep('upload-data-file');
                  break;
              }
            }}
          />
        )}

        {currentStep === 'input' && (
          <ServiceInfoForm
            formData={formData}
            onFormDataChange={setFormData}
            onNext={handleStartExcelGeneration}
            onCancel={handleComplete}
            onFilesSelected={handleFilesSelected}
            uploadedFiles={uploadedFiles}
            fileAnalysisResult={fileAnalysisResult}
            isUploadingFiles={isUploadingFiles}
          />
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
              <p className="text-[var(--text-primary)] font-mono text-sm">&gt; {renderMessageWithDots(progress.message)}</p>
            </div>

            {/* Detailed Progress Log */}
            {progress.details && progress.details.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-2 font-mono">실시간 진행 상황</h3>
                <div className="bg-[var(--bg-primary)] rounded border border-[var(--border)] p-4 max-h-64 overflow-y-auto terminal-scrollbar">
                  <div className="space-y-1">
                    {progress.details.map((detail: string, idx: number) => (
                      <div key={idx} className="text-xs font-mono text-[var(--text-secondary)] animate-fade-in">
                        {renderMessageWithDots(detail)}
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
                window.open(`http://localhost:3001/api/excel/download/${encodeURIComponent(filename)}`, '_blank');
              } else {
                alert('Excel 파일 이름을 찾을 수 없습니다.');
              }
            }}
            onComplete={handleComplete}
            onStartAIAnalysis={handleStartAIAnalysis}
            startMode={startMode}
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

        {/* Dual Excel Upload Screen (for data-only mode) */}
        {currentStep === 'dual-upload' && (
          <DualExcelUpload
            onComplete={(taxonomyPath, analysisPath, taxonomyPreview, analysisPreview) => {
              setUploadedExcelPath(taxonomyPath);
              setExcelPreview(taxonomyPreview);
              // TODO: Store analysisPath and analysisPreview for later use
              setCurrentStep('dual-upload-completed');
            }}
            onCancel={() => {
              setCurrentStep('select-mode');
              setStartMode(null);
            }}
          />
        )}

        {/* Data File Upload Screen (for send-only mode) */}
        {currentStep === 'upload-data-file' && (
          <DataFileUpload
            sendAppId={sendAppId}
            onSendAppIdChange={setSendAppId}
            onSendStart={(sessionId) => {
              setSendSessionId(sessionId);
              setCurrentStep('sending-data');
            }}
            onComplete={() => setCurrentStep('sent')}
            onCancel={() => {
              setCurrentStep('select-mode');
              setStartMode(null);
            }}
          />
        )}

        {/* Dual Upload Completed - proceed directly to data generation */}
        {currentStep === 'dual-upload-completed' && (
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded p-8 terminal-glow">
            <h2 className="text-2xl font-bold mb-6 text-terminal-green font-mono flex items-center gap-2">
              <span>✓</span> 파일 업로드 완료
            </h2>

            <div className="p-6 bg-[var(--accent-green)]/10 rounded border border-[var(--accent-green)] mb-6">
              <p className="text-[var(--accent-green)] mb-4 font-mono">
                Taxonomy Excel과 AI 분석 Excel이 모두 업로드되었습니다.
              </p>
              <p className="text-sm text-[var(--text-secondary)] font-mono">
                이제 데이터 생성 설정을 입력해주세요.
              </p>
            </div>

            {excelPreview && (
              <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[var(--bg-tertiary)] border border-[var(--border)] p-4 rounded">
                  <p className="text-xs text-[var(--text-dimmed)] font-mono">이벤트</p>
                  <p className="text-2xl font-bold text-[var(--accent-cyan)] font-mono">{excelPreview.events || 0}</p>
                </div>
                <div className="bg-[var(--bg-tertiary)] border border-[var(--border)] p-4 rounded">
                  <p className="text-xs text-[var(--text-dimmed)] font-mono">속성</p>
                  <p className="text-2xl font-bold text-[var(--accent-cyan)] font-mono">{excelPreview.eventProperties || 0}</p>
                </div>
                <div className="bg-[var(--bg-tertiary)] border border-[var(--border)] p-4 rounded">
                  <p className="text-xs text-[var(--text-dimmed)] font-mono">공통 속성</p>
                  <p className="text-2xl font-bold text-[var(--accent-cyan)] font-mono">{excelPreview.commonProperties || 0}</p>
                </div>
                <div className="bg-[var(--bg-tertiary)] border border-[var(--border)] p-4 rounded">
                  <p className="text-xs text-[var(--text-dimmed)] font-mono">사용자 데이터</p>
                  <p className="text-2xl font-bold text-[var(--accent-cyan)] font-mono">{excelPreview.userData || 0}</p>
                </div>
              </div>
            )}

            <div className="space-y-6 mb-6">
              <h3 className="text-lg font-bold text-[var(--text-primary)] font-mono">&gt; 데이터 생성 설정</h3>

              <div className="space-y-4">
                <div>
                  <label htmlFor="scenario-dual" className="block text-sm font-semibold mb-2 text-[var(--text-primary)] font-mono">
                    시나리오 <span className="text-[var(--error-red)]">*</span>
                  </label>
                  <input
                    id="scenario-dual"
                    type="text"
                    value={formData.scenario}
                    onChange={(e) => setFormData({ ...formData, scenario: e.target.value })}
                    className="w-full p-4 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:border-[var(--accent-cyan)] focus:outline-none transition-all font-mono"
                    placeholder="예: RPG 게임, 쇼핑몰 앱"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="industry-dual" className="block text-sm font-semibold mb-2 text-[var(--text-primary)] font-mono">
                      산업 분야 <span className="text-[var(--error-red)]">*</span>
                    </label>
                    <input
                      id="industry-dual"
                      type="text"
                      value={formData.industry}
                      onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                      className="w-full p-4 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:border-[var(--accent-cyan)] focus:outline-none transition-all font-mono"
                      placeholder="예: 게임, 이커머스"
                    />
                  </div>
                  <div>
                    <label htmlFor="notes-dual" className="block text-sm font-semibold mb-2 text-[var(--text-primary)] font-mono">
                      추가 메모
                    </label>
                    <input
                      id="notes-dual"
                      type="text"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full p-4 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:border-[var(--accent-cyan)] focus:outline-none transition-all font-mono"
                      placeholder="추가 설명 (선택)"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="dau-dual" className="block text-sm font-semibold mb-2 text-[var(--text-primary)] font-mono">
                      DAU <span className="text-[var(--error-red)]">*</span>
                    </label>
                    <input
                      id="dau-dual"
                      type="number"
                      value={formData.dau}
                      onChange={(e) => setFormData({ ...formData, dau: e.target.value })}
                      className="w-full p-4 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:border-[var(--accent-cyan)] focus:outline-none transition-all font-mono"
                      min="1"
                      placeholder="예: 10000"
                    />
                  </div>
                  <div>
                    <label htmlFor="start-date-dual" className="block text-sm font-semibold mb-2 text-[var(--text-primary)] font-mono">
                      시작 날짜 <span className="text-[var(--error-red)]">*</span>
                    </label>
                    <input
                      id="start-date-dual"
                      type="date"
                      value={formData.dateStart}
                      onChange={(e) => setFormData({ ...formData, dateStart: e.target.value })}
                      className="w-full p-4 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:border-[var(--accent-cyan)] focus:outline-none transition-all font-mono"
                    />
                  </div>
                  <div>
                    <label htmlFor="end-date-dual" className="block text-sm font-semibold mb-2 text-[var(--text-primary)] font-mono">
                      종료 날짜 <span className="text-[var(--error-red)]">*</span>
                    </label>
                    <input
                      id="end-date-dual"
                      type="date"
                      value={formData.dateEnd}
                      onChange={(e) => setFormData({ ...formData, dateEnd: e.target.value })}
                      className="w-full p-4 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:border-[var(--accent-cyan)] focus:outline-none transition-all font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setCurrentStep('dual-upload')}
                className="py-4 rounded text-[var(--text-secondary)] font-mono font-semibold bg-[var(--bg-tertiary)] border border-[var(--border)] hover:border-[var(--border-bright)] transition-all"
              >
                &lt; 이전으로
              </button>
              <button
                onClick={async () => {
                  // Validate BEFORE changing step to prevent UI from advancing on validation failure
                  if (!dataGeneration.validateDataSettings(formData)) {
                    return; // Validation failed, don't proceed
                  }
                  await dataGeneration.startGeneration(uploadedExcelPath, formData, settings, fileAnalysisResult);
                }}
                className="py-5 rounded text-[var(--bg-primary)] font-mono font-bold text-lg bg-[var(--accent-green)] hover:bg-[var(--accent-green)]/80 transition-all terminal-glow-green"
              >
                데이터 생성 시작 &gt;
              </button>
            </div>
          </div>
        )}

        {/* Combined Config Screen */}
        {currentStep === 'combined-config' && (
          <CombinedConfigForm
            formData={formData}
            onFormDataChange={setFormData}
            onNext={handleCombinedConfigGenerate}
            onCancel={handleComplete}
            onFilesSelected={handleFilesSelected}
            uploadedFiles={uploadedFiles}
            fileAnalysisResult={fileAnalysisResult}
            isUploadingFiles={isUploadingFiles}
          />
        )}

        {/* AI Analysis Progress */}
        {currentStep === 'analyzing-ai' && progress && (
          <AIAnalysisProgress progress={progress} />
        )}

        {/* AI Analysis Completed Screen */}
        {currentStep === 'ai-analysis-review' && aiAnalysisResult && (
          <AIAnalysisCompleted
            aiAnalysisResult={aiAnalysisResult}
            analysisExcelFileName={progress?.analysisExcelFileName}
            analysisId={analysisId}
            onComplete={handleComplete}
            onProceedToGeneration={handleStartDataGenerationWithAnalysis}
            onAnalysisUpdate={(updatedResult) => {
              setAiAnalysisResult(updatedResult);
              setEditedSegments(updatedResult.userSegments || []);
              setEditedEventSequences(updatedResult.eventSequences || []);
              setEditedTransactions(updatedResult.transactions || []);
            }}
            startMode={startMode}
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
                  // Go back to the correct screen based on workflow mode
                  if (startMode === 'data-only') {
                    setCurrentStep('dual-upload-completed');
                  } else {
                    setCurrentStep('excel-completed');
                  }
                  setProgress(null);
                  setRunId('');
                }}
                className="py-4 rounded text-[var(--text-secondary)] font-mono font-semibold bg-[var(--bg-tertiary)] border border-[var(--border)] hover:border-[var(--border-bright)] transition-all"
              >
                &lt; {t.generator.retryPrevious}
              </button>
              <button
                onClick={async () => {
                  if (startMode === 'data-only') {
                    // Validate BEFORE retrying to prevent UI from advancing on validation failure
                    if (!dataGeneration.validateDataSettings(formData)) {
                      return; // Validation failed, don't proceed
                    }
                    await dataGeneration.startGeneration(uploadedExcelPath, formData, settings, fileAnalysisResult);
                  } else {
                    handleStartDataGeneration();
                  }
                }}
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
