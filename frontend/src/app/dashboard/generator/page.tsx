'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

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
  EXCEL_AI_PROVIDER: string;
  DATA_AI_PROVIDER: string;
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
    TE_APP_ID: '',
    TE_RECEIVER_URL: 'https://te-receiver-naver.thinkingdata.kr/',
    DATA_RETENTION_DAYS: '7',
    EXCEL_RETENTION_DAYS: '30',
    AUTO_DELETE_AFTER_SEND: 'false',
  });

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
    setProgress({ status: 'generating-excel', progress: 5, message: 'Claude AI에게 Excel 스키마 생성 요청 준비 중...' });

    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      setProgress({ status: 'generating-excel', progress: 15, message: '산업 분야 및 서비스 특징 분석 중...' });

      await new Promise(resolve => setTimeout(resolve, 1200));
      setProgress({ status: 'generating-excel', progress: 30, message: '사용자 행동 패턴 모델링 중...' });

      await new Promise(resolve => setTimeout(resolve, 1000));
      setProgress({ status: 'generating-excel', progress: 45, message: '이벤트 구조 및 계층 설계 중...' });

      await new Promise(resolve => setTimeout(resolve, 1000));
      setProgress({ status: 'generating-excel', progress: 60, message: '속성 및 데이터 타입 정의 중...' });

      await new Promise(resolve => setTimeout(resolve, 1000));
      setProgress({ status: 'generating-excel', progress: 75, message: '퍼널 및 이벤트 흐름 구성 중...' });

      await new Promise(resolve => setTimeout(resolve, 800));
      setProgress({ status: 'generating-excel', progress: 85, message: 'Excel 파일 생성 중...' });

      const response = await fetch(`${API_URL}/api/excel/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario: formData.scenario,
          industry: formData.industry,
          notes: formData.notes,
          dau: formData.dau ? Number(formData.dau) : undefined,
          dateStart: formData.dateStart,
          dateEnd: formData.dateEnd,
        })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Excel 생성에 실패했습니다');
      }

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

      setProgress({ status: 'generating-excel', progress: 95, message: 'Excel 스키마 검증 중...' });
      await new Promise(resolve => setTimeout(resolve, 500));

      setProgress({ status: 'generating-excel', progress: 100, message: '✅ Excel 스키마 생성 완료!' });
      await new Promise(resolve => setTimeout(resolve, 800));

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
      aiProvider: settings.DATA_AI_PROVIDER || 'anthropic'
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
            AI 기반 이벤트 데이터 생성 플랫폼
          </p>
        </div>

        {/* Progress Steps */}
        {currentStep !== 'select-mode' && (
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {[
                { key: 'input', label: startMode === 'new' ? '정보 입력' : '엑셀 업로드', icon: startMode === 'new' ? '✎' : '⇪' },
                { key: 'excel', label: startMode === 'new' ? 'Excel 생성' : '설정 입력', icon: startMode === 'new' ? '▦' : '⚙' },
                { key: 'data', label: '데이터 생성', icon: '⚡' },
                { key: 'send', label: '데이터 전송', icon: '⇈' },
                { key: 'complete', label: '완료', icon: '✓' }
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
              <span>▦</span> 서비스 정보 입력
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold mb-2 text-[var(--text-primary)] font-mono">
                  시나리오 설명 <span className="text-[var(--error-red)]">*</span>
                </label>
                <textarea
                  value={formData.scenario}
                  onChange={(e) => setFormData({ ...formData, scenario: e.target.value })}
                  className="w-full p-4 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:border-[var(--accent-cyan)] focus:outline-none transition-all font-mono text-sm terminal-scrollbar"
                  rows={4}
                  placeholder="예: D1 리텐션이 40%로 낮은 상황입니다. 튜토리얼 이탈률이 높고, 초반 보상이 부족하여 사용자들이 첫날 이후 재방문하지 않는 패턴을 만들고 싶습니다."
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-[var(--text-primary)] font-mono">
                    산업 분야 <span className="text-[var(--error-red)]">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    className="w-full p-4 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:border-[var(--accent-cyan)] focus:outline-none transition-all font-mono text-sm"
                    placeholder="예: 게임, 커머스, 금융, 미디어..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-[var(--text-primary)] font-mono">
                    서비스 특징 <span className="text-[var(--error-red)]">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full p-4 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:border-[var(--accent-cyan)] focus:outline-none transition-all font-mono text-sm"
                    placeholder="예: 실시간 PVP 매칭, 가챠 시스템, 길드 레이드 등의 기능 보유"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-8">
              <button
                onClick={handleComplete}
                className="py-4 rounded text-[var(--text-secondary)] font-mono font-semibold bg-[var(--bg-tertiary)] border border-[var(--border)] hover:border-[var(--border-bright)] hover:text-[var(--text-primary)] transition-all"
              >
                &lt; 홈으로
              </button>
              <button
                onClick={handleStartExcelGeneration}
                className="py-4 rounded text-[var(--bg-primary)] font-mono font-bold bg-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/80 transition-all terminal-glow-cyan"
              >
                &gt; 생성 시작
              </button>
            </div>
          </div>
        )}

        {/* Excel Generation Progress */}
        {currentStep === 'generating-excel' && progress && (
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded p-8 terminal-glow">
            <h2 className="text-2xl font-bold mb-6 text-terminal-cyan font-mono flex items-center gap-2">
              <span className="animate-pulse">▣</span> Excel 스키마 생성 중
            </h2>
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-[var(--text-secondary)] font-mono">진행률</span>
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
            <div className="p-4 bg-[var(--bg-tertiary)] rounded border border-[var(--border)]">
              <p className="text-[var(--text-primary)] font-mono text-sm">&gt; {progress.message}</p>
            </div>
          </div>
        )}

        {/* Excel Completed */}
        {currentStep === 'excel-completed' && (
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded p-8 terminal-glow">
            <h2 className="text-2xl font-bold mb-6 text-terminal-green font-mono flex items-center gap-2">
              <span>✓</span> Excel 스키마 생성 완료
            </h2>
            <div className="p-6 bg-[var(--accent-green)]/10 rounded border border-[var(--accent-green)] mb-6">
              <p className="text-[var(--accent-green)] mb-4 font-mono">Excel 스키마가 성공적으로 생성되었습니다!</p>
              <p className="text-sm text-[var(--text-secondary)] font-mono">이제 데이터 생성 설정을 입력해주세요.</p>
            </div>

            {excelPreview && (
              <div className="mb-6 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-[var(--bg-tertiary)] border border-[var(--border)] rounded p-4">
                    <p className="text-xs text-[var(--text-dimmed)] mb-1 font-mono">이벤트 수</p>
                    <p className="text-2xl font-bold text-[var(--accent-cyan)] font-mono">{excelPreview.events ?? 0}</p>
                  </div>
                  <div className="bg-[var(--bg-tertiary)] border border-[var(--border)] rounded p-4">
                    <p className="text-xs text-[var(--text-dimmed)] mb-1 font-mono">이벤트 속성</p>
                    <p className="text-2xl font-bold text-[var(--accent-cyan)] font-mono">{excelPreview.eventProperties ?? 0}</p>
                  </div>
                  <div className="bg-[var(--bg-tertiary)] border border-[var(--border)] rounded p-4">
                    <p className="text-xs text-[var(--text-dimmed)] mb-1 font-mono">공통 속성</p>
                    <p className="text-2xl font-bold text-[var(--accent-cyan)] font-mono">{excelPreview.commonProperties ?? 0}</p>
                  </div>
                  <div className="bg-[var(--bg-tertiary)] border border-[var(--border)] rounded p-4">
                    <p className="text-xs text-[var(--text-dimmed)] mb-1 font-mono">유저 속성</p>
                    <p className="text-2xl font-bold text-[var(--accent-cyan)] font-mono">{excelPreview.userData ?? 0}</p>
                  </div>
                </div>
                {excelPreview.provider && (
                  <p className="text-xs text-[var(--text-dimmed)] font-mono">
                    생성 방식: {excelPreview.provider === 'fallback' ? 'Rule-based Template' : excelPreview.provider === 'anthropic' ? 'Claude' : 'GPT'} · {excelPreview.generatedAt ? new Date(excelPreview.generatedAt).toLocaleString() : ''}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-6 mb-6">
              <h3 className="text-lg font-bold text-[var(--text-primary)] font-mono">&gt; 데이터 생성 설정</h3>

              <div className="grid grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-[var(--text-primary)] font-mono">
                    DAU <span className="text-[var(--error-red)]">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.dau}
                    onChange={(e) => setFormData({ ...formData, dau: e.target.value })}
                    className="w-full p-4 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:border-[var(--accent-cyan)] focus:outline-none transition-all font-mono"
                    min="1"
                    placeholder="5000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-[var(--text-primary)] font-mono">
                    시작 날짜 <span className="text-[var(--error-red)]">*</span>
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
                    종료 날짜 <span className="text-[var(--error-red)]">*</span>
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
                ⇓ Excel 다운로드
              </button>
              <button
                onClick={handleComplete}
                className="py-4 rounded text-[var(--text-secondary)] font-mono font-semibold bg-[var(--bg-tertiary)] border border-[var(--border)] hover:border-[var(--border-bright)] transition-all"
              >
                &lt; 홈으로
              </button>
            </div>

            <button
              onClick={handleStartDataGeneration}
              className="w-full mt-4 py-5 rounded text-[var(--bg-primary)] font-mono font-bold text-lg bg-[var(--accent-green)] hover:bg-[var(--accent-green)]/80 transition-all terminal-glow-green"
            >
              &gt; 데이터 생성 시작
            </button>
          </div>
        )}

        {/* Upload Excel Screen */}
        {currentStep === 'upload-excel' && (
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded p-8 terminal-glow">
            <h2 className="text-2xl font-bold mb-6 text-terminal-cyan font-mono flex items-center gap-2">
              <span>⇪</span> 엑셀 파일 업로드
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
                  setUploadError('엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.');
                }
              }}
              className="border-2 border-dashed border-[var(--border)] rounded p-12 text-center transition-all cursor-pointer hover:border-[var(--accent-cyan)] hover:bg-[var(--bg-tertiary)]"
            >
              <div className="text-6xl mb-4 text-[var(--accent-cyan)]">⇪</div>
              <p className="text-lg font-semibold text-[var(--text-primary)] mb-2 font-mono">
                엑셀 파일을 드래그 앤 드롭하거나
              </p>
              <label className="inline-block mt-4 px-6 py-3 bg-[var(--accent-cyan)] text-[var(--bg-primary)] font-semibold rounded cursor-pointer hover:bg-[var(--accent-cyan)]/80 transition-all font-mono">
                파일 선택
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
                .xlsx 또는 .xls 파일만 업로드 가능합니다
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
              &lt; 이전으로
            </button>
          </div>
        )}

        {/* Upload Completed Screen */}
        {currentStep === 'upload-completed' && excelPreview && (
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded p-8 terminal-glow">
            <h2 className="text-2xl font-bold mb-6 text-terminal-green font-mono flex items-center gap-2">
              <span>✓</span> 엑셀 업로드 완료
            </h2>

            <div className="p-6 bg-[var(--accent-green)]/10 rounded border border-[var(--accent-green)] mb-6">
              <h3 className="font-bold text-[var(--accent-green)] mb-4 text-lg font-mono">파일 정보</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[var(--bg-tertiary)] border border-[var(--border)] p-4 rounded">
                  <p className="text-xs text-[var(--text-dimmed)] font-mono">이벤트 수</p>
                  <p className="text-2xl font-bold text-[var(--accent-cyan)] font-mono">{excelPreview.events || 0}</p>
                </div>
                <div className="bg-[var(--bg-tertiary)] border border-[var(--border)] p-4 rounded">
                  <p className="text-xs text-[var(--text-dimmed)] font-mono">이벤트 속성</p>
                  <p className="text-2xl font-bold text-[var(--accent-cyan)] font-mono">{excelPreview.eventProperties || 0}</p>
                </div>
                <div className="bg-[var(--bg-tertiary)] border border-[var(--border)] p-4 rounded">
                  <p className="text-xs text-[var(--text-dimmed)] font-mono">공통 속성</p>
                  <p className="text-2xl font-bold text-[var(--accent-cyan)] font-mono">{excelPreview.commonProperties || 0}</p>
                </div>
                <div className="bg-[var(--bg-tertiary)] border border-[var(--border)] p-4 rounded">
                  <p className="text-xs text-[var(--text-dimmed)] font-mono">유저 속성</p>
                  <p className="text-2xl font-bold text-[var(--accent-cyan)] font-mono">{excelPreview.userData || 0}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleComplete}
                className="py-4 rounded text-[var(--text-secondary)] font-mono font-semibold bg-[var(--bg-tertiary)] border border-[var(--border)] hover:border-[var(--border-bright)] transition-all"
              >
                &lt; 홈으로
              </button>
              <button
                onClick={() => setCurrentStep('combined-config')}
                className="py-5 rounded text-[var(--bg-primary)] font-mono font-bold text-lg bg-[var(--accent-green)] hover:bg-[var(--accent-green)]/80 transition-all terminal-glow-green"
              >
                다음: 서비스 정보 입력 &gt;
              </button>
            </div>
          </div>
        )}

        {/* Combined Config Screen */}
        {currentStep === 'combined-config' && (
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded p-8 mb-6 terminal-glow">
            <h2 className="text-2xl font-bold mb-6 text-terminal-cyan font-mono flex items-center gap-2">
              <span>▦</span> 서비스 정보 및 데이터 생성 설정
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold mb-2 text-[var(--text-primary)] font-mono">
                  시나리오 설명 <span className="text-[var(--error-red)]">*</span>
                </label>
                <textarea
                  value={formData.scenario}
                  onChange={(e) => setFormData({ ...formData, scenario: e.target.value })}
                  className="w-full p-4 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:border-[var(--accent-cyan)] focus:outline-none transition-all font-mono text-sm terminal-scrollbar"
                  rows={4}
                  placeholder="예: D1 리텐션이 40%로 낮은 상황입니다. 튜토리얼 이탈률이 높고, 초반 보상이 부족하여 사용자들이 첫날 이후 재방문하지 않는 패턴을 만들고 싶습니다."
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-[var(--text-primary)] font-mono">
                    산업 분야 <span className="text-[var(--error-red)]">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    className="w-full p-4 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:border-[var(--accent-cyan)] focus:outline-none transition-all font-mono text-sm"
                    placeholder="예: 게임, 커머스, 금융, 미디어..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-[var(--text-primary)] font-mono">
                    서비스 특징 <span className="text-[var(--error-red)]">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full p-4 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:border-[var(--accent-cyan)] focus:outline-none transition-all font-mono text-sm"
                    placeholder="예: 실시간 PVP 매칭, 가챠 시스템, 길드 레이드 등의 기능 보유"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-[var(--text-primary)] font-mono">
                    DAU
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
                    시작 날짜
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
                    종료 날짜
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

            <div className="mt-6 p-4 bg-[var(--accent-green)]/10 border-l-4 border-[var(--accent-green)] rounded">
              <h3 className="font-semibold text-[var(--accent-green)] mb-2 font-mono">업로드된 엑셀 정보</h3>
              <p className="text-sm text-[var(--text-secondary)] font-mono">
                업로드된 엑셀 파일을 기반으로 데이터를 생성합니다.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-8">
              <button
                onClick={handleComplete}
                className="py-4 rounded text-[var(--text-secondary)] font-mono font-semibold bg-[var(--bg-tertiary)] border border-[var(--border)] hover:border-[var(--border-bright)] transition-all"
              >
                &lt; 홈으로
              </button>
              <button
                onClick={handleCombinedConfigGenerate}
                className="py-4 rounded text-[var(--bg-primary)] font-mono font-bold text-lg bg-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/80 transition-all terminal-glow-cyan"
              >
                &gt; 생성 시작
              </button>
            </div>
          </div>
        )}

        {/* Data Generation Progress */}
        {currentStep === 'generating-data' && progress && progress.status !== 'error' && (
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded p-8 terminal-glow">
            <h2 className="text-2xl font-bold mb-6 text-terminal-cyan font-mono flex items-center gap-2">
              <span className="animate-pulse">⚡</span> 데이터 생성 중
            </h2>
            <div className="mb-6">
              <span className={`inline-block px-4 py-2 rounded text-sm font-semibold mb-4 bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] border border-[var(--accent-cyan)] font-mono`}>
                {progress.status === 'analyzing' ? '⚡ AI 분석 중' :
                 progress.status === 'parsing' ? '▦ Excel 파싱 중' :
                 progress.step || '⋯ 처리 중'}
              </span>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-[var(--text-secondary)] font-mono">진행률</span>
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
            <div className="p-4 bg-[var(--bg-tertiary)] rounded border border-[var(--border)] mb-4">
              <p className="text-[var(--text-primary)] font-mono text-sm">&gt; {progress.message}</p>
            </div>

            {/* AI 분석 상세 로그 */}
            {progress.details && progress.details.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-2 font-mono">상세 진행 정보</h3>
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
                  {progress.details.length}개 항목 (자동 업데이트)
                </p>
              </div>
            )}
          </div>
        )}

        {/* Data Generation Error */}
        {currentStep === 'generating-data' && progress && progress.status === 'error' && (
          <div className="bg-[var(--bg-secondary)] border border-[var(--error-red)] rounded p-8">
            <h2 className="text-2xl font-bold mb-6 text-[var(--error-red)] font-mono flex items-center gap-2">
              <span>✗</span> 데이터 생성 오류
            </h2>
            <div className="p-6 bg-[var(--error-red)]/10 rounded border border-[var(--error-red)] mb-6">
              <p className="text-[var(--error-red)] font-semibold mb-2 font-mono">ERROR: 오류가 발생했습니다</p>
              <p className="text-[var(--text-primary)] mb-4 font-mono">{progress.message}</p>
              {progress.error && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium font-mono">
                    상세 오류 정보 보기
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
                &lt; 이전 단계로
              </button>
              <button
                onClick={handleStartDataGeneration}
                className="py-4 rounded text-[var(--bg-primary)] font-mono font-semibold bg-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/80 transition-all"
              >
                ↻ 다시 시도
              </button>
            </div>
          </div>
        )}

        {/* Data Completed */}
        {currentStep === 'data-completed' && progress && progress.result && (
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded p-8 terminal-glow">
            <h2 className="text-2xl font-bold mb-6 text-terminal-green font-mono flex items-center gap-2">
              <span>✓</span> 데이터 생성 완료
            </h2>
            <div className="p-6 bg-[var(--accent-green)]/10 rounded border border-[var(--accent-green)] mb-6">
              <h3 className="font-bold text-[var(--accent-green)] mb-4 text-lg font-mono flex items-center gap-2">
                <span>✓</span> 데이터 생성 완료!
              </h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-[var(--bg-tertiary)] border border-[var(--border)] p-4 rounded">
                  <p className="text-xs text-[var(--text-dimmed)] font-mono">// 총 이벤트</p>
                  <p className="text-2xl font-bold text-[var(--accent-cyan)] font-mono">{progress.result.totalEvents?.toLocaleString()}</p>
                </div>
                <div className="bg-[var(--bg-tertiary)] border border-[var(--border)] p-4 rounded">
                  <p className="text-xs text-[var(--text-dimmed)] font-mono">// 총 사용자</p>
                  <p className="text-2xl font-bold text-[var(--accent-cyan)] font-mono">{progress.result.totalUsers?.toLocaleString()}</p>
                </div>
                <div className="bg-[var(--bg-tertiary)] border border-[var(--border)] p-4 rounded">
                  <p className="text-xs text-[var(--text-dimmed)] font-mono">// 총 일수</p>
                  <p className="text-2xl font-bold text-[var(--accent-cyan)] font-mono">{progress.result.totalDays}일</p>
                </div>
                <div className="bg-[var(--bg-tertiary)] border border-[var(--border)] p-4 rounded">
                  <p className="text-xs text-[var(--text-dimmed)] font-mono">// Run ID</p>
                  <p className="text-xs font-mono text-[var(--accent-cyan)]">{progress.result.runId}</p>
                </div>
              </div>
              <p className="text-sm text-[var(--text-secondary)] mb-4 font-mono">// ThinkingEngine으로 데이터를 전송하세요.</p>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[var(--text-primary)] font-mono">ThinkingEngine APP_ID</label>
                <input
                  type="text"
                  value={sendAppId}
                  onChange={(e) => setSendAppId(e.target.value)}
                  placeholder="예: df6fff48a373418ca2da97d104df2188"
                  className="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] focus:border-[var(--accent-cyan)] focus:outline-none transition-all font-mono"
                />
                <p className="text-xs text-[var(--text-dimmed)] font-mono">// 전송할 프로젝트의 APP_ID를 입력하세요</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleComplete}
                className="py-4 rounded text-[var(--text-secondary)] font-mono font-semibold bg-[var(--bg-tertiary)] border border-[var(--border)] hover:border-[var(--border-bright)] transition-all"
              >
                &lt; 홈으로
              </button>
              <button
                onClick={handleSendData}
                disabled={!sendAppId.trim()}
                className="py-5 rounded text-[var(--bg-primary)] font-mono font-bold text-lg bg-[var(--accent-magenta)] hover:bg-[var(--accent-magenta)]/80 transition-all terminal-glow-magenta disabled:opacity-50 disabled:cursor-not-allowed"
              >
                &gt; 데이터 전송
              </button>
            </div>
          </div>
        )}

        {/* Data Sending Progress */}
        {currentStep === 'sending-data' && progress && progress.status !== 'send-error' && (
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded p-8 terminal-glow">
            <h2 className="text-2xl font-bold mb-6 text-terminal-cyan font-mono flex items-center gap-2">
              <span className="animate-pulse">⇈</span> 데이터 전송 중
            </h2>
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-[var(--text-secondary)] font-mono">진행률</span>
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
                <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-2 font-mono">// LogBus2 전송 로그</h3>
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
                  // 최근 로그 {progress.logs.length}개 표시 (자동 업데이트)
                </p>
              </div>
            )}
          </div>
        )}

        {/* Data Sending Error */}
        {currentStep === 'sending-data' && progress && progress.status === 'send-error' && (
          <div className="bg-[var(--bg-secondary)] border border-[var(--error-red)] rounded p-8">
            <h2 className="text-2xl font-bold mb-6 text-[var(--error-red)] font-mono flex items-center gap-2">
              <span>✗</span> 데이터 전송 오류
            </h2>
            <div className="p-6 bg-[var(--error-red)]/10 rounded border border-[var(--error-red)] mb-6">
              <p className="text-[var(--error-red)] font-semibold mb-2 font-mono">ERROR: 전송 중 오류가 발생했습니다</p>
              <p className="text-[var(--text-primary)] mb-4 font-mono">{progress.message}</p>
              {progress.error && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium font-mono">
                    상세 오류 정보 보기
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
                &lt; 이전 단계로
              </button>
              <button
                onClick={handleSendData}
                className="py-4 rounded text-[var(--bg-primary)] font-mono font-semibold bg-[var(--accent-magenta)] hover:bg-[var(--accent-magenta)]/80 transition-all"
              >
                ↻ 다시 전송
              </button>
            </div>
          </div>
        )}

        {/* Sent Complete */}
        {currentStep === 'sent' && progress && (
          <div className="bg-[var(--bg-secondary)] border border-[var(--accent-green)] rounded p-8 terminal-glow-green">
            <h2 className="text-2xl font-bold mb-6 text-terminal-green font-mono flex items-center gap-2">
              <span>✓</span> 모든 프로세스 완료!
            </h2>
            <div className="p-6 bg-[var(--accent-green)]/10 rounded border border-[var(--accent-green)] mb-6">
              <h3 className="font-bold text-[var(--accent-green)] mb-4 text-lg font-mono">✓ 데이터가 성공적으로 전송되었습니다!</h3>
              <p className="text-[var(--text-secondary)] mb-4 font-mono">// ThinkingEngine에서 데이터를 확인하실 수 있습니다.</p>
              {progress.sentInfo && (
                <div className="bg-[var(--bg-tertiary)] border border-[var(--border)] p-4 rounded text-sm text-[var(--text-secondary)] space-y-1 font-mono">
                  <p><strong className="text-[var(--text-primary)]">App ID:</strong> {progress.sentInfo.appId}</p>
                  <p><strong className="text-[var(--text-primary)]">파일 크기:</strong> {progress.sentInfo.fileSizeMB}MB</p>
                  <p><strong className="text-[var(--text-primary)]">Receiver URL:</strong> {progress.sentInfo.receiverUrl}</p>
                </div>
              )}
            </div>
            <button
              onClick={handleComplete}
              className="w-full py-5 rounded text-[var(--bg-primary)] font-mono font-bold text-lg bg-[var(--accent-green)] hover:bg-[var(--accent-green)]/80 transition-all terminal-glow-green"
            >
              ✓ 종료 및 새로운 생성 시작
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
