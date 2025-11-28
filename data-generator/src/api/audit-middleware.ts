/**
 * Audit Logging Middleware
 * @brief: Automatically log important actions to audit_logs table
 */

import { Request, Response, NextFunction } from 'express';
import { createAuditLog } from '../db/repositories/audit-repository';
import { logger } from '../utils/logger';

/**
 * Extract IP address from request
 */
function getIpAddress(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown'
  );
}

/**
 * Extract user agent from request
 */
function getUserAgent(req: Request): string {
  return req.headers['user-agent'] || 'unknown';
}

/**
 * Audit log middleware for specific actions
 */
export function auditLog(action: string, getResourceInfo?: (req: Request, res: Response) => {
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, any>;
}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original send function
    const originalSend = res.send;

    // Override send to capture response
    res.send = function (body: any): Response {
      // Restore original send
      res.send = originalSend;

      // Log audit entry
      const status = res.statusCode >= 200 && res.statusCode < 300 ? 'success' : 'failed';

      let resourceInfo = {};
      if (getResourceInfo) {
        try {
          resourceInfo = getResourceInfo(req, res);
        } catch (error) {
          logger.error('Error getting resource info for audit:', error);
        }
      }

      // Parse body if it's JSON string
      let errorMessage: string | undefined;
      try {
        const bodyObj = typeof body === 'string' ? JSON.parse(body) : body;
        if (status === 'failed' && bodyObj?.error) {
          errorMessage = bodyObj.error;
        }
      } catch {
        // Ignore parse errors
      }

      createAuditLog({
        userId: req.user?.userId,
        username: req.user?.username,
        action,
        ...resourceInfo,
        status,
        errorMessage,
        ipAddress: getIpAddress(req),
        userAgent: getUserAgent(req),
      }).catch(err => {
        logger.error('Failed to create audit log:', err);
      });

      return originalSend.call(this, body);
    };

    next();
  };
}

/**
 * Pre-configured audit middleware for common actions
 */
export const auditMiddleware = {
  login: auditLog('login'),
  logout: auditLog('logout'),

  createRun: auditLog('create_run', (req) => ({
    resourceType: 'run',
    resourceId: req.body.runId,
    details: {
      scenario: req.body.scenario,
      dau: req.body.dau,
      dateRange: `${req.body.dateStart} ~ ${req.body.dateEnd}`,
    },
  })),

  sendData: auditLog('send_data', (req) => ({
    resourceType: 'run',
    resourceId: req.params.runId,
    details: {
      appId: req.body.appId,
    },
  })),

  uploadExcel: auditLog('upload_excel', (req) => ({
    resourceType: 'excel',
    details: {
      filename: req.file?.originalname,
      size: req.file?.size,
    },
  })),

  generateExcel: auditLog('generate_excel', (req) => ({
    resourceType: 'excel',
    details: {
      industry: req.body.industry,
      scenario: req.body.scenario,
    },
  })),

  createUser: auditLog('create_user', (req, res) => {
    // Extract user ID from response body
    let userId: string | undefined;
    try {
      const body = res.locals.responseBody || {};
      userId = body.user?.id?.toString();
    } catch {}

    return {
      resourceType: 'user',
      resourceId: userId,
      details: {
        username: req.body.username,
        role: req.body.role,
      },
    };
  }),

  updateUser: auditLog('update_user', (req) => ({
    resourceType: 'user',
    resourceId: req.params.id,
    details: {
      updates: Object.keys(req.body),
    },
  })),

  deleteUser: auditLog('delete_user', (req) => ({
    resourceType: 'user',
    resourceId: req.params.id,
  })),

  viewAuditLogs: auditLog('view_audit_logs'),
};
