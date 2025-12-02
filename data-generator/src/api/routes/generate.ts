import { Router, Request, Response } from 'express';
import * as path from 'path';
import multer from 'multer';
import archiver from 'archiver';
import { DataGeneratorConfig } from '../../data-generator';
import { generateDataAsync, getGenerationProgress } from '../services/data-generation.service';
import { analyzeOnlyAsync, getAnalysisResult, updateAnalysisResult } from '../services/analysis.service';
import { sendDataAsync } from '../services/logbus.service';
import { AnalysisExcelGenerator } from '../../utils/analysis-excel-generator';
import { AnalysisExcelParser } from '../../utils/analysis-excel-parser';
import * as fs from 'fs';
import { logger } from '../../utils/logger';
import { requireAuth } from '../middleware';
import { getUserSettings } from '../../db/repositories/user-settings-repository';

const router = Router();

// Multer setup for Excel file uploads
const uploadDir = path.resolve(__dirname, '../../../uploads/analysis-updates');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
      cb(null, `${uniqueSuffix}-${file.originalname}`);
    }
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.originalname.endsWith('.xlsx')) {
      cb(null, true);
    } else {
      cb(new Error('Only .xlsx files are allowed'));
    }
  }
});

/**
 * POST /api/generate/start
 * Start data generation
 */
router.post('/start', requireAuth, async (req: Request, res: Response) => {
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
      outputMetadataPath,
      fileAnalysisContext
    } = req.body;

    // Validate required fields
    if (!excelPath || !scenario || !dau || !industry || !dateStart || !dateEnd) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['excelPath', 'scenario', 'dau', 'industry', 'dateStart', 'dateEnd']
      });
    }

    // Add file analysis context to notes
    let enhancedNotes = notes || '';
    if (fileAnalysisContext) {
      enhancedNotes = `${notes || ''}\n\n[추가 참고 자료]\n업로드된 파일에서 분석된 내용:\n${fileAnalysisContext}`;
      logger.info('📎 데이터 생성에 파일 분석 컨텍스트가 추가되었습니다.');
    }

    // Get user settings
    const userId = (req as any).user.userId;
    const userSettings = await getUserSettings(userId);

    // Get AI API Key from user settings ONLY (no environment fallback)
    let aiApiKey: string | undefined;
    const requestedProvider = aiProvider || userSettings?.dataAiProvider || 'anthropic';

    if (requestedProvider === 'anthropic') {
      aiApiKey = userSettings?.anthropicApiKey;
    } else if (requestedProvider === 'openai') {
      aiApiKey = userSettings?.openaiApiKey;
    } else if (requestedProvider === 'gemini') {
      aiApiKey = userSettings?.geminiApiKey;
    }

    if (!aiApiKey) {
      return res.status(400).json({
        error: 'AI API key not configured',
        message: `Please configure ${requestedProvider.toUpperCase()} API key in Settings page`,
        redirectTo: '/dashboard/settings',
        action: 'configure_api_key',
        provider: requestedProvider
      });
    }

    logger.info(`🔑 Using ${requestedProvider} API key from user settings`);

    // Generate Run ID
    const runId = `run_${Date.now()}`;

    // Prepare config with user settings
    const config: DataGeneratorConfig = {
      excelFilePath: excelPath,
      userInput: {
        scenario,
        dau: parseInt(dau),
        industry,
        notes: enhancedNotes,
        dateRange: {
          start: dateStart,
          end: dateEnd
        }
      },
      aiProvider: requestedProvider as 'openai' | 'anthropic' | 'gemini',
      aiApiKey,
      aiModel: userSettings?.dataAiModel || undefined,
      validationModelTier: (userSettings?.validationModelTier || 'fast') as 'fast' | 'balanced',
      customValidationModel: userSettings?.customValidationModel || undefined,
      outputDataPath: outputDataPath || path.resolve(__dirname, '../../../output/data'),
      outputMetadataPath: outputMetadataPath || path.resolve(__dirname, '../../../output/runs')
    };

    // Start async data generation
    generateDataAsync(runId, config);

    // Immediate response
    res.json({
      runId,
      message: 'Data generation started',
      statusUrl: `/api/generate/status/${runId}`
    });

  } catch (error: any) {
    logger.error('Error starting generation:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/generate/status/:runId
 * Get generation progress
 */
router.get('/status/:runId', (req: Request, res: Response) => {
  const { runId } = req.params;
  const progress = getGenerationProgress(runId);

  if (!progress) {
    return res.status(404).json({ error: 'Run ID not found' });
  }

  res.json(progress);
});

/**
 * POST /api/generate/analyze
 * AI analysis only (no data generation)
 */
router.post('/analyze', requireAuth, async (req: Request, res: Response) => {
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
      fileAnalysisContext,
      language = 'ko' // Default to Korean
    } = req.body;

    // Validate required fields
    const missing = [];
    if (!excelPath || excelPath.trim() === '') missing.push('excelPath');
    if (!scenario || scenario.trim() === '') missing.push('scenario');
    if (!dau) missing.push('dau');
    if (!industry || industry.trim() === '') missing.push('industry');
    if (!dateStart) missing.push('dateStart');
    if (!dateEnd) missing.push('dateEnd');

    if (missing.length > 0) {
      logger.error('❌ Missing required fields:', missing);
      logger.error('Received body:', { excelPath, scenario, dau, industry, dateStart, dateEnd });
      return res.status(400).json({
        error: 'Missing required fields',
        missing,
        required: ['excelPath', 'scenario', 'dau', 'industry', 'dateStart', 'dateEnd']
      });
    }

    // Add file analysis context to notes
    let enhancedNotes = notes || '';
    if (fileAnalysisContext) {
      enhancedNotes = `${notes || ''}\n\n[추가 참고 자료]\n업로드된 파일에서 분석된 내용:\n${fileAnalysisContext}`;
    }

    // Get user settings
    const userId = (req as any).user.userId;
    const userSettings = await getUserSettings(userId);

    // Get AI API Key from user settings ONLY (no environment fallback)
    let aiApiKey: string | undefined;
    const requestedProvider = aiProvider || userSettings?.dataAiProvider || 'anthropic';

    if (requestedProvider === 'anthropic') {
      aiApiKey = userSettings?.anthropicApiKey;
    } else if (requestedProvider === 'openai') {
      aiApiKey = userSettings?.openaiApiKey;
    } else if (requestedProvider === 'gemini') {
      aiApiKey = userSettings?.geminiApiKey;
    }

    if (!aiApiKey) {
      return res.status(400).json({
        error: 'AI API key not configured',
        message: `Please configure ${requestedProvider.toUpperCase()} API key in Settings page`,
        redirectTo: '/dashboard/settings',
        action: 'configure_api_key',
        provider: requestedProvider
      });
    }

    logger.info(`🔑 Using ${requestedProvider} API key from user settings`);

    // Generate Analysis ID
    const analysisId = `analysis_${Date.now()}`;

    logger.info(`🤖 AI analysis requested with language: ${language}`);

    // Start async AI analysis
    analyzeOnlyAsync(analysisId, {
      excelPath,
      scenario,
      dau: parseInt(dau),
      industry,
      notes: enhancedNotes,
      dateStart,
      dateEnd,
      aiProvider: requestedProvider as 'openai' | 'anthropic' | 'gemini',
      aiApiKey,
      language
    });

    // Immediate response
    res.json({
      analysisId,
      message: 'AI analysis started',
      statusUrl: `/api/generate/analysis/${analysisId}`
    });

  } catch (error: any) {
    logger.error('Error starting AI analysis:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/generate/analysis/:analysisId
 * Get AI analysis result
 */
router.get('/analysis/:analysisId', (req: Request, res: Response) => {
  const { analysisId } = req.params;
  const analysis = getAnalysisResult(analysisId);

  if (!analysis) {
    return res.status(404).json({ error: 'Analysis ID not found' });
  }

  res.json(analysis);
});

/**
 * PUT /api/generate/analysis/:analysisId
 * Update AI analysis result
 */
router.put('/analysis/:analysisId', (req: Request, res: Response) => {
  const { analysisId } = req.params;
  const analysis = getAnalysisResult(analysisId);

  if (!analysis) {
    return res.status(404).json({ error: 'Analysis ID not found' });
  }

  if (analysis.status !== 'completed') {
    return res.status(400).json({ error: 'Analysis not yet completed' });
  }

  // Update analysis result
  updateAnalysisResult(analysisId, req.body);
  const updatedAnalysis = getAnalysisResult(analysisId);

  res.json({
    success: true,
    analysis: updatedAnalysis
  });
});

/**
 * POST /api/generate/start-with-analysis
 * Start data generation with modified AI analysis
 */
router.post('/start-with-analysis', requireAuth, async (req: Request, res: Response) => {
  try {
    const { analysisId } = req.body;

    if (!analysisId) {
      return res.status(400).json({ error: 'analysisId is required' });
    }

    const analysis = getAnalysisResult(analysisId);

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    if (analysis.status !== 'completed') {
      return res.status(400).json({ error: 'Analysis not yet completed' });
    }

    // Get user settings
    const userId = (req as any).user.userId;
    const userSettings = await getUserSettings(userId);

    // Get AI API Key from user settings ONLY (no environment fallback)
    let aiApiKey: string | undefined;
    const requestedProvider = analysis.config.aiProvider || userSettings?.dataAiProvider || 'anthropic';

    if (requestedProvider === 'anthropic') {
      aiApiKey = userSettings?.anthropicApiKey;
    } else if (requestedProvider === 'openai') {
      aiApiKey = userSettings?.openaiApiKey;
    } else if (requestedProvider === 'gemini') {
      aiApiKey = userSettings?.geminiApiKey;
    }

    if (!aiApiKey) {
      return res.status(400).json({
        error: 'AI API key not configured',
        message: `Please configure ${requestedProvider.toUpperCase()} API key in Settings page`,
        redirectTo: '/dashboard/settings',
        action: 'configure_api_key',
        provider: requestedProvider
      });
    }

    logger.info(`🔑 Using ${requestedProvider} API key from user settings`);

    // Generate Run ID
    const runId = `run_${Date.now()}`;

    // Prepare config with pre-analyzed result
    const config: DataGeneratorConfig = {
      excelFilePath: analysis.config.excelPath,
      userInput: {
        scenario: analysis.config.scenario,
        dau: analysis.config.dau,
        industry: analysis.config.industry,
        notes: analysis.config.notes,
        dateRange: {
          start: analysis.config.dateStart,
          end: analysis.config.dateEnd
        }
      },
      aiProvider: requestedProvider as 'openai' | 'anthropic' | 'gemini',
      aiApiKey,
      aiModel: userSettings?.dataAiModel || undefined,
      validationModelTier: (userSettings?.validationModelTier || 'fast') as 'fast' | 'balanced',
      customValidationModel: userSettings?.customValidationModel || undefined,
      outputDataPath: path.resolve(__dirname, '../../../output/data'),
      outputMetadataPath: path.resolve(__dirname, '../../../output/runs'),
      preAnalyzedResult: analysis.result
    };

    // Start async data generation
    generateDataAsync(runId, config);

    // Immediate response
    res.json({
      runId,
      message: 'Data generation started with analysis',
      statusUrl: `/api/generate/status/${runId}`
    });

  } catch (error: any) {
    logger.error('Error starting generation with analysis:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/generate/analysis-excel
 * Generate AI analysis result as Excel
 */
router.post('/analysis-excel', async (req: Request, res: Response) => {
  try {
    const { runId } = req.body;

    if (!runId) {
      return res.status(400).json({ error: 'runId is required' });
    }

    // Get AI analysis result from progressMap
    const progress = getGenerationProgress(runId);
    if (!progress || !(progress as any).aiAnalysis) {
      return res.status(404).json({ error: 'AI analysis result not found for this runId' });
    }

    // Generate AI analysis Excel
    const outputDir = path.resolve(__dirname, '../../../output/analysis-excel');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const excelPath = await AnalysisExcelGenerator.generateAnalysisExcel(
      (progress as any).aiAnalysis,
      outputDir,
      {
        industry: (progress as any).industry,
        scenario: (progress as any).scenario,
        originalExcelFile: (progress as any).excelFile
      }
    );

    const fileName = path.basename(excelPath);

    res.json({
      success: true,
      file: {
        path: excelPath,
        name: fileName,
        downloadUrl: `/api/generate/analysis-excel/download/${encodeURIComponent(fileName)}`
      }
    });

  } catch (error: any) {
    logger.error('Error generating analysis Excel:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/generate/analysis-excel/download/:filename
 * Download AI analysis Excel
 */
router.get('/analysis-excel/download/:filename', (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const safeFilename = path.basename(filename);
    const outputDir = path.resolve(__dirname, '../../../output/analysis-excel');
    const filePath = path.join(outputDir, safeFilename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.download(filePath, safeFilename, (err) => {
      if (err) {
        logger.error('Download error:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Download failed' });
        }
      }
    });

  } catch (error: any) {
    logger.error('Error downloading analysis Excel:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/send-data/:runId
 * Send data to ThinkingEngine
 */
router.post('/send-data/:runId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { runId } = req.params;
    const { appId } = req.body;

    // Get user settings
    const userId = (req as any).user.userId;
    const userSettings = await getUserSettings(userId);

    // Get TE App ID from request body or user settings ONLY (no environment fallback)
    const finalAppId = appId?.trim() || userSettings?.teAppId;

    if (!finalAppId) {
      return res.status(400).json({
        error: 'TE App ID not configured',
        message: 'Please configure TE App ID in Settings page',
        redirectTo: '/dashboard/settings',
        action: 'configure_te_app_id'
      });
    }

    // Get TE Receiver URL from user settings ONLY (use default if not configured)
    const receiverUrl = userSettings?.teReceiverUrl || 'https://te-receiver-naver.thinkingdata.kr/';

    logger.info(`📤 Sending data with TE App ID: ${finalAppId} to ${receiverUrl}`);
    logger.info(`🔧 TE settings from ${userSettings?.teAppId ? 'user settings' : 'request body'}`);

    // Start async data transmission with receiverUrl
    sendDataAsync(runId, finalAppId, receiverUrl);

    res.json({
      success: true,
      message: 'Data transmission started',
      statusUrl: `/api/generate/status/${runId}`
    });
  } catch (error: any) {
    logger.error('Error starting data transmission:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/generate/analysis-excel/:filename
 * Download AI analysis Excel file
 */
router.get('/analysis-excel/:filename', (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    if (!filename) {
      return res.status(400).json({ error: 'Filename is required' });
    }

    const safeFilename = path.basename(filename);
    const analysisExcelDir = path.resolve(__dirname, '../../../output/analysis-results');
    const filePath = path.join(analysisExcelDir, safeFilename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.download(filePath, safeFilename);
  } catch (error: any) {
    logger.error('Error downloading analysis Excel:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/excel/upload-analysis
 * Upload AI analysis Excel file (for data-only mode)
 */
router.post('/upload-analysis', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    logger.info(`📤 Processing AI analysis Excel upload: ${req.file.originalname}`);

    // Parse the uploaded Excel file
    const parser = new AnalysisExcelParser();
    const parsedData = await parser.parseAnalysisExcel(req.file.path);

    logger.info(`✅ Parsed AI analysis Excel:`, {
      userSegments: parsedData.userSegments?.length || 0,
      eventSequencing: parsedData.eventSequencing ? 'present' : 'missing',
      transactions: parsedData.eventSequencing?.transactions?.length || 0
    });

    // Keep the file for later use
    const savedPath = req.file.path;

    // Return preview data
    res.json({
      success: true,
      file: {
        path: savedPath,
        originalName: req.file.originalname
      },
      preview: {
        segments: parsedData.userSegments?.length || 0,
        transactions: parsedData.eventSequencing?.transactions?.length || 0,
        hasEventSequencing: !!parsedData.eventSequencing
      }
    });

  } catch (error: any) {
    logger.error('Error uploading AI analysis Excel:', error);

    // Clean up uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/generate/update-analysis-excel
 * Update AI analysis by uploading a modified Excel file
 */
router.post('/update-analysis-excel', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const analysisId = req.body.analysisId;
    if (!analysisId) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'analysisId is required' });
    }

    // Check if analysis exists
    const analysis = getAnalysisResult(analysisId);
    if (!analysis) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Analysis not found' });
    }

    if (analysis.status !== 'completed') {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Analysis not yet completed' });
    }

    logger.info(`📤 Processing uploaded Excel for analysis: ${analysisId}`);

    // Parse the uploaded Excel file
    const parser = new AnalysisExcelParser();
    const parsedData = await parser.parseAnalysisExcel(req.file.path);

    logger.info(`✅ Parsed Excel data:`, {
      userSegments: parsedData.userSegments?.length || 0,
      eventSequencing: parsedData.eventSequencing ? 'present' : 'missing',
      transactions: parsedData.eventSequencing?.transactions?.length || 0
    });

    // Update the analysis with parsed data
    updateAnalysisResult(analysisId, parsedData);

    // Get updated analysis
    const updatedAnalysis = getAnalysisResult(analysisId);

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: 'AI 분석 결과가 업데이트되었습니다',
      updatedAnalysis: updatedAnalysis?.result
    });

  } catch (error: any) {
    logger.error('Error updating analysis from Excel:', error);

    // Clean up uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/generate/download-data/:runId
 * Download generated data files as ZIP
 */
router.get('/download-data/:runId', async (req: Request, res: Response) => {
  try {
    const { runId } = req.params;

    // Find data directory for the runId (correct path: output/data/{runId})
    const dataDir = path.resolve(__dirname, `../../../output/data/${runId}`);

    if (!fs.existsSync(dataDir)) {
      logger.error(`❌ Data directory not found: ${dataDir}`);
      return res.status(404).json({ error: 'Run ID not found or data directory does not exist' });
    }

    // Check if there are JSONL files
    const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.jsonl'));

    if (files.length === 0) {
      logger.error(`❌ No JSONL files found in: ${dataDir}`);
      return res.status(404).json({ error: 'No data files found' });
    }

    // Set response headers for ZIP download
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=data_${runId}.zip`);

    // Create archiver
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    // Pipe archive to response
    archive.pipe(res);

    // Add all JSONL files to the archive
    files.forEach(file => {
      const filePath = path.join(dataDir, file);
      archive.file(filePath, { name: file });
    });

    // Finalize the archive
    await archive.finalize();

    logger.info(`📦 Sent ${files.length} data files as ZIP for run ${runId}`);

  } catch (error: any) {
    logger.error('Error downloading data files:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
});

export default router;
