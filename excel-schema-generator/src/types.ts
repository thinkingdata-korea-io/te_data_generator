// ============================================================================
// Excel Generation Types - 4 Sheet Taxonomy Structure
// ============================================================================

/**
 * Input for Excel schema generation
 * - Only requires: industry, scenario, notes (no DAU or dates)
 */
export interface ExcelGenerationRequest {
  industry: string;    // 산업/카테고리 (예: 게임, 커머스, 금융)
  scenario: string;    // 서비스 시나리오 설명
  notes: string;       // 서비스 특징
}

// ============================================================================
// Sheet 1: #유저 ID 체계 (User ID System)
// ============================================================================

/**
 * Row structure for "유저 ID 체계" sheet
 * Columns: 유형 | 속성 이름 | 속성 별칭 | 속성 설명 | 값 설명
 */
export interface UserIdSystemRow {
  type: string;               // 유형 (예: 계정ID, 캐릭터ID, 게스트ID, 디바이스ID)
  propertyName: string;       // 속성 이름 (영문 snake_case, 예: account_id)
  propertyAlias: string;      // 속성 별칭 (한글)
  description: string;        // 속성 설명
  valueDescription: string;   // 값 설명 (생성 규칙 및 예시)
}

// ============================================================================
// Sheet 2: #이벤트 데이터 (Event Data)
// ============================================================================

/**
 * Row structure for "이벤트 데이터" sheet
 * Columns: 이벤트 이름(필수) | 이벤트 별칭 | 이벤트 설명 | 이벤트 태그 |
 *          속성 이름(필수) | 속성 별칭 | 속성 유형(필수) | 속성 설명
 */
export interface EventDataRow {
  eventName: string;           // 이벤트 이름 (필수, 영문 snake_case)
  eventAlias: string;          // 이벤트 별칭 (한글)
  eventDescription: string;    // 이벤트 설명 (발생 조건 및 타이밍)
  eventTag: string;            // 이벤트 태그 (카테고리, 예: 결제, 전투, 소셜)
  propertyName: string;        // 속성 이름 (필수, 영문 snake_case)
  propertyAlias: string;       // 속성 별칭 (한글)
  propertyType: PropertyType;  // 속성 유형 (필수)
  propertyDescription: string; // 속성 설명
}

/**
 * Valid property types for event and user data
 */
export type PropertyType =
  | 'string'        // 문자열 (Enum 값은 설명에 명시)
  | 'number'        // 숫자
  | 'boolean'       // true/false
  | 'time'          // 시간 (yyyy-MM-dd HH:mm:ss.SSS)
  | 'list'          // 문자열 배열 ["A", "B"]
  | 'object'        // 단일 객체 {key: value}
  | 'object group'; // 객체 배열 (하위 속성은 점 표기법)

// ============================================================================
// Sheet 3: #공통 이벤트 속성 (Common Event Properties)
// ============================================================================

/**
 * Row structure for "공통 이벤트 속성" sheet
 * Columns: 속성 이름(필수) | 속성 별칭 | 속성 유형(필수) | 속성 설명
 */
export interface CommonPropertyRow {
  propertyName: string;        // 속성 이름 (필수, 영문 snake_case)
  propertyAlias: string;       // 속성 별칭 (한글)
  propertyType: PropertyType;  // 속성 유형 (필수)
  description: string;         // 속성 설명
}

// ============================================================================
// Sheet 4: #유저 데이터 (User Data)
// ============================================================================

/**
 * Row structure for "유저 데이터" sheet
 * Columns: 속성 이름(필수) | 속성 별칭 | 속성 유형(필수) | 업데이트 방식 | 속성 설명 | 속성 태그
 */
export interface UserDataRow {
  propertyName: string;        // 속성 이름 (필수, 영문 snake_case)
  propertyAlias: string;       // 속성 별칭 (한글)
  propertyType: PropertyType;  // 속성 유형 (필수)
  updateMethod: UpdateMethod;  // 업데이트 방식
  description: string;         // 속성 설명
  tag: string;                 // 속성 태그 (분류, 예: 프로필, 재화, 성장, 활동)
}

/**
 * Valid user data update methods
 */
export type UpdateMethod =
  | 'userset'        // 값 덮어쓰기 또는 신규 추가
  | 'usersetonce'    // 최초 1회만 설정 (재설정 불가)
  | 'useradd'        // 숫자 누적 (증가/감소)
  | 'userunset'      // 값 삭제
  | 'userappend'     // 리스트에 요소 추가
  | 'useruniqappend'; // 리스트에 중복 제거 후 추가

// ============================================================================
// Complete Taxonomy Structure (for AI JSON response)
// ============================================================================

// ============================================================================
// Stage 1: Event Skeleton + Common Properties
// ============================================================================

/**
 * Event skeleton without properties
 */
export interface EventSkeleton {
  eventName: string;           // 이벤트 이름 (snake_case)
  eventAlias: string;          // 이벤트 별칭 (한글)
  eventDescription: string;    // 이벤트 설명
  eventTag: string;            // 이벤트 태그 (카테고리)
}

/**
 * Stage 1 output: Events + Common Properties + User ID System
 */
export interface Stage1Output {
  userIdSystem: UserIdSystemRow[];      // #유저 ID 체계
  events: EventSkeleton[];              // 이벤트 골격 (속성 없음)
  commonProperties: CommonPropertyRow[]; // #공통 이벤트 속성
}

// ============================================================================
// Stage 2: Event Properties
// ============================================================================

/**
 * Property for a specific event (without event info)
 */
export interface EventProperty {
  eventName: string;           // 해당 이벤트 이름
  propertyName: string;        // 속성 이름
  propertyAlias: string;       // 속성 별칭
  propertyType: PropertyType;  // 속성 유형
  propertyDescription: string; // 속성 설명
}

/**
 * Stage 2 output: Properties for each event
 */
export interface Stage2Output {
  eventProperties: EventProperty[]; // 이벤트별 속성들
}

// ============================================================================
// Stage 3: User Data
// ============================================================================

/**
 * Stage 3 output: User data properties
 */
export interface Stage3Output {
  userData: UserDataRow[]; // #유저 데이터
}

// ============================================================================
// Complete Taxonomy Structure (all stages combined)
// ============================================================================

/**
 * Complete taxonomy structure returned by AI
 * Matches the JSON format specified in taxonomy-generator-prompt.md
 */
export interface TaxonomyData {
  userIdSystem: UserIdSystemRow[];      // #유저 ID 체계
  eventData: EventDataRow[];            // #이벤트 데이터
  commonProperties: CommonPropertyRow[]; // #공통 이벤트 속성
  userData: UserDataRow[];              // #유저 데이터
}

// ============================================================================
// Excel Generation Result
// ============================================================================

/**
 * Result of Excel generation process
 */
export interface ExcelGenerationResult {
  success: boolean;
  filePath?: string;
  fileName?: string;
  error?: string;
  taxonomy?: TaxonomyData;
}
