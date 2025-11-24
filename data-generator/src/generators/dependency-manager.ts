import { EventDefinition, ParsedSchema, AIAnalysisResult, Transaction } from '../types';

/**
 * 이벤트 의존성 관리자
 * 이벤트 간 선행 관계를 관리하고 실행 가능 여부를 판단
 */
export class DependencyManager {
  private schema: ParsedSchema;
  private aiAnalysis: AIAnalysisResult;
  private dependencyGraph: Map<string, Set<string>> = new Map();

  // 이벤트별 실행 카운트 (세션별, 유저별)
  private sessionEventCounts: Map<string, number> = new Map();
  private userEventCounts: Map<string, number> = new Map();

  // 🆕 트랜잭션 상태 추적
  private activeTransactions: Set<string> = new Set();  // 현재 활성화된 트랜잭션 이름들
  private completedTransactions: Set<string> = new Set();  // 완료된 트랜잭션 이름들

  constructor(schema: ParsedSchema, aiAnalysis: AIAnalysisResult) {
    this.schema = schema;
    this.aiAnalysis = aiAnalysis;
    this.buildDependencyGraph();
  }

  /**
   * 새 세션 시작 시 호출
   */
  resetSessionCounts(): void {
    this.sessionEventCounts.clear();
    // 트랜잭션 상태도 리셋
    this.activeTransactions.clear();
    this.completedTransactions.clear();
  }

  /**
   * 이벤트 실행 기록
   */
  recordEventExecution(eventName: string): void {
    // 세션 카운트
    const sessionCount = this.sessionEventCounts.get(eventName) || 0;
    this.sessionEventCounts.set(eventName, sessionCount + 1);

    // 유저 카운트
    const userCount = this.userEventCounts.get(eventName) || 0;
    this.userEventCounts.set(eventName, userCount + 1);

    // 🆕 트랜잭션 상태 업데이트
    this.updateTransactionState(eventName);
  }

  /**
   * 🆕 트랜잭션 상태 업데이트
   */
  private updateTransactionState(eventName: string): void {
    const sequencing = this.aiAnalysis.eventSequencing;
    if (!sequencing || !sequencing.transactions) return;

    for (const transaction of sequencing.transactions) {
      // 트랜잭션 시작 이벤트
      if (transaction.startEvents.includes(eventName)) {
        this.activeTransactions.add(transaction.name);
        this.completedTransactions.delete(transaction.name);
      }

      // 트랜잭션 종료 이벤트
      if (transaction.endEvents.includes(eventName)) {
        this.activeTransactions.delete(transaction.name);
        this.completedTransactions.add(transaction.name);
      }
    }
  }

  /**
   * 의존성 그래프 구축
   */
  private buildDependencyGraph(): void {
    // Excel 스키마의 의존성
    this.schema.events.forEach(event => {
      if (event.required_previous_events && event.required_previous_events.length > 0) {
        this.dependencyGraph.set(
          event.event_name,
          new Set(event.required_previous_events)
        );
      }
    });

    // AI 분석 결과의 의존성 추가/병합 (기존 eventDependencies)
    Object.entries(this.aiAnalysis.eventDependencies).forEach(([eventName, deps]) => {
      const existing = this.dependencyGraph.get(eventName) || new Set();
      deps.forEach(dep => existing.add(dep));
      this.dependencyGraph.set(eventName, existing);
    });

    // AI EventSequencing의 strictDependencies 추가
    const sequencing = this.aiAnalysis.eventSequencing;
    if (sequencing && sequencing.strictDependencies) {
      Object.entries(sequencing.strictDependencies).forEach(([eventName, deps]) => {
        const existing = this.dependencyGraph.get(eventName) || new Set();
        deps.forEach(dep => existing.add(dep));
        this.dependencyGraph.set(eventName, existing);
      });
    }
  }

  /**
   * 이벤트 실행 가능 여부 확인 (강화된 버전)
   */
  canExecuteEvent(
    eventName: string,
    executedEvents: Set<string>,
    isFirstSession: boolean = false,
    sessionNumber: number = 1
  ): boolean {
    // 🆕 0. 트랜잭션 차단 체크 (최우선!)
    if (!this.canExecuteInTransaction(eventName)) {
      return false;
    }

    // 1. 기존 의존성 체크
    const dependencies = this.dependencyGraph.get(eventName);
    if (dependencies && dependencies.size > 0) {
      const depsArray = Array.from(dependencies);
      for (let i = 0; i < depsArray.length; i++) {
        if (!executedEvents.has(depsArray[i])) {
          return false;
        }
      }
    }

    // 2. AI EventSequencing 제약 체크
    const sequencing = this.aiAnalysis.eventSequencing;
    if (sequencing && sequencing.executionConstraints) {
      const constraints = sequencing.executionConstraints[eventName];
      if (constraints) {
        // 세션당 최대 발생 횟수 체크
        if (constraints.maxOccurrencesPerSession) {
          const sessionCount = this.sessionEventCounts.get(eventName) || 0;
          if (sessionCount >= constraints.maxOccurrencesPerSession) {
            return false;
          }
        }

        // 유저당 최대 발생 횟수 체크
        if (constraints.maxOccurrencesPerUser) {
          const userCount = this.userEventCounts.get(eventName) || 0;
          if (userCount >= constraints.maxOccurrencesPerUser) {
            return false;
          }
        }

        // 첫 세션 전용 이벤트 체크
        if (constraints.requiresFirstSession && !isFirstSession) {
          return false;
        }

        // 최소 세션 번호 체크
        if (constraints.minimumSessionNumber && sessionNumber < constraints.minimumSessionNumber) {
          return false;
        }

        // 특정 이벤트 후 차단 체크
        if (constraints.blockedAfterEvents) {
          for (const blockingEvent of constraints.blockedAfterEvents) {
            if (executedEvents.has(blockingEvent)) {
              return false;
            }
          }
        }
      }
    }

    return true;
  }

  /**
   * 🆕 트랜잭션 내에서 이벤트 실행 가능 여부 확인
   * 핵심: 트랜잭션 종료 후 내부 이벤트 차단!
   */
  private canExecuteInTransaction(eventName: string): boolean {
    const sequencing = this.aiAnalysis.eventSequencing;
    if (!sequencing || !sequencing.transactions) return true;

    for (const transaction of sequencing.transactions) {
      // 이 이벤트가 트랜잭션 내부 이벤트인가?
      if (transaction.innerEvents.includes(eventName)) {
        // 트랜잭션이 완료되었는가?
        if (this.completedTransactions.has(transaction.name)) {
          // allowInnerAfterEnd가 false면 차단!
          if (!transaction.allowInnerAfterEnd) {
            console.log(`🚫 [Transaction Block] "${eventName}" blocked: transaction "${transaction.name}" already completed`);
            return false;
          }
        }

        // 트랜잭션이 시작되지 않았는가?
        if (!this.activeTransactions.has(transaction.name) && !this.completedTransactions.has(transaction.name)) {
          // 내부 이벤트는 트랜잭션 시작 전에는 발생 불가
          console.log(`🚫 [Transaction Block] "${eventName}" blocked: transaction "${transaction.name}" not started`);
          return false;
        }
      }
    }

    return true;
  }

  /**
   * 이벤트 카테고리 반환
   */
  getEventCategory(eventName: string): string | null {
    const sequencing = this.aiAnalysis.eventSequencing;
    if (!sequencing || !sequencing.eventCategories) {
      return null;
    }

    for (const [category, events] of Object.entries(sequencing.eventCategories)) {
      if (events.includes(eventName)) {
        return category;
      }
    }

    return null;
  }

  /**
   * 특정 카테고리의 모든 이벤트 반환
   */
  getEventsByCategory(category: string): string[] {
    const sequencing = this.aiAnalysis.eventSequencing;
    if (!sequencing || !sequencing.eventCategories) {
      return [];
    }

    return sequencing.eventCategories[category as keyof typeof sequencing.eventCategories] || [];
  }

  /**
   * 실행 가능한 이벤트 목록 반환
   */
  getExecutableEvents(
    eventNames: string[],
    executedEvents: Set<string>
  ): string[] {
    return eventNames.filter(name =>
      this.canExecuteEvent(name, executedEvents)
    );
  }

  /**
   * 퍼널 내에서 다음 실행 가능한 스텝 반환
   */
  getNextFunnelStep(
    funnelSteps: string[],
    executedEvents: Set<string>
  ): string | null {
    for (const step of funnelSteps) {
      if (!executedEvents.has(step)) {
        // 아직 실행되지 않은 첫 번째 스텝
        if (this.canExecuteEvent(step, executedEvents)) {
          return step;
        }
        // 의존성이 충족되지 않으면 null 반환 (퍼널 중단)
        return null;
      }
    }

    // 모든 스텝 완료
    return null;
  }

  /**
   * 이벤트의 의존성 목록 반환
   */
  getDependencies(eventName: string): string[] {
    const deps = this.dependencyGraph.get(eventName);
    return deps ? Array.from(deps) : [];
  }

  /**
   * 의존성 그래프 전체 반환
   */
  getDependencyGraph(): Map<string, Set<string>> {
    return this.dependencyGraph;
  }

  /**
   * 이벤트가 특정 퍼널에 속하는지 확인
   */
  isEventInFunnel(eventName: string, funnelName: string): boolean {
    const funnel = this.schema.funnels.find(f => f.name === funnelName);
    if (!funnel) return false;
    return funnel.steps.includes(eventName);
  }

  /**
   * 토폴로지 정렬 (이벤트 실행 순서)
   */
  topologicalSort(eventNames: string[]): string[] {
    const result: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (eventName: string): void => {
      if (visited.has(eventName)) return;
      if (visiting.has(eventName)) {
        // 순환 의존성 감지
        console.warn(`Circular dependency detected for event: ${eventName}`);
        return;
      }

      visiting.add(eventName);

      const deps = this.dependencyGraph.get(eventName);
      if (deps) {
        deps.forEach(dep => {
          if (eventNames.includes(dep)) {
            visit(dep);
          }
        });
      }

      visiting.delete(eventName);
      visited.add(eventName);
      result.push(eventName);
    };

    eventNames.forEach(eventName => visit(eventName));

    return result;
  }
}
