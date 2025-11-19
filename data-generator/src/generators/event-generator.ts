import {
  User,
  Session,
  EventData,
  ParsedSchema,
  AIAnalysisResult,
  PropertyRange,
  FunnelDefinition
} from '../types';
import { DependencyManager } from './dependency-manager';
import { generateFallbackValue } from './faker-utils';
import {
  randomInt,
  randomFloat,
  weightedRandom,
  probabilityCheck,
  generateUUID
} from '../utils/random';
import { addMilliseconds } from '../utils/date';
import { exponentialDistribution } from '../utils/distribution';

/**
 * 이벤트 생성기
 */
export class EventGenerator {
  private schema: ParsedSchema;
  private aiAnalysis: AIAnalysisResult;
  private dependencyManager: DependencyManager;
  private industry: string;

  constructor(schema: ParsedSchema, aiAnalysis: AIAnalysisResult, industry: string = '') {
    this.schema = schema;
    this.aiAnalysis = aiAnalysis;
    this.dependencyManager = new DependencyManager(schema, aiAnalysis);
    this.industry = industry;
  }

  /**
   * 세션별 이벤트 생성 (이벤트 순서 제약 적용)
   */
  generateSessionEvents(session: Session): EventData[] {
    const events: EventData[] = [];
    const executedEvents = new Set<string>();
    let currentTime = session.start;

    // 세션 정보
    const isFirstSession = session.user.total_sessions === 0;
    const sessionNumber = session.user.total_sessions + 1;

    // DependencyManager 세션 카운트 리셋
    this.dependencyManager.resetSessionCounts();

    // 1. session_start 이벤트 (AI가 정의한 카테고리)
    const sessionStartEvents = this.dependencyManager.getEventsByCategory('session_start');
    for (const eventName of sessionStartEvents) {
      if (this.schema.events.find(e => e.event_name === eventName)) {
        const event = this.createEvent(eventName, session.user, currentTime);
        events.push(event);
        executedEvents.add(eventName);
        this.dependencyManager.recordEventExecution(eventName);
        currentTime = addMilliseconds(currentTime, this.getEventInterval());
      }
    }

    // 2. onboarding 이벤트 (첫 세션에만)
    if (isFirstSession) {
      const onboardingEvents = this.dependencyManager.getEventsByCategory('onboarding');
      for (const eventName of onboardingEvents) {
        if (!this.dependencyManager.canExecuteEvent(eventName, executedEvents, isFirstSession, sessionNumber)) {
          continue;
        }

        // 확률적으로 실행 (온보딩 완료율 반영)
        if (probabilityCheck(0.7)) {
          const event = this.createEvent(eventName, session.user, currentTime);
          events.push(event);
          executedEvents.add(eventName);
          this.dependencyManager.recordEventExecution(eventName);
          currentTime = addMilliseconds(currentTime, this.getEventInterval());
        }
      }
    }

    // 3. core 이벤트 생성
    const avgEventsPerSession =
      this.aiAnalysis.sessionPatterns.avgEventsPerSession[session.user.segment] || 10;
    const targetEventCount = Math.floor(avgEventsPerSession * (0.8 + Math.random() * 0.4));
    const remainingEvents = targetEventCount - events.length;

    for (let i = 0; i < remainingEvents; i++) {
      const availableEvents = this.getAvailableEvents(
        session.user,
        executedEvents,
        isFirstSession,
        sessionNumber
      );

      if (availableEvents.length === 0) break;

      const selectedEvent = this.selectEvent(availableEvents);
      if (!selectedEvent) break;

      const event = this.createEvent(selectedEvent.event_name, session.user, currentTime);
      events.push(event);
      executedEvents.add(selectedEvent.event_name);
      this.dependencyManager.recordEventExecution(selectedEvent.event_name);

      currentTime = addMilliseconds(currentTime, this.getEventInterval());
      if (currentTime > session.end) break;
    }

    // 4. session_end 이벤트
    const sessionEndEvents = this.dependencyManager.getEventsByCategory('session_end');
    for (const eventName of sessionEndEvents) {
      if (this.schema.events.find(e => e.event_name === eventName)) {
        const event = this.createEvent(eventName, session.user, session.end);
        events.push(event);
        executedEvents.add(eventName);
        this.dependencyManager.recordEventExecution(eventName);
      }
    }

    return events;
  }

  /**
   * 퍼널 이벤트 생성
   */
  private generateFunnelEvents(
    funnel: FunnelDefinition,
    user: User,
    startTime: Date,
    executedEvents: Set<string>
  ): EventData[] {
    const events: EventData[] = [];
    let currentTime = startTime;

    for (const step of funnel.steps) {
      // 의존성 체크
      if (!this.dependencyManager.canExecuteEvent(step, executedEvents)) {
        // 의존성 미충족 시 퍼널 중단
        break;
      }

      // 전환율 체크
      const conversionRate = funnel.conversion_rate || 0.7;
      if (!probabilityCheck(conversionRate)) {
        // 전환 실패 시 퍼널 이탈
        break;
      }

      const event = this.createEvent(step, user, currentTime);
      events.push(event);
      executedEvents.add(step);

      currentTime = addMilliseconds(currentTime, this.getEventInterval());
    }

    return events;
  }

  /**
   * 단일 이벤트 생성
   */
  private createEvent(
    eventName: string,
    user: User,
    timestamp: Date
  ): EventData {
    const eventDef = this.schema.events.find(e => e.event_name === eventName);
    const properties = this.generateEventProperties(eventName, user);

    return {
      event_name: eventName,
      timestamp,
      user,
      properties
    };
  }

  /**
   * 이벤트 속성 생성
   */
  private generateEventProperties(
    eventName: string,
    user: User
  ): Record<string, any> {
    const properties: Record<string, any> = {};

    // 해당 이벤트의 속성 정의 찾기
    const eventProps = this.schema.properties.filter(
      p => !p.event_name || p.event_name === eventName
    );

    // AI 범위 찾기
    const eventRanges = this.aiAnalysis.eventRanges.find(
      r => r.event_name === eventName
    );

    eventProps.forEach(propDef => {
      const propertyName = propDef.property_name;

      // AI 범위가 있으면 사용
      const range = eventRanges?.properties.find(
        p => p.property_name === propertyName
      );

      if (range) {
        properties[propertyName] = this.generateValueFromRange(range, user);
      } else {
        // AI 범위가 없으면 Faker.js 폴백 (산업 정보 전달)
        properties[propertyName] = generateFallbackValue(
          propertyName,
          user.locale,
          this.industry
        );
      }
    });

    return properties;
  }

  /**
   * AI 범위로부터 값 생성
   */
  private generateValueFromRange(range: PropertyRange, user: User): any {
    // 세그먼트별 범위가 있으면 사용
    const segmentRange = range.segmentRanges?.[user.segment];
    const effectiveRange = segmentRange || range;

    switch (range.type) {
      case 'number':
        const min = effectiveRange.min || 0;
        const max = effectiveRange.max || 100;
        return randomInt(min, max);

      case 'choice':
        const values = effectiveRange.values || ['A', 'B', 'C'];
        // weights가 없거나 values와 길이가 다르면 균등 가중치 생성
        const weights = (effectiveRange.weights && effectiveRange.weights.length === values.length)
          ? effectiveRange.weights
          : values.map(() => 1 / values.length);
        return weightedRandom(values, weights);

      case 'boolean':
        return Math.random() < 0.5;

      case 'string':
      default:
        // 문자열은 Faker.js로 생성 (산업 정보 전달)
        return generateFallbackValue(range.property_name, user.locale, this.industry);
    }
  }

  /**
   * 실행 가능한 이벤트 목록 가져오기 (이벤트 순서 제약 적용)
   */
  private getAvailableEvents(
    user: User,
    executedEvents: Set<string>,
    isFirstSession: boolean = false,
    sessionNumber: number = 1
  ): typeof this.schema.events {
    return this.schema.events.filter(event => {
      // 이미 실행된 이벤트 제외
      if (executedEvents.has(event.event_name)) return false;

      // 시스템 이벤트 제외
      if (event.category === 'system') return false;

      // 세션 경계 이벤트 제외 (session_start, session_end, lifecycle)
      const category = this.dependencyManager.getEventCategory(event.event_name);
      if (category === 'session_start' || category === 'session_end' || category === 'lifecycle') {
        return false;
      }

      // 온보딩 이벤트는 여기서 제외 (이미 처리됨)
      if (category === 'onboarding') {
        return false;
      }

      // 생명주기 단계 체크
      if (
        event.user_lifecycle_stage &&
        event.user_lifecycle_stage.length > 0 &&
        !event.user_lifecycle_stage.includes(user.lifecycle_stage)
      ) {
        return false;
      }

      // 의존성 및 실행 제약 체크
      if (!this.dependencyManager.canExecuteEvent(event.event_name, executedEvents, isFirstSession, sessionNumber)) {
        return false;
      }

      return true;
    });
  }

  /**
   * 확률 기반 이벤트 선택
   */
  private selectEvent(
    events: typeof this.schema.events
  ): typeof this.schema.events[0] | null {
    if (events.length === 0) return null;

    // 확률이 있는 이벤트들
    const weights = events.map(e => e.trigger_probability || 0.5);
    return weightedRandom(events, weights);
  }

  /**
   * 이벤트 간 시간 간격 (밀리초)
   */
  private getEventInterval(): number {
    // 지수 분포 사용 (평균 10초)
    const interval = exponentialDistribution(1 / 10) * 1000;
    // 최소 1초, 최대 60초
    return Math.max(1000, Math.min(60000, interval));
  }

  /**
   * 의존성 관리자 반환
   */
  getDependencyManager(): DependencyManager {
    return this.dependencyManager;
  }
}
