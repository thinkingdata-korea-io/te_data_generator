# 서비스 이벤트 트래킹 텍소노미 생성 프롬프트

## 요청 개요

제공된 서비스 정보를 바탕으로, 해당 서비스의 이벤트 트래킹 텍소노미를 설계합니다.
최종 결과물은 **4개의 테이블 형식**으로 출력되며, ThinkingEngine 데이터 수집 표준을 준수합니다.

---

## 서비스 정보 (입력값)

- **산업/카테고리**: {industry}
- **서비스 시나리오**: {scenario}
- **서비스 특징**: {notes}

---

## 출력 형식: 4개 테이블

### 1️⃣ [#유저 ID 체계] 테이블

**목적**: 서비스의 사용자 식별 체계를 정의합니다.

**컬럼 구조**:
| 유형 | 속성 이름 | 속성 별칭 | 속성 설명 | 값 설명 |

**작성 규칙**:

- **유형**: 서비스의 ID 시스템 구조를 정의합니다
  - **게임**: `단일 계정 단일 캐릭터`, `단일 계정 다중 캐릭터`, `계정 시스템 없음`
  - **일반 서비스**: `단일 계정 단일 프로필`, `단일 계정 다중 프로필`, `계정 시스템 없음`
- **속성 이름**: 항상 `#account_id`와 `#distinct_id` 두 개만 사용
- **속성 별칭**: "계정 ID", "게스트 ID" 등 한국어 이름
- **속성 설명**: 유형에 따라 달라짐
  - 계정 시스템이 없는 경우: `#account_id`의 속성 설명은 `NULL`
  - 단일 계정인 경우: `#account_id`에 플레이어/사용자 고유 ID 설명
  - 다중 캐릭터/프로필인 경우: `#account_id`에 캐릭터/프로필 ID로 설정한다고 설명
- **값 설명**: 생성 규칙 및 예시

**예시**:

```
| 단일 계정 단일 캐릭터 | #account_id | 계정 ID | 플레이어의 계정 ID로 설정합니다. | UUID 형식, 로그인 시 발급 |
| 단일 계정 단일 캐릭터 | #distinct_id | 게스트 ID | 디바이스 관련 ID 또는 서비스 내 게스트 ID를 사용합니다. |  |
| 단일 계정 다중 캐릭터 | #account_id | 계정 ID | 캐릭터 ID로 설정하고, 캐릭터가 속한 계정 ID는 캐릭터의 커스텀 속성으로 설정합니다 | 캐릭터별 고유 ID |
| 단일 계정 다중 캐릭터 | #distinct_id | 게스트 ID | 디바이스 관련 ID 또는 서비스 내 게스트 ID를 사용합니다. |  |
| 계정 시스템 없음 | #account_id | 계정 ID | NULL | NULL |
| 계정 시스템 없음 | #distinct_id | 게스트 ID | SDK 자동 수집 | 디바이스 기반 식별자 |
```

---

### 2️⃣ [#이벤트 데이터] 테이블

**목적**: 서비스 내 발생하는 주요 이벤트와 각 이벤트별 속성을 정의합니다.

**컬럼 구조**:
| 이벤트 이름 (필수) | 이벤트 별칭 | 이벤트 설명 | 이벤트 태그 | 속성 이름 (필수) | 속성 별칭 | 속성 유형 (필수) | 속성 설명 |

**작성 규칙**:

- **이벤트 이름**: 영문 snake_case, 필수 (예: `purchase_complete`, `level_up`)
- **이벤트 별칭**: 한국어 이름 (예: "구매 완료", "레벨업")
- **이벤트 설명**: 이벤트 발생 조건 및 타이밍 상세 설명
- **이벤트 태그**: 카테고리 (예: "결제", "전투", "소셜", "온보딩")
- **속성 이름**: 영문 snake_case, 해당 이벤트에 포함되는 속성
- **속성 유형**: `string`, `number`, `boolean`, `time`, `list`, `object`, `object group`
- 동일 이벤트의 여러 속성은 이벤트 정보를 반복 기재

**속성 유형 가이드**:

- `string`: 문자열 (Enum 값은 속성 설명에 명시)
- `number`: 숫자
- `boolean`: true/false
- `time`: 시간 (yyyy-MM-dd HH:mm:ss.SSS)
- `list`: 문자열 배열 `["A", "B"]`
- `object`: 단일 객체 `{key: value}`
- `object group`: 객체 배열, 하위 속성은 점 표기법 (예: `items.item_id`, `items.quantity`)

**예시**:

```
| purchase_complete | 구매 완료 | 결제가 완료되었을 때 | 결제 | product_id | 상품 ID | string | 구매한 상품의 고유 ID |
| purchase_complete |           |                      |      | amount | 결제 금액 | number | KRW 단위 결제 금액 |
| level_up | 레벨업 | 캐릭터 레벨 상승 시 | 성장 | new_level | 신규 레벨 | number | 상승 후 레벨 (1~100) |
```

---

### 3️⃣ [#공통 이벤트 속성] 테이블

**목적**: 모든 또는 다수 이벤트에 공통적으로 포함되는 속성을 정의합니다.

**컬럼 구조**:
| 속성 이름 (필수) | 속성 별칭 | 속성 유형 (필수) | 속성 설명 |

**작성 규칙**:

- 2개 이상의 이벤트에서 사용되는 공통 속성
- 플랫폼, 디바이스, 위치, 세션 정보 등
- **제외 항목**: 시스템이 자동 수집하는 `#account_id`, `#event_name`, `#event_time`, `#ip` 등은 제외

**예시**:

```
| platform | 플랫폼 | string | 접속 플랫폼 (iOS, Android, Web) |
| device_model | 기기 모델 | string | 사용자 디바이스 모델명 |
| session_id | 세션 ID | string | 현재 세션의 고유 식별자 |
```

---

### 4️⃣ [#유저 데이터] 테이블

**목적**: 사용자 프로필 및 누적 데이터를 정의합니다.

**컬럼 구조**:
| 속성 이름 (필수) | 속성 별칭 | 속성 유형 (필수) | 업데이트 방식 | 속성 설명 | 속성 태그 |

**작성 규칙**:

- 사용자 테이블에 저장되는 속성
- **업데이트 방식**:
  - `userset`: 값 덮어쓰기 또는 신규 추가
  - `usersetonce`: 최초 1회만 설정 (재설정 불가)
  - `useradd`: 숫자 누적 (증가/감소)
  - `userunset`: 값 삭제
  - `userappend`: 리스트에 요소 추가
  - `useruniqappend`: 리스트에 중복 제거 후 추가
- **속성 태그**: 분류 (예: "프로필", "재화", "성장", "활동")

**예시**:

```
| total_purchase_amount | 총 결제액 | number | useradd | 누적 결제 금액 (KRW) | 결제 |
| user_level | 사용자 레벨 | number | userset | 현재 레벨 | 성장 |
| signup_date | 가입일 | time | usersetonce | 최초 가입 날짜 | 프로필 |
| favorite_categories | 관심 카테고리 | list | useruniqappend | 사용자가 관심있는 카테고리 목록 | 행동 |
```

---

## 설계 가이드라인

### 📋 이벤트 설계 원칙

1. **핵심 사용자 여정 중심**: 온보딩 → 핵심 기능 사용 → 전환/재방문 흐름 반영
2. **비즈니스 지표 연결**: 매출, 리텐션, 인게이지먼트 측정 가능하도록 설계
3. **퍼널 분석 고려**: 주요 전환 퍼널을 추적할 수 있도록 이벤트 순서 구성
4. **적정 이벤트 수**:
   - 소규모 서비스: 15~25개
   - 중규모 서비스: 30~50개
   - 대규모 서비스: 50~80개

### 🎯 속성 설계 원칙

1. **분석 가능성**: 세그먼트, 필터, 집계가 가능한 속성 우선
2. **명확한 데이터 타입**: 숫자는 number, Enum은 string + 가능한 값 명시
3. **미래 확장성**: 추가 기능을 위한 여유 속성 포함
4. **일관된 네이밍**: snake_case, 의미 명확한 이름

### 🏷️ 이벤트 태그 예시

- **온보딩**: 회원가입, 튜토리얼, 최초 설정
- **콘텐츠**: 조회, 검색, 필터링, 상세보기
- **거래**: 결제, 구매, 환불, 장바구니
- **소셜**: 공유, 좋아요, 댓글, 팔로우
- **게임**: 전투, 퀘스트, 레벨업, 보상
- **시스템**: 로그인, 로그아웃, 설정 변경

---

## 출력 형식

JSON 형식으로 4개의 테이블을 반환합니다:

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
  "eventData": [
    {
      "eventName": "purchase_complete",
      "eventAlias": "구매 완료",
      "eventDescription": "결제가 완료되었을 때",
      "eventTag": "결제",
      "propertyName": "product_id",
      "propertyAlias": "상품 ID",
      "propertyType": "string",
      "propertyDescription": "구매한 상품의 고유 ID"
    }
  ],
  "commonProperties": [
    {
      "propertyName": "platform",
      "propertyAlias": "플랫폼",
      "propertyType": "string",
      "description": "접속 플랫폼 (iOS, Android, Web)"
    }
  ],
  "userData": [
    {
      "propertyName": "total_purchase_amount",
      "propertyAlias": "총 결제액",
      "propertyType": "number",
      "updateMethod": "useradd",
      "description": "누적 결제 금액 (KRW)",
      "tag": "결제"
    }
  ]
}
```

---

## 주의사항

1. **시스템 자동 수집 속성 제외**: `#account_id`, `#event_name`, `#event_time`, `#ip`, `#디바이스타입` 등은 정의하지 않음
2. **산업별 특성 반영**: 게임/커머스/금융/미디어 등 각 산업의 핵심 지표 포함
3. **현실적인 이벤트 설계**: 실제 서비스에서 추적 가능하고 분석 가치가 있는 이벤트 선정
4. **한국어 명확성**: 별칭과 설명은 비개발자도 이해 가능한 명확한 한국어 사용
5. **확장 가능한 구조**: 향후 기능 추가 시 이벤트/속성 추가가 용이한 구조

---

이제 위 가이드라인을 바탕으로 제공된 서비스 정보에 맞는 텍소노미를 생성해주세요.
