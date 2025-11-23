# ThinkingEngine 데이터 규칙 요약

> 원본: `데이터 규칙.pdf`
> 작성일: 2025-11-15

## 1. 데이터 구조 핵심 원칙

### 1.1 JSON 데이터는 두 부분으로 구성

```
헤더 (Header) - Root Level
└─ 메타데이터: # 으로 시작하는 필수 필드들

본문 (Content) - properties 객체
└─ 실제 데이터: 이벤트 속성 또는 유저 속성
```

### 1.2 Root Level 필드 (메타데이터)

**오직 다음 필드만 Root Level에 위치:**

| 필드 | 필수 여부 | 설명 |
|------|----------|------|
| `#account_id` | 선택* | 로그인 유저 ID |
| `#distinct_id` | 선택* | 비로그인 유저 ID (기기 ID) |
| `#time` | **필수** | 이벤트 발생 시간 (yyyy-MM-dd HH:mm:ss.SSS) |
| `#type` | **필수** | 데이터 유형 (track, user_set 등) |
| `#event_name` | 조건부** | 이벤트 이름 (#type=track일 때만) |
| `#ip` | 선택 | 유저 IP 주소 |
| `#uuid` | 선택 | 데이터 고유 식별자 (중복 제거용) |

\* `#account_id`와 `#distinct_id` 중 최소 하나는 필수
\** `#type`이 `track`일 때만 필수

### 1.3 ⚠️ **중요: Preset Properties 위치**

```
⚠️ 위에 나열된 항목 외, # 로 시작하는 모든 속성은 properties 내부로 이동해야 합니다.
```

**properties 내부에 포함되어야 하는 # 속성들:**
- `#os`, `#os_version`
- `#model`, `#device_id`, `#manufacturer`
- `#carrier`, `#network_type`
- `#country`, `#province`, `#city`
- `#browser`, `#browser_version`
- `#app_version`, `#bundle_id`
- 기타 모든 # 으로 시작하는 preset 속성

---

## 2. 올바른 데이터 구조 예시

### 2.1 Track 이벤트 (올바른 형식)

```json
{
  "#account_id": "ABCDEFG-123-abc",
  "#distinct_id": "F53A58ED-E5DA-4F18-B082-7E1228746E88",
  "#type": "track",
  "#ip": "192.168.171.111",
  "#uuid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "#time": "2017-12-18 14:37:28.527",
  "#event_name": "purchase",
  "properties": {
    "#os": "Android",
    "#os_version": "11",
    "#carrier": "SKT",
    "#device_id": "device-uuid-123",
    "#country": "South Korea",
    "item_id": "sword_123",
    "item_price": 1000,
    "user_level": 25
  }
}
```

### 2.2 User_set 이벤트 (올바른 형식)

```json
{
  "#account_id": "ABCDEFG-123-abc",
  "#distinct_id": "F53A58ED-E5DA-4F18-B082-7E1228746E88",
  "#type": "user_set",
  "#uuid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "#time": "2017-12-18 14:37:28.527",
  "properties": {
    "#ip": "192.168.171.111",
    "user_name": "John",
    "user_email": "john@example.com",
    "user_segment": "VIP",
    "user_level": 25
  }
}
```

---

## 3. #type 값 설명

| 값 | 설명 | #event_name 필요 |
|----|------|------------------|
| `track` | 이벤트 테이블에 행동 기록 | ✅ 필수 |
| `user_set` | 유저 속성 덮어쓰기 | ❌ 불필요 |
| `user_setOnce` | 유저 속성 초기화 (기존 값 있으면 무시) | ❌ 불필요 |
| `user_add` | 숫자형 속성 누적 계산 | ❌ 불필요 |
| `user_unset` | 속성 값 비우기 (NULL) | ❌ 불필요 |
| `user_del` | 유저 삭제 | ❌ 불필요 |
| `user_append` | 리스트 속성에 요소 추가 | ❌ 불필요 |
| `user_uniq_append` | 리스트 속성에 요소 추가 + 중복 제거 | ❌ 불필요 |

---

## 4. 데이터 유형 및 제한

### 4.1 속성 데이터 유형

| JSON 유형 | TE 유형 | 예시 | 제한사항 |
|-----------|---------|------|----------|
| Number | Number | 123, 1.23 | -9E15 ~ 9E15 |
| String | Text | "ABC", "Seoul" | 최대 2KB |
| String | Time | "2019-01-01 00:00:00" | yyyy-MM-dd HH:mm:ss[.SSS] |
| Boolean | Boolean | true, false | - |
| Array(String) | List | ["a","1","true"] | 최대 500개 요소, 각 255바이트 |
| Object | Object | {name: "Liu Bei", level: 22} | 최대 100개 하위 속성 |
| Array(Object) | Object group | [{name: "A"}, {name: "B"}] | 최대 500개 객체 |

### 4.2 속성 유형 규칙

- **속성의 데이터 유형은 처음 수신한 값의 유형으로 고정됩니다**
- 이후 다른 유형의 데이터가 들어오면 해당 속성은 무시됩니다 (null 처리)
- TE는 유형 호환 변환을 자동으로 수행하지 않습니다

---

## 5. 명명 규칙

### 5.1 이벤트 이름 (#event_name)

- ✅ 알파벳으로 시작
- ✅ 알파벳(대소문자), 숫자, 밑줄(_)만 사용
- ✅ 최대 50자
- ❌ 공백 사용 불가
- ❌ 한자, 특수문자 사용 불가

**올바른 예:** `purchase_complete`, `app_start`, `level_up_5`

**잘못된 예:** `구매완료`, `purchase complete`, `123_event`

### 5.2 속성 이름 (key)

- ✅ 알파벳으로 시작
- ✅ 알파벳(대소문자 구분 없음), 숫자, 밑줄(_)만 사용
- ✅ 최대 50자
- ❌ 공백 사용 불가
- ❌ `#`로 시작하는 이름은 TE 미리 정의된 속성만 허용

---

## 6. 데이터 제한사항

### 6.1 개수 제한

| 항목 | 권장 상한 | 시스템 상한 |
|------|----------|------------|
| 이벤트 유형 | 100 | 500 |
| 이벤트 속성 | 300 | 1000 |
| 유저 속성 | 100 | 500 |

### 6.2 ID 길이 제한

- 버전 3.1 이전: 최대 64자
- 버전 3.1 이후: 최대 128자

### 6.3 데이터 수신 기간

- **서버 기준:** 3년 전 ~ 3일 후 데이터만 수신
- **클라이언트 기준:** 10일 전 ~ 3일 후 데이터만 수신

---

## 7. 자주 발생하는 오류

### 7.1 "properties의 형식이 표준 JSONObject가 아닙니다"

**원인:** Preset Properties(#os, #carrier 등)가 root level에 있음

**해결:**
```json
// ❌ 잘못된 형식
{
  "#type": "track",
  "#os": "Android",        // root에 있으면 안됨!
  "properties": { ... }
}

// ✅ 올바른 형식
{
  "#type": "track",
  "properties": {
    "#os": "Android",      // properties 안에 있어야 함!
    ...
  }
}
```

### 7.2 속성이 수집되지 않음

**원인:**
1. 속성 이름이 명명 규칙을 위반 (한자, 공백 포함)
2. 속성 유형이 기존 저장된 유형과 불일치
3. `#`로 시작하는 사용자 정의 속성 사용

### 7.3 데이터가 수신되지 않음

**체크리스트:**
- [ ] JSON 형식이 올바른가?
- [ ] 한 줄에 하나의 JSON인가?
- [ ] 필수 필드(#account_id or #distinct_id, #type, #time)가 모두 포함되었는가?
- [ ] #type=track일 때 #event_name이 포함되었는가?
- [ ] #event_name이 명명 규칙을 준수하는가?
- [ ] properties가 `#`로 시작하지 않는가?

---

## 8. 중요 권장사항

1. **UTF-8 인코딩 사용**
   - 인코딩 오류로 인한 깨짐 방지

2. **속성 이름 대소문자**
   - 대소문자 구분하지 않음
   - 밑줄(_)을 분리 기호로 사용 권장

3. **유저 속성 변경 주의**
   - 유저 속성은 고정적인 특성을 나타냄
   - 자주 변동되는 값은 이벤트 속성으로 처리

4. **테스트 프로젝트 사용**
   - 정식 데이터 전송 전 충분한 검증 필요

5. **데이터 유형 일관성**
   - 전송 전 속성 유형 검증 로직 구현 권장
   - 유형 불일치 시 데이터 손실 발생

---

## 9. 체크리스트

데이터 전송 전 반드시 확인:

- [ ] Root Level에는 메타데이터 7개 필드만 존재
- [ ] 모든 Preset Properties(#os, #carrier 등)는 properties 안에 위치
- [ ] 모든 Custom Properties는 properties 안에 위치
- [ ] #event_name은 알파벳으로 시작하고 규칙 준수
- [ ] 속성 이름은 알파벳으로 시작하고 규칙 준수
- [ ] 속성 유형이 일관성 있게 유지
- [ ] JSON은 한 줄에 하나씩 작성 (JSONL 형식)
- [ ] UTF-8 인코딩 사용
