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

// 환경변수 로드
dotenv.config();

const app = express();
const PORT = process.env.API_PORT || 3001;

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
    const schemaDir = path.resolve(__dirname, '../../../excel-schema-generator/output/generated-schemas');

    if (!fs.existsSync(schemaDir)) {
      return res.json({ files: [] });
    }

    const files = fs.readdirSync(schemaDir)
      .filter(f => f.endsWith('.xlsx'))
      .map(f => ({
        name: f,
        path: path.join(schemaDir, f),
        size: fs.statSync(path.join(schemaDir, f)).size,
        modified: fs.statSync(path.join(schemaDir, f)).mtime
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

    res.json({
      success: true,
      file: {
        name: fileName,
        path: filePath,
        size: req.file.size
      },
      preview: {
        events: schema.events.length,
        properties: schema.properties.length,
        funnels: schema.funnels.length,
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

    // 전송 상태 초기화
    progressMap.set(runId, {
      ...progressMap.get(runId),
      status: 'sending',
      progress: 0,
      message: 'Preparing to send data to ThinkingEngine...'
    });

    // 비동기로 데이터 전송
    sendDataAsync(runId);

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

    const generator = new DataGenerator(configWithCallback);

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
 * 비동기 데이터 전송 함수
 */
async function sendDataAsync(runId: string) {
  try {
    console.log(`📤 Starting data transmission for ${runId}...`);

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
    const appId = process.env.TE_APP_ID;
    const receiverUrl = process.env.TE_RECEIVER_URL || 'https://te-receiver-naver.thinkingdata.kr/';

    if (!appId) {
      throw new Error('TE_APP_ID not configured');
    }

    progressMap.set(runId, {
      ...progressMap.get(runId),
      status: 'sending',
      progress: 10,
      message: `${files.length}개 데이터 파일 읽는 중...`
    });

    // 전체 파일 크기 계산
    let totalSize = 0;
    for (const file of files) {
      const filePath = path.join(dataDir, file);
      totalSize += fs.statSync(filePath).size;
    }
    const fileSizeMB = (totalSize / (1024 * 1024)).toFixed(2);

    progressMap.set(runId, {
      ...progressMap.get(runId),
      status: 'sending',
      progress: 30,
      message: `${fileSizeMB}MB 데이터를 ThinkingEngine으로 업로드 중...`
    });

    // ThinkingEngine으로 실제 데이터 전송
    let successCount = 0;
    let totalEvents = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const filePath = path.join(dataDir, file);

      progressMap.set(runId, {
        ...progressMap.get(runId),
        status: 'sending',
        progress: 30 + (i / files.length) * 50,
        message: `파일 ${i + 1}/${files.length} 전송 중: ${file}...`
      });

      try {
        // JSONL 파일 읽기
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const events = fileContent.trim().split('\n').filter(line => line.trim());

        // 이벤트를 배치로 전송 (한 번에 최대 1000개)
        const batchSize = 1000;
        for (let j = 0; j < events.length; j += batchSize) {
          const batch = events.slice(j, Math.min(j + batchSize, events.length));
          const parsedBatch = batch.map(line => {
            const event = JSON.parse(line);
            // 각 이벤트에 #app_id 추가
            event['#app_id'] = appId;
            return event;
          });

          // ThinkingEngine API로 POST
          const response = await fetch(receiverUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(parsedBatch)
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Failed to send batch to ThinkingEngine: ${response.status} ${errorText}`);
            throw new Error(`ThinkingEngine API error: ${response.status}`);
          }

          totalEvents += parsedBatch.length;
        }

        successCount++;
      } catch (error: any) {
        console.error(`Error sending file ${file}:`, error);
        throw error;
      }
    }

    progressMap.set(runId, {
      ...progressMap.get(runId),
      status: 'sending',
      progress: 90,
      message: `${totalEvents.toLocaleString()}개 이벤트 전송 완료, 처리 확인 중...`
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

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
        totalEvents,
        files: files
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
app.listen(PORT, () => {
  console.log(`🚀 API Server running on http://localhost:${PORT}`);
  console.log(`📊 Excel files: http://localhost:${PORT}/api/excel/list`);
  console.log(`🎯 Generate: http://localhost:${PORT}/api/generate/start`);

  // 서버 시작 시 한 번 정리
  console.log('\n🧹 Running initial cleanup...');
  cleanupOldFiles();

  // 매일 자정에 정리 실행 (24시간마다)
  setInterval(() => {
    console.log('\n🧹 Running scheduled cleanup...');
    cleanupOldFiles();
  }, 24 * 60 * 60 * 1000); // 24시간
});
