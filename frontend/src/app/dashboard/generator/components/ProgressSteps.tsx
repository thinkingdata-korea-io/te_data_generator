'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { ProcessStep } from '../types';

interface ProgressStepsProps {
  currentStep: ProcessStep;
  startMode: 'new' | 'upload' | null;
}

export default function ProgressSteps({ currentStep, startMode }: ProgressStepsProps) {
  const { t } = useLanguage();

  const steps = [
    { key: 'input', label: startMode === 'new' ? t.generator.stepInput : t.generator.stepUpload, icon: startMode === 'new' ? '✎' : '⇪' },
    { key: 'excel', label: startMode === 'new' ? t.generator.stepExcel : t.generator.stepSettings, icon: startMode === 'new' ? '▦' : '⚙' },
    { key: 'ai-analysis', label: t.generator.stepAIAnalysis, icon: '🤖' },
    { key: 'data', label: t.generator.stepData, icon: '⚡' },
    { key: 'send', label: t.generator.stepSend, icon: '⇈' },
    { key: 'complete', label: t.generator.stepComplete, icon: '✓' }
  ];

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isActive =
            (step.key === 'input' && (currentStep === 'input' || currentStep === 'upload-excel')) ||
            (step.key === 'excel' && (currentStep === 'generating-excel' || currentStep === 'excel-completed' || currentStep === 'upload-completed' || currentStep === 'combined-config')) ||
            (step.key === 'ai-analysis' && (currentStep === 'analyzing-ai' || currentStep === 'ai-analysis-review')) ||
            (step.key === 'data' && (currentStep === 'generating-data' || currentStep === 'data-completed')) ||
            (step.key === 'send' && currentStep === 'sending-data') ||
            (step.key === 'complete' && currentStep === 'sent');

          const isCompleted =
            (step.key === 'input' && !['select-mode', 'input', 'upload-excel'].includes(currentStep)) ||
            (step.key === 'excel' && ['analyzing-ai', 'ai-analysis-review', 'generating-data', 'data-completed', 'sending-data', 'sent'].includes(currentStep)) ||
            (step.key === 'ai-analysis' && ['generating-data', 'data-completed', 'sending-data', 'sent'].includes(currentStep)) ||
            (step.key === 'data' && ['sending-data', 'sent'].includes(currentStep)) ||
            (step.key === 'send' && currentStep === 'sent');

          return (
            <div key={step.key} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div className={`w-10 h-10 rounded border-2 flex items-center justify-center text-xl mb-2 transition-all font-mono ${
                  isActive
                    ? 'border-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] terminal-glow-cyan'
                    : isCompleted
                    ? 'border-[var(--accent-green)] bg-[var(--accent-green)]/10 text-[var(--accent-green)]'
                    : 'border-[var(--border)] text-[var(--text-dimmed)]'
                }`}>
                  {step.icon}
                </div>
                <span className={`text-xs font-mono ${
                  isActive ? 'text-[var(--accent-cyan)]' : 'text-[var(--text-secondary)]'
                }`}>
                  {step.label}
                </span>
              </div>
              {index < 5 && (
                <div className={`h-0.5 flex-1 mx-2 transition-all ${
                  isCompleted ? 'bg-[var(--accent-green)]' : 'bg-[var(--border)]'
                }`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
