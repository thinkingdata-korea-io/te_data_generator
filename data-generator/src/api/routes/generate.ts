import { Router, Request, Response } from 'express';
import * as path from 'path';
import { DataGeneratorConfig } from '../../data-generator';
import { generateDataAsync, getGenerationProgress } from '../services/data-generation.service';
import { analyzeOnlyAsync, getAnalysisResult, updateAnalysisResult } from '../services/analysis.service';
import { sendDataAsync } from '../services/logbus.service';
import { AnalysisExcelGenerator } from '../../utils/analysis-excel-generator';
import * as fs from 'fs';

const router = Router();

/**
 * POST /api/generate/start
 * Start data generation
 */
router.post('/start', async (req: Request, res: Response) => {
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
      console.log('📎 데이터 생성에 파일 분석 컨텍스트가 추가되었습니다.');
    }

    // Check AI API Key
    const aiApiKey = process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY;
    if (!aiApiKey) {
      return res.status(500).json({
        error: 'AI API key not configured',
        message: 'Set ANTHROPIC_API_KEY, OPENAI_API_KEY, or GEMINI_API_KEY in environment'
      });
    }

    // Generate Run ID
    const runId = `run_${Date.now()}`;

    // Prepare config
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
      aiProvider: (aiProvider || 'anthropic') as 'openai' | 'anthropic' | 'gemini',
      aiApiKey,
      aiModel: process.env.DATA_AI_MODEL || undefined,
      validationModelTier: (process.env.VALIDATION_MODEL_TIER as 'fast' | 'balanced') || 'fast',
      customValidationModel: process.env.CUSTOM_VALIDATION_MODEL || undefined,
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
    console.error('Error starting generation:', error);
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
router.post('/analyze', async (req: Request, res: Response) => {
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
      fileAnalysisContext
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
      console.error('❌ Missing required fields:', missing);
      console.error('Received body:', { excelPath, scenario, dau, industry, dateStart, dateEnd });
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

    // Check AI API Key
    const aiApiKey = process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY;
    if (!aiApiKey) {
      return res.status(500).json({
        error: 'AI API key not configured',
        message: 'Set ANTHROPIC_API_KEY, OPENAI_API_KEY, or GEMINI_API_KEY in environment'
      });
    }

    // Generate Analysis ID
    const analysisId = `analysis_${Date.now()}`;

    // Start async AI analysis
    analyzeOnlyAsync(analysisId, {
      excelPath,
      scenario,
      dau: parseInt(dau),
      industry,
      notes: enhancedNotes,
      dateStart,
      dateEnd,
      aiProvider: (aiProvider || 'anthropic') as 'openai' | 'anthropic' | 'gemini',
      aiApiKey
    });

    // Immediate response
    res.json({
      analysisId,
      message: 'AI analysis started',
      statusUrl: `/api/generate/analysis/${analysisId}`
    });

  } catch (error: any) {
    console.error('Error starting AI analysis:', error);
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
router.post('/start-with-analysis', async (req: Request, res: Response) => {
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

    // Generate Run ID
    const runId = `run_${Date.now()}`;

    // Check AI API Key
    const aiApiKey = process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY;
    if (!aiApiKey) {
      return res.status(500).json({
        error: 'AI API key not configured'
      });
    }

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
      aiProvider: analysis.config.aiProvider,
      aiApiKey,
      aiModel: process.env.DATA_AI_MODEL || undefined,
      validationModelTier: (process.env.VALIDATION_MODEL_TIER as 'fast' | 'balanced') || 'fast',
      customValidationModel: process.env.CUSTOM_VALIDATION_MODEL || undefined,
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
    console.error('Error starting generation with analysis:', error);
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
    console.error('Error generating analysis Excel:', error);
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
        console.error('Download error:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Download failed' });
        }
      }
    });

  } catch (error: any) {
    console.error('Error downloading analysis Excel:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/send-data/:runId
 * Send data to ThinkingEngine
 */
router.post('/send-data/:runId', async (req: Request, res: Response) => {
  try {
    const { runId } = req.params;
    const { appId } = req.body;

    // Validate appId
    if (!appId || !appId.trim()) {
      return res.status(400).json({ error: 'appId is required' });
    }

    // Start async data transmission
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

export default router;
