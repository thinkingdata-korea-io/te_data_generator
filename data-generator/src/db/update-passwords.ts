#!/usr/bin/env ts-node

/**
 * Update default user passwords
 */

import * as dotenv from 'dotenv';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';

dotenv.config();

async function updatePasswords() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    console.log('🔐 Updating default user passwords...\n');

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
      console.log(`  ✓ Updated password for ${user.username}`);
    }

    console.log('\n✅ Password update completed successfully!');
    console.log('\n🔑 Default credentials:');
    console.log('  • admin / admin (Administrator)');
    console.log('  • user / user (Regular user)');
    console.log('  • viewer / viewer (Read-only user)');

  } catch (error) {
    console.error('\n❌ Password update failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

updatePasswords();
