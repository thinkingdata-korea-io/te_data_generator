#!/usr/bin/env ts-node

/**
 * Database Migration Script
 * @brief: Initialize database schema and default users
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import { logger } from '../utils/logger';

// Load environment variables
dotenv.config();

async function runMigration() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    logger.error('❌ DATABASE_URL environment variable is not set');
    logger.info('ℹ️  Please set DATABASE_URL in your .env file');
    logger.info('ℹ️  Example: DATABASE_URL=postgresql://user:password@localhost:5432/te_platform');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    logger.info('🚀 Starting database migration...\n');

    // Read schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    // Execute schema
    logger.info('📋 Creating tables and indexes...');
    await pool.query(schemaSql);
    logger.info('✅ Schema created successfully\n');

    // Update default user passwords with proper bcrypt hashes
    logger.info('🔐 Setting up default user passwords...');

    const defaultUsers = [
      { username: 'admin', password: 'admin' },
      { username: 'user', password: 'user' },
      { username: 'viewer', password: 'viewer' },
    ];

    for (const user of defaultUsers) {
      const passwordHash = await bcrypt.hash(user.password, 10);
      await pool.query(
        'UPDATE users SET password_hash = $1 WHERE username = $2',
        [passwordHash, user.username]
      );
      logger.info(`  ✓ Updated password for ${user.username}`);
    }

    logger.info('✅ Default users configured\n');

    // Verify migration
    const result = await pool.query('SELECT COUNT(*) FROM users');
    const userCount = result.rows[0].count;
    logger.info(`📊 Database stats:`);
    logger.info(`  - Total users: ${userCount}`);

    const tables = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    logger.info(`  - Tables created: ${tables.rows.length}`);
    tables.rows.forEach(row => logger.info(`    • ${row.table_name}`));

    logger.info('\n✅ Migration completed successfully!');
    logger.info('\n🔑 Default credentials:');
    logger.info('  • admin / admin (Administrator)');
    logger.info('  • user / user (Regular user)');
    logger.info('  • viewer / viewer (Read-only user)');

  } catch (error) {
    logger.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration
runMigration();
