import { useState } from 'react';
import { FormData, ProgressData, Settings } from '../types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface UseAIAnalysisParams {
  onProgressUpdate: (progress: ProgressData | null) => void;
  onAnalysisStart: (analysisId: string) => void;
  onError: () => void;
}

interface FileAnalysisResult {
  combinedInsights?: string;
  [key: string]: unknown;
}

/**
 * AI Analysis Hook
 * Handles AI-powered data strategy analysis
 */
export function useAIAnalysis({ onProgressUpdate, onAnalysisStart, onError }: UseAIAnalysisParams) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

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

  const startAnalysis = async (
    excelPath: string,
    formData: FormData,
    settings: Settings,
    fileAnalysisResult: FileAnalysisResult | null
  ) => {
    // Validate Excel path
    console.log('[DEBUG] uploadedExcelPath:', excelPath);
    console.log('[DEBUG] formData:', formData);

    if (!excelPath || excelPath.trim() === '') {
      alert(`엑셀 파일을 먼저 업로드해주세요\n현재 경로: "${excelPath}"`);
      return;
    }

    if (!validateDataSettings(formData)) return;

    setIsAnalyzing(true);

    onProgressUpdate({ status: 'analyzing', progress: 10, message: 'AI 전략 분석 시작...' });

    console.log('[DEBUG] Sending to backend:', {
      excelPath,
      scenario: formData.scenario,
      dau: formData.dau,
      industry: formData.industry
    });

    try {
      const response = await fetch(`${API_URL}/api/generate/analyze`, {
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
        onAnalysisStart(data.analysisId);
      } else {
        const errorMsg = data.missing
          ? `${data.error}\n누락된 필드: ${data.missing.join(', ')}`
          : data.error;
        alert(`에러: ${errorMsg}`);
        onError();
      }
    } catch (error) {
      console.error('AI analysis failed:', error);
      alert('AI 분석 요청 실패');
      onError();
    } finally {
      setIsAnalyzing(false);
    }
  };

  return {
    isAnalyzing,
    startAnalysis,
    validateDataSettings
  };
}
