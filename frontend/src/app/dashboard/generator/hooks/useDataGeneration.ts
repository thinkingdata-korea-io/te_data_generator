import { useState } from 'react';
import { FormData, ProgressData, Settings, UserSegment, EventSequence, Transaction } from '../types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface UseDataGenerationParams {
  onProgressUpdate: (progress: ProgressData | null) => void;
  onGenerationStart: (runId: string) => void;
  onError: (step: string) => void;
}

interface FileAnalysisResult {
  combinedInsights?: string;
  [key: string]: unknown;
}

/**
 * Data Generation Hook
 * Handles data generation and sending to ThinkingEngine
 */
export function useDataGeneration({ onProgressUpdate, onGenerationStart, onError }: UseDataGenerationParams) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const validateDataSettings = (formData: FormData): boolean => {
    if (!formData.scenario || formData.scenario.trim() === '') {
      alert('시나리오를 입력해주세요');
      return false;
    }
    if (!formData.industry || formData.industry.trim() === '') {
      alert('산업 분야를 입력해주세요');
      return false;
    }
    const dau = parseInt(formData.dau);
    if (isNaN(dau) || dau < 1) {
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

  const startGeneration = async (
    excelPath: string,
    formData: FormData,
    settings: Settings,
    fileAnalysisResult: FileAnalysisResult | null
  ) => {
    if (!validateDataSettings(formData)) return;

    setIsGenerating(true);

    onProgressUpdate({ status: 'starting', progress: 5, message: '생성된 Excel을 바탕으로 데이터 생성 준비 중...' });

    try {
      const response = await fetch(`${API_URL}/api/generate/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          excelPath,
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
        onGenerationStart(data.runId);
      } else {
        alert(`에러: ${data.error}`);
        onError('excel-completed');
      }
    } catch (error) {
      console.error('Data generation failed:', error);
      alert('데이터 생성 요청 실패');
      onError('excel-completed');
    } finally {
      setIsGenerating(false);
    }
  };

  const startGenerationWithAnalysis = async (
    analysisId: string,
    editedSegments: UserSegment[],
    editedEventSequences: EventSequence[],
    editedTransactions: Transaction[]
  ) => {
    setIsGenerating(true);

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
        onGenerationStart(data.runId);
        onProgressUpdate({ status: 'starting', progress: 0, message: '수정된 분석 결과로 데이터 생성 시작...' });
      } else {
        alert(`에러: ${data.error}`);
        // Stay on AI analysis review screen on error
        onError('ai-analysis-review');
      }
    } catch (error) {
      console.error('Failed to start data generation with analysis:', error);
      alert('데이터 생성 시작 실패');
      // Stay on AI analysis review screen on error
      onError('ai-analysis-review');
    } finally {
      setIsGenerating(false);
    }
  };

  const sendData = async (runId: string, appId: string) => {
    if (!appId.trim()) {
      alert('APP_ID를 입력해주세요');
      return;
    }

    setIsSending(true);

    onProgressUpdate({ status: 'sending', progress: 0, message: 'ThinkingEngine으로 데이터 전송 준비 중...' });

    try {
      const response = await fetch(`${API_URL}/api/generate/send-data/${runId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appId: appId.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send data');
      }
    } catch (error) {
      console.error('Data sending failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`데이터 전송 실패: ${errorMessage}`);
      onError('data-completed');
    } finally {
      setIsSending(false);
    }
  };

  return {
    isGenerating,
    isSending,
    startGeneration,
    startGenerationWithAnalysis,
    sendData,
    validateDataSettings
  };
}
