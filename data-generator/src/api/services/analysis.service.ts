import * as path from 'path';
import { ExcelParser } from '../../excel/parser';
import { DataGenerator, DataGeneratorConfig } from '../../data-generator';
import { AnalysisExcelGenerator } from '../../utils/analysis-excel-generator';
import { logger } from '../../utils/logger';

/**
 * AI Analysis Service
 * Handles async AI analysis operations
 */

interface AnalysisProgressMap {
  status: string;
  progress: number;
  message: string;
  details: string[];
  config?: any;
  result?: any;
  analysisExcelPath?: string;
  analysisExcelFileName?: string;
  startedAt?: string;
  completedAt?: string;
  modifiedAt?: string;
  error?: string;
  failedAt?: string;
}

// In-memory analysis storage (should be Redis in production)
const analysisMap = new Map<string, AnalysisProgressMap>();

/**
 * Start async AI analysis (no data generation)
 */
export async function analyzeOnlyAsync(analysisId: string, config: any): Promise<void> {
  const progressDetails: string[] = [];

  try {
    // Initial state
    analysisMap.set(analysisId, {
      status: 'analyzing',
      progress: 10,
      message: 'AI 전략 분석 시작...',
      details: progressDetails,
      config,
      startedAt: new Date().toISOString()
    });

    progressDetails.push('AI 전략 분석 시작...');

    // Parse Excel
    const parser = new ExcelParser();
    const schema = await parser.parseExcelFile(config.excelPath);

    progressDetails.push(`✓ Excel 파싱 완료 (이벤트: ${schema.events.length}개, 속성: ${schema.properties.length}개)`);

    analysisMap.set(analysisId, {
      ...analysisMap.get(analysisId)!,
      progress: 30,
      message: 'Excel 파싱 완료, AI 분석 중...',
      details: [...progressDetails]
    });

    // AI API Key setup
    const aiApiKey = config.aiApiKey;
    const aiProvider = config.aiProvider || 'anthropic';
    const aiModel = process.env.DATA_AI_MODEL || undefined;
    const aiLanguage = config.language || 'ko'; // 🆕 언어 설정

    // Create temp config for AI analysis
    const tempConfig: DataGeneratorConfig = {
      excelFilePath: config.excelPath,
      userInput: {
        scenario: config.scenario,
        dau: config.dau,
        industry: config.industry,
        notes: config.notes,
        dateRange: {
          start: config.dateStart,
          end: config.dateEnd
        }
      },
      aiProvider,
      aiApiKey,
      aiModel,
      aiLanguage, // 🆕 언어 파라미터 추가
      validationModelTier: (process.env.VALIDATION_MODEL_TIER as 'fast' | 'balanced') || 'fast',
      customValidationModel: process.env.CUSTOM_VALIDATION_MODEL || undefined,
      outputDataPath: path.resolve(__dirname, '../../../output/data'),
      outputMetadataPath: path.resolve(__dirname, '../../../output/runs'),
      onProgress: (progress) => {
        // Update AI analysis progress
        const currentAnalysis = analysisMap.get(analysisId);
        if (currentAnalysis) {
          if (progress.message) {
            progressDetails.push(progress.message);
          }
          analysisMap.set(analysisId, {
            ...currentAnalysis,
            progress: Math.min(progress.progress || 50, 90),
            message: progress.message || '분석 중...',
            details: [...progressDetails]
          });
        }
      }
    };

    // Create DataGenerator instance (use AI analysis only)
    const generator = new DataGenerator(tempConfig, analysisId);

    // Execute AI analysis
    const aiAnalysis = await (generator as any).analyzeWithAI(schema);

    progressDetails.push(`✓ AI 분석 완료 - 사용자 세그먼트: ${aiAnalysis.userSegments?.length || 0}개`);
    progressDetails.push(`✓ 이벤트 시퀀스: ${aiAnalysis.eventSequences?.length || 0}개 생성`);
    progressDetails.push(`✓ 트랜잭션: ${aiAnalysis.transactions?.length || 0}개 정의`);

    // Transform data to frontend format
    progressDetails.push('데이터 구조 변환 중...');

    // Helper: Convert milliseconds to "Xm Ys" format
    const formatDuration = (ms: number): string => {
      const seconds = Math.floor(ms / 1000);
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      if (minutes > 0) {
        return `${minutes}m ${remainingSeconds}s`;
      }
      return `${remainingSeconds}s`;
    };

    // Merge userSegments and sessionPatterns
    const transformedSegments = (aiAnalysis.userSegments || []).map((segment: any) => ({
      name: segment.name,
      percentage: segment.ratio, // ratio → percentage
      characteristics: segment.characteristics,
      avgSessionsPerDay: aiAnalysis.sessionPatterns?.avgSessionsPerDay?.[segment.name] || 0,
      avgSessionDuration: formatDuration(aiAnalysis.sessionPatterns?.avgSessionDuration?.[segment.name] || 0),
      avgEventsPerSession: aiAnalysis.sessionPatterns?.avgEventsPerSession?.[segment.name] || 0
    }));

    // Transform eventSequencing data
    const transformedEventSequences = aiAnalysis.eventSequencing?.logicalSequences || [];

    // Transform transactions data
    const transformedTransactions = aiAnalysis.eventSequencing?.transactions || [];

    // Replace with transformed data
    const transformedAnalysis = {
      ...aiAnalysis,
      userSegments: transformedSegments,
      eventSequences: transformedEventSequences,
      transactions: transformedTransactions
    };

    progressDetails.push('✅ 모든 AI 분석 완료!');

    // AI 분석 결과 요약 로깅
    const transactionCount = aiAnalysis.eventSequencing?.transactions?.length || 0;
    logger.info(`\n📊 AI 분석 결과 요약:`);
    logger.info(`  - 사용자 세그먼트: ${aiAnalysis.userSegments.length}개`);
    logger.info(`  - 이벤트 범위: ${aiAnalysis.eventRanges.length}개`);
    logger.info(`  - 트랜잭션: ${transactionCount}개`);

    if (transactionCount === 0) {
      logger.warn(`\n⚠️  트랜잭션이 생성되지 않았습니다.`);
      logger.info(`💡 이는 정상일 수 있습니다:`);
      logger.info(`   - 이벤트에 start/end 패턴이 없는 경우`);
      logger.info(`   - 트랜잭션이 불필요한 도메인 (뉴스, 콘텐츠 소비 등)`);
      logger.info(`   - Excel 파일에서 수동으로 트랜잭션 추가 가능`);
    }

    progressDetails.push(`📊 분석 결과: 세그먼트 ${aiAnalysis.userSegments.length}개, 트랜잭션 ${transactionCount}개`);
    progressDetails.push('📄 AI 분석 결과 Excel 파일 생성 중...');

    // Generate Analysis Excel
    const analysisExcelDir = path.resolve(__dirname, '../../../output/analysis-excel');
    const analysisExcelPath = await AnalysisExcelGenerator.generateAnalysisExcel(
      aiAnalysis,
      analysisExcelDir,
      {
        industry: config.industry,
        scenario: config.scenario,
        originalExcelFile: path.basename(config.excelPath)
      }
    );
    const analysisExcelFileName = path.basename(analysisExcelPath);

    progressDetails.push(`✅ AI 분석 Excel 생성 완료: ${analysisExcelFileName}`);

    // Complete
    analysisMap.set(analysisId, {
      status: 'completed',
      progress: 100,
      message: '✅ AI 분석 완료!',
      details: [...progressDetails],
      config,
      result: transformedAnalysis,
      analysisExcelPath,
      analysisExcelFileName,
      completedAt: new Date().toISOString()
    });

    logger.info(`✅ AI 분석 완료 (${analysisId}): ${aiAnalysis.userSegments?.length || 0} 세그먼트, ${aiAnalysis.eventRanges?.length || 0} 이벤트 범위`);
    logger.info(`📄 AI 분석 Excel: ${analysisExcelFileName}`);

  } catch (error: any) {
    logger.error('Error during AI analysis:', error);
    analysisMap.set(analysisId, {
      ...analysisMap.get(analysisId)!,
      status: 'error',
      progress: 0,
      message: `❌ 오류: ${error.message}`,
      error: error.stack,
      failedAt: new Date().toISOString()
    });
  }
}

/**
 * Get analysis result
 */
export function getAnalysisResult(analysisId: string): AnalysisProgressMap | undefined {
  return analysisMap.get(analysisId);
}

/**
 * Update analysis result
 */
export function updateAnalysisResult(analysisId: string, update: any): void {
  const analysis = analysisMap.get(analysisId);
  if (analysis && analysis.status === 'completed') {
    const updatedAnalysis = {
      ...analysis,
      result: {
        ...analysis.result,
        ...update
      },
      modifiedAt: new Date().toISOString()
    };
    analysisMap.set(analysisId, updatedAnalysis);
  }
}
