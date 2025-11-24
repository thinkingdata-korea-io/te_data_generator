-- ThinkingEngine Platform Database Schema
-- Based on docs/front.md specifications

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100),
  profile_image TEXT, -- Base64 or URL to profile image
  role VARCHAR(20) NOT NULL DEFAULT 'user', -- admin, user, viewer
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login_at TIMESTAMP
);

-- User settings table (per-user configuration)
CREATE TABLE IF NOT EXISTS user_settings (
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
);

-- Sessions table (optional - can use Redis instead)
CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(255) PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Runs table (execution history)
CREATE TABLE IF NOT EXISTS runs (
  id VARCHAR(100) PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  excel_file_path VARCHAR(500),
  scenario TEXT,
  dau INTEGER,
  date_start DATE,
  date_end DATE,
  status VARCHAR(20), -- pending, running, completed, failed, sent
  progress INTEGER DEFAULT 0,
  total_users INTEGER,
  total_events INTEGER,
  files_generated JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  sent_at TIMESTAMP
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  username VARCHAR(50),
  action VARCHAR(50) NOT NULL, -- login, logout, create_run, upload_excel, send_data, etc.
  resource_type VARCHAR(50), -- run, excel, data, user
  resource_id VARCHAR(100),
  details JSONB,
  status VARCHAR(20), -- success, failed
  error_message TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Excel uploads table
CREATE TABLE IF NOT EXISTS excel_uploads (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  original_filename VARCHAR(255),
  stored_filename VARCHAR(255),
  file_size BIGINT,
  file_path VARCHAR(500),
  uploaded_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_runs_user_id ON runs(user_id);
CREATE INDEX IF NOT EXISTS idx_runs_status ON runs(status);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to auto-update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin user (password: admin)
-- Password hash generated with bcrypt for 'admin'
INSERT INTO users (username, email, password_hash, full_name, role)
VALUES (
  'admin',
  'admin@te-platform.com',
  '$2b$10$rKvVPq3j0Y8p0qB0k5WL9eH8v0N5qh5N3L8J3K8L0N5qh5N3L8J3K', -- This will be updated by migration
  'System Administrator',
  'admin'
) ON CONFLICT (username) DO NOTHING;

INSERT INTO users (username, email, password_hash, full_name, role)
VALUES (
  'user',
  'user@te-platform.com',
  '$2b$10$rKvVPq3j0Y8p0qB0k5WL9eH8v0N5qh5N3L8J3K8L0N5qh5N3L8J3K', -- This will be updated by migration
  'Test User',
  'user'
) ON CONFLICT (username) DO NOTHING;

INSERT INTO users (username, email, password_hash, full_name, role)
VALUES (
  'viewer',
  'viewer@te-platform.com',
  '$2b$10$rKvVPq3j0Y8p0qB0k5WL9eH8v0N5qh5N3L8J3K8L0N5qh5N3L8J3K', -- This will be updated by migration
  'Read-only User',
  'viewer'
) ON CONFLICT (username) DO NOTHING;
