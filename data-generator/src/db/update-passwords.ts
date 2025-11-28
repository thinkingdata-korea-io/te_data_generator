#!/usr/bin/env ts-node

/**
 * Update default user passwords
 */

import * as dotenv from 'dotenv';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import { logger } from '../utils/logger';

dotenv.config();

async function updatePasswords() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    logger.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    logger.info('🔐 Updating default user passwords...\n');

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

    logger.info('\n✅ Password update completed successfully!');
    logger.info('\n🔑 Default credentials:');
    logger.info('  • admin / admin (Administrator)');
    logger.info('  • user / user (Regular user)');
    logger.info('  • viewer / viewer (Read-only user)');

  } catch (error) {
    logger.error('\n❌ Password update failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

updatePasswords();
