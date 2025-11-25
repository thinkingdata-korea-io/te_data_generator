/**
 * Generator Page Types
 * Centralized type definitions for the data generator workflow
 */

export type ProcessStep =
  | 'select-mode'
  | 'input'
  | 'generating-excel'
  | 'excel-completed'
  | 'upload-excel'
  | 'upload-completed'
  | 'combined-config'
  | 'analyzing-ai'
  | 'ai-analysis-review'
  | 'generating-data'
  | 'data-completed'
  | 'sending-data'
  | 'sent';

export interface Settings {
  ANTHROPIC_API_KEY: string;
  OPENAI_API_KEY: string;
  GEMINI_API_KEY: string;
  EXCEL_AI_PROVIDER: string;
  DATA_AI_PROVIDER: string;
  DATA_AI_MODEL: string;
  VALIDATION_MODEL_TIER: string;
  CUSTOM_VALIDATION_MODEL: string;
  TE_APP_ID: string;
  TE_RECEIVER_URL: string;
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

export interface FormData {
  scenario: string;
  dau: string;
  industry: string;
  notes: string;
  dateStart: string;
  dateEnd: string;
}

export interface ProgressData {
  status: string;
  progress: number;
  message: string;
  step?: string;
  details?: string[];
  result?: any;
  aiAnalysis?: any;
  logs?: any[];
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
}
