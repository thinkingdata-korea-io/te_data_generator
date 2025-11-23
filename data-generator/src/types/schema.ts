/**
 * Excel 스키마 파싱 결과 타입
 */

export interface EventDefinition {
  event_name: string;
  event_name_kr: string;
  category: string;  // system, transaction, interaction 등
  required_previous_events?: string[];  // 선행 이벤트
  user_lifecycle_stage?: string[];  // new, active, returning, churned
  trigger_probability?: number;  // 0-1
}

export interface PropertyDefinition {
  property_name: string;
  property_name_kr: string;
  data_type: string;  // string, number, boolean, date, object, object group
  event_name?: string;  // 특정 이벤트에만 속하는 경우
  description?: string;

  // Object group 관련 메타데이터
  is_object_group?: boolean;       // true면 object group (객체 배열)
  is_object?: boolean;              // true면 object (단일 객체)
  parent_property?: string;         // 부모 속성 이름 (예: "achievement_rewards")
  is_nested_property?: boolean;     // true면 중첩 속성 (property_name에 "." 포함)
}

export interface FunnelDefinition {
  name: string;
  description?: string;
  steps: string[];  // event_name 배열
  conversion_rate?: number;  // 전체 퍼널 전환율
}

export interface UserSegment {
  name: string;
  ratio?: number;  // AI가 결정
  characteristics?: string;  // AI가 분석한 특성
}

export interface UserDataDefinition {
  property_name: string;
  property_name_kr: string;
  data_type: string;
  update_method: string;  // userset, usersetonce, useradd, etc.
  description?: string;
  tag?: string;
}

/**
 * 파싱된 Excel 스키마
 */
export interface ParsedSchema {
  events: EventDefinition[];
  properties: PropertyDefinition[];
  funnels: FunnelDefinition[];
  userData: UserDataDefinition[];
  userSegments?: UserSegment[];  // AI가 생성
}
