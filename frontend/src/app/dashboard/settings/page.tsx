'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { TypingAnimation } from '@/components/effects/TypingAnimation';

/**
 * Settings Page
 * @brief: Terminal-style settings interface for platform configuration
 */

interface Settings {
  // AI Provider Settings
  ANTHROPIC_API_KEY: string;
  OPENAI_API_KEY: string;
  EXCEL_AI_PROVIDER: 'anthropic' | 'openai';
  DATA_AI_PROVIDER: 'anthropic' | 'openai';

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
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'ai' | 'platform' | 'retention'>('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const [settings, setSettings] = useState<Settings>({
    ANTHROPIC_API_KEY: '',
    OPENAI_API_KEY: '',
    EXCEL_AI_PROVIDER: 'anthropic',
    DATA_AI_PROVIDER: 'anthropic',
    TE_APP_ID: '',
    TE_RECEIVER_URL: 'https://te-receiver-naver.thinkingdata.kr/',
    DATA_RETENTION_DAYS: '7',
    EXCEL_RETENTION_DAYS: '30',
    AUTO_DELETE_AFTER_SEND: 'false',
  });

  const [profile, setProfile] = useState<UserProfile>({
    fullName: user?.fullName || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const response = await fetch(`${API_URL}/api/settings`);
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
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_URL}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setSaveMessage('[OK] Settings saved successfully');
      } else {
        throw new Error('Failed to save');
      }
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      setSaveMessage('[ERROR] Failed to save settings');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    if (profile.newPassword && profile.newPassword !== profile.confirmPassword) {
      setSaveMessage('[ERROR] Passwords do not match');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }

    setIsSaving(true);
    setSaveMessage('');

    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      setSaveMessage('[OK] Profile updated successfully');
      setTimeout(() => setSaveMessage(''), 3000);

      // Clear password fields
      setProfile(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
    } catch (error) {
      setSaveMessage('[ERROR] Failed to update profile');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'profile' as const, label: 'User Profile', icon: '👤' },
    { id: 'ai' as const, label: 'AI Providers', icon: '🤖' },
    { id: 'platform' as const, label: 'Platform Config', icon: '⚙' },
    { id: 'retention' as const, label: 'Data Retention', icon: '🗄' },
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
          <TypingAnimation text="⚙ System Configuration" speed={30} showCursor={false} />
        </h1>
        <p className="text-[var(--text-secondary)] text-sm font-mono">
          Configure platform settings, AI providers, and user preferences
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
                  Manage your personal information and security settings
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-[var(--text-primary)]">
                    <span className="text-terminal-cyan">$</span> Username
                  </label>
                  <input
                    type="text"
                    value={user?.username || ''}
                    disabled
                    className="w-full p-3 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-dimmed)] font-mono text-sm"
                  />
                  <p className="text-xs text-[var(--text-dimmed)] mt-1">
                    Username cannot be changed
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-[var(--text-primary)]">
                    <span className="text-terminal-cyan">$</span> Full Name
                  </label>
                  <input
                    type="text"
                    value={profile.fullName}
                    onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                    className="w-full p-3 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] font-mono text-sm focus:border-[var(--accent-cyan)] focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-[var(--text-primary)]">
                    <span className="text-terminal-cyan">$</span> Email
                  </label>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="w-full p-3 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] font-mono text-sm focus:border-[var(--accent-cyan)] focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-[var(--text-primary)]">
                    <span className="text-terminal-cyan">$</span> Role
                  </label>
                  <input
                    type="text"
                    value={user?.role?.toUpperCase() || ''}
                    disabled
                    className="w-full p-3 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-dimmed)] font-mono text-sm"
                  />
                </div>
              </div>

              {/* Password Change Section */}
              <div className="pt-6 border-t border-[var(--border)]">
                <h3 className="text-lg font-bold text-terminal-magenta mb-4">
                  Change Password
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-[var(--text-primary)]">
                      Current Password
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
                      New Password
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
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={profile.confirmPassword}
                      onChange={(e) => setProfile({ ...profile, confirmPassword: e.target.value })}
                      className="w-full p-3 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] font-mono text-sm focus:border-[var(--accent-cyan)] focus:outline-none transition-all"
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
                  {isSaving ? '[SAVING...]' : '[SAVE PROFILE]'}
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
              <div className="mb-4">
                <div className="text-terminal-green font-mono text-sm mb-4">
                  &gt; ai.config.providers
                </div>
                <p className="text-[var(--text-secondary)] text-sm">
                  Configure API keys and select AI providers for Excel and Data generation
                </p>
              </div>

              <div className="space-y-6">
                {/* Anthropic API Key */}
                <div>
                  <label className="block text-sm font-semibold mb-2 text-[var(--text-primary)]">
                    <span className="text-terminal-cyan">$</span> Anthropic API Key (Claude)
                  </label>
                  <input
                    type="password"
                    value={settings.ANTHROPIC_API_KEY}
                    onChange={(e) => setSettings({ ...settings, ANTHROPIC_API_KEY: e.target.value })}
                    className="w-full p-3 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] font-mono text-sm focus:border-[var(--accent-cyan)] focus:outline-none transition-all"
                    placeholder="sk-ant-..."
                  />
                </div>

                {/* OpenAI API Key */}
                <div>
                  <label className="block text-sm font-semibold mb-2 text-[var(--text-primary)]">
                    <span className="text-terminal-cyan">$</span> OpenAI API Key (GPT)
                  </label>
                  <input
                    type="password"
                    value={settings.OPENAI_API_KEY}
                    onChange={(e) => setSettings({ ...settings, OPENAI_API_KEY: e.target.value })}
                    className="w-full p-3 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] font-mono text-sm focus:border-[var(--accent-cyan)] focus:outline-none transition-all"
                    placeholder="sk-..."
                  />
                </div>

                {/* Provider Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-[var(--text-primary)]">
                      <span className="text-terminal-cyan">$</span> Excel Generation Provider
                    </label>
                    <select
                      value={settings.EXCEL_AI_PROVIDER}
                      onChange={(e) => setSettings({ ...settings, EXCEL_AI_PROVIDER: e.target.value as 'anthropic' | 'openai' })}
                      className="w-full p-3 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] font-mono text-sm focus:border-[var(--accent-cyan)] focus:outline-none transition-all"
                    >
                      <option value="anthropic">Anthropic (Claude)</option>
                      <option value="openai">OpenAI (GPT)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 text-[var(--text-primary)]">
                      <span className="text-terminal-cyan">$</span> Data Generation Provider
                    </label>
                    <select
                      value={settings.DATA_AI_PROVIDER}
                      onChange={(e) => setSettings({ ...settings, DATA_AI_PROVIDER: e.target.value as 'anthropic' | 'openai' })}
                      className="w-full p-3 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] font-mono text-sm focus:border-[var(--accent-cyan)] focus:outline-none transition-all"
                    >
                      <option value="anthropic">Anthropic (Claude)</option>
                      <option value="openai">OpenAI (GPT)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSaveSettings}
                  disabled={isSaving}
                  className="px-6 py-3 bg-[var(--bg-tertiary)] border-2 border-[var(--accent-green)] rounded text-terminal-green font-semibold hover:bg-[var(--bg-primary)] hover:terminal-glow-green transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? '[SAVING...]' : '[SAVE CONFIG]'}
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
                  Configure ThinkingEngine platform connection settings
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-[var(--text-primary)]">
                    <span className="text-terminal-cyan">$</span> ThinkingEngine APP_ID
                  </label>
                  <input
                    type="text"
                    value={settings.TE_APP_ID}
                    onChange={(e) => setSettings({ ...settings, TE_APP_ID: e.target.value })}
                    className="w-full p-3 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] font-mono text-sm focus:border-[var(--accent-cyan)] focus:outline-none transition-all"
                    placeholder="df6fff48a373418ca2da97d104df2188"
                  />
                  <p className="text-xs text-[var(--text-dimmed)] mt-1">
                    Default APP_ID for data transmission
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-[var(--text-primary)]">
                    <span className="text-terminal-cyan">$</span> ThinkingEngine Receiver URL
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
                  {isSaving ? '[SAVING...]' : '[SAVE CONFIG]'}
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
                  Configure automatic file cleanup and retention policies
                </p>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-[var(--text-primary)]">
                      <span className="text-terminal-cyan">$</span> Data File Retention (days)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={settings.DATA_RETENTION_DAYS}
                      onChange={(e) => setSettings({ ...settings, DATA_RETENTION_DAYS: e.target.value })}
                      className="w-full p-3 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] font-mono text-sm focus:border-[var(--accent-cyan)] focus:outline-none transition-all"
                    />
                    <p className="text-xs text-[var(--text-dimmed)] mt-1">
                      Auto-delete generated data files after N days
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 text-[var(--text-primary)]">
                      <span className="text-terminal-cyan">$</span> Excel File Retention (days)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={settings.EXCEL_RETENTION_DAYS}
                      onChange={(e) => setSettings({ ...settings, EXCEL_RETENTION_DAYS: e.target.value })}
                      className="w-full p-3 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] font-mono text-sm focus:border-[var(--accent-cyan)] focus:outline-none transition-all"
                    />
                    <p className="text-xs text-[var(--text-dimmed)] mt-1">
                      Auto-delete Excel schema files after N days
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
                        Auto-delete after transmission
                      </span>
                      <p className="text-xs text-[var(--text-dimmed)] mt-1">
                        Immediately delete data files after successful transmission to ThinkingEngine
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
                  {isSaving ? '[SAVING...]' : '[SAVE CONFIG]'}
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
