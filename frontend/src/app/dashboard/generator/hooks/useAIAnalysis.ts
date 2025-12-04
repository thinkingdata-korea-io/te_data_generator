import { useState } from 'react';
import { FormData, ProgressData, Settings } from '../types';
import { api } from '@/lib/api-client';
import { useLanguage } from '@/contexts/LanguageContext';

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
  const { t } = useLanguage();
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const validateDataSettings = (formData: FormData): boolean => {
    if (!formData.scenario || formData.scenario.trim() === '') {
      alert(t.validation.scenarioRequired);
      return false;
    }
    if (!formData.industry || formData.industry.trim() === '') {
      alert(t.validation.industryRequired);
      return false;
    }
    const dau = parseInt(formData.dau);
    if (isNaN(dau) || dau < 1) {
      alert(t.validation.dauRequired);
      return false;
    }
    if (!formData.dateStart) {
      alert(t.validation.startDateRequired);
      return false;
    }
    if (!formData.dateEnd) {
      alert(t.validation.endDateRequired);
      return false;
    }
    if (new Date(formData.dateStart) > new Date(formData.dateEnd)) {
      alert(t.validation.invalidDateRange);
      return false;
    }
    return true;
  };

  const startAnalysis = async (
    excelPath: string,
    formData: FormData,
    settings: Settings,
    uploadedFiles: Array<{ fileName: string; path: string }> | null
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
      const data = await api.post('/api/generate/analyze', {
        excelPath,
        scenario: formData.scenario,
        dau: formData.dau,
        industry: formData.industry,
        notes: formData.notes,
        dateStart: formData.dateStart,
        dateEnd: formData.dateEnd,
        aiProvider: 'anthropic',
        contextFilePaths: uploadedFiles?.map(f => f.path) || [], // 🔥 파일 경로 전달
      });

      onAnalysisStart(data.analysisId);
    } catch (error: any) {
      console.error('AI analysis failed:', error);
      const errorMsg = error.data?.missing
        ? `${error.data.error}\n누락된 필드: ${error.data.missing.join(', ')}`
        : error.data?.error || 'AI 분석 요청 실패';
      alert(`에러: ${errorMsg}`);
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
