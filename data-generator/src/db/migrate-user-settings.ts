#!/usr/bin/env ts-node

/**
 * Migration: Add user settings and profile image
 * @brief: Adds profile_image column to users table and creates user_settings table
 */

import * as dotenv from 'dotenv';
import { Pool } from 'pg';
import { logger } from '../utils/logger';

// Load environment variables
dotenv.config();

async function runMigration() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    logger.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    logger.info('🚀 Starting user settings migration...\n');

    // Check if profile_image column exists
    const columnCheck = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name='users' AND column_name='profile_image'
    `);

    if (columnCheck.rows.length === 0) {
      logger.info('📋 Adding profile_image column to users table...');
      await pool.query('ALTER TABLE users ADD COLUMN profile_image TEXT');
      logger.info('✅ profile_image column added\n');
    } else {
      logger.info('ℹ️  profile_image column already exists\n');
    }

    // Check if user_settings table exists
    const tableCheck = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name='user_settings'
    `);

    if (tableCheck.rows.length === 0) {
      logger.info('📋 Creating user_settings table...');
      await pool.query(`
        CREATE TABLE user_settings (
          id SERIAL PRIMARY KEY,
          user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,

          -- AI Provider Settings
          anthropic_api_key TEXT,
          openai_api_key TEXT,
          gemini_api_key TEXT,
          excel_ai_provider VARCHAR(20) DEFAULT 'anthropic',
          data_ai_provider VARCHAR(20) DEFAULT 'anthropic',
          data_ai_model VARCHAR(100),
          validation_model_tier VARCHAR(20) DEFAULT 'fast',
          custom_validation_model VARCHAR(100),

          -- ThinkingEngine Settings
          te_app_id VARCHAR(100),
          te_receiver_url VARCHAR(255) DEFAULT 'https://te-receiver-naver.thinkingdata.kr/',

          -- File Retention Settings
          data_retention_days INTEGER DEFAULT 7,
          excel_retention_days INTEGER DEFAULT 30,
          auto_delete_after_send BOOLEAN DEFAULT false,

          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      logger.info('✅ user_settings table created\n');

      // Create index
      logger.info('📋 Creating indexes...');
      await pool.query('CREATE INDEX idx_user_settings_user_id ON user_settings(user_id)');
      logger.info('✅ Indexes created\n');

      // Create trigger
      logger.info('📋 Creating trigger...');
      await pool.query(`
        CREATE TRIGGER update_user_settings_updated_at
        BEFORE UPDATE ON user_settings
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
      `);
      logger.info('✅ Trigger created\n');
    } else {
      logger.info('ℹ️  user_settings table already exists\n');
    }

    logger.info('✅ Migration completed successfully!');

  } catch (error) {
    logger.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration
runMigration();
