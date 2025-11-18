import { EventDefinition, PropertyDefinition } from '../types';

/**
 * 마케팅 어트리뷰션 고정 스키마
 *
 * 이 스키마는 Adjust SDK와 ThinkingEngine의 통합 규격입니다.
 * Excel에는 포함되지 않고, data-generator에서 자동으로 추가됩니다.
 *
 * @see docs/marketing_attribution_spec.md
 */

/**
 * 마케팅 이벤트 정의
 */
export const MARKETING_EVENTS: EventDefinition[] = [
  {
    event_name: 'install',
    event_name_kr: '앱 설치',
    category: '마케팅',
    trigger_probability: 1.0 // 설치는 모든 사용자에게 1회 발생
  },
  {
    event_name: 'adjust_ad_revenue',
    event_name_kr: '광고 수익',
    category: '수익화',
    trigger_probability: 0.3 // 약 30%의 사용자가 광고 시청
  }
];

/**
 * install 이벤트 속성
 */
export const INSTALL_EVENT_PROPERTIES: PropertyDefinition[] = [
  // 기본 Adjust 속성
  {
    property_name: 'activity_kind',
    property_name_kr: '활동 유형',
    data_type: 'string',
    event_name: 'install',
    description: 'Adjust 활동 유형 (보통 "install")'
  },
  {
    property_name: 'adgroup_name',
    property_name_kr: '광고 그룹 이름',
    data_type: 'string',
    event_name: 'install',
    description: '광고 그룹 이름'
  },
  {
    property_name: 'app_id',
    property_name_kr: '앱 ID',
    data_type: 'string',
    event_name: 'install',
    description: '앱 식별자 (Bundle ID / Package name)'
  },
  {
    property_name: 'app_name',
    property_name_kr: '앱 이름',
    data_type: 'string',
    event_name: 'install',
    description: '앱 이름'
  },
  {
    property_name: 'app_version',
    property_name_kr: '앱 버전',
    data_type: 'string',
    event_name: 'install',
    description: '설치된 앱 버전'
  },
  {
    property_name: 'campaign_name',
    property_name_kr: '캠페인 이름',
    data_type: 'string',
    event_name: 'install',
    description: '광고 캠페인 이름'
  },
  {
    property_name: 'country',
    property_name_kr: '국가',
    data_type: 'string',
    event_name: 'install',
    description: '설치 국가 코드 (ISO 3166-1 alpha-2)'
  },
  {
    property_name: 'created_at_milli',
    property_name_kr: '생성 시각',
    data_type: 'string',
    event_name: 'install',
    description: 'Unix timestamp (milliseconds)'
  },
  {
    property_name: 'creative_name',
    property_name_kr: '소재 이름',
    data_type: 'string',
    event_name: 'install',
    description: '광고 소재 이름'
  },
  {
    property_name: 'network_name',
    property_name_kr: '광고 네트워크',
    data_type: 'string',
    event_name: 'install',
    description: '광고 네트워크 이름 (예: Google Ads, Facebook)'
  },
  {
    property_name: 'os_name',
    property_name_kr: '운영체제',
    data_type: 'string',
    event_name: 'install',
    description: '운영체제 (ios, android)'
  },
  {
    property_name: 'publisher_parameters',
    property_name_kr: '퍼블리셔 파라미터',
    data_type: 'string',
    event_name: 'install',
    description: '추가 파라미터 (JSON string)'
  },
  {
    property_name: 'ta_account_id',
    property_name_kr: '계정 ID',
    data_type: 'string',
    event_name: 'install',
    description: '사용자 계정 ID'
  },
  {
    property_name: 'ta_distinct_id',
    property_name_kr: '고유 ID',
    data_type: 'string',
    event_name: 'install',
    description: '디바이스 고유 ID'
  },
  {
    property_name: 'timezone',
    property_name_kr: '타임존',
    data_type: 'string',
    event_name: 'install',
    description: '사용자 타임존'
  },

  // te_ads_object (광고 상세 정보) - object 타입
  {
    property_name: 'te_ads_object',
    property_name_kr: '광고 정보',
    data_type: 'object',
    event_name: 'install',
    description: '광고 상세 정보 객체'
  },
  {
    property_name: 'te_ads_object.ad_account_id',
    property_name_kr: '광고 계정 ID',
    data_type: 'string',
    event_name: 'install',
    description: '광고 계정 ID'
  },
  {
    property_name: 'te_ads_object.ad_group_id',
    property_name_kr: '광고 그룹 ID',
    data_type: 'string',
    event_name: 'install',
    description: '광고 그룹 ID'
  },
  {
    property_name: 'te_ads_object.ad_group_name',
    property_name_kr: '광고 그룹 이름',
    data_type: 'string',
    event_name: 'install',
    description: '광고 그룹 이름'
  },
  {
    property_name: 'te_ads_object.ad_id',
    property_name_kr: '광고 ID',
    data_type: 'string',
    event_name: 'install',
    description: '광고 ID'
  },
  {
    property_name: 'te_ads_object.ad_name',
    property_name_kr: '광고 이름',
    data_type: 'string',
    event_name: 'install',
    description: '광고 소재 이름'
  },
  {
    property_name: 'te_ads_object.agency',
    property_name_kr: '대행사',
    data_type: 'string',
    event_name: 'install',
    description: '광고 대행사 이름'
  },
  {
    property_name: 'te_ads_object.app_id',
    property_name_kr: '앱 ID',
    data_type: 'string',
    event_name: 'install',
    description: '앱 식별자'
  },
  {
    property_name: 'te_ads_object.app_name',
    property_name_kr: '앱 이름',
    data_type: 'string',
    event_name: 'install',
    description: '앱 이름'
  },
  {
    property_name: 'te_ads_object.campaign_id',
    property_name_kr: '캠페인 ID',
    data_type: 'string',
    event_name: 'install',
    description: '캠페인 ID'
  },
  {
    property_name: 'te_ads_object.campaign_name',
    property_name_kr: '캠페인 이름',
    data_type: 'string',
    event_name: 'install',
    description: '캠페인 이름'
  },
  {
    property_name: 'te_ads_object.clicks',
    property_name_kr: '클릭 수',
    data_type: 'number',
    event_name: 'install',
    description: '광고 클릭 수'
  },
  {
    property_name: 'te_ads_object.conversions',
    property_name_kr: '전환 수',
    data_type: 'number',
    event_name: 'install',
    description: '전환 수'
  },
  {
    property_name: 'te_ads_object.cost',
    property_name_kr: '광고비',
    data_type: 'number',
    event_name: 'install',
    description: '광고 비용'
  },
  {
    property_name: 'te_ads_object.country',
    property_name_kr: '국가',
    data_type: 'string',
    event_name: 'install',
    description: '국가 코드'
  },
  {
    property_name: 'te_ads_object.currency',
    property_name_kr: '통화',
    data_type: 'string',
    event_name: 'install',
    description: '통화 코드 (KRW, USD 등)'
  },
  {
    property_name: 'te_ads_object.impressions',
    property_name_kr: '노출 수',
    data_type: 'number',
    event_name: 'install',
    description: '광고 노출 수'
  },
  {
    property_name: 'te_ads_object.installs',
    property_name_kr: '설치 수',
    data_type: 'number',
    event_name: 'install',
    description: '앱 설치 수'
  },
  {
    property_name: 'te_ads_object.media_source',
    property_name_kr: '매체',
    data_type: 'string',
    event_name: 'install',
    description: '광고 매체'
  },
  {
    property_name: 'te_ads_object.placement',
    property_name_kr: '지면',
    data_type: 'string',
    event_name: 'install',
    description: '광고 게재 위치'
  },
  {
    property_name: 'te_ads_object.platform',
    property_name_kr: '플랫폼',
    data_type: 'string',
    event_name: 'install',
    description: '플랫폼 (ios, android)'
  },
  {
    property_name: 'te_ads_object.revenue',
    property_name_kr: '매출',
    data_type: 'number',
    event_name: 'install',
    description: '매출액'
  }
];

/**
 * adjust_ad_revenue 이벤트 속성
 * (install의 모든 속성 + 추가 속성)
 */
export const AD_REVENUE_EVENT_PROPERTIES: PropertyDefinition[] = [
  // install의 모든 속성 포함
  ...INSTALL_EVENT_PROPERTIES.map(prop => ({
    ...prop,
    event_name: 'adjust_ad_revenue'
  })),

  // adjust_ad_revenue 전용 속성
  {
    property_name: 'ad_revenue_network',
    property_name_kr: '광고 네트워크',
    data_type: 'string',
    event_name: 'adjust_ad_revenue',
    description: '광고 수익 네트워크 (예: admob, unity_ads)'
  },
  {
    property_name: 'ad_revenue_unit',
    property_name_kr: '광고 유닛',
    data_type: 'string',
    event_name: 'adjust_ad_revenue',
    description: '광고 유닛 ID'
  },
  {
    property_name: 'currency',
    property_name_kr: '통화',
    data_type: 'string',
    event_name: 'adjust_ad_revenue',
    description: '수익 통화 코드 (USD, KRW 등)'
  },
  {
    property_name: 'memberid',
    property_name_kr: '회원 ID',
    data_type: 'string',
    event_name: 'adjust_ad_revenue',
    description: '내부 회원 ID'
  },
  {
    property_name: 'revenue',
    property_name_kr: '수익',
    data_type: 'number',
    event_name: 'adjust_ad_revenue',
    description: '광고 수익 금액'
  }
];

/**
 * 모든 마케팅 이벤트 속성
 */
export const MARKETING_EVENT_PROPERTIES: PropertyDefinition[] = [
  ...INSTALL_EVENT_PROPERTIES,
  ...AD_REVENUE_EVENT_PROPERTIES
];

/**
 * te_ads_object 유저 속성 정의
 * (사용자의 최초 유입 광고 정보)
 */
export const MARKETING_USER_PROPERTIES: PropertyDefinition[] = [
  {
    property_name: 'te_ads_object',
    property_name_kr: 'Adjust 정보',
    data_type: 'object',
    description: '사용자의 최초 유입 광고 정보'
  },
  {
    property_name: 'te_ads_object.media_source',
    property_name_kr: '채널',
    data_type: 'string',
    description: '광고 매체 (예: google, facebook, apple_search_ads)'
  },
  {
    property_name: 'te_ads_object.campaign_name',
    property_name_kr: '광고 캠페인 이름',
    data_type: 'string',
    description: '캠페인 이름 (예: summer_promotion_2024)'
  },
  {
    property_name: 'te_ads_object.ad_group_name',
    property_name_kr: '광고 그룹 이름',
    data_type: 'string',
    description: '광고 그룹 이름 (예: tier1_countries)'
  },
  {
    property_name: 'te_ads_object.ad_name',
    property_name_kr: '광고 이름',
    data_type: 'string',
    description: '광고 소재 이름 (예: hero_banner_v2)'
  }
];

/**
 * 완전한 마케팅 스키마
 */
export const MARKETING_SCHEMA = {
  events: MARKETING_EVENTS,
  eventProperties: MARKETING_EVENT_PROPERTIES,
  userProperties: MARKETING_USER_PROPERTIES
};
