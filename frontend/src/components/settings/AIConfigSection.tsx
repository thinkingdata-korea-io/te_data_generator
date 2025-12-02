'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Settings } from '@/app/dashboard/generator/types';

interface AIConfigSectionProps {
  settings: Settings;
  setSettings: (settings: Settings) => void;
}

export default function AIConfigSection({ settings, setSettings }: AIConfigSectionProps) {
  const { t } = useLanguage();
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="space-y-6">
      {/* 섹션 1: Providers & API Keys */}
      <div className="border border-[var(--border)] rounded-lg p-6 bg-[var(--bg-secondary)]">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1 flex items-center gap-2">
            <span className="text-2xl">🔑</span>
            <span>{t.settings.providersApiKeysTitle}</span>
          </h3>
          <p className="text-sm text-[var(--text-secondary)] ml-8">
            {t.settings.providersApiKeysDesc}
          </p>
        </div>

        <div className="space-y-4 ml-8">
          {/* Anthropic API Key */}
          <div>
            <label className="block text-sm font-semibold mb-1 text-[var(--text-primary)]">
              {t.settings.anthropicApiKey}
            </label>
            <input
              type="password"
              value={settings.ANTHROPIC_API_KEY}
              onChange={(e) => setSettings({ ...settings, ANTHROPIC_API_KEY: e.target.value })}
              className="w-full p-3 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] font-mono text-sm focus:border-[var(--accent-cyan)] focus:outline-none transition-all"
              placeholder="sk-ant-api03-..."
            />
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              {t.settings.anthropicApiKeyDesc} <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="text-[var(--accent-cyan)] hover:underline">{t.settings.getApiKey}</a>
            </p>
          </div>

          {/* OpenAI API Key */}
          <div>
            <label className="block text-sm font-semibold mb-1 text-[var(--text-primary)]">
              {t.settings.openaiApiKey}
            </label>
            <input
              type="password"
              value={settings.OPENAI_API_KEY}
              onChange={(e) => setSettings({ ...settings, OPENAI_API_KEY: e.target.value })}
              className="w-full p-3 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] font-mono text-sm focus:border-[var(--accent-cyan)] focus:outline-none transition-all"
              placeholder="sk-proj-..."
            />
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              {t.settings.openaiApiKeyDesc} <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-[var(--accent-cyan)] hover:underline">{t.settings.getApiKey}</a>
            </p>
          </div>

          {/* Gemini API Key */}
          <div>
            <label className="block text-sm font-semibold mb-1 text-[var(--text-primary)]">
              {t.settings.geminiApiKey}
            </label>
            <input
              type="password"
              value={settings.GEMINI_API_KEY}
              onChange={(e) => setSettings({ ...settings, GEMINI_API_KEY: e.target.value })}
              className="w-full p-3 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] font-mono text-sm focus:border-[var(--accent-cyan)] focus:outline-none transition-all"
              placeholder="AIza..."
            />
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              {t.settings.geminiApiKeyDesc} <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-[var(--accent-cyan)] hover:underline">{t.settings.getApiKey}</a>
            </p>
          </div>
        </div>
      </div>

      {/* 섹션 2: Default Provider Selection */}
      <div className="border border-[var(--border)] rounded-lg p-6 bg-[var(--bg-secondary)]">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1 flex items-center gap-2">
            <span className="text-2xl">⚙️</span>
            <span>{t.settings.defaultProviderTitle}</span>
          </h3>
          <p className="text-sm text-[var(--text-secondary)] ml-8">
            {t.settings.defaultProviderDesc}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 ml-8">
          <div>
            <label className="block text-sm font-semibold mb-1 text-[var(--text-primary)]">
              {t.settings.excelGenerationProvider}
            </label>
            <select
              value={settings.EXCEL_AI_PROVIDER}
              onChange={(e) => setSettings({ ...settings, EXCEL_AI_PROVIDER: e.target.value as 'anthropic' | 'openai' | 'gemini' })}
              className="w-full p-3 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] font-mono text-sm focus:border-[var(--accent-cyan)] focus:outline-none transition-all"
            >
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="openai">OpenAI (GPT)</option>
              <option value="gemini">Google (Gemini)</option>
            </select>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              {t.settings.excelGenerationDesc}
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1 text-[var(--text-primary)]">
              {t.settings.dataGenerationProvider}
            </label>
            <select
              value={settings.DATA_AI_PROVIDER}
              onChange={(e) => setSettings({ ...settings, DATA_AI_PROVIDER: e.target.value as 'anthropic' | 'openai' | 'gemini' })}
              className="w-full p-3 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] font-mono text-sm focus:border-[var(--accent-cyan)] focus:outline-none transition-all"
            >
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="openai">OpenAI (GPT)</option>
              <option value="gemini">Google (Gemini)</option>
            </select>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              {t.settings.dataGenerationDesc}
            </p>
          </div>
        </div>
      </div>

      {/* 섹션 3: Generation Model Configuration */}
      <div className="border border-[var(--border)] rounded-lg p-6 bg-[var(--bg-secondary)]">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1 flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            <span>{t.settings.generationModelTitle}</span>
          </h3>
          <p className="text-sm text-[var(--text-secondary)] ml-8">
            {t.settings.generationModelDesc}
          </p>
        </div>

        <div className="ml-8">
          <label className="block text-sm font-semibold mb-1 text-[var(--text-primary)]">
            {t.settings.dataGenerationModel}
          </label>
          <input
            type="text"
            value={settings.DATA_AI_MODEL}
            onChange={(e) => setSettings({ ...settings, DATA_AI_MODEL: e.target.value })}
            placeholder={t.settings.dataGenerationModelPlaceholder}
            className="w-full p-3 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] font-mono text-sm focus:border-[var(--accent-cyan)] focus:outline-none transition-all placeholder:text-[var(--text-secondary)]"
          />
          <div className="mt-2 text-xs text-[var(--text-secondary)] space-y-1">
            <p>💡 {t.settings.leaveEmptyForDefault}</p>
            <ul className="list-disc list-inside ml-4 space-y-0.5">
              <li>Anthropic: claude-sonnet-4-5 (권장)</li>
              <li>OpenAI: gpt-4o (권장)</li>
              <li>Gemini: gemini-2.5-pro</li>
            </ul>
            <p className="mt-2">🎯 {t.settings.availableModels}</p>
            <ul className="list-disc list-inside ml-4 space-y-0.5">
              <li>Claude: <code className="bg-[var(--bg-tertiary)] px-1">claude-sonnet-4-5</code>, <code className="bg-[var(--bg-tertiary)] px-1">claude-opus-4-1</code></li>
              <li>OpenAI: <code className="bg-[var(--bg-tertiary)] px-1">gpt-4o</code>, <code className="bg-[var(--bg-tertiary)] px-1">gpt-4o-mini</code>, <code className="bg-[var(--bg-tertiary)] px-1">gpt-4-turbo</code></li>
              <li>Gemini: <code className="bg-[var(--bg-tertiary)] px-1">gemini-2.5-pro</code>, <code className="bg-[var(--bg-tertiary)] px-1">gemini-2.5-flash</code></li>
            </ul>
          </div>
        </div>
      </div>

      {/* 섹션 4: Validation Configuration */}
      <div className="border border-[var(--border)] rounded-lg p-6 bg-[var(--bg-secondary)]">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1 flex items-center gap-2">
            <span className="text-2xl">✅</span>
            <span>{t.settings.validationConfigTitle}</span>
          </h3>
          <p className="text-sm text-[var(--text-secondary)] ml-8">
            {t.settings.validationConfigDesc}
          </p>
        </div>

        <div className="space-y-4 ml-8">
          {/* Validation Tier */}
          <div>
            <label className="block text-sm font-semibold mb-1 text-[var(--text-primary)]">
              {t.settings.validationModelTier}
            </label>
            <select
              value={settings.VALIDATION_MODEL_TIER}
              onChange={(e) => setSettings({ ...settings, VALIDATION_MODEL_TIER: e.target.value as 'fast' | 'balanced' })}
              className="w-full p-3 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] font-mono text-sm focus:border-[var(--accent-cyan)] focus:outline-none transition-all"
            >
              <option value="fast">{t.settings.validationFast}</option>
              <option value="balanced">{t.settings.validationBalanced}</option>
            </select>
            <div className="mt-2 text-xs text-[var(--text-secondary)] space-y-1">
              <p>💡 <strong>{t.settings.validationFastRecommended}</strong>: {t.settings.validationFastDesc}</p>
              <ul className="list-disc list-inside ml-4 space-y-0.5">
                <li>{t.settings.validationCostFast}</li>
                <li>{t.settings.validationCostBalanced}</li>
              </ul>
            </div>
          </div>

          {/* Advanced: Custom Validation Model */}
          <div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-[var(--accent-cyan)] hover:underline flex items-center gap-1"
            >
              <span>{showAdvanced ? '▼' : '▶'}</span>
              <span>{t.settings.advancedCustomModel}</span>
            </button>

            {showAdvanced && (
              <div className="mt-3 p-4 border border-[var(--border)] rounded bg-[var(--bg-tertiary)]">
                <label className="block text-sm font-semibold mb-1 text-[var(--text-primary)]">
                  {t.settings.customValidationModel}
                </label>
                <input
                  type="text"
                  value={settings.CUSTOM_VALIDATION_MODEL}
                  onChange={(e) => setSettings({ ...settings, CUSTOM_VALIDATION_MODEL: e.target.value })}
                  placeholder={t.settings.customValidationPlaceholder}
                  className="w-full p-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded text-[var(--text-primary)] font-mono text-sm focus:border-[var(--accent-cyan)] focus:outline-none transition-all placeholder:text-[var(--text-secondary)]"
                />
                <div className="mt-2 text-xs text-[var(--text-secondary)] space-y-1">
                  <p>🎯 {t.settings.customValidationDesc}</p>
                  <p>{t.settings.availableModels}</p>
                  <ul className="list-disc list-inside ml-4 space-y-0.5">
                    <li>Claude: <code className="bg-[var(--bg-secondary)] px-1">claude-haiku-4-5</code>, <code className="bg-[var(--bg-secondary)] px-1">claude-sonnet-4-5</code></li>
                    <li>OpenAI: <code className="bg-[var(--bg-secondary)] px-1">gpt-4o-mini</code>, <code className="bg-[var(--bg-secondary)] px-1">gpt-4o</code></li>
                    <li>Gemini: <code className="bg-[var(--bg-secondary)] px-1">gemini-2.5-flash</code>, <code className="bg-[var(--bg-secondary)] px-1">gemini-2.5-pro</code></li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
