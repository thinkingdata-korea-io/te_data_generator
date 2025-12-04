-- Migration: Add file_analysis_model column to user_settings
-- Purpose: Support configurable AI models for PDF/file analysis to optimize costs

-- Add file_analysis_model column
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS file_analysis_model VARCHAR(100);

-- Add comment for documentation
COMMENT ON COLUMN user_settings.file_analysis_model IS
'AI model for file analysis (PDF, images, etc.). If empty, defaults to cost-optimized model (e.g., Haiku)';
