import { EventData, User, TEEvent, TEUserSet, TEUserAdd } from '../types';
import { toISO8601, toTimestamp } from '../utils/date';
import { randomUUID } from 'crypto';

/**
 * ThinkingEngine 형식 변환기
 */
export class TEFormatter {
  /**
   * EventData를 TE track 이벤트로 변환
   */
  formatTrackEvent(event: EventData): TEEvent {
    const teEvent: TEEvent = {
      // Root Level: 메타데이터 (7개 필드)
      "#account_id": event.user.account_id,
      "#distinct_id": event.user.distinct_id,
      "#time": toTimestamp(event.timestamp),
      "#type": "track",
      "#event_name": event.event_name,
      "#ip": event.user.ip,
      "#uuid": randomUUID(),

      // Properties: Preset Properties + Custom Properties
      properties: {
        // Preset Properties
        "#country": event.user.country,
        "#os": event.user.os,
        "#os_version": event.user.os_version,
        "#model": event.user.device_model,
        "#device_id": event.user.device_id,
        "#carrier": event.user.carrier,
        "#network_type": event.user.network_type,

        // Custom Properties
        ...event.properties
      }
    };

    return teEvent;
  }

  /**
   * user_set 이벤트 생성
   */
  formatUserSet(user: User, timestamp: Date, properties: Record<string, any>): TEUserSet {
    return {
      // Root Level: 메타데이터 (5개 필드 - event_name, ip 제외)
      "#account_id": user.account_id,
      "#distinct_id": user.distinct_id,
      "#time": toTimestamp(timestamp),
      "#type": "user_set",
      "#uuid": randomUUID(),

      // Properties: #ip + 유저 속성들
      properties: {
        "#ip": user.ip,
        user_name: user.name,
        user_email: user.email,
        user_phone: user.phone,
        user_segment: user.segment,
        user_lifecycle_stage: user.lifecycle_stage,
        install_date: toISO8601(user.install_date),
        ...properties
      }
    };
  }

  /**
   * user_add 이벤트 생성 (숫자 증가)
   */
  formatUserAdd(
    user: User,
    timestamp: Date,
    additions: Record<string, number>
  ): TEUserAdd {
    return {
      // Root Level: 메타데이터 (6개 필드 - event_name 제외)
      // Note: user_add는 숫자만 properties에 포함하므로 #ip는 root에 유지
      "#account_id": user.account_id,
      "#distinct_id": user.distinct_id,
      "#time": toTimestamp(timestamp),
      "#type": "user_add",
      "#ip": user.ip,
      "#uuid": randomUUID(),

      // Properties: 증가시킬 숫자 속성들만
      properties: {
        ...additions
      }
    };
  }

  /**
   * 유저의 누적 통계 업데이트용 user_add 생성
   */
  generateUserStatUpdate(
    user: User,
    timestamp: Date,
    sessionCount: number = 1,
    eventCount: number = 0
  ): TEUserAdd {
    return this.formatUserAdd(user, timestamp, {
      total_sessions: sessionCount,
      total_events: eventCount
    });
  }

  /**
   * 배치 변환: 여러 이벤트를 한번에 변환
   */
  formatBatchEvents(events: EventData[]): TEEvent[] {
    return events.map(event => this.formatTrackEvent(event));
  }

  /**
   * JSONL 형식으로 변환 (한 줄에 하나의 JSON)
   * LogBus2 요구사항: 마지막 줄도 반드시 개행 문자로 끝나야 함
   */
  toJSONL(events: TEEvent[]): string {
    return events.map(event => JSON.stringify(event)).join('\n') + '\n';
  }

  /**
   * 이벤트 검증
   */
  validateTEEvent(event: TEEvent): boolean {
    // 필수 필드 체크
    if (!event["#account_id"] || !event["#distinct_id"] || !event["#time"]) {
      return false;
    }

    if (!event["#type"]) {
      return false;
    }

    // track 이벤트는 event_name 필수
    if (event["#type"] === "track" && !event["#event_name"]) {
      return false;
    }

    return true;
  }

  /**
   * 배치 검증
   */
  validateBatch(events: TEEvent[]): { valid: TEEvent[]; invalid: TEEvent[] } {
    const valid: TEEvent[] = [];
    const invalid: TEEvent[] = [];

    events.forEach(event => {
      if (this.validateTEEvent(event)) {
        valid.push(event);
      } else {
        invalid.push(event);
      }
    });

    return { valid, invalid };
  }
}
