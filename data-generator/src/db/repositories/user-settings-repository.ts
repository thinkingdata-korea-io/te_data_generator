/**
 * User Settings Repository
 * @brief: Database operations for user_settings table
 */

import { query, isDatabaseConfigured } from '../connection';

export interface UserSettings {
  id: number;
  userId: number;

  // AI Provider Settings
  anthropicApiKey?: string;
  openaiApiKey?: string;
  geminiApiKey?: string;
  excelAiProvider: string;
  dataAiProvider: string;
  dataAiModel?: string;
  validationModelTier: string;
  customValidationModel?: string;

  // ThinkingEngine Settings
  teAppId?: string;
  teReceiverUrl: string;

  // File Retention Settings
  dataRetentionDays: number;
  excelRetentionDays: number;
  autoDeleteAfterSend: boolean;

  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserSettingsData {
  // AI Provider Settings
  anthropicApiKey?: string;
  openaiApiKey?: string;
  geminiApiKey?: string;
  excelAiProvider?: string;
  dataAiProvider?: string;
  dataAiModel?: string;
  validationModelTier?: string;
  customValidationModel?: string;

  // ThinkingEngine Settings
  teAppId?: string;
  teReceiverUrl?: string;

  // File Retention Settings
  dataRetentionDays?: number;
  excelRetentionDays?: number;
  autoDeleteAfterSend?: boolean;
}

/**
 * Get user settings by user ID
 * Creates default settings if none exist
 */
export async function getUserSettings(userId: number): Promise<UserSettings | null> {
  if (!isDatabaseConfigured()) {
    return null;
  }

  try {
    const result = await query<UserSettings>(
      `SELECT
        id,
        user_id as "userId",
        anthropic_api_key as "anthropicApiKey",
        openai_api_key as "openaiApiKey",
        gemini_api_key as "geminiApiKey",
        excel_ai_provider as "excelAiProvider",
        data_ai_provider as "dataAiProvider",
        data_ai_model as "dataAiModel",
        validation_model_tier as "validationModelTier",
        custom_validation_model as "customValidationModel",
        te_app_id as "teAppId",
        te_receiver_url as "teReceiverUrl",
        data_retention_days as "dataRetentionDays",
        excel_retention_days as "excelRetentionDays",
        auto_delete_after_send as "autoDeleteAfterSend",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM user_settings
      WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length > 0) {
      return result.rows[0];
    }

    // Create default settings if none exist
    return await createDefaultSettings(userId);
  } catch (error) {
    console.error('Error getting user settings:', error);
    throw error;
  }
}

/**
 * Create default settings for a user
 */
async function createDefaultSettings(userId: number): Promise<UserSettings> {
  try {
    const result = await query<UserSettings>(
      `INSERT INTO user_settings (
        user_id,
        excel_ai_provider,
        data_ai_provider,
        validation_model_tier,
        te_receiver_url,
        data_retention_days,
        excel_retention_days,
        auto_delete_after_send
      )
      VALUES ($1, 'anthropic', 'anthropic', 'fast', 'https://te-receiver-naver.thinkingdata.kr/', 7, 30, false)
      RETURNING
        id,
        user_id as "userId",
        anthropic_api_key as "anthropicApiKey",
        openai_api_key as "openaiApiKey",
        gemini_api_key as "geminiApiKey",
        excel_ai_provider as "excelAiProvider",
        data_ai_provider as "dataAiProvider",
        data_ai_model as "dataAiModel",
        validation_model_tier as "validationModelTier",
        custom_validation_model as "customValidationModel",
        te_app_id as "teAppId",
        te_receiver_url as "teReceiverUrl",
        data_retention_days as "dataRetentionDays",
        excel_retention_days as "excelRetentionDays",
        auto_delete_after_send as "autoDeleteAfterSend",
        created_at as "createdAt",
        updated_at as "updatedAt"`,
      [userId]
    );

    return result.rows[0];
  } catch (error) {
    console.error('Error creating default settings:', error);
    throw error;
  }
}

/**
 * Update user settings (upsert)
 */
export async function updateUserSettings(
  userId: number,
  data: UpdateUserSettingsData
): Promise<UserSettings> {
  if (!isDatabaseConfigured()) {
    throw new Error('Database not configured');
  }

  try {
    const updates: string[] = [];
    const values: any[] = [userId];
    let paramCount = 2;

    if (data.anthropicApiKey !== undefined) {
      updates.push(`anthropic_api_key = $${paramCount++}`);
      values.push(data.anthropicApiKey);
    }
    if (data.openaiApiKey !== undefined) {
      updates.push(`openai_api_key = $${paramCount++}`);
      values.push(data.openaiApiKey);
    }
    if (data.geminiApiKey !== undefined) {
      updates.push(`gemini_api_key = $${paramCount++}`);
      values.push(data.geminiApiKey);
    }
    if (data.excelAiProvider !== undefined) {
      updates.push(`excel_ai_provider = $${paramCount++}`);
      values.push(data.excelAiProvider);
    }
    if (data.dataAiProvider !== undefined) {
      updates.push(`data_ai_provider = $${paramCount++}`);
      values.push(data.dataAiProvider);
    }
    if (data.dataAiModel !== undefined) {
      updates.push(`data_ai_model = $${paramCount++}`);
      values.push(data.dataAiModel);
    }
    if (data.validationModelTier !== undefined) {
      updates.push(`validation_model_tier = $${paramCount++}`);
      values.push(data.validationModelTier);
    }
    if (data.customValidationModel !== undefined) {
      updates.push(`custom_validation_model = $${paramCount++}`);
      values.push(data.customValidationModel);
    }
    if (data.teAppId !== undefined) {
      updates.push(`te_app_id = $${paramCount++}`);
      values.push(data.teAppId);
    }
    if (data.teReceiverUrl !== undefined) {
      updates.push(`te_receiver_url = $${paramCount++}`);
      values.push(data.teReceiverUrl);
    }
    if (data.dataRetentionDays !== undefined) {
      updates.push(`data_retention_days = $${paramCount++}`);
      values.push(data.dataRetentionDays);
    }
    if (data.excelRetentionDays !== undefined) {
      updates.push(`excel_retention_days = $${paramCount++}`);
      values.push(data.excelRetentionDays);
    }
    if (data.autoDeleteAfterSend !== undefined) {
      updates.push(`auto_delete_after_send = $${paramCount++}`);
      values.push(data.autoDeleteAfterSend);
    }

    if (updates.length === 0) {
      // No updates, just return current settings
      return await getUserSettings(userId) as UserSettings;
    }

    const sql = `
      UPDATE user_settings
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE user_id = $1
      RETURNING
        id,
        user_id as "userId",
        anthropic_api_key as "anthropicApiKey",
        openai_api_key as "openaiApiKey",
        gemini_api_key as "geminiApiKey",
        excel_ai_provider as "excelAiProvider",
        data_ai_provider as "dataAiProvider",
        data_ai_model as "dataAiModel",
        validation_model_tier as "validationModelTier",
        custom_validation_model as "customValidationModel",
        te_app_id as "teAppId",
        te_receiver_url as "teReceiverUrl",
        data_retention_days as "dataRetentionDays",
        excel_retention_days as "excelRetentionDays",
        auto_delete_after_send as "autoDeleteAfterSend",
        created_at as "createdAt",
        updated_at as "updatedAt"`;

    const result = await query<UserSettings>(sql, values);

    if (result.rows.length === 0) {
      // Settings don't exist, create them first then update
      await createDefaultSettings(userId);
      return await updateUserSettings(userId, data);
    }

    return result.rows[0];
  } catch (error) {
    console.error('Error updating user settings:', error);
    throw error;
  }
}

/**
 * Delete user settings (cascades automatically on user deletion)
 */
export async function deleteUserSettings(userId: number): Promise<boolean> {
  if (!isDatabaseConfigured()) {
    throw new Error('Database not configured');
  }

  try {
    const result = await query('DELETE FROM user_settings WHERE user_id = $1', [userId]);
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error('Error deleting user settings:', error);
    throw error;
  }
}
