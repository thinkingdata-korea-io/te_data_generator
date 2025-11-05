import { CountryConfig } from './country';

/**
 * 유저 생명주기 상태
 */
export type UserLifecycleStage = 'new' | 'active' | 'returning' | 'dormant' | 'churned';

/**
 * 유저 정보
 */
export interface User {
  // 기본 식별자
  account_id: string;
  distinct_id: string;

  // 세그먼트 (AI 결정)
  segment: string;

  // 생명주기
  lifecycle_stage: UserLifecycleStage;
  install_date: Date;
  last_active_date?: Date;

  // 국가별 정보 (Faker.js 생성)
  country: string;
  countryCode: string;
  locale: string;
  name: string;
  email: string;
  phone?: string;

  // 디바이스 정보
  os: string;
  os_version: string;
  device_model: string;
  device_id: string;

  // 네트워크 정보
  ip: string;
  carrier?: string;
  network_type: string;

  // 통계
  total_sessions: number;
  total_events: number;
}

/**
 * 세션 정보
 */
export interface Session {
  session_id: string;
  user: User;
  start: Date;
  end: Date;
  duration: number;  // milliseconds
  event_count: number;
}

/**
 * 유저 생성 설정
 */
export interface UserGenerationConfig {
  dau: number;
  dateRange: {
    start: Date;
    end: Date;
  };
  countryConfigs: CountryConfig[];
  segmentRatios: Record<string, number>;  // AI가 결정
}
