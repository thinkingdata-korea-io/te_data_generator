import { useState } from 'react';
import { FormData, ExcelGenerationResult, ProgressData, ExcelPreviewSummary } from '../types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface UseExcelGenerationParams {
  onProgressUpdate: (progress: ProgressData) => void;
  onComplete: (excelPath: string, preview: ExcelPreviewSummary) => void;
  onError: () => void;
}

/**
 * Excel Generation Hook
 * Handles Excel schema generation with SSE progress streaming
 */
export function useExcelGeneration({ onProgressUpdate, onComplete, onError }: UseExcelGenerationParams) {
  const [isGenerating, setIsGenerating] = useState(false);

  const validateServiceInfo = (formData: FormData): boolean => {
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

  const startGeneration = async (formData: FormData) => {
    if (!validateServiceInfo(formData)) return;

    setIsGenerating(true);

    // Initialize progress
    onProgressUpdate({
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
          language: formData.language || 'ko',
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

      let finalResult: ExcelGenerationResult | null = null;
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

                onProgressUpdate({
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

      const preview: ExcelPreviewSummary = {
        events: data.preview?.events ?? 0,
        eventProperties: data.preview?.eventProperties ?? 0,
        commonProperties: data.preview?.commonProperties ?? 0,
        userData: data.preview?.userData ?? 0,
        eventNames: data.preview?.eventNames ?? [],
        generatedAt: data.preview?.generatedAt,
        provider: data.preview?.provider
      };

      onComplete(data.file.path, preview);

    } catch (error) {
      console.error('Excel generation failed:', error);
      const message = error instanceof Error ? error.message : 'Excel 생성 요청 실패';
      alert(message);
      onError();
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    isGenerating,
    startGeneration,
    validateServiceInfo
  };
}
