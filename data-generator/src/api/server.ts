#!/usr/bin/env node

/**
 * Express API 서버
 * 프론트엔드와 데이터 생성기를 연결
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { DataGenerator, DataGeneratorConfig } from '../data-generator';
import { ExcelParser } from '../excel/parser';
import { ExcelSchemaGenerator } from '../../../excel-schema-generator/dist/schema-generator';
import { authenticateUser, findUserById, getAllUsers, createUser, updateUser, deleteUser } from './auth';
import { requireAuth, requireAdmin } from './middleware';
import { auditMiddleware } from './audit-middleware';
import { initializeDatabase, testConnection } from '../db/connection';
import { getAuditLogs } from '../db/repositories/audit-repository';

// 환경변수 로드
dotenv.config();

// Initialize database connection
initializeDatabase();

const app = express();
const PORT = process.env.API_PORT || 3001;
const EXCEL_OUTPUT_DIR = path.resolve(__dirname, '../../../excel-schema-generator/output/generated-schemas');
const REFERENCE_DOCS_DIR = path.resolve(__dirname, '../../../reference-docs');

// 미들웨어
app.use(cors());
app.use(express.json());

// Multer 설정 (파일 업로드)
const uploadDir = path.resolve(__dirname, '../../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    cb(null, `${timestamp}_${originalName}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.originalname.endsWith('.xlsx')) {
      cb(null, true);
    } else {
      cb(new Error('Only .xlsx files are allowed'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// 진행 상태 저장 (실제로는 Redis 등 사용)
const progressMap = new Map<string, any>();

/**
 * GET /api/excel/list
 * 사용 가능한 Excel 파일 목록 조회
 */
app.get('/api/excel/list', async (req: Request, res: Response) => {
  try {
    if (!fs.existsSync(EXCEL_OUTPUT_DIR)) {
      return res.json({ files: [] });
    }

    const files = fs.readdirSync(EXCEL_OUTPUT_DIR)
      .filter(f => f.endsWith('.xlsx'))
      .map(f => ({
        name: f,
        path: path.join(EXCEL_OUTPUT_DIR, f),
        size: fs.statSync(path.join(EXCEL_OUTPUT_DIR, f)).size,
        modified: fs.statSync(path.join(EXCEL_OUTPUT_DIR, f)).mtime
      }));

    res.json({ files });
  } catch (error: any) {
    console.error('Error listing Excel files:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/excel/parse
 * Excel 파일 파싱 (미리보기)
 */
app.post('/api/excel/parse', async (req: Request, res: Response) => {
  try {
    const { excelPath } = req.body;

    if (!excelPath) {
      return res.status(400).json({ error: 'excelPath is required' });
    }

    const parser = new ExcelParser();
    const schema = await parser.parseExcelFile(excelPath);

    res.json({
      events: schema.events.length,
      properties: schema.properties.length,
      funnels: schema.funnels.length,
      eventNames: schema.events.slice(0, 10).map(e => e.event_name),
      sampleProperties: schema.properties.slice(0, 10).map(p => ({
        name: p.property_name,
        type: p.data_type
      }))
    });
  } catch (error: any) {
    console.error('Error parsing Excel:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/excel/generate
 * 사용자 입력 기반으로 Excel 텍소노미 생성
 */
app.post('/api/excel/generate', async (req: Request, res: Response) => {
  try {
    const {
      scenario,
      industry,
      notes,
      dau,
      dateStart,
      dateEnd,
      eventCount
    } = req.body;

    if (!scenario || !industry || !notes) {
      return res.status(400).json({ error: 'scenario, industry, and notes are required' });
    }

    const generator = new ExcelSchemaGenerator({
      outputDir: EXCEL_OUTPUT_DIR,
      preferredProvider: (process.env.EXCEL_AI_PROVIDER as 'anthropic' | 'openai') || 'anthropic',
      anthropicKey: process.env.ANTHROPIC_API_KEY,
      openaiKey: process.env.OPENAI_API_KEY,
      anthropicModel: process.env.EXCEL_ANTHROPIC_MODEL,
      openaiModel: process.env.EXCEL_OPENAI_MODEL
    });

    const result = await generator.generate({
      scenario,
      industry,
      notes
    });

    // Parse generated Excel to get preview data
    const parser = new ExcelParser();
    const schema = await parser.parseExcelFile(result.filePath);

    // 이벤트 전용 속성과 공통 속성 분리
    const eventProperties = schema.properties.filter(p => p.event_name);
    const commonProperties = schema.properties.filter(p => !p.event_name);

    console.log(`📊 Preview counts: events=${schema.events.length}, eventProps=${eventProperties.length}, commonProps=${commonProperties.length}, userData=${schema.userData.length}`);

    res.json({
      success: result.success,
      file: {
        name: result.fileName,
        path: result.filePath
      },
      taxonomy: result.taxonomy,
      preview: {
        events: schema.events.length,
        eventProperties: eventProperties.length,
        commonProperties: commonProperties.length,
        userData: schema.userData.length,
        eventNames: schema.events.slice(0, 10).map(e => e.event_name),
        generatedAt: new Date().toISOString(),
        provider: 'anthropic'
      }
    });
  } catch (error: any) {
    console.error('Error generating Excel schema:', error);
    res.status(500).json({ error: error.message || 'Failed to generate Excel schema' });
  }
});

/**
 * POST /api/excel/upload
 * Excel 파일 업로드 및 검증
 */
app.post('/api/excel/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const fileName = req.file.filename;

    // 파일 파싱 및 검증
    const parser = new ExcelParser();
    const schema = await parser.parseExcelFile(filePath);

    // 이벤트 전용 속성과 공통 속성 분리
    const eventProperties = schema.properties.filter(p => p.event_name);
    const commonProperties = schema.properties.filter(p => !p.event_name);

    res.json({
      success: true,
      file: {
        name: fileName,
        path: filePath,
        size: req.file.size
      },
      preview: {
        events: schema.events.length,
        eventProperties: eventProperties.length,
        commonProperties: commonProperties.length,
        userData: schema.userData.length,
        eventNames: schema.events.slice(0, 10).map(e => e.event_name),
        sampleProperties: schema.properties.slice(0, 10).map(p => ({
          name: p.property_name,
          type: p.data_type
        }))
      }
    });
  } catch (error: any) {
    console.error('Error uploading Excel:', error);

    // 업로드된 파일 삭제
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/excel/download/:filename
 * 생성된 Excel 파일 다운로드
 */
app.get('/api/excel/download/:filename', (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    if (!filename) {
      return res.status(400).json({ error: 'Filename is required' });
    }

    const safeFilename = path.basename(filename);
    const filePath = path.join(EXCEL_OUTPUT_DIR, safeFilename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.download(filePath, safeFilename);
  } catch (error: any) {
    console.error('Error downloading Excel:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/excel/download/:filename
 * 생성된 Excel 파일 다운로드
 */
app.get('/api/excel/download/:filename', (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    if (!filename) {
      return res.status(400).json({ error: 'Filename is required' });
    }

    const safeFilename = path.basename(filename);
    const filePath = path.join(EXCEL_OUTPUT_DIR, safeFilename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.download(filePath, safeFilename);
  } catch (error: any) {
    console.error('Error downloading Excel:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/generate/start
 * 데이터 생성 시작
 */
app.post('/api/generate/start', async (req: Request, res: Response) => {
  try {
    const {
      excelPath,
      scenario,
      dau,
      industry,
      notes,
      dateStart,
      dateEnd,
      aiProvider,
      outputDataPath,
      outputMetadataPath
    } = req.body;

    // 필수 파라미터 검증
    if (!excelPath || !scenario || !dau || !industry || !dateStart || !dateEnd) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['excelPath', 'scenario', 'dau', 'industry', 'dateStart', 'dateEnd']
      });
    }

    // AI API Key 확인
    const aiApiKey = process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY;
    if (!aiApiKey) {
      return res.status(500).json({
        error: 'AI API key not configured',
        message: 'Set ANTHROPIC_API_KEY or OPENAI_API_KEY in environment'
      });
    }

    // Run ID 생성
    const runId = `run_${Date.now()}`;

    // 설정 준비
    const config: DataGeneratorConfig = {
      excelFilePath: excelPath,
      userInput: {
        scenario,
        dau: parseInt(dau),
        industry,
        notes: notes || '',
        dateRange: {
          start: dateStart,
          end: dateEnd
        }
      },
      aiProvider: (aiProvider || 'anthropic') as 'openai' | 'anthropic',
      aiApiKey,
      outputDataPath: outputDataPath || path.resolve(__dirname, '../../../output/data'),
      outputMetadataPath: outputMetadataPath || path.resolve(__dirname, '../../../output/runs')
    };

    // 초기 진행 상태 저장
    progressMap.set(runId, {
      status: 'starting',
      progress: 0,
      message: 'Initializing...',
      startedAt: new Date().toISOString()
    });

    // 비동기로 데이터 생성 시작
    generateDataAsync(runId, config);

    // 즉시 응답
    res.json({
      runId,
      message: 'Data generation started',
      statusUrl: `/api/generate/status/${runId}`
    });

  } catch (error: any) {
    console.error('Error starting generation:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/generate/status/:runId
 * 생성 진행 상태 조회
 */
app.get('/api/generate/status/:runId', (req: Request, res: Response) => {
  const { runId } = req.params;
  const progress = progressMap.get(runId);

  if (!progress) {
    return res.status(404).json({ error: 'Run ID not found' });
  }

  res.json(progress);
});

/**
 * GET /api/runs/list
 * 생성된 실행 목록 조회
 */
app.get('/api/runs/list', (req: Request, res: Response) => {
  try {
    const runsDir = path.resolve(__dirname, '../../../output/runs');

    if (!fs.existsSync(runsDir)) {
      return res.json({ runs: [] });
    }

    const runs = fs.readdirSync(runsDir)
      .filter(f => f.startsWith('run_'))
      .map(runId => {
        const metadataPath = path.join(runsDir, runId, 'metadata.json');
        if (fs.existsSync(metadataPath)) {
          const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
          return {
            runId,
            ...metadata
          };
        }
        return null;
      })
      .filter(r => r !== null)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ runs });
  } catch (error: any) {
    console.error('Error listing runs:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/runs/:runId
 * 특정 실행 메타데이터 조회
 */
app.get('/api/runs/:runId', (req: Request, res: Response) => {
  try {
    const { runId } = req.params;
    const metadataPath = path.resolve(__dirname, `../../../output/runs/${runId}/metadata.json`);

    if (!fs.existsSync(metadataPath)) {
      return res.status(404).json({ error: 'Run not found' });
    }

    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    res.json(metadata);
  } catch (error: any) {
    console.error('Error fetching run metadata:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/settings
 * 현재 설정 조회
 */
app.get('/api/settings', (req: Request, res: Response) => {
  try {
    const settings = {
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
      EXCEL_AI_PROVIDER: process.env.EXCEL_AI_PROVIDER || 'anthropic',
      DATA_AI_PROVIDER: process.env.DATA_AI_PROVIDER || 'anthropic',
      TE_APP_ID: process.env.TE_APP_ID || '',
      TE_RECEIVER_URL: process.env.TE_RECEIVER_URL || 'https://te-receiver-naver.thinkingdata.kr/',
      DATA_RETENTION_DAYS: process.env.DATA_RETENTION_DAYS || '7',
      EXCEL_RETENTION_DAYS: process.env.EXCEL_RETENTION_DAYS || '30',
      AUTO_DELETE_AFTER_SEND: process.env.AUTO_DELETE_AFTER_SEND || 'false',
    };

    res.json(settings);
  } catch (error: any) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/settings
 * 설정 저장 (.env 파일 업데이트)
 */
app.post('/api/settings', (req: Request, res: Response) => {
  try {
    const {
      ANTHROPIC_API_KEY,
      OPENAI_API_KEY,
      EXCEL_AI_PROVIDER,
      DATA_AI_PROVIDER,
      TE_APP_ID,
      TE_RECEIVER_URL,
      DATA_RETENTION_DAYS,
      EXCEL_RETENTION_DAYS,
      AUTO_DELETE_AFTER_SEND
    } = req.body;

    const envPath = path.resolve(__dirname, '../../../.env');
    let envContent = '';

    // 기존 .env 파일 읽기
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf-8');
    }

    // 설정 업데이트
    const updateEnvVar = (key: string, value: string) => {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${key}=${value}`);
      } else {
        envContent += `\n${key}=${value}`;
      }
    };

    if (ANTHROPIC_API_KEY !== undefined) {
      updateEnvVar('ANTHROPIC_API_KEY', ANTHROPIC_API_KEY);
      process.env.ANTHROPIC_API_KEY = ANTHROPIC_API_KEY;
    }
    if (OPENAI_API_KEY !== undefined) {
      updateEnvVar('OPENAI_API_KEY', OPENAI_API_KEY);
      process.env.OPENAI_API_KEY = OPENAI_API_KEY;
    }
    if (EXCEL_AI_PROVIDER !== undefined) {
      updateEnvVar('EXCEL_AI_PROVIDER', EXCEL_AI_PROVIDER);
      process.env.EXCEL_AI_PROVIDER = EXCEL_AI_PROVIDER;
    }
    if (DATA_AI_PROVIDER !== undefined) {
      updateEnvVar('DATA_AI_PROVIDER', DATA_AI_PROVIDER);
      process.env.DATA_AI_PROVIDER = DATA_AI_PROVIDER;
    }
    if (TE_APP_ID !== undefined) {
      updateEnvVar('TE_APP_ID', TE_APP_ID);
      process.env.TE_APP_ID = TE_APP_ID;
    }
    if (TE_RECEIVER_URL !== undefined) {
      updateEnvVar('TE_RECEIVER_URL', TE_RECEIVER_URL);
      process.env.TE_RECEIVER_URL = TE_RECEIVER_URL;
    }
    if (DATA_RETENTION_DAYS !== undefined) {
      updateEnvVar('DATA_RETENTION_DAYS', DATA_RETENTION_DAYS);
      process.env.DATA_RETENTION_DAYS = DATA_RETENTION_DAYS;
    }
    if (EXCEL_RETENTION_DAYS !== undefined) {
      updateEnvVar('EXCEL_RETENTION_DAYS', EXCEL_RETENTION_DAYS);
      process.env.EXCEL_RETENTION_DAYS = EXCEL_RETENTION_DAYS;
    }
    if (AUTO_DELETE_AFTER_SEND !== undefined) {
      updateEnvVar('AUTO_DELETE_AFTER_SEND', AUTO_DELETE_AFTER_SEND);
      process.env.AUTO_DELETE_AFTER_SEND = AUTO_DELETE_AFTER_SEND;
    }

    // .env 파일 저장
    fs.writeFileSync(envPath, envContent.trim() + '\n');

    res.json({ success: true, message: 'Settings saved successfully' });
  } catch (error: any) {
    console.error('Error saving settings:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/send-data/:runId
 * ThinkingEngine으로 데이터 전송
 */
app.post('/api/send-data/:runId', async (req: Request, res: Response) => {
  try {
    const { runId } = req.params;
    const { appId } = req.body;

    // appId 검증
    if (!appId || !appId.trim()) {
      return res.status(400).json({ error: 'appId is required' });
    }

    // 전송 상태 초기화
    progressMap.set(runId, {
      ...progressMap.get(runId),
      status: 'sending',
      progress: 0,
      message: 'Preparing to send data to ThinkingEngine...'
    });

    // 비동기로 데이터 전송 (appId 전달)
    sendDataAsync(runId, appId.trim());

    res.json({
      success: true,
      message: 'Data transmission started',
      statusUrl: `/api/generate/status/${runId}`
    });
  } catch (error: any) {
    console.error('Error starting data transmission:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 비동기 데이터 생성 함수
 */
async function generateDataAsync(runId: string, config: DataGeneratorConfig) {
  try {
    // 초기 상태
    progressMap.set(runId, {
      status: 'starting',
      progress: 5,
      message: '데이터 생성 준비 중...',
      step: '1/5'
    });

    // progressCallback 추가하여 DataGenerator에 전달
    const configWithCallback: DataGeneratorConfig = {
      ...config,
      onProgress: (progress) => {
        // DataGenerator로부터 받은 진행 상황을 progressMap에 업데이트
        progressMap.set(runId, progress);
      }
    };

    const generator = new DataGenerator(configWithCallback, runId);

    // 데이터 생성 실행 (진행 상황은 onProgress 콜백으로 자동 업데이트됨)
    const result = await generator.generate();

    // 완료
    progressMap.set(runId, {
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
      completedAt: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error during data generation:', error);
    progressMap.set(runId, {
      status: 'error',
      progress: 0,
      message: `❌ 오류: ${error.message}`,
      error: error.stack,
      failedAt: new Date().toISOString()
    });
  }
}

/**
 * 비동기 데이터 전송 함수 (LogBus2 사용)
 */
async function sendDataAsync(runId: string, appId: string) {
  let logbusController: any = null;

  try {
    console.log(`📤 Starting data transmission for ${runId} with APP_ID: ${appId}...`);

    // 데이터 디렉토리 경로 확인
    const dataDir = path.resolve(__dirname, `../../../output/data/${runId}`);
    if (!fs.existsSync(dataDir)) {
      throw new Error(`Data directory not found: ${dataDir}`);
    }

    // 디렉토리 안의 모든 .jsonl 파일 확인
    const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.jsonl'));
    if (files.length === 0) {
      throw new Error(`No data files found in: ${dataDir}`);
    }

    // ThinkingEngine 설정 확인
    // appId를 파라미터로 사용 (더 이상 환경변수 사용 안 함)
    const receiverUrl = process.env.TE_RECEIVER_URL || 'https://te-receiver-naver.thinkingdata.kr/';
    const logbusPath = path.resolve(__dirname, '../../../logbus 2/logbus');

    if (!appId) {
      throw new Error('TE_APP_ID not configured');
    }

    if (!fs.existsSync(logbusPath)) {
      throw new Error(`LogBus binary not found: ${logbusPath}`);
    }

    progressMap.set(runId, {
      ...progressMap.get(runId),
      status: 'sending',
      progress: 10,
      message: `${files.length}개 데이터 파일 준비 중...`
    });

    // 전체 파일 크기 계산
    let totalSize = 0;
    for (const file of files) {
      const filePath = path.join(dataDir, file);
      totalSize += fs.statSync(filePath).size;
    }
    const fileSizeMB = (totalSize / (1024 * 1024)).toFixed(2);

    // LogBus2 컨트롤러 생성
    const { LogBus2Controller } = await import('../logbus/controller');
    logbusController = new LogBus2Controller({
      appId,
      receiverUrl,
      logbusPath,
      dataPath: dataDir,
      cpuLimit: 4,
      compress: true
    });

    progressMap.set(runId, {
      ...progressMap.get(runId),
      status: 'sending',
      progress: 20,
      message: '이전 LogBus2 상태 정리 및 새 설정 준비 중...'
    });

    // 완전 초기화: 이전 상태 제거 + daemon.json 재생성 + 메타 디렉토리 생성
    await logbusController.cleanAndPrepare();
    console.log(`✅ LogBus2 cleaned and configured for ${runId}`);

    progressMap.set(runId, {
      ...progressMap.get(runId),
      status: 'sending',
      progress: 30,
      message: `${fileSizeMB}MB 데이터를 ThinkingEngine으로 업로드 중...`
    });

    // LogBus2 시작
    await logbusController.start();
    console.log(`✅ LogBus2 started for ${runId}`);

    progressMap.set(runId, {
      ...progressMap.get(runId),
      status: 'sending',
      progress: 40,
      message: 'LogBus2를 통해 데이터 전송 중...'
    });

    // 진행 상태 모니터링 (로그 포함)
    let lastProgress = 40;
    let lastLogLine = 0;
    const transporterLogPath = path.join(path.dirname(logbusController.getDaemonConfigPath()), '../log/transporter.log');

    await logbusController.monitorProgress(3, (status) => {
      const uploadProgress = status.progress || 0;
      const currentProgress = 40 + (uploadProgress / 100) * 50; // 40% ~ 90%

      // 최근 로그 메시지 읽기
      let recentLogs: any[] = [];
      try {
        if (fs.existsSync(transporterLogPath)) {
          const content = fs.readFileSync(transporterLogPath, 'utf-8');
          const allLines = content.split('\n').filter(line => line.trim());

          // 새로운 로그만 가져오기 (최근 20줄)
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
        progressMap.set(runId, {
          ...progressMap.get(runId),
          status: 'sending',
          progress: Math.floor(currentProgress),
          message: `전송 중: ${status.uploadedFiles || 0}/${status.totalFiles || 0} 파일 (${uploadProgress.toFixed(1)}%)`,
          logs: recentLogs  // 로그 메시지 추가
        });
      }
    });

    // LogBus2 중지
    await logbusController.stop();
    console.log(`✅ LogBus2 stopped for ${runId}`);

    // 전송 완료
    progressMap.set(runId, {
      ...progressMap.get(runId),
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

    // 전송 완료 후 자동 삭제 (설정에 따라)
    const autoDelete = process.env.AUTO_DELETE_AFTER_SEND === 'true';
    if (autoDelete) {
      try {
        console.log(`🗑️  Auto-delete enabled, removing data files for ${runId}...`);

        // 데이터 디렉토리 삭제
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

    // 🔴 에러 발생 시에도 LogBus2 중지 (중요!)
    if (logbusController) {
      try {
        console.log('⚠️  Stopping LogBus2 due to error...');
        await logbusController.stop();
        console.log('✅ LogBus2 stopped after error');
      } catch (stopError: any) {
        console.error('❌ Failed to stop LogBus2:', stopError.message);
      }
    }

    progressMap.set(runId, {
      ...progressMap.get(runId),
      status: 'send-error',
      progress: 0,
      message: `Transmission error: ${error.message}`,
      error: error.stack,
      failedAt: new Date().toISOString()
    });
  }
}

/**
 * LogBus2 로그 스트리밍 API
 * transporter.log와 daemon.log를 실시간으로 스트리밍
 */
app.get('/api/logbus/logs', (req: Request, res: Response) => {
  const logbusDir = path.resolve(__dirname, '../../../logbus 2');
  const transporterLogPath = path.join(logbusDir, 'log', 'transporter.log');
  const daemonLogPath = path.join(logbusDir, 'log', 'daemon.log');

  // 쿼리 파라미터로 로그 타입 선택 (기본: transporter)
  const logType = (req.query.type as string) || 'transporter';
  const logPath = logType === 'daemon' ? daemonLogPath : transporterLogPath;

  // 최근 N 줄만 가져오기 (기본: 50줄)
  const lines = parseInt(req.query.lines as string) || 50;

  try {
    if (!fs.existsSync(logPath)) {
      return res.status(404).json({
        error: 'Log file not found',
        path: logPath
      });
    }

    // 파일 전체 읽기
    const content = fs.readFileSync(logPath, 'utf-8');
    const allLines = content.split('\n').filter(line => line.trim());

    // 최근 N줄만 추출
    const recentLines = allLines.slice(-lines);

    // JSON 파싱 시도
    const parsedLogs = recentLines.map((line, index) => {
      try {
        return JSON.parse(line);
      } catch {
        return { raw: line, line: allLines.length - lines + index };
      }
    });

    res.json({
      logType,
      totalLines: allLines.length,
      returnedLines: parsedLogs.length,
      logs: parsedLogs
    });

  } catch (error: any) {
    console.error(`Error reading LogBus2 logs:`, error);
    res.status(500).json({
      error: 'Failed to read log file',
      message: error.message
    });
  }
});

/**
 * LogBus2 상태 API
 */
app.get('/api/logbus/status', async (req: Request, res: Response) => {
  try {
    const logbusPath = path.resolve(__dirname, '../../../logbus 2/logbus');
    const { execSync } = require('child_process');

    try {
      const output = execSync(`"${logbusPath}" progress`, { encoding: 'utf-8' });
      const isRunning = !output.includes('not running');

      res.json({
        isRunning,
        output: output.trim()
      });
    } catch (error: any) {
      res.json({
        isRunning: false,
        output: error.message
      });
    }

  } catch (error: any) {
    console.error('Error checking LogBus2 status:', error);
    res.status(500).json({
      error: 'Failed to check LogBus2 status',
      message: error.message
    });
  }
});

/**
 * Authentication & User Management APIs
 */

/**
 * POST /api/auth/login
 * User authentication
 */
app.post('/api/auth/login', auditMiddleware.login, async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const result = await authenticateUser(username, password);

    if (!result) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const { user, token } = result;

    // Return user without password hash
    const { passwordHash, ...userWithoutPassword } = user;

    res.json({
      user: userWithoutPassword,
      token,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
app.get('/api/auth/me', requireAuth, (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = findUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { passwordHash, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/auth/logout
 * Logout (client-side token deletion)
 */
app.post('/api/auth/logout', requireAuth, auditMiddleware.logout, (req: Request, res: Response) => {
  // With JWT, logout is handled client-side by removing the token
  res.json({ message: 'Logged out successfully' });
});

/**
 * GET /api/users
 * Get all users (Admin only)
 */
app.get('/api/users', requireAdmin, async (req: Request, res: Response) => {
  try {
    const users = await getAllUsers();
    res.json({ users });
  } catch (error: any) {
    console.error('Get users error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/users
 * Create new user (Admin only)
 */
app.post('/api/users', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { username, email, password, fullName, role } = req.body;

    if (!username || !email || !password || !fullName || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const user = await createUser({ username, email, password, fullName, role });
    res.status(201).json({ user });
  } catch (error: any) {
    console.error('Create user error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * PUT /api/users/:id
 * Update user (Admin only)
 */
app.put('/api/users/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const updates = req.body;

    const user = await updateUser(userId, updates);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error: any) {
    console.error('Update user error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /api/users/:id
 * Delete user (Admin only)
 */
app.delete('/api/users/:id', requireAdmin, (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);

    // Prevent deleting yourself
    if (req.user?.userId === userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const success = deleteUser(userId);
    if (!success) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/audit-logs
 * Get audit logs (Admin only)
 */
app.get('/api/audit-logs', requireAdmin, auditMiddleware.viewAuditLogs, async (req: Request, res: Response) => {
  try {
    const { user_id, action, start_date, end_date, page = 1, limit = 50 } = req.query;

    const result = await getAuditLogs({
      userId: user_id ? parseInt(user_id as string) : undefined,
      action: action as string | undefined,
      startDate: start_date as string | undefined,
      endDate: end_date as string | undefined,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 50,
    });

    res.json(result);
  } catch (error: any) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Fallback mock audit logs if database not configured
app.get('/api/audit-logs/mock', requireAdmin, (req: Request, res: Response) => {
  try {
    const { user_id, action, page = 1, limit = 50 } = req.query;

    // Mock audit logs for development (when DB not configured)
    const mockLogs = [
      {
        id: 1,
        userId: 1,
        username: 'admin',
        action: 'login',
        resourceType: null,
        resourceId: null,
        details: { ipAddress: '10.27.249.100', userAgent: 'Chrome/120.0' },
        status: 'success',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: 2,
        userId: 1,
        username: 'admin',
        action: 'create_run',
        resourceType: 'run',
        resourceId: 'run_1763100907339',
        details: { dau: 1000, dateRange: '2025-01-01 ~ 2025-01-03' },
        status: 'success',
        createdAt: new Date(Date.now() - 7200000).toISOString(),
      },
      {
        id: 3,
        userId: 2,
        username: 'user',
        action: 'login',
        resourceType: null,
        resourceId: null,
        details: { ipAddress: '10.27.249.101', userAgent: 'Firefox/119.0' },
        status: 'success',
        createdAt: new Date(Date.now() - 10800000).toISOString(),
      },
      {
        id: 4,
        userId: 1,
        username: 'admin',
        action: 'send_data',
        resourceType: 'run',
        resourceId: 'run_1763100907339',
        details: { appId: '1edbbf43c73d4b0ba513f0383714ba5d', fileCount: 3 },
        status: 'success',
        createdAt: new Date(Date.now() - 14400000).toISOString(),
      },
      {
        id: 5,
        userId: 1,
        username: 'admin',
        action: 'create_user',
        resourceType: 'user',
        resourceId: '4',
        details: { username: 'newuser', role: 'user' },
        status: 'success',
        createdAt: new Date(Date.now() - 18000000).toISOString(),
      },
    ];

    // Filter logs (basic filtering for demo)
    let filteredLogs = [...mockLogs];

    if (user_id) {
      filteredLogs = filteredLogs.filter(log => log.userId === parseInt(user_id as string));
    }

    if (action) {
      filteredLogs = filteredLogs.filter(log => log.action === action);
    }

    // Pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

    res.json({
      logs: paginatedLogs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: filteredLogs.length,
        totalPages: Math.ceil(filteredLogs.length / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: error.message });
  }
});

function parseOptionalNumber(value: any): number | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

/**
 * 오래된 파일 정리 함수
 */
function cleanupOldFiles() {
  const dataRetentionDays = parseInt(process.env.DATA_RETENTION_DAYS || '7');
  const excelRetentionDays = parseInt(process.env.EXCEL_RETENTION_DAYS || '30');
  const now = Date.now();

  // 데이터 파일 정리
  const dataDir = path.resolve(__dirname, '../../../output/data');
  if (fs.existsSync(dataDir)) {
    const runDirs = fs.readdirSync(dataDir).filter(d => d.startsWith('run_'));

    for (const runDir of runDirs) {
      const runPath = path.join(dataDir, runDir);
      const stat = fs.statSync(runPath);
      const ageInDays = (now - stat.mtimeMs) / (1000 * 60 * 60 * 24);

      if (ageInDays > dataRetentionDays) {
        console.log(`🗑️  Removing old data directory: ${runDir} (${ageInDays.toFixed(1)} days old)`);
        fs.rmSync(runPath, { recursive: true, force: true });
      }
    }
  }

  // Excel 파일 정리
  const excelDir = path.resolve(__dirname, '../../../excel-schema-generator/output/generated-schemas');
  if (fs.existsSync(excelDir)) {
    const excelFiles = fs.readdirSync(excelDir).filter(f => f.endsWith('.xlsx'));

    for (const file of excelFiles) {
      const filePath = path.join(excelDir, file);
      const stat = fs.statSync(filePath);
      const ageInDays = (now - stat.mtimeMs) / (1000 * 60 * 60 * 24);

      if (ageInDays > excelRetentionDays) {
        console.log(`🗑️  Removing old Excel file: ${file} (${ageInDays.toFixed(1)} days old)`);
        fs.unlinkSync(filePath);
      }
    }
  }

  // 메타데이터 정리
  const metadataDir = path.resolve(__dirname, '../../../output/runs');
  if (fs.existsSync(metadataDir)) {
    const runDirs = fs.readdirSync(metadataDir).filter(d => d.startsWith('run_'));

    for (const runDir of runDirs) {
      const runPath = path.join(metadataDir, runDir);
      const stat = fs.statSync(runPath);
      const ageInDays = (now - stat.mtimeMs) / (1000 * 60 * 60 * 24);

      if (ageInDays > dataRetentionDays) {
        console.log(`🗑️  Removing old metadata: ${runDir} (${ageInDays.toFixed(1)} days old)`);
        fs.rmSync(runPath, { recursive: true, force: true });
      }
    }
  }

  console.log(`✅ Cleanup completed (Data: ${dataRetentionDays}d, Excel: ${excelRetentionDays}d)`);
}

// 서버 시작
const server = app.listen(PORT, async () => {
  console.log(`🚀 API Server running on http://localhost:${PORT}`);
  console.log(`📊 Excel files: http://localhost:${PORT}/api/excel/list`);
  console.log(`🎯 Generate: http://localhost:${PORT}/api/generate/start`);

  // Test database connection
  console.log('\n🔌 Testing database connection...');
  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.log('⚠️  Running in MOCK mode (no database)');
    console.log('ℹ️  Set DATABASE_URL to enable PostgreSQL features');
  }

  // 서버 시작 시 한 번 정리
  console.log('\n🧹 Running initial cleanup...');
  cleanupOldFiles();

  // 매일 자정에 정리 실행 (24시간마다)
  setInterval(() => {
    console.log('\n🧹 Running scheduled cleanup...');
    cleanupOldFiles();
  }, 24 * 60 * 60 * 1000); // 24시간
});

// 서버 타임아웃 설정 (10분)
server.timeout = 600000; // 10 minutes
server.keepAliveTimeout = 610000; // 10 minutes + 10 seconds
