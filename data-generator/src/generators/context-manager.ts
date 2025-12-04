/**
 * ContextManager
 * 속성 값의 일관성을 관리하는 중앙 컨텍스트 관리자
 *
 * 일관성 레벨:
 * - user: 유저 전체에서 일관성 유지
 * - session: 세션 내에서 일관성 유지
 * - transaction: 트랜잭션 내에서 일관성 유지
 * - event: 이벤트마다 새로 생성
 */

import { User } from '../types/user';
import { ConsistencyGroup, PropertyConsistencyDefinition, AIAnalysisResult } from '../types/event';
import { generateUUID } from '../utils/random';
import { logger } from '../utils/logger';

export class ContextManager {
  private userContext: Record<string, any> = {};
  private sessionContext: Record<string, any> = {};
  private transactionContext: Record<string, any> = {};

  private consistencyGroups: ConsistencyGroup[];
  private propertyConsistency: Map<string, PropertyConsistencyDefinition>;

  constructor(aiAnalysis: AIAnalysisResult) {
    this.consistencyGroups = aiAnalysis.consistencyGroups || [];

    // propertyConsistency를 Map으로 변환하여 빠른 조회
    this.propertyConsistency = new Map();
    if (aiAnalysis.propertyConsistency) {
      aiAnalysis.propertyConsistency.forEach(pc => {
        this.propertyConsistency.set(pc.propertyName, pc);
      });
    }

    logger.info(`📋 ContextManager initialized with ${this.consistencyGroups.length} consistency groups`);
  }

  /**
   * 유저 컨텍스트 초기화
   * User 객체의 모든 속성을 user context에 복사
   */
  initializeUserContext(user: User): void {
    this.userContext = {
      // 기본 식별자
      account_id: user.account_id,
      distinct_id: user.distinct_id,
      segment: user.segment,

      // 생명주기
      lifecycle_stage: user.lifecycle_stage,
      install_date: user.install_date,
      last_active_date: user.last_active_date,

      // 국가별 정보
      country: user.country,
      countryCode: user.countryCode,
      locale: user.locale,
      name: user.name,
      email: user.email,
      phone: user.phone,

      // 위치 상세 정보
      city: user.city,
      state: user.state,
      region: user.region,
      timezone: user.timezone,

      // 디바이스 정보 (전체)
      os: user.os,
      os_version: user.os_version,
      device_model: user.device_model,
      device_id: user.device_id,

      // 네트워크 정보 (전체)
      ip: user.ip,
      carrier: user.carrier,
      network_type: user.network_type,

      // 통계
      total_sessions: user.total_sessions,
      total_events: user.total_events,
    };

    logger.debug(`👤 User context initialized for ${user.distinct_id} with ${Object.keys(this.userContext).length} properties`);
  }

  /**
   * 세션 컨텍스트 초기화
   * 세션 시작 시 호출
   */
  initializeSessionContext(): void {
    this.sessionContext = {
      session_id: generateUUID(),
    };

    logger.debug(`🔄 Session context initialized: ${this.sessionContext.session_id}`);
  }

  /**
   * 트랜잭션 컨텍스트 초기화
   * 트랜잭션 시작 이벤트 발생 시 호출
   *
   * @param passThroughProperties 트랜잭션 내에서 공유할 속성 목록
   * @param initialValues 초기값 (시작 이벤트에서 생성된 값들)
   */
  initializeTransactionContext(
    passThroughProperties: string[],
    initialValues?: Record<string, any>
  ): void {
    this.transactionContext = {};

    for (const propName of passThroughProperties) {
      // 초기값이 제공된 경우 사용
      if (initialValues && propName in initialValues) {
        this.transactionContext[propName] = initialValues[propName];
      }
      // ID 속성은 UUID로 자동 생성
      else if (propName.toLowerCase().includes('id')) {
        this.transactionContext[propName] = generateUUID();
      }
      // 그 외는 undefined (나중에 설정)
      else {
        this.transactionContext[propName] = undefined;
      }
    }

    logger.debug(`🔀 Transaction context initialized with ${passThroughProperties.length} properties`);
  }

  /**
   * 트랜잭션 컨텍스트 클리어
   * 트랜잭션 종료 이벤트 발생 시 호출
   */
  clearTransactionContext(): void {
    this.transactionContext = {};
    logger.debug(`🔀 Transaction context cleared`);
  }

  /**
   * 속성 값 가져오기
   * 일관성 레벨에 따라 적절한 컨텍스트에서 값을 가져옴
   *
   * @param propertyName 속성 이름
   * @returns 속성 값 (없으면 undefined)
   */
  getPropertyValue(propertyName: string): any | undefined {
    const consistency = this.propertyConsistency.get(propertyName);

    if (!consistency) {
      // 일관성 정의가 없으면 각 레벨 순서대로 확인
      // 우선순위: transaction > session > user
      if (propertyName in this.transactionContext) {
        return this.transactionContext[propertyName];
      }
      if (propertyName in this.sessionContext) {
        return this.sessionContext[propertyName];
      }
      if (propertyName in this.userContext) {
        return this.userContext[propertyName];
      }
      return undefined;
    }

    // 일관성 레벨에 따라 값 반환
    switch (consistency.level) {
      case 'user':
        return this.userContext[propertyName];
      case 'session':
        return this.sessionContext[propertyName];
      case 'transaction':
        return this.transactionContext[propertyName];
      case 'event':
        return undefined; // 매번 새로 생성
      default:
        return undefined;
    }
  }

  /**
   * 속성 값 설정
   * 일관성 레벨에 따라 적절한 컨텍스트에 저장
   *
   * @param propertyName 속성 이름
   * @param value 속성 값
   */
  setPropertyValue(propertyName: string, value: any): void {
    const consistency = this.propertyConsistency.get(propertyName);

    if (!consistency) {
      // 일관성 정의가 없으면 event 레벨로 처리 (저장 안함)
      return;
    }

    switch (consistency.level) {
      case 'user':
        this.userContext[propertyName] = value;
        break;
      case 'session':
        this.sessionContext[propertyName] = value;
        break;
      case 'transaction':
        this.transactionContext[propertyName] = value;
        break;
      case 'event':
        // event 레벨은 저장하지 않음 (매번 새로 생성)
        break;
    }
  }

  /**
   * 일관성 그룹 가져오기
   *
   * @param groupName 그룹 이름
   * @returns 일관성 그룹 (없으면 undefined)
   */
  getConsistencyGroup(groupName: string): ConsistencyGroup | undefined {
    return this.consistencyGroups.find(g => g.groupName === groupName);
  }

  /**
   * 속성의 일관성 레벨 가져오기
   *
   * @param propertyName 속성 이름
   * @returns 일관성 레벨 ('user' | 'session' | 'transaction' | 'event')
   */
  getPropertyLevel(propertyName: string): 'user' | 'session' | 'transaction' | 'event' {
    const consistency = this.propertyConsistency.get(propertyName);
    return consistency?.level || 'event';
  }

  /**
   * 속성이 시스템 프리셋인지 확인
   *
   * @param propertyName 속성 이름
   * @returns 프리셋 여부
   */
  isPresetProperty(propertyName: string): boolean {
    const consistency = this.propertyConsistency.get(propertyName);
    return consistency?.isPreset || false;
  }

  /**
   * 일관성 그룹에 속한 모든 속성 값 가져오기
   *
   * @param groupName 그룹 이름
   * @returns 속성 이름 -> 값 맵
   */
  getConsistencyGroupValues(groupName: string): Record<string, any> {
    const group = this.getConsistencyGroup(groupName);
    if (!group) {
      return {};
    }

    const values: Record<string, any> = {};
    for (const propName of group.properties) {
      const value = this.getPropertyValue(propName);
      if (value !== undefined) {
        values[propName] = value;
      }
    }

    return values;
  }

  /**
   * 디버깅: 현재 모든 컨텍스트 출력
   */
  debugPrintContexts(): void {
    logger.debug('=== Context Manager State ===');
    logger.debug('User Context:', this.userContext);
    logger.debug('Session Context:', this.sessionContext);
    logger.debug('Transaction Context:', this.transactionContext);
    logger.debug('=============================');
  }
}
