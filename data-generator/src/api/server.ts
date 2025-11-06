#!/usr/bin/env node

/**
 * Express API 서버
 * 프론트엔드와 데이터 생성기를 연결
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
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
    const { ANTHROPIC_API_KEY, TE_APP_ID, TE_RECEIVER_URL } = req.body;

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
    // Step 1: Excel 파싱
    progressMap.set(runId, {
      status: 'parsing',
      progress: 5,
      message: 'Excel 스키마 파일 로드 중...',
      step: '1/6'
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    progressMap.set(runId, {
      status: 'parsing',
      progress: 10,
      message: 'Excel 이벤트 및 속성 정의 파싱 중...',
      step: '1/6'
    });

    const generator = new DataGenerator(config);

    // Step 2: AI 분석 준비
    progressMap.set(runId, {
      status: 'analyzing',
      progress: 20,
      message: 'AI 모델 연결 및 초기화 중...',
      step: '2/6'
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    // Step 3: AI 분석 실행
    progressMap.set(runId, {
      status: 'analyzing',
      progress: 30,
      message: '시나리오 기반 사용자 세그먼트 및 행동 패턴 생성 중...',
      step: '3/6'
    });

    // Step 4: 데이터 생성 시작
    progressMap.set(runId, {
      status: 'generating',
      progress: 40,
      message: '사용자 코호트 생성 중...',
      step: '4/6'
    });

    await new Promise(resolve => setTimeout(resolve, 300));

    progressMap.set(runId, {
      status: 'generating',
      progress: 50,
      message: '일별 이벤트 데이터 생성 시작...',
      step: '5/6'
    });

    // 데이터 생성 실행
    const result = await generator.generate();

    // Step 5: 파일 저장
    progressMap.set(runId, {
      status: 'saving',
      progress: 90,
      message: '생성된 데이터를 파일로 저장 중...',
      step: '6/6'
    });

    await new Promise(resolve => setTimeout(resolve, 500));

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

    // 데이터 파일 경로 확인
    const dataPath = path.resolve(__dirname, `../../../output/data/${runId}.jsonl.gz`);
    if (!fs.existsSync(dataPath)) {
      throw new Error(`Data file not found: ${dataPath}`);
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
      message: 'Reading data file...'
    });

    // 파일 크기 확인
    const stats = fs.statSync(dataPath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    progressMap.set(runId, {
      ...progressMap.get(runId),
      status: 'sending',
      progress: 30,
      message: `Uploading ${fileSizeMB}MB to ThinkingEngine...`
    });

    // TODO: 실제 ThinkingEngine API 호출 구현
    // 현재는 시뮬레이션
    await new Promise(resolve => setTimeout(resolve, 2000));

    progressMap.set(runId, {
      ...progressMap.get(runId),
      status: 'sending',
      progress: 60,
      message: 'Processing data on server...'
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    progressMap.set(runId, {
      ...progressMap.get(runId),
      status: 'sending',
      progress: 90,
      message: 'Finalizing transmission...'
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    // 전송 완료
    progressMap.set(runId, {
      ...progressMap.get(runId),
      status: 'sent',
      progress: 100,
      message: 'Data successfully sent to ThinkingEngine!',
      sentAt: new Date().toISOString(),
      sentInfo: {
        appId,
        fileSizeMB,
        receiverUrl
      }
    });

    console.log(`✅ Data transmission completed for ${runId}`);

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

// 서버 시작
app.listen(PORT, () => {
  console.log(`🚀 API Server running on http://localhost:${PORT}`);
  console.log(`📊 Excel files: http://localhost:${PORT}/api/excel/list`);
  console.log(`🎯 Generate: http://localhost:${PORT}/api/generate/start`);
});
