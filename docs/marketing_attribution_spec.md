# 마케팅 어트리뷰션 데이터 명세

## 개요

광고 및 마케팅 어트리뷰션 데이터는 **고정된 스키마**를 가지며, data-generator에서 자동으로 생성합니다.
AI는 이 스키마를 수정하지 않고, 각 속성의 **값만 생성**합니다.

---

## 1. 유저 속성 (User Properties)

### te_ads_object (Adjust 어트리뷰션 정보)

사용자의 최초 유입 광고 정보를 저장하는 **object 타입** 유저 속성

| 속성 이름                     | 속성 별칭          | 데이터 유형 | 설명                                               |
| ----------------------------- | ------------------ | ----------- | -------------------------------------------------- |
| `te_ads_object`               | `Adjust 정보`      | `object`    | 사용자의 최초 유입 광고 정보                       |
| `te_ads_object.media_source`  | `채널`             | `string`    | 광고 매체 (예: google, facebook, apple_search_ads) |
| `te_ads_object.campaign_name` | `광고 캠페인 이름` | `string`    | 캠페인 이름 (예: summer_promotion_2024)            |
| `te_ads_object.ad_group_name` | `광고 그룹 이름`   | `string`    | 광고 그룹 이름 (예: tier1_countries)               |
| `te_ads_object.ad_name`       | `광고 이름`        | `string`    | 광고 소재 이름 (예: hero_banner_v2)                |

**업데이트 방식:** `usersetonce` (최초 설치 시 1회만 설정)

---

## 2. 이벤트 (Events)

### 2.1. install (앱 설치)

사용자가 앱을 최초로 설치했을 때 발생하는 이벤트

#### 이벤트 정보

- **이벤트 이름:** `install`
- **이벤트 별칭:** `앱 설치`
- **이벤트 설명:** `사용자가 앱을 최초로 설치했을 때`
- **이벤트 태그:** `마케팅`

#### 이벤트 속성

| 속성 이름              | 속성 별칭           | 데이터 유형 | 설명                                          |
| ---------------------- | ------------------- | ----------- | --------------------------------------------- |
| `activity_kind`        | `활동 유형`         | `string`    | Adjust 활동 유형 (보통 "install")             |
| `adgroup_name`         | `광고 그룹 이름`    | `string`    | 광고 그룹 이름                                |
| `app_id`               | `앱 ID`             | `string`    | 앱 식별자 (Bundle ID / Package name)          |
| `app_name`             | `앱 이름`           | `string`    | 앱 이름                                       |
| `app_version`          | `앱 버전`           | `string`    | 설치된 앱 버전                                |
| `campaign_name`        | `캠페인 이름`       | `string`    | 광고 캠페인 이름                              |
| `country`              | `국가`              | `string`    | 설치 국가 코드 (ISO 3166-1 alpha-2)           |
| `created_at_milli`     | `생성 시각`         | `string`    | Unix timestamp (milliseconds)                 |
| `creative_name`        | `소재 이름`         | `string`    | 광고 소재 이름                                |
| `network_name`         | `광고 네트워크`     | `string`    | 광고 네트워크 이름 (예: Google Ads, Facebook) |
| `os_name`              | `운영체제`          | `string`    | 운영체제 (ios, android)                       |
| `publisher_parameters` | `퍼블리셔 파라미터` | `string`    | 추가 파라미터 (JSON string)                   |
| `ta_account_id`        | `계정 ID`           | `string`    | 사용자 계정 ID                                |
| `ta_distinct_id`       | `고유 ID`           | `string`    | 디바이스 고유 ID                              |
| `timezone`             | `타임존`            | `string`    | 사용자 타임존                                 |

#### te_ads_object (광고 상세 정보) - object 타입

| 속성 이름                     | 속성 별칭        | 데이터 유형 | 설명                    |
| ----------------------------- | ---------------- | ----------- | ----------------------- |
| `te_ads_object`               | `광고 정보`      | `object`    | 광고 상세 정보 객체     |
| `te_ads_object.ad_account_id` | `광고 계정 ID`   | `string`    | 광고 계정 ID            |
| `te_ads_object.ad_group_id`   | `광고 그룹 ID`   | `string`    | 광고 그룹 ID            |
| `te_ads_object.ad_group_name` | `광고 그룹 이름` | `string`    | 광고 그룹 이름          |
| `te_ads_object.ad_id`         | `광고 ID`        | `string`    | 광고 ID                 |
| `te_ads_object.ad_name`       | `광고 이름`      | `string`    | 광고 소재 이름          |
| `te_ads_object.agency`        | `대행사`         | `string`    | 광고 대행사 이름        |
| `te_ads_object.app_id`        | `앱 ID`          | `string`    | 앱 식별자               |
| `te_ads_object.app_name`      | `앱 이름`        | `string`    | 앱 이름                 |
| `te_ads_object.campaign_id`   | `캠페인 ID`      | `string`    | 캠페인 ID               |
| `te_ads_object.campaign_name` | `캠페인 이름`    | `string`    | 캠페인 이름             |
| `te_ads_object.clicks`        | `클릭 수`        | `number`    | 광고 클릭 수            |
| `te_ads_object.conversions`   | `전환 수`        | `number`    | 전환 수                 |
| `te_ads_object.cost`          | `광고비`         | `number`    | 광고 비용               |
| `te_ads_object.country`       | `국가`           | `string`    | 국가 코드               |
| `te_ads_object.currency`      | `통화`           | `string`    | 통화 코드 (KRW, USD 등) |
| `te_ads_object.impressions`   | `노출 수`        | `number`    | 광고 노출 수            |
| `te_ads_object.installs`      | `설치 수`        | `number`    | 앱 설치 수              |
| `te_ads_object.media_source`  | `매체`           | `string`    | 광고 매체               |
| `te_ads_object.placement`     | `지면`           | `string`    | 광고 게재 위치          |
| `te_ads_object.platform`      | `플랫폼`         | `string`    | 플랫폼 (ios, android)   |
| `te_ads_object.revenue`       | `매출`           | `number`    | 매출액                  |

---

### 2.2. adjust_ad_revenue (광고 매출)

사용자가 인앱 광고를 시청하여 발생한 광고 수익 이벤트

#### 이벤트 정보

- **이벤트 이름:** `adjust_ad_revenue`
- **이벤트 별칭:** `광고 수익`
- **이벤트 설명:** `사용자가 인앱 광고를 시청하여 발생한 광고 수익`
- **이벤트 태그:** `수익화`

#### 이벤트 속성

`install` 이벤트의 모든 속성 포함 + 추가 속성:

| 속성 이름            | 속성 별칭       | 데이터 유형 | 설명                                      |
| -------------------- | --------------- | ----------- | ----------------------------------------- |
| `ad_revenue_network` | `광고 네트워크` | `string`    | 광고 수익 네트워크 (예: admob, unity_ads) |
| `ad_revenue_unit`    | `광고 유닛`     | `string`    | 광고 유닛 ID                              |
| `currency`           | `통화`          | `string`    | 수익 통화 코드 (USD, KRW 등)              |
| `memberid`           | `회원 ID`       | `string`    | 내부 회원 ID                              |
| `revenue`            | `수익`          | `number`    | 광고 수익 금액                            |

---

## 3. AI 생성 가이드

### ✅ AI가 해야 할 일

**값 생성만 수행:**

1. `media_source`: 서비스에 맞는 광고 채널 선택 (google, facebook, apple_search_ads, tiktok 등)
2. `campaign_name`: 산업/시나리오에 맞는 캠페인 이름 생성 (예: summer_sale_2024, new_user_acquisition)
3. `ad_group_name`: 타겟팅 전략에 맞는 그룹 이름 (예: tier1_countries, whale_users)
4. `ad_name`: 광고 소재 이름 (예: hero_banner_v2, video_ad_30sec)
5. `network_name`: 광고 네트워크 이름
6. `ad_revenue_network`: 광고 수익 네트워크 (admob, unity_ads, ironsource 등)
7. `ad_revenue_unit`: 광고 유닛 이름 (rewarded_video, interstitial, banner 등)

### ❌ AI가 하지 말아야 할 일

1. **속성 추가/삭제 금지**: 위에 정의된 속성 외에는 추가하지 마세요
2. **속성 이름 변경 금지**: 정확히 동일한 이름 사용
3. **데이터 타입 변경 금지**: string, number, object 타입 준수
4. **구조 변경 금지**: object 타입의 점(`.`) 표기법 구조 유지

---

## 4. 생성 예시

### 레이싱 게임 예시

**유저 속성 값:**

```json
{
  "te_ads_object": {
    "media_source": "google",
    "campaign_name": "racing_game_launch_kr",
    "ad_group_name": "hardcore_gamers_tier1",
    "ad_name": "drift_action_video_15sec"
  }
}
```

**install 이벤트 값:**

```json
{
  "campaign_name": "racing_game_launch_kr",
  "adgroup_name": "hardcore_gamers_tier1",
  "creative_name": "drift_action_video_15sec",
  "network_name": "Google Ads",
  "te_ads_object": {
    "media_source": "google",
    "campaign_name": "racing_game_launch_kr",
    "ad_group_name": "hardcore_gamers_tier1",
    "ad_name": "drift_action_video_15sec",
    "placement": "youtube_instream"
  }
}
```

**adjust_ad_revenue 이벤트 값:**

```json
{
  "ad_revenue_network": "admob",
  "ad_revenue_unit": "rewarded_video_after_race",
  "revenue": 0.05,
  "currency": "USD"
}
```

---

## 5. 구현 위치

- **Excel 생성**: `excel-schema-generator`에서 스키마만 생성 (구조 + 설명)
- **값 생성**: `data-generator`에서 실제 광고 어트리뷰션 데이터 값 생성
- **데이터 전송**: `te-formatter.ts`에서 ThinkingEngine 형식으로 변환

---

## 6. 중요 사항

- 임의로 수정하면 어트리뷰션 데이터가 깨집니다
- 새로운 광고 플랫폼을 추가하려면 `media_source` 값만 추가하세요
