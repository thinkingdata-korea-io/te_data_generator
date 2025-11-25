#!/usr/bin/env node

/**
 * Express API Server
 * Connects frontend with data generator
 *
 * REFACTORED: Routes extracted into separate modules
 * - See /routes for API endpoints
 * - See /services for business logic
 */

import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { authenticateUser, findUserById } from './auth';
import { requireAuth } from './middleware';
import { auditMiddleware } from './audit-middleware';
import { initializeDatabase, testConnection } from '../db/connection';
import { cleanupOldFiles } from './services/cleanup.service';

// Import routers
import filesRouter from './routes/files';
import excelRouter from './routes/excel';
import generateRouter from './routes/generate';
import runsRouter from './routes/runs';
import settingsRouter from './routes/settings';
import usersRouter from './routes/users';
import auditRouter from './routes/audit';
import logbusRouter from './routes/logbus';

// Load environment variables
dotenv.config();

// Initialize database connection
initializeDatabase();

const app = express();
const PORT = process.env.API_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Register routers
app.use('/api', filesRouter);
app.use('/api', excelRouter);
app.use('/api/generate', generateRouter);
app.use('/api/runs', runsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/users', usersRouter);
app.use('/api/audit-logs', auditRouter);
app.use('/api/logbus', logbusRouter);

/**
 * Authentication Endpoints
 */

/**
 * POST /api/auth/login
 * User authentication
 */
app.post('/api/auth/login', auditMiddleware.login, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const result = await authenticateUser(username, password);

    if (!result) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const { user, token } = result;

    // Return user without password hash
    const { passwordHash, ...userWithoutPassword } = user;

    res.json({
      user: userWithoutPassword,
      token,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await findUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { passwordHash, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/auth/logout
 * Logout (client-side token deletion)
 */
app.post('/api/auth/logout', requireAuth, auditMiddleware.logout, (req, res) => {
  // With JWT, logout is handled client-side by removing the token
  res.json({ message: 'Logged out successfully' });
});

/**
 * Server startup
 */
const server = app.listen(PORT, async () => {
  console.log(`🚀 API Server running on http://localhost:${PORT}`);
  console.log(`📊 Excel files: http://localhost:${PORT}/api/excel/list`);
  console.log(`🎯 Generate: http://localhost:${PORT}/api/generate/start`);

  // Test database connection
  console.log('\n🔌 Testing database connection...');
  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.log('⚠️  Running in MOCK mode (no database)');
    console.log('ℹ️  Set DATABASE_URL to enable PostgreSQL features');
  }

  // Initial cleanup
  console.log('\n🧹 Running initial cleanup...');
  cleanupOldFiles();

  // Schedule cleanup every 24 hours
  setInterval(() => {
    console.log('\n🧹 Running scheduled cleanup...');
    cleanupOldFiles();
  }, 24 * 60 * 60 * 1000); // 24 hours
});

// Server timeout settings (10 minutes)
server.timeout = 600000; // 10 minutes
server.keepAliveTimeout = 610000; // 10 minutes + 10 seconds
