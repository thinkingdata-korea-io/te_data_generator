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
 * AI 분석 결과
 */
export interface AIAnalysisResult {
  // 유저 세그먼트
  userSegments: Array<{
    name: string;
    ratio: number;
    characteristics: string;
  }>;

  // 이벤트 의존성
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
}
