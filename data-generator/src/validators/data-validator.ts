import * as fs from 'fs';
import * as path from 'path';
import { ParsedSchema, EventDefinition } from '../types';

/**
 * 데이터 검증 결과
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  statistics: ValidationStatistics;
}

export interface ValidationError {
  type: 'EVENT_DEPENDENCY' | 'TIMESTAMP_ORDER' | 'REQUIRED_PROPERTY' | 'DATA_TYPE' | 'FUNNEL_SEQUENCE';
  severity: 'error' | 'warning';
  userId?: string;
  eventName?: string;
  message: string;
  details?: any;
}

export interface ValidationWarning {
  type: string;
  message: string;
  count?: number;
}

export interface ValidationStatistics {
  totalEvents: number;
  totalUsers: number;
  uniqueEventTypes: number;
  eventCounts: Record<string, number>;
  userEventCounts: Record<string, number>;
  timeRange: {
    start: string;
    end: string;
  };
  dependencyViolations: number;
  timestampViolations: number;
  propertyViolations: number;
}

/**
 * ThinkingEngine 이벤트 데이터 검증기
 */
export class DataValidator {
  private schema: ParsedSchema;
  private eventDefinitions: Map<string, EventDefinition>;

  constructor(schema: ParsedSchema) {
    this.schema = schema;
    this.eventDefinitions = new Map(
      schema.events.map(e => [e.event_name, e])
    );
  }

  /**
   * JSONL 파일 검증
   */
  async validateJSONLFile(filePath: string): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const stats: ValidationStatistics = {
      totalEvents: 0,
      totalUsers: 0,
      uniqueEventTypes: 0,
      eventCounts: {},
      userEventCounts: {},
      timeRange: { start: '', end: '' },
      dependencyViolations: 0,
      timestampViolations: 0,
      propertyViolations: 0
    };

    // 사용자별 이벤트 히스토리 추적
    const userEventHistory: Map<string, Array<{
      eventName: string;
      timestamp: number;
      data: any;
    }>> = new Map();

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.trim().split('\n');

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const event = JSON.parse(line);
          stats.totalEvents++;

          // 기본 구조 검증
          this.validateEventStructure(event, errors);

          // 이벤트 타입 카운트
          const eventName = event.event || event['#event_name'];
          if (eventName) {
            stats.eventCounts[eventName] = (stats.eventCounts[eventName] || 0) + 1;
          }

          // 사용자별 이벤트 추적
          const userId = event.properties?.['#distinct_id'] || event['#distinct_id'];
          if (userId) {
            if (!userEventHistory.has(userId)) {
              userEventHistory.set(userId, []);
              stats.totalUsers++;
            }

            const timestamp = new Date(event['#time'] || event.time).getTime();
            userEventHistory.get(userId)!.push({
              eventName,
              timestamp,
              data: event
            });

            stats.userEventCounts[userId] = (stats.userEventCounts[userId] || 0) + 1;
          }

          // 속성 검증
          this.validateEventProperties(event, eventName, errors, stats);

        } catch (parseError: any) {
          errors.push({
            type: 'DATA_TYPE',
            severity: 'error',
            message: `JSON 파싱 실패: ${parseError.message}`,
            details: { line }
          });
        }
      }

      // 사용자별 시퀀스 검증
      for (const [userId, events] of userEventHistory.entries()) {
        // 시간순 정렬
        events.sort((a, b) => a.timestamp - b.timestamp);

        // 타임스탬프 순서 검증
        this.validateTimestampOrder(userId, events, errors, stats);

        // 이벤트 의존성 검증
        this.validateEventDependencies(userId, events, errors, stats);

        // 퍼널 시퀀스 검증
        this.validateFunnelSequences(userId, events, warnings);
      }

      // 통계 계산
      stats.uniqueEventTypes = Object.keys(stats.eventCounts).length;

      if (stats.totalEvents > 0) {
        const allTimestamps = Array.from(userEventHistory.values())
          .flat()
          .map(e => e.timestamp)
          .sort((a, b) => a - b);

        stats.timeRange.start = new Date(allTimestamps[0]).toISOString();
        stats.timeRange.end = new Date(allTimestamps[allTimestamps.length - 1]).toISOString();
      }

    } catch (error: any) {
      errors.push({
        type: 'DATA_TYPE',
        severity: 'error',
        message: `파일 읽기 실패: ${error.message}`
      });
    }

    return {
      isValid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
      warnings,
      statistics: stats
    };
  }

  /**
   * 이벤트 구조 검증
   */
  private validateEventStructure(event: any, errors: ValidationError[]): void {
    // 필수 필드 확인
    const requiredFields = ['#type', '#time', '#distinct_id'];

    for (const field of requiredFields) {
      if (!event[field] && !event.properties?.[field]) {
        errors.push({
          type: 'REQUIRED_PROPERTY',
          severity: 'error',
          message: `필수 필드 누락: ${field}`,
          details: { event }
        });
      }
    }

    // 이벤트 타입 확인
    if (event['#type'] === 'track' && !event['#event_name'] && !event.event) {
      errors.push({
        type: 'REQUIRED_PROPERTY',
        severity: 'error',
        message: 'track 이벤트에 #event_name 또는 event 필드 누락'
      });
    }
  }

  /**
   * 이벤트 속성 검증
   */
  private validateEventProperties(
    event: any,
    eventName: string,
    errors: ValidationError[],
    stats: ValidationStatistics
  ): void {
    const eventDef = this.eventDefinitions.get(eventName);
    if (!eventDef) return;

    // 이벤트에 연결된 필수 속성 확인
    const eventProperties = this.schema.properties.filter(
      p => p.event_name === eventName
    );

    const properties = event.properties || {};

    for (const propDef of eventProperties) {
      const propValue = properties[propDef.property_name];

      // 데이터 타입 검증 (간단한 체크)
      if (propValue !== undefined && propValue !== null) {
        const actualType = typeof propValue;
        const expectedType = propDef.data_type.toLowerCase();

        if (
          (expectedType === 'number' && actualType !== 'number') ||
          (expectedType === 'string' && actualType !== 'string') ||
          (expectedType === 'boolean' && actualType !== 'boolean')
        ) {
          stats.propertyViolations++;
          errors.push({
            type: 'DATA_TYPE',
            severity: 'warning',
            eventName,
            message: `속성 타입 불일치: ${propDef.property_name} (expected: ${expectedType}, got: ${actualType})`
          });
        }
      }
    }
  }

  /**
   * 타임스탬프 순서 검증
   */
  private validateTimestampOrder(
    userId: string,
    events: Array<{ eventName: string; timestamp: number; data: any }>,
    errors: ValidationError[],
    stats: ValidationStatistics
  ): void {
    for (let i = 1; i < events.length; i++) {
      if (events[i].timestamp < events[i - 1].timestamp) {
        stats.timestampViolations++;
        errors.push({
          type: 'TIMESTAMP_ORDER',
          severity: 'error',
          userId,
          message: `타임스탬프 순서 오류: ${events[i].eventName} (${new Date(events[i].timestamp).toISOString()}) 이 ${events[i - 1].eventName} (${new Date(events[i - 1].timestamp).toISOString()}) 보다 이전`,
          details: {
            currentEvent: events[i].eventName,
            previousEvent: events[i - 1].eventName
          }
        });
      }
    }
  }

  /**
   * 이벤트 의존성 검증
   */
  private validateEventDependencies(
    userId: string,
    events: Array<{ eventName: string; timestamp: number; data: any }>,
    errors: ValidationError[],
    stats: ValidationStatistics
  ): void {
    const occurredEvents = new Set<string>();

    for (const event of events) {
      const eventDef = this.eventDefinitions.get(event.eventName);

      if (eventDef?.required_previous_events) {
        for (const requiredEvent of eventDef.required_previous_events) {
          if (!occurredEvents.has(requiredEvent)) {
            stats.dependencyViolations++;
            errors.push({
              type: 'EVENT_DEPENDENCY',
              severity: 'error',
              userId,
              eventName: event.eventName,
              message: `필수 선행 이벤트 누락: ${event.eventName}은(는) ${requiredEvent} 이후에 발생해야 함`,
              details: {
                missingEvent: requiredEvent,
                occurredEvents: Array.from(occurredEvents)
              }
            });
          }
        }
      }

      occurredEvents.add(event.eventName);
    }
  }

  /**
   * 퍼널 시퀀스 검증
   */
  private validateFunnelSequences(
    userId: string,
    events: Array<{ eventName: string; timestamp: number; data: any }>,
    warnings: ValidationWarning[]
  ): void {
    const eventSequence = events.map(e => e.eventName);

    for (const funnel of this.schema.funnels) {
      let funnelIndex = 0;
      let funnelStarted = false;

      for (const eventName of eventSequence) {
        if (eventName === funnel.steps[funnelIndex]) {
          funnelStarted = true;
          funnelIndex++;

          if (funnelIndex === funnel.steps.length) {
            // 퍼널 완료
            break;
          }
        } else if (funnelStarted && funnelIndex < funnel.steps.length) {
          // 퍼널 중간에 다른 이벤트 발생 (정상적일 수 있음)
        }
      }

      // 퍼널이 시작되었지만 완료되지 않은 경우
      if (funnelStarted && funnelIndex < funnel.steps.length) {
        warnings.push({
          type: 'FUNNEL_INCOMPLETE',
          message: `사용자 ${userId}: 퍼널 '${funnel.name}' 시작했으나 미완료 (${funnelIndex}/${funnel.steps.length} 단계 완료)`
        });
      }
    }
  }

  /**
   * 디렉토리 내 모든 JSONL 파일 검증
   */
  async validateDirectory(dirPath: string): Promise<Map<string, ValidationResult>> {
    const results = new Map<string, ValidationResult>();

    const files = fs.readdirSync(dirPath);

    for (const file of files) {
      if (file.endsWith('.jsonl')) {
        const filePath = path.join(dirPath, file);
        const result = await this.validateJSONLFile(filePath);
        results.set(file, result);
      }
    }

    return results;
  }
}

/**
 * 검증 결과 포맷팅
 */
export function formatValidationResult(result: ValidationResult): string {
  const lines: string[] = [];

  lines.push('='.repeat(80));
  lines.push('📊 데이터 검증 결과');
  lines.push('='.repeat(80));
  lines.push('');

  // 상태
  if (result.isValid) {
    lines.push('✅ 검증 성공: 모든 데이터가 유효합니다.');
  } else {
    lines.push(`❌ 검증 실패: ${result.errors.filter(e => e.severity === 'error').length}개의 에러 발견`);
  }
  lines.push('');

  // 통계
  lines.push('📈 통계:');
  lines.push(`  총 이벤트 수: ${result.statistics.totalEvents.toLocaleString()}`);
  lines.push(`  총 사용자 수: ${result.statistics.totalUsers.toLocaleString()}`);
  lines.push(`  고유 이벤트 타입: ${result.statistics.uniqueEventTypes}`);
  lines.push(`  기간: ${result.statistics.timeRange.start} ~ ${result.statistics.timeRange.end}`);
  lines.push('');

  // 이벤트 분포
  lines.push('📊 이벤트 분포 (상위 10개):');
  const sortedEvents = Object.entries(result.statistics.eventCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  for (const [eventName, count] of sortedEvents) {
    const percentage = ((count / result.statistics.totalEvents) * 100).toFixed(1);
    lines.push(`  ${eventName}: ${count.toLocaleString()} (${percentage}%)`);
  }
  lines.push('');

  // 에러
  if (result.errors.length > 0) {
    lines.push(`❌ 에러 (${result.errors.length}개):`);
    const errorGroups = new Map<string, ValidationError[]>();

    for (const error of result.errors) {
      const key = `${error.type}_${error.severity}`;
      if (!errorGroups.has(key)) {
        errorGroups.set(key, []);
      }
      errorGroups.get(key)!.push(error);
    }

    for (const [key, errors] of errorGroups) {
      const firstError = errors[0];
      lines.push(`  [${firstError.type}] ${firstError.message}`);
      if (errors.length > 1) {
        lines.push(`    (총 ${errors.length}건 발생)`);
      }
    }
    lines.push('');
  }

  // 경고
  if (result.warnings.length > 0) {
    lines.push(`⚠️  경고 (${result.warnings.length}개):`);
    for (const warning of result.warnings.slice(0, 10)) {
      lines.push(`  ${warning.message}`);
    }
    if (result.warnings.length > 10) {
      lines.push(`  ... 외 ${result.warnings.length - 10}개`);
    }
    lines.push('');
  }

  // 요약
  lines.push('='.repeat(80));
  lines.push(`검증 위반 사항: 의존성 ${result.statistics.dependencyViolations}, 타임스탬프 ${result.statistics.timestampViolations}, 속성 ${result.statistics.propertyViolations}`);
  lines.push('='.repeat(80));

  return lines.join('\n');
}
