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
import { ContextManager } from './context-manager';
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
import { logger } from '../utils/logger';

/**
 * 이벤트 생성기
 */
export class EventGenerator {
  private schema: ParsedSchema;
  private aiAnalysis: AIAnalysisResult;
  private dependencyManager: DependencyManager;
  private contextManager: ContextManager;
  private industry: string;

  // 🆕 속성 간 관계를 위한 캐시
  private consistentRandomCache: Map<string, Map<string, any>> = new Map();  // sourceProperty → (sourceValue → targetValue)

  constructor(schema: ParsedSchema, aiAnalysis: AIAnalysisResult, industry: string = '') {
    this.schema = schema;
    this.aiAnalysis = aiAnalysis;
    this.dependencyManager = new DependencyManager(schema, aiAnalysis);
    this.contextManager = new ContextManager(aiAnalysis);
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

    // 🆕 세션 시작 시 컨텍스트 초기화 (ContextManager 사용)
    this.contextManager.initializeUserContext(session.user);
    this.contextManager.initializeSessionContext();

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
        currentTime = addMilliseconds(currentTime, this.getEventInterval(eventName));
      }
    }

    // 2. onboarding 이벤트 (첫 세션에만)
    if (isFirstSession) {
      const onboardingEvents = this.dependencyManager.getEventsByCategory('onboarding');
      for (const eventName of onboardingEvents) {
        if (!this.dependencyManager.canExecuteEvent(eventName, executedEvents, isFirstSession, sessionNumber, session.user.segment)) {
          continue;
        }

        // 확률적으로 실행 (온보딩 완료율 반영)
        if (probabilityCheck(0.7)) {
          const event = this.createEvent(eventName, session.user, currentTime);
          events.push(event);
          executedEvents.add(eventName);
          this.dependencyManager.recordEventExecution(eventName);
          currentTime = addMilliseconds(currentTime, this.getEventInterval(eventName));
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

      const selectedEvent = this.selectEvent(availableEvents, session.user.segment);
      if (!selectedEvent) break;

      const event = this.createEvent(selectedEvent.event_name, session.user, currentTime);
      events.push(event);
      executedEvents.add(selectedEvent.event_name);
      this.dependencyManager.recordEventExecution(selectedEvent.event_name);

      currentTime = addMilliseconds(currentTime, this.getEventInterval(selectedEvent.event_name));
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
        this.dependencyManager.canExecuteEvent(startEvent, executedEvents, isFirstSession, sessionNumber, session.user.segment)
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

    // 🆕 트랜잭션 컨텍스트 초기화 (ContextManager 사용)
    if (transaction.passThroughProperties && transaction.passThroughProperties.length > 0) {
      this.contextManager.initializeTransactionContext(transaction.passThroughProperties);
      logger.debug(`🔗 [Transaction Context] "${transactionName}" initialized with ${transaction.passThroughProperties.length} properties`);
    }

    // 1. 시작 이벤트 (첫 번째 사용 가능한 것)
    const startEvent = transaction.startEvents.find(e =>
      this.dependencyManager.canExecuteEvent(e, executedEvents, isFirstSession, sessionNumber)
    );

    if (!startEvent) return [];

    const startEventData = this.createEvent(startEvent, user, currentTime);
    transactionEvents.push(startEventData);
    executedEvents.add(startEvent);
    this.dependencyManager.recordEventExecution(startEvent);
    currentTime = addMilliseconds(currentTime, this.getEventInterval(startEvent));

    // 2. 내부 이벤트
    // 🆕 innerEventSequence가 정의되어 있으면 순서대로 실행
    if (transaction.innerEventSequence && transaction.innerEventSequence.length > 0) {
      // 순서가 정의된 경우: sequence별로 순서대로 실행
      for (const sequence of transaction.innerEventSequence) {
        for (const eventName of sequence.events) {
          // 이미 실행되었거나 실행 불가능한 이벤트는 건너뛰기
          if (executedEvents.has(eventName) ||
              !this.dependencyManager.canExecuteEvent(eventName, executedEvents, isFirstSession, sessionNumber)) {
            if (sequence.strictOrder) {
              // strictOrder인 경우 순서가 깨지면 이 sequence 중단
              break;
            }
            // strictOrder가 아니면 건너뛰고 계속
            continue;
          }

          // strictOrder가 아닌 경우 확률적으로 생략 가능 (30% 확률로 생략)
          if (!sequence.strictOrder && probabilityCheck(0.3)) {
            continue;
          }

          const innerEventData = this.createEvent(eventName, user, currentTime);
          transactionEvents.push(innerEventData);
          executedEvents.add(eventName);
          this.dependencyManager.recordEventExecution(eventName);
          currentTime = addMilliseconds(currentTime, this.getEventInterval(eventName));
        }
      }
    } else {
      // 순서가 정의되지 않은 경우: 기존 로직 (랜덤하게 2~5개)
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
        currentTime = addMilliseconds(currentTime, this.getEventInterval(innerEvent));
      }
    }

    // 3. 종료 이벤트
    const endEvent = transaction.endEvents[0];  // 첫 번째 종료 이벤트 사용
    if (endEvent && this.dependencyManager.canExecuteEvent(endEvent, executedEvents, isFirstSession, sessionNumber)) {
      const endEventData = this.createEvent(endEvent, user, currentTime);
      transactionEvents.push(endEventData);
      executedEvents.add(endEvent);
      this.dependencyManager.recordEventExecution(endEvent);
    }

    logger.debug(`✅ [Transaction Generated] "${transactionName}": ${transactionEvents.map(e => e.event_name).join(' → ')}`);

    // 🆕 트랜잭션 컨텍스트 클리어 (ContextManager 사용)
    this.contextManager.clearTransactionContext();

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
    // 🆕 위치 컨텍스트는 세션 시작 시 초기화되므로 여기서는 리셋하지 않음!
    // 이로써 같은 세션의 모든 이벤트가 일관된 위치 정보를 유지합니다.

    // 🆕 eventTimingOverrides가 있으면 timestamp 조정
    const adjustedTimestamp = this.adjustTimestampForEvent(eventName, timestamp);

    const eventDef = this.schema.events.find(e => e.event_name === eventName);
    const properties = this.generateEventProperties(eventName, user, adjustedTimestamp);

    return {
      event_name: eventName,
      timestamp: adjustedTimestamp,
      user,
      properties
    };
  }

  /**
   * 🆕 이벤트별 시간 조정 (eventTimingOverrides 적용)
   */
  private adjustTimestampForEvent(eventName: string, baseTimestamp: Date): Date {
    const timingDist = this.aiAnalysis.timingDistribution;
    if (!timingDist || !timingDist.eventTimingOverrides) {
      return baseTimestamp;
    }

    // 이벤트별 오버라이드 확인
    const override = timingDist.eventTimingOverrides[eventName];
    if (!override || !override.hourlyWeights || override.hourlyWeights.length !== 24) {
      return baseTimestamp;
    }

    // hourlyWeights 기반으로 시간 조정
    const { adjustTimeByWeights } = require('../utils/timing-utils');
    const adjusted = adjustTimeByWeights(baseTimestamp, override.hourlyWeights);

    logger.debug(`⏰ [Timing Override] ${eventName}: ${baseTimestamp.getHours()}h → ${adjusted.getHours()}h (${override.description || 'custom pattern'})`);

    return adjusted;
  }

  /**
   * 이벤트 속성 생성
   */
  private generateEventProperties(
    eventName: string,
    user: User,
    eventTimestamp: Date
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
        user,
        eventTimestamp
      );
    });

    // 2. Object 속성 생성 (단일 객체)
    objectMap.forEach((childProps, parentName) => {
      properties[parentName] = this.generateNestedObject(childProps, eventRanges, user, eventTimestamp);
    });

    // 3. Object group 속성 생성 (객체 배열)
    objectGroupMap.forEach((childProps, parentName) => {
      // 배열 크기 결정 (1~3개 랜덤)
      const arraySize = Math.floor(Math.random() * 3) + 1;
      properties[parentName] = Array.from({ length: arraySize }, () =>
        this.generateNestedObject(childProps, eventRanges, user, eventTimestamp)
      );
    });

    // 4. 🆕 속성 간 상관관계 적용
    this.applyPropertyCorrelations(properties, user);

    return properties;
  }

  /**
   * 🆕 속성 간 상관관계 적용
   * 🆕 formula, identity, consistent_random 지원
   */
  private applyPropertyCorrelations(properties: Record<string, any>, user: User): void {
    const correlations = this.aiAnalysis.propertyCorrelations;
    if (!correlations || correlations.length === 0) return;

    for (const correlation of correlations) {
      // 🆕 sourceProperty가 배열일 수 있음 (formula의 경우)
      const isMultiSource = Array.isArray(correlation.sourceProperty);

      if (!isMultiSource) {
        // 단일 소스
        const sourceValue = properties[correlation.sourceProperty as string];
        if (sourceValue === undefined) continue;

        // 상관관계 타입별 처리
        switch (correlation.correlationType) {
          case 'positive':
            // 양의 상관: source 증가 → target 증가
            if (typeof sourceValue === 'number' && typeof properties[correlation.targetProperty] === 'number') {
              const adjustment = sourceValue * (correlation.strength || 0.5);
              properties[correlation.targetProperty] += adjustment;
            }
            break;

          case 'negative':
            // 음의 상관: source 증가 → target 감소
            if (typeof sourceValue === 'number' && typeof properties[correlation.targetProperty] === 'number') {
              const adjustment = sourceValue * (correlation.strength || 0.5);
              properties[correlation.targetProperty] = Math.max(0, properties[correlation.targetProperty] - adjustment);
            }
            break;

          case 'conditional':
            // 조건부: source 값에 따라 target 값 결정
            if (correlation.conditions) {
              const matchedCondition = correlation.conditions.find(
                cond => cond.sourceValue === sourceValue
              );
              if (matchedCondition) {
                if (matchedCondition.targetValues && matchedCondition.targetValues.length > 0) {
                  properties[correlation.targetProperty] =
                    matchedCondition.targetValues[Math.floor(Math.random() * matchedCondition.targetValues.length)];
                } else if (matchedCondition.targetRange) {
                  properties[correlation.targetProperty] = randomInt(
                    matchedCondition.targetRange.min,
                    matchedCondition.targetRange.max
                  );
                }
              }
            }
            break;

          case 'identity':
            // 🆕 고정 매핑: 같은 소스값 → 같은 타겟값
            if (correlation.identityMap && sourceValue in correlation.identityMap) {
              properties[correlation.targetProperty] = correlation.identityMap[sourceValue];
            }
            break;

          case 'consistent_random':
            // 🆕 일관된 랜덤: 같은 소스값 → 같은 랜덤 타겟값 (캐싱)
            const cacheKey = correlation.sourceProperty as string;
            if (!this.consistentRandomCache.has(cacheKey)) {
              this.consistentRandomCache.set(cacheKey, new Map());
            }
            const cache = this.consistentRandomCache.get(cacheKey)!;

            if (cache.has(sourceValue)) {
              // 캐시에 있으면 재사용
              properties[correlation.targetProperty] = cache.get(sourceValue);
            } else {
              // 캐시에 없으면 생성 후 저장
              let randomValue: any;
              if (correlation.consistentRandomValues && correlation.consistentRandomValues.length > 0) {
                randomValue = correlation.consistentRandomValues[
                  Math.floor(Math.random() * correlation.consistentRandomValues.length)
                ];
              } else if (correlation.consistentRandomRange) {
                randomValue = randomInt(
                  correlation.consistentRandomRange.min,
                  correlation.consistentRandomRange.max
                );
              }
              cache.set(sourceValue, randomValue);
              properties[correlation.targetProperty] = randomValue;
            }
            break;
        }
      } else {
        // 🆕 다중 소스 (formula용)
        if (correlation.correlationType === 'formula') {
          const sourceProperties = correlation.sourceProperty as string[];
          const sourceValues = sourceProperties.map(prop => properties[prop]);

          // 모든 소스 값이 존재하는지 확인
          if (sourceValues.some(v => v === undefined)) continue;

          // 수식 평가
          const result = this.evaluateFormula(
            correlation.formulaType || 'custom',
            correlation.formula || '',
            sourceProperties,
            sourceValues
          );

          if (result !== null) {
            properties[correlation.targetProperty] = result;
          }
        }
      }
    }
  }

  /**
   * 🆕 수식 평가
   */
  private evaluateFormula(
    formulaType: string,
    formula: string,
    sourceProperties: string[],
    sourceValues: any[]
  ): number | null {
    try {
      // 간단한 수식 타입 처리
      if (formulaType === 'multiply' && sourceValues.length >= 2) {
        return sourceValues.reduce((acc, val) => acc * Number(val), 1);
      } else if (formulaType === 'divide' && sourceValues.length === 2) {
        const divisor = Number(sourceValues[1]);
        return divisor !== 0 ? Number(sourceValues[0]) / divisor : 0;
      } else if (formulaType === 'add') {
        return sourceValues.reduce((acc, val) => acc + Number(val), 0);
      } else if (formulaType === 'subtract' && sourceValues.length === 2) {
        return Number(sourceValues[0]) - Number(sourceValues[1]);
      } else if (formulaType === 'custom' && formula) {
        // 커스텀 수식: 변수 치환 후 eval (안전성 주의!)
        let evalFormula = formula;
        sourceProperties.forEach((prop, index) => {
          const regex = new RegExp(prop, 'g');
          evalFormula = evalFormula.replace(regex, String(sourceValues[index]));
        });
        // eval 대신 Function 사용 (약간 더 안전)
        const result = new Function(`return ${evalFormula}`)();
        return Number(result);
      }
    } catch (error) {
      logger.warn(`⚠️ Formula evaluation failed: ${formula}`, error);
    }
    return null;
  }

  /**
   * 중첩 객체 생성 공통 로직 (Object & Object Group 통합)
   */
  private generateNestedObject(
    childProps: PropertyDefinition[],
    eventRanges: any,
    user: User,
    eventTimestamp: Date
  ): Record<string, any> {
    const nestedObject: Record<string, any> = {};

    childProps.forEach(childProp => {
      // "parent.child" -> "child" 추출
      const childName = childProp.property_name.split('.')[1];
      nestedObject[childName] = this.generatePropertyValue(
        childProp.property_name,
        eventRanges,
        user,
        eventTimestamp
      );
    });

    return nestedObject;
  }


  /**
   * 🆕 시간 관련 속성인지 확인
   */
  private isTimeProperty(propertyName: string): boolean {
    const lowerName = propertyName.toLowerCase();
    return (
      lowerName.includes('time') ||
      lowerName.includes('_at') ||
      lowerName.includes('date') ||
      lowerName === 'timestamp' ||
      lowerName === 'created' ||
      lowerName === 'updated'
    );
  }

  /**
   * 🆕 이벤트 타임스탬프 기준으로 시간 값 생성
   */
  private generateTimeValue(propertyName: string, eventTimestamp: Date): any {
    const lowerName = propertyName.toLowerCase();

    // created_at은 이벤트 시각 그대로 또는 약간 이전
    if (lowerName.includes('created')) {
      const offset = randomInt(-60000, 0); // 0~1분 이전
      return addMilliseconds(eventTimestamp, offset).toISOString();
    }

    // updated_at은 이벤트 시각 그대로 또는 약간 이후
    if (lowerName.includes('updated')) {
      const offset = randomInt(0, 60000); // 0~1분 이후
      return addMilliseconds(eventTimestamp, offset).toISOString();
    }

    // 기본: 이벤트 타임스탬프 ± 5분 이내
    const offset = randomInt(-300000, 300000); // ±5분
    return addMilliseconds(eventTimestamp, offset).toISOString();
  }

  /**
   * 속성 값 생성 헬퍼 (ContextManager 사용)
   */
  private generatePropertyValue(
    propertyName: string,
    eventRanges: any,
    user: User,
    eventTimestamp: Date
  ): any {
    // 🆕 1순위: ContextManager에서 값 가져오기 (user/session/transaction 컨텍스트)
    const contextValue = this.contextManager.getPropertyValue(propertyName);
    if (contextValue !== undefined) {
      logger.debug(`📋 [Context] ${propertyName} = ${contextValue} (level: ${this.contextManager.getPropertyLevel(propertyName)})`);
      return contextValue;
    }

    // 🆕 2순위: 시간 관련 속성은 이벤트 타임스탬프 기준으로 생성
    if (this.isTimeProperty(propertyName)) {
      return this.generateTimeValue(propertyName, eventTimestamp);
    }

    // 3순위: AI 범위가 있으면 사용
    const range = eventRanges?.properties.find(
      (p: any) => p.property_name === propertyName
    );

    if (range) {
      return this.generateValueFromRange(range, user);
    } else {
      // 4순위: Faker.js 폴백 (산업 정보 및 유저 정보 전달)
      return generateFallbackValue(
        propertyName,
        user.locale,
        this.industry,
        user
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

      // 의존성 및 실행 제약 체크 (세그먼트 포함)
      if (!this.dependencyManager.canExecuteEvent(event.event_name, executedEvents, isFirstSession, sessionNumber, user.segment)) {
        return false;
      }

      return true;
    });
  }

  /**
   * 확률 기반 이벤트 선택
   * 🆕 세그먼트별 이벤트 선호도 적용
   */
  private selectEvent(
    events: typeof this.schema.events,
    userSegment?: string
  ): typeof this.schema.events[0] | null {
    if (events.length === 0) return null;

    // 기본 가중치: trigger_probability
    const weights = events.map(e => {
      let weight = e.trigger_probability || 0.5;

      // 🆕 세그먼트별 선호도 적용
      if (userSegment) {
        const segmentLower = userSegment.toLowerCase();
        const eventNameLower = e.event_name.toLowerCase();

        // VIP/Premium 유저는 수익화 이벤트 10x 부스트
        if (segmentLower.includes('vip') || segmentLower.includes('whale') || segmentLower.includes('프리미엄')) {
          if (eventNameLower.includes('purchase') || eventNameLower.includes('premium') ||
              eventNameLower.includes('구매') || eventNameLower.includes('결제')) {
            weight *= 10;
          }
        }

        // 신규 유저는 탐색 이벤트 3x 부스트
        if (segmentLower.includes('new') || segmentLower.includes('신규')) {
          if (eventNameLower.includes('view') || eventNameLower.includes('search') ||
              eventNameLower.includes('browse') || eventNameLower.includes('탐색')) {
            weight *= 3;
          }
        }

        // 활성 유저는 핵심 기능 5x 부스트
        if (segmentLower.includes('active') || segmentLower.includes('engaged') || segmentLower.includes('활성')) {
          if (eventNameLower.includes('use') || eventNameLower.includes('play') ||
              eventNameLower.includes('사용') || eventNameLower.includes('실행')) {
            weight *= 5;
          }
        }
      }

      return weight;
    });

    return weightedRandom(events, weights);
  }

  /**
   * 이벤트 간 시간 간격 (밀리초)
   * 🆕 이벤트별로 다른 시간 간격 적용
   * 🆕 세그먼트별 가중치(segmentMultipliers) 지원
   */
  private getEventInterval(eventName?: string): number {
    // AI가 정의한 이벤트별 시간 간격 확인
    const eventIntervals = this.aiAnalysis.eventSequencing?.eventIntervals;

    if (eventName && eventIntervals && eventIntervals[eventName]) {
      const config = eventIntervals[eventName];
      let avgSeconds = config.avgSeconds;

      // 🆕 세그먼트별 가중치 적용 (userContext에서 segment 가져오기)
      if (config.segmentMultipliers) {
        const userSegment = this.contextManager.getPropertyValue('segment');
        const multiplier = config.segmentMultipliers[userSegment] || 1.0;
        avgSeconds = avgSeconds * multiplier;
      }

      const avgMs = avgSeconds * 1000;
      const minMs = (config.minSeconds || 1) * 1000;
      const maxMs = (config.maxSeconds || 60) * 1000;
      const distribution = config.distribution || 'exponential';

      let interval: number;

      switch (distribution) {
        case 'exponential':
          // 지수 분포: lambda = 1/mean
          interval = exponentialDistribution(1 / avgSeconds) * 1000;
          break;

        case 'normal':
          // 정규 분포: Box-Muller 변환
          const u1 = Math.random();
          const u2 = Math.random();
          const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
          const stdDev = avgMs / 4; // 표준편차 = 평균의 1/4
          interval = avgMs + z * stdDev;
          break;

        case 'uniform':
          // 균등 분포: [avg/2, avg*1.5] 범위
          interval = randomFloat(avgMs * 0.5, avgMs * 1.5);
          break;

        default:
          interval = avgMs;
      }

      // 최소/최대 제약 적용
      return Math.max(minMs, Math.min(maxMs, interval));
    }

    // 기본값: 지수 분포 (평균 10초)
    const interval = exponentialDistribution(1 / 10) * 1000;
    return Math.max(1000, Math.min(60000, interval));
  }

  /**
   * 의존성 관리자 반환
   */
  getDependencyManager(): DependencyManager {
    return this.dependencyManager;
  }
}
