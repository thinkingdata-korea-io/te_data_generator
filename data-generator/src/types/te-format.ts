/**
 * ThinkingEngine 이벤트 형식
 *
 * 구조:
 * - # 으로 시작하는 필드: 메타데이터 (Header) - root level
 * - properties: 커스텀 속성 (Body) - 객체 형태
 */
export interface TEEvent {
  "#account_id": string;
  "#distinct_id": string;
  "#time": string;  // yyyy-MM-dd HH:mm:ss.SSS format
  "#type": "track" | "user_set" | "user_add";
  "#event_name"?: string;  // track일 때만
  "#ip"?: string;
  "#country"?: string;
  "#province"?: string;
  "#city"?: string;

  // Preset Properties (시스템 속성)
  "#os"?: string;
  "#os_version"?: string;
  "#model"?: string;
  "#device_id"?: string;
  "#carrier"?: string;
  "#network_type"?: string;
  "#app_version"?: string;
  "#manufacturer"?: string;
  "#screen_width"?: number;
  "#screen_height"?: number;
  "#uuid"?: string;

  // Custom Properties - 반드시 properties 객체 안에 포함
  properties: Record<string, any>;
}

/**
 * ThinkingEngine user_set 형식
 *
 * 주의: user_set은 #ip가 properties 안에 위치 (root level 아님)
 */
export interface TEUserSet {
  "#account_id": string;
  "#distinct_id": string;
  "#time": string;
  "#type": "user_set";
  "#uuid"?: string;

  // User properties는 properties 객체 안에 (#ip 포함)
  properties: Record<string, any>;
}

/**
 * ThinkingEngine user_add 형식
 *
 * 주의: user_add는 숫자만 properties에 포함하므로 #ip는 root level 유지
 */
export interface TEUserAdd {
  "#account_id": string;
  "#distinct_id": string;
  "#time": string;
  "#type": "user_add";
  "#ip"?: string;
  "#uuid"?: string;

  // 증가시킬 숫자 속성들만 properties 객체 안에
  properties: Record<string, number>;
}
