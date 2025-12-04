/**
 * 시스템 프리셋 속성 정의
 *
 * 2-Tier 속성 시스템:
 * - Tier 1: 시스템 필수 속성 (항상 생성)
 * - Tier 2: AI 정의 속성 (엑셀 + 프리셋 통합)
 */

/**
 * 일관성 레벨
 */
export type ConsistencyLevel = 'user' | 'session' | 'transaction' | 'event';

/**
 * 생성 전략
 */
export type GenerationStrategy = 'preset' | 'ai_range' | 'faker' | 'uuid';

/**
 * 시스템 필수 속성 (항상 생성)
 */
export const REQUIRED_PROPERTIES = {
  user: [
    'account_id',
    'distinct_id',
    'segment',
    'lifecycle_stage',
  ],
  location: [
    'country',
    'countryCode',
    'locale',
  ],
  device: [
    'os',
    'device_id',
  ],
} as const;

/**
 * 선택적 확장 속성 (AI가 엑셀과 통합하여 사용)
 */
export const OPTIONAL_PROPERTIES = {
  location: [
    'city',
    'state',
    'region',
    'timezone',
    'ip',
    'carrier',
  ],
  device: [
    'os_version',
    'device_model',
    'manufacturer',
    'screen_width',
    'screen_height',
  ],
  network: [
    'network_type',
    'carrier',
  ],
  personal: [
    'name',
    'email',
    'phone',
  ],
} as const;

/**
 * 일관성 규칙 정의
 */
export interface ConsistencyRule {
  groupName: string;
  level: ConsistencyLevel;
  basedOn?: string;  // 기준 속성 (예: countryCode)
  generates: string[];  // 생성되는 속성들
  strategy: GenerationStrategy;
  description: string;
}

/**
 * 시스템 프리셋 일관성 규칙
 */
export const PRESET_CONSISTENCY_RULES: ConsistencyRule[] = [
  {
    groupName: 'location',
    level: 'user',
    basedOn: 'countryCode',
    generates: ['country', 'city', 'state', 'region', 'timezone', 'ip', 'carrier'],
    strategy: 'preset',
    description: '국가 코드 기반으로 위치 관련 모든 속성 생성 (일관성 보장)'
  },
  {
    groupName: 'device',
    level: 'user',
    basedOn: 'os',
    generates: ['device_model', 'os_version', 'manufacturer'],
    strategy: 'preset',
    description: 'OS 기반으로 디바이스 속성 생성 (Android는 Android 모델만)'
  },
  {
    groupName: 'personal',
    level: 'user',
    basedOn: 'locale',
    generates: ['name', 'email', 'phone'],
    strategy: 'faker',
    description: '로케일 기반으로 개인 정보 생성'
  },
  {
    groupName: 'session',
    level: 'session',
    basedOn: undefined,
    generates: ['session_id'],
    strategy: 'uuid',
    description: '세션 시작 시 UUID 생성'
  },
  {
    groupName: 'transaction',
    level: 'transaction',
    basedOn: undefined,
    generates: [],  // AI가 엑셀에서 발견하여 추가
    strategy: 'uuid',
    description: '트랜잭션 시작 시 관련 ID 생성 (order_id, payment_id 등)'
  },
];

/**
 * 프리셋 속성 의존성 맵
 */
export const PROPERTY_DEPENDENCIES: Record<string, string[]> = {
  // 국가 코드가 변경되면 이 속성들도 함께 변경되어야 함
  'countryCode': ['country', 'city', 'state', 'ip', 'carrier', 'timezone'],

  // OS가 변경되면 이 속성들도 함께 변경되어야 함
  'os': ['device_model', 'os_version', 'manufacturer'],

  // 로케일이 변경되면 이 속성들도 함께 변경되어야 함
  'locale': ['name', 'email', 'phone'],
};

/**
 * 속성이 프리셋인지 확인
 */
export function isPresetProperty(propertyName: string): boolean {
  const allProperties = [
    ...REQUIRED_PROPERTIES.user,
    ...REQUIRED_PROPERTIES.location,
    ...REQUIRED_PROPERTIES.device,
    ...OPTIONAL_PROPERTIES.location,
    ...OPTIONAL_PROPERTIES.device,
    ...OPTIONAL_PROPERTIES.network,
    ...OPTIONAL_PROPERTIES.personal,
  ];

  return allProperties.includes(propertyName as any);
}

/**
 * 속성의 일관성 레벨 가져오기
 */
export function getPropertyLevel(propertyName: string): ConsistencyLevel {
  // 프리셋 규칙에서 찾기
  for (const rule of PRESET_CONSISTENCY_RULES) {
    if (rule.generates.includes(propertyName) || rule.basedOn === propertyName) {
      return rule.level;
    }
  }

  // 기본값: event 레벨
  return 'event';
}

/**
 * AI 분석 시 제공할 프리셋 컨텍스트
 */
export function getPresetContext() {
  return {
    requiredProperties: REQUIRED_PROPERTIES,
    optionalProperties: OPTIONAL_PROPERTIES,
    consistencyRules: PRESET_CONSISTENCY_RULES,
    dependencies: PROPERTY_DEPENDENCIES,
    description: `
시스템이 제공하는 프리셋 속성들입니다.

**중요 사항**:
1. 필수 속성(requiredProperties)은 항상 User에 포함됩니다
2. 선택 속성(optionalProperties)은 엑셀에 해당 속성이 있을 경우 통합됩니다
3. 일관성 규칙(consistencyRules)은 속성 간 의존 관계를 정의합니다
4. 엑셀에 위치 관련 속성(store_region, store_city 등)이 있으면 location 그룹에 추가하세요
5. 엑셀에 거래 관련 ID(order_id, payment_id 등)가 있으면 transaction 그룹에 추가하세요
    `.trim(),
  };
}

/**
 * 시스템 프리셋 속성 전체 목록
 */
export const ALL_PRESET_PROPERTIES = [
  ...REQUIRED_PROPERTIES.user,
  ...REQUIRED_PROPERTIES.location,
  ...REQUIRED_PROPERTIES.device,
  ...OPTIONAL_PROPERTIES.location,
  ...OPTIONAL_PROPERTIES.device,
  ...OPTIONAL_PROPERTIES.network,
  ...OPTIONAL_PROPERTIES.personal,
] as const;

export type PresetProperty = typeof ALL_PRESET_PROPERTIES[number];
