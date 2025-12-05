// @file: data-generator/src/api/routes/files.ts
// @brief: File upload and AI analysis endpoints

import express, { Request, Response } from 'express';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { FileAnalyzer } from '../services/file-analyzer';
import { logger } from '../../utils/logger';
import { getUserSettings } from '../../db/repositories/user-settings-repository';
import { requireAuth } from '../middleware';

const router = express.Router();

// 업로드 디렉토리 설정 - data-generator/uploads/context-files 사용으로 통일
const uploadDir = path.resolve(__dirname, '../../../uploads/context-files');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer 스토리지 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const safeName = originalName.replace(/[^a-zA-Z0-9가-힣._-]/g, '_');
    cb(null, `${timestamp}_${randomString}_${safeName}`);
  }
});

// 파일 필터: 허용된 파일 타입만 업로드 가능
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedExtensions = [
    '.pdf', '.txt', '.md', '.docx', '.xlsx', '.xls',
    '.png', '.jpg', '.jpeg', '.gif', '.webp',
    '.json', '.js', '.ts', '.tsx', '.jsx', '.py', '.java', '.go', '.rs', '.swift', '.kt'
  ];

  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`지원하지 않는 파일 형식입니다. 허용된 형식: ${allowedExtensions.join(', ')}`));
  }
};

// Multer 설정
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 5, // 최대 5개 파일
  }
});

/**
 * POST /api/files/analyze-multi
 * 여러 파일을 업로드하고 AI로 분석
 */
router.post('/files/analyze-multi', requireAuth, upload.array('files', 5), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    const language = req.body.language || 'ko'; // Default to Korean
    const userId = (req as any).user?.userId;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: '업로드된 파일이 없습니다.' });
    }

    logger.info(`📁 파일 분석 시작: ${files.length}개 파일 업로드됨 (language: ${language})`);

    // 총 파일 크기 체크 (50MB)
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > 50 * 1024 * 1024) {
      // 파일 삭제
      files.forEach(file => fs.unlinkSync(file.path));
      return res.status(400).json({ error: '전체 파일 크기가 50MB를 초과할 수 없습니다.' });
    }

    // 파일 정보 수집
    const fileInfos = files.map(file => ({
      originalName: Buffer.from(file.originalname, 'latin1').toString('utf8'),
      fileName: file.filename,
      path: file.path,
      size: file.size,
      type: path.extname(file.originalname).toLowerCase(),
    }));

    // 🔥 FIX: 업로드 시에는 분석하지 않음 (API 토큰 절약)
    // 파일 분석은 "생성 시작" 클릭 시 수행됨
    logger.info(`✅ ${files.length}개 파일 업로드 완료 (분석은 생성 시작 시 수행)`);

    res.json({
      success: true,
      files: fileInfos,
      analysis: null, // 업로드 시에는 분석 결과 없음
      message: `${files.length}개 파일이 성공적으로 업로드되었습니다.`,
    });

  } catch (error: any) {
    logger.error('파일 업로드 실패:', error);

    // 업로드된 파일들 삭제
    if (req.files) {
      const files = req.files as Express.Multer.File[];
      files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }

    res.status(500).json({ error: error.message || '파일 업로드 중 오류가 발생했습니다.' });
  }
});

/**
 * GET /api/files/list
 * 업로드된 컨텍스트 파일 목록 조회
 */
router.get('/files/list', requireAuth, (req: Request, res: Response) => {
  try {
    if (!fs.existsSync(uploadDir)) {
      return res.json({ files: [] });
    }

    const files = fs.readdirSync(uploadDir);
    const fileInfos = files.map(filename => {
      const filePath = path.join(uploadDir, filename);
      const stats = fs.statSync(filePath);

      // 타임스탬프와 랜덤 문자열 제거하여 원본 파일명 추출
      // 형식: 1764801955366_y3oxpa_원본파일명.pdf
      const parts = filename.split('_');
      const originalName = parts.length >= 3 ? parts.slice(2).join('_') : filename;

      return {
        fileName: filename,
        originalName: originalName,
        path: filePath,
        size: stats.size,
        type: path.extname(filename).toLowerCase(),
        uploadedAt: stats.birthtime.toISOString(),
        modifiedAt: stats.mtime.toISOString()
      };
    });

    // 최신 파일 먼저 정렬
    fileInfos.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

    res.json({ files: fileInfos });
  } catch (error: any) {
    logger.error('파일 목록 조회 실패:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/files/:filename
 * 업로드된 파일 삭제
 */
router.delete('/files/:filename', requireAuth, (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const safeFilename = path.basename(filename);
    const filePath = path.join(uploadDir, safeFilename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '파일을 찾을 수 없습니다.' });
    }

    fs.unlinkSync(filePath);

    res.json({ success: true, message: '파일이 삭제되었습니다.' });
  } catch (error: any) {
    logger.error('파일 삭제 실패:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/files/cleanup
 * 오래된 파일 정리 (24시간 이상 된 파일)
 */
router.get('/files/cleanup', (req: Request, res: Response) => {
  try {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24시간

    if (!fs.existsSync(uploadDir)) {
      return res.json({ success: true, deletedCount: 0 });
    }

    const files = fs.readdirSync(uploadDir);
    let deletedCount = 0;

    for (const file of files) {
      const filePath = path.join(uploadDir, file);
      const stats = fs.statSync(filePath);

      if (now - stats.mtimeMs > maxAge) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    }

    logger.info(`🧹 오래된 파일 ${deletedCount}개 삭제됨`);

    res.json({ success: true, deletedCount });
  } catch (error: any) {
    logger.error('파일 정리 실패:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
