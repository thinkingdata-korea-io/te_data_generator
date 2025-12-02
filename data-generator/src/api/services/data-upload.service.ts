/**
 * Data Upload Service
 * Handles transmission of uploaded .jsonl files to ThinkingEngine
 */

import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../../utils/logger';
import { randomBytes } from 'crypto';

/**
 * Send uploaded data files async via LogBus2
 */
export async function sendUploadedDataAsync(
  filePaths: string[],
  appId: string,
  receiverUrl: string
): Promise<string> {
  let logbusController: any = null;
  let sessionId: string = '';

  try {
    // Generate unique session ID
    sessionId = randomBytes(8).toString('hex');

    logger.info(`📤 Starting data transmission for uploaded files with APP_ID: ${appId}...`);
    logger.info(`📁 Files to send: ${filePaths.length}`);

    // Create temporary directory for this session
    const sessionDir = path.resolve(__dirname, `../../../uploads/data/session_${sessionId}`);
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    // Copy files to session directory (LogBus expects all files in one directory)
    for (const filePath of filePaths) {
      const fileName = path.basename(filePath);
      const destPath = path.join(sessionDir, fileName);
      fs.copyFileSync(filePath, destPath);
      logger.info(`📋 Copied ${fileName} to session directory`);
    }

    // Initialize status file
    const statusFile = path.resolve(__dirname, `../../../uploads/data/.status_${sessionId}.json`);
    const updateStatus = (update: any) => {
      const currentStatus = fs.existsSync(statusFile)
        ? JSON.parse(fs.readFileSync(statusFile, 'utf-8'))
        : {};

      const newStatus = {
        ...currentStatus,
        ...update,
        sessionId,
        updatedAt: new Date().toISOString()
      };

      fs.writeFileSync(statusFile, JSON.stringify(newStatus, null, 2));
    };

    updateStatus({
      status: 'preparing',
      progress: 10,
      message: `${filePaths.length}개 데이터 파일 준비 중...`
    });

    // Calculate total file size
    let totalSize = 0;
    const files = fs.readdirSync(sessionDir).filter(f => f.endsWith('.jsonl'));
    for (const file of files) {
      const filePath = path.join(sessionDir, file);
      totalSize += fs.statSync(filePath).size;
    }
    const fileSizeMB = (totalSize / (1024 * 1024)).toFixed(2);

    // Get LogBus path
    const logbusPath = path.resolve(__dirname, '../../../../logbus/logbus');

    if (!fs.existsSync(logbusPath)) {
      throw new Error(`LogBus binary not found: ${logbusPath}`);
    }

    updateStatus({
      status: 'sending',
      progress: 20,
      message: 'LogBus2 설정 준비 중...'
    });

    // Create LogBus2 controller
    const { LogBus2Controller } = await import('../../logbus/controller');
    logbusController = new LogBus2Controller({
      appId,
      receiverUrl,
      logbusPath,
      dataPath: sessionDir,
      cpuLimit: 4,
      compress: true
    });

    // Full initialization
    await logbusController.cleanAndPrepare();
    logger.info(`✅ LogBus2 cleaned and configured for session ${sessionId}`);

    updateStatus({
      status: 'sending',
      progress: 30,
      message: `${fileSizeMB}MB 데이터를 ThinkingEngine으로 업로드 중...`
    });

    // Start LogBus2
    await logbusController.start();
    logger.info(`✅ LogBus2 started for session ${sessionId}`);

    updateStatus({
      status: 'sending',
      progress: 40,
      message: 'LogBus2를 통해 데이터 전송 중...'
    });

    // Monitor progress
    let lastProgress = 40;
    const transporterLogPath = path.join(path.dirname(logbusController.getDaemonConfigPath()), '../log/transporter.log');

    await logbusController.monitorProgress(3, (status: any) => {
      // Update progress
      lastProgress = Math.min(40 + Math.floor((status.sent / status.total) * 50), 90);

      // Read recent logs
      const logs: any[] = [];
      if (fs.existsSync(transporterLogPath)) {
        const logContent = fs.readFileSync(transporterLogPath, 'utf-8');
        const logLines = logContent.split('\n').filter(l => l.trim());
        const recentLogs = logLines.slice(-20);

        recentLogs.forEach(line => {
          try {
            const parsed = JSON.parse(line);
            logs.push(parsed);
          } catch {
            logs.push({ raw: line });
          }
        });
      }

      updateStatus({
        status: 'sending',
        progress: lastProgress,
        message: `데이터 전송 중... (${status.sent}/${status.total})`,
        logs,
        sentInfo: {
          sent: status.sent,
          total: status.total,
          fileSizeMB
        }
      });
    });

    // Stop LogBus2
    await logbusController.stop();
    logger.info(`✅ LogBus2 stopped for session ${sessionId}`);

    updateStatus({
      status: 'completed',
      progress: 100,
      message: '전송 완료!',
      sentInfo: {
        totalCount: files.length,
        successCount: files.length,
        failedCount: 0,
        appId,
        fileSizeMB,
        receiverUrl
      }
    });

    // Cleanup: Remove session directory after successful transmission
    setTimeout(() => {
      try {
        fs.rmSync(sessionDir, { recursive: true, force: true });
        logger.info(`🗑️ Cleaned up session directory: ${sessionDir}`);
      } catch (error) {
        logger.warn(`Failed to cleanup session directory: ${error}`);
      }
    }, 5000);

    return sessionId;
  } catch (error: any) {
    logger.error('Error sending uploaded data:', error);

    // Update status to error
    const statusFile = path.resolve(__dirname, `../../../uploads/data/.status_${sessionId || 'unknown'}.json`);
    if (sessionId) {
      const updateStatus = (update: any) => {
        const currentStatus = fs.existsSync(statusFile)
          ? JSON.parse(fs.readFileSync(statusFile, 'utf-8'))
          : {};

        const newStatus = {
          ...currentStatus,
          ...update,
          sessionId,
          updatedAt: new Date().toISOString()
        };

        fs.writeFileSync(statusFile, JSON.stringify(newStatus, null, 2));
      };

      updateStatus({
        status: 'send-error',
        progress: 0,
        message: '전송 실패: ' + error.message,
        error: error.stack
      });
    }

    if (logbusController) {
      try {
        await logbusController.stop();
      } catch (stopError) {
        logger.warn('Failed to stop LogBus2 after error:', stopError);
      }
    }

    throw error;
  }
}
