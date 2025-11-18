# 2단계: 이벤트별 속성 상세 설계

## 목적
1단계에서 정의한 각 이벤트에 대해, 해당 이벤트만의 고유한 속성을 상세하게 설계합니다.

---

## 입력 정보

### 서비스 정보
- **산업/카테고리**: {industry}
- **서비스 시나리오**: {scenario}
- **서비스 특징**: {notes}

### 1단계 출력 (이벤트 목록)
```json
{eventList}
```

---

## 출력 요구사항

### 이벤트별 속성 정의

각 이벤트에 필요한 속성을 상세하게 정의합니다.

**속성 구성:**
- **eventName**: 해당 이벤트의 이름 (1단계에서 정의한 이벤트 중 하나)
- **propertyName**: 속성 이름 (영문 snake_case)
- **propertyAlias**: 속성 별칭 (한국어)
- **propertyType**: 속성 유형 (아래 참조)
- **propertyDescription**: 속성 설명 (상세하게)

---

## 속성 유형 가이드

### 기본 타입

| 타입 | 설명 | 예시 |
|------|------|------|
| `string` | 문자열. Enum 값은 설명에 명시 | `race_mode: "아이템전"` |
| `number` | 숫자 (정수, 실수) | `lap_count: 3` |
| `boolean` | true/false | `is_tutorial: true` |
| `time` | 시간 (yyyy-MM-dd HH:mm:ss.SSS) | `race_start_time` |
| `list` | 문자열 배열 | `tags: ["스피드", "멀티플레이"]` |

### 복합 타입

#### `object` - 단일 객체
키-값 쌍으로 이루어진 단일 객체. 주요 키와 데이터 유형을 설명에 명시.

**예시:**
```
propertyName: race_settings
propertyType: object
description: 레이스 설정 정보 (track_id: string, weather: string, difficulty: number)
```

#### `object group` - 객체 배열 (⚠️ 중요!)

**동일한 구조를 가진 객체들의 배열**입니다.

**작성 규칙:**
1. 먼저 object group 자체를 정의
2. 그 다음 점(`.`) 표기법으로 하위 속성들을 개별적으로 정의
3. 각 하위 속성은 별도의 행으로 작성

**✅ 올바른 예시:**
```json
{
  "eventName": "race_finish",
  "propertyName": "rewards_obtained_info",
  "propertyAlias": "획득 보상 정보",
  "propertyType": "object group",
  "propertyDescription": "레이스 종료 시 획득한 보상 목록"
},
{
  "eventName": "race_finish",
  "propertyName": "rewards_obtained_info.reward_type",
  "propertyAlias": "보상 - 유형",
  "propertyType": "string",
  "propertyDescription": "보상 타입 (카트, 캐릭터, 골드, 다이아)"
},
{
  "eventName": "race_finish",
  "propertyName": "rewards_obtained_info.id",
  "propertyAlias": "보상 - ID",
  "propertyType": "string",
  "propertyDescription": "보상 아이템의 고유 ID"
},
{
  "eventName": "race_finish",
  "propertyName": "rewards_obtained_info.quantity",
  "propertyAlias": "보상 - 수량",
  "propertyType": "number",
  "propertyDescription": "획득한 보상의 수량"
}
```

**❌ 잘못된 예시:**
```json
// 잘못됨: object group의 하위 속성을 별도로 정의하지 않음
{
  "propertyName": "rewards_obtained_info",
  "propertyType": "object group",
  "propertyDescription": "보상 정보 (type, id, quantity 포함)"
}
```

---

## object group 사용 케이스

다음과 같은 경우에 **반드시** object group을 사용하세요:

### 1️⃣ 여러 아이템/보상
```
items_obtained_info
├─ items_obtained_info.item_id
├─ items_obtained_info.item_name
├─ items_obtained_info.quantity
└─ items_obtained_info.rarity
```

### 2️⃣ 여러 참가자
```
race_participants
├─ race_participants.user_id
├─ race_participants.nickname
├─ race_participants.character_id
├─ race_participants.kart_id
└─ race_participants.finish_rank
```

### 3️⃣ 여러 퀘스트/미션
```
completed_missions
├─ completed_missions.mission_id
├─ completed_missions.mission_type
└─ completed_missions.completion_time
```

### 4️⃣ 구매 상품 목록
```
purchased_items
├─ purchased_items.product_id
├─ purchased_items.product_name
├─ purchased_items.price
└─ purchased_items.discount_rate
```

---

## 속성 설계 원칙

### ✅ 좋은 속성 설계

1. **분석 가능성**: 세그먼트, 필터, 집계 가능
   - `race_mode: "아이템전"` → 모드별 분석 가능
   - `lap_count: 3` → 평균 랩 수 계산 가능

2. **명확한 데이터 타입**
   - 숫자는 `number` 사용
   - Enum은 `string` + 가능한 값 명시

3. **상세한 설명**
   - Enum 값 목록 포함
   - 단위 명시 (초, KRW, % 등)
   - 예시 제공

4. **적절한 object group 사용**
   - 배열 형태 데이터는 object group 사용
   - 하위 속성을 점 표기법으로 명확히 정의

### ❌ 피해야 할 설계

1. **너무 포괄적**: `data: object` (구체적이지 않음)
2. **object group 누락**: 배열 데이터를 object로 잘못 정의
3. **하위 속성 미정의**: object group만 정의하고 하위 속성 생략
4. **불명확한 설명**: "사용자 정보" (어떤 정보인지 불명확)

---

## 이벤트별 권장 속성 수

- **간단한 이벤트**: 3~5개 속성 (예: 로그인, 로그아웃)
- **일반 이벤트**: 5~10개 속성 (예: 상품 조회, 친구 추가)
- **복잡한 이벤트**: 10~20개 속성 (예: 게임 완료, 결제, 가챠)

**object group 포함 시**: 하위 속성도 개수에 포함

---

## 출력 형식

JSON 배열 형식으로 반환하세요:

```json
{
  "eventProperties": [
    {
      "eventName": "race_start",
      "propertyName": "race_mode",
      "propertyAlias": "레이스 모드",
      "propertyType": "string",
      "propertyDescription": "레이스 타입 (아이템전, 스피드전, 연습)"
    },
    {
      "eventName": "race_start",
      "propertyName": "track_id",
      "propertyAlias": "트랙 ID",
      "propertyType": "string",
      "propertyDescription": "선택된 트랙의 고유 ID"
    },
    {
      "eventName": "race_finish",
      "propertyName": "finish_rank",
      "propertyAlias": "최종 순위",
      "propertyType": "number",
      "propertyDescription": "레이스 종료 시 최종 순위 (1~8)"
    },
    {
      "eventName": "race_finish",
      "propertyName": "race_time",
      "propertyAlias": "완주 시간",
      "propertyType": "number",
      "propertyDescription": "레이스 완주 소요 시간 (초 단위)"
    },
    {
      "eventName": "race_finish",
      "propertyName": "rewards_obtained_info",
      "propertyAlias": "획득 보상 정보",
      "propertyType": "object group",
      "propertyDescription": "레이스 완료 시 획득한 보상 목록"
    },
    {
      "eventName": "race_finish",
      "propertyName": "rewards_obtained_info.reward_type",
      "propertyAlias": "보상 - 유형",
      "propertyType": "string",
      "propertyDescription": "보상 타입 (골드, 다이아, 카트, 캐릭터)"
    },
    {
      "eventName": "race_finish",
      "propertyName": "rewards_obtained_info.id",
      "propertyAlias": "보상 - ID",
      "propertyType": "string",
      "propertyDescription": "보상 아이템의 고유 ID"
    },
    {
      "eventName": "race_finish",
      "propertyName": "rewards_obtained_info.quantity",
      "propertyAlias": "보상 - 수량",
      "propertyType": "number",
      "propertyDescription": "획득한 보상의 수량"
    }
  ]
}
```

---

## 중요 체크리스트

### ✅ 제출 전 확인사항

- [ ] 모든 이벤트에 속성이 정의되었는가?
- [ ] 배열 데이터는 object group으로 정의했는가?
- [ ] object group의 모든 하위 속성을 점(`.`) 표기법으로 정의했는가?
- [ ] 속성 설명에 Enum 값, 단위, 예시가 포함되었는가?
- [ ] 속성 타입이 올바르게 선택되었는가?

---

이제 위 가이드라인을 바탕으로 각 이벤트의 속성을 상세하게 정의해주세요.
특히 **object group**을 적극적으로 활용하여 배열 형태의 데이터를 정확하게 표현하세요.
