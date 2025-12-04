import { ParsedSchema, EventDefinition } from '../types';
import { UserInput } from './client';
import { logger } from '../utils/logger';
import { AnalysisLanguage } from '../utils/language-helper';
import { getPresetContext } from '../config/system-presets';

/**
 * AI 프롬프트 빌더
 * 다단계 분석을 위한 프롬프트 생성
 */

/**
 * 언어별 AI 응답 지시문 생성
 */
function getLanguageInstruction(lang: AnalysisLanguage): string {
  const instructions = {
    ko: '모든 응답을 한국어로 작성해주세요.',
    en: 'Please respond in English.',
    zh: '请用中文回答。',
    ja: '日本語で回答してください。'
  };
  return instructions[lang];
}

/**
 * Phase 1: 전략 분석 + 이벤트 자동 그룹핑 프롬프트
 * 사용자 세그먼트, 세션 패턴, 이벤트 의존성, 이벤트 그룹핑 정의
 */
export function buildStrategyPrompt(schema: ParsedSchema, userInput: UserInput, language: AnalysisLanguage = 'ko'): string {
  const languageInstruction = getLanguageInstruction(language);
  const presetContext = getPresetContext();

  return `${languageInstruction}

당신은 ${userInput.industry} 도메인의 데이터 분석 전문가입니다.

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

## 🏛️ 2-Tier 속성 시스템 (매우 중요!)

시스템은 **2개 계층(Tier)**의 속성을 사용합니다:

### Tier 1: 시스템 필수 속성 (항상 생성)
시스템이 모든 이벤트에 자동으로 추가하는 속성들입니다:

**User 속성:**
${presetContext.requiredProperties.user.map(p => `- ${p}`).join('\n')}

**Location 속성:**
${presetContext.requiredProperties.location.map(p => `- ${p}`).join('\n')}

**Device 속성:**
${presetContext.requiredProperties.device.map(p => `- ${p}`).join('\n')}

### Tier 2: AI 정의 속성 (Excel + Preset 통합)
Excel에서 정의된 속성 + 시스템 선택적 속성을 통합하여 정의합니다.

**시스템 선택적 속성 (Excel에 있으면 통합):**
- Location 확장: ${presetContext.optionalProperties.location.join(', ')}
- Device 확장: ${presetContext.optionalProperties.device.join(', ')}
- Network: ${presetContext.optionalProperties.network.join(', ')}
- Personal: ${presetContext.optionalProperties.personal.join(', ')}

### 📋 일관성 규칙 (Consistency Rules)

시스템 프리셋 속성들은 다음 일관성 규칙을 따릅니다:

${presetContext.consistencyRules.map(rule => `
**${rule.groupName} 그룹** (level: ${rule.level}):
- 기준 속성: ${rule.basedOn || 'N/A'}
- 생성 속성: ${rule.generates.join(', ')}
- 전략: ${rule.strategy}
- 설명: ${rule.description}
`).join('\n')}

### ⚠️ 중요 지침: Excel 속성과 시스템 프리셋 통합

1. **Excel에 시스템 프리셋 속성이 있는 경우:**
   - 해당 속성을 기존 일관성 그룹에 **통합**하세요
   - 예: Excel에 "store_region", "store_city"가 있으면 → **location 그룹**에 추가
   - 예: Excel에 "order_id", "payment_id"가 있으면 → **transaction 그룹**에 추가

2. **consistencyGroups 응답 형식:**
   \`\`\`json
   "consistencyGroups": [
     {
       "groupName": "location",
       "level": "user",
       "properties": ["country", "countryCode", "locale", "city", "state", "store_region", "store_city"],
       "basedOn": "countryCode",
       "dependencies": {
         "countryCode": ["country", "city", "state", "store_region", "store_city", "ip", "carrier", "timezone"]
       },
       "strategy": "preset",
       "description": "국가 코드 기반으로 위치 관련 모든 속성 생성 (Excel 속성 통합)",
       "source": "integrated"
     },
     {
       "groupName": "transaction",
       "level": "transaction",
       "properties": ["order_id", "payment_id", "transaction_id"],
       "strategy": "uuid",
       "description": "트랜잭션 시작 시 관련 ID 생성",
       "source": "integrated"
     }
   ]
   \`\`\`

3. **source 필드 규칙:**
   - \`"system"\`: 시스템 프리셋만 포함
   - \`"excel"\`: Excel 속성만 포함
   - \`"integrated"\`: 시스템 프리셋 + Excel 속성 통합

4. **propertyConsistency 응답 형식 (매우 중요!):**
   **⚠️ Excel의 모든 속성**에 대해 일관성 레벨을 정의하세요!

   **일관성 레벨 선택 기준:**
   - **user**: 유저 전체에서 동일 (예: 국가, 디바이스, 이름, 이메일)
   - **session**: 세션 내에서 동일 (예: session_id, campaign_id, referrer)
   - **transaction**: 트랜잭션 내에서 동일 (예: order_id, payment_id, cart_id)
   - **event**: 매번 새로 생성 (예: product_name, price, timestamp, button_name)

   \`\`\`json
   "propertyConsistency": [
     // 시스템 프리셋 속성들
     { "propertyName": "country", "level": "user", "consistencyGroup": "location", "isPreset": true, "source": "system" },
     { "propertyName": "countryCode", "level": "user", "consistencyGroup": "location", "isPreset": true, "source": "system" },
     { "propertyName": "city", "level": "user", "consistencyGroup": "location", "isPreset": true, "source": "system" },
     { "propertyName": "os", "level": "user", "consistencyGroup": "device", "isPreset": true, "source": "system" },
     { "propertyName": "device_model", "level": "user", "consistencyGroup": "device", "isPreset": true, "source": "system" },

     // Excel 속성들 (모두 정의!)
     { "propertyName": "store_region", "level": "user", "consistencyGroup": "location", "isPreset": false, "source": "excel" },
     { "propertyName": "order_id", "level": "transaction", "consistencyGroup": "transaction", "isPreset": false, "source": "excel" },
     { "propertyName": "payment_id", "level": "transaction", "consistencyGroup": "transaction", "isPreset": false, "source": "excel" },
     { "propertyName": "campaign_id", "level": "session", "consistencyGroup": null, "isPreset": false, "source": "excel" },
     { "propertyName": "product_name", "level": "event", "consistencyGroup": null, "isPreset": false, "source": "excel" },
     { "propertyName": "price", "level": "event", "consistencyGroup": null, "isPreset": false, "source": "excel" }
     // ... Excel의 모든 속성 계속
   ]
   \`\`\`

   **⚠️ 주의: Excel의 모든 속성을 빠짐없이 포함하세요!**

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

### 3.6. 🆕 세그먼트 전환(Migration) 정의 (현실성 향상!)
**사용자는 시간이 지남에 따라 세그먼트 간 이동합니다.** 동적 페르소나를 정의하세요.

**핵심 개념:**
- 신규 유저 → 활성 유저 → 휴면 유저 → 이탈 유저 (생명주기)
- VIP 유저 → 일반 유저 (다운그레이드)
- 무료 유저 → 유료 유저 (업그레이드)

**정의 방법:**
\`\`\`json
{
  "fromSegment": "신규 사용자",
  "toSegment": "활성 사용자",
  "trigger": "time",
  "condition": "7일 경과 AND 5회 이상 접속",
  "probability": 0.4,
  "description": "신규 유저 중 40%가 7일 후 활성 유저로 전환"
}
\`\`\`

**trigger 타입:**
- \`time\`: 특정 기간 경과 (예: 7일, 30일)
- \`event\`: 특정 이벤트 발생 (예: 첫 구매, 레벨 10 달성)
- \`lifecycle\`: 생명주기 단계 전환 (예: active → dormant)

**중요 원칙:**
- 모든 세그먼트가 영원히 고정되지 않음
- ${userInput.industry} 도메인의 실제 사용자 여정 반영
- 전환 확률은 현실적으로 (0.2~0.6)
- 역전환도 가능 (예: VIP → 일반, 활성 → 휴면)

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

### 6. ⭐⭐⭐ 속성 간 상관관계 정의 (매우 중요! 현실성의 핵심!)
**${userInput.industry} 도메인의 모든 속성 간 논리적 관계를 철저히 분석**하여 정의하세요.
이것이 데이터 품질을 결정하는 가장 중요한 요소입니다!

**🚨 반드시 체크해야 할 관계들:**

#### 6.1. 수식 관계 (formula) - 최우선!
**계산 가능한 모든 관계를 찾아 정의하세요!**

**필수 체크 항목:**
- 금액 관련: 총액 = 단가 × 수량, 할인가 = 원가 - (원가 × 할인율)
- 비율 관련: 전환율 = 전환수 / 노출수, 클릭율 = 클릭수 / 노출수
- 시간 관련: 종료시간 = 시작시간 + 지속시간
- 거리/속도: 거리 = 속도 × 시간

**예시:**
\`\`\`json
{
  "sourceProperty": ["quantity", "unit_price"],
  "targetProperty": "total_price",
  "correlationType": "formula",
  "formulaType": "multiply",
  "formula": "quantity * unit_price",
  "description": "총액 = 수량 × 단가"
}
\`\`\`

#### 6.2. 항목 일관성 (identity) - 매우 중요!
**같은 항목은 항상 같은 속성을 가져야 합니다!**

**필수 체크 항목:**
- 상품명 → 가격 (같은 상품은 항상 같은 가격)
- 상품명 → 카테고리 (같은 상품은 항상 같은 카테고리)
- 지역명 → 우편번호 (같은 지역은 항상 같은 우편번호)
- 사용자ID → 등급 (세션 내에서 사용자 등급 고정)

**예시:**
\`\`\`json
{
  "sourceProperty": "product_name",
  "targetProperty": "price",
  "correlationType": "identity",
  "identityMap": {
    "iPhone 15": 1200000,
    "Galaxy S24": 1100000,
    "AirPods Pro": 329000
  },
  "description": "상품명에 따른 고정 가격"
}
\`\`\`

#### 6.3. 일관된 랜덤값 (consistent_random)
**매핑을 미리 정의할 수 없지만, 같은 값에는 같은 결과를 보장해야 할 때**

**사용 시나리오:**
- 상품명 → 무게 (AI가 모든 상품 무게를 미리 정의할 수 없음)
- 도시명 → 인구수 (실제 데이터 없지만 일관성 필요)
- 브랜드명 → 인기도 (첫 생성시 랜덤, 이후 동일)

**예시:**
\`\`\`json
{
  "sourceProperty": "product_name",
  "targetProperty": "weight",
  "correlationType": "consistent_random",
  "consistentRandomRange": { "min": 100, "max": 5000 },
  "description": "상품별 일관된 무게 (g)"
}
\`\`\`

#### 6.4. 조건부 관계 (conditional)
**특정 값에 따라 다른 값이 결정되는 관계**

**예시:**
\`\`\`json
{
  "sourceProperty": "country",
  "targetProperty": "language",
  "correlationType": "conditional",
  "strength": 1.0,
  "conditions": [
    { "sourceValue": "KR", "targetValues": ["ko"] },
    { "sourceValue": "US", "targetValues": ["en"] },
    { "sourceValue": "JP", "targetValues": ["ja"] }
  ],
  "description": "국가에 따른 언어 매핑"
}
\`\`\`

#### 6.5. 상관 관계 (positive/negative)
**약한 통계적 관계 (정확한 수식은 아니지만 경향성 존재)**

**예시:**
\`\`\`json
{
  "sourceProperty": "price",
  "targetProperty": "discount_rate",
  "correlationType": "negative",
  "strength": 0.7,
  "description": "고가 상품일수록 할인율 낮음"
}
\`\`\`

**🔥 중요 원칙:**
1. **모든 수식 관계를 먼저 찾으세요** (formula 우선!)
2. **같은 항목은 반드시 identity 사용** (상품명, 지역명 등)
3. **10개 이상의 관계를 정의**하세요 (적을수록 비현실적)
4. **${userInput.industry} 도메인 전문가처럼 생각**하세요
5. 의심스러우면 관계를 추가하세요 (많을수록 좋음)

### 7. ⭐ 시간 분포 패턴 정의 (현실성 향상!)
**${userInput.industry} 산업의 시간대별 활동 패턴**을 정의하세요.

**hourlyWeights** (필수):
- 0~23시 각 시간대의 활동 가중치 (합계 1.0)
- 산업 특성 반영 (게임: 저녁~밤, 금융: 출근/점심, 커머스: 점심/저녁)
- **기본 패턴**: 대부분의 이벤트에 적용되는 전역 시간 분포

**segmentPeakHours** (선택):
- 세그먼트별로 다른 피크 시간 정의 가능
- VIP/프리미엄 유저는 낮 시간대 활동 가능

**weekdayMultipliers** (선택):
- 요일별 가중치 [일, 월, 화, 수, 목, 금, 토]
- 주말 증가/감소, 평일 패턴 반영

**🆕 eventTimingOverrides** (선택사항, 중요!):
- **특정 이벤트만** 다른 시간 패턴을 가질 때 사용
- 전역 \`hourlyWeights\`를 **덮어쓰기**
- **언제 사용?**
  - 시간대별로 명확한 특성이 있는 이벤트
  - 예: \`breakfast_order\` (7-9시), \`lunch_order\` (12-14시), \`dinner_order\` (18-21시)
  - 예: \`morning_workout\` (6-8시), \`late_night_gaming\` (23-02시)
- **형식**:
  \`\`\`json
  "breakfast_order": {
    "hourlyWeights": [0, 0, 0, 0, 0, 0, 0.05, 0.4, 0.4, 0.1, 0.05, 0, ...],
    "description": "아침 7-9시 집중"
  }
  \`\`\`
- **주의**: 대부분의 이벤트는 전역 패턴 사용, 정말 특별한 경우만 정의

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
  "consistencyGroups": [
    {
      "groupName": "location",
      "level": "user",
      "properties": ["country", "countryCode", "locale", "city", "state", "store_region"],
      "basedOn": "countryCode",
      "dependencies": {
        "countryCode": ["country", "city", "state", "store_region", "ip", "carrier", "timezone"]
      },
      "strategy": "preset",
      "description": "국가 코드 기반으로 위치 관련 모든 속성 생성 (시스템 + Excel 통합)",
      "source": "integrated"
    },
    {
      "groupName": "transaction",
      "level": "transaction",
      "properties": ["order_id", "payment_id"],
      "strategy": "uuid",
      "description": "트랜잭션 시작 시 관련 ID 생성",
      "source": "excel"
    }
  ],
  "propertyConsistency": [
    // ⚠️ 시스템 프리셋 속성 (필수!)
    { "propertyName": "country", "level": "user", "consistencyGroup": "location", "isPreset": true, "source": "system" },
    { "propertyName": "countryCode", "level": "user", "consistencyGroup": "location", "isPreset": true, "source": "system" },
    { "propertyName": "city", "level": "user", "consistencyGroup": "location", "isPreset": true, "source": "system" },
    { "propertyName": "state", "level": "user", "consistencyGroup": "location", "isPreset": true, "source": "system" },
    { "propertyName": "os", "level": "user", "consistencyGroup": "device", "isPreset": true, "source": "system" },
    { "propertyName": "device_model", "level": "user", "consistencyGroup": "device", "isPreset": true, "source": "system" },
    { "propertyName": "device_id", "level": "user", "consistencyGroup": "device", "isPreset": true, "source": "system" },

    // ⚠️ Excel 속성 (모두 정의!)
    { "propertyName": "store_region", "level": "user", "consistencyGroup": "location", "isPreset": false, "source": "excel" },
    { "propertyName": "order_id", "level": "transaction", "consistencyGroup": "transaction", "isPreset": false, "source": "excel" },
    { "propertyName": "payment_id", "level": "transaction", "consistencyGroup": "transaction", "isPreset": false, "source": "excel" },
    { "propertyName": "session_referrer", "level": "session", "consistencyGroup": null, "isPreset": false, "source": "excel" },
    { "propertyName": "product_name", "level": "event", "consistencyGroup": null, "isPreset": false, "source": "excel" },
    { "propertyName": "button_name", "level": "event", "consistencyGroup": null, "isPreset": false, "source": "excel" }
    // ... Excel의 나머지 모든 속성 계속
  ],
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
  "segmentMigrations": [
    {
      "fromSegment": "신규 사용자",
      "toSegment": "활성 사용자",
      "trigger": "time",
      "condition": "7일 경과 AND 5회 이상 접속",
      "probability": 0.4,
      "description": "신규 유저 중 40%가 7일 후 활성 유저로 전환"
    },
    {
      "fromSegment": "활성 사용자",
      "toSegment": "휴면 사용자",
      "trigger": "lifecycle",
      "condition": "7일간 미접속",
      "probability": 1.0,
      "description": "7일 미접속 시 자동으로 휴면 전환"
    },
    {
      "fromSegment": "무료 사용자",
      "toSegment": "유료 사용자",
      "trigger": "event",
      "condition": "첫 구매 완료",
      "probability": 1.0,
      "description": "첫 구매 시 유료 사용자로 전환"
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
    "weekdayMultipliers": [1.0, 0.9, 0.9, 0.9, 0.9, 1.0, 1.2],
    "eventTimingOverrides": {
      "breakfast_order": {
        "hourlyWeights": [0, 0, 0, 0, 0, 0, 0.05, 0.3, 0.4, 0.2, 0.05, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        "description": "아침 식사 주문 - 7-10시 집중"
      },
      "late_night_gaming": {
        "hourlyWeights": [0.15, 0.1, 0.05, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.05, 0.1, 0.15, 0.2, 0.15, 0.05],
        "description": "심야 게임 - 22-02시 피크"
      }
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
  groupName: string,
  language: AnalysisLanguage = 'ko'
): string {
  const languageInstruction = getLanguageInstruction(language);
  const presetContext = getPresetContext();

  // 해당 이벤트들의 속성 필터링
  const eventNames = events.map(e => e.event_name);
  const relevantProperties = properties.filter(p =>
    !p.event_name || eventNames.includes(p.event_name)
  );

  // 시스템 필수 속성 목록 (범위 정의 제외)
  const systemRequiredProps = [
    ...presetContext.requiredProperties.user,
    ...presetContext.requiredProperties.location,
    ...presetContext.requiredProperties.device,
  ];

  return `${languageInstruction}

당신은 ${userInput.industry} 도메인의 데이터 분석 전문가입니다.

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

**⚠️ 시스템 필수 속성 (범위 정의 제외):**
다음 속성들은 시스템이 자동으로 생성하므로 범위를 정의하지 마세요:
${systemRequiredProps.map(p => `- ${p}`).join('\n')}

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
  maxGroupSize: number = 5
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
  userSegments: Array<{ name: string; ratio: number; characteristics: string }>,
  language: AnalysisLanguage = 'ko'
): string {
  const languageInstruction = getLanguageInstruction(language);

  return `${languageInstruction}

당신은 ${userInput.industry} 도메인의 사용자 리텐션 전문가입니다.

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
 * Phase 1.5a: 트랜잭션 감지 전용 프롬프트
 * 시작-종료 패턴 식별에만 집중
 */
export function buildTransactionDetectionPrompt(
  schema: ParsedSchema,
  userInput: UserInput,
  language: AnalysisLanguage = 'ko'
): string {
  const languageInstruction = getLanguageInstruction(language);

  return `${languageInstruction}

당신은 ${userInput.industry} 도메인의 트랜잭션 패턴 감지 전문가입니다.

## 🎯 당신의 임무
주어진 이벤트 목록에서 **모든 트랜잭션 패턴(시작-종료)**을 찾아내세요.

## 서비스 정보
- 산업: ${userInput.industry}
- 시나리오: ${userInput.scenario}

## 이벤트 목록 (${schema.events.length}개)
${schema.events.map(e => `- ${e.event_name} (${e.event_name_kr || e.event_name})`).join('\n')}

---

## 📋 트랜잭션 감지 가이드

### 🔍 1단계: 시작 이벤트 찾기
다음 패턴을 포함하는 **모든** 이벤트를 찾으세요:
- \`xxx_start\` (예: reservation_start, payment_start, video_start, game_start)
- \`xxx_begin\` (예: tutorial_begin, checkout_begin)
- \`xxx_open\` (예: modal_open, session_open)
- \`start_xxx\` (예: start_game, start_battle)

### 🔍 2단계: 종료 이벤트 매칭
각 시작 이벤트에 대응하는 종료 이벤트를 찾으세요:
- \`xxx_end\` (예: video_end, game_end)
- \`xxx_complete\` (예: reservation_complete, payment_complete, tutorial_complete)
- \`xxx_finish\` (예: checkout_finish, download_finish)
- \`xxx_close\` (예: modal_close, session_close)
- \`xxx_cancel\` (예: reservation_cancel, payment_cancel) ⚠️ **취소도 종료!**

### 🔍 3단계: 내부 이벤트 찾기
시작과 종료 사이에 발생할 수 있는 이벤트들:
- 동일한 접두사를 가진 다른 이벤트들
- 예: \`reservation_start\`, \`reservation_complete\` → \`reservation_modify\`, \`reservation_view\` 등

---

## ✅ 매칭 예시

**예시 1: 완벽한 매칭**
- 시작: \`reservation_start\`
- 종료: \`reservation_complete\`, \`reservation_cancel\`
- 내부: \`reservation_modify\`, \`reservation_view\`
→ **트랜잭션: "예약 프로세스"**

**예시 2: 접두사가 다른 경우**
- 시작: \`checkout_start\`
- 종료: \`purchase_complete\`
- 내부: \`add_payment\`, \`apply_coupon\`
→ **트랜잭션: "구매 프로세스"** (의미상 연결!)

**예시 3: 여러 종료 이벤트**
- 시작: \`video_start\`
- 종료: \`video_complete\`, \`video_end\`, \`video_error\`
- 내부: \`video_pause\`, \`video_seek\`
→ **트랜잭션: "영상 시청"** (모든 종료 이벤트를 endEvents에 포함!)

**예시 4: 게임 라운드**
- 시작: \`game_start\`, \`battle_start\`
- 종료: \`game_end\`, \`battle_end\`
- 내부: \`death\`, \`kill\`, \`item_use\`
→ **트랜잭션: "게임 라운드"**

---

## ⚠️ 중요 원칙

1. **모든 _start 이벤트를 확인하세요!**
   - 목록을 처음부터 끝까지 스캔
   - start, begin, open이 포함된 모든 이벤트 나열

2. **각 시작에 대응하는 종료를 찾으세요!**
   - 같은 접두사 우선 (reservation_start → reservation_complete)
   - 의미상 연결된 것도 포함 (checkout_start → purchase_complete)

3. **취소도 종료입니다!**
   - reservation_cancel, payment_cancel 등도 endEvents에 포함

4. **트랜잭션이 없을 수 있습니다!**
   - 단순 콘텐츠 소비 앱: article_view, like, share (독립 이벤트)
   - 정보 조회 앱: weather_check, news_read (완료 개념 없음)
   → 이런 경우 빈 배열 \`[]\` 반환

5. **allowInnerAfterEnd는 기본 false!**
   - 대부분: 종료 후 내부 이벤트 차단
   - 예외: 부활 시스템이 있는 게임 등 (드문 경우만 true)

---

## 📤 응답 형식

다음 JSON 형식으로 **반드시** 응답하세요:

\`\`\`json
{
  "transactions": [
    {
      "name": "트랜잭션명 (예: 예약 프로세스, 영상 시청)",
      "description": "설명 (예: 예약 시작부터 완료/취소까지)",
      "startEvents": ["시작_이벤트_목록"],
      "endEvents": ["종료_이벤트_목록"],
      "innerEvents": ["내부_이벤트_목록"],
      "allowInnerAfterEnd": false,
      "passThroughProperties": ["트랜잭션_내_공유할_속성"]
    }
  ]
}
\`\`\`

**트랜잭션이 없으면:**
\`\`\`json
{
  "transactions": []
}
\`\`\`

---

## 🚨 최종 체크리스트

작업 전에 반드시 확인:
1. ✅ 모든 _start, _begin, _open 이벤트를 나열했는가?
2. ✅ 각 시작 이벤트에 대응하는 종료 이벤트를 찾았는가?
3. ✅ 찾은 모든 패턴을 transactions 배열에 추가했는가?
4. ✅ 취소(_cancel) 이벤트도 endEvents에 포함했는가?
5. ✅ 정말로 트랜잭션이 없는지 다시 확인했는가?

**이제 시작하세요! 위 이벤트 목록에서 모든 트랜잭션을 찾아주세요.**`;
}

/**
 * Phase 1.6: 이벤트 순서 분석 프롬프트
 * 이벤트 간 논리적 순서 및 제약 조건 분석
 */
export function buildEventSequencingPrompt(
  schema: ParsedSchema,
  userInput: UserInput,
  language: AnalysisLanguage = 'ko'
): string {
  const languageInstruction = getLanguageInstruction(language);

  return `${languageInstruction}

당신은 ${userInput.industry} 도메인의 이벤트 시퀀싱 전문가입니다.

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

**ℹ️ 참고: 트랜잭션은 이미 별도 Phase에서 감지되었으므로 여기서는 다루지 않습니다.**

---

**⚠️ 필수 요구사항:**
1. 모든 이벤트를 eventCategories에 분류하세요
2. 이벤트 간 의존성(strictDependencies)을 정의하세요
3. 실행 제약(executionConstraints)을 정의하세요

---

### STEP 1: 이벤트 카테고리 분류

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

### STEP 2: 필수 선행 이벤트 (strictDependencies)

**반드시 지켜야 하는** 이벤트 순서를 정의하세요:
- \`signup_complete\` → 먼저 \`signup_start\` 필요
- \`checkout_complete\` → 먼저 \`cart_add\` 필요
- \`game_end\` → 먼저 \`game_start\` 필요
- \`tutorial_complete\` → 먼저 \`tutorial_start\` 필요

---

### STEP 3: 실행 제약 (executionConstraints)

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

### STEP 4: 논리적 시퀀스 (logicalSequences)

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

### STEP 5: 이벤트별 시간 간격 설정 (eventIntervals) ⭐ 매우 중요!

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
    "maxSeconds": 60,
    "segmentMultipliers": {
      "신규 사용자": 2.0,
      "VIP 사용자": 0.3
    }
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

**🆕 segmentMultipliers** (선택사항, 중요!):
- 세그먼트별로 시간 간격을 차별화하여 현실성 극대화
- 기본 \`avgSeconds\`에 곱해지는 가중치
- 예시:
  - **신규 사용자**: 2.0 (구매 결정이 2배 느림 - 신뢰 부족)
  - **VIP 사용자**: 0.3 (구매 결정이 3배 빠름 - 높은 신뢰)
  - **일반 사용자**: 1.0 (기본값, 생략 가능)
- **언제 사용?**
  - 구매/결제 이벤트: 신규 vs VIP 차이 큼
  - 결정 이벤트: 경험 많은 유저 vs 신규 유저
  - 탐색 이벤트: 목적 명확한 유저 vs 둘러보는 유저
- **언제 생략?**
  - 클릭, 조회 같은 빠른 액션 (차이 적음)
  - 모든 세그먼트가 동일하게 행동하는 이벤트

---

다음 JSON 형식으로 **반드시** 응답해주세요:

\`\`\`json
{
  "eventSequencing": {
    // 📝 참고: transactions는 이미 Phase 1.5a에서 감지되어 전달되므로 여기서는 생략합니다.
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
        "maxSeconds": 60,
        "segmentMultipliers": {
          "신규 사용자": 2.0,
          "VIP 사용자": 0.3
        }
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

**🚨 필수 체크리스트 (반드시 확인!):**
1. ✅ 모든 이벤트를 카테고리에 배치했는가?
2. ✅ 이벤트 간 의존성(strictDependencies)을 정의했는가?
3. ✅ 실행 제약(executionConstraints)을 정의했는가?
4. ✅ 모든 이벤트에 대해 시간 간격(eventIntervals)을 설정했는가?
5. ✅ \`game_end\` 후 \`death\`, \`reservation_complete\` 후 \`reservation_modify\` 같은 논리적으로 불가능한 시퀀스를 방지하는가?

**⚠️ 최종 확인:**
- 도메인 특성을 깊이 이해하고, 현실적으로 불가능한 이벤트 순서를 철저히 차단하세요!`;
}
