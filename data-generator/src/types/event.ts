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

  // 🆕 검증 요약
  validationSummary?: {
    retention?: ValidationSummary;
    sequencing?: ValidationSummary;
  };
}
