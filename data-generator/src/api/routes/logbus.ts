import { Router, Request, Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';

const router = Router();

/**
 * GET /api/logbus/logs
 * Stream LogBus2 logs (transporter.log and daemon.log)
 */
router.get('/logs', (req: Request, res: Response) => {
  const logbusDir = path.resolve(__dirname, '../../../logbus 2');
  const transporterLogPath = path.join(logbusDir, 'log', 'transporter.log');
  const daemonLogPath = path.join(logbusDir, 'log', 'daemon.log');

  // Query parameter to select log type (default: transporter)
  const logType = (req.query.type as string) || 'transporter';
  const logPath = logType === 'daemon' ? daemonLogPath : transporterLogPath;

  // Get last N lines (default: 50)
  const lines = parseInt(req.query.lines as string) || 50;

  try {
    if (!fs.existsSync(logPath)) {
      return res.status(404).json({
        error: 'Log file not found',
        path: logPath
      });
    }

    // Read entire file
    const content = fs.readFileSync(logPath, 'utf-8');
    const allLines = content.split('\n').filter(line => line.trim());

    // Extract last N lines
    const recentLines = allLines.slice(-lines);

    // Try to parse as JSON
    const parsedLogs = recentLines.map((line, index) => {
      try {
        return JSON.parse(line);
      } catch {
        return { raw: line, line: allLines.length - lines + index };
      }
    });

    res.json({
      logType,
      totalLines: allLines.length,
      returnedLines: parsedLogs.length,
      logs: parsedLogs
    });

  } catch (error: any) {
    console.error(`Error reading LogBus2 logs:`, error);
    res.status(500).json({
      error: 'Failed to read log file',
      message: error.message
    });
  }
});

/**
 * GET /api/logbus/status
 * Get LogBus2 status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const logbusPath = path.resolve(__dirname, '../../../logbus 2/logbus');
    const { execSync } = require('child_process');

    try {
      const output = execSync(`"${logbusPath}" progress`, { encoding: 'utf-8' });
      const isRunning = !output.includes('not running');

      res.json({
        isRunning,
        output: output.trim()
      });
    } catch (error: any) {
      res.json({
        isRunning: false,
        output: error.message
      });
    }

  } catch (error: any) {
    console.error('Error checking LogBus2 status:', error);
    res.status(500).json({
      error: 'Failed to check LogBus2 status',
      message: error.message
    });
  }
});

export default router;
