/**
 * Generator Page Types
 * Centralized type definitions for the data generator workflow
 */

export type TaskMode = 'taxonomy-only' | 'analysis-only' | 'data-only' | 'send-only' | 'full-process';

export type ProcessStep =
  | 'select-mode'
  | 'input'
  | 'generating-excel'
  | 'excel-completed'
  | 'upload-excel'
  | 'upload-completed'
  | 'dual-upload'
  | 'dual-upload-completed'
  | 'combined-config'
  | 'analyzing-ai'
  | 'ai-analysis-review'
  | 'generating-data'
  | 'data-completed'
  | 'upload-data-file'
  | 'data-file-uploaded'
  | 'sending-data'
  | 'sent';

export interface Settings {
  // AI Provider Settings (Anthropic only)
  ANTHROPIC_API_KEY: string;
  DATA_AI_MODEL: string;
  FILE_ANALYSIS_MODEL: string;
  VALIDATION_MODEL_TIER: 'fast' | 'balanced';
  CUSTOM_VALIDATION_MODEL: string;

  // ThinkingEngine Settings
  TE_APP_ID: string;
  TE_RECEIVER_URL: string;

  // File Retention Settings
  DATA_RETENTION_DAYS: string;
  EXCEL_RETENTION_DAYS: string;
  AUTO_DELETE_AFTER_SEND: string;
}

export interface ExcelPreviewSummary {
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

export type AnalysisLanguage = 'ko' | 'en' | 'zh' | 'ja';

export interface FormData {
  scenario: string;
  dau: string;
  industry: string;
  notes: string;
  dateStart: string;
  dateEnd: string;
  language?: AnalysisLanguage;
  eventCountMin?: number;
  eventCountMax?: number;
}

export interface ProgressData {
  status: string;
  progress: number;
  message: string;
  step?: string;
  details?: string[];
  result?: {
    excelPath?: string;
    csvPath?: string;
    summary?: ExcelPreviewSummary;
    [key: string]: any;
  };
  aiAnalysis?: AIAnalysisResult;
  logs?: Array<{
    timestamp: string;
    level: string;
    message: string;
    [key: string]: any;
  }>;
  analysisExcelFileName?: string;
  error?: string;
  sentInfo?: {
    totalCount: number;
    successCount: number;
    failedCount: number;
    [key: string]: any;
  };
}

export interface AIAnalysisResult {
  userSegments: UserSegment[];
  eventSequences: EventSequence[];
  transactions: Transaction[];
  [key: string]: any;
}

export interface UserSegment {
  name: string;
  percentage: number;
  characteristics: string;
  avgSessionsPerDay: number;
  avgSessionDuration: string;
  avgEventsPerSession: number;
}

export interface EventSequence {
  name: string;
  events: string[];
  probability: number;
}

export interface Transaction {
  name: string;
  amount: number;
  currency: string;
  properties?: string | string[];
}

export interface ExcelGenerationResult {
  type: 'complete';
  file: {
    path: string;
    [key: string]: any;
  };
  preview: ExcelPreviewSummary;
}
