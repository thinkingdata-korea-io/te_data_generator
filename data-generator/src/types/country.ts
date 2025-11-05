/**
 * 국가별 설정 타입
 */
export interface CountryConfig {
  country: string;        // "일본", "대한민국"
  countryCode: string;    // "JP", "KR"
  locale: string;         // "ja", "ko" (Faker.js locale)
  language: string;       // "ja", "ko"
  timezone: number;       // UTC offset (9 for KR/JP)
  ratio: number;          // 유저 비율 (0-1)
}

/**
 * 기본 국가 설정
 */
export const DEFAULT_COUNTRY_CONFIGS: CountryConfig[] = [
  {
    country: "일본",
    countryCode: "JP",
    locale: "ja",
    language: "ja",
    timezone: 9,
    ratio: 0.3
  },
  {
    country: "대한민국",
    countryCode: "KR",
    locale: "ko",
    language: "ko",
    timezone: 9,
    ratio: 0.25
  },
  {
    country: "United States",
    countryCode: "US",
    locale: "en",
    language: "en",
    timezone: -5,
    ratio: 0.2
  },
  {
    country: "中国",
    countryCode: "CN",
    locale: "zh_CN",
    language: "zh",
    timezone: 8,
    ratio: 0.15
  },
  {
    country: "台灣",
    countryCode: "TW",
    locale: "zh_TW",
    language: "zh",
    timezone: 8,
    ratio: 0.1
  }
];

/**
 * 국가별 IP 범위 매핑
 */
export const IP_RANGES: Record<string, string[]> = {
  JP: ['203.', '210.', '221.'],
  KR: ['211.', '218.', '222.'],
  US: ['108.', '172.', '192.'],
  CN: ['123.', '175.', '183.'],
  TW: ['114.', '140.', '163.']
};

/**
 * 국가별 통신사 매핑
 */
export const CARRIERS: Record<string, string[]> = {
  JP: ['NTT DoCoMo', 'SoftBank', 'au', 'Rakuten Mobile'],
  KR: ['SKT', 'KT', 'LG U+'],
  US: ['Verizon', 'AT&T', 'T-Mobile', 'Sprint'],
  CN: ['China Mobile', 'China Unicom', 'China Telecom'],
  TW: ['Chunghwa Telecom', 'Taiwan Mobile', 'FarEasTone']
};
