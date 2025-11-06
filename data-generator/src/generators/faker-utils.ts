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
 * 속성명 기반 폴백 값 생성
 */
export function generateFallbackValue(propertyName: string, locale: string = 'en'): any {
  const fakerInstance = getFakerInstance(locale);
  const lowerName = propertyName.toLowerCase();

  // 이름 관련
  if (lowerName.includes('name') || lowerName.includes('nickname')) {
    return fakerInstance.person.fullName();
  }

  // 이메일
  if (lowerName.includes('email')) {
    return fakerInstance.internet.email();
  }

  // 전화번호
  if (lowerName.includes('phone')) {
    return fakerInstance.phone.number();
  }

  // 주소
  if (lowerName.includes('address')) {
    return fakerInstance.location.streetAddress();
  }

  if (lowerName.includes('city')) {
    return fakerInstance.location.city();
  }

  if (lowerName.includes('country')) {
    return fakerInstance.location.country();
  }

  // 날짜
  if (lowerName.includes('date') || lowerName.includes('time')) {
    return fakerInstance.date.recent().toISOString();
  }

  // ID
  if (lowerName.includes('id')) {
    return fakerInstance.string.uuid();
  }

  // 숫자
  if (lowerName.includes('count') || lowerName.includes('number')) {
    return fakerInstance.number.int({ min: 1, max: 100 });
  }

  // 기본값
  return fakerInstance.string.alphanumeric(10);
}
