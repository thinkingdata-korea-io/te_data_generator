/**
 * Data Routes
 * Handles data file upload and transmission for send-only mode
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { logger } from '../../utils/logger';
import { requireAuth } from '../middleware';
import { sendUploadedDataAsync } from '../services/data-upload.service';
import { getUserSettings } from '../services/settings.service';

const router = Router();

// Configure multer for .jsonl file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.resolve(__dirname, '../../../uploads/data');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const originalName = file.originalname;
    cb(null, `${timestamp}_${originalName}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (!file.originalname.endsWith('.jsonl')) {
      cb(new Error('.jsonl 파일만 업로드 가능합니다'));
      return;
    }
    cb(null, true);
  }
});

/**
 * POST /api/data/upload
 * Upload .jsonl data files
 */
router.post('/upload', requireAuth, upload.array('files', 10), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ error: '파일을 선택해주세요' });
    }

    // Get file info for each uploaded file
    const fileInfos = files.map(file => {
      const lineCount = fs.readFileSync(file.path, 'utf-8').split('\n').filter(line => line.trim()).length;
      const sizeKB = file.size / 1024;

      return {
        path: file.path,
        filename: file.filename,
        originalName: file.originalname,
        lineCount,
        sizeKB
      };
    });

    logger.info(`✅ Uploaded ${files.length} data files`);

    res.json({
      success: true,
      files: fileInfos
    });
  } catch (error: any) {
    logger.error('Error uploading data files:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/data/send
 * Send uploaded data files to ThinkingEngine
 */
router.post('/send', requireAuth, async (req: Request, res: Response) => {
  try {
    const { filePaths, appId } = req.body;

    if (!filePaths || !Array.isArray(filePaths) || filePaths.length === 0) {
      return res.status(400).json({ error: '전송할 파일을 선택해주세요' });
    }

    // Get user settings
    const userId = (req as any).user.userId;
    const userSettings = await getUserSettings(userId);

    // Get TE App ID from request body or user settings
    const finalAppId = appId?.trim() || userSettings?.teAppId;

    if (!finalAppId) {
      return res.status(400).json({
        error: 'TE App ID not configured',
        message: 'Please configure TE App ID in Settings page',
        redirectTo: '/dashboard/settings',
        action: 'configure_te_app_id'
      });
    }

    // Get TE Receiver URL from user settings
    const receiverUrl = userSettings?.teReceiverUrl || 'https://te-receiver-naver.thinkingdata.kr/';

    logger.info(`📤 Sending uploaded data files with TE App ID: ${finalAppId} to ${receiverUrl}`);

    // Verify all file paths exist
    for (const filePath of filePaths) {
      if (!fs.existsSync(filePath)) {
        return res.status(400).json({ error: `파일을 찾을 수 없습니다: ${filePath}` });
      }

      if (!filePath.endsWith('.jsonl')) {
        return res.status(400).json({ error: `.jsonl 파일만 전송 가능합니다: ${filePath}` });
      }
    }

    // Start async data transmission
    const sessionId = await sendUploadedDataAsync(filePaths, finalAppId, receiverUrl);

    res.json({
      success: true,
      message: 'Data transmission started',
      sessionId,
      statusUrl: `/api/data/send-status/${sessionId}`
    });
  } catch (error: any) {
    logger.error('Error sending data files:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/data/send-status/:sessionId
 * Get upload session transmission status
 */
router.get('/send-status/:sessionId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    // Read session status from file
    const statusFile = path.resolve(__dirname, `../../../uploads/data/.status_${sessionId}.json`);

    if (!fs.existsSync(statusFile)) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const status = JSON.parse(fs.readFileSync(statusFile, 'utf-8'));

    res.json(status);
  } catch (error: any) {
    logger.error('Error getting send status:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
