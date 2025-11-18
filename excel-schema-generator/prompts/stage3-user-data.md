# 3단계: 유저 데이터 정의

## 목적
1~2단계에서 정의한 이벤트들을 분석하여, 유저 프로필 및 누적 데이터 속성을 설계합니다.

---

## 입력 정보

### 서비스 정보
- **산업/카테고리**: {industry}
- **서비스 시나리오**: {scenario}
- **서비스 특징**: {notes}

### 1~2단계 출력 (이벤트 및 속성)
```json
{eventSummary}
```

---

## 출력 요구사항

### 유저 데이터 속성 정의

사용자 프로필 정보와 누적/통계 데이터를 정의합니다.

**속성 구성:**
- **propertyName**: 속성 이름 (영문 snake_case)
- **propertyAlias**: 속성 별칭 (한국어)
- **propertyType**: 속성 유형 (string, number, boolean, time, list)
- **updateMethod**: 업데이트 방식 (아래 참조)
- **description**: 속성 설명 (상세하게)
- **tag**: 속성 태그/분류 (프로필, 재화, 성장, 활동 등)

---

## 업데이트 방식 가이드

| 방식 | 설명 | 사용 예시 |
|------|------|----------|
| `userset` | 값 덮어쓰기 또는 신규 추가 | 현재 레벨, 최근 접속일, 상태 메시지 |
| `usersetonce` | 최초 1회만 설정 (재설정 불가) | 가입일, 최초 유입 채널, 첫 구매일 |
| `useradd` | 숫자 누적 (증가/감소) | 총 결제액, 누적 경험치, 플레이 시간 |
| `userunset` | 값 삭제 | 임시 프로모션 코드, 만료된 쿠폰 |
| `userappend` | 리스트에 요소 추가 | 플레이 이력, 구매 이력 |
| `useruniqappend` | 리스트에 중복 제거 후 추가 | 관심 카테고리, 선호 장르, 친구 목록 |

---

## 유저 데이터 카테고리

### 1️⃣ 프로필 (tag: "프로필")

사용자의 기본 정보 및 설정

**포함할 속성:**
- 가입일, 최초 유입 채널, 생년월일, 성별
- 닉네임, 프로필 이미지, 자기소개
- 언어 설정, 알림 설정

**업데이트 방식:**
- `usersetonce`: 변경 불가능한 정보 (가입일, 최초 유입)
- `userset`: 변경 가능한 정보 (닉네임, 설정)

### 2️⃣ 성장/진행도 (tag: "성장")

사용자의 레벨, 경험치, 티어 등

**포함할 속성:**
- 현재 레벨, 누적 경험치
- 랭크/티어, 랭크 포인트
- 튜토리얼 완료 여부, 진행 단계

**업데이트 방식:**
- `userset`: 현재 상태 (레벨, 티어)
- `useradd`: 누적 값 (총 경험치)
- `usersetonce`: 최초 완료 (튜토리얼 완료일)

### 3️⃣ 재화/인벤토리 (tag: "재화")

사용자가 보유한 재화 및 아이템

**포함할 속성:**
- 보유 골드, 다이아, 포인트
- 보유 카트 수, 캐릭터 수
- 인벤토리 슬롯 수

**업데이트 방식:**
- `userset`: 현재 보유량 (골드, 다이아)
- `useradd`: 누적 획득량 (총 획득 골드)

### 4️⃣ 활동/통계 (tag: "활동")

사용자의 활동 이력 및 통계

**포함할 속성:**
- 총 플레이 시간, 총 세션 수
- 누적 레이스 수, 승률
- 최근 접속일, 연속 출석일
- 누적 결제 횟수, 총 결제액

**업데이트 방식:**
- `useradd`: 누적 통계 (플레이 시간, 레이스 수)
- `userset`: 현재 상태 (최근 접속일, 연속 출석)

### 5️⃣ 소셜/선호도 (tag: "소셜")

사용자의 소셜 활동 및 선호도

**포함할 속성:**
- 친구 수, 길드 ID, 길드 역할
- 선호 게임 모드, 선호 트랙
- 관심 카테고리, 즐겨찾기 목록

**업데이트 방식:**
- `userset`: 소속 정보 (길드 ID, 역할)
- `useruniqappend`: 선호도/관심사 (선호 장르, 관심 카테고리)

### 6️⃣ 리텐션/인게이지먼트 (tag: "인게이지먼트")

사용자의 참여도 및 리텐션 관련

**포함할 속성:**
- 마지막 로그인일, D1/D7/D30 리텐션
- 주간 활동일수, 월간 활동일수
- 푸시 알림 수신 동의, 마케팅 수신 동의

**업데이트 방식:**
- `userset`: 최근 활동 (마지막 로그인일)
- `useradd`: 누적 활동 (총 활동일수)

---

## 설계 원칙

### ✅ 좋은 유저 데이터 설계

1. **분석 가능성**: 세그먼트, 코호트 분석에 활용
   - `user_tier: "VIP"` → VIP 사용자 분석
   - `total_purchase_amount` → ARPPU 계산

2. **올바른 업데이트 방식**
   - 변하지 않는 값: `usersetonce`
   - 현재 상태: `userset`
   - 누적 값: `useradd`

3. **명확한 태그 분류**
   - 프로필, 재화, 성장, 활동, 소셜, 인게이지먼트 등
   - 일관된 태그 사용

4. **이벤트와 연계**
   - 정의된 이벤트에서 업데이트될 속성
   - 예: `race_finish` 이벤트 → `total_race_count` 증가

### ❌ 피해야 할 설계

1. **잘못된 업데이트 방식**
   - 누적 값에 `userset` 사용 (덮어쓰기 되어 통계 손실)
   - 변경 가능 값에 `usersetonce` 사용

2. **불필요한 중복**
   - 이벤트 속성과 중복되는 유저 속성
   - 계산 가능한 값 (평균은 total/count로 계산)

3. **너무 세분화**
   - 개별 아이템마다 속성 생성 (인벤토리는 object group으로)

---

## 권장 속성 수

- **소규모 서비스**: 10~20개
- **중규모 서비스**: 20~35개
- **대규모 서비스**: 35~50개

---

## 출력 형식

JSON 배열 형식으로 반환하세요:

```json
{
  "userData": [
    {
      "propertyName": "signup_date",
      "propertyAlias": "가입일",
      "propertyType": "time",
      "updateMethod": "usersetonce",
      "description": "사용자가 최초 가입한 날짜 (yyyy-MM-dd HH:mm:ss)",
      "tag": "프로필"
    },
    {
      "propertyName": "user_tier",
      "propertyAlias": "사용자 등급",
      "propertyType": "string",
      "updateMethod": "userset",
      "description": "현재 사용자 등급 (일반, VIP, VVIP)",
      "tag": "프로필"
    },
    {
      "propertyName": "current_level",
      "propertyAlias": "현재 레벨",
      "propertyType": "number",
      "updateMethod": "userset",
      "description": "사용자의 현재 레벨 (1~100)",
      "tag": "성장"
    },
    {
      "propertyName": "total_experience",
      "propertyAlias": "총 경험치",
      "propertyType": "number",
      "updateMethod": "useradd",
      "description": "누적 획득 경험치",
      "tag": "성장"
    },
    {
      "propertyName": "gold_balance",
      "propertyAlias": "보유 골드",
      "propertyType": "number",
      "updateMethod": "userset",
      "description": "현재 보유 중인 골드",
      "tag": "재화"
    },
    {
      "propertyName": "total_gold_earned",
      "propertyAlias": "총 획득 골드",
      "propertyType": "number",
      "updateMethod": "useradd",
      "description": "누적 획득한 골드 총량",
      "tag": "재화"
    },
    {
      "propertyName": "total_race_count",
      "propertyAlias": "총 레이스 수",
      "propertyType": "number",
      "updateMethod": "useradd",
      "description": "참여한 레이스 총 횟수",
      "tag": "활동"
    },
    {
      "propertyName": "win_count",
      "propertyAlias": "승리 횟수",
      "propertyType": "number",
      "updateMethod": "useradd",
      "description": "1위로 완주한 레이스 횟수",
      "tag": "활동"
    },
    {
      "propertyName": "total_purchase_amount",
      "propertyAlias": "총 결제액",
      "propertyType": "number",
      "updateMethod": "useradd",
      "description": "누적 결제 금액 (KRW)",
      "tag": "활동"
    },
    {
      "propertyName": "last_login_date",
      "propertyAlias": "마지막 로그인일",
      "propertyType": "time",
      "updateMethod": "userset",
      "description": "가장 최근 로그인한 날짜 및 시간",
      "tag": "인게이지먼트"
    },
    {
      "propertyName": "favorite_tracks",
      "propertyAlias": "선호 트랙",
      "propertyType": "list",
      "updateMethod": "useruniqappend",
      "description": "자주 플레이하는 트랙 ID 목록",
      "tag": "소셜"
    }
  ]
}
```

---

## 중요 체크리스트

### ✅ 제출 전 확인사항

- [ ] 모든 카테고리(프로필, 성장, 재화, 활동, 소셜)가 포함되었는가?
- [ ] 업데이트 방식이 속성의 특성에 맞게 선택되었는가?
- [ ] 이벤트에서 업데이트될 속성들이 정의되었는가?
- [ ] 태그가 일관되게 분류되었는가?
- [ ] 설명에 단위, Enum 값, 범위가 명시되었는가?

---

이제 위 가이드라인을 바탕으로 1~2단계에서 정의한 이벤트들을 고려하여
유저 데이터 속성을 설계해주세요.
