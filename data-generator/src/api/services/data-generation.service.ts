import * as path from 'path';
import * as fs from 'fs';
import { DataGenerator, DataGeneratorConfig } from '../../data-generator';
import { logger } from '../../utils/logger';

/**
 * Data Generation Service
 * Handles async data generation operations
 */

interface GenerationProgressMap {
  status: string;
  progress: number;
  message: string;
  step?: string;
  details?: string[];
  result?: any;
  aiAnalysis?: any;
  industry?: string;
  scenario?: string;
  excelFile?: string;
  completedAt?: string;
  error?: string;
  failedAt?: string;
  sentAt?: string;
  sentInfo?: any;
  logs?: any[];
}

// In-memory progress storage (should be Redis in production)
const progressMap = new Map<string, GenerationProgressMap>();

/**
 * Start async data generation
 */
export async function generateDataAsync(runId: string, config: DataGeneratorConfig): Promise<void> {
  try {
    // Initial state
    progressMap.set(runId, {
      status: 'starting',
      progress: 5,
      message: '데이터 생성 준비 중...',
      step: '1/5'
    });

    // Add progress callback to config
    const configWithCallback: DataGeneratorConfig = {
      ...config,
      onProgress: (progress) => {
        // Update progress from DataGenerator
        progressMap.set(runId, progress);
      }
    };

    const generator = new DataGenerator(configWithCallback, runId);

    // Execute data generation (progress auto-updated via onProgress callback)
    const result = await generator.generate();

    // Complete
    const finalProgress = {
      status: 'completed',
      progress: 100,
      message: '✅ 데이터 생성 완료!',
      result: {
        runId: result.runId,
        totalUsers: result.totalUsers,
        totalEvents: result.totalEvents,
        totalDays: result.totalDays,
        filesGenerated: result.filesGenerated.map(f => path.basename(f))
      },
      aiAnalysis: result.aiAnalysis,
      industry: config.userInput.industry,
      scenario: config.userInput.scenario,
      excelFile: path.basename(config.excelFilePath),
      createdAt: new Date().toISOString() // Use createdAt to match runs.ts sorting
    };
    progressMap.set(runId, finalProgress);

    // Write metadata to file for persistence
    try {
      const runsDir = path.resolve(__dirname, '../../../output/runs', runId);
      if (!fs.existsSync(runsDir)) {
        fs.mkdirSync(runsDir, { recursive: true });
      }
      const metadataPath = path.join(runsDir, 'metadata.json');
      fs.writeFileSync(metadataPath, JSON.stringify(finalProgress, null, 2));
      logger.info(`📝 Run metadata saved to ${metadataPath}`);
    } catch (fileError: any) {
      logger.error(`Failed to write run metadata for ${runId}:`, fileError);
    }

  } catch (error: any) {
    logger.error('Error during data generation:', error);
    const errorProgress = {
      status: 'error',
      progress: 0,
      message: `❌ 오류: ${error.message}`,
      error: error.stack,
      failedAt: new Date().toISOString()
    };
    progressMap.set(runId, errorProgress);

    // Write error metadata to file for persistence
    try {
      const runsDir = path.resolve(__dirname, '../../../output/runs', runId);
      if (!fs.existsSync(runsDir)) {
        fs.mkdirSync(runsDir, { recursive: true });
      }
      const metadataPath = path.join(runsDir, 'metadata.json');
      fs.writeFileSync(metadataPath, JSON.stringify(errorProgress, null, 2));
      logger.info(`📝 Error metadata saved to ${metadataPath}`);
    } catch (fileError: any) {
      logger.error(`Failed to write error metadata for ${runId}:`, fileError);
    }
  }
}

/**
 * Get generation progress
 */
export function getGenerationProgress(runId: string): GenerationProgressMap | undefined {
  return progressMap.get(runId);
}

/**
 * Update generation progress
 */
export function updateGenerationProgress(runId: string, update: Partial<GenerationProgressMap>): void {
  const current = progressMap.get(runId);
  if (current) {
    progressMap.set(runId, { ...current, ...update });
  }
}
