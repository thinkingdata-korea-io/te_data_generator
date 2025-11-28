/**
 * PostgreSQL Database Connection
 * @brief: Database connection pool and query utilities
 */

import { Pool, QueryResult } from 'pg';
import { logger } from '../utils/logger';

// Database connection pool
let pool: Pool | null = null;

/**
 * Initialize database connection pool
 */
export function initializeDatabase(): Pool {
  if (pool) {
    return pool;
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    logger.warn('⚠️  DATABASE_URL not set. Using mock data instead.');
    // Return a dummy pool that won't be used
    pool = new Pool({ max: 0 });
    return pool;
  }

  pool = new Pool({
    connectionString: databaseUrl,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  pool.on('error', (err) => {
    logger.error('Unexpected database error:', err);
  });

  logger.info('✅ PostgreSQL connection pool initialized');
  return pool;
}

/**
 * Get database pool instance
 */
export function getPool(): Pool | null {
  return pool;
}

/**
 * Execute a query
 */
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const client = pool || initializeDatabase();

  if (!process.env.DATABASE_URL) {
    throw new Error('Database not configured');
  }

  try {
    const start = Date.now();
    const result = await client.query<T>(text, params);
    const duration = Date.now() - start;

    if (duration > 1000) {
      logger.warn(`⚠️  Slow query (${duration}ms): ${text.substring(0, 100)}`);
    }

    return result;
  } catch (error) {
    logger.error('Database query error:', error);
    throw error;
  }
}

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    if (!process.env.DATABASE_URL) {
      logger.info('ℹ️  DATABASE_URL not configured - using mock data');
      return false;
    }

    const result = await query('SELECT NOW()');
    logger.info('✅ Database connection test successful:', result.rows[0]);
    return true;
  } catch (error) {
    logger.error('❌ Database connection test failed:', error);
    return false;
  }
}

/**
 * Close database connection
 */
export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('✅ Database connection closed');
  }
}

/**
 * Check if database is configured
 */
export function isDatabaseConfigured(): boolean {
  return !!process.env.DATABASE_URL;
}
