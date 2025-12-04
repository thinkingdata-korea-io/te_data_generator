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
      {/* 섹션 1: API Key */}
      <div className="border border-[var(--border)] rounded-lg p-6 bg-[var(--bg-secondary)]">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1 flex items-center gap-2">
            <span className="text-2xl">🔑</span>
            <span>Anthropic API Key</span>
          </h3>
          <p className="text-sm text-[var(--text-secondary)] ml-8">
            파일 분석 및 데이터 생성에 사용되는 Claude API 키를 설정합니다.
          </p>
        </div>

        <div className="ml-8">
          <label className="block text-sm font-semibold mb-1 text-[var(--text-primary)]">
            Anthropic API Key
          </label>
          <input
            type="password"
            value={settings.ANTHROPIC_API_KEY}
            onChange={(e) => setSettings({ ...settings, ANTHROPIC_API_KEY: e.target.value })}
            className="w-full p-3 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] font-mono text-sm focus:border-[var(--accent-cyan)] focus:outline-none transition-all"
            placeholder="sk-ant-api03-..."
          />
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Claude API를 사용하여 파일 분석 및 AI 기반 데이터 생성을 수행합니다. <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="text-[var(--accent-cyan)] hover:underline">API 키 발급받기</a>
          </p>
        </div>
      </div>

      {/* 섹션 2: Model Configuration */}
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

        <div className="ml-8 space-y-4">
          <div>
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
              <p className="mt-2">🎯 사용 가능한 Claude 모델:</p>
              <ul className="list-disc list-inside ml-4 space-y-0.5">
                <li><code className="bg-[var(--bg-tertiary)] px-1">claude-sonnet-4-5</code> (권장)</li>
                <li><code className="bg-[var(--bg-tertiary)] px-1">claude-opus-4-1</code> (고급)</li>
                <li><code className="bg-[var(--bg-tertiary)] px-1">claude-haiku-4-5</code> (저가)</li>
              </ul>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1 text-[var(--text-primary)]">
              파일 분석 모델 (PDF, 이미지 등)
            </label>
            <input
              type="text"
              value={settings.FILE_ANALYSIS_MODEL}
              onChange={(e) => setSettings({ ...settings, FILE_ANALYSIS_MODEL: e.target.value })}
              placeholder={t.settings.fileAnalysisModelPlaceholder}
              className="w-full p-3 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] font-mono text-sm focus:border-[var(--accent-cyan)] focus:outline-none transition-all placeholder:text-[var(--text-secondary)]"
            />
            <div className="mt-2 text-xs text-[var(--text-secondary)] space-y-1">
              <p>💰 <strong>비용 최적화 팁</strong>: 파일 분석은 단순 요약이므로 저가 모델 사용 권장</p>
              <ul className="list-disc list-inside ml-4 space-y-0.5">
                <li>비어 있으면: <code className="bg-[var(--bg-tertiary)] px-1">claude-3-5-haiku-20241022</code> 자동 선택 (Sonnet 대비 80% 저렴)</li>
                <li><code className="bg-[var(--bg-tertiary)] px-1">claude-3-5-haiku-20241022</code> (저가, 권장)</li>
                <li><code className="bg-[var(--bg-tertiary)] px-1">claude-sonnet-4-5</code> (고급)</li>
              </ul>
            </div>
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
              title={t.settings.validationModelTier}
              aria-label={t.settings.validationModelTier}
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
                  <p>사용 가능한 Claude 모델:</p>
                  <ul className="list-disc list-inside ml-4 space-y-0.5">
                    <li><code className="bg-[var(--bg-secondary)] px-1">claude-haiku-4-5</code> (저가, 빠름)</li>
                    <li><code className="bg-[var(--bg-secondary)] px-1">claude-sonnet-4-5</code> (균형)</li>
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
