import { User } from './user';

/**
 * 이벤트 데이터
 */
export interface EventData {
  event_name: string;
  timestamp: Date;
  user: User;
  properties: Record<string, any>;
}

/**
 * AI가 생성한 속성 범위
 */
export interface PropertyRange {
  property_name: string;
  type: 'number' | 'string' | 'boolean' | 'choice';

  // number 타입
  min?: number;
  max?: number;

  // choice 타입
  values?: (string | number)[];
  weights?: number[];

  // 세그먼트별 범위 (선택사항)
  segmentRanges?: Record<string, {
    min?: number;
    max?: number;
    values?: (string | number)[];
    weights?: number[];
  }>;
}

/**
 * AI가 생성한 이벤트별 범위
 */
export interface EventRanges {
  event_name: string;
  properties: PropertyRange[];
}

/**
 * AI가 분석한 리텐션 커브 (산업별 특성 반영)
 */
export interface RetentionCurve {
  // 산업별 기본 리텐션 파라미터
  industry: string;
  dayZeroRetention: number;  // Day 0 리텐션 (보통 1.0)
  day1Retention: number;      // Day 1 리텐션 (중요 지표)
  day7Retention: number;      // Day 7 리텐션
  day30Retention: number;     // Day 30 리텐션

  // 리텐션 감소율 (exponential decay)
  retentionDecay: number;     // 0.9 ~ 0.98 (높을수록 완만한 감소)

  // 세그먼트별 리텐션 가중치
  segmentMultipliers: Record<string, number>;  // segment -> multiplier (0.5 ~ 2.0)

  // 생명주기별 활동 확률
  lifecycleProbabilities: {
    new: number;         // 신규 유저
    active: number;      // 활성 유저
    returning: number;   // 복귀 유저
    dormant: number;     // 휴면 유저
    churned: number;     // 이탈 유저
  };

  // 생명주기 전환 임계값 (일 단위)
  lifecycleTransitionThresholds?: {
    dormantAfterDays: number;    // 활성 → 휴면 (예: 7일)
    churnedAfterDays: number;    // 휴면 → 이탈 (예: 30일)
  };

  // 특수 패턴
  weekendBoost?: number;      // 주말 활동 증가율 (1.0 = 변화없음, 1.5 = 50% 증가)
  monthlyReturnPattern?: boolean;  // 월간 복귀 패턴 (커머스 등)
}

/**
 * 트랜잭션 정의 (시작-종료 패턴)
 */
export interface Transaction {
  name: string;                   // 트랜잭션 이름 (예: "게임 라운드", "구매 프로세스")
  description: string;            // 설명
  startEvents: string[];          // 트랜잭션 시작 이벤트들
  endEvents: string[];            // 트랜잭션 종료 이벤트들
  innerEvents: string[];          // 트랜잭션 내부 이벤트들
  allowInnerAfterEnd: boolean;    // 종료 후 내부 이벤트 허용 여부 (기본: false)

  // 🆕 상태 유지 속성 (Pass-through Properties)
  passThroughProperties?: string[];  // 트랜잭션 내 모든 이벤트가 공유해야 하는 속성들

  // 🆕 내부 이벤트 순서 정의 (선택사항)
  innerEventSequence?: Array<{
    events: string[];             // 순서대로 실행할 이벤트 목록
    strictOrder: boolean;         // true: 반드시 순서 준수, false: 일부 생략 가능
  }>;

  // 🆕 트랜잭션 상태 전이 (선택사항, 고급 기능)
  transactionStates?: {
    states: string[];             // 가능한 상태 목록 (예: ["active", "paused", "ended"])
    allowedEvents: Record<string, string[]>;  // 각 상태에서 허용되는 이벤트들
    stateTransitions: Record<string, string[]>;  // 각 상태에서 전환 가능한 다음 상태들
  };
}

/**
 * 세그먼트별 이벤트 제약
 */
export interface SegmentEventConstraint {
  segmentName: string;                 // 세그먼트 이름 (예: "일반 시청자", "스트리머")
  blockedEvents?: string[];            // 이 세그먼트는 절대 수행할 수 없는 이벤트
  allowedEvents?: string[];            // 이 세그먼트만 독점적으로 수행 가능한 이벤트
  preferredEvents?: string[];          // 이 세그먼트가 선호하는 이벤트 (가중치 증가)
}

/**
 * 세그먼트 전환(Migration) 정의
 * 사용자가 시간이 지남에 따라 세그먼트 간 이동하는 규칙
 */
export interface SegmentMigration {
  fromSegment: string;              // 출발 세그먼트
  toSegment: string;                // 도착 세그먼트
  trigger: 'time' | 'event' | 'lifecycle';  // 전환 트리거 타입
  condition: string;                // 전환 조건 (예: "7일 경과 AND 5회 이상 접속")
  probability: number;              // 전환 확률 (0.0 ~ 1.0)
  description?: string;             // 설명
}

/**
 * AI가 분석한 이벤트 순서 제약
 */
export interface EventSequencing {
  // 🆕 트랜잭션 정의 (시작-종료 패턴)
  transactions?: Transaction[];

  // 필수 선행 이벤트 (강제)
  strictDependencies: Record<string, string[]>;  // event -> must_have_done_before

  // 이벤트 카테고리 및 실행 순서
  eventCategories: {
    lifecycle: string[];        // install, uninstall (한 번만, 세션 외부)
    session_start: string[];    // app_start (세션 시작)
    session_end: string[];      // app_end (세션 종료)
    onboarding: string[];       // tutorial_* (첫 세션에만)
    core: string[];             // 일반 서비스 이벤트
    monetization: string[];     // purchase, ad_* (특정 조건)
  };

  // 이벤트 실행 제약
  executionConstraints: Record<string, {
    maxOccurrencesPerSession?: number;  // 세션당 최대 발생 횟수
    maxOccurrencesPerUser?: number;     // 유저당 최대 발생 횟수
    requiresFirstSession?: boolean;      // 첫 세션에만 발생
    minimumSessionNumber?: number;       // 최소 N번째 세션부터 가능
    blockedAfterEvents?: string[];       // 특정 이벤트 이후 차단
  }>;

  // 🆕 이벤트별 시간 간격 설정 (선택사항)
  eventIntervals?: Record<string, {
    avgSeconds: number;           // 평균 시간 간격 (초)
    distribution?: 'exponential' | 'normal' | 'uniform';  // 분포 타입 (기본: exponential)
    minSeconds?: number;          // 최소 시간 간격
    maxSeconds?: number;          // 최대 시간 간격
    segmentMultipliers?: Record<string, number>;  // 세그먼트별 시간 가중치 (예: "신규 사용자": 2.0)
  }>;

  // 논리적 이벤트 순서 (funnel)
  logicalSequences: Array<{
    name: string;
    description: string;
    sequence: string[];          // 순서대로 실행되어야 하는 이벤트
    strictOrder: boolean;        // true: 반드시 순서 지킴, false: 일부 생략 가능
  }>;
}

/**
 * 검증 요약
 */
export interface ValidationSummary {
  passed: boolean;
  ruleBasedPassed: boolean;
  aiValidationUsed: boolean;
  fixAttempts: number;
  errors: string[];
  warnings: string[];
}

/**
 * AI 분석 결과
 */
export interface AIAnalysisResult {
  // 유저 세그먼트
  userSegments: Array<{
    name: string;
    ratio: number;
    characteristics: string;
  }>;

  // 이벤트 의존성 (기존 - 하위호환)
  eventDependencies: Record<string, string[]>;  // event_name -> required events

  // AI 기반 이벤트 그룹핑 (Phase 1에서 생성, Phase 2에서 사용)
  eventGroups?: Record<string, string[]>;  // group_name -> event_names

  // 이벤트별 속성 범위
  eventRanges: EventRanges[];

  // 세션 패턴
  sessionPatterns: {
    avgSessionsPerDay: Record<string, number>;  // segment -> sessions
    avgSessionDuration: Record<string, number>;  // segment -> milliseconds
    avgEventsPerSession: Record<string, number>;  // segment -> count
  };

  // 🆕 리텐션 커브 (AI 분석)
  retentionCurve?: RetentionCurve;

  // 🆕 이벤트 순서 제약 (AI 분석)
  eventSequencing?: EventSequencing;

  // 🆕 세그먼트별 이벤트 제약 (AI 분석)
  segmentEventConstraints?: SegmentEventConstraint[];

  // 🆕 세그먼트 전환 규칙 (AI 분석 - 동적 페르소나)
  segmentMigrations?: SegmentMigration[];

  // 🆕 검증 요약
  validationSummary?: {
    retention?: ValidationSummary;
    sequencing?: ValidationSummary;
  };

  // 🆕 마케팅 데이터 범위 (AI 분석 - 산업별 맞춤)
  marketingRanges?: MarketingRanges;

  // 🆕 속성 간 상관관계 (AI 분석)
  propertyCorrelations?: PropertyCorrelation[];

  // 🆕 시간 분포 패턴 (AI 분석)
  timingDistribution?: TimingDistribution;

  // 🆕 일관성 그룹 (시스템 프리셋 + 엑셀 통합)
  consistencyGroups?: ConsistencyGroup[];

  // 🆕 속성 일관성 정의 (개별 속성 매핑)
  propertyConsistency?: PropertyConsistencyDefinition[];
}

/**
 * 시간 분포 패턴 (AI가 산업/세그먼트별로 정의)
 */
export interface TimingDistribution {
  // 시간대별 활동 가중치 (0~23시)
  hourlyWeights: number[];  // 길이 24, 합계 1.0

  // 세그먼트별 피크 시간 (선택사항)
  segmentPeakHours?: Record<string, { start: number; end: number }>;

  // 요일별 가중치 (0=일요일, 6=토요일)
  weekdayMultipliers?: number[];  // 길이 7, 기본값 1.0

  // 🆕 이벤트별 시간 패턴 오버라이드 (선택사항)
  eventTimingOverrides?: Record<string, {
    hourlyWeights: number[];  // 이벤트별 시간 가중치 (전역 패턴 덮어쓰기)
    description?: string;     // 설명 (예: "아침 7-9시 집중")
  }>;
}

/**
 * 속성 간 상관관계 정의
 * 🆕 formula, identity, consistent_random 타입 추가
 */
export interface PropertyCorrelation {
  sourceProperty: string | string[];  // 🆕 기준 속성 (단일 or 배열)
  targetProperty: string;              // 영향받는 속성 (예: "discount_rate")
  correlationType: 'positive' | 'negative' | 'conditional' | 'formula' | 'identity' | 'consistent_random';
  strength?: number;                   // 0.0 ~ 1.0 (상관 강도, formula에서는 미사용)
  description?: string;                // 설명

  // conditional: 조건부 매핑
  conditions?: Array<{
    sourceValue: any;                  // 조건 값
    targetRange?: { min: number; max: number };
    targetValues?: any[];
  }>;

  // 🆕 formula: 수식 관계 (예: "quantity * unit_price")
  formula?: string;                    // JavaScript 수식 문자열
  formulaType?: 'multiply' | 'divide' | 'add' | 'subtract' | 'custom';  // 수식 타입

  // 🆕 identity: 고정 매핑 (예: 상품명 → 가격)
  identityMap?: Record<string, any>;   // 소스값 → 타겟값 매핑

  // 🆕 consistent_random: 같은 소스값 → 같은 랜덤값 유지
  consistentRandomRange?: { min: number; max: number };  // 랜덤 범위
  consistentRandomValues?: any[];                         // 랜덤 선택 후보
}

/**
 * 🆕 일관성 그룹 정의 (AI 분석 결과)
 * 서로 일치해야 하는 속성들을 그룹으로 정의
 */
export interface ConsistencyGroup {
  groupName: string;                // 그룹 이름 (예: "location", "transaction")
  level: 'user' | 'session' | 'transaction' | 'event';  // 일관성 유지 레벨
  properties: string[];             // 그룹에 속한 속성들
  basedOn?: string;                 // 기준 속성 (예: "countryCode")
  dependencies?: Record<string, string[]>;  // 속성 의존성 (예: countryCode -> [city, ip])
  strategy: 'preset' | 'ai_range' | 'faker' | 'uuid';  // 생성 전략
  description: string;              // 설명
  source: 'system' | 'excel' | 'integrated';  // 출처 (시스템/엑셀/통합)
}

/**
 * 🆕 속성 일관성 정의 (개별 속성)
 */
export interface PropertyConsistencyDefinition {
  propertyName: string;             // 속성 이름
  level: 'user' | 'session' | 'transaction' | 'event';  // 일관성 레벨
  consistencyGroup?: string;        // 속한 일관성 그룹
  isPreset: boolean;                // 시스템 프리셋 여부
  source: 'system' | 'excel';       // 출처
}

/**
 * 마케팅 데이터 범위 (AI 분석 결과)
 * 산업별 맞춤 광고 메트릭 범위
 */
export interface MarketingRanges {
  // 광고 메트릭 범위
  metrics: {
    clicks: { min: number; max: number };
    impressions: { min: number; max: number };
    cost: { min: number; max: number; currency: string };
    conversions: { min: number; max: number };
    installs: { min: number; max: number };
    revenue: { min: number; max: number; currency: string };
  };

  // 광고 소스 가중치 (AI가 산업별로 조정)
  mediaSources: Array<{
    name: string;
    weight: number;
    description?: string;
  }>;

  // 광고 네트워크 (ad_revenue용)
  adRevenueNetworks?: Array<{
    name: string;
    weight: number;
  }>;

  // 광고 유닛 타입
  adUnitTypes?: Array<{
    name: string;
    weight: number;
    avgRevenue?: { min: number; max: number };
  }>;

  // 광고 대행사
  agencies?: string[];

  // 광고 게재 위치
  placements?: string[];
}
