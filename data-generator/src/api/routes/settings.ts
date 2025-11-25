import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware';
import { getUserSettings, updateUserSettings } from '../../db/repositories/user-settings-repository';

const router = Router();

/**
 * GET /api/settings
 * Get current user's settings
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const userSettings = await getUserSettings(userId);

    if (!userSettings) {
      return res.status(404).json({ error: 'Settings not found' });
    }

    // Convert to frontend expected format
    const settings = {
      ANTHROPIC_API_KEY: userSettings.anthropicApiKey || '',
      OPENAI_API_KEY: userSettings.openaiApiKey || '',
      GEMINI_API_KEY: userSettings.geminiApiKey || '',
      EXCEL_AI_PROVIDER: userSettings.excelAiProvider,
      DATA_AI_PROVIDER: userSettings.dataAiProvider,
      DATA_AI_MODEL: userSettings.dataAiModel || '',
      VALIDATION_MODEL_TIER: userSettings.validationModelTier,
      CUSTOM_VALIDATION_MODEL: userSettings.customValidationModel || '',
      TE_APP_ID: userSettings.teAppId || '',
      TE_RECEIVER_URL: userSettings.teReceiverUrl,
      DATA_RETENTION_DAYS: userSettings.dataRetentionDays.toString(),
      EXCEL_RETENTION_DAYS: userSettings.excelRetentionDays.toString(),
      AUTO_DELETE_AFTER_SEND: userSettings.autoDeleteAfterSend.toString(),
    };

    res.json(settings);
  } catch (error: any) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/settings
 * Save user settings (database)
 */
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const {
      ANTHROPIC_API_KEY,
      OPENAI_API_KEY,
      GEMINI_API_KEY,
      EXCEL_AI_PROVIDER,
      DATA_AI_PROVIDER,
      DATA_AI_MODEL,
      VALIDATION_MODEL_TIER,
      CUSTOM_VALIDATION_MODEL,
      TE_APP_ID,
      TE_RECEIVER_URL,
      DATA_RETENTION_DAYS,
      EXCEL_RETENTION_DAYS,
      AUTO_DELETE_AFTER_SEND
    } = req.body;

    // Convert to database format
    const settingsData: any = {};

    if (ANTHROPIC_API_KEY !== undefined) settingsData.anthropicApiKey = ANTHROPIC_API_KEY;
    if (OPENAI_API_KEY !== undefined) settingsData.openaiApiKey = OPENAI_API_KEY;
    if (GEMINI_API_KEY !== undefined) settingsData.geminiApiKey = GEMINI_API_KEY;
    if (EXCEL_AI_PROVIDER !== undefined) settingsData.excelAiProvider = EXCEL_AI_PROVIDER;
    if (DATA_AI_PROVIDER !== undefined) settingsData.dataAiProvider = DATA_AI_PROVIDER;
    if (DATA_AI_MODEL !== undefined) settingsData.dataAiModel = DATA_AI_MODEL;
    if (VALIDATION_MODEL_TIER !== undefined) settingsData.validationModelTier = VALIDATION_MODEL_TIER;
    if (CUSTOM_VALIDATION_MODEL !== undefined) settingsData.customValidationModel = CUSTOM_VALIDATION_MODEL;
    if (TE_APP_ID !== undefined) settingsData.teAppId = TE_APP_ID;
    if (TE_RECEIVER_URL !== undefined) settingsData.teReceiverUrl = TE_RECEIVER_URL;
    if (DATA_RETENTION_DAYS !== undefined) settingsData.dataRetentionDays = parseInt(DATA_RETENTION_DAYS, 10);
    if (EXCEL_RETENTION_DAYS !== undefined) settingsData.excelRetentionDays = parseInt(EXCEL_RETENTION_DAYS, 10);
    if (AUTO_DELETE_AFTER_SEND !== undefined) settingsData.autoDeleteAfterSend = AUTO_DELETE_AFTER_SEND === 'true';

    // Save to database
    await updateUserSettings(userId, settingsData);

    res.json({ success: true, message: 'Settings saved successfully' });
  } catch (error: any) {
    console.error('Error saving settings:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
