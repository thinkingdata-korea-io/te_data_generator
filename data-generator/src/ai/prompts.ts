import { ParsedSchema, EventDefinition } from '../types';
import { UserInput } from './client';
import { logger } from '../utils/logger';

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

### 3.5. ⭐ 세그먼트별 이벤트 제약 정의 (매우 중요!)
**각 세그먼트가 절대 할 수 없는 이벤트**와 **독점적으로 할 수 있는 이벤트**를 정의하세요.

**핵심 원칙:**
- **blockedEvents**: 이 세그먼트는 절대 수행할 수 없는 이벤트 (권한 부족, 역할 불일치)
- **allowedEvents**: 이 세그먼트만 독점적으로 수행 가능한 이벤트 (관리자 전용 등)
- **preferredEvents**: 이 세그먼트가 선호하는 이벤트 (가중치 증가)

**예시:** 일반 사용자는 관리 기능을 수행할 수 없고, 관리자만 관리 이벤트 실행 가능

**⚠️ 도메인 특성에 맞게 모든 세그먼트에 대해 정의하세요!**

### 4. ⭐ 이벤트 자동 그룹핑 (중요!)
**${userInput.industry} 도메인의 특성을 고려하여** 이벤트들을 5-8개의 의미있는 그룹으로 분류하세요.

**그룹핑 기준:**
- 기능적 유사성 (예: 인증 관련, 콘텐츠 소비 관련, 결제 관련)
- 사용자 여정 단계 (예: 온보딩, 핵심 기능 사용, 전환)
- 비즈니스 목적 (예: 사용자 확보, 참여 유도, 수익화)

**그룹당 최대 10개 이벤트**를 포함하세요. 이벤트가 많으면 세분화하세요.

### 5. ⭐ 마케팅 어트리뷰션 범위 정의 (중요!)
**${userInput.industry} 도메인의 특성을 고려하여** 마케팅 데이터 범위를 정의하세요.

**고려사항:**
- 산업별 광고 메트릭 특성 (CPI, 전환율, ROAS, LTV 등)
- 주요 광고 소스 및 가중치
- 광고 수익 네트워크 (있는 경우)
- 광고 유닛 타입별 평균 수익

### 6. ⭐ 속성 간 상관관계 정의 (현실성 향상!)
**속성들 간의 논리적 관계**를 정의하여 데이터의 현실성을 높이세요.

**상관관계 타입:**
- **positive**: 한 속성 증가 → 다른 속성 증가 (예: 광고 노출수 ↑ → 클릭수 ↑)
- **negative**: 한 속성 증가 → 다른 속성 감소 (예: 가격 ↑ → 할인율 ↓)
- **conditional**: 조건부 관계 (예: 국가="한국" → 언어="ko")

**예시:**
\`\`\`json
{
  "sourceProperty": "price",
  "targetProperty": "discount_rate",
  "correlationType": "negative",
  "strength": 0.7,
  "description": "높은 가격 상품은 낮은 할인율"
}
\`\`\`

**도메인별 고려사항:**
- 지역 ↔ 언어 ↔ 통화 (conditional)
- 가격 ↔ 구매 확률 (negative)
- 광고 노출 ↔ 클릭 (positive, strength=0.3~0.5)
- 재방문 횟수 ↔ 만족도 (positive)

### 7. ⭐ 시간 분포 패턴 정의 (현실성 향상!)
**${userInput.industry} 산업의 시간대별 활동 패턴**을 정의하세요.

**hourlyWeights** (필수):
- 0~23시 각 시간대의 활동 가중치 (합계 1.0)
- 산업 특성 반영 (게임: 저녁~밤, 금융: 출근/점심, 커머스: 점심/저녁)

**segmentPeakHours** (선택):
- 세그먼트별로 다른 피크 시간 정의 가능
- VIP/프리미엄 유저는 낮 시간대 활동 가능

**weekdayMultipliers** (선택):
- 요일별 가중치 [일, 월, 화, 수, 목, 금, 토]
- 주말 증가/감소, 평일 패턴 반영

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
  },
  "segmentEventConstraints": [
    {
      "segmentName": "일반 시청자",
      "blockedEvents": ["라이브 시작", "방 생성", "방송 설정"],
      "preferredEvents": ["방송 시청", "채팅", "좋아요", "구독"]
    },
    {
      "segmentName": "스트리머/크리에이터",
      "allowedEvents": ["라이브 시작", "방 생성", "방송 설정"],
      "preferredEvents": ["콘텐츠 업로드", "팬 소통", "수익 확인"]
    }
  ],
  "marketingRanges": {
    "metrics": {
      "clicks": { "min": 100, "max": 10000 },
      "impressions": { "min": 1000, "max": 100000 },
      "cost": { "min": 100, "max": 10000, "currency": "USD" },
      "conversions": { "min": 10, "max": 500 },
      "installs": { "min": 10, "max": 1000 },
      "revenue": { "min": 0, "max": 1000, "currency": "USD" }
    },
    "mediaSources": [
      { "name": "google", "weight": 0.35, "description": "Google Ads (검색, 디스플레이, UAC)" },
      { "name": "facebook", "weight": 0.25, "description": "Facebook/Instagram Ads" },
      { "name": "apple_search_ads", "weight": 0.15 },
      { "name": "tiktok", "weight": 0.10 },
      { "name": "unity_ads", "weight": 0.05 },
      { "name": "organic", "weight": 0.10 }
    ],
    "adRevenueNetworks": [
      { "name": "admob", "weight": 0.4 },
      { "name": "unity_ads", "weight": 0.3 },
      { "name": "ironsource", "weight": 0.2 },
      { "name": "applovin", "weight": 0.1 }
    ],
    "adUnitTypes": [
      { "name": "rewarded_video", "weight": 0.5, "avgRevenue": { "min": 0.01, "max": 0.10 } },
      { "name": "interstitial", "weight": 0.3, "avgRevenue": { "min": 0.005, "max": 0.05 } },
      { "name": "banner", "weight": 0.15, "avgRevenue": { "min": 0.001, "max": 0.01 } },
      { "name": "native", "weight": 0.05, "avgRevenue": { "min": 0.005, "max": 0.03 } }
    ],
    "agencies": ["Adways", "DMC Media", "Nasmedia", "Cheil Worldwide"],
    "placements": ["youtube_instream", "facebook_feed", "instagram_story", "tiktok_feed"]
  },
  "propertyCorrelations": [
    {
      "sourceProperty": "price",
      "targetProperty": "discount_rate",
      "correlationType": "negative",
      "strength": 0.7,
      "description": "고가 상품일수록 할인율이 낮음"
    },
    {
      "sourceProperty": "country",
      "targetProperty": "language",
      "correlationType": "conditional",
      "strength": 1.0,
      "description": "국가에 따라 언어 자동 매핑",
      "conditions": [
        { "sourceValue": "KR", "targetValues": ["ko"] },
        { "sourceValue": "US", "targetValues": ["en"] },
        { "sourceValue": "JP", "targetValues": ["ja"] }
      ]
    }
  ],
  "timingDistribution": {
    "hourlyWeights": [0.01, 0.01, 0.01, 0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.05, 0.04, 0.05, 0.06, 0.05, 0.04, 0.05, 0.06, 0.07, 0.08, 0.09, 0.08, 0.06, 0.04, 0.02],
    "segmentPeakHours": {
      "VIP 사용자": { "start": 10, "end": 22 },
      "일반 사용자": { "start": 19, "end": 23 }
    },
    "weekdayMultipliers": [1.0, 0.9, 0.9, 0.9, 0.9, 1.0, 1.2]
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

1. **⭐ 텍스트 속성은 반드시 choice 타입으로 정의하세요! (매우 중요!)**
   - 카테고리, 타입, 상태, 제목, 설명 등 **모든 텍스트 속성**
   - **AI가 현실적인 선택값을 생성**하여 의미있는 데이터 보장
   - 예시:
     - "방 제목" → choice: ["게임 방송", "음악 방송", "토크쇼", "공부방", "일상"]
     - "카테고리" → choice: ["Gaming", "Music", "Education", "Entertainment"]
     - "상품명" → choice: ["스마트폰", "노트북", "태블릿", "이어폰", "충전기"]
   - ❌ 절대 string 타입으로 정의하지 마세요! (랜덤 문자열 생성됨)

2. **Faker.js가 자동 생성하는 속성만 제외하세요:**
   - 개인 식별 정보만: name, nickname, user_name, email, phone, address
   - 일반 ID: *_id로 끝나는 UUID
   - 이외의 **모든 비즈니스 속성은 반드시 범위를 정의**하세요!

3. **비즈니스 로직 속성 타입 가이드:**
   - **숫자**: 금액, 가격, 수량 (price, amount, quantity) → number 타입
   - **레벨/점수**: level, score, rank → number 타입
   - **텍스트**: 카테고리, 타입, 상태, 제목 → **choice 타입 (필수!)**
   - **선택값**: 모든 enum 같은 속성 → choice 타입
   - **Boolean**: 정말 true/false만 가능한 경우 → boolean 또는 choice

3. **⭐ Object Group 및 Object 속성 처리 (매우 중요!):**
   - **Object Group** (객체 배열): 부모 속성 자체는 범위를 정의하지 마세요!
   - **Object** (단일 객체): 부모 속성 자체는 범위를 정의하지 마세요!
   - 오직 **자식 속성들** (점(.) 표기법 사용)만 범위를 정의하세요

   **예시:**
   - ❌ "achievement_rewards" (부모) - 범위 정의 금지!
   - ✅ "achievement_rewards.reward_type" (자식) - 범위 정의 필요
   - ✅ "achievement_rewards.reward_id" (자식) - 범위 정의 필요
   - ✅ "achievement_rewards.quantity" (자식) - 범위 정의 필요

   **속성 목록에서 "object group" 또는 "object" 타입을 찾아서 그 자식들만 처리하세요!**

4. **⭐ 속성 타입 일관성 유지 (매우 중요!):**
   - **같은 이름의 속성은 모든 이벤트에서 동일한 타입을 사용해야 합니다!**
   - 예시: "filter_applied"라는 속성이 여러 이벤트에 존재한다면:
     - ❌ 잘못된 예: event1에서는 boolean, event2에서는 string
     - ✅ 올바른 예: 모든 이벤트에서 동일하게 boolean 또는 choice 타입
   - 불확실하면 **choice 타입을 사용**하세요 (예: ["yes", "no", "unknown"])
   - Boolean으로 보이는 속성도 다른 값이 필요하면 choice로 정의하세요

5. **핵심 원칙:**
- ✅ 텍스트 속성 = choice 타입 (AI가 현실적인 값 생성)
- ✅ 숫자 속성 = number 타입 (min/max 범위)
- ✅ values는 ${userInput.industry} 도메인에 맞게 생성
- ❌ string 타입 사용 금지 (랜덤 문자열 생성됨)

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
        logger.warn(`⚠️  Event '${eventName}' in group '${groupName}' not found in schema`);
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
    logger.warn(`⚠️  ${ungroupedEvents.length} events not grouped by AI:`, ungroupedEvents.map(e => e.event_name));
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

### 1. 리텐션 커브 정의

**산업 특성을 고려하여** Day 1, Day 7, Day 30 리텐션을 정의하세요:
- Day 0는 항상 1.0 (100%)
- Day 1 > Day 7 > Day 30 (감소 패턴 준수)
- retentionDecay: 0.90~0.98 (낮을수록 빠른 이탈, 높을수록 완만한 감소)

**특수 패턴:**
- weekendBoost: 주말 활동 증가율 (0.8~1.5)
- monthlyReturnPattern: 월간 복귀 패턴 여부 (true/false)

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

### 3-1. 생명주기 전환 임계값

**산업 특성에 맞게** 사용자가 각 단계로 전환되는 기준일을 정의하세요:

- \`dormantAfterDays\`: 활성 → 휴면 전환 기준 (일 단위, 보통 3-30일)
- \`churnedAfterDays\`: 휴면 → 이탈 전환 기준 (일 단위, 보통 21-90일)

### 4. 특수 패턴

산업 특성에 따라 정의하세요:
- \`weekendBoost\`: 주말 활동 증가율 (0.8~1.5, 1.0 = 변화없음)
- \`monthlyReturnPattern\`: 월간 복귀 패턴 여부 (true/false)

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
    "lifecycleTransitionThresholds": {
      "dormantAfterDays": 7,
      "churnedAfterDays": 30
    },
    "weekendBoost": 1.3,
    "monthlyReturnPattern": false
  }
}
\`\`\`

**중요**: ${userInput.industry} 산업의 실제 벤치마크를 반영하여 현실적인 수치를 제공하세요.`;
}

/**
 * AI Validator: 리텐션 커브 검증 프롬프트
 */
export function buildRetentionValidationPrompt(
  proposedCurve: any,
  industry: string,
  ruleErrors: string[]
): string {
  return `You are a data validation expert. Validate this retention curve analysis.

## Proposed Retention Curve
${JSON.stringify(proposedCurve, null, 2)}

## Industry: ${industry}

## Rule-based Validation Errors
${ruleErrors.length > 0 ? ruleErrors.map(e => `- ${e}`).join('\n') : 'None (all rules passed)'}

## Your Task
If rule-based errors exist, determine if they are:
1. **Critical**: Must be fixed (e.g., Day1 < Day7)
2. **Acceptable**: Within reasonable variance (e.g., 1-2% outside benchmark)

Respond in JSON:

\`\`\`json
{
  "valid": true | false,
  "recommendation": "accept" | "revise",
  "issues": [
    {
      "field": "day1Retention",
      "severity": "critical" | "warning",
      "message": "Value 0.52 is slightly above benchmark (0.50) but acceptable"
    }
  ]
}
\`\`\`

Be lenient for minor variances (±5% from benchmark).`;
}

/**
 * AI Fixer: 리텐션 커브 수정 프롬프트
 */
export function buildRetentionFixerPrompt(
  proposedCurve: any,
  industry: string,
  errors: string[]
): string {
  return `You are a data correction expert. Fix this retention curve.

## Original (has errors)
${JSON.stringify(proposedCurve, null, 2)}

## Industry: ${industry}

## Errors to Fix
${errors.map(e => `- ${e}`).join('\n')}

## Your Task
Fix ALL errors while keeping other fields unchanged.

Respond in JSON:

\`\`\`json
{
  "retentionCurve": {
    // corrected full retention curve
  }
}
\`\`\``;
}

/**
 * AI Validator: 이벤트 순서 검증 프롬프트
 */
export function buildEventSequencingValidationPrompt(
  proposedSequencing: any,
  allEvents: string[],
  ruleErrors: string[]
): string {
  return `You are an event sequencing validation expert.

## Proposed Event Sequencing
${JSON.stringify(proposedSequencing, null, 2)}

## All Events in Schema
${allEvents.join(', ')}

## Rule-based Validation Errors
${ruleErrors.length > 0 ? ruleErrors.map(e => `- ${e}`).join('\n') : 'None'}

## Your Task
Validate if the event categorization and constraints are logical.

Respond in JSON:

\`\`\`json
{
  "valid": true | false,
  "recommendation": "accept" | "revise",
  "issues": [
    {
      "field": "eventCategories.lifecycle",
      "severity": "critical" | "warning",
      "message": "No install-like event found"
    }
  ]
}
\`\`\``;
}

/**
 * AI Fixer: 이벤트 순서 수정 프롬프트
 */
export function buildEventSequencingFixerPrompt(
  proposedSequencing: any,
  allEvents: string[],
  errors: string[]
): string {
  return `You are an event sequencing correction expert.

## Original (has errors)
${JSON.stringify(proposedSequencing, null, 2)}

## All Events
${allEvents.join(', ')}

## Errors to Fix
${errors.map(e => `- ${e}`).join('\n')}

## Your Task
Fix ALL errors. Ensure every event is categorized.

Respond in JSON:

\`\`\`json
{
  "eventSequencing": {
    // corrected full event sequencing
  }
}
\`\`\``;
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

**목표: 이벤트 간 논리적 순서 및 실행 제약을 정의하여 불가능한 이벤트 시퀀스 방지**

**🚨 핵심 원칙: "완료" 이벤트 후 해당 "트랜잭션 내부" 이벤트는 절대 발생 불가!**

---

**⚠️ 필수 요구사항:**
1. 응답에는 **반드시 "transactions" 필드**가 포함되어야 합니다
2. 트랜잭션 패턴이 없는 경우에도 **"transactions": []** 빈 배열로 응답하세요
3. 모든 이벤트를 eventCategories에 분류하세요

**트랜잭션이 없는 경우 예시:**
- 단순 콘텐츠 소비: article_view, video_watch (시작/종료 없이 단일 이벤트)
- 정보 조회: weather_check, news_read (완료 개념 없음)
- 단순 액션: like, share, comment (독립적인 이벤트)
→ 이런 경우: **"transactions": []** 로 응답

---

### STEP 1: 트랜잭션/라운드 자동 감지 ⭐

**트랜잭션이란?**
- **시작(start/begin)**과 **종료(end/complete)** 이벤트로 구성된 논리적 단위
- 종료 후에는 해당 트랜잭션 내부 이벤트가 **절대 발생할 수 없음**

**자동 감지 규칙:**
1. 이벤트 이름에 \`start, begin, open\` 포함 → **트랜잭션 시작**
2. 이벤트 이름에 \`end, complete, finish, close\` 포함 → **트랜잭션 종료**
3. 동일한 접두사를 공유하는 이벤트들 → **트랜잭션 내부**
   - 예: \`game_start\`, \`game_end\` → \`game_*\` 이벤트들은 내부

**예시:**
\`\`\`
트랜잭션: "프로세스명"
- 시작: process_start
- 내부: inner_action1, inner_action2
- 종료: process_end
❌ 차단: process_end 발생 후 inner_action 절대 불가!
\`\`\`

**당신의 작업:**
1. 위 패턴을 참고하여 주어진 이벤트 목록에서 **트랜잭션 그룹**을 식별하세요
2. 각 트랜잭션의 시작/내부/종료 이벤트를 명확히 분류하세요
3. **종료 이벤트 발생 후 차단할 내부 이벤트** 목록을 \`blockedAfterEvents\`에 정의하세요

---

### STEP 2: 이벤트 카테고리 분류

다음 카테고리로 **모든 이벤트**를 분류하세요:

**lifecycle**: 앱 생명주기 (유저당 한 번만 발생)
- 예: \`app_install\`, \`signup\`, \`uninstall\`

**session_start**: 세션 시작 (매 세션 첫 이벤트)
- 예: \`app_start\`, \`login\`

**session_end**: 세션 종료 (매 세션 마지막 이벤트)
- 예: \`app_end\`, \`logout\`

**onboarding**: 온보딩/튜토리얼 (첫 세션에만)
- 예: \`tutorial_start\`, \`tutorial_complete\`, \`profile_setup\`

**core**: 일반 서비스 이벤트 (반복 가능)
- 예: \`product_view\`, \`search\`, \`content_read\`

**monetization**: 수익화 이벤트
- 예: \`purchase\`, \`ad_view\`, \`subscription\`

---

### STEP 3: 필수 선행 이벤트 (strictDependencies)

**반드시 지켜야 하는** 이벤트 순서를 정의하세요:
- \`signup_complete\` → 먼저 \`signup_start\` 필요
- \`checkout_complete\` → 먼저 \`cart_add\` 필요
- \`game_end\` → 먼저 \`game_start\` 필요
- \`tutorial_complete\` → 먼저 \`tutorial_start\` 필요

---

### STEP 4: 실행 제약 (executionConstraints)

각 이벤트의 실행 조건을 정의하세요:

\`\`\`
- maxOccurrencesPerSession: 세션당 최대 횟수 (예: app_start = 1, game_start = 5)
- maxOccurrencesPerUser: 유저당 최대 횟수 (예: signup = 1)
- requiresFirstSession: 첫 세션에만 발생 (예: tutorial_start = true)
- minimumSessionNumber: 최소 N번째 세션부터 (예: advanced_feature = 3)
- blockedAfterEvents: 특정 이벤트 후 **절대 차단** (⭐ 가장 중요!)
  예:
  {
    "death": { "blockedAfterEvents": ["game_end", "battle_end"] }
    "cart_add": { "blockedAfterEvents": ["purchase_complete"] }
    "video_pause": { "blockedAfterEvents": ["video_play_end"] }
  }
\`\`\`

---

### STEP 5: 트랜잭션 정의 (transactions) ⭐ 신규!

STEP 1에서 식별한 트랜잭션을 다음 형식으로 정의하세요:

\`\`\`json
{
  "transactions": [
    {
      "name": "게임 라운드",
      "description": "게임 시작부터 종료까지의 한 라운드",
      "startEvents": ["game_start", "battle_start"],
      "endEvents": ["game_end", "battle_end"],
      "innerEvents": ["death", "kill", "score_update", "item_use"],
      "allowInnerAfterEnd": false,
      "passThroughProperties": ["game_id", "session_id", "match_id", "room_id"],
      "innerEventSequence": [
        {
          "events": ["score_update", "item_use", "kill", "death"],
          "strictOrder": true
        }
      ]
    }
  ]
}
\`\`\`

**allowInnerAfterEnd**:
- \`false\` (기본값): 종료 후 내부 이벤트 **절대 불가** (게임, 결제, 거래 등)
- \`true\`: 종료 후에도 가능 (드문 경우, 예: 부활 시스템이 있는 게임)

**🆕 passThroughProperties** (매우 중요!):
- 트랜잭션 시작 이벤트에서 생성된 값이 **내부/종료 이벤트에 그대로 전달**되어야 하는 속성들
- 예시:
  - 게임: \`game_id\`, \`match_id\`, \`room_id\` → 라운드 내 모든 이벤트가 동일한 ID 공유
  - 결제: \`cart_id\`, \`transaction_id\` → 장바구니 담기~결제 완료까지 동일 ID
  - 쇼핑: \`product_id\` → 상품 조회~구매까지 동일 상품 ID 유지
- **누락 시**: \`game_start\`에서 생성한 \`game_id="AAA"\`인데 \`game_end\`에서 \`game_id="BBB"\`로 생성되어 데이터 불일치 발생
- **정의 시**: 시작 이벤트의 속성값이 내부/종료 이벤트에 복사되어 데이터 일관성 보장

**🆕 innerEventSequence** (선택사항):
- 트랜잭션 내부 이벤트들의 **논리적 순서**를 정의합니다
- 예: 게임에서 "킬" 이벤트는 반드시 "데스" 이벤트 **전에** 발생해야 합니다
- \`strictOrder: true\`: 반드시 이 순서대로 실행 (예: 결제 프로세스)
- \`strictOrder: false\`: 순서는 권장이지만 일부 생략 가능 (예: 게임 플레이)

---

### STEP 6: 논리적 시퀀스 (logicalSequences)

주요 사용자 여정을 순서대로 정의하세요:

\`\`\`json
{
  "name": "구매 퍼널",
  "description": "상품 발견부터 구매 완료까지",
  "sequence": ["product_view", "cart_add", "checkout_start", "payment", "purchase_complete"],
  "strictOrder": true
}
\`\`\`

---

### STEP 7: 이벤트별 시간 간격 설정 (eventIntervals) ⭐ 매우 중요!

**모든 이벤트**에 대해 시간 간격을 정의하여 현실적인 데이터를 생성하세요:

**⚠️ 필수 요구사항:**
- 정의하지 않은 이벤트는 기본값(10초)을 사용하여 비현실적입니다
- **모든 ${schema.events.length}개 이벤트**에 대해 간격을 정의하세요
- 이벤트 특성에 맞는 간격과 distribution을 선택하세요

\`\`\`json
"eventIntervals": {
  "page_view": {
    "avgSeconds": 2,
    "distribution": "exponential",
    "minSeconds": 1,
    "maxSeconds": 10
  },
  "button_click": {
    "avgSeconds": 1,
    "distribution": "exponential",
    "minSeconds": 0.5,
    "maxSeconds": 5
  },
  "purchase": {
    "avgSeconds": 15,
    "distribution": "normal",
    "minSeconds": 5,
    "maxSeconds": 60
  }
}
\`\`\`

**가이드라인:**
- 빠른 액션 (클릭, 조회): 1-5초 (exponential)
- 중간 액션 (선택, 입력): 5-30초 (exponential 또는 normal)
- 느린 액션 (결정, 완료): 30-180초 (normal)

**distribution 타입:**
- \`exponential\`: 대부분의 이벤트 (빠른 액션, 클릭 등)
- \`normal\`: 고민이 필요한 이벤트 (구매, 결정)
- \`uniform\`: 균등한 간격이 필요한 경우 (드물게 사용)

---

다음 JSON 형식으로 **반드시** 응답해주세요:

\`\`\`json
{
  "eventSequencing": {
    "transactions": [
      // ⚠️ 필수 필드! 트랜잭션이 없으면 빈 배열 [] 로 응답
      {
        "name": "트랜잭션명",
        "description": "설명",
        "startEvents": ["start_event"],
        "endEvents": ["end_event"],
        "innerEvents": ["inner1", "inner2"],
        "allowInnerAfterEnd": false,
        "passThroughProperties": ["transaction_id", "session_id"],
        "innerEventSequence": [
          {
            "events": ["inner1", "inner2"],
            "strictOrder": true
          }
        ]
      }
    ],
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
      "death": {
        "blockedAfterEvents": ["game_end", "battle_end"]
      },
      "signup": {
        "maxOccurrencesPerUser": 1
      }
    },
    "eventIntervals": {
      "page_view": {
        "avgSeconds": 2,
        "distribution": "exponential",
        "minSeconds": 1,
        "maxSeconds": 10
      },
      "purchase": {
        "avgSeconds": 15,
        "distribution": "normal",
        "minSeconds": 5,
        "maxSeconds": 60
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

**🚨 필수 체크리스트:**
1. ✅ 모든 이벤트를 카테고리에 배치했는가?
2. ✅ 트랜잭션(시작-종료 패턴)을 식별했는가?
3. ✅ 종료 후 내부 이벤트 차단 규칙(\`blockedAfterEvents\`)을 정의했는가?
4. ✅ \`game_end\` 후 \`death\` 같은 논리적으로 불가능한 시퀀스를 방지하는가?

**도메인 특성을 깊이 이해하고, 현실적으로 불가능한 이벤트 순서를 철저히 차단하세요!**`;
}
