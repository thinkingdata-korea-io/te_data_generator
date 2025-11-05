# 기술 사양서 - 이벤트 트래킹 데이터 생성기

## 프로젝트 개요

**프로젝트명**: ThinkingEngine용 이벤트 트래킹 데이터 생성기
**목적**: Excel 정의 스키마 기반으로 현실적인 이벤트 트래킹 데이터를 생성하고 LogBus2를 통해 ThinkingEngine으로 전송
**적용 분야**: 게임, 커머스, 교육, 헬스케어 등 모든 서비스
**기술**: Next.js 14, TypeScript, OpenAI/Anthropic API

## 시스템 요구사항

### 런타임 환경
- Node.js 18.x 이상
- npm 9.x 이상
- macOS, Linux, 또는 Windows (LogBus2용 WSL)

### 외부 종속성
- OpenAI API 또는 Anthropic Claude API (AI 데이터 생성용)
- LogBus2 바이너리 (데이터 전송용)
- APP_ID를 가진 ThinkingEngine 계정
- **Faker.js** (@faker-js/faker) - 현실적인 더미 데이터 생성

## 데이터 모델 명세

### 입력 스키마 (Excel 파일)

여러 시트를 가진 Excel 구조 예상:

#### Sheet 1: "Events" (이벤트 정의)
| 컬럼 | 타입 | 설명 | 예시 |
|--------|------|-------------|---------|
| event_name | string | 이벤트 식별자 | `purchase_complete`, `content_view` |
| event_name_kr | string | 한국어 표시명 | `구매 완료`, `콘텐츠 조회` |
| description | string | 이벤트 설명 | `사용자가 구매를 완료했을 때` |
| category | string | 이벤트 카테고리 | `conversion`, `engagement`, `onboarding` |
| funnel_group | string | 속한 퍼널 | `purchase_flow`, `onboarding` |
| trigger_condition | string | 이벤트 발생 시점 | `User completes checkout` |

#### Sheet 2: "Properties" (속성 정의)
| 컬럼 | 타입 | 설명 | 예시 |
|--------|------|-------------|---------|
| property_name | string | 속성 키 | `product_id`, `amount` |
| property_name_kr | string | 한국어명 | `상품 ID`, `금액` |
| applies_to_events | string[] | 이 속성을 사용하는 이벤트 | `purchase_complete, cart_add` |
| data_type | string | TE 데이터 타입 | `string`, `number`, `boolean`, `time` |
| example_values | string | 샘플 값 (쉼표 구분) | `prod_001, prod_002, prod_003` |
| description | string | 속성 설명 | `구매한 상품의 고유 식별자` |

#### Sheet 3: "User_Segments" (유저 세그먼트)
| 컬럼 | 타입 | 설명 | 예시 |
|--------|------|-------------|---------|
| segment_name | string | 유저 타입명 | `whale` |
| percentage | number | 유저 베이스 % | `5` |
| avg_session_per_day | number | 평균 세션 수 | `5` |
| avg_session_duration_min | number | 평균 세션 길이 | `45` |
| characteristics | string (JSON) | 주요 행동 | `{"iap_tendency": "high", "retention": "high"}` |

#### Sheet 4: "Funnels" (이벤트 퍼널)
| 컬럼 | 타입 | 설명 | 예시 |
|--------|------|-------------|---------|
| funnel_name | string | 퍼널 식별자 | `onboarding_flow` |
| step_order | number | 시퀀스 번호 | `1`, `2`, `3` |
| event_name | string | 이 단계의 이벤트 | `tutorial_start` |
| dropout_rate | number | 진행하지 않는 % | `15` |
| avg_time_to_next_sec | number | 다음 단계까지 시간 간격 | `120` |

### 출력 형식 (ThinkingEngine JSON)

#### Track 이벤트 형식
```typescript
interface TrackEvent {
  "#type": "track";
  "#event_name": string;
  "#app_id": string;
  "#account_id": string;          // 유저의 로그인 ID
  "#distinct_id": string;         // 디바이스/세션 ID
  "#event_time": string;          // ISO 8601 형식: "2025-11-05 14:30:25.123"
  "#uuid": string;                // UUID v4

  // 프리셋 속성 (플랫폼 의존적)
  "#ip"?: string;
  "#country"?: string;
  "#country_code"?: string;
  "#os"?: string;
  "#device_id"?: string;
  "#device_model"?: string;
  // ... (Preset Properties 문서 참조)

  "properties": {
    [key: string]: string | number | boolean | string[] | object;
  };
}
```

#### 유저 속성 업데이트 이벤트
```typescript
interface UserSetEvent {
  "#type": "user_set" | "user_add" | "user_set_once" | "user_append";
  "#app_id": string;
  "#account_id": string;
  "#distinct_id": string;
  "#event_time": string;
  "properties": {
    [key: string]: string | number | boolean | string[];
  };
}
```

## 핵심 모듈

### 1. Excel 스키마 파서

**모듈**: `src/lib/excel/schema-reader.ts`

**책임**:
- Excel 파일 읽기 및 파싱
- 스키마 구조 검증
- 내부 스키마 형식으로 변환
- 파싱된 스키마 캐싱

**주요 함수**:
```typescript
class ExcelSchemaReader {
  async readSchema(filePath: string): Promise<GameEventSchema>
  validateSchema(schema: GameEventSchema): ValidationResult
  cacheSchema(schema: GameEventSchema, cacheKey: string): void
  getCachedSchema(cacheKey: string): GameEventSchema | null
}
```

**종속성**: `xlsx` 또는 `exceljs`

### 2. AI 데이터 범위 생성기

**모듈**: `src/lib/generators/ai-data-generator.ts`

**책임**:
- 이벤트 스키마 및 서비스 컨텍스트 분석
- 유저 세그먼트별 현실적인 데이터 범위 생성
- 퍼널 로직 및 이벤트 종속성 생성
- 시간 패턴 정의

**AI 프롬프트 템플릿** (동적으로 생성):
```
당신은 {산업} 도메인의 데이터 분석 전문가입니다.

사용자 시나리오:
{프론트엔드에서 입력받은 시나리오 텍스트}

서비스 특징/비고:
{프론트엔드에서 입력받은 비고}

DAU: {DAU}
날짜 범위: {시작일} ~ {종료일}

다음 이벤트 스키마가 Excel에서 읽혀졌습니다:

이벤트 목록:
- {event_name}: {description}
  속성: {property_name} ({data_type}), ...

**중요**: 다음 속성들은 Faker.js가 자동으로 생성하므로 범위를 정의하지 마세요:
- 이름 관련: user_name, nickname, full_name 등 → Faker.js person.fullName()
- 주소 관련: address, location, city, street 등 → Faker.js location.*
- 연락처: email, phone 등 → Faker.js internet.email(), phone.number()
- 상품명: product_name, item_name 등 → Faker.js commerce.productName()

AI는 **비즈니스 로직 중심 속성만** 범위를 정의하세요:
- 금액, 가격, 수량
- 상품 ID, 카테고리
- 이벤트 발생 패턴, 퍼널 전환율

위 정보를 바탕으로 다음을 결정해주세요:

1. **유저 세그먼트 비율** (자동 결정):
   - 시나리오에 맞는 세그먼트 유형과 비율 정의
   - 예: 신규(10%), 핵심(15%), 일반(50%), 라이트(25%)
   - 세그먼트별 행동 특성 (접속 빈도, 세션 길이 등)

2. **이벤트 의존성 및 퍼널**:
   - 이벤트 간 선행 조건 추론
   - 논리적 순서 및 퍼널 정의
   - 예: app_start → tutorial_start → tutorial_complete

3. **세그먼트별 데이터 범위**:
   - 각 속성에 대한 현실적인 값 범위
   - 세그먼트별 차별화된 행동 패턴

4. **시간 간격 패턴**:
   - 이벤트 간 현실적인 시간 간격
   - 세그먼트별 세션 패턴

출력 형식 (JSON):
{
  "userSegments": {
    "segment_name": {
      "ratio": 0.XX,
      "description": "...",
      "avgSessionsPerDay": X,
      "avgDuration": X,
      "peakHours": [...]
    }
  },
  "dependencies": {
    "event_name": ["prerequisite_event1", ...]
  },
  "dataRanges": {
    "event_name": {
      "property_name": {
        "segment_name": { "min": X, "max": Y, "distribution": "normal" }
      }
    }
  },
  "timingPatterns": {
    "event1 → event2": { "min": X, "max": Y, "unit": "seconds" }
  }
}
```

**주요 함수**:
```typescript
class AIDataGenerator {
  async analyzeAndGenerate(
    schema: ParsedExcelSchema,
    userInputs: {
      scenario: string,      // 자유 텍스트 시나리오
      industry: string,      // 서비스 산업
      notes: string,         // 비고 (서비스 특징 등)
      dau: number,
      dateRange: DateRange
    }
  ): Promise<AIGeneratedConfig>

  private buildDynamicPrompt(
    schema: ParsedExcelSchema,
    userInputs: UserInputs
  ): string

  async inferDependencies(
    events: Event[]
  ): Promise<DependencyGraph>

  async determineUserSegments(
    scenario: string,
    industry: string
  ): Promise<UserSegmentConfig>
}
```

### 3. 유저 시뮬레이터

**모듈**: `src/lib/generators/user-simulator.ts`

**책임**:
- 현실적인 속성을 가진 유저 프로필 생성
- 분포 기반 유저 세그먼트 할당
- 유저 라이프사이클 타임라인 생성
- 이벤트 간 유저 상태 추적

**유저 프로필 구조**:
```typescript
interface UserProfile {
  id: string;                    // user_12345
  accountId: string;             // 로그인 유저용
  distinctId: string;            // 디바이스 ID
  segment: string;               // AI가 결정한 세그먼트 (예: 'new', 'core', 'regular', 'light')

  // 인구통계 (Faker.js + 국가별 로케일)
  country: string;              // 예: "일본", "대한민국", "United States"
  countryCode: string;          // ISO 3166-1 alpha-2
  language: string;             // 국가에 맞는 언어
  timezone: number;             // UTC 오프셋
  locale: string;               // Faker.js 로케일 (ja, ko, en 등)

  // 디바이스 정보
  platform: 'iOS' | 'Android';
  deviceModel: string;          // Faker.js phone.model()
  osVersion: string;

  // 행동 프로필
  sessionPattern: {
    avgSessionsPerDay: number;
    avgSessionDuration: number;
    preferredAccessTimes: number[]; // 하루 중 시간 (0-23)
  };

  // 서비스 이용 상태
  currentLevel: number;           // 서비스별 진행도 (레벨, 티어 등)
  totalUsageTime: number;         // 총 이용 시간
  installDate: Date;
  lastActiveDate: Date;

  // 수익화
  iapPurchaseCount: number;
  totalSpent: number;

  // 속성
  attributes: Map<string, any>;  // 동적 유저 속성
}
```

**주요 함수**:
```typescript
class UserSimulator {
  generateUsers(
    count: number,
    aiSegmentConfig: UserSegmentConfig,  // AI가 결정한 세그먼트 구성
    countryDistribution?: CountryDistribution  // 국가별 유저 비율
  ): UserProfile[]

  assignSegment(aiSegmentConfig: UserSegmentConfig): string

  // Faker.js 활용 - 국가별 현실적 데이터 생성
  createUserProfile(country: string, locale: string): {
    name: string,           // Faker.js person.fullName() with locale
    email: string,          // Faker.js internet.email()
    phone: string,          // Faker.js phone.number() with locale
    deviceModel: string     // Faker.js phone.model()
  }

  createDeviceProfile(platform: string): DeviceProfile

  generateSessionSchedule(
    user: UserProfile,
    days: number,
    aiTimingPatterns: TimingPatterns  // AI가 결정한 시간 패턴
  ): Session[]
}

// 국가별 설정
interface CountryConfig {
  country: string;
  countryCode: string;
  locale: string;        // Faker.js 로케일 (ja, ko, en, zh_CN 등)
  language: string;
  timezone: number;
  ratio: number;         // 전체 유저 중 비율
}

const COUNTRY_CONFIGS: CountryConfig[] = [
  { country: "일본", countryCode: "JP", locale: "ja", language: "ja", timezone: 9, ratio: 0.3 },
  { country: "대한민국", countryCode: "KR", locale: "ko", language: "ko", timezone: 9, ratio: 0.25 },
  { country: "United States", countryCode: "US", locale: "en", language: "en", timezone: -5, ratio: 0.2 },
  { country: "中国", countryCode: "CN", locale: "zh_CN", language: "zh", timezone: 8, ratio: 0.15 },
  { country: "Taiwan", countryCode: "TW", locale: "zh_TW", language: "zh_TW", timezone: 8, ratio: 0.1 }
];
```

### 4. 이벤트 생성기 (Faker.js 통합)

**모듈**: `src/lib/generators/event-generator.ts`

**책임**:
- 퍼널을 따르는 각 유저에 대한 이벤트 생성
- 시간 기반 시퀀싱 적용
- 이벤트 종속성 준수
- **Faker.js 활용 현실적인 속성 값 생성**

**이벤트 생성 알고리즘**:
```typescript
function generateEventsForUser(
  user: UserProfile,
  funnels: FunnelDefinition[],
  dataRanges: DataRanges,
  startDate: Date,
  endDate: Date
): Event[] {
  const events: Event[] = [];
  const sessions = generateSessionSchedule(user, daysBetween(startDate, endDate));

  for (const session of sessions) {
    let currentTime = session.start;
    const sessionEndTime = addMinutes(session.start, session.duration);

    // 첫 세션: 온보딩 퍼널
    if (isFirstSession(user, session)) {
      const onboardingEvents = processFunnel(
        user,
        findFunnel('onboarding'),
        currentTime,
        dataRanges
      );
      events.push(...onboardingEvents);
      currentTime = getLastEventTime(onboardingEvents);
    }

    // 일반 서비스 이용 이벤트
    while (currentTime < sessionEndTime) {
      const nextEvent = selectNextEvent(user, currentTime, dataRanges);
      if (!nextEvent) break;

      events.push(nextEvent);
      currentTime = addSeconds(nextEvent.time, getAverageEventGap(user.segment));

      // 유저 상태 업데이트
      updateUserState(user, nextEvent);
    }
  }

  return events.sort((a, b) => a.time - b.time);
}
```

**주요 함수**:
```typescript
class EventGenerator {
  private faker: Faker;  // 유저 locale에 맞게 설정된 Faker 인스턴스

  generateEventsForUser(
    user: UserProfile,
    schema: GameEventSchema,
    dataRanges: DataRanges,
    dateRange: DateRange
  ): Event[]

  processFunnel(
    user: UserProfile,
    funnel: FunnelDefinition,
    startTime: Date,
    dataRanges: DataRanges
  ): Event[]

  // Faker.js 활용 속성 값 생성
  generatePropertyValue(
    user: UserProfile,
    property: PropertyDefinition,
    dataRanges: DataRanges
  ): any {
    // 1. AI가 정의한 범위 우선 사용
    if (dataRanges[property.name]) {
      return this.generateFromAIRange(dataRanges[property.name], user.segment);
    }

    // 2. Faker.js 폴백 (속성 이름 기반)
    return this.generateFromFaker(property.name, user.locale);
  }

  // Faker.js 폴백 로직
  private generateFromFaker(propertyName: string, locale: string): any {
    const fakerInstance = new Faker({ locale });
    const lowerName = propertyName.toLowerCase();

    // 금액/가격
    if (lowerName.includes('price') || lowerName.includes('amount')) {
      return fakerInstance.finance.amount({ min: 100, max: 10000 });
    }
    // 상품명
    if (lowerName.includes('product') || lowerName.includes('item')) {
      return fakerInstance.commerce.productName();
    }
    // 유저명 (국가별 로케일)
    if (lowerName.includes('name') || lowerName.includes('nickname')) {
      return fakerInstance.person.fullName();  // 일본이면 일본어 이름
    }
    // 주소
    if (lowerName.includes('address') || lowerName.includes('location')) {
      return fakerInstance.location.streetAddress();
    }
    // 기타 - AI에게 위임
    return null;
  }

  applyDropoffLogic(
    user: UserProfile,
    funnel: FunnelDefinition,
    currentStep: number
  ): boolean
}
```

### 5. ThinkingEngine 포맷터

**모듈**: `src/lib/formatters/te-formatter.ts`

**책임**:
- 내부 이벤트를 TE 형식으로 변환
- 필수 시스템 필드 추가
- 각 이벤트에 대한 UUID 생성
- 유저 속성 업데이트 이벤트 생성
- 프리셋 속성 추가

**포맷팅 로직**:
```typescript
class TEFormatter {
  formatTrackEvent(event: InternalEvent, user: UserProfile, appId: string): TrackEvent {
    return {
      "#type": "track",
      "#event_name": event.name,
      "#app_id": appId,
      "#account_id": user.accountId,
      "#distinct_id": user.distinctId,
      "#event_time": formatTETime(event.time), // "2025-11-05 14:30:25.123"
      "#uuid": generateUUID(),
      ...generatePresetProperties(user),
      "properties": event.properties
    };
  }

  formatUserSetEvent(
    user: UserProfile,
    updates: Record<string, any>,
    time: Date,
    appId: string
  ): UserSetEvent {
    return {
      "#type": "user_set",
      "#app_id": appId,
      "#account_id": user.accountId,
      "#distinct_id": user.distinctId,
      "#event_time": formatTETime(time),
      "properties": updates
    };
  }

  // Faker.js 활용 - 국가별 현실적인 프리셋 속성 생성
  generatePresetProperties(user: UserProfile): PresetProperties {
    const fakerInstance = new Faker({ locale: user.locale });

    return {
      "#ip": this.generateRealisticIP(user.countryCode),  // 국가별 IP 대역
      "#country": user.country,
      "#country_code": user.countryCode,
      "#province": fakerInstance.location.state(),        // 국가별 지역명
      "#city": fakerInstance.location.city(),             // 국가별 도시명
      "#os": user.platform,
      "#device_id": user.distinctId,
      "#device_model": user.deviceModel,                  // Faker.js phone.model()
      "#os_version": user.osVersion,
      "#lib": user.platform === 'iOS' ? 'iOS' : 'Android',
      "#lib_version": "2.8.0",
      "#zone_offset": user.timezone,
      "#network_type": faker.helpers.arrayElement(['WIFI', '4G', '5G', '3G']),
      "#carrier": this.getCarrierByCountry(user.countryCode),  // 국가별 통신사
      // ... 더 많은 프리셋 속성
    };
  }

  // 국가별 현실적인 IP 생성
  private generateRealisticIP(countryCode: string): string {
    // 국가별 실제 IP 대역 (예시)
    const ipRanges: Record<string, string[]> = {
      'JP': ['203.', '210.', '221.'],    // 일본 IP 대역
      'KR': ['211.', '218.', '222.'],    // 한국 IP 대역
      'US': ['108.', '172.', '192.'],    // 미국 IP 대역
      'CN': ['202.', '220.', '123.'],    // 중국 IP 대역
    };
    const prefixes = ipRanges[countryCode] || ['192.'];
    const prefix = faker.helpers.arrayElement(prefixes);
    return `${prefix}${faker.number.int({ min: 0, max: 255 })}.${faker.number.int({ min: 0, max: 255 })}.${faker.number.int({ min: 1, max: 254 })}`;
  }

  // 국가별 통신사
  private getCarrierByCountry(countryCode: string): string {
    const carriers: Record<string, string[]> = {
      'JP': ['NTT DoCoMo', 'SoftBank', 'au', 'Rakuten Mobile'],
      'KR': ['SKT', 'KT', 'LG U+'],
      'US': ['Verizon', 'AT&T', 'T-Mobile', 'Sprint'],
      'CN': ['China Mobile', 'China Unicom', 'China Telecom'],
    };
    const countryCarriers = carriers[countryCode] || ['Unknown'];
    return faker.helpers.arrayElement(countryCarriers);
  }
}
```

### 6. LogBus2 통합

**모듈**: `src/lib/logbus/uploader.ts`

**책임**:
- LogBus2 설정 생성
- JSONL 데이터 파일 작성
- LogBus2 프로세스 시작/중지
- 업로드 진행상황 모니터링

**설정 생성기**:
```typescript
class LogBusUploader {
  generateConfig(appId: string, pushUrl: string, dataPath: string): LogBusConfig {
    return {
      "datasource": [{
        "type": "file",
        "file_patterns": [`${dataPath}/*.jsonl`],
        "app_id": appId,
        "http_compress": "gzip",
        "unit_remove": "day",
        "offset_remove": 7
      }],
      "push_url": pushUrl,
      "cpu_limit": 4
    };
  }

  async writeDataFile(events: TEEvent[], outputPath: string): Promise<void> {
    const jsonLines = events.map(e => JSON.stringify(e)).join('\n');
    await fs.writeFile(outputPath, jsonLines, 'utf-8');
  }

  async startLogBus(configPath: string, logbusPath: string): Promise<void> {
    await execAsync(`cd "${path.dirname(logbusPath)}" && ./logbus start`);
  }

  async monitorProgress(logbusPath: string): Promise<UploadProgress> {
    const output = await execAsync(`cd "${path.dirname(logbusPath)}" && ./logbus progress`);
    return parseProgressOutput(output);
  }
}
```

## API 엔드포인트

### POST `/api/excel/parse`
**목적**: excel-schema-generator/output/ 폴더에서 Excel 파일 선택 및 파싱

**요청**:
```typescript
{
  // 자동으로 최신 Excel 읽기 또는
  filePath?: string  // 특정 파일 경로
}
```

**응답**:
```typescript
{
  schema: ParsedExcelSchema,
  summary: {
    eventCount: number,
    propertyCount: number,
    funnelCount: number
  }
}
```

### POST `/api/generate`
**목적**: AI 분석 + 데이터 생성 (Step 2)

**요청**:
```typescript
{
  excelSchema: ParsedExcelSchema,
  userInputs: {
    scenario: string,      // 시나리오 (자유 텍스트)
    dau: number,           // DAU
    industry: string,      // 서비스 산업
    notes: string,         // 비고 (서비스 특징)
    dateRange: {
      start: string,  // ISO 날짜
      end: string
    }
  },
  config: {
    appId: string,
    apiKey: string  // Claude or OpenAI
  }
}
```

**응답** (스트리밍):
```typescript
{
  progress: {
    stage: 'ai_analysis' | 'user_cohort_generation' | 'event_generation' | 'file_writing',
    percent: number,
    message: string,
    details?: {
      // AI 분석 단계
      aiSegments?: UserSegmentConfig,
      aiDependencies?: DependencyGraph,
      // 생성 단계
      currentDate?: string,
      eventsGenerated?: number
    }
  },
  data?: {
    aiConfig: AIGeneratedConfig,
    outputPath: string,
    metadata: {
      totalUsers: number,
      totalEvents: number,
      segmentDistribution: Record<string, number>,
      dateFiles: string[]  // YYYY-MM-DD.jsonl 파일 목록
    }
  }
}
```

### POST `/api/logbus/start`
**목적**: LogBus2 시작 및 전송 (Step 3)

**요청**:
```typescript
{
  dataFolderPath: string,  // output/data/run_XXX/
  appId: string,
  pushUrl: string,
  logbusPath?: string
}
```

**응답** (스트리밍):
```typescript
{
  status: 'configuring' | 'starting' | 'uploading' | 'completed' | 'error',
  progress: {
    filesProcessed: number,
    totalFiles: number,
    bytesUploaded: number,
    totalBytes: number,
    currentFile?: string
  },
  message: string
}
```

### POST `/api/logbus/stop`
**목적**: LogBus2 종료 (Step 4)

**요청**:
```typescript
{
  logbusPath?: string
}
```

**응답**:
```typescript
{
  success: boolean,
  message: string
}
```

## 프론트엔드 컴포넌트

### 1. MainInputForm
**경로**: `src/components/MainInputForm.tsx`

**기능**:
- **시나리오 입력** (자유 텍스트 textarea)
- **DAU 슬라이더**
- **서비스 산업 선택** (게임, 커머스, 교육, 헬스케어 등)
- **비고 입력** (서비스 특징 등, 자유 텍스트)
- **날짜 범위 선택기**
- **[⚙️ 설정] 버튼** (모달):
  - APP_ID
  - Receiver URL
  - Claude API Key
  - OpenAI API Key

### 2. DataPreview
**경로**: `src/components/DataPreview.tsx`

**기능**:
- 생성된 이벤트의 테이블 형태 표시
- 페이지네이션 (페이지당 100개 이벤트)
- 컬럼 필터링 및 정렬
- JSON 뷰 토글
- JSONL로 내보내기 버튼

### 3. WorkflowButtons
**경로**: `src/components/WorkflowButtons.tsx`

**기능**:
- **[1단계: Excel 생성]** 버튼 (외부 프로그램 트리거)
- **[2단계: 데이터 생성]** 버튼 (Excel 읽기 + AI 분석 + 생성)
- **[3단계: 전송 시작]** 버튼 (LogBus2 시작)
- **[4단계: 종료]** 버튼 (LogBus2 종료)
- 각 단계별 활성화/비활성화 상태 관리
- 진행 상태 표시

### 4. ProgressMonitor
**경로**: `src/components/ProgressMonitor.tsx`

**기능**:
- Excel 파싱 진행 상태
- AI 분석 진행 상태 (세그먼트 결정, 의존성 추론 등)
- 데이터 생성 진행 상태
- LogBus2 전송 진행 표시기
- 로그 뷰어
- 성공/오류 알림

## 상태 관리

Context API와 함께 React hooks 사용:

```typescript
interface AppState {
  // 사용자 입력
  userInputs: {
    scenario: string;      // 시나리오 (자유 텍스트)
    dau: number;           // DAU
    industry: string;      // 서비스 산업
    notes: string;         // 비고 (서비스 특징)
    dateRange: DateRange;  // 날짜 범위
  };

  // 워크플로우 상태
  workflow: {
    currentStep: 1 | 2 | 3 | 4;
    step1: { status: 'idle' | 'running' | 'completed' | 'error' };  // Excel 생성
    step2: { status: 'idle' | 'running' | 'completed' | 'error' };  // 데이터 생성
    step3: { status: 'idle' | 'running' | 'completed' | 'error' };  // 전송
    step4: { status: 'idle' | 'running' | 'completed' | 'error' };  // 종료
  };

  // Excel & AI 분석
  parsedExcel: ParsedExcelSchema | null;
  aiGeneratedConfig: {
    userSegments: UserSegmentConfig;
    dependencies: DependencyGraph;
    dataRanges: DataRanges;
    timingPatterns: TimingPatterns;
  } | null;

  // 생성된 데이터
  generatedData: {
    events: TEEvent[];
    filePath: string;
    totalCount: number;
    metadata: {
      userCount: number;
      segmentDistribution: Record<string, number>;
      funnelConversions: Record<string, number>;
    };
  } | null;

  // LogBus2 상태
  logbusStatus: {
    isRunning: boolean;
    progress: UploadProgress;
    error: string | null;
  };

  // 설정 (모달)
  config: {
    appId: string;
    pushUrl: string;
    claudeApiKey: string;
    openaiApiKey: string;
    logbusPath: string;
  };
}

const AppContext = createContext<{
  state: AppState;
  actions: {
    updateUserInputs: (inputs: Partial<UserInputs>) => void;
    triggerExcelGeneration: () => Promise<void>;      // Step 1
    startDataGeneration: () => Promise<void>;         // Step 2
    startTransmission: () => Promise<void>;           // Step 3
    stopLogBus: () => Promise<void>;                  // Step 4
    updateConfig: (config: Partial<AppConfig>) => void;
  };
}>(null);
```

## 에러 처리

### 에러 카테고리

1. **스키마 에러**
   - 유효하지 않은 Excel 형식
   - 필수 시트 누락
   - 유효하지 않은 데이터 타입
   - 순환 퍼널 종속성

2. **생성 에러**
   - AI API 실패
   - 유효하지 않은 데이터 범위
   - 메모리 오버플로 (너무 많은 이벤트 요청)

3. **업로드 에러**
   - LogBus2를 찾을 수 없음
   - 유효하지 않은 APP ID 또는 URL
   - 네트워크 실패
   - 파일 권한 문제

### 에러 응답 형식
```typescript
interface APIError {
  code: string;          // 예: "SCHEMA_INVALID"
  message: string;       // 유저 친화적 메시지
  details?: any;         // 디버깅을 위한 기술 세부사항
  recoverable: boolean;  // 유저가 재시도 가능한가?
  suggestion?: string;   // 다음에 무엇을 해야 하는지
}
```

## 성능 최적화

### 목표
- Excel 파싱: 1000행에 대해 2초 이내
- 10,000개 이벤트 생성: 30초 이내
- 50,000개 이벤트 업로드: 5분 이내
- 메모리 사용: 100,000개 이벤트에 대해 1GB 미만

### 최적화 전략

1. **배치 처리**: 1000명씩 유저 배치 처리
2. **스트리밍**: 메모리에 보관하지 않고 파일로 이벤트 스트리밍
3. **캐싱**: 유사한 스키마에 대한 AI 생성 범위 캐싱
4. **병렬 처리**: 이벤트 생성을 위한 워커 스레드 사용
5. **지연 로딩**: 미리보기에 필요한 데이터만 로드

## 테스트 전략

### 단위 테스트
- 다양한 형식의 Excel 파서
- 다양한 퍼널을 가진 이벤트 생성기
- TE 포맷터 검증
- 시간 계산 유틸리티

### 통합 테스트
- 스키마에서 JSONL까지 엔드투엔드
- LogBus2 설정 및 실행
- API 엔드포인트 응답

### 테스트 데이터
- 다양한 서비스 타입에 대한 샘플 Excel 파일 (게임, 커머스, 교육 등)
- 알려진 정상 TE 형식 예시
- 엣지 케이스 (빈 퍼널, 단일 유저 등)

## 설정 관리

### 환경 변수
```bash
# .env.local
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

TE_APP_ID=your_default_app_id
TE_RECEIVER_URL=https://te-receiver-naver.thinkingdata.kr/

LOGBUS_PATH=./logbus 2/logbus
LOGBUS_CPU_LIMIT=4

NODE_ENV=development
NEXT_PUBLIC_MAX_USERS=10000
NEXT_PUBLIC_MAX_EVENTS=100000
```

## 배포

### 개발
```bash
npm run dev
```

### 프로덕션 빌드
```bash
npm run build
npm run start
```

### Docker (선택사항)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

## 모니터링 및 로깅

### 애플리케이션 로그
- 스키마 파싱 결과
- AI 생성 요청/응답
- 이벤트 생성 통계
- 업로드 진행상황
- 에러 및 경고

### 추적할 메트릭
- 초당 생성된 이벤트
- AI API 지연시간
- LogBus2 업로드 속도
- 메모리 사용량
- 타입별 에러율

## 보안 고려사항

### 입력 검증
- 파일 업로드 크기 제한 (최대 10MB)
- 인젝션에 대한 스키마 검증
- API 엔드포인트에 대한 속도 제한
- 유저 제공 시나리오/비고 텍스트 살균

### 데이터 프라이버시
- 실제 유저 데이터 없음
- 합성 데이터만
- 로컬 처리 (외부 데이터 저장소 없음)
- 환경 변수에 저장된 API 키

## 문서 요구사항

### 유저 문서
- [ ] 시작 가이드
- [ ] Excel 스키마 템플릿 가이드
- [ ] UI 연습
- [ ] 문제 해결 가이드

### 개발자 문서
- [ ] 아키텍처 개요 (ARCHITECTURE_KR.md) ✅
- [ ] 기술 사양서 (이 파일) ✅
- [ ] API 참조
- [ ] 기여 가이드

## 성공 기준

### 기능적
- [ ] 5가지 다른 서비스(게임, 커머스, 교육 등) Excel 스키마를 성공적으로 파싱
- [ ] 60초 이내에 50,000개 이벤트 생성
- [ ] 에러 없이 ThinkingEngine으로 데이터 업로드
- [ ] 데이터가 TE 검증 체크 통과

### 비기능적
- [ ] 유저가 5분 이내에 전체 흐름 완료 가능
- [ ] 시스템이 크래시 없이 100,000개 이벤트 처리
- [ ] 모든 실패 케이스에 대한 명확한 에러 메시지
- [ ] 모바일 반응형 UI

## 타임라인 추정

| 단계 | 기간 | 산출물 |
|-------|----------|--------------|
| Phase 1: 기초 작업 | 3-4일 | 프로젝트 설정, Excel 파서, 타입 |
| Phase 2: 데이터 생성 | 4-5일 | AI 생성기, 유저 시뮬레이터, 이벤트 생성기 |
| Phase 3: TE 통합 | 3-4일 | 포맷터, 프리셋 속성, 검증 |
| Phase 4: LogBus2 & UI | 4-5일 | 업로드 시스템, 프론트엔드 컴포넌트 |
| Phase 5: 테스트 & 다듬기 | 3-4일 | 테스트, 버그 수정, 문서 |
| **총계** | **17-22일** | **완전히 작동하는 시스템** |

## 다음 단계

1. 이 기술 사양서 검토 및 승인
2. 초기 Next.js 프로젝트 구조 생성
3. Excel 스키마 파서 구현 (최우선)
4. AI API 통합 설정
5. 유저 시뮬레이터 구현 시작
