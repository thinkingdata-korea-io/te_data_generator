# 현실적인 데이터 생성 로직 (Realistic Data Generation Logic)

## 목차

1. [개요](#1-개요)
2. [핵심 아키텍처](#2-핵심-아키텍처)
3. [현실성 구현 메커니즘](#3-현실성-구현-메커니즘)
4. [데이터 생성 워크플로우](#4-데이터-생성-워크플로우)
5. [산업별 특화 로직](#5-산업별-특화-로직)
6. [검증 및 품질 보증](#6-검증-및-품질-보증)
7. [기술 스택 및 참조](#7-기술-스택-및-참조)

---

## 1. 개요

### 1.1 문서의 목적

본 문서는 Demo Data Generator가 **단순 랜덤 데이터가 아닌 현실적인(realistic) 합성 데이터**를 생성하는 핵심 로직과 원리를 설명합니다. 기술적 구현 세부사항과 비즈니스 로직을 함께 다루어, 개발자와 기획자 모두가 시스템을 이해할 수 있도록 작성되었습니다.

### 1.2 "현실적인 데이터"란?

**랜덤 데이터 (Random Data)** - 피해야 할 방식:
- 임의의 타임스탬프 (아무 패턴 없음)
- 비즈니스 로직 무시 (결제 없이 구매 완료)
- 무의미한 속성값 (음수 가격, 불가능한 조합)

**현실적 데이터 (Realistic Data)** - 본 시스템의 목표:
- ✅ **AI 기반 산업별 분석**: 게임/커머스/금융 등 도메인에 맞는 값 범위
- ✅ **사용자 세그먼트 기반 행동 패턴**: VIP는 높은 활동량, 신규 유저는 낮은 활동량
- ✅ **이벤트 의존성 강제**: 장바구니 추가 → 결제 → 구매 완료 순서 보장
- ✅ **시간적 현실성**: 피크 타임(점심, 저녁), 세션 간격, 라이프사이클 변화
- ✅ **통계적 분포**: 정규분포(사용자 행동), 지수분포(이벤트 간격), 파레토 분포(매출)
- ✅ **마케팅 어트리뷰션 체인**: 설치 → 캠페인 → 광고 수익 연결

---

## 2. 핵심 아키텍처

### 2.1 시스템 구성 요소

```
┌─────────────────────────────────────────────────────────────┐
│                      DataGenerator                          │
│                  (Main Orchestrator)                        │
└────────────┬────────────────────────────────────────────────┘
             │
    ┌────────┴────────┬────────────┬─────────────┬────────────┐
    │                 │            │             │            │
┌───▼────┐   ┌────────▼─────┐  ┌──▼─────────┐ ┌─▼──────────┐ ┌▼───────────┐
│AIClient│   │CohortGenerator│  │EventGen    │ │DependencyMgr│ │ValidationPipeline│
│        │   │(User Lifecycle)│ │(Session+Evt)│ │(Constraints)│ │(Rules+AI)  │
└────────┘   └────────────────┘  └────────────┘ └────────────┘ └────────────┘
     │              │                  │              │              │
     └──────────────┴──────────────────┴──────────────┴──────────────┘
                             │
                    ┌────────┴────────┐
                    │  Utility Layer   │
                    ├──────────────────┤
                    │ • Faker Utils    │
                    │ • Distributions  │
                    │ • Random Utils   │
                    │ • Lifecycle Mgr  │
                    └──────────────────┘
```

**파일 위치 매핑:**

| 컴포넌트 | 파일 경로 | 역할 |
|---------|----------|------|
| DataGenerator | `data-generator/src/data-generator.ts` | 5단계 워크플로우 오케스트레이션 |
| AIClient | `data-generator/src/ai/client.ts` | Multi-provider AI 분석 (OpenAI, Anthropic, Gemini) |
| CohortGenerator | `data-generator/src/generators/cohort-generator.ts` | 사용자 세그먼트 및 라이프사이클 관리 |
| EventGenerator | `data-generator/src/generators/event-generator.ts` | 세션 및 이벤트 생성 |
| DependencyManager | `data-generator/src/generators/dependency-manager.ts` | 이벤트 의존성 및 제약 조건 관리 |
| ValidationPipeline | `data-generator/src/ai/validation-pipeline.ts` | 2단계 검증 (룰 기반 + AI) |
| FakerUtils | `data-generator/src/generators/faker-utils.ts` | 속성값 생성 (90단계 우선순위 규칙) |
| Distributions | `data-generator/src/utils/distribution.ts` | 6가지 통계 분포 함수 |
| Lifecycle | `data-generator/src/utils/lifecycle.ts` | 사용자 라이프사이클 전환 확률 |
| Random Utils | `data-generator/src/utils/random.ts` | 가중치 기반 랜덤 함수 |

### 2.2 5단계 워크플로우

```
Phase 1: Excel Schema Parsing
         ↓
Phase 2: AI Analysis (Multi-phase for 15+ events)
         ↓
Phase 3: Cohort Generation (User Segmentation)
         ↓
Phase 4: Event Generation (Session + Events)
         ↓
Phase 5: Metadata Saving & Validation
```

**Phase 1 - Excel 스키마 파싱:**
- 이벤트 정의 (이름, 한글명, 카테고리)
- 속성 정의 (이름, 한글명, 데이터 타입)
- 퍼널 정의 (다단계 시퀀스)
- 선택: 이벤트 의존성 (Required Previous Events)

**Phase 2 - AI 분석:**
- **단일 단계 분석** (< 15개 이벤트): 한 번에 모든 분석 수행
- **다단계 분석** (≥ 15개 이벤트):
  - Stage 1: 사용자 세그먼트 & 이벤트 구조 분석
  - Stage 2: 이벤트 그룹화 & 카테고리화
  - Stage 3: 속성 범위 정의
  - Stage 4-5: 리텐션 곡선 & 이벤트 시퀀싱

**Phase 3 - 코호트 생성:**
- DAU 할당: 70% 초기 사용자 + 30% 신규 사용자 (매일 추가)
- 세그먼트별 라이프사이클 상태 초기화

**Phase 4 - 이벤트 생성:**
- 날짜별 사용자 활동 시뮬레이션
- 세그먼트별 세션 생성 (피크 타임, 간격 고려)
- 세션별 이벤트 생성 (의존성, 트랜잭션 강제)

**Phase 5 - 메타데이터 저장 & 검증:**
- AI 분석 결과 JSON 저장
- 생성된 데이터 통계 메타데이터 저장

---

## 3. 현실성 구현 메커니즘

### 3.1 AI 기반 도메인 분석

**목적:** 산업별 특성을 반영한 데이터 생성 가이드라인 자동 생성

**입력 파라미터** (`data-generator/src/ai/client.ts` - `UserInput` 타입):

```typescript
{
  scenario: string,       // 예: "모바일 게임 RPG"
  dau: number,           // 예: 10,000
  industry: string,      // 예: "game"
  notes: string,         // 예: "과금 비중 높음, 가챠 시스템"
  dateRange: {
    start: "2024-01-01",
    end: "2024-01-31"
  }
}
```

**AI 분석 결과** (`AIAnalysisResult` 타입):

```typescript
{
  userSegments: [
    {
      name: "Whale",              // 고래 (VIP)
      ratio: 0.05,                // 5% 비율
      characteristics: "높은 과금, 일 5회 이상 접속"
    },
    {
      name: "Active",
      ratio: 0.40,
      characteristics: "정기 접속, 중간 과금"
    },
    {
      name: "Casual",
      ratio: 0.55,
      characteristics: "가끔 접속, 낮은 과금"
    }
  ],

  sessionPatterns: {
    Whale: {
      avgSessionsPerDay: 5.5,      // 하루 평균 세션 수
      avgSessionDuration: 1800000,  // 30분 (밀리초)
      avgEventsPerSession: 35       // 세션당 이벤트 수
    },
    Active: {
      avgSessionsPerDay: 2.5,
      avgSessionDuration: 900000,   // 15분
      avgEventsPerSession: 20
    }
    // ...
  },

  eventDependencies: {
    "gacha_pull": ["currency_earned"],          // 가챠는 재화 획득 후
    "purchase_complete": ["add_to_cart"]        // 구매는 장바구니 후
  },

  eventRanges: [
    {
      event_name: "item_purchase",
      properties: [
        {
          name: "item_price",
          type: "number",
          min: 100,
          max: 50000,
          distribution: "lognormal",             // 로그정규분포
          categorical_values: null
        },
        {
          name: "item_category",
          type: "string",
          categorical_values: ["weapon", "armor", "consumable", "cosmetic"],
          min: null,
          max: null
        }
      ]
    }
  ],

  retentionCurve: {
    dayZeroRetention: 1.0,
    day1Retention: 0.45,        // 게임 산업 평균: 40-50%
    day7Retention: 0.20,        // 7일 리텐션: 15-25%
    day30Retention: 0.08,       // 30일 리텐션: 5-10%
    retentionDecay: 0.94,       // 지수 감쇠율
    segmentMultipliers: {
      Whale: 2.0,               // 고래는 2배 리텐션
      Active: 1.3,
      Casual: 0.7
    },
    weekendBoost: 1.25          // 주말 활동 25% 증가
  },

  eventSequencing: {
    strictDependencies: {
      "level_up": ["experience_gained"],
      "boss_defeated": ["boss_battle_started"]
    },
    transactions: [
      {
        name: "purchase_flow",
        startEvents: ["add_to_cart"],
        innerEvents: ["apply_discount", "payment_processing"],
        endEvents: ["purchase_complete"],
        allowInnerAfterEnd: false   // 종료 후 내부 이벤트 불가
      }
    ]
  }
}
```

**AI 프롬프트 예시** (`data-generator/src/ai/prompts.ts`):

```typescript
// Stage 1: 사용자 세그먼트 분석
`당신은 ${industry} 산업의 데이터 분석 전문가입니다.
다음 서비스에 대해 현실적인 사용자 세그먼트를 정의해주세요:

서비스 설명: ${scenario}
DAU: ${dau}명
산업: ${industry}
특이사항: ${notes}

각 세그먼트에 대해 다음을 정의해주세요:
1. 세그먼트 이름 (예: VIP, Active, New)
2. 전체 사용자 대비 비율
3. 행동 특성 (접속 빈도, 세션 길이, 이벤트 발생 수)
4. 리텐션 특성 (이탈률, 재방문율)`

// Stage 3: 속성 범위 정의
`다음 이벤트의 속성값 범위를 ${industry} 산업 기준으로 정의해주세요:

이벤트: ${eventName}
속성 목록: ${properties.join(', ')}

각 속성에 대해:
- 숫자형: min, max, 적합한 분포 (normal, lognormal, exponential, poisson)
- 문자형: 가능한 카테고리 값 리스트
- 불린형: true 확률`
```

**파일 위치:** `data-generator/src/ai/client.ts:45-280` (analyzeSchema 메서드)

---

### 3.2 사용자 라이프사이클 관리

**목적:** 사용자가 시간에 따라 변화하는 행동 패턴 시뮬레이션

**라이프사이클 상태** (`data-generator/src/utils/lifecycle.ts:5-15`):

```typescript
enum LifecycleStage {
  NEW = 'new',           // 신규 사용자 (첫 1-3일)
  ACTIVE = 'active',     // 활성 사용자 (정기 접속)
  RETURNING = 'returning', // 복귀 사용자 (휴면 후 복귀)
  DORMANT = 'dormant',   // 휴면 사용자 (7일+ 미접속)
  CHURNED = 'churned'    // 이탈 사용자 (30일+ 미접속)
}
```

**전환 확률 매트릭스** (`data-generator/src/utils/lifecycle.ts:45-85`):

```typescript
const LIFECYCLE_TRANSITIONS = {
  new: {
    active: 0.70,        // 70% 활성화
    churned: 0.30        // 30% 즉시 이탈
  },
  active: {
    active: 0.85,        // 85% 유지
    returning: 0.10,     // 10% 일시 이탈
    dormant: 0.05        // 5% 휴면
  },
  returning: {
    active: 0.60,        // 60% 재활성화
    dormant: 0.30,       // 30% 휴면
    churned: 0.10        // 10% 완전 이탈
  },
  dormant: {
    returning: 0.20,     // 20% 복귀 시도
    dormant: 0.20,       // 20% 휴면 유지
    churned: 0.60        // 60% 이탈
  },
  churned: {
    returning: 0.05,     // 5% 복귀 (매우 낮음)
    churned: 0.95        // 95% 이탈 유지
  }
}
```

**시간 기반 자동 전환** (`data-generator/src/generators/cohort-generator.ts:185-210`):

```typescript
// 7일 이상 미접속 → dormant
if (daysSinceLastActive >= 7 && currentStage !== 'dormant') {
  newStage = 'dormant';
}

// 30일 이상 미접속 → churned
if (daysSinceLastActive >= 30) {
  newStage = 'churned';
}
```

**활동 확률 적용** (`data-generator/src/generators/cohort-generator.ts:245-280`):

```typescript
// 리텐션 곡선에서 해당 날짜의 기본 리텐션 가져오기
const baseRetention = getRetentionForDay(dayNumber, retentionCurve);

// 세그먼트 배율 적용 (VIP: 2.0x, Active: 1.3x, Casual: 0.7x)
const segmentMultiplier = retentionCurve.segmentMultipliers?.[user.segment] ?? 1.0;

// 라이프사이클 확률 적용
const lifecycleProbability = retentionCurve.lifecycleProbabilities?.[user.lifecycle_stage] ?? 0.5;

// 최종 활동 확률 = 기본 리텐션 × 세그먼트 배율 × 라이프사이클 확률
const activityProbability = baseRetention * segmentMultiplier * lifecycleProbability;

// 확률 체크
if (Math.random() < activityProbability) {
  activeUsers.push(user);
}
```

**파일 위치:**
- `data-generator/src/utils/lifecycle.ts` (전체)
- `data-generator/src/generators/cohort-generator.ts:170-310`

---

### 3.3 Faker.js 기반 90단계 우선순위 규칙

**목적:** AI 분석 결과가 없거나 범위가 모호한 경우, 규칙 기반으로 현실적인 속성값 생성

**규칙 우선순위 구조** (`data-generator/src/generators/faker-utils.ts:130-680`):

```typescript
// Priority 90 - ID/Boolean (최우선)
if (propName.endsWith('_id') || propName === 'id') {
  return faker.string.uuid();
}
if (propName.startsWith('is_') || propName.startsWith('has_')) {
  return faker.datatype.boolean();
}

// Priority 80 - 개인정보
if (propName === 'name' || propName === 'user_name') {
  return faker.person.fullName();
}
if (propName === 'email') {
  return faker.internet.email();
}
if (propName === 'phone' || propName === 'phone_number') {
  return faker.phone.number('+82-10-####-####');
}

// Priority 70 - 날짜/시간
if (propName.includes('_date') || propName.includes('_at') || propName === 'timestamp') {
  return faker.date.recent({ days: 30 }).toISOString();
}
if (propName === 'duration') {
  return randomInt(10, 600);  // 10초 ~ 10분
}

// Priority 60 - 산업별 가격 (게임)
if (industry === 'game') {
  if (propName.includes('item_price')) {
    return randomInt(100, 5000);       // 100 ~ 5,000원
  }
  if (propName.includes('currency') || propName.includes('gold')) {
    return randomInt(1000, 50000);     // 1,000 ~ 50,000 골드
  }
  if (propName.includes('gacha')) {
    return randomInt(500, 10000);      // 500 ~ 10,000원
  }
}

// Priority 60 - 산업별 가격 (커머스)
if (industry === 'commerce' || industry === 'ecommerce') {
  if (propName.includes('product_price') || propName.includes('amount')) {
    return randomInt(5000, 200000);    // 5,000 ~ 200,000원
  }
  if (propName.includes('shipping')) {
    return randomInt(0, 5000);         // 무료 ~ 5,000원
  }
  if (propName.includes('discount')) {
    return randomInt(1000, 50000);     // 1,000 ~ 50,000원 할인
  }
}

// Priority 60 - 산업별 가격 (금융)
if (industry === 'finance') {
  if (propName.includes('transfer') || propName.includes('transaction')) {
    return randomInt(10000, 10000000); // 1만 ~ 1천만원
  }
  if (propName.includes('investment')) {
    return randomInt(100000, 100000000); // 10만 ~ 1억원
  }
  if (propName.includes('fee')) {
    return randomInt(0, 10000);        // 무료 ~ 1만원
  }
}

// Priority 50 - 게임 속성
if (propName === 'level') {
  return randomInt(1, 100);
}
if (propName === 'score') {
  return randomInt(0, 99999);
}
if (propName === 'rank' || propName === 'ranking') {
  return randomInt(1, 1000);
}
if (propName === 'tier') {
  return randomChoice(['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master']);
}
if (propName === 'character' || propName === 'character_class') {
  return randomChoice(['Warrior', 'Mage', 'Archer', 'Assassin', 'Healer', 'Paladin']);
}

// Priority 40 - 커머스 속성
if (propName === 'quantity') {
  return randomInt(1, 10);
}
if (propName === 'discount_rate') {
  return randomInt(5, 50);             // 5% ~ 50%
}
if (propName === 'category' || propName === 'product_category') {
  return randomChoice(['Electronics', 'Fashion', 'Food', 'Sports', 'Books', 'Games']);
}
if (propName === 'product' || propName === 'product_name') {
  return faker.commerce.productName();
}

// ... 30, 20, 10, 5 우선순위 규칙 계속 ...
```

**규칙 우선순위 레벨:**

| 우선순위 | 카테고리 | 예시 |
|---------|---------|------|
| 90 | ID/Boolean | `user_id`, `is_premium`, `has_coupon` |
| 80 | 개인정보 | `name`, `email`, `phone`, `address` |
| 70 | 날짜/시간 | `created_at`, `updated_at`, `duration` |
| 60 | 산업별 가격 | `item_price` (게임), `product_price` (커머스), `transaction_amount` (금융) |
| 50 | 게임 속성 | `level`, `score`, `tier`, `character` |
| 40 | 커머스 속성 | `quantity`, `discount_rate`, `category` |
| 30 | 분석 속성 | `session_id`, `screen_name`, `source` |
| 20 | 상태/타입 | `status`, `type`, `method` |
| 10 | B2B 속성 | `company`, `industry`, `employee_count` |
| 5 | 기타 | 기본값 (숫자: 0-1000, 문자: Lorem Ipsum) |

**파일 위치:** `data-generator/src/generators/faker-utils.ts:130-680`

---

### 3.4 통계 분포 함수

**목적:** 단순 균등 분포가 아닌 실제 데이터 패턴을 모방한 통계 분포 사용

**6가지 분포 함수** (`data-generator/src/utils/distribution.ts`):

#### 1. 정규 분포 (Normal Distribution)
```typescript
normalDistribution(mean: number, stdDev: number): number

// 사용 예: 사용자 세션 시간 (평균 15분, 표준편차 5분)
const sessionDuration = normalDistribution(900000, 300000); // 밀리초

// Box-Muller 변환 사용
// 대부분의 값이 평균 근처에 집중, 극단값 드물게 발생
```

**활용 사례:**
- 세션 지속 시간
- 사용자 활동 횟수
- 점수/레벨 분포

#### 2. 지수 분포 (Exponential Distribution)
```typescript
exponentialDistribution(rate: number): number

// 사용 예: 이벤트 발생 간격 (평균 30초)
const timeUntilNextEvent = exponentialDistribution(1 / 30) * 1000;

// Memoryless property: 다음 이벤트 발생이 과거와 독립적
```

**활용 사례:**
- 이벤트 간 시간 간격
- 세션 간 대기 시간
- 서버 요청 간격

#### 3. 포아송 분포 (Poisson Distribution)
```typescript
poissonDistribution(lambda: number): number

// 사용 예: 하루 세션 수 (평균 3회)
const sessionsToday = poissonDistribution(3);

// 고정 시간 내 발생하는 이벤트 횟수 모델링
```

**활용 사례:**
- 하루 세션 수
- 시간당 구매 횟수
- 페이지 조회 수

#### 4. 로그 정규 분포 (Log-Normal Distribution)
```typescript
logNormalDistribution(mean: number, stdDev: number): number

// 사용 예: 상품 가격 (대부분 저가, 소수 고가)
const productPrice = logNormalDistribution(Math.log(10000), 1.5);

// 양수 값만 가능, 오른쪽 꼬리가 긴 분포
```

**활용 사례:**
- 상품 가격
- 매출액
- 사용자 생애 가치 (LTV)
- 게임 아이템 가격

#### 5. 베타 분포 (Beta Distribution)
```typescript
betaDistribution(alpha: number, beta: number): number

// 사용 예: 전환율 (성공률 30%)
const conversionRate = betaDistribution(3, 7); // 0~1 사이 값

// [0, 1] 구간의 확률 모델링
```

**활용 사례:**
- 전환율
- 클릭율 (CTR)
- 리텐션율

#### 6. 파레토 분포 (Pareto Distribution)
```typescript
paretoDistribution(scale: number, shape: number): number

// 사용 예: 매출 분포 (80-20 법칙)
const revenue = paretoDistribution(1000, 1.5);

// 소수의 사용자가 대부분의 매출 생성
```

**활용 사례:**
- 사용자별 매출 (고래 vs 일반 유저)
- 콘텐츠 인기도
- 소득 분포

**파일 위치:** `data-generator/src/utils/distribution.ts` (전체)

---

### 3.5 이벤트 의존성 및 트랜잭션 관리

**목적:** 비즈니스 로직에 맞는 이벤트 순서 강제 및 트랜잭션 원자성 보장

#### A. 의존성 그래프 관리

**DependencyManager** (`data-generator/src/generators/dependency-manager.ts:20-180`):

```typescript
class DependencyManager {
  private dependencies: Map<string, Set<string>>;  // 이벤트 → 필수 선행 이벤트
  private executionCount: Map<string, number>;     // 이벤트별 실행 횟수

  // 의존성 등록
  addDependency(eventName: string, requiredEvents: string[]) {
    this.dependencies.set(eventName, new Set(requiredEvents));
  }

  // 실행 가능 여부 체크
  canExecute(
    eventName: string,
    executedEvents: Set<string>,
    sessionContext: SessionContext
  ): boolean {
    // 1. 기본 의존성 체크
    const required = this.dependencies.get(eventName);
    if (required) {
      for (const req of required) {
        if (!executedEvents.has(req)) {
          return false;  // 선행 이벤트 미실행
        }
      }
    }

    // 2. 실행 제약 조건 체크
    const constraints = this.executionConstraints.get(eventName);
    if (constraints) {
      // maxOccurrencesPerSession
      if (constraints.maxOccurrencesPerSession) {
        const count = sessionContext.eventCounts.get(eventName) ?? 0;
        if (count >= constraints.maxOccurrencesPerSession) {
          return false;
        }
      }

      // requiresFirstSession (첫 세션만 허용)
      if (constraints.requiresFirstSession && sessionContext.sessionNumber !== 1) {
        return false;
      }

      // minimumSessionNumber (최소 세션 번호)
      if (constraints.minimumSessionNumber &&
          sessionContext.sessionNumber < constraints.minimumSessionNumber) {
        return false;
      }

      // blockedAfterEvents (특정 이벤트 후 차단)
      if (constraints.blockedAfterEvents) {
        for (const blockEvent of constraints.blockedAfterEvents) {
          if (executedEvents.has(blockEvent)) {
            return false;
          }
        }
      }
    }

    // 3. 트랜잭션 제약 조건 체크
    if (this.isInTransaction(eventName)) {
      return this.canExecuteInTransaction(eventName, executedEvents);
    }

    return true;
  }
}
```

**실행 제약 조건 예시** (`data-generator/src/generators/dependency-manager.ts:45-90`):

```typescript
// 튜토리얼: 첫 세션에만 1회
addExecutionConstraint('tutorial_start', {
  maxOccurrencesPerSession: 1,
  maxOccurrencesPerUser: 1,
  requiresFirstSession: true
});

// 레벨업: 세션당 최대 5회
addExecutionConstraint('level_up', {
  maxOccurrencesPerSession: 5
});

// 구매 완료 후 환불 불가
addExecutionConstraint('request_refund', {
  blockedAfterEvents: ['purchase_complete']
});

// 3번째 세션부터만 프리미엄 기능
addExecutionConstraint('premium_feature_unlock', {
  minimumSessionNumber: 3
});
```

#### B. 트랜잭션 기반 시퀀싱

**Transaction 정의** (`data-generator/src/types/event.ts:115-135`):

```typescript
interface Transaction {
  name: string;                  // 트랜잭션 이름
  startEvents: string[];         // 시작 이벤트 (예: add_to_cart)
  innerEvents: string[];         // 중간 이벤트 (예: payment_processing)
  endEvents: string[];           // 종료 이벤트 (예: purchase_complete)
  allowInnerAfterEnd: boolean;   // 종료 후 중간 이벤트 허용 여부
}
```

**트랜잭션 실행 로직** (`data-generator/src/generators/dependency-manager.ts:190-280`):

```typescript
generateTransactionSequence(transaction: Transaction): Event[] {
  const events: Event[] = [];

  // 1. Start Event (필수)
  const startEvent = randomChoice(transaction.startEvents);
  events.push(createEvent(startEvent, currentTimestamp));
  currentTimestamp += randomInt(1000, 5000);  // 1-5초 후

  // 2. Inner Events (확률적 포함)
  for (const innerEvent of transaction.innerEvents) {
    if (probabilityCheck(0.7)) {  // 70% 확률로 포함
      events.push(createEvent(innerEvent, currentTimestamp));
      currentTimestamp += randomInt(500, 3000);  // 0.5-3초 후
    }
  }

  // 3. End Event (필수)
  const endEvent = randomChoice(transaction.endEvents);
  events.push(createEvent(endEvent, currentTimestamp));

  // 4. allowInnerAfterEnd가 false면 inner events 차단
  if (!transaction.allowInnerAfterEnd) {
    for (const innerEvent of transaction.innerEvents) {
      this.addExecutionConstraint(innerEvent, {
        blockedAfterEvents: transaction.endEvents
      });
    }
  }

  return events;
}
```

**트랜잭션 예시**:

```typescript
// 구매 플로우
{
  name: "purchase_flow",
  startEvents: ["add_to_cart"],
  innerEvents: ["apply_coupon", "payment_processing", "inventory_check"],
  endEvents: ["purchase_complete", "purchase_failed"],
  allowInnerAfterEnd: false
}

// 결과: add_to_cart → apply_coupon (70%) → payment_processing (70%) → purchase_complete
// purchase_complete 후에는 apply_coupon, payment_processing 실행 불가

// 게임 전투 플로우
{
  name: "combat_flow",
  startEvents: ["battle_start"],
  innerEvents: ["use_skill", "take_damage", "use_item"],
  endEvents: ["battle_victory", "battle_defeat"],
  allowInnerAfterEnd: false
}
```

**파일 위치:** `data-generator/src/generators/dependency-manager.ts` (전체)

---

### 3.6 시간적 현실성 (Temporal Realism)

**목적:** 사용자 행동의 시간적 패턴 반영 (피크 타임, 세션 간격, 이벤트 간격)

#### A. 산업별 피크 타임

**피크 타임 정의** (`data-generator/src/data-generator.ts:569-620`):

```typescript
function getPeakHours(industry: string, segment: string): [number, number] {
  // 게임: 저녁-밤 (19:00-23:00)
  if (industry === 'game') {
    return [19, 23];
  }

  // 금융: 출퇴근+점심+저녁 (복합 패턴)
  // 09:00-10:00, 12:00-13:00, 20:00-22:00
  if (industry === 'finance') {
    const currentHour = new Date().getHours();
    if (currentHour >= 9 && currentHour < 10) return [9, 10];
    if (currentHour >= 12 && currentHour < 13) return [12, 13];
    return [20, 22];
  }

  // 커머스: 점심+저녁 (12:00-14:00, 20:00-22:00)
  if (industry === 'commerce' || industry === 'ecommerce') {
    const currentHour = new Date().getHours();
    if (currentHour >= 12 && currentHour < 14) return [12, 14];
    return [20, 22];
  }

  // VIP/Whale: 낮-저녁 (10:00-22:00) - 더 넓은 활동 시간
  if (segment === 'VIP' || segment === 'Whale') {
    return [10, 22];
  }

  // 기본값: 저녁 (18:00-22:00)
  return [18, 22];
}
```

#### B. 세션 스케줄링

**세션 생성 로직** (`data-generator/src/data-generator.ts:640-720`):

```typescript
function generateSessionSchedule(
  user: User,
  date: Date,
  sessionPatterns: SessionPatterns,
  industry: string
): Session[] {
  const sessions: Session[] = [];

  // 1. 세그먼트별 평균 세션 수 가져오기
  const avgSessions = sessionPatterns[user.segment]?.avgSessionsPerDay ?? 2;

  // 2. 변동성 적용 (±20%)
  const targetSessions = Math.round(avgSessions * (0.8 + Math.random() * 0.4));

  // 3. 피크 타임 계산
  const [peakStart, peakEnd] = getPeakHours(industry, user.segment);

  // 4. 세션 간격 계산 (세그먼트별)
  let avgInterval: number;
  if (user.segment === 'VIP' || user.segment === 'Whale') {
    avgInterval = randomInt(2, 5) * 3600000;      // 2-5시간
  } else if (user.segment === 'Active' || user.segment === 'Engaged') {
    avgInterval = randomInt(4, 8) * 3600000;      // 4-8시간
  } else {
    avgInterval = randomInt(6, 12) * 3600000;     // 6-12시간
  }

  // 5. 세션 시작 시간 생성
  let currentTime = date.getTime();
  const endOfDay = new Date(date).setHours(23, 59, 59, 999);

  for (let i = 0; i < targetSessions; i++) {
    // 피크 타임 확률 부스트 (70%)
    let sessionHour: number;
    if (probabilityCheck(0.7)) {
      sessionHour = randomInt(peakStart, peakEnd);
    } else {
      sessionHour = randomInt(0, 23);
    }

    // 세션 시작 시간 설정
    const sessionStart = new Date(date);
    sessionStart.setHours(sessionHour, randomInt(0, 59), randomInt(0, 59));

    // 세션 지속 시간 (정규 분포)
    const avgDuration = sessionPatterns[user.segment]?.avgSessionDuration ?? 600000;
    const duration = Math.max(
      60000,  // 최소 1분
      normalDistribution(avgDuration, avgDuration * 0.3)
    );

    sessions.push({
      start: sessionStart,
      end: new Date(sessionStart.getTime() + duration),
      number: user.totalSessions + i + 1
    });

    // 다음 세션까지 대기 (지수 분포)
    currentTime = sessionStart.getTime() + duration +
                  exponentialDistribution(1 / avgInterval) * 1000;

    if (currentTime > endOfDay) break;
  }

  return sessions;
}
```

#### C. 이벤트 타임스탬프 생성

**이벤트 간 간격** (`data-generator/src/generators/event-generator.ts:280-320`):

```typescript
function generateEventTimestamps(
  session: Session,
  eventCount: number
): number[] {
  const timestamps: number[] = [];
  const sessionDuration = session.end.getTime() - session.start.getTime();

  let currentTime = session.start.getTime();

  for (let i = 0; i < eventCount; i++) {
    // 이벤트 간 간격: 지수 분포 (평균 10-30초)
    const avgInterval = sessionDuration / eventCount;
    const interval = exponentialDistribution(1 / avgInterval) * 1000;

    currentTime += Math.min(interval, sessionDuration / eventCount * 2);

    // 세션 종료 시간 초과 방지
    if (currentTime > session.end.getTime()) {
      currentTime = session.end.getTime() - randomInt(1000, 5000);
    }

    timestamps.push(currentTime);
  }

  return timestamps.sort((a, b) => a - b);  // 시간순 정렬
}
```

**파일 위치:**
- `data-generator/src/data-generator.ts:569-720`
- `data-generator/src/generators/event-generator.ts:280-320`

---

### 3.7 마케팅 어트리뷰션 및 광고 수익

**목적:** 설치부터 광고 수익까지 전체 마케팅 퍼널 데이터 생성

**MarketingDataGenerator** (`data-generator/src/generators/marketing-generator.ts`):

#### A. 미디어 소스 분포

```typescript
const MEDIA_SOURCE_WEIGHTS = {
  'google': 0.35,               // 35% (Google Ads, UAC)
  'facebook': 0.25,             // 25% (Facebook, Instagram)
  'apple_search_ads': 0.15,     // 15% (ASA)
  'tiktok': 0.10,               // 10% (TikTok Ads)
  'unity_ads': 0.05,            // 5% (Unity Ads)
  'ironsource': 0.05,           // 5% (ironSource)
  'organic': 0.05               // 5% (자연 유입)
};

function generateMediaSource(): string {
  return weightedRandom(
    Object.keys(MEDIA_SOURCE_WEIGHTS),
    Object.values(MEDIA_SOURCE_WEIGHTS)
  );
}
```

#### B. 어트리뷰션 데이터 생성

```typescript
function generateAttributionData(mediaSource: string) {
  // 1. Network Name 매핑
  const networkNameMap = {
    'google': 'Google Ads',
    'facebook': 'Facebook Ads',
    'apple_search_ads': 'Apple Search Ads',
    'tiktok': 'TikTok Ads',
    'unity_ads': 'Unity Ads Network',
    'ironsource': 'ironSource Network',
    'organic': 'Organic'
  };

  // 2. Campaign Name 생성
  const campaigns = [
    'launch_campaign_2024',
    'retention_campaign_winter',
    'cpi_optimization_q1',
    'remarketing_lapsed_users',
    'holiday_special_promo'
  ];

  // 3. Agency 할당 (한국 주요 대행사)
  const agencies = [
    'Adways',
    'DMC Media',
    'Nasmedia',
    'Cheil Worldwide',
    'Innocean Worldwide',
    'In-house'  // 자체 운영
  ];

  // 4. Creative Type
  const creativeTypes = [
    'video_30s',
    'playable_ad',
    'static_image',
    'carousel',
    'html5_banner'
  ];

  // 5. Placement (매체별)
  let placement: string;
  if (mediaSource === 'google') {
    placement = randomChoice(['youtube_instream', 'google_search', 'gdn_banner']);
  } else if (mediaSource === 'facebook') {
    placement = randomChoice(['facebook_feed', 'instagram_story', 'audience_network']);
  } else if (mediaSource === 'tiktok') {
    placement = randomChoice(['tiktok_feed', 'tiktok_pangle']);
  } else {
    placement = 'default_placement';
  }

  return {
    media_source: mediaSource,
    network_name: networkNameMap[mediaSource],
    campaign: randomChoice(campaigns),
    agency: randomChoice(agencies),
    creative_type: randomChoice(creativeTypes),
    placement: placement,
    install_time: new Date().toISOString()
  };
}
```

#### C. 광고 수익 이벤트

```typescript
function generateAdRevenueEvent(session: Session): Event | null {
  // 30% 확률로 광고 수익 발생
  if (!probabilityCheck(0.3)) {
    return null;
  }

  // 1. 광고 네트워크 선택 (가중치 기반)
  const AD_NETWORK_WEIGHTS = {
    'admob': 0.40,           // 40% (Google AdMob)
    'unity_ads': 0.30,       // 30% (Unity Ads)
    'ironsource': 0.20,      // 20% (ironSource)
    'applovin': 0.10         // 10% (AppLovin MAX)
  };
  const network = weightedRandom(
    Object.keys(AD_NETWORK_WEIGHTS),
    Object.values(AD_NETWORK_WEIGHTS)
  );

  // 2. 광고 유닛 타입 선택
  const AD_UNIT_WEIGHTS = {
    'rewarded_video': 0.50,  // 50% (보상형 동영상)
    'interstitial': 0.30,    // 30% (전면 광고)
    'banner': 0.15,          // 15% (배너)
    'native': 0.05           // 5% (네이티브)
  };
  const adUnit = weightedRandom(
    Object.keys(AD_UNIT_WEIGHTS),
    Object.values(AD_UNIT_WEIGHTS)
  );

  // 3. 광고 수익 계산 (네트워크 및 유닛별)
  let revenue: number;
  if (adUnit === 'rewarded_video') {
    revenue = randomFloat(0.10, 0.50);  // $0.10 ~ $0.50
  } else if (adUnit === 'interstitial') {
    revenue = randomFloat(0.05, 0.20);  // $0.05 ~ $0.20
  } else if (adUnit === 'banner') {
    revenue = randomFloat(0.01, 0.05);  // $0.01 ~ $0.05
  } else {  // native
    revenue = randomFloat(0.03, 0.15);  // $0.03 ~ $0.15
  }

  // 4. 네트워크별 수익 배율
  const networkMultiplier = {
    'admob': 1.0,
    'unity_ads': 0.9,
    'ironsource': 0.95,
    'applovin': 1.05
  };
  revenue *= networkMultiplier[network];

  return {
    event_name: 'adjust_ad_revenue',
    timestamp: session.start.getTime() + randomInt(60000, session.duration * 0.8),
    properties: {
      ad_network: network,
      ad_unit: adUnit,
      ad_revenue_usd: revenue.toFixed(4),
      ad_revenue_krw: Math.round(revenue * 1300),  // USD → KRW 환율
      ad_placement: `${adUnit}_${randomInt(1, 5)}`,
      ad_impression_id: faker.string.uuid()
    }
  };
}
```

**파일 위치:** `data-generator/src/generators/marketing-generator.ts` (전체)

---

### 3.8 국가 및 디바이스 로컬라이제이션

**목적:** 지역별 IP, 통신사, 디바이스 분포를 반영한 현실적인 메타데이터 생성

#### A. 국가별 IP 주소 범위

```typescript
const COUNTRY_IP_RANGES = {
  KR: ['1.226.', '1.228.', '14.63.', '27.117.', '39.7.', '58.120.'],
  US: ['8.8.', '172.16.', '192.168.', '104.18.', '151.101.'],
  JP: ['126.', '153.', '202.', '210.', '219.'],
  CN: ['123.', '110.', '183.', '220.', '221.']
};

function generateIPAddress(country: string): string {
  const prefixes = COUNTRY_IP_RANGES[country] || COUNTRY_IP_RANGES['KR'];
  const prefix = randomChoice(prefixes);
  return `${prefix}${randomInt(0, 255)}.${randomInt(0, 255)}`;
}
```

#### B. 국가별 통신사

```typescript
const CARRIERS = {
  KR: ['SKT', 'KT', 'LG U+'],
  US: ['Verizon', 'AT&T', 'Sprint', 'T-Mobile'],
  JP: ['NTT Docomo', 'KDDI', 'SoftBank'],
  CN: ['China Mobile', 'China Unicom', 'China Telecom']
};

function generateCarrier(country: string): string {
  const carriers = CARRIERS[country] || CARRIERS['KR'];
  return randomChoice(carriers);
}
```

#### C. 디바이스 분포

```typescript
function generateDeviceInfo(): DeviceInfo {
  const isIOS = probabilityCheck(0.5);  // 50% iOS, 50% Android

  if (isIOS) {
    // iOS 디바이스
    const models = [
      'iPhone 15 Pro',
      'iPhone 15',
      'iPhone 14 Pro',
      'iPhone 14',
      'iPhone 13',
      'iPhone 12',
      'iPad Pro'
    ];
    const versions = ['17.0', '16.5', '16.0', '15.7'];
    const resolutions = [
      '1170x2532',  // iPhone 15/14/13 Pro
      '828x1792',   // iPhone 14/13
      '1125x2436'   // iPhone 12
    ];

    return {
      platform: 'iOS',
      device_model: randomChoice(models),
      os_version: randomChoice(versions),
      screen_resolution: randomChoice(resolutions),
      device_manufacturer: 'Apple'
    };
  } else {
    // Android 디바이스
    const models = [
      'Galaxy S24',
      'Galaxy S23',
      'Galaxy S22',
      'Galaxy A54',
      'Pixel 8',
      'Pixel 7',
      'OnePlus 12',
      'Xiaomi 14'
    ];
    const versions = ['14', '13', '12', '11'];
    const resolutions = [
      '1080x2400',  // FHD+
      '1440x3200'   // QHD+
    ];

    const model = randomChoice(models);
    let manufacturer: string;
    if (model.startsWith('Galaxy')) {
      manufacturer = 'Samsung';
    } else if (model.startsWith('Pixel')) {
      manufacturer = 'Google';
    } else if (model.startsWith('OnePlus')) {
      manufacturer = 'OnePlus';
    } else {
      manufacturer = 'Xiaomi';
    }

    return {
      platform: 'Android',
      device_model: model,
      os_version: randomChoice(versions),
      screen_resolution: randomChoice(resolutions),
      device_manufacturer: manufacturer
    };
  }
}
```

#### D. 네트워크 타입

```typescript
const NETWORK_TYPE_WEIGHTS = {
  'WiFi': 0.50,    // 50%
  '5G': 0.25,      // 25%
  '4G': 0.15,      // 15%
  'LTE': 0.10      // 10%
};

function generateNetworkType(): string {
  return weightedRandom(
    Object.keys(NETWORK_TYPE_WEIGHTS),
    Object.values(NETWORK_TYPE_WEIGHTS)
  );
}
```

**파일 위치:** `data-generator/src/generators/faker-utils.ts:30-126`

---

## 4. 데이터 생성 워크플로우

### 4.1 전체 플로우 다이어그램

```
┌─────────────────────────────────────────────────────────────┐
│ Phase 1: Excel Schema Parsing                              │
│ - Parse events, properties, funnels                        │
│ - Extract dependencies                                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 2: AI Analysis                                        │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ If eventCount < 15: Single-phase Analysis              │ │
│ │ If eventCount >= 15: Multi-phase Analysis              │ │
│ │   - Stage 1: User Segments + Event Structure           │ │
│ │   - Stage 2: Event Grouping + Categorization           │ │
│ │   - Stage 3: Property Ranges Definition                │ │
│ │   - Stage 4: Retention Curve Analysis                  │ │
│ │   - Stage 5: Event Sequencing Rules                    │ │
│ └─────────────────────────────────────────────────────────┘ │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 3: Cohort Generation                                 │
│ - Allocate DAU (70% existing + 30% new)                    │
│ - Initialize lifecycle stages                              │
│ - Generate attribution data                                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 4: Event Generation (Per Day Loop)                   │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ For each user:                                         │ │
│ │   1. Check retention probability                       │ │
│ │   2. Update lifecycle stage                            │ │
│ │   3. If active:                                        │ │
│ │      - Generate session schedule (peak hours)          │ │
│ │      - For each session:                               │ │
│ │        • Lifecycle events (first session)              │ │
│ │        • Session start events                          │ │
│ │        • Onboarding events (first session, 70% prob)   │ │
│ │        • Core events (with dependencies)               │ │
│ │        • Transaction sequences (30% prob)              │ │
│ │        • Session end events                            │ │
│ │        • Marketing events (ad revenue)                 │ │
│ └─────────────────────────────────────────────────────────┘ │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 5: Validation & Metadata Saving                      │
│ - Rule-based validation                                     │
│ - AI validation (if rules fail)                            │
│ - Save AI analysis result JSON                             │
│ - Save generation statistics                               │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 단계별 상세 설명

#### Phase 1: Excel Schema Parsing
**파일:** `data-generator/src/api/services/file-analyzer.ts:80-180`

```typescript
async function parseExcelSchema(filePath: string): Promise<ExcelSchema> {
  const workbook = XLSX.readFile(filePath);

  // 1. Event Sheet 파싱
  const eventSheet = workbook.Sheets['Event'];
  const events = XLSX.utils.sheet_to_json(eventSheet);

  // 2. Property Sheet 파싱
  const propertySheet = workbook.Sheets['Property'];
  const properties = XLSX.utils.sheet_to_json(propertySheet);

  // 3. Funnel Sheet 파싱 (선택)
  const funnelSheet = workbook.Sheets['Funnel'];
  const funnels = funnelSheet ? XLSX.utils.sheet_to_json(funnelSheet) : [];

  // 4. 이벤트-속성 매핑 생성
  const eventPropertyMap = new Map();
  for (const prop of properties) {
    if (!eventPropertyMap.has(prop.event_name)) {
      eventPropertyMap.set(prop.event_name, []);
    }
    eventPropertyMap.get(prop.event_name).push(prop);
  }

  return {
    events,
    properties,
    funnels,
    eventPropertyMap
  };
}
```

#### Phase 2: AI Analysis
**파일:** `data-generator/src/ai/client.ts:45-280`

```typescript
async function analyzeSchema(
  schema: ExcelSchema,
  userInput: UserInput
): Promise<AIAnalysisResult> {
  const eventCount = schema.events.length;

  if (eventCount < 15) {
    // 단일 단계 분석
    return await singlePhaseAnalysis(schema, userInput);
  } else {
    // 다단계 분석
    const stage1 = await analyzeUserSegmentsAndStructure(schema, userInput);
    const stage2 = await analyzeEventGrouping(schema, stage1);
    const stage3 = await analyzePropertyRanges(schema, stage2);
    const stage4 = await analyzeRetentionCurve(userInput, stage3);
    const stage5 = await analyzeEventSequencing(schema, stage4);

    return mergeAnalysisResults([stage1, stage2, stage3, stage4, stage5]);
  }
}
```

**각 스테이지의 AI 프롬프트 예시:**

**Stage 1 - User Segments:**
```
당신은 ${industry} 산업의 데이터 분석 전문가입니다.

서비스: ${scenario}
DAU: ${dau}명

3-5개의 사용자 세그먼트를 정의해주세요.
각 세그먼트에 대해:
1. 이름 (예: VIP, Active, Casual)
2. 비율 (합계 100%)
3. 행동 특성
4. 하루 평균 세션 수
5. 세션당 평균 시간 (밀리초)
6. 세션당 평균 이벤트 수

JSON 형식으로 응답해주세요.
```

**Stage 3 - Property Ranges:**
```
다음 이벤트의 속성 범위를 ${industry} 산업 기준으로 정의해주세요:

이벤트: ${eventName}
속성: ${properties.join(', ')}

각 속성에 대해:
- 숫자형: min, max, 분포 타입 (normal, lognormal, exponential, poisson, beta, pareto)
- 문자형: categorical_values (가능한 값 리스트)
- 불린형: true 확률

JSON 형식으로 응답해주세요.
```

#### Phase 3: Cohort Generation
**파일:** `data-generator/src/generators/cohort-generator.ts:20-120`

```typescript
function generateCohorts(
  dau: number,
  dateRange: DateRange,
  segments: UserSegment[]
): User[] {
  const users: User[] = [];
  const startDate = new Date(dateRange.start);
  const endDate = new Date(dateRange.end);
  const dayCount = Math.ceil((endDate - startDate) / 86400000);

  // 1. 초기 사용자 생성 (DAU의 70%)
  const initialUserCount = Math.floor(dau * 0.7);
  for (let i = 0; i < initialUserCount; i++) {
    // 세그먼트 할당 (가중치 기반)
    const segment = weightedRandom(
      segments.map(s => s.name),
      segments.map(s => s.ratio)
    );

    users.push({
      user_id: faker.string.uuid(),
      segment: segment,
      lifecycle_stage: 'new',
      install_date: new Date(startDate - randomInt(0, 30) * 86400000),
      last_active_date: null,
      total_sessions: 0,
      attribution: generateAttributionData()
    });
  }

  // 2. 매일 신규 사용자 추가 (DAU의 30%)
  const newUsersPerDay = Math.floor(dau * 0.3);
  for (let day = 0; day < dayCount; day++) {
    const currentDate = new Date(startDate.getTime() + day * 86400000);

    for (let i = 0; i < newUsersPerDay; i++) {
      const segment = weightedRandom(
        segments.map(s => s.name),
        segments.map(s => s.ratio)
      );

      users.push({
        user_id: faker.string.uuid(),
        segment: segment,
        lifecycle_stage: 'new',
        install_date: currentDate,
        last_active_date: null,
        total_sessions: 0,
        attribution: generateAttributionData()
      });
    }
  }

  return users;
}
```

#### Phase 4: Event Generation
**파일:** `data-generator/src/generators/event-generator.ts:40-450`

```typescript
function generateEventsForUser(
  user: User,
  date: Date,
  aiAnalysis: AIAnalysisResult,
  dependencyManager: DependencyManager
): Event[] {
  const events: Event[] = [];

  // 1. 세션 스케줄 생성
  const sessions = generateSessionSchedule(user, date, aiAnalysis.sessionPatterns);

  for (const session of sessions) {
    const sessionEvents: Event[] = [];
    const executedEvents = new Set<string>();

    // 2. 라이프사이클 이벤트 (첫 세션만)
    if (session.number === 1) {
      // install 이벤트 (세션 시작 5초 전)
      sessionEvents.push(createEvent('install', session.start - 5000));

      // user_set 이벤트 (어트리뷰션 데이터 포함)
      sessionEvents.push(createEvent('user_set', session.start - 2000, {
        ...user.attribution
      }));
    }

    // 3. 세션 시작 이벤트
    sessionEvents.push(createEvent('app_start', session.start));
    sessionEvents.push(createEvent('session_start', session.start + 1000));
    executedEvents.add('app_start');
    executedEvents.add('session_start');

    // 4. 온보딩 이벤트 (첫 세션, 70% 확률)
    if (session.number === 1 && probabilityCheck(0.7)) {
      const onboardingEvents = aiAnalysis.events.filter(e =>
        e.category === 'onboarding' || e.name.includes('tutorial')
      );

      for (const evt of onboardingEvents) {
        if (dependencyManager.canExecute(evt.name, executedEvents, session)) {
          sessionEvents.push(createEvent(evt.name, currentTimestamp));
          executedEvents.add(evt.name);
          currentTimestamp += randomInt(2000, 10000);
        }
      }
    }

    // 5. 코어 이벤트 생성
    const targetEventCount = Math.round(
      aiAnalysis.sessionPatterns[user.segment].avgEventsPerSession *
      (0.8 + Math.random() * 0.4)
    );

    let currentTimestamp = session.start + 10000;
    const coreEvents = aiAnalysis.events.filter(e =>
      e.category !== 'onboarding' && e.category !== 'session'
    );

    for (let i = 0; i < targetEventCount; i++) {
      const evt = randomChoice(coreEvents);

      if (dependencyManager.canExecute(evt.name, executedEvents, session)) {
        // AI 범위 또는 Faker 규칙으로 속성값 생성
        const properties = generateProperties(evt, aiAnalysis);

        sessionEvents.push(createEvent(evt.name, currentTimestamp, properties));
        executedEvents.add(evt.name);
        currentTimestamp += exponentialDistribution(1 / 15) * 1000;
      }
    }

    // 6. 트랜잭션 시퀀스 (30% 확률)
    if (probabilityCheck(0.3)) {
      const transactions = aiAnalysis.eventSequencing?.transactions || [];
      for (const txn of transactions) {
        if (dependencyManager.canExecute(txn.startEvents[0], executedEvents, session)) {
          const txnEvents = dependencyManager.generateTransactionSequence(txn);
          sessionEvents.push(...txnEvents);
          txnEvents.forEach(e => executedEvents.add(e.event_name));
        }
      }
    }

    // 7. 세션 종료 이벤트
    sessionEvents.push(createEvent('app_end', session.end - 2000));
    sessionEvents.push(createEvent('session_end', session.end));

    // 8. 마케팅 이벤트 (광고 수익)
    const adRevenueEvent = generateAdRevenueEvent(session);
    if (adRevenueEvent) {
      sessionEvents.push(adRevenueEvent);
    }

    // user_add 이벤트 (세션 통계)
    sessionEvents.push(createEvent('user_add', session.end + 1000, {
      session_count: session.number,
      session_duration_ms: session.end - session.start,
      event_count: sessionEvents.length
    }));

    events.push(...sessionEvents);
  }

  return events;
}
```

#### Phase 5: Validation & Metadata Saving
**파일:** `data-generator/src/ai/validation-pipeline.ts:30-180`

```typescript
async function validateAndSave(
  aiAnalysis: AIAnalysisResult,
  generatedEvents: Event[]
): Promise<void> {
  // 1. 룰 기반 검증 (무료)
  const ruleValidation = runRuleBasedValidation(aiAnalysis);

  if (!ruleValidation.passed) {
    // 2. AI 검증 (룰 실패 시)
    const aiValidation = await runAIValidation(aiAnalysis, ruleValidation.issues);

    if (!aiValidation.passed) {
      // 3. AI 수정 (최대 3회 반복)
      aiAnalysis = await runAIFixer(aiAnalysis, aiValidation.issues);
    }
  }

  // 4. 메타데이터 저장
  await saveMetadata({
    ai_analysis: aiAnalysis,
    statistics: {
      total_events: generatedEvents.length,
      unique_users: new Set(generatedEvents.map(e => e.user_id)).size,
      date_range: {
        start: Math.min(...generatedEvents.map(e => e.timestamp)),
        end: Math.max(...generatedEvents.map(e => e.timestamp))
      },
      event_counts: countEventsByName(generatedEvents),
      segment_distribution: countUsersBySegment(generatedEvents)
    },
    validation_result: ruleValidation.passed ? 'PASSED' : 'FIXED_BY_AI'
  });
}
```

**룰 기반 검증 항목:**
1. 범위 정합성 (min < max)
2. 분포 타당성 (normal, lognormal, exponential, poisson, beta, pareto 중 선택)
3. 리텐션 감쇠 검증 (0.85 ≤ decay ≤ 0.98)
4. 세그먼트 비율 합계 = 1.0
5. 의존성 그래프 순환 참조 검사
6. 세션 패턴 범위 검증

**파일 위치:** `data-generator/src/ai/validation-pipeline.ts` (전체)

---

## 5. 산업별 특화 로직

### 5.1 게임 (Game)

**특화 속성:**

```typescript
// 레벨 및 진행도
level: randomInt(1, 100)
experience: randomInt(0, 999999)
skill_level: randomInt(1, 20)

// 재화
gold: logNormalDistribution(Math.log(10000), 2.0)
gem: randomInt(0, 10000)
currency_earned: randomInt(100, 5000)

// 전투
damage: normalDistribution(1000, 300)
critical_hit: probabilityCheck(0.15)  // 15% 크리티컬
combo_count: randomInt(1, 50)

// 아이템
item_price: logNormalDistribution(Math.log(1000), 1.5)
item_rarity: weightedRandom(
  ['common', 'uncommon', 'rare', 'epic', 'legendary'],
  [0.50, 0.30, 0.15, 0.04, 0.01]
)
gacha_pull_cost: randomChoice([100, 300, 1000, 3000])

// 소셜
guild_rank: randomInt(1, 100)
pvp_rating: normalDistribution(1500, 300)
friend_count: poissonDistribution(10)
```

**게임 산업 이벤트 시퀀스:**

```typescript
// 튜토리얼
tutorial_start → tutorial_stage_1 → tutorial_stage_2 → tutorial_complete

// 전투
battle_start → use_skill (0-5회) → take_damage (0-3회) →
[battle_victory | battle_defeat]

// 가챠
currency_earned → gacha_pull → [item_obtained | character_obtained]

// 구매
view_shop → select_item → payment_confirm → purchase_complete
```

**피크 타임:** 19:00-23:00 (저녁-밤)

**세그먼트 특성:**
- Whale (고래): 높은 과금, 일 5회+ 접속, 세션 30분+
- Active: 중간 과금, 일 2-3회 접속, 세션 15분
- Casual: 낮은 과금, 일 1회 접속, 세션 10분

**파일 위치:** `data-generator/src/generators/faker-utils.ts:280-380`

---

### 5.2 커머스 (Commerce / E-commerce)

**특화 속성:**

```typescript
// 상품
product_price: logNormalDistribution(Math.log(50000), 1.8)
product_category: randomChoice([
  'Electronics', 'Fashion', 'Food', 'Sports', 'Books', 'Games', 'Beauty'
])
product_name: faker.commerce.productName()
product_id: faker.string.uuid()

// 주문
quantity: randomInt(1, 10)
total_amount: product_price * quantity
shipping_fee: weightedRandom([0, 2500, 3000], [0.3, 0.5, 0.2])
discount_amount: randomInt(0, total_amount * 0.5)

// 결제
payment_method: weightedRandom(
  ['card', 'kakaopay', 'naverpay', 'bank_transfer', 'phone'],
  [0.40, 0.25, 0.20, 0.10, 0.05]
)
installment: weightedRandom([0, 3, 6, 12], [0.60, 0.20, 0.15, 0.05])

// 배송
delivery_type: weightedRandom(
  ['standard', 'express', 'dawn'],
  [0.60, 0.30, 0.10]
)
tracking_number: faker.string.alphanumeric(12)

// 리뷰
rating: weightedRandom([1, 2, 3, 4, 5], [0.05, 0.05, 0.15, 0.35, 0.40])
review_length: randomInt(10, 500)
```

**커머스 산업 이벤트 시퀀스:**

```typescript
// 검색 및 탐색
app_start → view_home → search_product → view_product_list →
view_product_detail

// 구매 플로우
view_product_detail → add_to_cart → [continue_shopping | proceed_to_checkout]
proceed_to_checkout → apply_coupon (30% prob) → select_payment →
payment_processing → [purchase_complete | purchase_failed]

// 배송 추적
purchase_complete → order_confirmed → shipping_started →
shipping_in_transit → delivered

// 리뷰
delivered → (7일 후) → write_review → submit_review
```

**피크 타임:**
- 점심: 12:00-14:00
- 저녁: 20:00-22:00

**세그먼트 특성:**
- Premium: 고가 상품, 빠른 배송, 자주 구매
- Active: 중가 상품, 일반 배송, 주 1-2회 구매
- Window Shopper: 탐색 많음, 구매 적음

**파일 위치:** `data-generator/src/generators/faker-utils.ts:380-480`

---

### 5.3 금융 (Finance)

**특화 속성:**

```typescript
// 계좌
account_number: faker.finance.accountNumber()
account_type: randomChoice(['checking', 'savings', 'investment'])
balance: logNormalDistribution(Math.log(1000000), 2.5)

// 거래
transaction_amount: logNormalDistribution(Math.log(100000), 2.0)
transaction_type: weightedRandom(
  ['transfer', 'deposit', 'withdrawal', 'payment'],
  [0.40, 0.25, 0.20, 0.15]
)
fee: randomInt(0, 10000)

// 투자
investment_amount: logNormalDistribution(Math.log(1000000), 2.0)
stock_code: faker.finance.currencyCode()
stock_price: randomFloat(1000, 100000)
shares: randomInt(1, 1000)

// 대출
loan_amount: logNormalDistribution(Math.log(10000000), 1.8)
loan_term: randomChoice([12, 24, 36, 60, 120])  // 개월
interest_rate: randomFloat(2.5, 7.5)  // %

// 보험
premium: randomInt(50000, 500000)
coverage: logNormalDistribution(Math.log(50000000), 1.5)
insurance_type: randomChoice(['life', 'health', 'car', 'property'])
```

**금융 산업 이벤트 시퀀스:**

```typescript
// 송금
app_start → view_account → select_transfer → enter_amount →
verify_otp → transfer_confirm → transfer_complete

// 투자
view_stock_list → view_stock_detail → place_order →
order_confirm → [order_filled | order_cancelled]

// 대출 신청
view_loan_products → select_loan → fill_application →
submit_documents → credit_check → [loan_approved | loan_rejected]
```

**피크 타임:**
- 출퇴근: 09:00-10:00
- 점심: 12:00-13:00
- 저녁: 20:00-22:00

**세그먼트 특성:**
- VIP: 고액 거래, 투자 활발, 전용 상담
- Active: 정기 송금, 적금, 카드 결제
- Basic: 계좌 조회, 소액 송금

**파일 위치:** `data-generator/src/generators/faker-utils.ts:480-580`

---

## 6. 검증 및 품질 보증

### 6.1 2단계 검증 시스템

**ValidationPipeline** (`data-generator/src/ai/validation-pipeline.ts`):

```
┌─────────────────────────────────────────────────────────────┐
│ Tier 1: Rule-Based Validation (FREE)                       │
│ - Fast, deterministic checks                                │
│ - No API costs                                              │
└────────────┬────────────────────────────────────────────────┘
             │
             ├─ PASS → Accept
             │
             └─ FAIL → Tier 2
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ Tier 2: AI Validation (PAID)                               │
│ - Semantic analysis                                         │
│ - Context-aware checks                                      │
│ - Multi-model support                                       │
└────────────┬────────────────────────────────────────────────┘
             │
             ├─ PASS → Accept
             │
             └─ FAIL → AI Fixer (max 3 iterations)
                       │
                       └─ Exponential backoff
```

### 6.2 룰 기반 검증 항목

**파일:** `data-generator/src/ai/validation-pipeline.ts:30-120`

```typescript
function runRuleBasedValidation(analysis: AIAnalysisResult): ValidationResult {
  const issues: string[] = [];

  // 1. 세그먼트 비율 합계 검증
  const totalRatio = analysis.userSegments.reduce((sum, s) => sum + s.ratio, 0);
  if (Math.abs(totalRatio - 1.0) > 0.01) {
    issues.push(`Segment ratio sum is ${totalRatio}, expected 1.0`);
  }

  // 2. 속성 범위 정합성
  for (const eventRange of analysis.eventRanges) {
    for (const prop of eventRange.properties) {
      if (prop.type === 'number' && prop.min !== null && prop.max !== null) {
        if (prop.min >= prop.max) {
          issues.push(`${prop.name}: min (${prop.min}) >= max (${prop.max})`);
        }
        if (prop.min < 0 && !prop.name.includes('delta')) {
          issues.push(`${prop.name}: negative min (${prop.min}) for non-delta property`);
        }
      }
    }
  }

  // 3. 분포 타입 검증
  const validDistributions = ['normal', 'lognormal', 'exponential', 'poisson', 'beta', 'pareto'];
  for (const eventRange of analysis.eventRanges) {
    for (const prop of eventRange.properties) {
      if (prop.distribution && !validDistributions.includes(prop.distribution)) {
        issues.push(`${prop.name}: invalid distribution "${prop.distribution}"`);
      }
    }
  }

  // 4. 리텐션 곡선 검증
  if (analysis.retentionCurve) {
    const rc = analysis.retentionCurve;

    // Day 0 는 항상 1.0
    if (rc.dayZeroRetention !== 1.0) {
      issues.push(`Day 0 retention must be 1.0, got ${rc.dayZeroRetention}`);
    }

    // 감소 추세 검증
    if (rc.day1Retention > rc.dayZeroRetention) {
      issues.push(`Day 1 retention (${rc.day1Retention}) > Day 0 retention`);
    }
    if (rc.day7Retention > rc.day1Retention) {
      issues.push(`Day 7 retention (${rc.day7Retention}) > Day 1 retention`);
    }
    if (rc.day30Retention > rc.day7Retention) {
      issues.push(`Day 30 retention (${rc.day30Retention}) > Day 7 retention`);
    }

    // 감쇠율 범위 (0.85 ~ 0.98)
    if (rc.retentionDecay < 0.85 || rc.retentionDecay > 0.98) {
      issues.push(`Retention decay (${rc.retentionDecay}) out of range [0.85, 0.98]`);
    }
  }

  // 5. 의존성 순환 참조 검사
  const dependencyGraph = buildDependencyGraph(analysis.eventDependencies);
  const cycles = detectCycles(dependencyGraph);
  if (cycles.length > 0) {
    issues.push(`Circular dependencies detected: ${cycles.join(', ')}`);
  }

  // 6. 세션 패턴 범위 검증
  for (const [segment, pattern] of Object.entries(analysis.sessionPatterns)) {
    if (pattern.avgSessionsPerDay < 0 || pattern.avgSessionsPerDay > 20) {
      issues.push(`${segment}: avgSessionsPerDay (${pattern.avgSessionsPerDay}) out of range [0, 20]`);
    }
    if (pattern.avgSessionDuration < 10000 || pattern.avgSessionDuration > 7200000) {
      issues.push(`${segment}: avgSessionDuration out of range [10s, 2h]`);
    }
    if (pattern.avgEventsPerSession < 1 || pattern.avgEventsPerSession > 500) {
      issues.push(`${segment}: avgEventsPerSession out of range [1, 500]`);
    }
  }

  return {
    passed: issues.length === 0,
    issues: issues
  };
}
```

### 6.3 AI 검증 (Semantic Validation)

**파일:** `data-generator/src/ai/validation-pipeline.ts:125-200`

```typescript
async function runAIValidation(
  analysis: AIAnalysisResult,
  ruleIssues: string[]
): Promise<AIValidationResult> {
  const prompt = `
You are a data validation expert. Review this AI analysis result for semantic correctness.

Industry: ${analysis.industry}
Rule-based issues found: ${ruleIssues.join('\n')}

Analysis to validate:
${JSON.stringify(analysis, null, 2)}

Check for:
1. Are user segments realistic for this industry?
2. Do session patterns make sense? (frequency, duration, events)
3. Are property ranges appropriate? (prices, quantities, probabilities)
4. Is the retention curve industry-typical?
5. Do event dependencies represent real workflows?

Respond in JSON:
{
  "passed": boolean,
  "issues": ["issue1", "issue2", ...],
  "suggestions": ["suggestion1", "suggestion2", ...]
}
`;

  const response = await aiClient.chat({
    model: 'claude-haiku-4.5',  // Fast tier
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' }
  });

  return JSON.parse(response.content);
}
```

### 6.4 AI Fixer (자동 수정)

**파일:** `data-generator/src/ai/validation-pipeline.ts:205-280`

```typescript
async function runAIFixer(
  analysis: AIAnalysisResult,
  issues: string[]
): Promise<AIAnalysisResult> {
  const prompt = `
You are a data generation expert. Fix the following issues in the AI analysis result.

Industry: ${analysis.industry}
Issues to fix: ${issues.join('\n')}

Original analysis:
${JSON.stringify(analysis, null, 2)}

Fix the issues while maintaining:
1. Industry realism
2. Internal consistency
3. Statistical validity

Return the COMPLETE fixed analysis in JSON format.
`;

  const response = await aiClient.chat({
    model: 'claude-sonnet-4.5',  // Balanced tier
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' }
  });

  return JSON.parse(response.content);
}
```

**재시도 로직 (Exponential Backoff):**

```typescript
const MAX_RETRIES = 3;
let fixedAnalysis = originalAnalysis;

for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
  const validation = await runRuleBasedValidation(fixedAnalysis);

  if (validation.passed) {
    return fixedAnalysis;
  }

  console.log(`Validation failed (attempt ${attempt + 1}/${MAX_RETRIES})`);
  console.log('Issues:', validation.issues);

  // 지수 백오프 대기
  await sleep(Math.pow(2, attempt) * 1000);

  // AI로 수정 시도
  fixedAnalysis = await runAIFixer(fixedAnalysis, validation.issues);
}

throw new Error('Failed to fix analysis after max retries');
```

**파일 위치:** `data-generator/src/ai/validation-pipeline.ts` (전체)

---

## 7. 기술 스택 및 참조

### 7.1 주요 의존성

| 라이브러리 | 버전 | 용도 |
|-----------|------|------|
| faker.js | ^9.2.0 | 가짜 데이터 생성 (이름, 이메일, 주소 등) |
| OpenAI SDK | ^4.20.0 | GPT-4, GPT-4o, GPT-4o-mini AI 분석 |
| Anthropic SDK | ^0.30.0 | Claude Haiku, Sonnet, Opus AI 분석 |
| Google Generative AI | ^0.21.0 | Gemini Flash, Pro AI 분석 |
| XLSX | ^0.18.5 | Excel 파일 파싱 |
| uuid | ^10.0.0 | UUID 생성 |

### 7.2 핵심 파일 참조

**AI 관련:**
- `data-generator/src/ai/client.ts` - Multi-provider AI 클라이언트
- `data-generator/src/ai/prompts.ts` - AI 프롬프트 템플릿
- `data-generator/src/ai/validation-pipeline.ts` - 2단계 검증

**생성기:**
- `data-generator/src/data-generator.ts` - 메인 오케스트레이터
- `data-generator/src/generators/cohort-generator.ts` - 코호트 생성
- `data-generator/src/generators/event-generator.ts` - 이벤트 생성
- `data-generator/src/generators/dependency-manager.ts` - 의존성 관리
- `data-generator/src/generators/faker-utils.ts` - Faker 규칙
- `data-generator/src/generators/marketing-generator.ts` - 마케팅 데이터

**유틸리티:**
- `data-generator/src/utils/distribution.ts` - 통계 분포
- `data-generator/src/utils/lifecycle.ts` - 라이프사이클 관리
- `data-generator/src/utils/random.ts` - 랜덤 함수

**타입 정의:**
- `data-generator/src/types/event.ts` - 모든 타입 정의

### 7.3 타입 인터페이스 요약

```typescript
// AI 분석 결과
interface AIAnalysisResult {
  userSegments: UserSegment[];
  sessionPatterns: Record<string, SessionPattern>;
  eventDependencies: Record<string, string[]>;
  eventRanges: PropertyRange[];
  retentionCurve: RetentionCurve;
  eventSequencing: EventSequencing;
}

// 사용자 세그먼트
interface UserSegment {
  name: string;
  ratio: number;
  characteristics: string;
}

// 세션 패턴
interface SessionPattern {
  avgSessionsPerDay: number;
  avgSessionDuration: number;  // 밀리초
  avgEventsPerSession: number;
}

// 속성 범위
interface PropertyRange {
  event_name: string;
  properties: PropertyDefinition[];
}

interface PropertyDefinition {
  name: string;
  type: 'number' | 'string' | 'boolean';
  min?: number;
  max?: number;
  distribution?: 'normal' | 'lognormal' | 'exponential' | 'poisson' | 'beta' | 'pareto';
  categorical_values?: string[];
}

// 리텐션 곡선
interface RetentionCurve {
  dayZeroRetention: number;    // 항상 1.0
  day1Retention: number;       // 0.0 ~ 1.0
  day7Retention: number;
  day30Retention: number;
  retentionDecay: number;      // 지수 감쇠율 (0.85 ~ 0.98)
  segmentMultipliers: Record<string, number>;
  weekendBoost: number;        // 주말 활동 증가율 (1.0 ~ 1.5)
  lifecycleProbabilities: Record<LifecycleStage, number>;
}

// 이벤트 시퀀싱
interface EventSequencing {
  strictDependencies: Record<string, string[]>;
  transactions: Transaction[];
}

interface Transaction {
  name: string;
  startEvents: string[];
  innerEvents: string[];
  endEvents: string[];
  allowInnerAfterEnd: boolean;
}

// 사용자
interface User {
  user_id: string;
  segment: string;
  lifecycle_stage: LifecycleStage;
  install_date: Date;
  last_active_date: Date | null;
  total_sessions: number;
  attribution: AttributionData;
}

// 이벤트
interface Event {
  event_name: string;
  timestamp: number;
  user_id: string;
  properties: Record<string, any>;
}
```

**파일 위치:** `data-generator/src/types/event.ts` (전체)

---

## 8. 결론

### 8.1 현실성 달성 요소 요약

본 시스템은 다음 7가지 핵심 메커니즘을 통해 **"현실적인 데이터"**를 생성합니다:

1. **AI 기반 도메인 분석**: 산업별 특성을 자동 분석하여 값 범위, 세그먼트, 리텐션 곡선 생성
2. **사용자 라이프사이클 관리**: 시간에 따라 변화하는 사용자 행동 패턴 시뮬레이션
3. **90단계 Faker 규칙**: AI 분석이 없어도 규칙 기반으로 현실적인 속성값 생성
4. **통계 분포 함수**: 정규, 지수, 포아송, 로그정규, 베타, 파레토 분포 활용
5. **이벤트 의존성 및 트랜잭션**: 비즈니스 로직에 맞는 이벤트 순서 강제
6. **시간적 현실성**: 피크 타임, 세션 간격, 이벤트 간격 반영
7. **마케팅 어트리뷰션**: 설치부터 광고 수익까지 전체 퍼널 데이터 생성

### 8.2 활용 시나리오

**개발자:**
- 테스트 데이터 생성 (E2E 테스트, 성능 테스트)
- 데이터 파이프라인 검증 (ETL, 데이터 웨어하우스)
- 분석 대시보드 개발 (차트, 지표 시각화)

**기획자/PM:**
- 서비스 론칭 전 시뮬레이션 (예상 DAU, 매출)
- A/B 테스트 설계 (세그먼트별 행동 차이)
- 비즈니스 모델 검증 (리텐션, LTV, ARPU)

**데이터 분석가:**
- 분석 쿼리 개발 (코호트 분석, 퍼널 분석)
- 머신러닝 모델 학습 (추천, 예측)
- 데이터 품질 검증 (이상치 탐지)

### 8.3 향후 개선 방향

1. **더 정교한 통계 모델**: 마르코프 체인, 베이지안 추론 도입
2. **실시간 데이터 스트리밍**: Kafka, Kinesis 연동
3. **더 다양한 산업 템플릿**: 헬스케어, 교육, 미디어 등
4. **커스텀 룰 엔진**: 사용자 정의 비즈니스 로직 추가

---

## 부록 A. 용어 사전

| 용어 | 설명 |
|------|------|
| DAU (Daily Active Users) | 일일 활성 사용자 수 |
| Cohort | 특정 기준으로 그룹화된 사용자 집합 (예: 설치 날짜별) |
| Retention | 사용자 재방문율 (Day 1, Day 7, Day 30 리텐션) |
| Lifecycle Stage | 사용자 생애 주기 단계 (new, active, returning, dormant, churned) |
| Attribution | 사용자 유입 경로 추적 (미디어 소스, 캠페인, 크리에이티브) |
| ARPU (Average Revenue Per User) | 사용자당 평균 매출 |
| LTV (Lifetime Value) | 사용자 생애 가치 |
| Transaction | 원자적으로 실행되어야 하는 이벤트 시퀀스 |
| Dependency | 이벤트 실행 전 필요한 선행 이벤트 |
| Segment | 사용자 그룹 (VIP, Active, Casual 등) |
| Peak Hours | 사용자 활동이 집중되는 시간대 |
| Exponential Distribution | 이벤트 간 시간 간격을 모델링하는 확률 분포 |
| Log-Normal Distribution | 가격, 매출 등 양수 값을 모델링하는 확률 분포 |
| Pareto Distribution | 80-20 법칙을 모델링하는 확률 분포 |

---

## 부록 B. 통계 분포 선택 가이드

| 데이터 유형 | 권장 분포 | 이유 |
|-----------|---------|------|
| 세션 시간, 이벤트 수 | Normal | 평균 근처 집중, 양극단 드뭄 |
| 이벤트 간 시간 간격 | Exponential | Memoryless property, 독립 사건 |
| 하루 세션 수 | Poisson | 고정 시간 내 발생 횟수 |
| 상품 가격, 매출 | Log-Normal | 양수 값, 오른쪽 꼬리 |
| 전환율, 클릭율 | Beta | [0, 1] 구간 확률 |
| 사용자별 매출 분포 | Pareto | 80-20 법칙 (고래 vs 일반) |

---

## 부록 C. AI 모델 선택 가이드

| 작업 | Fast Tier | Balanced Tier | Custom |
|------|-----------|---------------|--------|
| 초기 분석 | Haiku 4.5 | Sonnet 4.5 | 사용자 설정 |
| 검증 | Haiku 4.5 | Sonnet 4.5 | - |
| 수정 | Sonnet 4.5 | Opus 4.5 | - |
| 비용 | 낮음 | 중간 | 다양 |
| 속도 | 빠름 | 보통 | 다양 |

---

**문서 버전:** 1.0
**작성일:** 2024-11-30
**작성자:** SYNERGY (AI Vibe Coding Partner)
**관련 파일:** `data-generator/src/**/*.ts`
