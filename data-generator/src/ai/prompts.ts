import { ParsedSchema, EventDefinition } from '../types';
import { UserInput } from './client';

/**
 * AI 프롬프트 빌더
 * 다단계 분석을 위한 프롬프트 생성
 */

/**
 * Phase 1: 전략 분석 + 이벤트 자동 그룹핑 프롬프트
 * 사용자 세그먼트, 세션 패턴, 이벤트 의존성, 이벤트 그룹핑 정의
 */
export function buildStrategyPrompt(schema: ParsedSchema, userInput: UserInput): string {
  return `당신은 ${userInput.industry} 도메인의 데이터 분석 전문가입니다.

다음 정보를 기반으로 **전략적 분석 및 이벤트 그룹핑**을 수행해주세요.

## 사용자 시나리오
${userInput.scenario}

## 서비스 정보
- 산업: ${userInput.industry}
- DAU: ${userInput.dau}
- 비고: ${userInput.notes}
- 날짜 범위: ${userInput.dateRange.start} ~ ${userInput.dateRange.end}

## 이벤트 목록 (${schema.events.length}개)
${schema.events.map(e => `- ${e.event_name} (${e.event_name_kr}): ${e.category || '일반'}`).join('\n')}

---

**이번 단계에서 수행할 작업:**

### 1. 사용자 세그먼트 정의
3-5개의 주요 사용자 그룹을 정의하세요.

### 2. 세션 패턴 정의
각 세그먼트의 평균 세션 수, 세션 시간, 이벤트 수를 정의하세요.

### 3. 이벤트 의존성 파악
특정 이벤트를 발생시키기 위한 선행 이벤트를 정의하세요.

### 4. ⭐ 이벤트 자동 그룹핑 (중요!)
**${userInput.industry} 도메인의 특성을 고려하여** 이벤트들을 5-8개의 의미있는 그룹으로 분류하세요.

**그룹핑 기준:**
- 기능적 유사성 (예: 인증 관련, 콘텐츠 소비 관련, 결제 관련)
- 사용자 여정 단계 (예: 온보딩, 핵심 기능 사용, 전환)
- 비즈니스 목적 (예: 사용자 확보, 참여 유도, 수익화)

**그룹당 최대 10개 이벤트**를 포함하세요. 이벤트가 많으면 세분화하세요.

**예시 (게임 산업):**
- "온보딩/튜토리얼": install, signup, tutorial_start, tutorial_complete
- "핵심 게임플레이": battle_start, battle_end, level_up, stage_clear
- "소셜 기능": friend_add, chat_send, guild_join
- "수익화": purchase, ad_view, subscription

**예시 (커머스 산업):**
- "사용자 획득": install, signup, onboarding_complete
- "상품 탐색": search, category_view, product_view
- "장바구니/위시리스트": cart_add, wishlist_add
- "결제/구매": checkout_start, payment, purchase_complete
- "고객 관리": review_write, customer_service_contact

**예시 (뉴스/미디어 산업):**
- "콘텐츠 소비": article_view, video_play, podcast_listen
- "참여/상호작용": comment, share, like
- "개인화": topic_follow, notification_subscribe
- "수익화": subscription, ad_impression

다음 JSON 형식으로 응답해주세요:

\`\`\`json
{
  "userSegments": [
    {
      "name": "신규 사용자",
      "ratio": 0.3,
      "characteristics": "첫 접속, 온보딩 진행 중, 낮은 활동량"
    },
    {
      "name": "활성 사용자",
      "ratio": 0.5,
      "characteristics": "정기적 접속, 주요 기능 활용, 중간 활동량"
    },
    {
      "name": "고가치 사용자",
      "ratio": 0.2,
      "characteristics": "매일 접속, 모든 기능 활용, 높은 활동량"
    }
  ],
  "eventDependencies": {
    "tutorial_complete": ["tutorial_start"],
    "purchase": ["product_view", "cart_add"]
  },
  "eventGroups": {
    "온보딩/인증": ["app_install", "signup_complete", "tutorial_start", "tutorial_complete"],
    "핵심 기능 사용": ["feature_a", "feature_b", "feature_c"],
    "수익화": ["purchase", "subscription", "ad_view"]
  },
  "sessionPatterns": {
    "avgSessionsPerDay": {
      "신규 사용자": 1.5,
      "활성 사용자": 3.0,
      "고가치 사용자": 5.0
    },
    "avgSessionDuration": {
      "신규 사용자": 180000,
      "활성 사용자": 300000,
      "고가치 사용자": 600000
    },
    "avgEventsPerSession": {
      "신규 사용자": 8,
      "활성 사용자": 15,
      "고가치 사용자": 30
    }
  }
}
\`\`\``;
}

/**
 * Phase 2: 이벤트 그룹별 속성 범위 생성 프롬프트
 */
export function buildEventGroupPrompt(
  events: EventDefinition[],
  properties: any[],
  userSegments: string[],
  userInput: UserInput,
  groupName: string
): string {
  // 해당 이벤트들의 속성 필터링
  const eventNames = events.map(e => e.event_name);
  const relevantProperties = properties.filter(p =>
    !p.event_name || eventNames.includes(p.event_name)
  );

  return `당신은 ${userInput.industry} 도메인의 데이터 분석 전문가입니다.

## 분석 대상: ${groupName} 카테고리
다음 이벤트들의 **속성 범위**를 정의해주세요.

## 이벤트 목록 (${events.length}개)
${events.map(e => `- ${e.event_name} (${e.event_name_kr}): ${e.category || '일반'}`).join('\n')}

## 속성 목록 (${relevantProperties.length}개)
${relevantProperties.map(p =>
  `- ${p.property_name} (${p.property_name_kr || p.property_name}): ${p.data_type}${p.description ? ' - ' + p.description : ''}`
).join('\n')}

## 사용자 세그먼트
${userSegments.map(s => `- ${s}`).join('\n')}

---

**중요 지침:**

1. **Faker.js가 자동 생성하는 속성은 제외하세요:**
   - 이름: name, nickname, user_name
   - 연락처: email, phone
   - 주소: address, city
   - 일반 ID: *_id로 끝나는 UUID

2. **비즈니스 로직 중심 속성만 범위를 정의하세요:**
   - 금액, 가격, 수량 (price, amount, quantity)
   - 레벨, 점수, 순위 (level, score, rank)
   - 카테고리, 타입, 상태 (category, type, status)
   - 게임 관련 (character, stage, mode, tier)

3. **Few-shot 예시:**

\`\`\`json
{
  "event_name": "purchase",
  "properties": [
    {
      "property_name": "amount",
      "type": "number",
      "min": 1000,
      "max": 50000,
      "segmentRanges": {
        "고가치 사용자": { "min": 10000, "max": 100000 }
      }
    },
    {
      "property_name": "payment_method",
      "type": "choice",
      "values": ["Card", "Cash", "Mobile"],
      "weights": [0.6, 0.2, 0.2]
    },
    {
      "property_name": "category",
      "type": "choice",
      "values": ["Weapon", "Armor", "Potion", "Special"],
      "weights": [0.3, 0.25, 0.35, 0.1]
    }
  ]
}
\`\`\`

다음 JSON 형식으로 응답해주세요:

\`\`\`json
{
  "eventRanges": [
    {
      "event_name": "이벤트명",
      "properties": [
        {
          "property_name": "속성명",
          "type": "number | choice | boolean | string",
          "min": 0,
          "max": 100,
          "values": ["A", "B", "C"],
          "weights": [0.5, 0.3, 0.2],
          "segmentRanges": {
            "세그먼트명": { "min": 50, "max": 200 }
          }
        }
      ]
    }
  ]
}
\`\`\``;
}

/**
 * AI가 반환한 eventGroups를 Map으로 변환
 */
export function convertAIGroupsToMap(
  aiEventGroups: Record<string, string[]>,
  events: EventDefinition[]
): Map<string, EventDefinition[]> {
  const groups = new Map<string, EventDefinition[]>();
  const eventMap = new Map<string, EventDefinition>();

  // 이벤트 이름으로 빠른 조회를 위한 맵 생성
  events.forEach(event => {
    eventMap.set(event.event_name, event);
  });

  // AI가 반환한 그룹을 Map으로 변환
  for (const [groupName, eventNames] of Object.entries(aiEventGroups)) {
    const groupEvents: EventDefinition[] = [];

    eventNames.forEach(eventName => {
      const event = eventMap.get(eventName);
      if (event) {
        groupEvents.push(event);
      } else {
        console.warn(`⚠️  Event '${eventName}' in group '${groupName}' not found in schema`);
      }
    });

    if (groupEvents.length > 0) {
      groups.set(groupName, groupEvents);
    }
  }

  // 그룹에 포함되지 않은 이벤트 확인
  const groupedEventNames = new Set<string>();
  for (const eventNames of Object.values(aiEventGroups)) {
    eventNames.forEach(name => groupedEventNames.add(name));
  }

  const ungroupedEvents = events.filter(e => !groupedEventNames.has(e.event_name));
  if (ungroupedEvents.length > 0) {
    console.warn(`⚠️  ${ungroupedEvents.length} events not grouped by AI:`, ungroupedEvents.map(e => e.event_name));
    groups.set('기타', ungroupedEvents);
  }

  return groups;
}

/**
 * 그룹을 최대 크기로 재분할 (너무 큰 그룹 방지)
 */
export function splitLargeGroups(
  groups: Map<string, EventDefinition[]>,
  maxGroupSize: number = 10
): Map<string, EventDefinition[]> {
  const result = new Map<string, EventDefinition[]>();

  for (const [name, events] of groups.entries()) {
    if (events.length <= maxGroupSize) {
      result.set(name, events);
    } else {
      // 큰 그룹을 여러 개로 분할
      const numSplits = Math.ceil(events.length / maxGroupSize);
      for (let i = 0; i < numSplits; i++) {
        const start = i * maxGroupSize;
        const end = Math.min(start + maxGroupSize, events.length);
        const splitEvents = events.slice(start, end);
        result.set(`${name} (${i + 1}/${numSplits})`, splitEvents);
      }
    }
  }

  return result;
}
