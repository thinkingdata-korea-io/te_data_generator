# 1단계: 이벤트 정의 + 공통 속성 + 유저 ID 체계

## 목적

서비스의 핵심 이벤트 골격을 정의하고, 모든 이벤트에 공통으로 필요한 **비즈니스/서비스 로직 관련** 속성을 설계합니다.

---

## 입력 정보

- **산업/카테고리**: {industry}
- **서비스 시나리오**: {scenario}
- **서비스 특징**: {notes}

---

## 출력 요구사항

### 1️⃣ 유저 ID 체계 정의

서비스의 사용자 식별 방식을 정의합니다.

**유형 선택:**

- 게임: `단일 계정 단일 캐릭터`, `단일 계정 다중 캐릭터`, `계정 시스템 없음`
- 일반 서비스: `단일 계정 단일 프로필`, `단일 계정 다중 프로필`, `계정 시스템 없음`

**속성 이름:** 항상 `#account_id`와 `#distinct_id` 두 개만 사용

**규칙:**

- 계정 시스템이 없는 경우: `#account_id`의 속성 설명은 `NULL`
- 단일 계정인 경우: `#account_id`에 사용자 고유 ID 설명
- 다중 캐릭터/프로필인 경우: `#account_id`에 캐릭터/프로필 ID로 설정한다고 설명

---

### 2️⃣ 이벤트 골격 정의 ({eventCountMin}~{eventCountMax}개)

서비스의 핵심 사용자 여정을 반영하는 이벤트를 정의합니다.

**이벤트 구성:**

- **이벤트 이름**: 영문 snake_case (예: `race_start`, `gacha_open`)
- **이벤트 별칭**: 한국어 이름 (예: "레이스 시작", "가챠 오픈")
- **이벤트 설명**: 언제, 어떤 상황에 발생하는지 상세 설명
- **이벤트 태그**: 카테고리 (예: "결제", "전투", "소셜", "온보딩")

**중요:** 속성은 정의하지 않습니다! 이벤트 골격만 정의하세요.

**포함해야 할 이벤트 카테고리:**

1. **온보딩**: 회원가입, 튜토리얼, 최초 설정
2. **핵심 기능**: 서비스의 메인 기능 사용 (게임: 전투/레이스, 커머스: 상품 조회/구매)
3. **결제/수익화**: 구매, 결제, 가챠, 구독
4. **소셜**: 공유, 친구 추가, 길드, 커뮤니티
5. **리텐션**: 보상 수령, 미션, 푸시 알림 반응
6. **시스템**: 로그인, 로그아웃, 설정

**이벤트 수 요구사항:**

- **최소 {eventCountMin}개 이상**의 핵심 이벤트를 정의해야 합니다
- **최대 {eventCountMax}개 이하**로 제한하되, 서비스의 핵심 기능을 모두 커버해야 합니다
- 시나리오의 복잡도에 따라 이 범위 내에서 최적의 이벤트 수를 결정하세요
- 불필요한 이벤트로 수를 채우지 마세요. 실제로 필요한 이벤트만 포함하세요

---

### 3️⃣ 공통 이벤트 속성 정의

**중요:** 클라이언트 SDK가 자동으로 수집하는 프리셋 속성은 제외합니다!

#### ❌ 제외할 프리셋 속성 (SDK가 자동 수집)

다음 속성들은 **절대 포함하지 마세요**:

- `#ip`, `#country`, `#country_code`, `#province`, `#city`
- `#os`, `#os_version`, `#device_model`, `#device_type`, `#manufacturer`
- `#app_version`, `#bundle_id`, `#network_type`, `#carrier`
- `#browser`, `#browser_version`, `#screen_height`, `#screen_width`
- `#device_id`, `#lib`, `#lib_version`, `#zone_offset`
- 그 외 Preset Properties 문서에 정의된 모든 속성

#### ✅ 포함해야 할 공통 속성 (비즈니스/서비스 로직)

서비스의 비즈니스 로직이나 분석에 필요한 커스텀 공통 속성만 정의하세요:

**예시:**

- `session_id`: 세션 고유 식별자
- `user_tier`: 사용자 등급 (VIP, 일반 등)
- `server_region`: 접속 서버 리전

**작성 기준:**

- 2개 이상의 이벤트에서 공통으로 사용
- 비즈니스 분석에 필요한 속성
- SDK가 자동 수집하지 않는 서비스 고유 속성

---

## 출력 형식

JSON 형식으로 반환하세요:

```json
{
  "userIdSystem": [
    {
      "type": "단일 계정 단일 캐릭터",
      "propertyName": "#account_id",
      "propertyAlias": "계정 ID",
      "description": "플레이어의 계정 ID로 설정합니다",
      "valueDescription": "UUID 형식, 로그인 시 발급"
    },
    {
      "type": "단일 계정 단일 캐릭터",
      "propertyName": "#distinct_id",
      "propertyAlias": "게스트 ID",
      "description": "디바이스 관련 ID 또는 서비스 내 게스트 ID를 사용하며, 클라이언트 SDK를 사용하는 경우",
      "valueDescription": "SDK 자동 수집"
    }
  ],
  "events": [
    {
      "eventName": "race_start",
      "eventAlias": "레이스 시작",
      "eventDescription": "레이스 매칭이 완료되고 게임이 시작될 때",
      "eventTag": "게임플레이"
    },
    {
      "eventName": "race_finish",
      "eventAlias": "레이스 완료",
      "eventDescription": "레이스가 종료되고 결과 화면이 표시될 때",
      "eventTag": "게임플레이"
    }
  ],
  "commonProperties": [
    {
      "propertyName": "session_id",
      "propertyAlias": "세션 ID",
      "propertyType": "string",
      "description": "현재 세션의 고유 식별자"
    },
    {
      "propertyName": "game_mode",
      "propertyAlias": "게임 모드",
      "propertyType": "string",
      "description": "현재 플레이 중인 게임 모드 (아이템전, 스피드전, 연습)"
    }
  ]
}
```

---

## 설계 가이드라인

### ✅ 좋은 이벤트 설계

- 명확한 사용자 행동 단위로 분리
- 분석 가능한 구체적인 이벤트
- 비즈니스 KPI와 연결 가능

### ✅ 좋은 공통 속성

- 서비스 특화된 비즈니스 로직 속성
- 여러 이벤트에서 공통으로 사용
- 분석 세그먼테이션에 유용

### ❌ 피해야 할 설계

- 너무 포괄적인 이벤트 (예: `user_action`)
- 너무 세분화된 이벤트 (예: `button_clicked_3rd_time`)
- SDK가 자동 수집하는 프리셋 속성 포함

---

이제 위 가이드라인을 바탕으로 1단계 출력(유저 ID 체계, 이벤트 골격, 공통 속성)을 생성해주세요.
