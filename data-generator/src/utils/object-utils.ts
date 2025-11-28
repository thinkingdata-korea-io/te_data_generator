/**
 * Object 유틸리티 함수들
 */

/**
 * Dot-notation 플랫 객체를 중첩 객체로 변환
 *
 * Example:
 * {
 *   'te_ads_object.media_source': 'google',
 *   'te_ads_object.campaign_name': 'summer'
 * }
 *
 * →
 *
 * {
 *   te_ads_object: {
 *     media_source: 'google',
 *     campaign_name: 'summer'
 *   }
 * }
 */
export function flatToNested(flat: Record<string, any>): Record<string, any> {
  const nested: Record<string, any> = {};

  for (const [key, value] of Object.entries(flat)) {
    if (key.includes('.')) {
      // Dot notation이 있는 경우 중첩 객체로 변환
      const parts = key.split('.');
      let current = nested;

      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      }

      // 마지막 key에 value 할당
      current[parts[parts.length - 1]] = value;
    } else {
      // Dot notation이 없는 경우 그대로 복사
      nested[key] = value;
    }
  }

  return nested;
}

/**
 * 중첩 객체를 플랫 dot-notation 객체로 변환
 */
export function nestedToFlat(nested: Record<string, any>, prefix: string = ''): Record<string, any> {
  const flat: Record<string, any> = {};

  for (const [key, value] of Object.entries(nested)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      // 재귀적으로 중첩 객체 처리
      Object.assign(flat, nestedToFlat(value, fullKey));
    } else {
      // Primitive 값은 그대로 할당
      flat[fullKey] = value;
    }
  }

  return flat;
}
