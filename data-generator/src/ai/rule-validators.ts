import { RetentionCurve, EventSequencing } from '../types';
import { ParsedSchema } from '../types/schema';

/**
 * 산업별 벤치마크 (규칙 기반)
 */
const INDUSTRY_BENCHMARKS: Record<string, {
  day1Min: number;
  day1Max: number;
  day7Min: number;
  day7Max: number;
  day30Min: number;
  day30Max: number;
  decayMin: number;
  decayMax: number;
}> = {
  '게임': {
    day1Min: 0.30, day1Max: 0.50,
    day7Min: 0.12, day7Max: 0.28,
    day30Min: 0.02, day30Max: 0.10,
    decayMin: 0.90, decayMax: 0.95
  },
  'Mobile Game': {
    day1Min: 0.30, day1Max: 0.50,
    day7Min: 0.12, day7Max: 0.28,
    day30Min: 0.02, day30Max: 0.10,
    decayMin: 0.90, decayMax: 0.95
  },
  '금융': {
    day1Min: 0.50, day1Max: 0.75,
    day7Min: 0.30, day7Max: 0.55,
    day30Min: 0.15, day30Max: 0.40,
    decayMin: 0.94, decayMax: 0.98
  },
  'Finance': {
    day1Min: 0.50, day1Max: 0.75,
    day7Min: 0.30, day7Max: 0.55,
    day30Min: 0.15, day30Max: 0.40,
    decayMin: 0.94, decayMax: 0.98
  },
  '이커머스': {
    day1Min: 0.38, day1Max: 0.58,
    day7Min: 0.18, day7Max: 0.38,
    day30Min: 0.08, day30Max: 0.22,
    decayMin: 0.92, decayMax: 0.96
  },
  'E-Commerce': {
    day1Min: 0.38, day1Max: 0.58,
    day7Min: 0.18, day7Max: 0.38,
    day30Min: 0.08, day30Max: 0.22,
    decayMin: 0.92, decayMax: 0.96
  },
  '소셜': {
    day1Min: 0.45, day1Max: 0.68,
    day7Min: 0.28, day7Max: 0.48,
    day30Min: 0.12, day30Max: 0.28,
    decayMin: 0.93, decayMax: 0.97
  },
  'Social': {
    day1Min: 0.45, day1Max: 0.68,
    day7Min: 0.28, day7Max: 0.48,
    day30Min: 0.12, day30Max: 0.28,
    decayMin: 0.93, decayMax: 0.97
  },
  'default': {
    day1Min: 0.35, day1Max: 0.65,
    day7Min: 0.20, day7Max: 0.45,
    day30Min: 0.05, day30Max: 0.25,
    decayMin: 0.90, decayMax: 0.97
  }
};

/**
 * 규칙 기반 리텐션 커브 검증
 */
export function validateRetentionWithRules(
  curve: RetentionCurve,
  industry: string
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 산업별 벤치마크 찾기
  const benchmark = INDUSTRY_BENCHMARKS[industry] || INDUSTRY_BENCHMARKS['default'];

  // 1. Day1 범위 체크
  if (curve.day1Retention < benchmark.day1Min || curve.day1Retention > benchmark.day1Max) {
    errors.push(
      `Day1 retention ${(curve.day1Retention * 100).toFixed(1)}% is outside ` +
      `benchmark range ${(benchmark.day1Min * 100).toFixed(0)}-${(benchmark.day1Max * 100).toFixed(0)}%`
    );
  }

  // 2. Day7 범위 체크
  if (curve.day7Retention < benchmark.day7Min || curve.day7Retention > benchmark.day7Max) {
    errors.push(
      `Day7 retention ${(curve.day7Retention * 100).toFixed(1)}% is outside ` +
      `benchmark range ${(benchmark.day7Min * 100).toFixed(0)}-${(benchmark.day7Max * 100).toFixed(0)}%`
    );
  }

  // 3. Day30 범위 체크
  if (curve.day30Retention < benchmark.day30Min || curve.day30Retention > benchmark.day30Max) {
    errors.push(
      `Day30 retention ${(curve.day30Retention * 100).toFixed(1)}% is outside ` +
      `benchmark range ${(benchmark.day30Min * 100).toFixed(0)}-${(benchmark.day30Max * 100).toFixed(0)}%`
    );
  }

  // 4. 논리적 일관성
  if (curve.day1Retention < curve.day7Retention) {
    errors.push('Day1 retention must be >= Day7 retention');
  }

  if (curve.day7Retention < curve.day30Retention) {
    errors.push('Day7 retention must be >= Day30 retention');
  }

  // 5. Decay 범위
  if (curve.retentionDecay < benchmark.decayMin || curve.retentionDecay > benchmark.decayMax) {
    errors.push(
      `Retention decay ${curve.retentionDecay.toFixed(3)} is outside ` +
      `benchmark range ${benchmark.decayMin}-${benchmark.decayMax}`
    );
  }

  // 6. 세그먼트 가중치
  for (const [segment, multiplier] of Object.entries(curve.segmentMultipliers)) {
    if (multiplier < 0.3 || multiplier > 3.0) {
      errors.push(
        `Segment multiplier ${multiplier} for ${segment} is unrealistic (should be 0.3-3.0)`
      );
    }
  }

  // 7. 생명주기 확률
  const lifecycleProbs = curve.lifecycleProbabilities;
  if (lifecycleProbs.new < 0.5 || lifecycleProbs.new > 1.0) {
    warnings.push('New user probability seems unusual');
  }
  if (lifecycleProbs.active < 0.4 || lifecycleProbs.active > 0.9) {
    warnings.push('Active user probability seems unusual');
  }
  if (lifecycleProbs.churned > 0.1) {
    warnings.push('Churned user probability seems high');
  }

  // 8. 주말 부스트
  if (curve.weekendBoost && (curve.weekendBoost < 0.7 || curve.weekendBoost > 2.0)) {
    warnings.push('Weekend boost seems unusual');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * 규칙 기반 이벤트 순서 검증
 */
export function validateEventSequencingWithRules(
  sequencing: EventSequencing,
  schema: ParsedSchema
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  const allEvents = new Set(schema.events.map(e => e.event_name));
  const categorizedEvents = new Set<string>();

  // 1. 모든 이벤트가 카테고리에 포함되었는지
  for (const [category, events] of Object.entries(sequencing.eventCategories)) {
    for (const eventName of events) {
      if (!allEvents.has(eventName)) {
        errors.push(`Event '${eventName}' in category '${category}' does not exist in schema`);
      }
      categorizedEvents.add(eventName);
    }
  }

  const uncategorized = Array.from(allEvents).filter(e => !categorizedEvents.has(e));
  if (uncategorized.length > 0) {
    errors.push(`${uncategorized.length} events not categorized: ${uncategorized.slice(0, 3).join(', ')}...`);
  }

  // 2. Lifecycle 이벤트 체크
  const lifecycleEvents = sequencing.eventCategories.lifecycle || [];
  const installKeywords = ['install', 'signup', 'register', 'onboard'];
  const hasLifecycle = lifecycleEvents.some(e =>
    installKeywords.some(keyword => e.toLowerCase().includes(keyword))
  );

  if (!hasLifecycle && lifecycleEvents.length === 0) {
    errors.push('No lifecycle events (install/signup) found');
  }

  // 3. Session boundary 이벤트 체크
  if (!sequencing.eventCategories.session_start || sequencing.eventCategories.session_start.length === 0) {
    errors.push('No session_start events defined');
  }

  if (!sequencing.eventCategories.session_end || sequencing.eventCategories.session_end.length === 0) {
    errors.push('No session_end events defined');
  }

  // 4. StrictDependencies 순환 참조 체크
  const hasCycle = detectCycle(sequencing.strictDependencies);
  if (hasCycle) {
    errors.push('Circular dependency detected in strictDependencies');
  }

  // 5. ExecutionConstraints 체크
  for (const [eventName, constraints] of Object.entries(sequencing.executionConstraints)) {
    if (!allEvents.has(eventName)) {
      errors.push(`Constraint defined for non-existent event '${eventName}'`);
    }

    // 극단적인 값 체크
    if (constraints.maxOccurrencesPerSession && constraints.maxOccurrencesPerSession > 100) {
      warnings.push(`maxOccurrencesPerSession for '${eventName}' seems too high (${constraints.maxOccurrencesPerSession})`);
    }

    if (constraints.maxOccurrencesPerUser && constraints.maxOccurrencesPerUser > 1000) {
      warnings.push(`maxOccurrencesPerUser for '${eventName}' seems too high (${constraints.maxOccurrencesPerUser})`);
    }
  }

  // 6. LogicalSequences 체크
  for (const sequence of sequencing.logicalSequences) {
    for (const eventName of sequence.sequence) {
      if (!allEvents.has(eventName)) {
        errors.push(`Sequence '${sequence.name}' contains non-existent event '${eventName}'`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * 순환 참조 탐지
 */
function detectCycle(dependencies: Record<string, string[]>): boolean {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function hasCycleUtil(node: string): boolean {
    if (!visited.has(node)) {
      visited.add(node);
      recursionStack.add(node);

      const deps = dependencies[node] || [];
      for (const dep of deps) {
        if (!visited.has(dep) && hasCycleUtil(dep)) {
          return true;
        } else if (recursionStack.has(dep)) {
          return true;
        }
      }
    }

    recursionStack.delete(node);
    return false;
  }

  for (const node of Object.keys(dependencies)) {
    if (hasCycleUtil(node)) {
      return true;
    }
  }

  return false;
}
