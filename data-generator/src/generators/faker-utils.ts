import { faker } from '@faker-js/faker';
import { faker as fakerJA } from '@faker-js/faker/locale/ja';
import { faker as fakerKO } from '@faker-js/faker/locale/ko';
import { faker as fakerEN } from '@faker-js/faker/locale/en';
import { faker as fakerZH_CN } from '@faker-js/faker/locale/zh_CN';
import { faker as fakerZH_TW } from '@faker-js/faker/locale/zh_TW';
import { CountryConfig, IP_RANGES, CARRIERS } from '../types';
import { randomChoice } from '../utils/random';
import { logger } from '../utils/logger';

/**
 * Faker.js 기반 데이터 생성 유틸리티
 */

/**
 * 로케일 매핑
 */
const LOCALE_FAKER_MAP: Record<string, typeof faker> = {
  'ja': fakerJA,
  'ko': fakerKO,
  'en': fakerEN,
  'zh_CN': fakerZH_CN,
  'zh_TW': fakerZH_TW,
  'en_US': fakerEN,
  'en-US': fakerEN,
};

/**
 * 로케일에 맞는 Faker 인스턴스 가져오기
 * 🆕 국가별 로케일 적용 (한국 유저 → 한국 이름)
 */
export function getFakerInstance(locale: string): typeof faker {
  const normalizedLocale = locale.replace('-', '_');
  const fakerInstance = LOCALE_FAKER_MAP[normalizedLocale] || LOCALE_FAKER_MAP[locale];

  if (!fakerInstance) {
    logger.warn(`⚠️  Unsupported locale: ${locale}, using default (en)`);
    return faker;
  }

  return fakerInstance;
}

/**
 * 국가별 사용자 정보 생성
 */
export interface GeneratedUserInfo {
  name: string;
  email: string;
  phone: string;
  ip: string;
  carrier: string;
}

export function generateUserInfo(countryConfig: CountryConfig): GeneratedUserInfo {
  const fakerInstance = getFakerInstance(countryConfig.locale);

  return {
    name: fakerInstance.person.fullName(),
    email: fakerInstance.internet.email(),
    phone: fakerInstance.phone.number(),
    ip: generateRealisticIP(countryConfig.countryCode),
    carrier: getCarrierByCountry(countryConfig.countryCode)
  };
}

/**
 * 국가별 현실적인 IP 생성
 */
export function generateRealisticIP(countryCode: string): string {
  const ranges = IP_RANGES[countryCode] || IP_RANGES['US'];
  const prefix = randomChoice(ranges);

  const octet2 = Math.floor(Math.random() * 256);
  const octet3 = Math.floor(Math.random() * 256);
  const octet4 = Math.floor(Math.random() * 256);

  return `${prefix}${octet2}.${octet3}.${octet4}`;
}

/**
 * 국가별 통신사 선택
 */
export function getCarrierByCountry(countryCode: string): string {
  const carriers = CARRIERS[countryCode] || CARRIERS['US'];
  return randomChoice(carriers);
}

/**
 * 디바이스 정보 생성
 */
export interface DeviceInfo {
  os: string;
  os_version: string;
  device_model: string;
  device_id: string;
  manufacturer: string;
  screen_width: number;
  screen_height: number;
}

const OS_OPTIONS = [
  { os: 'iOS', versions: ['17.0', '16.5', '16.0', '15.7'], manufacturer: 'Apple' },
  { os: 'Android', versions: ['14', '13', '12', '11'], manufacturer: 'Samsung' }
];

const IOS_MODELS = [
  'iPhone 15 Pro', 'iPhone 15', 'iPhone 14 Pro', 'iPhone 14',
  'iPhone 13', 'iPhone 12', 'iPad Pro', 'iPad Air'
];

const ANDROID_MODELS = [
  'Galaxy S24', 'Galaxy S23', 'Galaxy S22', 'Galaxy A54',
  'Pixel 8', 'Pixel 7', 'OnePlus 12', 'Xiaomi 14'
];

const SCREEN_RESOLUTIONS = [
  { width: 1170, height: 2532 }, // iPhone 15 Pro
  { width: 1080, height: 2400 }, // Common Android
  { width: 1440, height: 3200 }, // High-end Android
  { width: 828, height: 1792 }   // iPhone 11
];

export function generateDeviceInfo(): DeviceInfo {
  const osOption = randomChoice(OS_OPTIONS);
  const resolution = randomChoice(SCREEN_RESOLUTIONS);

  return {
    os: osOption.os,
    os_version: randomChoice(osOption.versions),
    device_model: osOption.os === 'iOS' ? randomChoice(IOS_MODELS) : randomChoice(ANDROID_MODELS),
    device_id: faker.string.uuid(),
    manufacturer: osOption.manufacturer,
    screen_width: resolution.width,
    screen_height: resolution.height
  };
}

/**
 * 네트워크 타입 선택
 */
const NETWORK_TYPES = ['WiFi', '5G', '4G', 'LTE'];

export function generateNetworkType(): string {
  // WiFi가 더 많이 사용됨
  const random = Math.random();
  if (random < 0.5) return 'WiFi';
  if (random < 0.75) return '5G';
  if (random < 0.9) return '4G';
  return 'LTE';
}

/**
 * 산업별 가격 범위 정의
 */
interface IndustryPriceRanges {
  game: { item: [number, number]; currency: [number, number]; gacha: [number, number] };
  commerce: { product: [number, number]; shipping: [number, number]; discount: [number, number] };
  finance: { transfer: [number, number]; investment: [number, number]; fee: [number, number] };
  default: { low: [number, number]; mid: [number, number]; high: [number, number] };
}

const INDUSTRY_PRICE_RANGES: IndustryPriceRanges = {
  game: {
    item: [100, 5000],      // 게임 아이템: 100~5,000원
    currency: [1000, 50000], // 게임 재화: 1,000~50,000원
    gacha: [500, 10000]      // 가챠: 500~10,000원
  },
  commerce: {
    product: [5000, 200000],   // 상품: 5,000~200,000원
    shipping: [0, 5000],        // 배송비: 0~5,000원
    discount: [1000, 50000]     // 할인액: 1,000~50,000원
  },
  finance: {
    transfer: [10000, 10000000],   // 송금: 10,000~10,000,000원
    investment: [100000, 100000000], // 투자: 100,000~100,000,000원
    fee: [0, 10000]                 // 수수료: 0~10,000원
  },
  default: {
    low: [1000, 10000],
    mid: [10000, 100000],
    high: [100000, 1000000]
  }
};

/**
 * 폴백 규칙 정의
 */
interface FallbackRule {
  priority: number; // 높을수록 먼저 평가 (1-100)
  category: string; // 규칙 카테고리 (문서화용)
  matcher: (lowerName: string, propertyName: string, industry?: string, user?: any) => boolean;
  generator: (fakerInstance: any, propertyName: string, lowerName: string, industry?: string, user?: any) => any;
}

/**
 * 규칙 기반 폴백 시스템
 * 우선순위 순서: 유저 정보 (95) > ID/Boolean (90) > 개인정보 (80) > 날짜/시간 (70) > 산업별 가격 (60) >
 *                게임 (50) > 상거래 (40) > 통계 (30) > 상태/타입 (20) > B2B (10) > 기타 (5)
 */
const FALLBACK_RULES: FallbackRule[] = [
  // === 🆕 유저 정보 기반 (최고 우선순위) ===
  {
    priority: 95,
    category: 'User - IP',
    matcher: (lower) => (lower === 'ip' || lower === 'ip_address') && !lower.includes('zip'),
    generator: (f, _, __, ___, user) => user?.ip || generateRealisticIP(user?.countryCode || 'US')
  },
  {
    priority: 95,
    category: 'User - Carrier',
    matcher: (lower) => lower === 'carrier' || lower === 'mobile_carrier',
    generator: (f, _, __, ___, user) => user?.carrier || getCarrierByCountry(user?.countryCode || 'US')
  },
  {
    priority: 95,
    category: 'User - OS',
    matcher: (lower) => lower === 'os' || lower === 'platform',
    generator: (f, _, __, ___, user) => user?.os || 'iOS'
  },
  {
    priority: 95,
    category: 'User - Device Model',
    matcher: (lower) => lower === 'device_model' || (lower === 'model' && !lower.includes('business')),
    generator: (f, _, __, ___, user) => user?.device_model || 'iPhone 15'
  },
  {
    priority: 95,
    category: 'User - City',
    matcher: (lower) => lower === 'city' || lower === 'user_city',
    generator: (f, _, __, ___, user) => user?.city || getOrCreateLocationContext().city
  },
  {
    priority: 95,
    category: 'User - State/Province',
    matcher: (lower) => lower === 'state' || lower === 'province',
    generator: (f, _, __, ___, user) => user?.state || getOrCreateLocationContext().state
  },

  // === ID 관련 (최고 우선순위) ===
  {
    priority: 90,
    category: 'ID',
    matcher: (lower) => lower.includes('_id') || lower === 'id',
    generator: (f) => f.string.uuid()
  },

  // === Boolean (최고 우선순위) ===
  {
    priority: 90,
    category: 'Boolean',
    matcher: (lower) => lower.startsWith('is_') || lower.startsWith('has_') || lower.includes('enabled'),
    generator: (f) => f.datatype.boolean()
  },

  // === 개인정보 관련 (높은 우선순위) ===
  {
    priority: 80,
    category: 'Personal Info - Name',
    matcher: (lower) => lower.includes('name') && !lower.includes('campaign') && !lower.includes('event'),
    generator: (f) => f.person.fullName()
  },
  {
    priority: 80,
    category: 'Personal Info - Email',
    matcher: (lower) => lower.includes('email'),
    generator: (f) => f.internet.email()
  },
  {
    priority: 80,
    category: 'Personal Info - Phone',
    matcher: (lower) => lower.includes('phone'),
    generator: (f) => f.phone.number()
  },
  {
    priority: 80,
    category: 'Personal Info - Address',
    matcher: (lower) => lower.includes('address'),
    generator: (f) => f.location.streetAddress()
  },
  // Note: city, province/state, country, country_code are now handled by contextual location generator

  // === 날짜/시간 (높은 우선순위) ===
  {
    priority: 70,
    category: 'Date/Time - Timestamp',
    matcher: (lower) => lower.includes('date') || lower.includes('_at') || lower.includes('timestamp'),
    generator: (f) => f.date.recent().toISOString()
  },
  {
    priority: 70,
    category: 'Date/Time - Duration',
    matcher: (lower) => lower.includes('duration'),
    generator: (f) => f.number.int({ min: 10, max: 600 })
  },

  // === 산업별 가격 (중간 우선순위, 복잡한 로직) ===
  {
    priority: 60,
    category: 'Price - Game',
    matcher: (lower, _, industry) => {
      const industryLower = industry?.toLowerCase() || '';
      return (lower.includes('price') || lower.includes('amount') || lower.includes('금액') || lower.includes('가격'))
        && (industryLower.includes('게임') || industryLower.includes('game'));
    },
    generator: (f, _, lower, industry) => {
      const industryLower = industry?.toLowerCase() || '';
      if (lower.includes('item') || lower.includes('아이템')) {
        const [min, max] = INDUSTRY_PRICE_RANGES.game.item;
        return f.number.int({ min, max });
      }
      if (lower.includes('currency') || lower.includes('재화') || lower.includes('골드') || lower.includes('gold')) {
        const [min, max] = INDUSTRY_PRICE_RANGES.game.currency;
        return f.number.int({ min, max });
      }
      if (lower.includes('gacha') || lower.includes('가챠') || lower.includes('뽑기')) {
        const [min, max] = INDUSTRY_PRICE_RANGES.game.gacha;
        return f.number.int({ min, max });
      }
      const [min, max] = INDUSTRY_PRICE_RANGES.game.item;
      return f.number.int({ min, max });
    }
  },
  {
    priority: 60,
    category: 'Price - Commerce',
    matcher: (lower, _, industry) => {
      const industryLower = industry?.toLowerCase() || '';
      return (lower.includes('price') || lower.includes('amount') || lower.includes('금액') || lower.includes('가격'))
        && (industryLower.includes('쇼핑') || industryLower.includes('commerce') || industryLower.includes('이커머스'));
    },
    generator: (f, _, lower) => {
      if (lower.includes('shipping') || lower.includes('배송')) {
        const [min, max] = INDUSTRY_PRICE_RANGES.commerce.shipping;
        return f.number.int({ min, max });
      }
      if (lower.includes('discount') || lower.includes('할인')) {
        const [min, max] = INDUSTRY_PRICE_RANGES.commerce.discount;
        return f.number.int({ min, max });
      }
      const [min, max] = INDUSTRY_PRICE_RANGES.commerce.product;
      return f.number.int({ min, max });
    }
  },
  {
    priority: 60,
    category: 'Price - Finance',
    matcher: (lower, _, industry) => {
      const industryLower = industry?.toLowerCase() || '';
      return (lower.includes('price') || lower.includes('amount') || lower.includes('금액') || lower.includes('가격'))
        && (industryLower.includes('금융') || industryLower.includes('finance') || industryLower.includes('bank'));
    },
    generator: (f, _, lower) => {
      if (lower.includes('transfer') || lower.includes('송금') || lower.includes('이체')) {
        const [min, max] = INDUSTRY_PRICE_RANGES.finance.transfer;
        return f.number.int({ min, max });
      }
      if (lower.includes('invest') || lower.includes('투자')) {
        const [min, max] = INDUSTRY_PRICE_RANGES.finance.investment;
        return f.number.int({ min, max });
      }
      if (lower.includes('fee') || lower.includes('수수료')) {
        const [min, max] = INDUSTRY_PRICE_RANGES.finance.fee;
        return f.number.int({ min, max });
      }
      const [min, max] = INDUSTRY_PRICE_RANGES.finance.transfer;
      return f.number.int({ min, max });
    }
  },
  {
    priority: 60,
    category: 'Price - Default',
    matcher: (lower) => lower.includes('price') || lower.includes('amount') || lower.includes('금액') || lower.includes('가격'),
    generator: (f) => {
      const [min, max] = INDUSTRY_PRICE_RANGES.default.mid;
      return f.number.int({ min, max });
    }
  },

  // === 게임 관련 (중간 우선순위) ===
  {
    priority: 50,
    category: 'Game - Level',
    matcher: (lower) => lower.includes('level') || lower.includes('레벨'),
    generator: (f) => f.number.int({ min: 1, max: 100 })
  },
  {
    priority: 50,
    category: 'Game - Score',
    matcher: (lower) => lower.includes('score') || lower.includes('점수'),
    generator: (f) => f.number.int({ min: 0, max: 99999 })
  },
  {
    priority: 50,
    category: 'Game - Rank',
    matcher: (lower) => lower.includes('rank') || lower.includes('순위'),
    generator: (f) => f.number.int({ min: 1, max: 1000 })
  },
  {
    priority: 50,
    category: 'Game - Tier',
    matcher: (lower) => lower.includes('tier') || lower.includes('등급'),
    generator: (f) => f.helpers.arrayElement(['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master'])
  },
  {
    priority: 50,
    category: 'Game - Character',
    matcher: (lower) => lower.includes('character') || lower.includes('캐릭터'),
    generator: (f) => f.helpers.arrayElement(['Warrior', 'Mage', 'Archer', 'Assassin', 'Priest', 'Tank'])
  },
  {
    priority: 50,
    category: 'Game - Mode',
    matcher: (lower) => lower.includes('mode') || lower.includes('모드'),
    generator: (f) => f.helpers.arrayElement(['Normal', 'Hard', 'Expert', 'PVP', 'PVE', 'Tutorial'])
  },
  {
    priority: 50,
    category: 'Game - Stage',
    matcher: (lower) => lower.includes('stage') || lower.includes('스테이지'),
    generator: (f) => `Stage-${f.number.int({ min: 1, max: 50 })}`
  },

  // === 상거래 관련 (중간 우선순위) ===
  {
    priority: 40,
    category: 'Commerce - Quantity',
    matcher: (lower) => lower.includes('quantity') || lower.includes('수량'),
    generator: (f) => f.number.int({ min: 1, max: 10 })
  },
  {
    priority: 40,
    category: 'Commerce - Discount',
    matcher: (lower) => lower.includes('discount') || lower.includes('할인'),
    generator: (f) => f.number.int({ min: 5, max: 50 })
  },
  {
    priority: 40,
    category: 'Commerce - Currency',
    matcher: (lower) => lower.includes('currency') || lower.includes('통화'),
    generator: (f) => f.helpers.arrayElement(['USD', 'KRW', 'JPY', 'EUR', 'CNY'])
  },
  {
    priority: 40,
    category: 'Commerce - Category',
    matcher: (lower) => lower.includes('category') || lower.includes('카테고리'),
    generator: (f) => f.helpers.arrayElement(['Electronics', 'Fashion', 'Food', 'Sports', 'Books', 'Games'])
  },
  {
    priority: 40,
    category: 'Commerce - Product',
    matcher: (lower) => lower.includes('product') || lower.includes('item') || lower.includes('상품'),
    generator: (f) => f.commerce.productName()
  },

  // === 통계/분석 관련 (낮은 우선순위) ===
  {
    priority: 30,
    category: 'Analytics - Count',
    matcher: (lower) => lower.includes('count') || lower.includes('수'),
    generator: (f) => f.number.int({ min: 0, max: 100 })
  },
  {
    priority: 30,
    category: 'Analytics - Rate',
    matcher: (lower) => lower.includes('rate') || lower.includes('ratio') || lower.includes('비율'),
    generator: (f) => f.number.float({ min: 0, max: 1, fractionDigits: 2 })
  },
  {
    priority: 30,
    category: 'Analytics - Percent',
    matcher: (lower) => lower.includes('percent') || lower.includes('percentage'),
    generator: (f) => f.number.int({ min: 0, max: 100 })
  },

  // === 상태/타입 (낮은 우선순위) ===
  {
    priority: 20,
    category: 'State - Status',
    matcher: (lower) => lower.includes('status') || lower.includes('상태'),
    generator: (f) => f.helpers.arrayElement(['Active', 'Inactive', 'Pending', 'Completed', 'Failed'])
  },
  {
    priority: 20,
    category: 'State - Type',
    matcher: (lower) => lower.includes('type') || lower.includes('타입'),
    generator: (f) => f.helpers.arrayElement(['Type-A', 'Type-B', 'Type-C', 'Special', 'Premium'])
  },
  {
    priority: 20,
    category: 'State - Method',
    matcher: (lower) => lower.includes('method') || lower.includes('방법'),
    generator: (f) => f.helpers.arrayElement(['Card', 'Cash', 'Mobile', 'Transfer', 'Coupon'])
  },

  // === B2B/비즈니스 관련 (낮은 우선순위) ===
  {
    priority: 10,
    category: 'B2B - Company Size',
    matcher: (lower) => lower.includes('company_size') || lower.includes('기업규모'),
    generator: (f) => f.helpers.arrayElement(['Startup', 'SMB', 'Mid-Market', 'Enterprise', 'Large Enterprise'])
  },
  {
    priority: 10,
    category: 'B2B - Industry',
    matcher: (lower) => lower.includes('industry') || lower.includes('산업'),
    generator: (f) => f.helpers.arrayElement(['Technology', 'Finance', 'Healthcare', 'Retail', 'Manufacturing', 'Education'])
  },
  {
    priority: 10,
    category: 'B2B - Subscription',
    matcher: (lower) => lower.includes('subscription') || lower.includes('구독'),
    generator: (f) => f.helpers.arrayElement(['Free', 'Basic', 'Professional', 'Enterprise', 'Premium'])
  },
  {
    priority: 10,
    category: 'B2B - Role',
    matcher: (lower) => lower.includes('user_role') || lower.includes('role') || lower.includes('역할'),
    generator: (f) => f.helpers.arrayElement(['Admin', 'Manager', 'User', 'Viewer', 'Editor', 'Owner'])
  },
  {
    priority: 10,
    category: 'B2B - Feature Flag',
    matcher: (lower) => lower.includes('feature_flag') || (lower.includes('feature') && lower.includes('flag')),
    generator: (f) => f.helpers.arrayElement(['enabled', 'disabled', 'beta', 'experimental'])
  },
  {
    priority: 10,
    category: 'B2B - Priority',
    matcher: (lower) => lower.includes('priority') || lower.includes('우선순위'),
    generator: (f) => f.helpers.arrayElement(['Low', 'Medium', 'High', 'Critical', 'Urgent'])
  },
  {
    priority: 10,
    category: 'B2B - Department',
    matcher: (lower) => lower.includes('department') || lower.includes('부서'),
    generator: (f) => f.helpers.arrayElement(['Sales', 'Marketing', 'Engineering', 'HR', 'Finance', 'Operations'])
  },

  // === 기타 (낮은 우선순위) ===
  {
    priority: 5,
    category: 'Misc - URL',
    matcher: (lower) => lower.includes('url') || lower.includes('link'),
    generator: (f) => f.internet.url()
  },
  {
    priority: 5,
    category: 'Misc - Description',
    matcher: (lower) => lower.includes('description') || lower.includes('message') || lower.includes('comment'),
    generator: (f) => f.lorem.sentence()
  },
  {
    priority: 5,
    category: 'Misc - Version',
    matcher: (lower) => lower.includes('version'),
    generator: (f) => `${f.number.int({ min: 1, max: 5 })}.${f.number.int({ min: 0, max: 9 })}.${f.number.int({ min: 0, max: 9 })}`
  },
  {
    priority: 5,
    category: 'Misc - Count Suffix',
    matcher: (lower) => lower.endsWith('count') || lower.endsWith('number'),
    generator: (f) => f.number.int({ min: 0, max: 10 })
  }
];

// 우선순위 순서로 정렬 (높은 우선순위가 먼저)
FALLBACK_RULES.sort((a, b) => b.priority - a.priority);

/**
 * 위치 정보 컨텍스트 캐시
 * 여러 위치 속성이 같은 컨텍스트에서 생성될 때 일관성 유지
 */
interface LocationContext {
  city: string;
  state: string;
  country: string;
  countryCode: string;
  region?: string;
  timezone?: string;
}

let currentLocationContext: LocationContext | null = null;

/**
 * 국가별 타임존 매핑
 */
const COUNTRY_TIMEZONES: Record<string, string> = {
  KR: 'Asia/Seoul',
  JP: 'Asia/Tokyo',
  US: 'America/New_York',
  CN: 'Asia/Shanghai',
  GB: 'Europe/London'
};

/**
 * 특정 국가 코드 기반으로 일관성 있는 위치 정보 생성
 */
export function generateConsistentLocationForCountry(countryCode: string): LocationContext {
  // 지원하는 국가별 샘플 위치 데이터
  const LOCATION_DATA: Record<string, { cities: Array<{ city: string; state: string }> }> = {
    KR: {
      cities: [
        { city: '서울', state: '서울특별시' },
        { city: '부산', state: '부산광역시' },
        { city: '인천', state: '인천광역시' },
        { city: '대구', state: '대구광역시' },
        { city: '대전', state: '대전광역시' },
        { city: '광주', state: '광주광역시' },
        { city: '수원', state: '경기도' },
        { city: '용인', state: '경기도' },
        { city: '창원', state: '경상남도' },
        { city: '청주', state: '충청북도' }
      ]
    },
    JP: {
      cities: [
        { city: 'Tokyo', state: 'Tokyo' },
        { city: 'Osaka', state: 'Osaka' },
        { city: 'Kyoto', state: 'Kyoto' },
        { city: 'Yokohama', state: 'Kanagawa' },
        { city: 'Nagoya', state: 'Aichi' },
        { city: 'Sapporo', state: 'Hokkaido' },
        { city: 'Fukuoka', state: 'Fukuoka' },
        { city: 'Kobe', state: 'Hyogo' }
      ]
    },
    US: {
      cities: [
        { city: 'New York', state: 'New York' },
        { city: 'Los Angeles', state: 'California' },
        { city: 'Chicago', state: 'Illinois' },
        { city: 'Houston', state: 'Texas' },
        { city: 'Phoenix', state: 'Arizona' },
        { city: 'Philadelphia', state: 'Pennsylvania' },
        { city: 'San Francisco', state: 'California' },
        { city: 'Seattle', state: 'Washington' },
        { city: 'Boston', state: 'Massachusetts' },
        { city: 'Miami', state: 'Florida' }
      ]
    },
    CN: {
      cities: [
        { city: 'Beijing', state: 'Beijing' },
        { city: 'Shanghai', state: 'Shanghai' },
        { city: 'Guangzhou', state: 'Guangdong' },
        { city: 'Shenzhen', state: 'Guangdong' },
        { city: 'Chengdu', state: 'Sichuan' },
        { city: 'Hangzhou', state: 'Zhejiang' },
        { city: 'Wuhan', state: 'Hubei' },
        { city: 'Xi\'an', state: 'Shaanxi' }
      ]
    },
    GB: {
      cities: [
        { city: 'London', state: 'England' },
        { city: 'Manchester', state: 'England' },
        { city: 'Birmingham', state: 'England' },
        { city: 'Edinburgh', state: 'Scotland' },
        { city: 'Glasgow', state: 'Scotland' },
        { city: 'Liverpool', state: 'England' },
        { city: 'Bristol', state: 'England' }
      ]
    }
  };

  const COUNTRY_NAMES: Record<string, string> = {
    KR: 'South Korea',
    JP: 'Japan',
    US: 'United States',
    CN: 'China',
    GB: 'United Kingdom'
  };

  // 지정된 국가의 위치 데이터 가져오기
  const locationList = LOCATION_DATA[countryCode] || LOCATION_DATA['US'];
  const selectedLocation = randomChoice(locationList.cities);

  return {
    city: selectedLocation.city,
    state: selectedLocation.state,
    country: COUNTRY_NAMES[countryCode] || 'United States',
    countryCode: countryCode,
    timezone: COUNTRY_TIMEZONES[countryCode] || 'UTC'
  };
}

/**
 * 랜덤 국가로 위치 정보 생성 (기존 호환성 유지)
 */
function generateConsistentLocation(): LocationContext {
  const LOCATION_DATA_KEYS = ['KR', 'JP', 'US', 'CN', 'GB'];
  const selectedCode = randomChoice(LOCATION_DATA_KEYS);
  return generateConsistentLocationForCountry(selectedCode);
}

/**
 * 위치 컨텍스트 초기화 (새 이벤트 생성 시 호출)
 * @deprecated Use clearLocationContext() instead
 */
export function resetLocationContext(): void {
  currentLocationContext = null;
}

/**
 * 위치 컨텍스트 클리어 (세션 종료 시 호출)
 */
export function clearLocationContext(): void {
  currentLocationContext = null;
}

/**
 * 유저 기반으로 위치 컨텍스트 초기화 (세션 시작 시 호출)
 */
export function initializeLocationContext(user: any): void {
  currentLocationContext = {
    city: user.city,
    state: user.state,
    country: user.country,
    countryCode: user.countryCode,
    region: user.region,
    timezone: user.timezone
  };
}

/**
 * 위치 컨텍스트 가져오기 (lazy 생성)
 */
function getOrCreateLocationContext(): LocationContext {
  if (!currentLocationContext) {
    currentLocationContext = generateConsistentLocation();
  }
  return currentLocationContext;
}

/**
 * 속성명 기반 폴백 값 생성 (규칙 기반 시스템)
 * AI가 범위를 생성하지 못한 속성들을 위한 스마트 폴백
 *
 * @param propertyName 속성 이름
 * @param locale 로케일
 * @param industry 산업 분류 (game, commerce, finance 등)
 * @param user 유저 객체 (선택사항, 유저 정보 기반 생성용)
 */
export function generateFallbackValue(
  propertyName: string,
  locale: string = 'en',
  industry?: string,
  user?: any
): any {
  const fakerInstance = getFakerInstance(locale);
  const lowerName = propertyName.toLowerCase();

  // 위치 관련 속성은 컨텍스트 일관성 유지
  if (lowerName.includes('city')) {
    return getOrCreateLocationContext().city;
  }
  if (lowerName.includes('province') || lowerName.includes('state')) {
    return getOrCreateLocationContext().state;
  }
  if (lowerName.includes('country') && lowerName.includes('code')) {
    return getOrCreateLocationContext().countryCode;
  }
  if (lowerName.includes('country')) {
    return getOrCreateLocationContext().country;
  }
  if (lowerName.includes('region') && !lowerName.includes('store')) {
    return getOrCreateLocationContext().region || getOrCreateLocationContext().state;
  }
  if (lowerName.includes('timezone') || lowerName.includes('time_zone')) {
    return getOrCreateLocationContext().timezone || 'UTC';
  }

  // 규칙 기반 평가 (우선순위 순서대로 이미 정렬됨)
  for (const rule of FALLBACK_RULES) {
    if (rule.matcher(lowerName, propertyName, industry, user)) {
      return rule.generator(fakerInstance, propertyName, lowerName, industry, user);
    }
  }

  // 최종 폴백: 짧은 알파벳 코드
  logger.warn(`⚠️  No rule matched for property: ${propertyName} (industry: ${industry || 'none'})`);
  return fakerInstance.string.alpha(6).toUpperCase();
}
