'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { ProcessStep, TaskMode } from '../types';

interface ProgressStepsProps {
  currentStep: ProcessStep;
  startMode: TaskMode | null;
}

export default function ProgressSteps({ currentStep, startMode }: ProgressStepsProps) {
  const { t } = useLanguage();

  // Define steps based on task mode
  let steps: Array<{ key: string; label: string; icon: string }> = [];

  if (startMode === 'taxonomy-only') {
    // Taxonomy Excel 생성만: Input → Excel 완료
    steps = [
      { key: 'input', label: t.generator.stepInput, icon: '✎' },
      { key: 'excel', label: t.generator.stepExcel, icon: '▦' },
      { key: 'complete', label: t.generator.stepComplete, icon: '✓' }
    ];
  } else if (startMode === 'analysis-only') {
    // AI 분석만: Upload → AI Analysis 완료
    steps = [
      { key: 'input', label: t.generator.stepUpload, icon: '⇪' },
      { key: 'ai-analysis', label: t.generator.stepAIAnalysis, icon: '🤖' },
      { key: 'complete', label: t.generator.stepComplete, icon: '✓' }
    ];
  } else if (startMode === 'data-only') {
    // 데이터만 생성: Upload → Settings → Data 완료 (전송 제외)
    steps = [
      { key: 'input', label: t.generator.stepUpload, icon: '⇪' },
      { key: 'excel', label: t.generator.stepSettings, icon: '⚙' },
      { key: 'data', label: t.generator.stepData, icon: '⚡' },
      { key: 'complete', label: t.generator.stepComplete, icon: '✓' }
    ];
  } else if (startMode === 'send-only') {
    // 데이터 전송만: Upload → Send 완료
    steps = [
      { key: 'input', label: t.generator.stepUploadData, icon: '📤' },
      { key: 'send', label: t.generator.stepSend, icon: '⇈' },
      { key: 'complete', label: t.generator.stepComplete, icon: '✓' }
    ];
  } else if (startMode === 'full-process') {
    // 전체 프로세스: Input → Excel → AI Analysis → Data → Send 완료
    steps = [
      { key: 'input', label: t.generator.stepInput, icon: '✎' },
      { key: 'excel', label: t.generator.stepExcel, icon: '▦' },
      { key: 'ai-analysis', label: t.generator.stepAIAnalysis, icon: '🤖' },
      { key: 'data', label: t.generator.stepData, icon: '⚡' },
      { key: 'send', label: t.generator.stepSend, icon: '⇈' },
      { key: 'complete', label: t.generator.stepComplete, icon: '✓' }
    ];
  } else {
    // Default: full process
    steps = [
      { key: 'input', label: t.generator.stepInput, icon: '✎' },
      { key: 'excel', label: t.generator.stepExcel, icon: '▦' },
      { key: 'ai-analysis', label: t.generator.stepAIAnalysis, icon: '🤖' },
      { key: 'data', label: t.generator.stepData, icon: '⚡' },
      { key: 'send', label: t.generator.stepSend, icon: '⇈' },
      { key: 'complete', label: t.generator.stepComplete, icon: '✓' }
    ];
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isActive =
            (step.key === 'input' && (currentStep === 'input' || currentStep === 'upload-excel' || currentStep === 'dual-upload' || currentStep === 'upload-data-file')) ||
            (step.key === 'excel' && (currentStep === 'generating-excel' || currentStep === 'excel-completed' || currentStep === 'upload-completed' || currentStep === 'combined-config' || currentStep === 'dual-upload-completed')) ||
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
              {index < steps.length - 1 && (
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
