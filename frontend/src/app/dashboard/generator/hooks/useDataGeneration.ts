import { useState } from 'react';
import { FormData, ProgressData, Settings, UserSegment, EventSequence, Transaction } from '../types';
import { api } from '@/lib/api-client';
import { useLanguage } from '@/contexts/LanguageContext';

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
  const { t } = useLanguage();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);

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

  const startGeneration = async (
    excelPath: string,
    formData: FormData,
    settings: Settings,
    uploadedFiles: Array<{ fileName: string; path: string }> | null
  ) => {
    if (!validateDataSettings(formData)) return;

    setIsGenerating(true);

    onProgressUpdate({ status: 'starting', progress: 5, message: t.validation.preparingDataGeneration });

    try {
      const data = await api.post('/api/generate/start', {
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

      onGenerationStart(data.runId);
    } catch (error: any) {
      console.error('Data generation failed:', error);
      alert(`${t.validation.errorPrefix}: ${error.data?.error || t.validation.dataGenerationRequestFailed}`);
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
      await api.post(`/api/generate/analysis/${analysisId}`, {
        userSegments: editedSegments,
        eventSequences: editedEventSequences,
        transactions: editedTransactions
      }, { method: 'PUT' } as any);

      // Now start data generation with the modified analysis
      const data = await api.post('/api/generate/start-with-analysis', { analysisId });

      onGenerationStart(data.runId);
      onProgressUpdate({ status: 'starting', progress: 0, message: t.validation.startingDataGenerationWithAnalysis });
    } catch (error: any) {
      console.error('Failed to start data generation with analysis:', error);
      const errorMsg = error.data?.error || t.validation.dataGenerationStartFailed;
      alert(errorMsg);
      // Stay on AI analysis review screen on error
      onError('ai-analysis-review');
    } finally {
      setIsGenerating(false);
    }
  };

  const sendData = async (runId: string, appId: string) => {
    if (!appId.trim()) {
      alert(t.validation.appIdRequired);
      return;
    }

    setIsSending(true);

    onProgressUpdate({ status: 'sending', progress: 0, message: t.validation.preparingDataTransfer });

    try {
      await api.post(`/api/generate/send-data/${runId}`, {
        appId: appId.trim(),
      });
    } catch (error: any) {
      console.error('Data sending failed:', error);
      const errorMessage = error.data?.error || error.message || t.validation.dataTransferFailed;
      alert(`${t.validation.dataTransferFailed}: ${errorMessage}`);
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
