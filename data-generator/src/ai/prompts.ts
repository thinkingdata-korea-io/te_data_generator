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

/**
 * Phase 1.5: 리텐션 커브 분석 프롬프트
 * 산업 특성을 반영한 현실적인 리텐션 패턴 생성
 */
export function buildRetentionPrompt(
  userInput: UserInput,
  userSegments: Array<{ name: string; ratio: number; characteristics: string }>
): string {
  return `당신은 ${userInput.industry} 도메인의 사용자 리텐션 전문가입니다.

## 서비스 정보
- 산업: ${userInput.industry}
- DAU: ${userInput.dau}
- 시나리오: ${userInput.scenario}
- 비고: ${userInput.notes}

## 사용자 세그먼트
${userSegments.map(s => `- ${s.name} (${(s.ratio * 100).toFixed(0)}%): ${s.characteristics}`).join('\n')}

---

**목표: ${userInput.industry} 산업의 현실적인 리텐션 커브 설계**

다음 지침에 따라 리텐션 패턴을 정의해주세요:

### 1. 산업별 벤치마크 참고

**게임 (Mobile Game):**
- Day 1: 35-45%
- Day 7: 15-25%
- Day 30: 3-8%
- 특징: 초반 급격한 이탈, 주말 활동 증가(1.3x), retentionDecay: 0.92-0.94

**금융/핀테크 (Finance/Banking):**
- Day 1: 55-70%
- Day 7: 35-50%
- Day 30: 20-35%
- 특징: 완만한 감소, 주중 활동 증가, retentionDecay: 0.95-0.97

**이커머스 (E-Commerce):**
- Day 1: 40-55%
- Day 7: 20-35%
- Day 30: 10-20%
- 특징: 월간 복귀 패턴(급여일), 주말 증가(1.2x), retentionDecay: 0.93-0.95

**소셜/커뮤니티 (Social):**
- Day 1: 50-65%
- Day 7: 30-45%
- Day 30: 15-25%
- 특징: 네트워크 효과, 저녁 시간 활동 증가, retentionDecay: 0.94-0.96

**뉴스/미디어 (News/Media):**
- Day 1: 45-60%
- Day 7: 25-40%
- Day 30: 12-20%
- 특징: 아침 출근 시간 피크, retentionDecay: 0.93-0.95

### 2. 세그먼트별 차별화

각 세그먼트의 **리텐션 가중치**를 정의하세요:
- VIP/고가치/활성 유저: 1.3 - 2.0 (높은 리텐션)
- 일반/신규 유저: 0.9 - 1.1 (평균)
- 저활동/무료 유저: 0.5 - 0.8 (낮은 리텐션)

### 3. 생명주기별 활동 확률

각 단계별 일일 활동 확률을 정의하세요:
- \`new\`: 신규 유저 (설치 후 1-3일)
- \`active\`: 활성 유저 (정기 사용자)
- \`returning\`: 복귀 유저 (휴면 후 복귀)
- \`dormant\`: 휴면 유저 (7-30일 미접속)
- \`churned\`: 이탈 유저 (30일+ 미접속)

**지침:**
- new는 높게 (0.7-0.9) - 온보딩 단계
- active는 중상 (0.6-0.8) - 습관화
- returning은 중간 (0.4-0.6) - 재참여
- dormant는 낮게 (0.05-0.15) - 이탈 위험
- churned는 매우 낮게 (0.01-0.05) - 거의 복귀 없음

### 4. 특수 패턴

\`weekendBoost\`: 주말 활동 증가율 (게임/이커머스: 1.2-1.5, 금융: 0.8-0.9)
\`monthlyReturnPattern\`: 월간 복귀 패턴 여부 (이커머스/금융: true)

---

다음 JSON 형식으로 응답해주세요:

\`\`\`json
{
  "retentionCurve": {
    "industry": "${userInput.industry}",
    "dayZeroRetention": 1.0,
    "day1Retention": 0.45,
    "day7Retention": 0.22,
    "day30Retention": 0.08,
    "retentionDecay": 0.94,
    "segmentMultipliers": {
      "세그먼트명": 1.2
    },
    "lifecycleProbabilities": {
      "new": 0.85,
      "active": 0.7,
      "returning": 0.5,
      "dormant": 0.1,
      "churned": 0.03
    },
    "weekendBoost": 1.3,
    "monthlyReturnPattern": false
  }
}
\`\`\`

**중요**: ${userInput.industry} 산업의 실제 벤치마크를 반영하여 현실적인 수치를 제공하세요.`;
}

/**
 * Phase 1.6: 이벤트 순서 분석 프롬프트
 * 이벤트 간 논리적 순서 및 제약 조건 분석
 */
export function buildEventSequencingPrompt(
  schema: ParsedSchema,
  userInput: UserInput
): string {
  return `당신은 ${userInput.industry} 도메인의 이벤트 시퀀싱 전문가입니다.

## 서비스 정보
- 산업: ${userInput.industry}
- 시나리오: ${userInput.scenario}

## 이벤트 목록 (${schema.events.length}개)
${schema.events.map(e =>
  `- ${e.event_name} (${e.event_name_kr}): category=${e.category || '일반'}${e.required_previous_events ? ', requires=' + e.required_previous_events.join(',') : ''}`
).join('\n')}

## 퍼널 정의 (${schema.funnels.length}개)
${schema.funnels.map(f => `- ${f.name}: ${f.steps.join(' → ')}`).join('\n')}

---

**목표: 이벤트 간 논리적 순서 및 실행 제약 정의**

### 1. 이벤트 카테고리 분류

다음 카테고리로 이벤트를 분류하세요:

**lifecycle**: 앱 생명주기 (한 번만 발생)
- 예: \`app_install\`, \`signup\`, \`uninstall\`

**session_start**: 세션 시작 (매 세션 첫 이벤트)
- 예: \`app_start\`, \`login\`

**session_end**: 세션 종료 (매 세션 마지막 이벤트)
- 예: \`app_end\`, \`logout\`

**onboarding**: 온보딩/튜토리얼 (첫 세션에만)
- 예: \`tutorial_start\`, \`tutorial_complete\`, \`profile_setup\`

**core**: 일반 서비스 이벤트
- 예: \`product_view\`, \`search\`, \`content_read\`

**monetization**: 수익화 이벤트
- 예: \`purchase\`, \`ad_view\`, \`subscription\`

### 2. 필수 선행 이벤트 (strictDependencies)

**반드시 지켜야 하는** 이벤트 순서를 정의하세요:
- \`signup_complete\` → 먼저 \`signup_start\` 필요
- \`checkout_complete\` → 먼저 \`cart_add\` 필요
- \`tutorial_complete\` → 먼저 \`tutorial_start\` 필요

### 3. 실행 제약 (executionConstraints)

각 이벤트의 실행 조건을 정의하세요:

\`\`\`
- maxOccurrencesPerSession: 세션당 최대 횟수 (예: app_start = 1)
- maxOccurrencesPerUser: 유저당 최대 횟수 (예: signup = 1)
- requiresFirstSession: 첫 세션에만 발생 (예: tutorial_start = true)
- minimumSessionNumber: 최소 N번째 세션부터 (예: advanced_feature = 3)
- blockedAfterEvents: 특정 이벤트 후 차단 (예: uninstall 후 모든 이벤트 차단)
\`\`\`

### 4. 논리적 시퀀스 (logicalSequences)

주요 사용자 여정을 순서대로 정의하세요:

**예시 (이커머스):**
\`\`\`json
{
  "name": "구매 퍼널",
  "description": "상품 발견부터 구매 완료까지",
  "sequence": ["product_view", "cart_add", "checkout_start", "payment", "purchase_complete"],
  "strictOrder": true
}
\`\`\`

**예시 (게임):**
\`\`\`json
{
  "name": "게임 플레이",
  "description": "배틀 시작부터 종료까지",
  "sequence": ["battle_start", "battle_action", "battle_end", "reward_claim"],
  "strictOrder": true
}
\`\`\`

---

다음 JSON 형식으로 응답해주세요:

\`\`\`json
{
  "eventSequencing": {
    "strictDependencies": {
      "이벤트명": ["선행이벤트1", "선행이벤트2"]
    },
    "eventCategories": {
      "lifecycle": ["app_install", "signup"],
      "session_start": ["app_start"],
      "session_end": ["app_end"],
      "onboarding": ["tutorial_start", "tutorial_complete"],
      "core": ["product_view", "search"],
      "monetization": ["purchase"]
    },
    "executionConstraints": {
      "app_start": {
        "maxOccurrencesPerSession": 1
      },
      "signup": {
        "maxOccurrencesPerUser": 1
      },
      "tutorial_start": {
        "requiresFirstSession": true,
        "maxOccurrencesPerUser": 1
      }
    },
    "logicalSequences": [
      {
        "name": "시퀀스명",
        "description": "설명",
        "sequence": ["event1", "event2", "event3"],
        "strictOrder": true
      }
    ]
  }
}
\`\`\`

**중요**:
1. 모든 이벤트를 적절한 카테고리에 배치하세요
2. lifecycle 이벤트는 세션 외부에서 발생합니다
3. session_start/session_end는 세션 경계를 명확히 합니다
4. strictOrder=true일 때 순서를 엄격히 지킵니다`;
}
