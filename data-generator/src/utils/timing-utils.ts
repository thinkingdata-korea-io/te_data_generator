/**
 * 시간 분포 유틸리티
 * AI가 정의한 hourlyWeights에 따라 시간대를 선택
 */

import { weightedRandom } from './random';
import { TimingDistribution } from '../types/event';

/**
 * hourlyWeights에 따라 가중치 기반으로 시간(0-23) 선택
 *
 * @param weights 시간대별 가중치 배열 (길이 24, 합계 1.0)
 * @returns 선택된 시간 (0-23)
 */
export function selectHourByWeights(weights: number[]): number {
  if (!weights || weights.length !== 24) {
    throw new Error('hourlyWeights must be an array of length 24');
  }

  // 가중치 기반 랜덤 선택
  const hours = Array.from({ length: 24 }, (_, i) => i);
  return weightedRandom(hours, weights);
}

/**
 * 이벤트별 시간 분포 가져오기
 * eventTimingOverrides가 있으면 사용, 없으면 전역 hourlyWeights 사용
 *
 * @param eventName 이벤트 이름
 * @param timingDist AI 정의 시간 분포
 * @returns hourlyWeights 배열
 */
export function getHourlyWeightsForEvent(
  eventName: string,
  timingDist?: TimingDistribution
): number[] | null {
  if (!timingDist) return null;

  // 1. 이벤트별 오버라이드가 있는지 확인
  const override = timingDist.eventTimingOverrides?.[eventName];
  if (override?.hourlyWeights && override.hourlyWeights.length === 24) {
    return override.hourlyWeights;
  }

  // 2. 전역 hourlyWeights 사용
  if (timingDist.hourlyWeights && timingDist.hourlyWeights.length === 24) {
    return timingDist.hourlyWeights;
  }

  return null;
}

/**
 * Date 객체의 시간을 hourlyWeights에 따라 조정
 *
 * @param baseTime 기준 시간
 * @param weights hourlyWeights 배열
 * @returns 조정된 시간
 */
export function adjustTimeByWeights(baseTime: Date, weights: number[]): Date {
  const selectedHour = selectHourByWeights(weights);

  const adjusted = new Date(baseTime);
  adjusted.setHours(selectedHour);

  // 분과 초는 랜덤하게 (0-59)
  adjusted.setMinutes(Math.floor(Math.random() * 60));
  adjusted.setSeconds(Math.floor(Math.random() * 60));

  return adjusted;
}

/**
 * 요일별 가중치 적용
 *
 * @param date 날짜
 * @param weekdayMultipliers 요일별 가중치 (길이 7, 0=일요일)
 * @returns 적용할 가중치 (기본 1.0)
 */
export function getWeekdayMultiplier(
  date: Date,
  weekdayMultipliers?: number[]
): number {
  if (!weekdayMultipliers || weekdayMultipliers.length !== 7) {
    return 1.0;
  }

  const dayOfWeek = date.getDay(); // 0=일요일, 6=토요일
  return weekdayMultipliers[dayOfWeek] || 1.0;
}
