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

// Load environment variables
dotenv.config();

async function runMigration() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    console.log('ℹ️  Please set DATABASE_URL in your .env file');
    console.log('ℹ️  Example: DATABASE_URL=postgresql://user:password@localhost:5432/te_platform');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    console.log('🚀 Starting database migration...\n');

    // Read schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    // Execute schema
    console.log('📋 Creating tables and indexes...');
    await pool.query(schemaSql);
    console.log('✅ Schema created successfully\n');

    // Update default user passwords with proper bcrypt hashes
    console.log('🔐 Setting up default user passwords...');

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

    console.log('✅ Default users configured\n');

    // Verify migration
    const result = await pool.query('SELECT COUNT(*) FROM users');
    const userCount = result.rows[0].count;
    console.log(`📊 Database stats:`);
    console.log(`  - Total users: ${userCount}`);

    const tables = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    console.log(`  - Tables created: ${tables.rows.length}`);
    tables.rows.forEach(row => console.log(`    • ${row.table_name}`));

    console.log('\n✅ Migration completed successfully!');
    console.log('\n🔑 Default credentials:');
    console.log('  • admin / admin (Administrator)');
    console.log('  • user / user (Regular user)');
    console.log('  • viewer / viewer (Read-only user)');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration
runMigration();
