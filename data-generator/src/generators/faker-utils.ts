import { faker } from '@faker-js/faker';
import { CountryConfig, IP_RANGES, CARRIERS } from '../types';
import { randomChoice } from '../utils/random';

/**
 * Faker.js 기반 데이터 생성 유틸리티
 */

/**
 * 로케일에 맞는 Faker 인스턴스 가져오기
 * Faker v8에서는 단일 글로벌 인스턴스만 사용
 */
export function getFakerInstance(locale: string): typeof faker {
  // Faker v8에서는 모든 로케일이 하나의 인스턴스에 포함됨
  return faker;
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
 * 속성명 기반 폴백 값 생성
 * AI가 범위를 생성하지 못한 속성들을 위한 스마트 폴백
 *
 * @param propertyName 속성 이름
 * @param locale 로케일
 * @param industry 산업 분류 (game, commerce, finance 등)
 */
export function generateFallbackValue(
  propertyName: string,
  locale: string = 'en',
  industry?: string
): any {
  const fakerInstance = getFakerInstance(locale);
  const lowerName = propertyName.toLowerCase();
  const industryLower = industry?.toLowerCase() || '';

  // === 개인정보 관련 ===
  if (lowerName.includes('name') && !lowerName.includes('campaign') && !lowerName.includes('event')) {
    return fakerInstance.person.fullName();
  }

  if (lowerName.includes('email')) {
    return fakerInstance.internet.email();
  }

  if (lowerName.includes('phone')) {
    return fakerInstance.phone.number();
  }

  if (lowerName.includes('address')) {
    return fakerInstance.location.streetAddress();
  }

  if (lowerName.includes('city')) {
    return fakerInstance.location.city();
  }

  if (lowerName.includes('country') && !lowerName.includes('code')) {
    return fakerInstance.location.country();
  }

  // === 날짜/시간 ===
  if (lowerName.includes('date') || lowerName.includes('_at') || lowerName.includes('timestamp')) {
    return fakerInstance.date.recent().toISOString();
  }

  if (lowerName.includes('duration')) {
    return fakerInstance.number.int({ min: 10, max: 600 }); // 10초 ~ 10분
  }

  // === ID 관련 ===
  if (lowerName.includes('_id') || lowerName === 'id') {
    return fakerInstance.string.uuid();
  }

  // === 게임 관련 ===
  if (lowerName.includes('level') || lowerName.includes('레벨')) {
    return fakerInstance.number.int({ min: 1, max: 100 });
  }

  if (lowerName.includes('score') || lowerName.includes('점수')) {
    return fakerInstance.number.int({ min: 0, max: 99999 });
  }

  if (lowerName.includes('rank') || lowerName.includes('순위')) {
    return fakerInstance.number.int({ min: 1, max: 1000 });
  }

  if (lowerName.includes('tier') || lowerName.includes('등급')) {
    const tiers = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master'];
    return fakerInstance.helpers.arrayElement(tiers);
  }

  if (lowerName.includes('character') || lowerName.includes('캐릭터')) {
    const characters = ['Warrior', 'Mage', 'Archer', 'Assassin', 'Priest', 'Tank'];
    return fakerInstance.helpers.arrayElement(characters);
  }

  if (lowerName.includes('mode') || lowerName.includes('모드')) {
    const modes = ['Normal', 'Hard', 'Expert', 'PVP', 'PVE', 'Tutorial'];
    return fakerInstance.helpers.arrayElement(modes);
  }

  if (lowerName.includes('stage') || lowerName.includes('스테이지')) {
    return `Stage-${fakerInstance.number.int({ min: 1, max: 50 })}`;
  }

  // === 상거래 관련 (산업별 범위 적용) ===
  if (lowerName.includes('price') || lowerName.includes('amount') || lowerName.includes('금액') || lowerName.includes('가격')) {
    // 게임 산업
    if (industryLower.includes('게임') || industryLower.includes('game')) {
      if (lowerName.includes('item') || lowerName.includes('아이템')) {
        const [min, max] = INDUSTRY_PRICE_RANGES.game.item;
        return fakerInstance.number.int({ min, max });
      }
      if (lowerName.includes('currency') || lowerName.includes('재화') || lowerName.includes('골드') || lowerName.includes('gold')) {
        const [min, max] = INDUSTRY_PRICE_RANGES.game.currency;
        return fakerInstance.number.int({ min, max });
      }
      if (lowerName.includes('gacha') || lowerName.includes('가챠') || lowerName.includes('뽑기')) {
        const [min, max] = INDUSTRY_PRICE_RANGES.game.gacha;
        return fakerInstance.number.int({ min, max });
      }
      // 기본 게임 아이템 가격
      const [min, max] = INDUSTRY_PRICE_RANGES.game.item;
      return fakerInstance.number.int({ min, max });
    }

    // 쇼핑/커머스 산업
    if (industryLower.includes('쇼핑') || industryLower.includes('commerce') || industryLower.includes('이커머스')) {
      if (lowerName.includes('shipping') || lowerName.includes('배송')) {
        const [min, max] = INDUSTRY_PRICE_RANGES.commerce.shipping;
        return fakerInstance.number.int({ min, max });
      }
      if (lowerName.includes('discount') || lowerName.includes('할인')) {
        const [min, max] = INDUSTRY_PRICE_RANGES.commerce.discount;
        return fakerInstance.number.int({ min, max });
      }
      // 기본 상품 가격
      const [min, max] = INDUSTRY_PRICE_RANGES.commerce.product;
      return fakerInstance.number.int({ min, max });
    }

    // 금융 산업
    if (industryLower.includes('금융') || industryLower.includes('finance') || industryLower.includes('bank')) {
      if (lowerName.includes('transfer') || lowerName.includes('송금') || lowerName.includes('이체')) {
        const [min, max] = INDUSTRY_PRICE_RANGES.finance.transfer;
        return fakerInstance.number.int({ min, max });
      }
      if (lowerName.includes('invest') || lowerName.includes('투자')) {
        const [min, max] = INDUSTRY_PRICE_RANGES.finance.investment;
        return fakerInstance.number.int({ min, max });
      }
      if (lowerName.includes('fee') || lowerName.includes('수수료')) {
        const [min, max] = INDUSTRY_PRICE_RANGES.finance.fee;
        return fakerInstance.number.int({ min, max });
      }
      // 기본 금융 거래액
      const [min, max] = INDUSTRY_PRICE_RANGES.finance.transfer;
      return fakerInstance.number.int({ min, max });
    }

    // 기본값 (산업 미지정)
    const [min, max] = INDUSTRY_PRICE_RANGES.default.mid;
    return fakerInstance.number.int({ min, max });
  }

  if (lowerName.includes('quantity') || lowerName.includes('수량')) {
    return fakerInstance.number.int({ min: 1, max: 10 });
  }

  if (lowerName.includes('discount') || lowerName.includes('할인')) {
    return fakerInstance.number.int({ min: 5, max: 50 }); // 5% ~ 50%
  }

  if (lowerName.includes('currency') || lowerName.includes('통화')) {
    const currencies = ['USD', 'KRW', 'JPY', 'EUR', 'CNY'];
    return fakerInstance.helpers.arrayElement(currencies);
  }

  if (lowerName.includes('category') || lowerName.includes('카테고리')) {
    const categories = ['Electronics', 'Fashion', 'Food', 'Sports', 'Books', 'Games'];
    return fakerInstance.helpers.arrayElement(categories);
  }

  if (lowerName.includes('product') || lowerName.includes('item') || lowerName.includes('상품')) {
    return fakerInstance.commerce.productName();
  }

  // === 통계/분석 관련 ===
  if (lowerName.includes('count') || lowerName.includes('수')) {
    return fakerInstance.number.int({ min: 0, max: 100 });
  }

  if (lowerName.includes('rate') || lowerName.includes('ratio') || lowerName.includes('비율')) {
    return fakerInstance.number.float({ min: 0, max: 1, fractionDigits: 2 });
  }

  if (lowerName.includes('percent') || lowerName.includes('percentage')) {
    return fakerInstance.number.int({ min: 0, max: 100 });
  }

  // === 상태/타입 ===
  if (lowerName.includes('status') || lowerName.includes('상태')) {
    const statuses = ['Active', 'Inactive', 'Pending', 'Completed', 'Failed'];
    return fakerInstance.helpers.arrayElement(statuses);
  }

  if (lowerName.includes('type') || lowerName.includes('타입')) {
    const types = ['Type-A', 'Type-B', 'Type-C', 'Special', 'Premium'];
    return fakerInstance.helpers.arrayElement(types);
  }

  if (lowerName.includes('method') || lowerName.includes('방법')) {
    const methods = ['Card', 'Cash', 'Mobile', 'Transfer', 'Coupon'];
    return fakerInstance.helpers.arrayElement(methods);
  }

  // === Boolean ===
  if (lowerName.startsWith('is_') || lowerName.startsWith('has_') || lowerName.includes('enabled')) {
    return fakerInstance.datatype.boolean();
  }

  // === URL ===
  if (lowerName.includes('url') || lowerName.includes('link')) {
    return fakerInstance.internet.url();
  }

  // === 설명/메시지 ===
  if (lowerName.includes('description') || lowerName.includes('message') || lowerName.includes('comment')) {
    return fakerInstance.lorem.sentence();
  }

  // === 버전 ===
  if (lowerName.includes('version')) {
    return `${fakerInstance.number.int({ min: 1, max: 5 })}.${fakerInstance.number.int({ min: 0, max: 9 })}.${fakerInstance.number.int({ min: 0, max: 9 })}`;
  }

  // === 기본값: 문맥 기반 추론 ===
  // 숫자로 끝나는 경우 (예: attempt_count, retry_count)
  if (lowerName.endsWith('count') || lowerName.endsWith('number')) {
    return fakerInstance.number.int({ min: 0, max: 10 });
  }

  // 마지막 폴백: 짧은 알파벳 코드 (10자 → 6자로 줄임)
  console.warn(`⚠️  Using generic fallback for property: ${propertyName}`);
  return fakerInstance.string.alpha(6).toUpperCase();
}
