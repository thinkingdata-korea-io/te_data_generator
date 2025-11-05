/**
 * ThinkingEngine 이벤트 형식
 */
export interface TEEvent {
  "#account_id": string;
  "#distinct_id": string;
  "#time": string;  // ISO 8601
  "#type": "track" | "user_set" | "user_add";
  "#event_name"?: string;  // track일 때만
  "#ip"?: string;
  "#country"?: string;
  "#province"?: string;
  "#city"?: string;

  // Preset Properties
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

  // Custom Properties (이벤트별)
  [key: string]: any;
}

/**
 * ThinkingEngine user_set 형식
 */
export interface TEUserSet extends TEEvent {
  "#type": "user_set";
  // User properties
  [key: string]: any;
}

/**
 * ThinkingEngine user_add 형식
 */
export interface TEUserAdd extends TEEvent {
  "#type": "user_add";
  // Numeric properties to add
  [key: string]: number | string;
}
