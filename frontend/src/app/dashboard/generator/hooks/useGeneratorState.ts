import { useState } from 'react';
import {
  ProcessStep,
  Settings,
  ExcelPreviewSummary,
  FormData,
  ProgressData,
  AIAnalysisResult,
  AnalysisLanguage,
  TaskMode
} from '../types';
import { UploadedFileInfo } from '@/components/FileUploadZone';

/**
 * Generator State Management Hook
 * Centralizes all state management for the generator workflow
 */
export function useGeneratorState(initialLanguage: AnalysisLanguage = 'ko') {
  // Form data
  const [formData, setFormData] = useState<FormData>({
    scenario: '',
    dau: '',
    industry: '',
    notes: '',
    dateStart: '2025-01-01',
    dateEnd: '2025-01-03',
    language: initialLanguage,
  });

  // Workflow state
  const [currentStep, setCurrentStep] = useState<ProcessStep>('select-mode');
  const [startMode, setStartMode] = useState<TaskMode | null>(null);

  // Excel state
  const [uploadedExcelPath, setUploadedExcelPath] = useState<string>('');
  const [generatedExcelPath, setGeneratedExcelPath] = useState<string>('');
  const [excelPreview, setExcelPreview] = useState<ExcelPreviewSummary | null>(null);
  const [uploadError, setUploadError] = useState<string>('');

  // Generation state
  const [runId, setRunId] = useState<string>('');
  const [analysisId, setAnalysisId] = useState<string>('');
  const [progress, setProgress] = useState<ProgressData | null>(null);

  // AI Analysis state
  const [aiAnalysisResult, setAiAnalysisResult] = useState<AIAnalysisResult | null>(null);
  const [editedSegments, setEditedSegments] = useState<any[]>([]);
  const [editedEventSequences, setEditedEventSequences] = useState<any[]>([]);
  const [editedTransactions, setEditedTransactions] = useState<any[]>([]);

  // File upload state
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileInfo[]>([]);
  const [fileAnalysisResult, setFileAnalysisResult] = useState<any>(null);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);

  // Settings state
  const [settings, setSettings] = useState<Settings>({
    ANTHROPIC_API_KEY: '',
    DATA_AI_MODEL: '',
    FILE_ANALYSIS_MODEL: '',
    VALIDATION_MODEL_TIER: 'fast',
    CUSTOM_VALIDATION_MODEL: '',
    TE_APP_ID: '',
    TE_RECEIVER_URL: 'https://te-receiver-naver.thinkingdata.kr/',
    DATA_RETENTION_DAYS: '7',
    EXCEL_RETENTION_DAYS: '30',
    AUTO_DELETE_AFTER_SEND: 'false',
  });

  // Send state
  const [sendAppId, setSendAppId] = useState<string>('');
  const [sendSessionId, setSendSessionId] = useState<string>('');

  return {
    // Form data
    formData,
    setFormData,

    // Workflow state
    currentStep,
    setCurrentStep,
    startMode,
    setStartMode,

    // Excel state
    uploadedExcelPath,
    setUploadedExcelPath,
    generatedExcelPath,
    setGeneratedExcelPath,
    excelPreview,
    setExcelPreview,
    uploadError,
    setUploadError,

    // Generation state
    runId,
    setRunId,
    analysisId,
    setAnalysisId,
    progress,
    setProgress,

    // AI Analysis state
    aiAnalysisResult,
    setAiAnalysisResult,
    editedSegments,
    setEditedSegments,
    editedEventSequences,
    setEditedEventSequences,
    editedTransactions,
    setEditedTransactions,

    // File upload state
    uploadedFiles,
    setUploadedFiles,
    fileAnalysisResult,
    setFileAnalysisResult,
    isUploadingFiles,
    setIsUploadingFiles,

    // Settings state
    settings,
    setSettings,

    // Send state
    sendAppId,
    setSendAppId,
    sendSessionId,
    setSendSessionId,
  };
}
