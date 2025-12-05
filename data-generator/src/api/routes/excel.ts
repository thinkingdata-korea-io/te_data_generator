
import express, { Request, Response } from 'express';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { ExcelParser } from '../../excel/parser';
import { ExcelSchemaGenerator } from '@excel-schema-generator/schema-generator';
import { logger } from '../../utils/logger';
import { requireAuth } from '../middleware';
import { getUserSettings } from '../../db/repositories/user-settings-repository';

const router = express.Router();

const EXCEL_OUTPUT_DIR = path.resolve(__dirname, '../../../../excel-schema-generator/output/generated-schemas');

// Multer 설정 (파일 업로드) - data-generator/uploads 사용으로 통일
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
    const randomString = Math.random().toString(36).substring(2, 8);
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${timestamp}_${randomString}_${safeName}`);
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


/**
 * GET /api/excel/list
 * 사용 가능한 Excel 파일 목록 조회
 */
router.get('/excel/list', async (req: Request, res: Response) => {
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
    logger.error('Error listing Excel files:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/excel/parse
 * Excel 파일 파싱 (미리보기)
 */
router.post('/excel/parse', async (req: Request, res: Response) => {
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
    logger.error('Error parsing Excel:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/excel/generate-stream (SSE)
 * 사용자 입력 기반으로 Excel 텍소노미 생성 (실시간 진행 상황 스트리밍)
 */
router.post('/excel/generate-stream', requireAuth, async (req: Request, res: Response) => {
  const {
    scenario = '', // Optional for taxonomy-only mode
    industry,
    notes,
    language = 'ko', // Default to Korean
    eventCountMin = 20, // 기본값: 표준 범위
    eventCountMax = 40,
  } = req.body;

  // Taxonomy generation only requires industry and notes
  if (!industry || !notes) {
    return res.status(400).json({ error: 'industry and notes are required' });
  }

  logger.info(`📝 Excel generation requested with language: ${language}`);

  // Get user settings for API key
  const userId = (req as any).user.userId;
  const userSettings = await getUserSettings(userId);

  if (!userSettings?.anthropicApiKey) {
    return res.status(400).json({
      error: 'Anthropic API key not configured. Please set it in Settings.'
    });
  }

  // Set up SSE
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  res.setHeader('Transfer-Encoding', 'chunked');
  res.flushHeaders();

  // Send initial comment to establish SSE connection
  res.write(': SSE connection established\n\n');

  const sendProgress = (data: any) => {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    logger.debug('[SSE] Sending:', data.message || data.type);
    res.write(message);
    // Explicitly tell Node to flush the write buffer
    if ((res as any).socket) {
      (res as any).socket.uncork();
    }
  };

  try {
    const generator = new ExcelSchemaGenerator({
      outputDir: EXCEL_OUTPUT_DIR,
      preferredProvider: 'anthropic',
      anthropicKey: userSettings.anthropicApiKey, // 🔥 FIX: Use user's API key
      anthropicModel: userSettings.excelModel || process.env.EXCEL_ANTHROPIC_MODEL,
      onProgress: (progress) => {
        sendProgress({
          type: 'progress',
          stage: progress.stage,
          progress: progress.progress,
          message: progress.message,
          detail: progress.detail
        });
      }
    });

    // Combine scenario and notes if scenario is provided
    const combinedNotes = scenario ? `${notes}\n\n시나리오: ${scenario}` : notes;

    const result = await generator.generate({
      scenario: combinedNotes, // Use combined notes as scenario
      industry,
      notes: combinedNotes,
      eventCountMin,
      eventCountMax
    });

    // Parse generated Excel to get preview data
    const parser = new ExcelParser();
    if (!result.filePath) {
      throw new Error('Failed to generate Excel file');
    }
    const schema = await parser.parseExcelFile(result.filePath);

    const eventProperties = schema.properties.filter(p => p.event_name);
    const commonProperties = schema.properties.filter(p => !p.event_name);

    // Send final result
    sendProgress({
      type: 'complete',
      success: true,
      file: {
        name: result.fileName,
        path: result.filePath
      },
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

    res.end();
  } catch (error: any) {
    logger.error('Error generating Excel schema:', error);
    sendProgress({
      type: 'error',
      error: error.message || 'Failed to generate Excel schema'
    });
    res.end();
  }
});

/**
 * POST /api/excel/generate
 * 사용자 입력 기반으로 Excel 텍소노미 생성 (기존 non-SSE 버전, 호환성 유지)
 */
router.post('/excel/generate', async (req: Request, res: Response) => {
  try {
    const {
      scenario,
      industry,
      notes,
    } = req.body;

    if (!scenario || !industry || !notes) {
      return res.status(400).json({ error: 'scenario, industry, and notes are required' });
    }

    const generator = new ExcelSchemaGenerator({
      outputDir: EXCEL_OUTPUT_DIR,
      preferredProvider: 'anthropic',
      anthropicKey: process.env.ANTHROPIC_API_KEY,
      anthropicModel: process.env.EXCEL_ANTHROPIC_MODEL
    });

    const result = await generator.generate({
      scenario,
      industry,
      notes
    });

    // Parse generated Excel to get preview data
    const parser = new ExcelParser();
    if (!result.filePath) {
      throw new Error('Failed to generate Excel file');
    }
    const schema = await parser.parseExcelFile(result.filePath);

    // 이벤트 전용 속성과 공통 속성 분리
    const eventProperties = schema.properties.filter(p => p.event_name);
    const commonProperties = schema.properties.filter(p => !p.event_name);

    logger.debug(`📊 Preview counts: events=${schema.events.length}, eventProps=${eventProperties.length}, commonProps=${commonProperties.length}, userData=${schema.userData.length}`);

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
    logger.error('Error generating Excel schema:', error);
    res.status(500).json({ error: error.message || 'Failed to generate Excel schema' });
  }
});

/**
 * POST /api/excel/upload
 * Excel 파일 업로드 및 검증
 */
router.post('/excel/upload', upload.single('file'), async (req: Request, res: Response) => {
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
    logger.error('Error uploading Excel:', error);

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
router.get('/excel/download/:filename', (req: Request, res: Response) => {
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
    logger.error('Error downloading Excel:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
