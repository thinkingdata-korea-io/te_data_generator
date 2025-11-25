'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion } from 'framer-motion';
import { TypingAnimation } from '@/components/effects/TypingAnimation';
import AIConfigSection from '@/components/settings/AIConfigSection';

/**
 * Settings Page
 * @brief: Terminal-style settings interface for platform configuration
 */

interface Settings {
  // AI Provider Settings
  ANTHROPIC_API_KEY: string;
  OPENAI_API_KEY: string;
  GEMINI_API_KEY: string;
  EXCEL_AI_PROVIDER: 'anthropic' | 'openai' | 'gemini';
  DATA_AI_PROVIDER: 'anthropic' | 'openai' | 'gemini';
  DATA_AI_MODEL: string;  // Custom data generation model (optional)
  VALIDATION_MODEL_TIER: 'fast' | 'balanced';  // Validation model tier
  CUSTOM_VALIDATION_MODEL: string;  // Custom validation model (optional)

  // ThinkingEngine Settings
  TE_APP_ID: string;
  TE_RECEIVER_URL: string;

  // File Retention Settings
  DATA_RETENTION_DAYS: string;
  EXCEL_RETENTION_DAYS: string;
  AUTO_DELETE_AFTER_SEND: string;
}

interface UserProfile {
  fullName: string;
  email: string;
  profileImage: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'profile' | 'ai' | 'platform' | 'retention'>('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const [settings, setSettings] = useState<Settings>({
    ANTHROPIC_API_KEY: '',
    OPENAI_API_KEY: '',
    GEMINI_API_KEY: '',
    EXCEL_AI_PROVIDER: 'anthropic',
    DATA_AI_PROVIDER: 'anthropic',
    DATA_AI_MODEL: '',
    VALIDATION_MODEL_TIER: 'fast',
    CUSTOM_VALIDATION_MODEL: '',
    TE_APP_ID: '',
    TE_RECEIVER_URL: 'https://te-receiver-naver.thinkingdata.kr/',
    DATA_RETENTION_DAYS: '7',
    EXCEL_RETENTION_DAYS: '30',
    AUTO_DELETE_AFTER_SEND: 'false',
  });

  const [profile, setProfile] = useState<UserProfile>({
    fullName: user?.fullName || '',
    email: user?.email || '',
    profileImage: user?.profileImage || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) return;

        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const response = await fetch(`${API_URL}/api/settings`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) throw new Error('Failed to load settings');

        const data = await response.json();
        setSettings(data);
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };

    loadSettings();
  }, []);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setSaveMessage('');

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) throw new Error('Not authenticated');

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_URL}/api/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setSaveMessage(`[OK] ${t.settings.settingsSaved}`);
      } else {
        throw new Error('Failed to save');
      }
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      setSaveMessage(`[ERROR] ${t.settings.settingsFailed}`);
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    if (profile.newPassword && profile.newPassword !== profile.confirmPassword) {
      setSaveMessage(`[ERROR] ${t.settings.passwordsNotMatch}`);
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }

    setIsSaving(true);
    setSaveMessage('');

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) throw new Error('Not authenticated');

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

      // Update profile (email, fullName, profileImage)
      const response = await fetch(`${API_URL}/api/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: profile.email,
          fullName: profile.fullName,
          profileImage: profile.profileImage,
        }),
      });

      if (!response.ok) throw new Error('Failed to update profile');

      const { user: updatedUser } = await response.json();

      // Update user in AuthContext by dispatching a custom event
      window.dispatchEvent(new CustomEvent('userUpdated', { detail: updatedUser }));

      setSaveMessage(`[OK] ${t.settings.profileUpdated}`);
      setTimeout(() => setSaveMessage(''), 3000);

      // Clear password fields
      setProfile(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
    } catch (error) {
      console.error('Profile update error:', error);
      setSaveMessage(`[ERROR] ${t.settings.profileFailed}`);
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'profile' as const, label: t.settings.userProfile, icon: '👤' },
    { id: 'ai' as const, label: t.settings.aiProviders, icon: '🤖' },
    { id: 'platform' as const, label: t.settings.platformConfig, icon: '⚙' },
    { id: 'retention' as const, label: t.settings.dataRetention, icon: '🗄' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[var(--bg-secondary)] border-2 border-[var(--border-bright)] rounded-lg p-6 terminal-glow"
      >
        <h1 className="text-2xl font-bold text-terminal-cyan mb-2">
          <TypingAnimation text={`⚙ ${t.settings.title}`} speed={30} showCursor={false} />
        </h1>
        <p className="text-[var(--text-secondary)] text-sm font-mono">
          {t.settings.configDescription}
        </p>
      </motion.div>

      {/* Tabs */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg overflow-hidden">
        <div className="flex border-b border-[var(--border)] bg-[var(--bg-tertiary)]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-6 py-3 text-sm font-semibold transition-all relative ${
                activeTab === tab.id
                  ? 'text-terminal-cyan bg-[var(--bg-secondary)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent-cyan)]"
                />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="mb-4">
                <div className="text-terminal-green font-mono text-sm mb-4">
                  &gt; user.profile.edit
                </div>
                <p className="text-[var(--text-secondary)] text-sm">
                  {t.settings.profileDescription}
                </p>
              </div>

              {/* Profile Picture Section */}
              <div className="mb-6 p-6 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg">
                <label className="block text-sm font-semibold mb-4 text-[var(--text-primary)]">
                  <span className="text-terminal-cyan">$</span> {t.settings.profilePicture}
                </label>
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 rounded-full bg-[var(--bg-primary)] border-2 border-[var(--accent-cyan)] flex items-center justify-center text-terminal-cyan font-bold text-2xl terminal-glow overflow-hidden">
                    {profile.profileImage ? (
                      <img
                        src={profile.profileImage}
                        alt={user?.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      user?.username?.[0]?.toUpperCase() || 'U'
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex gap-3">
                      <label className="px-4 py-2 bg-[var(--bg-primary)] border border-[var(--accent-cyan)] rounded text-terminal-cyan font-semibold hover:bg-[var(--bg-tertiary)] transition-all cursor-pointer text-sm">
                        {profile.profileImage ? t.settings.changeProfilePicture : t.settings.uploadProfilePicture}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                setProfile({ ...profile, profileImage: event.target?.result as string });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      {profile.profileImage && (
                        <button
                          onClick={() => setProfile({ ...profile, profileImage: '' })}
                          className="px-4 py-2 border border-[var(--error-red)] rounded text-[var(--error-red)] font-semibold hover:bg-[var(--error-red)]/10 transition-all text-sm"
                        >
                          {t.settings.removeProfilePicture}
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-dimmed)] mt-2">
                      JPG, PNG, GIF (Max 2MB)
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="username-input" className="block text-sm font-semibold mb-2 text-[var(--text-primary)]">
                    <span className="text-terminal-cyan">$</span> {t.auth.username}
                  </label>
                  <input
                    id="username-input"
                    type="text"
                    value={user?.username || ''}
                    disabled
                    className="w-full p-3 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-dimmed)] font-mono text-sm"
                    aria-label={t.auth.username}
                  />
                  <p className="text-xs text-[var(--text-dimmed)] mt-1">
                    {t.settings.usernameCannotChange}
                  </p>
                </div>

                <div>
                  <label htmlFor="fullname-input" className="block text-sm font-semibold mb-2 text-[var(--text-primary)]">
                    <span className="text-terminal-cyan">$</span> {t.settings.displayName}
                  </label>
                  <input
                    id="fullname-input"
                    type="text"
                    value={profile.fullName}
                    onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                    className="w-full p-3 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] font-mono text-sm focus:border-[var(--accent-cyan)] focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="email-input" className="block text-sm font-semibold mb-2 text-[var(--text-primary)]">
                    <span className="text-terminal-cyan">$</span> {t.settings.email}
                  </label>
                  <input
                    id="email-input"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="w-full p-3 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] font-mono text-sm focus:border-[var(--accent-cyan)] focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="role-input" className="block text-sm font-semibold mb-2 text-[var(--text-primary)]">
                    <span className="text-terminal-cyan">$</span> {t.settings.role}
                  </label>
                  <input
                    id="role-input"
                    type="text"
                    value={user?.role?.toUpperCase() || ''}
                    disabled
                    className="w-full p-3 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] font-mono text-sm"
                    aria-label={t.settings.role}
                  />
                </div>
              </div>

              {/* Password Change Section */}
              <div className="pt-6 border-t border-[var(--border)]">
                <h3 className="text-lg font-bold text-terminal-magenta mb-4">
                  {t.settings.changePassword}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-[var(--text-primary)]">
                      {t.settings.currentPassword}
                    </label>
                    <input
                      type="password"
                      value={profile.currentPassword}
                      onChange={(e) => setProfile({ ...profile, currentPassword: e.target.value })}
                      className="w-full p-3 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] font-mono text-sm focus:border-[var(--accent-cyan)] focus:outline-none transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-[var(--text-primary)]">
                      {t.settings.newPassword}
                    </label>
                    <input
                      type="password"
                      value={profile.newPassword}
                      onChange={(e) => setProfile({ ...profile, newPassword: e.target.value })}
                      className="w-full p-3 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] font-mono text-sm focus:border-[var(--accent-cyan)] focus:outline-none transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-[var(--text-primary)]">
                      {t.settings.confirmPassword}
                    </label>
                    <input
                      type="password"
                      value={profile.confirmPassword}
                      onChange={(e) => setProfile({ ...profile, confirmPassword: e.target.value })}
                      className="w-full p-3 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)} font-mono text-sm focus:border-[var(--accent-cyan)] focus:outline-none transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="px-6 py-3 bg-[var(--bg-tertiary)] border-2 border-[var(--accent-cyan)] rounded text-terminal-cyan font-semibold hover:bg-[var(--bg-primary)] hover:terminal-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? t.settings.saving : t.settings.updateProfile}
                </button>
              </div>
            </motion.div>
          )}

          {/* AI Providers Tab */}
          {activeTab === 'ai' && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <AIConfigSection
                settings={{
                  ANTHROPIC_API_KEY: settings.ANTHROPIC_API_KEY,
                  OPENAI_API_KEY: settings.OPENAI_API_KEY,
                  GEMINI_API_KEY: settings.GEMINI_API_KEY,
                  EXCEL_AI_PROVIDER: settings.EXCEL_AI_PROVIDER,
                  DATA_AI_PROVIDER: settings.DATA_AI_PROVIDER,
                  DATA_AI_MODEL: settings.DATA_AI_MODEL,
                  VALIDATION_MODEL_TIER: settings.VALIDATION_MODEL_TIER,
                  CUSTOM_VALIDATION_MODEL: settings.CUSTOM_VALIDATION_MODEL
                }}
                setSettings={(newSettings) => setSettings({ ...settings, ...newSettings })}
              />

              <div className="flex justify-end pt-4 border-t border-[var(--border)]">
                <button
                  onClick={handleSaveSettings}
                  disabled={isSaving}
                  className="px-6 py-3 bg-[var(--bg-tertiary)] border-2 border-[var(--accent-green)] rounded text-terminal-green font-semibold hover:bg-[var(--bg-primary)] hover:terminal-glow-green transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? t.settings.saving : t.settings.saveConfig}
                </button>
              </div>
            </motion.div>
          )}

          {/* Platform Config Tab */}
          {activeTab === 'platform' && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="mb-4">
                <div className="text-terminal-green font-mono text-sm mb-4">
                  &gt; platform.config.te
                </div>
                <p className="text-[var(--text-secondary)] text-sm">
                  {t.settings.platformDescription}
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-[var(--text-primary)]">
                    <span className="text-terminal-cyan">$</span> {t.settings.teAppId}
                  </label>
                  <input
                    type="text"
                    value={settings.TE_APP_ID}
                    onChange={(e) => setSettings({ ...settings, TE_APP_ID: e.target.value })}
                    className="w-full p-3 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] font-mono text-sm focus:border-[var(--accent-cyan)] focus:outline-none transition-all"
                    placeholder="df6fff48a373418ca2da97d104df2188"
                  />
                  <p className="text-xs text-[var(--text-dimmed)] mt-1">
                    {t.settings.defaultAppIdDesc}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-[var(--text-primary)]">
                    <span className="text-terminal-cyan">$</span> {t.settings.teReceiverUrl}
                  </label>
                  <input
                    type="text"
                    value={settings.TE_RECEIVER_URL}
                    onChange={(e) => setSettings({ ...settings, TE_RECEIVER_URL: e.target.value })}
                    className="w-full p-3 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] font-mono text-sm focus:border-[var(--accent-cyan)] focus:outline-none transition-all"
                    placeholder="https://te-receiver-naver.thinkingdata.kr/"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSaveSettings}
                  disabled={isSaving}
                  className="px-6 py-3 bg-[var(--bg-tertiary)] border-2 border-[var(--accent-magenta)] rounded text-terminal-magenta font-semibold hover:bg-[var(--bg-primary)] hover:terminal-glow-magenta transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? t.settings.saving : t.settings.saveConfig}
                </button>
              </div>
            </motion.div>
          )}

          {/* Data Retention Tab */}
          {activeTab === 'retention' && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="mb-4">
                <div className="text-terminal-green font-mono text-sm mb-4">
                  &gt; system.retention.policy
                </div>
                <p className="text-[var(--text-secondary)] text-sm">
                  {t.settings.retentionDescription}
                </p>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="data-retention-input" className="block text-sm font-semibold mb-2 text-[var(--text-primary)]">
                      <span className="text-terminal-cyan">$</span> {t.settings.dataRetentionDays}
                    </label>
                    <input
                      id="data-retention-input"
                      type="number"
                      min="1"
                      value={settings.DATA_RETENTION_DAYS}
                      onChange={(e) => setSettings({ ...settings, DATA_RETENTION_DAYS: e.target.value })}
                      className="w-full p-3 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] font-mono text-sm focus:border-[var(--accent-cyan)] focus:outline-none transition-all"
                      placeholder="7"
                    />
                    <p className="text-xs text-[var(--text-dimmed)] mt-1">
                      {t.settings.dataRetentionDesc}
                    </p>
                  </div>

                  <div>
                    <label htmlFor="excel-retention-input" className="block text-sm font-semibold mb-2 text-[var(--text-primary)]">
                      <span className="text-terminal-cyan">$</span> {t.settings.excelRetentionDays}
                    </label>
                    <input
                      id="excel-retention-input"
                      type="number"
                      min="1"
                      value={settings.EXCEL_RETENTION_DAYS}
                      onChange={(e) => setSettings({ ...settings, EXCEL_RETENTION_DAYS: e.target.value })}
                      className="w-full p-3 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] font-mono text-sm focus:border-[var(--accent-cyan)] focus:outline-none transition-all"
                      placeholder="30"
                    />
                    <p className="text-xs text-[var(--text-dimmed)] mt-1">
                      {t.settings.excelRetentionDesc}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.AUTO_DELETE_AFTER_SEND === 'true'}
                      onChange={(e) => setSettings({ ...settings, AUTO_DELETE_AFTER_SEND: e.target.checked ? 'true' : 'false' })}
                      className="w-5 h-5 bg-[var(--bg-primary)] border-2 border-[var(--accent-cyan)] rounded accent-[var(--accent-cyan)]"
                    />
                    <div>
                      <span className="font-semibold text-[var(--text-primary)]">
                        {t.settings.autoDeleteAfterSend}
                      </span>
                      <p className="text-xs text-[var(--text-dimmed)] mt-1">
                        {t.settings.autoDeleteDesc}
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSaveSettings}
                  disabled={isSaving}
                  className="px-6 py-3 bg-[var(--bg-tertiary)] border-2 border-[var(--accent-yellow)] rounded text-[var(--accent-yellow)] font-semibold hover:bg-[var(--bg-primary)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? t.settings.saving : t.settings.saveConfig}
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Save Message */}
      {saveMessage && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={`p-4 rounded border font-mono text-sm ${
            saveMessage.startsWith('[OK]')
              ? 'bg-[var(--bg-secondary)] border-[var(--accent-green)] text-terminal-green'
              : 'bg-[var(--bg-secondary)] border-[var(--error-red)] text-[var(--error-red)]'
          }`}
        >
          {saveMessage}
        </motion.div>
      )}
    </div>
  );
}
