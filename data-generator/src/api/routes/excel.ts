
import express, { Request, Response } from 'express';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { ExcelParser } from '../../excel/parser';
import { ExcelSchemaGenerator } from '../../../../excel-schema-generator/src/schema-generator';

const router = express.Router();

const EXCEL_OUTPUT_DIR = path.resolve(__dirname, '../../../../excel-schema-generator/output/generated-schemas');

// Multer 설정 (파일 업로드) - server.ts와 중복되므로 나중에 하나로 합치는 것을 고려
const uploadDir = path.resolve(__dirname, '../../../../uploads');
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
    console.error('Error listing Excel files:', error);
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
    console.error('Error parsing Excel:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/excel/generate
 * 사용자 입력 기반으로 Excel 텍소노미 생성
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
    console.error('Error downloading Excel:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
