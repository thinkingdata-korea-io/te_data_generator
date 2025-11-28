/**
 * Audit Log Repository
 * @brief: Database operations for audit_logs table
 */

import { query, isDatabaseConfigured } from '../connection';
import { logger } from '../../utils/logger';

export interface AuditLog {
  id: number;
  userId: number | null;
  username: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  details: Record<string, any> | null;
  status: string;
  errorMessage: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface CreateAuditLogData {
  userId?: number;
  username?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, any>;
  status: 'success' | 'failed';
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLogFilters {
  userId?: number;
  username?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Create audit log entry
 */
export async function createAuditLog(data: CreateAuditLogData): Promise<void> {
  if (!isDatabaseConfigured()) {
    // Log to console instead
    logger.info('[AUDIT]', JSON.stringify(data));
    return;
  }

  try {
    await query(
      `INSERT INTO audit_logs
       (user_id, username, action, resource_type, resource_id, details, status, error_message, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        data.userId || null,
        data.username || null,
        data.action,
        data.resourceType || null,
        data.resourceId || null,
        data.details ? JSON.stringify(data.details) : null,
        data.status,
        data.errorMessage || null,
        data.ipAddress || null,
        data.userAgent || null,
      ]
    );
  } catch (error) {
    logger.error('Error creating audit log:', error);
    // Don't throw - audit logging failures shouldn't break the app
  }
}

/**
 * Get audit logs with filtering and pagination
 */
export async function getAuditLogs(filters: AuditLogFilters = {}): Promise<{
  logs: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> {
  if (!isDatabaseConfigured()) {
    return {
      logs: [],
      pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
    };
  }

  try {
    const { userId, username, action, startDate, endDate, page = 1, limit = 50, sortBy = 'created_at', sortOrder = 'desc' } = filters;

    // Build WHERE clause
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (userId) {
      conditions.push(`user_id = $${paramCount++}`);
      values.push(userId);
    }

    if (username) {
      conditions.push(`username ILIKE $${paramCount++}`);
      values.push(`%${username}%`);
    }

    if (action) {
      conditions.push(`action = $${paramCount++}`);
      values.push(action);
    }

    if (startDate) {
      conditions.push(`created_at >= $${paramCount++}`);
      values.push(startDate);
    }

    if (endDate) {
      conditions.push(`created_at <= $${paramCount++}`);
      values.push(endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Validate and build ORDER BY clause
    const allowedSortFields = ['created_at', 'username', 'action', 'status'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
    const orderDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';
    const orderClause = `ORDER BY ${sortField} ${orderDirection}`;

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as count FROM audit_logs ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count);

    // Get paginated logs
    const offset = (page - 1) * limit;
    values.push(limit, offset);

    const logsResult = await query<AuditLog>(
      `SELECT
         id, user_id as "userId", username, action,
         resource_type as "resourceType", resource_id as "resourceId",
         details, status, error_message as "errorMessage",
         ip_address as "ipAddress", user_agent as "userAgent",
         created_at as "createdAt"
       FROM audit_logs
       ${whereClause}
       ${orderClause}
       LIMIT $${paramCount++} OFFSET $${paramCount++}`,
      values
    );

    return {
      logs: logsResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    logger.error('Error getting audit logs:', error);
    throw error;
  }
}
