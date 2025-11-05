import { UserLifecycleStage } from '../types';
import { probabilityCheck } from './random';

/**
 * 유저 생명주기 관리 유틸리티
 */

/**
 * 생명주기 전환 확률
 */
const LIFECYCLE_TRANSITION_PROBABILITIES: Record<
  UserLifecycleStage,
  Partial<Record<UserLifecycleStage, number>>
> = {
  new: {
    active: 0.7,
    churned: 0.3
  },
  active: {
    active: 0.85,
    returning: 0.1,
    dormant: 0.05
  },
  returning: {
    active: 0.6,
    dormant: 0.3,
    churned: 0.1
  },
  dormant: {
    returning: 0.2,
    churned: 0.6,
    dormant: 0.2
  },
  churned: {
    // 이탈 유저는 복귀 가능성 낮음
    returning: 0.05,
    churned: 0.95
  }
};

/**
 * 유저의 다음 생명주기 단계 결정
 */
export function getNextLifecycleStage(
  currentStage: UserLifecycleStage,
  daysSinceLastActive: number
): UserLifecycleStage {
  // 일정 기간 활동 없으면 자동으로 dormant/churned
  if (daysSinceLastActive > 30) {
    return 'churned';
  } else if (daysSinceLastActive > 7 && currentStage !== 'new') {
    return 'dormant';
  }

  // 확률 기반 전환
  const transitions = LIFECYCLE_TRANSITION_PROBABILITIES[currentStage];
  const random = Math.random();
  let cumulative = 0;

  for (const [stage, probability] of Object.entries(transitions)) {
    cumulative += probability;
    if (random <= cumulative) {
      return stage as UserLifecycleStage;
    }
  }

  return currentStage;
}

/**
 * 생명주기 단계별 활동 가능 여부
 */
export function shouldBeActiveToday(
  stage: UserLifecycleStage,
  daysSinceInstall: number
): boolean {
  switch (stage) {
    case 'new':
      // 신규 유저는 첫 3일간 높은 활동
      if (daysSinceInstall <= 3) {
        return probabilityCheck(0.9);
      }
      return probabilityCheck(0.6);

    case 'active':
      return probabilityCheck(0.8);

    case 'returning':
      return probabilityCheck(0.5);

    case 'dormant':
      return probabilityCheck(0.1);

    case 'churned':
      return probabilityCheck(0.02);

    default:
      return false;
  }
}

/**
 * 생명주기 단계별 세션 수 결정
 */
export function getSessionCountForStage(stage: UserLifecycleStage): number {
  switch (stage) {
    case 'new':
      return Math.floor(Math.random() * 3) + 2; // 2-4 sessions

    case 'active':
      return Math.floor(Math.random() * 4) + 2; // 2-5 sessions

    case 'returning':
      return Math.floor(Math.random() * 2) + 1; // 1-2 sessions

    case 'dormant':
      return 1; // 1 session

    case 'churned':
      return Math.random() < 0.5 ? 1 : 0; // 0-1 session

    default:
      return 1;
  }
}
