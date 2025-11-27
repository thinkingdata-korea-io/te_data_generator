'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { AIAnalysisResult, UserSegment, EventSequence, Transaction } from '../types';

interface AIAnalysisReviewProps {
  aiAnalysisResult: AIAnalysisResult;
  editedSegments: UserSegment[];
  editedEventSequences: EventSequence[];
  editedTransactions: Transaction[];
  onSegmentChange: (index: number, field: string, value: string | number) => void;
  onEventSequenceChange: (index: number, field: string, value: string | number | string[]) => void;
  onTransactionChange: (index: number, field: string, value: string | number | string[]) => void;
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
  const [activeTab, setActiveTab] = useState<'segments' | 'sequences' | 'transactions'>('segments');

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

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 border-b border-[var(--border)]">
        <button
          onClick={() => setActiveTab('segments')}
          className={`px-6 py-3 font-mono font-semibold transition-all relative ${
            activeTab === 'segments'
              ? 'text-[var(--accent-cyan)] border-b-2 border-[var(--accent-cyan)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          👥 사용자 세그먼트
        </button>
        <button
          onClick={() => setActiveTab('sequences')}
          className={`px-6 py-3 font-mono font-semibold transition-all relative ${
            activeTab === 'sequences'
              ? 'text-[var(--accent-cyan)] border-b-2 border-[var(--accent-cyan)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          🔄 이벤트 순서 규칙
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-6 py-3 font-mono font-semibold transition-all relative ${
            activeTab === 'transactions'
              ? 'text-[var(--accent-cyan)] border-b-2 border-[var(--accent-cyan)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          💰 트랜잭션 정의
        </button>
      </div>

      {/* Tab Content */}
      <div className="mb-8">
        {/* User Segments Tab */}
        {activeTab === 'segments' && (
          <div>
            <div className="mb-4 p-4 bg-[var(--accent-cyan)]/5 border border-[var(--accent-cyan)]/30 rounded">
              <p className="text-sm text-[var(--text-secondary)] font-mono">
                💡 <strong>사용자 세그먼트</strong>는 전체 사용자를 특성에 따라 그룹화한 것입니다.
                각 세그먼트의 비율, 세션 패턴 등을 조정하여 데이터 생성 전략을 세밀하게 제어할 수 있습니다.
              </p>
            </div>
            <div className="space-y-4">
              {editedSegments.map((segment: any, idx: number) => (
                <div key={idx} className="bg-[var(--bg-primary)] border-2 border-[var(--border)] rounded-lg p-6 hover:border-[var(--accent-cyan)] transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <label htmlFor={`segment-name-${idx}`} className="text-xs text-[var(--text-dimmed)] mb-1 block font-mono">세그먼트명</label>
                      <input
                        id={`segment-name-${idx}`}
                        type="text"
                        value={segment.name}
                        onChange={(e) => onSegmentChange(idx, 'name', e.target.value)}
                        className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded px-4 py-2 text-lg font-bold text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent-cyan)]"
                        aria-label={`세그먼트명 ${idx + 1}`}
                      />
                    </div>
                    <div className="ml-4 w-32">
                      <label htmlFor={`segment-percentage-${idx}`} className="text-xs text-[var(--text-dimmed)] mb-1 block font-mono">비율 (%)</label>
                      <input
                        id={`segment-percentage-${idx}`}
                        type="number"
                        value={segment.percentage}
                        onChange={(e) => onSegmentChange(idx, 'percentage', parseFloat(e.target.value))}
                        className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded px-4 py-2 text-2xl font-bold text-[var(--accent-cyan)] font-mono text-center focus:outline-none focus:border-[var(--accent-cyan)]"
                        min="0"
                        max="100"
                        step="0.1"
                        aria-label={`세그먼트 비율 ${idx + 1}`}
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="text-xs text-[var(--text-dimmed)] mb-1 block font-mono">
                      특성 <span className="text-[var(--text-dimmed)]">(이 세그먼트의 사용자 행동 특징)</span>
                    </label>
                    <textarea
                      value={segment.characteristics}
                      onChange={(e) => onSegmentChange(idx, 'characteristics', e.target.value)}
                      className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded px-4 py-3 text-sm text-[var(--text-secondary)] font-mono focus:outline-none focus:border-[var(--accent-cyan)] resize-none"
                      rows={3}
                      placeholder="예: 첫 가입 및 온보딩 진행, 튜토리얼 학습 중, 기본 탐색"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label htmlFor={`segment-sessions-${idx}`} className="text-xs text-[var(--text-dimmed)] mb-1 block font-mono flex items-center gap-1">
                        평균 세션/일
                        <span className="cursor-help" title="하루에 이 세그먼트 사용자가 평균적으로 몇 번 앱을 사용하는지">ⓘ</span>
                      </label>
                      <input
                        id={`segment-sessions-${idx}`}
                        type="number"
                        value={segment.avgSessionsPerDay}
                        onChange={(e) => onSegmentChange(idx, 'avgSessionsPerDay', parseFloat(e.target.value))}
                        className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded px-4 py-2 text-sm text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent-cyan)]"
                        min="0"
                        step="0.1"
                        placeholder="예: 2"
                        aria-label={`평균 세션/일 ${idx + 1}`}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[var(--text-dimmed)] mb-1 block font-mono flex items-center gap-1">
                        평균 세션 시간
                        <span className="cursor-help" title="한 번의 세션에서 머무는 평균 시간 (예: 15m 30s)">ⓘ</span>
                      </label>
                      <input
                        type="text"
                        value={segment.avgSessionDuration}
                        onChange={(e) => onSegmentChange(idx, 'avgSessionDuration', e.target.value)}
                        className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded px-4 py-2 text-sm text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent-cyan)]"
                        placeholder="예: 15m 0s"
                      />
                    </div>
                    <div>
                      <label htmlFor={`segment-events-${idx}`} className="text-xs text-[var(--text-dimmed)] mb-1 block font-mono flex items-center gap-1">
                        평균 이벤트/세션
                        <span className="cursor-help" title="한 세션 동안 발생하는 평균 이벤트 수">ⓘ</span>
                      </label>
                      <input
                        id={`segment-events-${idx}`}
                        type="number"
                        value={segment.avgEventsPerSession}
                        onChange={(e) => onSegmentChange(idx, 'avgEventsPerSession', parseFloat(e.target.value))}
                        className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded px-4 py-2 text-sm text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent-cyan)]"
                        min="0"
                        step="0.1"
                        aria-label={`평균 이벤트/세션 ${idx + 1}`}
                        placeholder="예: 12"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Event Sequences Tab */}
        {activeTab === 'sequences' && (
          <div>
            <div className="mb-4 p-4 bg-[var(--accent-cyan)]/5 border border-[var(--accent-cyan)]/30 rounded">
              <p className="text-sm text-[var(--text-secondary)] font-mono">
                💡 <strong>이벤트 순서 규칙</strong>은 사용자가 따를 가능성이 높은 이벤트 흐름(퍼널)을 정의합니다.
                예를 들어 "회원가입 → 프로필작성 → 첫구매" 같은 순서를 설정하고, 각 순서가 발생할 확률을 조정할 수 있습니다.
              </p>
            </div>
            <div className="space-y-4">
              {editedEventSequences.map((sequence: any, idx: number) => (
                <div key={idx} className="bg-[var(--bg-primary)] border-2 border-[var(--border)] rounded-lg p-6 hover:border-[var(--accent-cyan)] transition-all">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="flex-1">
                      <label className="text-xs text-[var(--text-dimmed)] mb-1 block font-mono">시퀀스 이름</label>
                      <input
                        type="text"
                        value={sequence.name}
                        onChange={(e) => onEventSequenceChange(idx, 'name', e.target.value)}
                        className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded px-4 py-2 text-lg font-bold text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent-cyan)]"
                        placeholder="예: 신규 유저 온보딩"
                      />
                    </div>
                    <div className="w-32">
                      <label htmlFor={`sequence-probability-${idx}`} className="text-xs text-[var(--text-dimmed)] mb-1 block font-mono flex items-center gap-1">
                        확률 (%)
                        <span className="cursor-help" title="이 시퀀스가 발생할 확률">ⓘ</span>
                      </label>
                      <input
                        id={`sequence-probability-${idx}`}
                        type="number"
                        value={sequence.probability}
                        onChange={(e) => onEventSequenceChange(idx, 'probability', parseFloat(e.target.value))}
                        className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded px-4 py-2 text-xl font-bold text-[var(--accent-cyan)] font-mono text-center focus:outline-none focus:border-[var(--accent-cyan)]"
                        aria-label={`이벤트 시퀀스 확률 ${idx + 1}`}
                        min="0"
                        max="100"
                        step="0.1"
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="text-xs text-[var(--text-dimmed)] mb-1 block font-mono flex items-center gap-1">
                      이벤트 순서
                      <span className="text-[var(--text-dimmed)]">(화살표 '→'로 구분)</span>
                    </label>
                    <input
                      type="text"
                      value={Array.isArray(sequence.events) ? sequence.events.join(' → ') : sequence.events}
                      onChange={(e) => onEventSequenceChange(idx, 'events', e.target.value.split(' → '))}
                      className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded px-4 py-3 text-sm text-[var(--text-secondary)] font-mono focus:outline-none focus:border-[var(--accent-cyan)]"
                      placeholder="event1 → event2 → event3"
                    />
                  </div>

                  {sequence.description && (
                    <div>
                      <label className="text-xs text-[var(--text-dimmed)] mb-1 block font-mono">설명</label>
                      <textarea
                        value={sequence.description}
                        onChange={(e) => onEventSequenceChange(idx, 'description', e.target.value)}
                        className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded px-4 py-3 text-sm text-[var(--text-secondary)] font-mono focus:outline-none focus:border-[var(--accent-cyan)] resize-none"
                        rows={2}
                        placeholder="이 시퀀스에 대한 설명"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div>
            <div className="mb-4 p-4 bg-[var(--accent-cyan)]/5 border border-[var(--accent-cyan)]/30 rounded">
              <p className="text-sm text-[var(--text-secondary)] font-mono">
                💡 <strong>트랜잭션 정의</strong>는 특정 이벤트가 발생할 때 함께 기록되어야 하는 비즈니스 로직을 정의합니다.
                예를 들어 "결제완료" 이벤트 발생 시 "금액, 상품ID, 결제수단" 같은 속성들이 함께 기록되도록 설정할 수 있습니다.
              </p>
            </div>
            <div className="space-y-4">
              {editedTransactions.map((transaction: any, idx: number) => (
                <div key={idx} className="bg-[var(--bg-primary)] border-2 border-[var(--border)] rounded-lg p-6 hover:border-[var(--accent-cyan)] transition-all">
                  <div className="mb-4">
                    <label className="text-xs text-[var(--text-dimmed)] mb-1 block font-mono">트랜잭션명</label>
                    <input
                      type="text"
                      value={transaction.name}
                      onChange={(e) => onTransactionChange(idx, 'name', e.target.value)}
                      className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded px-4 py-2 text-lg font-bold text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent-cyan)]"
                      placeholder="예: 게임 라운드"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-xs text-[var(--text-dimmed)] mb-1 block font-mono flex items-center gap-1">
                        트리거 이벤트
                        <span className="cursor-help" title="이 트랜잭션을 시작하는 이벤트">ⓘ</span>
                      </label>
                      <input
                        type="text"
                        value={transaction.triggerEvent}
                        onChange={(e) => onTransactionChange(idx, 'triggerEvent', e.target.value)}
                        className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded px-4 py-3 text-sm text-[var(--text-secondary)] font-mono focus:outline-none focus:border-[var(--accent-cyan)]"
                        placeholder="예: event1"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[var(--text-dimmed)] mb-1 block font-mono flex items-center gap-1">
                        관련 속성
                        <span className="cursor-help" title="이 트랜잭션과 함께 기록될 속성들 (쉼표로 구분)">ⓘ</span>
                      </label>
                      <input
                        type="text"
                        value={Array.isArray(transaction.properties) ? transaction.properties.join(', ') : transaction.properties}
                        onChange={(e) => onTransactionChange(idx, 'properties', e.target.value.split(', '))}
                        className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded px-4 py-3 text-sm text-[var(--text-secondary)] font-mono focus:outline-none focus:border-[var(--accent-cyan)]"
                        placeholder="property1, property2"
                      />
                    </div>
                  </div>

                  {transaction.description && (
                    <div>
                      <label className="text-xs text-[var(--text-dimmed)] mb-1 block font-mono">설명</label>
                      <textarea
                        value={transaction.description}
                        onChange={(e) => onTransactionChange(idx, 'description', e.target.value)}
                        className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded px-4 py-3 text-sm text-[var(--text-secondary)] font-mono focus:outline-none focus:border-[var(--accent-cyan)] resize-none"
                        rows={2}
                        placeholder="이 트랜잭션에 대한 설명"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
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
