import {
  User,
  Session,
  EventData,
  ParsedSchema,
  AIAnalysisResult,
  PropertyRange,
  FunnelDefinition,
  PropertyDefinition
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

    // 3. 🆕 트랜잭션 및 core 이벤트 생성
    const avgEventsPerSession =
      this.aiAnalysis.sessionPatterns.avgEventsPerSession[session.user.segment] || 10;
    const targetEventCount = Math.floor(avgEventsPerSession * (0.8 + Math.random() * 0.4));
    const remainingEvents = targetEventCount - events.length;

    for (let i = 0; i < remainingEvents; i++) {
      if (currentTime > session.end) break;

      // 🆕 트랜잭션 시작 시도 (확률적)
      const transactionGenerated = this.tryGenerateTransaction(
        session,
        executedEvents,
        isFirstSession,
        sessionNumber,
        currentTime,
        events
      );

      if (transactionGenerated) {
        currentTime = events[events.length - 1]?.timestamp || currentTime;
        currentTime = addMilliseconds(currentTime, this.getEventInterval());
        continue;
      }

      // 일반 core 이벤트 생성
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
   * 🆕 트랜잭션 생성 시도 (원자적 실행)
   * 반환값: true면 트랜잭션 생성 성공, false면 생성 안 함
   */
  private tryGenerateTransaction(
    session: Session,
    executedEvents: Set<string>,
    isFirstSession: boolean,
    sessionNumber: number,
    startTime: Date,
    eventsArray: EventData[]
  ): boolean {
    const sequencing = this.aiAnalysis.eventSequencing;
    if (!sequencing || !sequencing.transactions) return false;

    // 랜덤으로 트랜잭션 선택 (30% 확률로 시도)
    if (!probabilityCheck(0.3)) return false;

    // 사용 가능한 트랜잭션 필터링
    const availableTransactions = sequencing.transactions.filter(transaction => {
      // 시작 이벤트가 실행 가능한가?
      return transaction.startEvents.some(startEvent =>
        this.dependencyManager.canExecuteEvent(startEvent, executedEvents, isFirstSession, sessionNumber)
      );
    });

    if (availableTransactions.length === 0) return false;

    // 랜덤 선택
    const transaction = availableTransactions[Math.floor(Math.random() * availableTransactions.length)];

    // 트랜잭션 생성
    const transactionEvents = this.generateTransaction(
      transaction.name,
      session.user,
      startTime,
      executedEvents,
      isFirstSession,
      sessionNumber
    );

    if (transactionEvents.length === 0) return false;

    // 성공: 이벤트 추가
    eventsArray.push(...transactionEvents);
    return true;
  }

  /**
   * 🆕 단일 트랜잭션 생성 (시작 → 내부 → 종료)
   */
  private generateTransaction(
    transactionName: string,
    user: User,
    startTime: Date,
    executedEvents: Set<string>,
    isFirstSession: boolean,
    sessionNumber: number
  ): EventData[] {
    const sequencing = this.aiAnalysis.eventSequencing;
    if (!sequencing || !sequencing.transactions) return [];

    const transaction = sequencing.transactions.find(t => t.name === transactionName);
    if (!transaction) return [];

    const transactionEvents: EventData[] = [];
    let currentTime = startTime;

    // 1. 시작 이벤트 (첫 번째 사용 가능한 것)
    const startEvent = transaction.startEvents.find(e =>
      this.dependencyManager.canExecuteEvent(e, executedEvents, isFirstSession, sessionNumber)
    );

    if (!startEvent) return [];

    const startEventData = this.createEvent(startEvent, user, currentTime);
    transactionEvents.push(startEventData);
    executedEvents.add(startEvent);
    this.dependencyManager.recordEventExecution(startEvent);
    currentTime = addMilliseconds(currentTime, this.getEventInterval());

    // 2. 내부 이벤트 (랜덤하게 2~5개)
    const innerEventCount = randomInt(2, Math.min(5, transaction.innerEvents.length + 1));
    for (let i = 0; i < innerEventCount; i++) {
      const availableInner = transaction.innerEvents.filter(e =>
        !executedEvents.has(e) &&
        this.dependencyManager.canExecuteEvent(e, executedEvents, isFirstSession, sessionNumber)
      );

      if (availableInner.length === 0) break;

      const innerEvent = availableInner[Math.floor(Math.random() * availableInner.length)];
      const innerEventData = this.createEvent(innerEvent, user, currentTime);
      transactionEvents.push(innerEventData);
      executedEvents.add(innerEvent);
      this.dependencyManager.recordEventExecution(innerEvent);
      currentTime = addMilliseconds(currentTime, this.getEventInterval());
    }

    // 3. 종료 이벤트
    const endEvent = transaction.endEvents[0];  // 첫 번째 종료 이벤트 사용
    if (endEvent && this.dependencyManager.canExecuteEvent(endEvent, executedEvents, isFirstSession, sessionNumber)) {
      const endEventData = this.createEvent(endEvent, user, currentTime);
      transactionEvents.push(endEventData);
      executedEvents.add(endEvent);
      this.dependencyManager.recordEventExecution(endEvent);
    }

    console.log(`✅ [Transaction Generated] "${transactionName}": ${transactionEvents.map(e => e.event_name).join(' → ')}`);
    return transactionEvents;
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

    // Object group 및 Object 속성 분리
    const objectGroupMap = new Map<string, PropertyDefinition[]>();  // object group의 자식들
    const objectMap = new Map<string, PropertyDefinition[]>();        // object의 자식들
    const flatProps: PropertyDefinition[] = [];

    eventProps.forEach(propDef => {
      // Object group/object 부모 자체는 건너뛰기
      if (propDef.is_object_group || propDef.is_object) {
        return;
      }

      // 중첩 속성이면 부모별로 그룹화
      if (propDef.is_nested_property && propDef.parent_property) {
        // 부모가 object group인지 object인지 확인
        const parentDef = eventProps.find(p => p.property_name === propDef.parent_property);

        if (parentDef?.is_object_group) {
          if (!objectGroupMap.has(propDef.parent_property)) {
            objectGroupMap.set(propDef.parent_property, []);
          }
          objectGroupMap.get(propDef.parent_property)!.push(propDef);
        } else if (parentDef?.is_object) {
          if (!objectMap.has(propDef.parent_property)) {
            objectMap.set(propDef.parent_property, []);
          }
          objectMap.get(propDef.parent_property)!.push(propDef);
        }
      } else {
        // 일반 평면 속성
        flatProps.push(propDef);
      }
    });

    // 1. 평면 속성 생성
    flatProps.forEach(propDef => {
      properties[propDef.property_name] = this.generatePropertyValue(
        propDef.property_name,
        eventRanges,
        user
      );
    });

    // 2. Object 속성 생성 (단일 객체)
    objectMap.forEach((childProps, parentName) => {
      const nestedObject: Record<string, any> = {};

      childProps.forEach(childProp => {
        // "parent.child" -> "child" 추출
        const childName = childProp.property_name.split('.')[1];
        nestedObject[childName] = this.generatePropertyValue(
          childProp.property_name,
          eventRanges,
          user
        );
      });

      properties[parentName] = nestedObject;
    });

    // 3. Object group 속성 생성 (객체 배열)
    objectGroupMap.forEach((childProps, parentName) => {
      // 배열 크기 결정 (1~3개 랜덤)
      const arraySize = Math.floor(Math.random() * 3) + 1;
      const objectArray: Record<string, any>[] = [];

      for (let i = 0; i < arraySize; i++) {
        const nestedObject: Record<string, any> = {};

        childProps.forEach(childProp => {
          // "parent.child" -> "child" 추출
          const childName = childProp.property_name.split('.')[1];
          nestedObject[childName] = this.generatePropertyValue(
            childProp.property_name,
            eventRanges,
            user
          );
        });

        objectArray.push(nestedObject);
      }

      properties[parentName] = objectArray;
    });

    return properties;
  }

  /**
   * 속성 값 생성 헬퍼
   */
  private generatePropertyValue(
    propertyName: string,
    eventRanges: any,
    user: User
  ): any {
    // AI 범위가 있으면 사용
    const range = eventRanges?.properties.find(
      (p: any) => p.property_name === propertyName
    );

    if (range) {
      return this.generateValueFromRange(range, user);
    } else {
      // AI 범위가 없으면 Faker.js 폴백 (산업 정보 전달)
      return generateFallbackValue(
        propertyName,
        user.locale,
        this.industry
      );
    }
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
