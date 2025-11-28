import { Router, Request, Response } from 'express';
import { requireAdmin } from '../middleware';
import { auditMiddleware } from '../audit-middleware';
import { getAuditLogs } from '../../db/repositories/audit-repository';
import { logger } from '../../utils/logger';

const router = Router();

/**
 * GET /api/audit-logs
 * Get audit logs (Admin only)
 */
router.get('/', requireAdmin, auditMiddleware.viewAuditLogs, async (req: Request, res: Response) => {
  try {
    const { user_id, username, action, start_date, end_date, page = 1, limit = 50, sort_by, sort_order } = req.query;

    const result = await getAuditLogs({
      userId: user_id ? parseInt(user_id as string) : undefined,
      username: username as string | undefined,
      action: action as string | undefined,
      startDate: start_date as string | undefined,
      endDate: end_date as string | undefined,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 50,
      sortBy: sort_by as string | undefined,
      sortOrder: sort_order as 'asc' | 'desc' | undefined,
    });

    res.json(result);
  } catch (error: any) {
    logger.error('Get audit logs error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/audit-logs/mock
 * Fallback mock audit logs (for development when DB not configured)
 */
router.get('/mock', requireAdmin, (req: Request, res: Response) => {
  try {
    const { user_id, action, page = 1, limit = 50 } = req.query;

    // Mock audit logs for development
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
    logger.error('Get audit logs error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
