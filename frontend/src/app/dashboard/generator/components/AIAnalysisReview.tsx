'use client';

import { useLanguage } from '@/contexts/LanguageContext';

interface AIAnalysisReviewProps {
  aiAnalysisResult: any;
  editedSegments: any[];
  editedEventSequences: any[];
  editedTransactions: any[];
  onSegmentChange: (index: number, field: string, value: any) => void;
  onEventSequenceChange: (index: number, field: string, value: any) => void;
  onTransactionChange: (index: number, field: string, value: any) => void;
  onComplete: () => void;
  onProceedToGeneration: () => void;
}

export default function AIAnalysisReview({
  aiAnalysisResult,
  editedSegments,
  editedEventSequences,
  editedTransactions,
  onSegmentChange,
  onEventSequenceChange,
  onTransactionChange,
  onComplete,
  onProceedToGeneration
}: AIAnalysisReviewProps) {
  const { t } = useLanguage();

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded p-8 terminal-glow">
      <h2 className="text-2xl font-bold mb-6 text-terminal-cyan font-mono flex items-center gap-2">
        <span>🤖</span> {t.generator.aiAnalysisTitle}
      </h2>

      <div className="p-6 bg-[var(--accent-cyan)]/10 rounded border border-[var(--accent-cyan)] mb-6">
        <p className="text-[var(--accent-cyan)] mb-2 font-mono font-semibold">✅ {t.generator.aiAnalysisComplete}</p>
        <p className="text-sm text-[var(--text-secondary)] font-mono">{t.generator.aiAnalysisDesc}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-[var(--bg-tertiary)] border border-[var(--border)] rounded p-4">
          <p className="text-xs text-[var(--text-dimmed)] mb-1 font-mono">{t.generator.userSegments}</p>
          <p className="text-2xl font-bold text-[var(--accent-cyan)] font-mono">
            {editedSegments.length || 0}{t.generator.segmentCount}
          </p>
        </div>
        <div className="bg-[var(--bg-tertiary)] border border-[var(--border)] rounded p-4">
          <p className="text-xs text-[var(--text-dimmed)] mb-1 font-mono">{t.generator.eventSequenceRules}</p>
          <p className="text-2xl font-bold text-[var(--accent-cyan)] font-mono">
            {editedEventSequences.length || 0}{t.generator.sequenceCount}
          </p>
        </div>
        <div className="bg-[var(--bg-tertiary)] border border-[var(--border)] rounded p-4">
          <p className="text-xs text-[var(--text-dimmed)] mb-1 font-mono">{t.generator.transactionDefinitions}</p>
          <p className="text-2xl font-bold text-[var(--accent-cyan)] font-mono">
            {editedTransactions.length || 0}{t.generator.transactionsCount}
          </p>
        </div>
      </div>

      {/* User Segments Table */}
      <div className="mb-8">
        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4 font-mono flex items-center gap-2">
          <span>👥</span> {t.generator.userSegments}
        </h3>
        <div className="bg-[var(--bg-primary)] rounded border border-[var(--border)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[var(--bg-tertiary)] border-b border-[var(--border)]">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] font-mono">세그먼트명</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] font-mono">비율(%)</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] font-mono">특성</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] font-mono">평균 세션/일</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] font-mono">평균 세션 시간</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] font-mono">평균 이벤트/세션</th>
                </tr>
              </thead>
              <tbody>
                {editedSegments.map((segment: any, idx: number) => (
                  <tr key={idx} className="border-b border-[var(--border)] hover:bg-[var(--bg-tertiary)]/50 transition-colors">
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={segment.name}
                        onChange={(e) => onSegmentChange(idx, 'name', e.target.value)}
                        className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded px-2 py-1 text-sm text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent-cyan)]"
                        aria-label={`세그먼트명 ${idx + 1}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={segment.percentage}
                        onChange={(e) => onSegmentChange(idx, 'percentage', parseFloat(e.target.value))}
                        className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded px-2 py-1 text-sm text-[var(--accent-cyan)] font-mono font-semibold focus:outline-none focus:border-[var(--accent-cyan)]"
                        min="0"
                        max="100"
                        step="0.1"
                        aria-label={`비율(%) ${idx + 1}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <textarea
                        value={segment.characteristics}
                        onChange={(e) => onSegmentChange(idx, 'characteristics', e.target.value)}
                        className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded px-2 py-1 text-sm text-[var(--text-secondary)] font-mono focus:outline-none focus:border-[var(--accent-cyan)] resize-none"
                        rows={2}
                        aria-label={`특성 ${idx + 1}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={segment.avgSessionsPerDay}
                        onChange={(e) => onSegmentChange(idx, 'avgSessionsPerDay', parseFloat(e.target.value))}
                        className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded px-2 py-1 text-sm text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent-cyan)]"
                        min="0"
                        step="0.1"
                        aria-label={`평균 세션/일 ${idx + 1}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={segment.avgSessionDuration}
                        onChange={(e) => onSegmentChange(idx, 'avgSessionDuration', e.target.value)}
                        className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded px-2 py-1 text-sm text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent-cyan)]"
                        aria-label={`평균 세션 시간 ${idx + 1}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={segment.avgEventsPerSession}
                        onChange={(e) => onSegmentChange(idx, 'avgEventsPerSession', parseFloat(e.target.value))}
                        className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded px-2 py-1 text-sm text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent-cyan)]"
                        min="0"
                        step="0.1"
                        aria-label={`평균 이벤트/세션 ${idx + 1}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p className="text-xs text-[var(--text-dimmed)] mt-2 font-mono">
          💡 비율, 세션 패턴 등을 수정하여 재검토할 수 있습니다.
        </p>
      </div>

      {/* Event Sequence Rules */}
      <div className="mb-8">
        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4 font-mono flex items-center gap-2">
          <span>🔄</span> {t.generator.eventSequenceRules}
        </h3>
        <div className="space-y-3">
          {editedEventSequences.map((sequence: any, idx: number) => (
            <div key={idx} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded p-4 hover:border-[var(--accent-cyan)] transition-colors">
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-5">
                  <label htmlFor={`sequence-name-${idx}`} className="text-xs text-[var(--text-dimmed)] mb-1 block font-mono">시퀀스 이름</label>
                  <input
                    id={`sequence-name-${idx}`}
                    type="text"
                    value={sequence.name}
                    onChange={(e) => onEventSequenceChange(idx, 'name', e.target.value)}
                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent-cyan)]"
                  />
                </div>
                <div className="col-span-2">
                  <label htmlFor={`sequence-probability-${idx}`} className="text-xs text-[var(--text-dimmed)] mb-1 block font-mono">확률(%)</label>
                  <input
                    id={`sequence-probability-${idx}`}
                    type="number"
                    value={sequence.probability}
                    onChange={(e) => onEventSequenceChange(idx, 'probability', parseFloat(e.target.value))}
                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[var(--accent-cyan)] font-mono font-semibold focus:outline-none focus:border-[var(--accent-cyan)]"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </div>
                <div className="col-span-5">
                  <label htmlFor={`sequence-events-${idx}`} className="text-xs text-[var(--text-dimmed)] mb-1 block font-mono">이벤트 순서</label>
                  <input
                    id={`sequence-events-${idx}`}
                    type="text"
                    value={Array.isArray(sequence.events) ? sequence.events.join(' → ') : sequence.events}
                    onChange={(e) => onEventSequenceChange(idx, 'events', e.target.value.split(' → '))}
                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[var(--text-secondary)] font-mono focus:outline-none focus:border-[var(--accent-cyan)]"
                    placeholder="event1 → event2 → event3"
                  />
                </div>
              </div>
              {sequence.description && (
                <div className="mt-3">
                  <label htmlFor={`sequence-description-${idx}`} className="text-xs text-[var(--text-dimmed)] mb-1 block font-mono">설명</label>
                  <textarea
                    id={`sequence-description-${idx}`}
                    value={sequence.description}
                    onChange={(e) => onEventSequenceChange(idx, 'description', e.target.value)}
                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[var(--text-secondary)] font-mono focus:outline-none focus:border-[var(--accent-cyan)] resize-none"
                    rows={2}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-[var(--text-dimmed)] mt-2 font-mono">
          💡 이벤트 순서를 "→"로 구분하여 수정할 수 있습니다.
        </p>
      </div>

      {/* Transaction Definitions */}
      <div className="mb-8">
        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4 font-mono flex items-center gap-2">
          <span>💰</span> {t.generator.transactionDefinitions}
        </h3>
        <div className="space-y-3">
          {editedTransactions.map((transaction: any, idx: number) => (
            <div key={idx} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded p-4 hover:border-[var(--accent-cyan)] transition-colors">
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-4">
                  <label htmlFor={`transaction-name-${idx}`} className="text-xs text-[var(--text-dimmed)] mb-1 block font-mono">트랜잭션명</label>
                  <input
                    id={`transaction-name-${idx}`}
                    type="text"
                    value={transaction.name}
                    onChange={(e) => onTransactionChange(idx, 'name', e.target.value)}
                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent-cyan)]"
                  />
                </div>
                <div className="col-span-4">
                  <label htmlFor={`transaction-trigger-${idx}`} className="text-xs text-[var(--text-dimmed)] mb-1 block font-mono">트리거 이벤트</label>
                  <input
                    id={`transaction-trigger-${idx}`}
                    type="text"
                    value={transaction.triggerEvent}
                    onChange={(e) => onTransactionChange(idx, 'triggerEvent', e.target.value)}
                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[var(--text-secondary)] font-mono focus:outline-none focus:border-[var(--accent-cyan)]"
                  />
                </div>
                <div className="col-span-4">
                  <label htmlFor={`transaction-properties-${idx}`} className="text-xs text-[var(--text-dimmed)] mb-1 block font-mono">관련 속성</label>
                  <input
                    id={`transaction-properties-${idx}`}
                    type="text"
                    value={Array.isArray(transaction.properties) ? transaction.properties.join(', ') : transaction.properties}
                    onChange={(e) => onTransactionChange(idx, 'properties', e.target.value.split(', '))}
                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[var(--text-secondary)] font-mono focus:outline-none focus:border-[var(--accent-cyan)]"
                    placeholder="property1, property2"
                  />
                </div>
              </div>
              {transaction.description && (
                <div className="mt-3">
                  <label htmlFor={`transaction-description-${idx}`} className="text-xs text-[var(--text-dimmed)] mb-1 block font-mono">설명</label>
                  <textarea
                    id={`transaction-description-${idx}`}
                    value={transaction.description}
                    onChange={(e) => onTransactionChange(idx, 'description', e.target.value)}
                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[var(--text-secondary)] font-mono focus:outline-none focus:border-[var(--accent-cyan)] resize-none"
                    rows={2}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-[var(--text-dimmed)] mt-2 font-mono">
          💡 트랜잭션 트리거와 관련 속성을 수정할 수 있습니다.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={onComplete}
          className="py-4 rounded text-[var(--text-secondary)] font-mono font-semibold bg-[var(--bg-tertiary)] border border-[var(--border)] hover:border-[var(--border-bright)] transition-all"
        >
          &lt; {t.generator.home}
        </button>
        <button
          onClick={onProceedToGeneration}
          className="py-5 rounded text-[var(--bg-primary)] font-mono font-bold text-lg bg-[var(--accent-green)] hover:bg-[var(--accent-green)]/80 transition-all terminal-glow-green"
        >
          &gt; {t.generator.proceedToDataGeneration}
        </button>
      </div>
    </div>
  );
}
