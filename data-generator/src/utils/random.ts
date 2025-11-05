/**
 * 랜덤 생성 유틸리티
 */

/**
 * 범위 내 랜덤 정수 생성
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 범위 내 랜덤 실수 생성
 */
export function randomFloat(min: number, max: number, decimals: number = 2): number {
  const value = Math.random() * (max - min) + min;
  return parseFloat(value.toFixed(decimals));
}

/**
 * 가중치 기반 랜덤 선택
 */
export function weightedRandom<T>(
  items: T[],
  weights: number[]
): T {
  if (items.length !== weights.length) {
    throw new Error('Items and weights must have same length');
  }

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;

  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return items[i];
    }
  }

  return items[items.length - 1];
}

/**
 * 배열에서 랜덤 선택
 */
export function randomChoice<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * UUID 생성 (간단 버전)
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * 확률 체크 (0-1 사이의 probability)
 */
export function probabilityCheck(probability: number): boolean {
  return Math.random() < probability;
}
