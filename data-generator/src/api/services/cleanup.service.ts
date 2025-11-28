import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../../utils/logger';

/**
 * Cleanup Service
 * Handles automatic file cleanup based on retention policies
 */

/**
 * Clean up old files based on retention days
 */
export function cleanupOldFiles(): void {
  const dataRetentionDays = parseInt(process.env.DATA_RETENTION_DAYS || '7');
  const excelRetentionDays = parseInt(process.env.EXCEL_RETENTION_DAYS || '30');
  const now = Date.now();

  // Clean data files
  const dataDir = path.resolve(__dirname, '../../../output/data');
  if (fs.existsSync(dataDir)) {
    const runDirs = fs.readdirSync(dataDir).filter(d => d.startsWith('run_'));

    for (const runDir of runDirs) {
      const runPath = path.join(dataDir, runDir);
      const stat = fs.statSync(runPath);
      const ageInDays = (now - stat.mtimeMs) / (1000 * 60 * 60 * 24);

      if (ageInDays > dataRetentionDays) {
        logger.info(`🗑️  Removing old data directory: ${runDir} (${ageInDays.toFixed(1)} days old)`);
        fs.rmSync(runPath, { recursive: true, force: true });
      }
    }
  }

  // Clean Excel files
  const excelDir = path.resolve(__dirname, '../../../excel-schema-generator/output/generated-schemas');
  if (fs.existsSync(excelDir)) {
    const excelFiles = fs.readdirSync(excelDir).filter(f => f.endsWith('.xlsx'));

    for (const file of excelFiles) {
      const filePath = path.join(excelDir, file);
      const stat = fs.statSync(filePath);
      const ageInDays = (now - stat.mtimeMs) / (1000 * 60 * 60 * 24);

      if (ageInDays > excelRetentionDays) {
        logger.info(`🗑️  Removing old Excel file: ${file} (${ageInDays.toFixed(1)} days old)`);
        fs.unlinkSync(filePath);
      }
    }
  }

  // Clean metadata
  const metadataDir = path.resolve(__dirname, '../../../output/runs');
  if (fs.existsSync(metadataDir)) {
    const runDirs = fs.readdirSync(metadataDir).filter(d => d.startsWith('run_'));

    for (const runDir of runDirs) {
      const runPath = path.join(metadataDir, runDir);
      const stat = fs.statSync(runPath);
      const ageInDays = (now - stat.mtimeMs) / (1000 * 60 * 60 * 24);

      if (ageInDays > dataRetentionDays) {
        logger.info(`🗑️  Removing old metadata: ${runDir} (${ageInDays.toFixed(1)} days old)`);
        fs.rmSync(runPath, { recursive: true, force: true });
      }
    }
  }

  logger.info(`✅ Cleanup completed (Data: ${dataRetentionDays}d, Excel: ${excelRetentionDays}d)`);
}
