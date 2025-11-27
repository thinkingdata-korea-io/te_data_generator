import * as fs from 'fs';
import * as path from 'path';
import { getGenerationProgress, updateGenerationProgress } from './data-generation.service';

/**
 * LogBus2 Service
 * Handles async data transmission to ThinkingEngine
 */

/**
 * Send data async via LogBus2
 */
export async function sendDataAsync(runId: string, appId: string): Promise<void> {
  let logbusController: any = null;

  try {
    console.log(`📤 Starting data transmission for ${runId} with APP_ID: ${appId}...`);

    // Verify data directory
    const dataDir = path.resolve(__dirname, `../../../output/data/${runId}`);
    if (!fs.existsSync(dataDir)) {
      throw new Error(`Data directory not found: ${dataDir}`);
    }

    // Check for .jsonl files
    const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.jsonl'));
    if (files.length === 0) {
      throw new Error(`No data files found in: ${dataDir}`);
    }

    // ThinkingEngine configuration
    const receiverUrl = process.env.TE_RECEIVER_URL || 'https://te-receiver-naver.thinkingdata.kr/';
    const logbusPath = path.resolve(__dirname, '../../../../logbus 2/logbus');

    if (!appId) {
      throw new Error('TE_APP_ID not configured');
    }

    if (!fs.existsSync(logbusPath)) {
      throw new Error(`LogBus binary not found: ${logbusPath}`);
    }

    updateGenerationProgress(runId, {
      status: 'sending',
      progress: 10,
      message: `${files.length}개 데이터 파일 준비 중...`
    });

    // Calculate total file size
    let totalSize = 0;
    for (const file of files) {
      const filePath = path.join(dataDir, file);
      totalSize += fs.statSync(filePath).size;
    }
    const fileSizeMB = (totalSize / (1024 * 1024)).toFixed(2);

    // Create LogBus2 controller
    const { LogBus2Controller } = await import('../../logbus/controller');
    logbusController = new LogBus2Controller({
      appId,
      receiverUrl,
      logbusPath,
      dataPath: dataDir,
      cpuLimit: 4,
      compress: true
    });

    updateGenerationProgress(runId, {
      status: 'sending',
      progress: 20,
      message: '이전 LogBus2 상태 정리 및 새 설정 준비 중...'
    });

    // Full initialization: cleanup + regenerate daemon.json + create meta directory
    await logbusController.cleanAndPrepare();
    console.log(`✅ LogBus2 cleaned and configured for ${runId}`);

    updateGenerationProgress(runId, {
      status: 'sending',
      progress: 30,
      message: `${fileSizeMB}MB 데이터를 ThinkingEngine으로 업로드 중...`
    });

    // Start LogBus2
    await logbusController.start();
    console.log(`✅ LogBus2 started for ${runId}`);

    updateGenerationProgress(runId, {
      status: 'sending',
      progress: 40,
      message: 'LogBus2를 통해 데이터 전송 중...'
    });

    // Monitor progress (with logs)
    let lastProgress = 40;
    let lastLogLine = 0;
    const transporterLogPath = path.join(path.dirname(logbusController.getDaemonConfigPath()), '../log/transporter.log');

    await logbusController.monitorProgress(3, (status: any) => {
      const uploadProgress = status.progress || 0;
      const currentProgress = 40 + (uploadProgress / 100) * 50; // 40% ~ 90%

      // Read recent log messages
      let recentLogs: any[] = [];
      try {
        if (fs.existsSync(transporterLogPath)) {
          const content = fs.readFileSync(transporterLogPath, 'utf-8');
          const allLines = content.split('\n').filter(line => line.trim());

          // Get new logs only (last 20 lines)
          const newLines = allLines.slice(Math.max(0, lastLogLine));
          lastLogLine = allLines.length;

          recentLogs = newLines.slice(-20).map(line => {
            try {
              return JSON.parse(line);
            } catch {
              return { raw: line };
            }
          });
        }
      } catch (logError: any) {
        console.warn('Failed to read LogBus2 logs:', logError.message);
      }

      if (currentProgress > lastProgress) {
        lastProgress = currentProgress;
        const progressUpdate = {
          status: 'sending',
          progress: Math.floor(currentProgress),
          message: `전송 중: ${status.uploadedFiles || 0}/${status.totalFiles || 0} 파일 (${uploadProgress.toFixed(1)}%)`,
          logs: recentLogs
        };
        updateGenerationProgress(runId, progressUpdate);
      }
    });

    // Stop LogBus2
    await logbusController.stop();
    console.log(`✅ LogBus2 stopped for ${runId}`);

    // Transmission complete
    updateGenerationProgress(runId, {
      status: 'sent',
      progress: 100,
      message: '✅ ThinkingEngine으로 데이터 전송 완료!',
      sentAt: new Date().toISOString(),
      sentInfo: {
        appId,
        fileSizeMB,
        receiverUrl,
        fileCount: files.length,
        files: files,
        method: 'LogBus2 (gzip compressed)'
      }
    });

    console.log(`✅ Data transmission completed for ${runId}`);

    // Auto-delete after send (if enabled)
    const autoDelete = process.env.AUTO_DELETE_AFTER_SEND === 'true';
    if (autoDelete) {
      try {
        console.log(`🗑️  Auto-delete enabled, removing data files for ${runId}...`);

        if (fs.existsSync(dataDir)) {
          fs.rmSync(dataDir, { recursive: true, force: true });
          console.log(`✅ Data files deleted: ${dataDir}`);
        }
      } catch (deleteError: any) {
        console.error(`❌ Failed to delete data files: ${deleteError.message}`);
      }
    }

  } catch (error: any) {
    console.error('Error during data transmission:', error);

    // Stop LogBus2 on error
    if (logbusController) {
      try {
        console.log('⚠️  Stopping LogBus2 due to error...');
        await logbusController.stop();
        console.log('✅ LogBus2 stopped after error');
      } catch (stopError: any) {
        console.error('❌ Failed to stop LogBus2:', stopError.message);
      }
    }

    updateGenerationProgress(runId, {
      status: 'send-error',
      progress: 0,
      message: `Transmission error: ${error.message}`,
      error: error.stack,
      failedAt: new Date().toISOString()
    });
  }
}
