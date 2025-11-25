import { Router, Request, Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';

const router = Router();

/**
 * GET /api/runs/list
 * Get list of generated runs
 */
router.get('/list', (req: Request, res: Response) => {
  try {
    const runsDir = path.resolve(__dirname, '../../../output/runs');

    if (!fs.existsSync(runsDir)) {
      return res.json({ runs: [] });
    }

    const runs = fs.readdirSync(runsDir)
      .filter(f => f.startsWith('run_'))
      .map(runId => {
        const metadataPath = path.join(runsDir, runId, 'metadata.json');
        if (fs.existsSync(metadataPath)) {
          const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
          return {
            runId,
            ...metadata
          };
        }
        return null;
      })
      .filter(r => r !== null)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ runs });
  } catch (error: any) {
    console.error('Error listing runs:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/runs/:runId
 * Get specific run metadata
 */
router.get('/:runId', (req: Request, res: Response) => {
  try {
    const { runId } = req.params;
    const metadataPath = path.resolve(__dirname, `../../../output/runs/${runId}/metadata.json`);

    if (!fs.existsSync(metadataPath)) {
      return res.status(404).json({ error: 'Run not found' });
    }

    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    res.json(metadata);
  } catch (error: any) {
    console.error('Error fetching run metadata:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/runs/:runId
 * Delete data files (data + metadata)
 */
router.delete('/:runId', (req: Request, res: Response) => {
  try {
    const { runId } = req.params;
    const dataPath = path.resolve(__dirname, `../../../output/data/${runId}`);
    const metadataPath = path.resolve(__dirname, `../../../output/runs/${runId}`);

    let deletedData = false;
    let deletedMetadata = false;

    // Delete data directory
    if (fs.existsSync(dataPath)) {
      fs.rmSync(dataPath, { recursive: true, force: true });
      deletedData = true;
      console.log(`🗑️  Data directory deleted: ${runId}`);
    }

    // Delete metadata directory
    if (fs.existsSync(metadataPath)) {
      fs.rmSync(metadataPath, { recursive: true, force: true });
      deletedMetadata = true;
      console.log(`🗑️  Metadata directory deleted: ${runId}`);
    }

    if (!deletedData && !deletedMetadata) {
      return res.status(404).json({ error: 'Run not found' });
    }

    res.json({
      success: true,
      message: 'Run deleted successfully',
      deletedData,
      deletedMetadata
    });
  } catch (error: any) {
    console.error('Error deleting run:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/runs/:runId/retention
 * Extend data file retention period
 */
router.put('/:runId/retention', (req: Request, res: Response) => {
  try {
    const { runId } = req.params;
    const { days } = req.body;
    const dataPath = path.resolve(__dirname, `../../../output/data/${runId}`);
    const metadataPath = path.resolve(__dirname, `../../../output/runs/${runId}`);

    if (!fs.existsSync(dataPath) && !fs.existsSync(metadataPath)) {
      return res.status(404).json({ error: 'Run not found' });
    }

    const now = new Date();

    // Update data directory modification time
    if (fs.existsSync(dataPath)) {
      fs.utimesSync(dataPath, now, now);
    }

    // Update metadata directory modification time
    if (fs.existsSync(metadataPath)) {
      fs.utimesSync(metadataPath, now, now);
    }

    console.log(`⏱️  Run retention extended: ${runId} (+${days} days)`);

    res.json({
      success: true,
      message: `Retention extended by ${days === -1 ? 'unlimited' : days + ' days'}`,
      newModifiedTime: now.toISOString()
    });
  } catch (error: any) {
    console.error('Error extending run retention:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
