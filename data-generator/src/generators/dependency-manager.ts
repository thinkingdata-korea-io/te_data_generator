import { EventDefinition, ParsedSchema, AIAnalysisResult } from '../types';

/**
 * 이벤트 의존성 관리자
 * 이벤트 간 선행 관계를 관리하고 실행 가능 여부를 판단
 */
export class DependencyManager {
  private schema: ParsedSchema;
  private aiAnalysis: AIAnalysisResult;
  private dependencyGraph: Map<string, Set<string>> = new Map();

  constructor(schema: ParsedSchema, aiAnalysis: AIAnalysisResult) {
    this.schema = schema;
    this.aiAnalysis = aiAnalysis;
    this.buildDependencyGraph();
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

    // AI 분석 결과의 의존성 추가/병합
    Object.entries(this.aiAnalysis.eventDependencies).forEach(([eventName, deps]) => {
      const existing = this.dependencyGraph.get(eventName) || new Set();
      deps.forEach(dep => existing.add(dep));
      this.dependencyGraph.set(eventName, existing);
    });
  }

  /**
   * 이벤트 실행 가능 여부 확인
   */
  canExecuteEvent(
    eventName: string,
    executedEvents: Set<string>
  ): boolean {
    const dependencies = this.dependencyGraph.get(eventName);

    // 의존성이 없으면 항상 실행 가능
    if (!dependencies || dependencies.size === 0) {
      return true;
    }

    // 모든 의존성이 충족되었는지 확인
    for (const dep of dependencies) {
      if (!executedEvents.has(dep)) {
        return false;
      }
    }

    return true;
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
