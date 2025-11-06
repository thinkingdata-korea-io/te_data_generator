'use client';

import { useState, useEffect } from 'react';

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
  TE_APP_ID: string;
  TE_RECEIVER_URL: string;
  DATA_RETENTION_DAYS: string;
  EXCEL_RETENTION_DAYS: string;
  AUTO_DELETE_AFTER_SEND: string;
}

export default function Home() {
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
  const [excelPreview, setExcelPreview] = useState<any>(null);
  const [uploadError, setUploadError] = useState<string>('');
  const [generatedExcelPath, setGeneratedExcelPath] = useState<string>('');
  const [runId, setRunId] = useState<string>('');
  const [progress, setProgress] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<Settings>({
    ANTHROPIC_API_KEY: '',
    TE_APP_ID: '',
    TE_RECEIVER_URL: 'https://te-receiver-naver.thinkingdata.kr/',
    DATA_RETENTION_DAYS: '7',
    EXCEL_RETENTION_DAYS: '30',
    AUTO_DELETE_AFTER_SEND: 'false',
  });

  // 설정 로드
  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => setSettings(data))
      .catch(err => console.error('Failed to load settings:', err));
  }, []);

  // 진행 상태 폴링
  useEffect(() => {
    if (!runId || currentStep === 'select-mode' || currentStep === 'input' || currentStep === 'excel-completed' || currentStep === 'data-completed' || currentStep === 'upload-excel' || currentStep === 'upload-completed' || currentStep === 'combined-config') return;

    const interval = setInterval(() => {
      fetch(`/api/generate/status/${runId}`)
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
    setProgress({ status: 'generating-excel', progress: 5, message: 'Claude AI에게 Excel 스키마 생성 요청 중...' });

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

      const excelListResponse = await fetch('/api/excel/list');
      const excelListData = await excelListResponse.json();

      if (!excelListData.files || excelListData.files.length === 0) {
        alert('사용 가능한 Excel 파일이 없습니다');
        setCurrentStep('input');
        setProgress(null);
        return;
      }

      const excelPath = excelListData.files[0].path;
      setGeneratedExcelPath(excelPath);

      setProgress({ status: 'generating-excel', progress: 95, message: 'Excel 스키마 검증 중...' });
      await new Promise(resolve => setTimeout(resolve, 500));

      setProgress({ status: 'generating-excel', progress: 100, message: '✅ Excel 스키마 생성 완료!' });
      await new Promise(resolve => setTimeout(resolve, 800));

      setCurrentStep('excel-completed');

    } catch (error) {
      console.error('Excel generation failed:', error);
      alert('Excel 생성 요청 실패');
      setCurrentStep('input');
      setProgress(null);
    }
  };

  const handleStartDataGeneration = async () => {
    if (!validateDataSettings()) return;

    setCurrentStep('generating-data');
    setProgress({ status: 'starting', progress: 5, message: '생성된 Excel을 바탕으로 데이터 생성 준비 중...' });

    try {
      const response = await fetch('/api/generate/start', {
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
          aiProvider: 'anthropic',
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
    setCurrentStep('sending-data');
    setProgress({ status: 'sending', progress: 0, message: 'ThinkingEngine으로 데이터 전송 준비 중...' });

    try {
      const response = await fetch(`/api/send-data/${runId}`, {
        method: 'POST',
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
      const response = await fetch('/api/excel/upload', {
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
      aiProvider: 'anthropic'
    };

    try {
      const response = await fetch('/api/generate/start', {
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

  const handleSaveSettings = async () => {
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        alert('설정이 저장되었습니다');
        setShowSettings(false);
      } else {
        alert('설정 저장 실패');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('설정 저장 실패');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header with Settings Button */}
        <div className="text-center mb-12 relative">
          <button
            onClick={() => setShowSettings(true)}
            className="absolute right-0 top-0 p-3 rounded-lg bg-white shadow hover:shadow-md transition-all"
            title="설정"
          >
            ⚙️
          </button>
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            ThinkingEngine
          </h1>
          <p className="text-xl text-gray-600">AI 기반 이벤트 데이터 생성 플랫폼</p>
        </div>

        {/* Progress Steps */}
        {currentStep !== 'select-mode' && (
          <div className="mb-8">
            <div className="flex items-center justify-between max-w-4xl mx-auto">
              {[
                { key: 'input', label: startMode === 'new' ? '정보 입력' : '엑셀 업로드', icon: startMode === 'new' ? '📝' : '📁' },
                { key: 'excel', label: startMode === 'new' ? 'Excel 생성' : '설정 입력', icon: startMode === 'new' ? '📊' : '⚙️' },
                { key: 'data', label: '데이터 생성', icon: '🤖' },
                { key: 'send', label: '데이터 전송', icon: '📤' },
                { key: 'complete', label: '완료', icon: '✅' }
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
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl mb-2 transition-all ${
                        isActive
                          ? 'bg-blue-600 text-white scale-110 shadow-lg'
                          : isCompleted
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}>
                        {step.icon}
                      </div>
                      <span className={`text-sm font-medium ${
                        isActive ? 'text-blue-600' : 'text-gray-600'
                      }`}>
                        {step.label}
                      </span>
                    </div>
                    {index < 4 && (
                      <div className={`h-1 flex-1 mx-2 rounded transition-all ${
                        isCompleted ? 'bg-green-500' : 'bg-gray-200'
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
          <div className="bg-white rounded-2xl shadow-xl p-12 max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-8 text-center">데이터 생성 방법을 선택하세요</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 새로 시작하기 */}
              <button
                onClick={() => {
                  setStartMode('new');
                  setCurrentStep('input');
                }}
                className="p-8 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-lg transition-all text-left"
              >
                <div className="text-4xl mb-4">🆕</div>
                <h3 className="text-xl font-bold mb-2">새로 시작하기</h3>
                <p className="text-gray-600 text-sm mb-4">
                  산업/서비스 정보를 입력하여<br />
                  엑셀 스키마부터 자동으로 생성합니다
                </p>
                <div className="text-xs text-gray-500">
                  1. 서비스 정보 입력<br />
                  2. 엑셀 스키마 자동 생성<br />
                  3. 데이터 생성
                </div>
              </button>

              {/* 기존 엑셀 사용 */}
              <button
                onClick={() => {
                  setStartMode('upload');
                  setCurrentStep('upload-excel');
                }}
                className="p-8 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:shadow-lg transition-all text-left"
              >
                <div className="text-4xl mb-4">📁</div>
                <h3 className="text-xl font-bold mb-2">기존 엑셀 사용하기</h3>
                <p className="text-gray-600 text-sm mb-4">
                  이미 만들어진 엑셀 파일을 업로드하여<br />
                  바로 데이터를 생성합니다
                </p>
                <div className="text-xs text-gray-500">
                  1. 엑셀 파일 업로드<br />
                  2. 서비스 정보 및 설정 입력<br />
                  3. 데이터 생성
                </div>
              </button>
            </div>
          </div>
        )}

        {currentStep === 'input' && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
              <span>📋</span> 서비스 정보 입력
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  시나리오 설명 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.scenario}
                  onChange={(e) => setFormData({ ...formData, scenario: e.target.value })}
                  className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  rows={4}
                  placeholder="예: D1 리텐션이 40%로 낮은 상황입니다. 튜토리얼 이탈률이 높고, 초반 보상이 부족하여 사용자들이 첫날 이후 재방문하지 않는 패턴을 만들고 싶습니다."
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">
                    산업 분야 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    placeholder="예: 게임, 커머스, 금융, 미디어..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">
                    서비스 특징 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    placeholder="예: 실시간 PVP 매칭, 가챠 시스템, 길드 레이드 등의 기능 보유"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">🔄 생성 프로세스</h3>
              <ol className="text-sm text-blue-800 space-y-1">
                <li><strong>1단계:</strong> 산업 + 서비스 특징 기반으로 Excel 스키마 자동 생성</li>
                <li><strong>2단계:</strong> 생성된 Excel을 바탕으로 AI가 이벤트 데이터 생성</li>
                <li><strong>3단계:</strong> ThinkingEngine으로 데이터 전송</li>
              </ol>
            </div>

            <button
              onClick={handleStartExcelGeneration}
              className="w-full mt-8 py-5 rounded-xl text-white font-bold text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transform hover:scale-[1.02] transition-all shadow-lg hover:shadow-xl"
            >
              📊 Excel 스키마 생성 시작
            </button>
          </div>
        )}

        {/* Excel Generation Progress */}
        {currentStep === 'generating-excel' && progress && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
              <span>📊</span> Excel 스키마 생성 중
            </h2>
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">진행률</span>
                <span className="text-sm font-bold text-blue-600">{progress.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-4 rounded-full transition-all duration-500"
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-700">{progress.message}</p>
            </div>
          </div>
        )}

        {/* Excel Completed */}
        {currentStep === 'excel-completed' && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
              <span>✅</span> Excel 스키마 생성 완료
            </h2>
            <div className="p-6 bg-green-50 rounded-xl border-2 border-green-200 mb-6">
              <p className="text-green-800 mb-4">Excel 스키마가 성공적으로 생성되었습니다!</p>
              <p className="text-sm text-gray-600">이제 데이터 생성 설정을 입력해주세요.</p>
            </div>

            <div className="space-y-6 mb-6">
              <h3 className="text-lg font-bold text-gray-800">데이터 생성 설정</h3>

              <div className="grid grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">
                    DAU (일일 활성 사용자) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.dau}
                    onChange={(e) => setFormData({ ...formData, dau: e.target.value })}
                    className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    min="1"
                    placeholder="5000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">
                    시작 날짜 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.dateStart}
                    onChange={(e) => setFormData({ ...formData, dateStart: e.target.value })}
                    className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">
                    종료 날짜 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.dateEnd}
                    onChange={(e) => setFormData({ ...formData, dateEnd: e.target.value })}
                    className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleStartDataGeneration}
              className="w-full py-5 rounded-xl text-white font-bold text-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 transform hover:scale-[1.02] transition-all shadow-lg hover:shadow-xl"
            >
              🤖 데이터 생성 시작
            </button>
          </div>
        )}

        {/* Upload Excel Screen */}
        {currentStep === 'upload-excel' && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
              <span>📁</span> 엑셀 파일 업로드
            </h2>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.classList.add('border-blue-500', 'bg-blue-50');
              }}
              onDragLeave={(e) => {
                e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');
                const file = e.dataTransfer.files[0];
                if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
                  handleFileUpload(file);
                } else {
                  setUploadError('엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.');
                }
              }}
              className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center transition-all cursor-pointer hover:border-blue-400 hover:bg-gray-50"
            >
              <div className="text-6xl mb-4">📎</div>
              <p className="text-lg font-semibold text-gray-700 mb-2">
                엑셀 파일을 드래그 앤 드롭하거나
              </p>
              <label className="inline-block mt-4 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg cursor-pointer hover:bg-blue-700 transition-all">
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
              <p className="text-sm text-gray-500 mt-4">
                .xlsx 또는 .xls 파일만 업로드 가능합니다
              </p>
            </div>

            {uploadError && (
              <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
                <p className="text-red-700 font-semibold">오류: {uploadError}</p>
              </div>
            )}

            <button
              onClick={() => {
                setCurrentStep('select-mode');
                setStartMode(null);
                setUploadError('');
              }}
              className="w-full mt-6 py-3 rounded-xl text-gray-700 font-semibold bg-gray-100 hover:bg-gray-200 transition-all"
            >
              ← 이전으로
            </button>
          </div>
        )}

        {/* Upload Completed Screen */}
        {currentStep === 'upload-completed' && excelPreview && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
              <span>✅</span> 엑셀 업로드 완료
            </h2>

            <div className="p-6 bg-green-50 rounded-xl border-2 border-green-200 mb-6">
              <h3 className="font-bold text-green-800 mb-4 text-lg">파일 정보</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg">
                  <p className="text-sm text-gray-600">이벤트 수</p>
                  <p className="text-2xl font-bold text-gray-800">{excelPreview.events || 0}</p>
                </div>
                <div className="bg-white p-4 rounded-lg">
                  <p className="text-sm text-gray-600">총 속성 수</p>
                  <p className="text-2xl font-bold text-gray-800">{excelPreview.properties || 0}</p>
                </div>
              </div>

              {excelPreview.eventNames && excelPreview.eventNames.length > 0 && (
                <div className="mt-4 bg-white p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">샘플 이벤트</p>
                  <div className="flex flex-wrap gap-2">
                    {excelPreview.eventNames.slice(0, 5).map((event: string, idx: number) => (
                      <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {event}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setCurrentStep('combined-config')}
              className="w-full py-5 rounded-xl text-white font-bold text-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 transform hover:scale-[1.02] transition-all shadow-lg hover:shadow-xl"
            >
              다음: 서비스 정보 입력 →
            </button>
          </div>
        )}

        {/* Combined Config Screen */}
        {currentStep === 'combined-config' && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
              <span>📋</span> 서비스 정보 및 데이터 생성 설정
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  시나리오 설명 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.scenario}
                  onChange={(e) => setFormData({ ...formData, scenario: e.target.value })}
                  className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  rows={4}
                  placeholder="예: D1 리텐션이 40%로 낮은 상황입니다. 튜토리얼 이탈률이 높고, 초반 보상이 부족하여 사용자들이 첫날 이후 재방문하지 않는 패턴을 만들고 싶습니다."
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">
                    산업 분야 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    placeholder="예: 게임, 커머스, 금융, 미디어..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">
                    서비스 특징 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    placeholder="예: 실시간 PVP 매칭, 가챠 시스템, 길드 레이드 등의 기능 보유"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">
                    DAU (일일 활성 사용자)
                  </label>
                  <input
                    type="number"
                    value={formData.dau}
                    onChange={(e) => setFormData({ ...formData, dau: e.target.value })}
                    className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">
                    시작 날짜
                  </label>
                  <input
                    type="date"
                    value={formData.dateStart}
                    onChange={(e) => setFormData({ ...formData, dateStart: e.target.value })}
                    className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">
                    종료 날짜
                  </label>
                  <input
                    type="date"
                    value={formData.dateEnd}
                    onChange={(e) => setFormData({ ...formData, dateEnd: e.target.value })}
                    className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-green-50 border-l-4 border-green-500 rounded-lg">
              <h3 className="font-semibold text-green-900 mb-2">✅ 업로드된 엑셀 정보</h3>
              <p className="text-sm text-green-800">
                업로드된 엑셀 파일을 기반으로 데이터를 생성합니다.
              </p>
            </div>

            <button
              onClick={handleCombinedConfigGenerate}
              className="w-full mt-8 py-5 rounded-xl text-white font-bold text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transform hover:scale-[1.02] transition-all shadow-lg hover:shadow-xl"
            >
              🤖 데이터 생성 시작
            </button>
          </div>
        )}

        {/* Data Generation Progress */}
        {currentStep === 'generating-data' && progress && progress.status !== 'error' && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
              <span>🤖</span> 데이터 생성 중
            </h2>
            <div className="mb-6">
              <span className={`inline-block px-4 py-2 rounded-full text-sm font-semibold mb-4 bg-blue-100 text-blue-700`}>
                {progress.status === 'analyzing' ? '🤖 AI 분석 중' :
                 progress.status === 'parsing' ? '📋 Excel 파싱 중' :
                 progress.step || '⏳ 처리 중'}
              </span>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">진행률</span>
                <span className="text-sm font-bold text-blue-600">{progress.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-4 rounded-full transition-all duration-500"
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-700">{progress.message}</p>
            </div>
          </div>
        )}

        {/* Data Generation Error */}
        {currentStep === 'generating-data' && progress && progress.status === 'error' && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold mb-6 text-red-600 flex items-center gap-2">
              <span>❌</span> 데이터 생성 오류
            </h2>
            <div className="p-6 bg-red-50 rounded-xl border-2 border-red-200 mb-6">
              <p className="text-red-800 font-semibold mb-2">오류가 발생했습니다</p>
              <p className="text-gray-700 mb-4">{progress.message}</p>
              {progress.error && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800 font-medium">
                    상세 오류 정보 보기
                  </summary>
                  <div className="mt-3 p-4 bg-gray-900 rounded-lg">
                    <pre className="text-xs text-green-400 font-mono overflow-x-auto whitespace-pre-wrap">{progress.error}</pre>
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
                className="py-4 rounded-xl text-gray-700 font-semibold bg-gray-100 hover:bg-gray-200 transition-all"
              >
                이전 단계로
              </button>
              <button
                onClick={handleStartDataGeneration}
                className="py-4 rounded-xl text-white font-semibold bg-blue-600 hover:bg-blue-700 transition-all"
              >
                🔄 다시 시도
              </button>
            </div>
          </div>
        )}

        {/* Data Completed */}
        {currentStep === 'data-completed' && progress && progress.result && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
              <span>✅</span> 데이터 생성 완료
            </h2>
            <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 mb-6">
              <h3 className="font-bold text-green-800 mb-4 text-lg flex items-center gap-2">
                <span>🎉</span> 데이터 생성 완료!
              </h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-white p-4 rounded-lg">
                  <p className="text-sm text-gray-600">총 이벤트</p>
                  <p className="text-2xl font-bold text-gray-800">{progress.result.totalEvents?.toLocaleString()}</p>
                </div>
                <div className="bg-white p-4 rounded-lg">
                  <p className="text-sm text-gray-600">총 사용자</p>
                  <p className="text-2xl font-bold text-gray-800">{progress.result.totalUsers?.toLocaleString()}</p>
                </div>
                <div className="bg-white p-4 rounded-lg">
                  <p className="text-sm text-gray-600">총 일수</p>
                  <p className="text-2xl font-bold text-gray-800">{progress.result.totalDays}일</p>
                </div>
                <div className="bg-white p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Run ID</p>
                  <p className="text-xs font-mono text-gray-800">{progress.result.runId}</p>
                </div>
              </div>
              <p className="text-sm text-gray-600">ThinkingEngine으로 데이터를 전송하세요.</p>
            </div>
            <button
              onClick={handleSendData}
              className="w-full py-5 rounded-xl text-white font-bold text-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transform hover:scale-[1.02] transition-all shadow-lg hover:shadow-xl"
            >
              📤 ThinkingEngine으로 데이터 전송
            </button>
          </div>
        )}

        {/* Data Sending Progress */}
        {currentStep === 'sending-data' && progress && progress.status !== 'send-error' && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
              <span>📤</span> 데이터 전송 중
            </h2>
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">진행률</span>
                <span className="text-sm font-bold text-blue-600">{progress.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 h-4 rounded-full transition-all duration-500"
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-700">{progress.message}</p>
            </div>
          </div>
        )}

        {/* Data Sending Error */}
        {currentStep === 'sending-data' && progress && progress.status === 'send-error' && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold mb-6 text-red-600 flex items-center gap-2">
              <span>❌</span> 데이터 전송 오류
            </h2>
            <div className="p-6 bg-red-50 rounded-xl border-2 border-red-200 mb-6">
              <p className="text-red-800 font-semibold mb-2">전송 중 오류가 발생했습니다</p>
              <p className="text-gray-700 mb-4">{progress.message}</p>
              {progress.error && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800 font-medium">
                    상세 오류 정보 보기
                  </summary>
                  <div className="mt-3 p-4 bg-gray-900 rounded-lg">
                    <pre className="text-xs text-green-400 font-mono overflow-x-auto whitespace-pre-wrap">{progress.error}</pre>
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
                className="py-4 rounded-xl text-gray-700 font-semibold bg-gray-100 hover:bg-gray-200 transition-all"
              >
                이전 단계로
              </button>
              <button
                onClick={handleSendData}
                className="py-4 rounded-xl text-white font-semibold bg-indigo-600 hover:bg-indigo-700 transition-all"
              >
                🔄 다시 전송
              </button>
            </div>
          </div>
        )}

        {/* Sent Complete */}
        {currentStep === 'sent' && progress && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
              <span>🎉</span> 모든 프로세스 완료!
            </h2>
            <div className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200 mb-6">
              <h3 className="font-bold text-purple-800 mb-4 text-lg">✨ 데이터가 성공적으로 전송되었습니다!</h3>
              <p className="text-purple-700 mb-4">ThinkingEngine에서 데이터를 확인하실 수 있습니다.</p>
              {progress.sentInfo && (
                <div className="bg-white p-4 rounded-lg text-sm text-gray-600 space-y-1">
                  <p><strong>App ID:</strong> {progress.sentInfo.appId}</p>
                  <p><strong>파일 크기:</strong> {progress.sentInfo.fileSizeMB}MB</p>
                  <p><strong>Receiver URL:</strong> {progress.sentInfo.receiverUrl}</p>
                </div>
              )}
            </div>
            <button
              onClick={handleComplete}
              className="w-full py-5 rounded-xl text-white font-bold text-lg bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 transform hover:scale-[1.02] transition-all shadow-lg hover:shadow-xl"
            >
              ✅ 종료 및 새로운 생성 시작
            </button>
          </div>
        )}

        {/* Settings Modal */}
        {showSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
                <span>⚙️</span> 설정
              </h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">
                    Anthropic API Key
                  </label>
                  <input
                    type="password"
                    value={settings.ANTHROPIC_API_KEY}
                    onChange={(e) => setSettings({ ...settings, ANTHROPIC_API_KEY: e.target.value })}
                    className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-mono text-sm"
                    placeholder="sk-ant-..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">
                    TE App ID
                  </label>
                  <input
                    type="text"
                    value={settings.TE_APP_ID}
                    onChange={(e) => setSettings({ ...settings, TE_APP_ID: e.target.value })}
                    className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-mono text-sm"
                    placeholder="df6fff48a373418ca2da97d104df2188"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">
                    TE Receiver URL
                  </label>
                  <input
                    type="text"
                    value={settings.TE_RECEIVER_URL}
                    onChange={(e) => setSettings({ ...settings, TE_RECEIVER_URL: e.target.value })}
                    className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-mono text-sm"
                    placeholder="https://te-receiver-naver.thinkingdata.kr/"
                  />
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-lg font-bold mb-4 text-gray-800">파일 보관 설정</h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-700">
                        데이터 파일 보관 기간 (일)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={settings.DATA_RETENTION_DAYS}
                        onChange={(e) => setSettings({ ...settings, DATA_RETENTION_DAYS: e.target.value })}
                        className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                        placeholder="7"
                      />
                      <p className="text-xs text-gray-500 mt-1">생성된 데이터 파일을 자동으로 삭제할 기간 (기본: 7일)</p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-700">
                        Excel 파일 보관 기간 (일)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={settings.EXCEL_RETENTION_DAYS}
                        onChange={(e) => setSettings({ ...settings, EXCEL_RETENTION_DAYS: e.target.value })}
                        className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                        placeholder="30"
                      />
                      <p className="text-xs text-gray-500 mt-1">생성된 Excel 스키마 파일을 자동으로 삭제할 기간 (기본: 30일)</p>
                    </div>

                    <div>
                      <label className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-all">
                        <input
                          type="checkbox"
                          checked={settings.AUTO_DELETE_AFTER_SEND === 'true'}
                          onChange={(e) => setSettings({ ...settings, AUTO_DELETE_AFTER_SEND: e.target.checked ? 'true' : 'false' })}
                          className="w-5 h-5"
                        />
                        <div>
                          <span className="font-semibold text-gray-700">전송 후 즉시 삭제</span>
                          <p className="text-xs text-gray-500 mt-1">ThinkingEngine으로 전송 완료 후 데이터 파일을 즉시 삭제</p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                <button
                  onClick={() => setShowSettings(false)}
                  className="flex-1 py-3 rounded-xl text-gray-700 font-semibold bg-gray-100 hover:bg-gray-200 transition-all"
                >
                  취소
                </button>
                <button
                  onClick={handleSaveSettings}
                  className="flex-1 py-3 rounded-xl text-white font-semibold bg-blue-600 hover:bg-blue-700 transition-all"
                >
                  저장
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
