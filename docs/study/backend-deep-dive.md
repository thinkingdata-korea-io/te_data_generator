# ThinkingEngine 데이터 생성 플랫폼 - 백엔드 Deep Dive

## 목차
1. [프로젝트 개요](#프로젝트-개요)
2. [시스템 아키텍처](#시스템-아키텍처)
3. [핵심 기능](#핵심-기능)
4. [백엔드 코드 리뷰](#백엔드-코드-리뷰)
5. [데이터베이스 설계](#데이터베이스-설계)
6. [API 엔드포인트](#api-엔드포인트)
7. [성능 최적화](#성능-최적화)
8. [보안 구현](#보안-구현)

---

## 프로젝트 개요

### 🎯 목표
Excel 스키마 파일을 기반으로 AI를 활용해 **현실적인 서비스 이벤트 데이터**를 생성하고, LogBus2를 통해 ThinkingEngine으로 전송하는 **엔터프라이즈 데이터 생성 플랫폼**

### 🛠 기술 스택
- **Backend**: Node.js 20.x + TypeScript 5.4 + Express.js
- **Frontend**: Next.js 14 (App Router) + React + Tailwind CSS + shadcn/ui
- **Database**: PostgreSQL 16 (pg 라이브러리)
- **AI Integration**: Anthropic Claude, OpenAI GPT, Google Gemini
- **Data Transfer**: LogBus2 (바이너리 래퍼)
- **Authentication**: JWT + bcrypt
- **File Processing**: ExcelJS, Multer, Archiver

### ✨ 주요 특징
1. **4단계 워크플로우 시스템**
   - Mode 1: Excel 스키마 자동 생성 (AI 기반)
   - Mode 2: Excel 스키마 업로드 (수동)
   - Mode 3: 데이터 생성 (AI 분석 + 시뮬레이션)
   - Mode 4: LogBus2 전송 (ThinkingEngine)

2. **AI 기반 파일 분석**
   - PDF, 이미지(PNG/JPG), 텍스트 파일 지원
   - Anthropic Claude Vision API 활용
   - 분석 결과를 데이터 생성 컨텍스트로 자동 전달

3. **멀티 테넌시 지원**
   - 사용자별 API Key 관리 (Anthropic, OpenAI, Gemini)
   - 사용자별 ThinkingEngine 설정
   - 역할 기반 접근 제어 (Admin, User, Viewer)

4. **현실적인 데이터 시뮬레이션**
   - 유저 생명주기 모델링 (신규/활성/복귀/이탈)
   - 이벤트 의존성 관리 (퍼널 기반)
   - Faker.js 통합 (국가별 현실적 데이터)

---

## 시스템 아키텍처

### 전체 아키텍처
```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                       │
│   - Dashboard UI (4-Mode Workflow)                              │
│   - Real-time Progress Streaming                                │
│   - File Upload & Analysis                                      │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP/REST API
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│                   Backend API Server (Express)                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Routes Layer                                             │  │
│  │  - /api/auth         (JWT Authentication)                │  │
│  │  - /api/excel        (Excel Upload & Generation)         │  │
│  │  - /api/generate     (Data Generation & Analysis)        │  │
│  │  - /api/logbus       (LogBus2 Control)                   │  │
│  │  - /api/runs         (Execution History)                 │  │
│  │  - /api/settings     (User Settings)                     │  │
│  │  - /api/users        (User Management)                   │  │
│  │  - /api/audit-logs   (Audit Trail)                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Services Layer                                           │  │
│  │  - data-generation.service.ts  (Data Gen Orchestrator)   │  │
│  │  - analysis.service.ts         (AI Analysis Manager)     │  │
│  │  - file-analyzer.ts            (PDF/Image Analysis)      │  │
│  │  - logbus.service.ts           (LogBus2 Controller)      │  │
│  │  - cleanup.service.ts          (File Retention)          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Core Logic Layer                                         │  │
│  │  - data-generator.ts       (Main Orchestrator)           │  │
│  │  - cohort-generator.ts     (User Simulation)             │  │
│  │  - event-generator.ts      (Event Creation)              │  │
│  │  - dependency-manager.ts   (Event Dependencies)          │  │
│  │  - marketing-generator.ts  (UTM Attribution)             │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  AI Integration Layer                                     │  │
│  │  - ai/client.ts            (Multi-provider Client)       │  │
│  │  - ai/prompts.ts           (Prompt Engineering)          │  │
│  │  - ai/validation-pipeline.ts (5-Phase Validation)        │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────┬───────────────────┬───────────────────┘
                          │                   │
                          ↓                   ↓
          ┌──────────────────────┐   ┌──────────────────┐
          │   PostgreSQL DB      │   │   LogBus2        │
          │  - users             │   │   Binary         │
          │  - user_settings     │   │   Wrapper        │
          │  - runs              │   │                  │
          │  - audit_logs        │   └────────┬─────────┘
          │  - excel_uploads     │            │
          └──────────────────────┘            │
                                              ↓
                                    ┌──────────────────┐
                                    │ ThinkingEngine   │
                                    │ (TE Receiver)    │
                                    └──────────────────┘
```

### 데이터 흐름
```
1. 사용자 로그인 (JWT 발급)
   ↓
2. [Mode 1/2] Excel 스키마 준비
   - Mode 1: AI가 자동 생성 (5단계 파이프라인)
   - Mode 2: 사용자가 직접 업로드
   ↓
3. [선택] 참고 파일 업로드 (PDF/이미지)
   → Claude Vision API 분석
   → 분석 결과를 notes에 자동 추가
   ↓
4. [Mode 3] 데이터 생성 시작 (POST /api/generate/start)
   a. Excel 파싱 (ExcelParser)
   b. AI 분석 (5-Phase Analysis)
      - Phase 1: 전략 수립 (사용자 세그먼트, 리텐션)
      - Phase 2: 이벤트 그룹핑 (카테고리별 분류)
      - Phase 3: 리텐션 패턴 (세그먼트별 행동)
      - Phase 4: 이벤트 시퀀싱 (의존성, 트랜잭션)
      - Phase 5: AI 기반 검증 (품질 보증)
   c. 코호트 생성 (CohortGenerator)
      - 신규/활성/복귀/이탈 유저 시뮬레이션
   d. 이벤트 생성 (EventGenerator)
      - 세션 기반 이벤트 발생
      - 퍼널 순서 준수
      - 의존성 체크
   e. ThinkingEngine 형식 변환 (TEFormatter)
   f. JSONL 파일 출력
   ↓
5. 진행 상황 폴링 (GET /api/generate/status/:runId)
   → 실시간 진행률 (0-100%), 상세 로그
   ↓
6. [Mode 4] 데이터 전송 (POST /api/logbus/send/:runId)
   a. LogBus2 설정 파일 생성
   b. LogBus2 프로세스 시작 (child_process)
   c. 전송 진행 상황 모니터링
   d. 전송 완료 확인
   e. LogBus2 종료 및 정리
   ↓
7. ThinkingEngine 대시보드에서 데이터 확인
```

---

## 핵심 기능

### 1. AI 기반 파일 분석 (FileAnalyzer)

**위치**: `data-generator/src/api/services/file-analyzer.ts`

**지원 파일 타입**:
- **이미지**: PNG, JPG, JPEG, GIF, WebP
- **문서**: PDF
- **텍스트**: TXT, MD, JSON, JS, TS, PY, JAVA, GO, RS, SWIFT, KT

**핵심 코드**:
```typescript
export class FileAnalyzer {
  private anthropic: Anthropic | null = null;
  private model: string = 'claude-3-5-sonnet-20241022';

  async analyzeFile(filePath: string): Promise<FileAnalysisResult> {
    if (this.isImageFile(filePath) || this.isPDFFile(filePath)) {
      // Vision API 사용
      return await this.analyzeWithVision(filePath);
    } else {
      // 텍스트 기반 분석
      return await this.analyzeTextFile(filePath);
    }
  }

  async analyzeMultipleFiles(filePaths: string[]): Promise<MultiFileAnalysisResult> {
    const results = await Promise.all(
      filePaths.map(fp => this.analyzeFile(fp))
    );

    // 통합 인사이트 생성
    const combinedInsights = await this.synthesizeInsights(results);

    return {
      files: results,
      combinedInsights,
      recommendedContext: this.buildRecommendedContext(results)
    };
  }
}
```

**활용 예시**:
1. 사용자가 서비스 기획서 PDF 업로드
2. Claude Vision이 문서 내용 분석:
   - 핵심 기능
   - 사용자 페르소나
   - 주요 이벤트
3. 분석 결과가 `notes` 필드에 자동 추가
4. AI 데이터 생성 시 이 컨텍스트를 활용해 더 정확한 데이터 생성

**파일**: `data-generator/src/api/services/file-analyzer.ts:1-350`

---

### 2. 4-Mode 워크플로우 시스템

#### Mode 1: Excel 스키마 자동 생성
**엔드포인트**: `POST /api/excel/generate`

**프로세스**:
```typescript
// 1. 사용자 입력
const input = {
  scenario: "음식 배달 앱",
  dau: 10000,
  industry: "이커머스",
  notes: "배달의민족 같은 서비스"
};

// 2. AI가 5단계 파이프라인으로 이벤트 분류체계 생성
//    - Phase 1: Event List 생성
//    - Phase 2: Common Properties 정의
//    - Phase 3: Event Properties 정의
//    - Phase 4: Property Groups 생성
//    - Phase 5: Validation (AI 검증)

// 3. Excel 파일 자동 생성
//    - Event List 시트
//    - Event Properties 시트
//    - Common Properties 시트
//    - User Data 시트
//    - Funnels 시트
```

**파일**: `data-generator/src/api/routes/excel.ts:50-120`

#### Mode 2: Excel 스키마 업로드
**엔드포인트**: `POST /api/excel/upload`

**구현**:
```typescript
import multer from 'multer';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    // UTF-8 인코딩 처리 (한글 파일명 지원)
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    cb(null, `${timestamp}_${originalName}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.originalname.endsWith('.xlsx')) {
      cb(null, true);
    } else {
      cb(new Error('Only .xlsx files are allowed'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

router.post('/upload', upload.single('file'), async (req, res) => {
  // 파일 저장 및 메타데이터 기록
  await saveExcelUploadRecord(req.file);
  res.json({ path: req.file.path });
});
```

**파일**: `data-generator/src/api/routes/excel.ts:150-200`

#### Mode 3: 데이터 생성
**엔드포인트**: `POST /api/generate/start`

**비동기 처리**:
```typescript
// API Handler
router.post('/start', async (req, res) => {
  const runId = `run_${Date.now()}_${randomInt(1000, 9999)}`;

  // 즉시 202 Accepted 반환
  res.status(202).json({
    runId,
    status: 'pending',
    message: 'Data generation started'
  });

  // 백그라운드에서 비동기 실행
  generateDataAsync(runId, config).catch(err => {
    logger.error('Generation failed:', err);
    updateGenerationStatus(runId, 'failed', err.message);
  });
});

// 진행 상황 조회
router.get('/status/:runId', (req, res) => {
  const progress = getGenerationProgress(req.params.runId);
  res.json(progress);
});
```

**파일**: `data-generator/src/api/routes/generate.ts:46-110`

#### Mode 4: LogBus2 전송
**엔드포인트**: `POST /api/logbus/send/:runId`

**LogBus2 제어**:
```typescript
export class LogBus2Controller {
  async sendData(runId: string, config: LogBusConfig): Promise<void> {
    // 1. 설정 파일 생성
    await this.writeConfig(config);

    // 2. LogBus2 시작
    const process = spawn('./logbus', ['start'], {
      cwd: this.logbusPath,
      detached: true,
      stdio: 'ignore'
    });

    // 3. 진행 상황 모니터링
    const intervalId = setInterval(async () => {
      const progress = await this.getProgress();
      this.progressCallback({
        status: 'sending',
        progress: progress.percentage,
        message: `Sent ${progress.sent} / ${progress.total} events`
      });

      if (progress.percentage >= 100) {
        clearInterval(intervalId);
        await this.stop();
      }
    }, 2000);
  }

  private async getProgress(): Promise<ProgressInfo> {
    // LogBus2 'progress' 명령어 실행
    const output = await execPromise('./logbus progress');
    return this.parseProgressOutput(output);
  }
}
```

**파일**: `data-generator/src/logbus/controller.ts:1-200`

---

### 3. AI 기반 데이터 분석 (5-Phase Analysis)

**위치**: `data-generator/src/ai/client.ts`

**5단계 분석 파이프라인**:

#### Phase 1: 전략 수립
```typescript
async analyzeStrategy(schema: ParsedSchema, userInput: UserInput): Promise<StrategyResult> {
  const prompt = buildStrategyPrompt(schema, userInput);
  const response = await this.callAI(prompt);

  return {
    userSegments: ['whale', 'active', 'casual', 'new'],
    retentionRates: {
      day1: 0.4,
      day7: 0.25,
      day30: 0.15
    },
    avgSessionDuration: {
      whale: 1800,
      active: 900,
      casual: 300,
      new: 600
    }
  };
}
```

#### Phase 2: 이벤트 그룹핑
```typescript
async groupEvents(events: EventDefinition[]): Promise<EventGroups> {
  const prompt = buildEventGroupPrompt(events);
  const response = await this.callAI(prompt);

  return {
    session_start: ['app_launch', 'session_start'],
    onboarding: ['signup', 'profile_setup'],
    core: ['search', 'view_product', 'add_to_cart'],
    transaction: ['checkout', 'payment'],
    session_end: ['app_close', 'logout']
  };
}
```

#### Phase 3: 리텐션 패턴
```typescript
async analyzeRetention(schema: ParsedSchema, segments: string[]): Promise<RetentionPatterns> {
  const prompt = buildRetentionPrompt(schema, segments);
  const response = await this.callAI(prompt);

  return {
    whale: {
      visitFrequency: 0.95,      // 95% 확률로 매일 방문
      avgSessionsPerDay: 5,
      preferredEvents: ['purchase', 'review']
    },
    active: {
      visitFrequency: 0.7,
      avgSessionsPerDay: 2,
      preferredEvents: ['browse', 'add_to_cart']
    },
    // ...
  };
}
```

#### Phase 4: 이벤트 시퀀싱
```typescript
async analyzeEventSequencing(schema: ParsedSchema): Promise<EventSequencing> {
  const prompt = buildEventSequencingPrompt(schema);
  const response = await this.callAI(prompt);

  return {
    dependencies: {
      'login': [],
      'add_to_cart': ['login'],
      'checkout': ['add_to_cart'],
      'payment': ['checkout']
    },
    transactions: [
      {
        name: '구매 플로우',
        events: ['view_product', 'add_to_cart', 'checkout', 'payment'],
        minInterval: 5,
        maxInterval: 300
      }
    ]
  };
}
```

#### Phase 5: AI 검증
```typescript
async validateAnalysis(analysis: AIAnalysisResult): Promise<ValidationResult> {
  const validationPipeline = new ValidationPipeline(this);

  const issues = await validationPipeline.validate(analysis);

  if (issues.length > 0) {
    // 자동 수정 시도
    const fixed = await validationPipeline.autoFix(analysis, issues);
    return { valid: true, analysis: fixed };
  }

  return { valid: true, analysis };
}
```

**파일**: `data-generator/src/ai/client.ts:85-400`

---

### 4. 코호트 생성 (User Lifecycle Simulation)

**위치**: `data-generator/src/generators/cohort-generator.ts`

**유저 생명주기 모델**:
```typescript
export class CohortGenerator {
  generateCohorts(): Map<string, User[]> {
    const dateRange = generateDateRange(startDate, endDate);
    const dailyCohorts = new Map<string, User[]>();

    // 초기 유저 풀 생성 (첫날 DAU의 70%)
    const initialUsers = this.generateInitialUsers();

    dateRange.forEach((date, index) => {
      const activeUsers: User[] = [];

      // 기존 유저 중 활성화될 유저 선택
      this.allUsers.forEach(user => {
        if (this.shouldBeActive(user, date)) {
          activeUsers.push(user);
        }
      });

      // 신규 유저 추가 (DAU 맞추기)
      const newUsersNeeded = this.config.dau - activeUsers.length;
      if (newUsersNeeded > 0) {
        const newUsers = this.generateNewUsers(newUsersNeeded, date);
        activeUsers.push(...newUsers);
      }

      dailyCohorts.set(formatDate(date), activeUsers);
    });

    return dailyCohorts;
  }

  private shouldBeActive(user: User, date: Date): boolean {
    const daysSinceInstall = getDaysDifference(user.install_date, date);
    const segment = user.segment;

    // 세그먼트별 방문 확률 (AI 분석 결과 기반)
    const visitProb = this.aiAnalysis.retentionPatterns[segment].visitFrequency;

    // 리텐션 커브 적용
    const retentionRate = this.calculateRetentionRate(daysSinceInstall, segment);

    return probabilityCheck(visitProb * retentionRate);
  }

  private calculateRetentionRate(days: number, segment: string): number {
    // 지수 감소 모델
    const baseRate = this.aiAnalysis.retentionRates[segment];
    const decayRate = segment === 'whale' ? 0.01 : 0.05;

    return baseRate * Math.exp(-decayRate * days);
  }
}
```

**Faker.js 통합** (국가별 현실적 데이터):
```typescript
export function generateUserInfo(country: string) {
  const faker = getFakerForCountry(country);

  return {
    name: faker.person.fullName(),
    email: faker.internet.email(),
    phone: faker.phone.number(),
    address: {
      street: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state(),
      zipCode: faker.location.zipCode()
    },
    birthDate: faker.date.birthdate({ min: 18, max: 65, mode: 'age' }),
    gender: faker.person.sex(),
    job: faker.person.jobTitle(),
    company: faker.company.name()
  };
}

function getFakerForCountry(country: string) {
  const localeMap = {
    KR: ko,
    US: en_US,
    CN: zh_CN,
    JP: ja,
    // ... 20+ countries
  };

  return new Faker({ locale: localeMap[country] });
}
```

**파일**: `data-generator/src/generators/cohort-generator.ts:1-350`

---

### 5. 이벤트 생성 (Funnel-Based Event Generation)

**위치**: `data-generator/src/generators/event-generator.ts`

**세션 기반 이벤트 생성**:
```typescript
export class EventGenerator {
  generateSessionEvents(session: Session): EventData[] {
    const events: EventData[] = [];
    const executedEvents = new Set<string>();
    let currentTime = session.start;

    // 1. session_start 이벤트 (필수)
    const sessionStartEvents = this.dependencyManager.getEventsByCategory('session_start');
    for (const eventName of sessionStartEvents) {
      events.push(this.createEvent(eventName, session.user, currentTime));
      executedEvents.add(eventName);
      currentTime = addMilliseconds(currentTime, this.getEventInterval());
    }

    // 2. onboarding 이벤트 (첫 세션만)
    if (session.user.total_sessions === 0) {
      const onboardingEvents = this.dependencyManager.getEventsByCategory('onboarding');
      for (const eventName of onboardingEvents) {
        if (probabilityCheck(0.7)) { // 70% 온보딩 완료율
          events.push(this.createEvent(eventName, session.user, currentTime));
          executedEvents.add(eventName);
          currentTime = addMilliseconds(currentTime, this.getEventInterval());
        }
      }
    }

    // 3. 트랜잭션 생성 시도
    const transactionGenerated = this.tryGenerateTransaction(
      session,
      executedEvents,
      currentTime,
      events
    );

    // 4. core 이벤트 (나머지 시간 채우기)
    const targetEventCount = this.getTargetEventCount(session.user.segment);
    while (events.length < targetEventCount && currentTime < session.end) {
      const coreEvents = this.dependencyManager.getEventsByCategory('core');
      const availableEvents = coreEvents.filter(e =>
        this.dependencyManager.canExecuteEvent(e, executedEvents)
      );

      if (availableEvents.length === 0) break;

      const eventName = weightedRandom(availableEvents);
      events.push(this.createEvent(eventName, session.user, currentTime));
      executedEvents.add(eventName);
      currentTime = addMilliseconds(currentTime, this.getEventInterval());
    }

    // 5. session_end 이벤트 (필수)
    const sessionEndEvents = this.dependencyManager.getEventsByCategory('session_end');
    for (const eventName of sessionEndEvents) {
      events.push(this.createEvent(eventName, session.user, session.end));
    }

    return events;
  }

  private tryGenerateTransaction(
    session: Session,
    executedEvents: Set<string>,
    startTime: Date,
    events: EventData[]
  ): boolean {
    const transactions = this.aiAnalysis.eventSequencing.transactions;

    for (const tx of transactions) {
      // 의존성 체크
      const canExecute = tx.events.every(e =>
        this.dependencyManager.canExecuteEvent(e, executedEvents)
      );

      if (!canExecute) continue;

      // 세그먼트별 트랜잭션 확률
      const txProb = this.getTransactionProbability(session.user.segment, tx.name);
      if (!probabilityCheck(txProb)) continue;

      // 트랜잭션 이벤트 순차 생성
      let txTime = startTime;
      for (const eventName of tx.events) {
        events.push(this.createEvent(eventName, session.user, txTime));
        executedEvents.add(eventName);

        // 이벤트 간 간격 (5초 ~ 5분)
        const interval = randomInt(tx.minInterval * 1000, tx.maxInterval * 1000);
        txTime = addMilliseconds(txTime, interval);
      }

      return true;
    }

    return false;
  }

  private createEvent(eventName: string, user: User, time: Date): EventData {
    const eventDef = this.schema.events.find(e => e.event_name === eventName);

    return {
      event_name: eventName,
      account_id: user.account_id,
      distinct_id: user.distinct_id,
      timestamp: time.toISOString(),
      properties: this.generateEventProperties(eventDef, user)
    };
  }

  private generateEventProperties(eventDef: EventDefinition, user: User): Record<string, any> {
    const props: Record<string, any> = {};

    // Common Properties (모든 이벤트)
    Object.assign(props, {
      device_model: user.device_model,
      os: user.os,
      os_version: user.os_version,
      app_version: user.app_version,
      network_type: user.network_type,
      country: user.country,
      language: user.language
    });

    // Event-specific Properties
    for (const propDef of eventDef.properties) {
      const range = this.aiAnalysis.propertyRanges[propDef.name];

      if (propDef.type === 'number') {
        props[propDef.name] = randomInt(range.min, range.max);
      } else if (propDef.type === 'string') {
        props[propDef.name] = weightedRandom(range.values);
      } else if (propDef.type === 'boolean') {
        props[propDef.name] = probabilityCheck(range.trueProb);
      }
    }

    return props;
  }
}
```

**의존성 관리**:
```typescript
export class DependencyManager {
  canExecuteEvent(
    eventName: string,
    executedEvents: Set<string>,
    isFirstSession: boolean = false,
    sessionNumber: number = 1
  ): boolean {
    // 1. 의존성 체크
    const dependencies = this.aiAnalysis.eventSequencing.dependencies[eventName] || [];
    const hasDependencies = dependencies.every(dep => executedEvents.has(dep));

    if (!hasDependencies) return false;

    // 2. 세션 제약 체크
    const constraints = this.aiAnalysis.eventSequencing.sessionConstraints[eventName];
    if (constraints) {
      if (constraints.firstSessionOnly && !isFirstSession) return false;
      if (constraints.afterSession && sessionNumber < constraints.afterSession) return false;
    }

    // 3. 세션 내 최대 실행 횟수 체크
    const maxPerSession = this.aiAnalysis.eventSequencing.maxExecutionsPerSession[eventName];
    if (maxPerSession) {
      const currentCount = this.sessionCounts.get(eventName) || 0;
      if (currentCount >= maxPerSession) return false;
    }

    return true;
  }

  recordEventExecution(eventName: string): void {
    const count = this.sessionCounts.get(eventName) || 0;
    this.sessionCounts.set(eventName, count + 1);
  }
}
```

**파일**:
- `data-generator/src/generators/event-generator.ts:1-600`
- `data-generator/src/generators/dependency-manager.ts:1-350`

---

### 6. 마케팅 어트리뷰션

**위치**: `data-generator/src/generators/marketing-generator.ts`

```typescript
export class MarketingGenerator {
  private industry: string;

  generateUTMParams(userSegment: string): UTMParams {
    // 세그먼트별 채널 분포
    const channel = this.selectChannel(userSegment);

    return {
      utm_source: this.getSource(channel),
      utm_medium: this.getMedium(channel),
      utm_campaign: this.getCampaign(channel),
      utm_content: this.getContent(channel),
      utm_term: this.getTerm(channel)
    };
  }

  private selectChannel(segment: string): string {
    const distributions = {
      whale: {
        organic: 0.7,
        cpc: 0.2,
        social: 0.1
      },
      active: {
        organic: 0.5,
        cpc: 0.3,
        social: 0.2
      },
      casual: {
        organic: 0.3,
        cpc: 0.4,
        social: 0.3
      },
      new: {
        organic: 0.2,
        cpc: 0.5,
        social: 0.3
      }
    };

    return weightedRandom(Object.keys(distributions[segment]),
                          Object.values(distributions[segment]));
  }

  private getSource(channel: string): string {
    const sources = {
      organic: ['google', 'naver', 'direct'],
      cpc: ['google_ads', 'facebook_ads', 'instagram_ads'],
      social: ['facebook', 'instagram', 'twitter', 'youtube']
    };

    return weightedRandom(sources[channel]);
  }

  private getCampaign(channel: string): string {
    const industry = this.industry;

    if (industry === 'ecommerce') {
      return weightedRandom([
        'summer_sale_2024',
        'new_user_welcome',
        'flash_deal',
        'brand_campaign'
      ]);
    } else if (industry === 'gaming') {
      return weightedRandom([
        'new_season_launch',
        'user_acquisition',
        'event_promotion'
      ]);
    }

    return 'general_campaign';
  }
}
```

**파일**: `data-generator/src/generators/marketing-generator.ts:1-350`

---

## 백엔드 코드 리뷰

### 1. Express API 서버 구조

**파일**: `data-generator/src/api/server.ts`

```typescript
#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { authenticateUser, findUserById } from './auth';
import { requireAuth } from './middleware';
import { auditMiddleware } from './audit-middleware';
import { initializeDatabase, testConnection } from '../db/connection';
import { cleanupOldFiles } from './services/cleanup.service';
import { logger } from '../utils/logger';

// Import routers
import filesRouter from './routes/files';
import excelRouter from './routes/excel';
import generateRouter from './routes/generate';
import runsRouter from './routes/runs';
import settingsRouter from './routes/settings';
import usersRouter from './routes/users';
import auditRouter from './routes/audit';
import logbusRouter from './routes/logbus';

dotenv.config();
initializeDatabase();

const app = express();
const PORT = process.env.API_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Register routers (모듈화된 라우터)
app.use('/api', filesRouter);
app.use('/api', excelRouter);
app.use('/api/generate', generateRouter);
app.use('/api/runs', runsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/users', usersRouter);
app.use('/api/audit-logs', auditRouter);
app.use('/api/logbus', logbusRouter);

// Authentication Endpoints (라우터 미분리, 직접 처리)
app.post('/api/auth/login', auditMiddleware.login, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const result = await authenticateUser(username, password);

    if (!result) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const { user, token } = result;
    const { passwordHash, ...userWithoutPassword } = user;

    res.json({
      user: userWithoutPassword,
      token,
    });
  } catch (error: any) {
    logger.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await findUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { passwordHash, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error: any) {
    logger.error('Get user error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/logout', requireAuth, auditMiddleware.logout, (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// Server startup
const server = app.listen(PORT, async () => {
  logger.info(`🚀 API Server running on http://localhost:${PORT}`);
  logger.info(`📊 Excel files: http://localhost:${PORT}/api/excel/list`);
  logger.info(`🎯 Generate: http://localhost:${PORT}/api/generate/start`);

  // Test database connection
  logger.info('\n🔌 Testing database connection...');
  const dbConnected = await testConnection();
  if (!dbConnected) {
    logger.info('⚠️  Running in MOCK mode (no database)');
    logger.info('ℹ️  Set DATABASE_URL to enable PostgreSQL features');
  }

  // Initial cleanup
  logger.info('\n🧹 Running initial cleanup...');
  cleanupOldFiles();

  // Schedule cleanup every 24 hours
  setInterval(() => {
    logger.info('\n🧹 Running scheduled cleanup...');
    cleanupOldFiles();
  }, 24 * 60 * 60 * 1000);
});

// Server timeout settings (10 minutes)
server.timeout = 600000;
server.keepAliveTimeout = 610000;
```

**아키텍처 특징**:
1. **라우터 모듈화**: 각 도메인별로 라우터 분리 (`/routes` 폴더)
2. **서비스 레이어 분리**: 비즈니스 로직을 `/services`로 추출
3. **미들웨어 체계**: 인증, 감사 로그 자동화
4. **자동 정리 스케줄러**: 24시간마다 오래된 파일 삭제
5. **Graceful Degradation**: DB 없이도 일부 기능 동작 (MOCK 모드)

---

### 2. 인증 시스템 (JWT + bcrypt)

**파일**: `data-generator/src/api/auth.ts`

```typescript
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { findUserByUsername, updateLastLogin } from '../db/repositories/user-repository';
import { User } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h';

export interface AuthResult {
  user: User;
  token: string;
}

/**
 * 사용자 인증
 */
export async function authenticateUser(
  username: string,
  password: string
): Promise<AuthResult | null> {
  try {
    // 1. 사용자 조회
    const user = await findUserByUsername(username);
    if (!user) {
      return null;
    }

    // 2. 활성 계정 확인
    if (!user.isActive) {
      throw new Error('Account is deactivated');
    }

    // 3. 비밀번호 검증 (bcrypt)
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return null;
    }

    // 4. JWT 토큰 발급
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // 5. 마지막 로그인 시간 업데이트
    await updateLastLogin(user.id);

    return { user, token };
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

/**
 * JWT 토큰 검증
 */
export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * 사용자 조회 (by ID)
 */
export async function findUserById(userId: number): Promise<User | null> {
  // Repository로 위임
  return await findUserByIdRepo(userId);
}
```

**미들웨어**:
```typescript
// data-generator/src/api/middleware.ts
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from './auth';

// JWT 토큰 타입 확장
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        username: string;
        role: string;
      };
    }
  }
}

/**
 * JWT 인증 미들웨어
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = decoded;
  next();
}

/**
 * Admin 권한 확인 미들웨어
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}
```

---

### 3. 데이터베이스 연동 (PostgreSQL)

**Connection Pool**:
```typescript
// data-generator/src/db/connection.ts
import { Pool } from 'pg';
import { logger } from '../utils/logger';

let pool: Pool | null = null;

/**
 * PostgreSQL 연결 풀 초기화
 */
export function initializeDatabase(): void {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    logger.warn('DATABASE_URL not set. Running without database support.');
    return;
  }

  pool = new Pool({
    connectionString: databaseUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20, // 최대 연결 수
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  pool.on('error', (err) => {
    logger.error('Unexpected database error:', err);
  });

  logger.info('✅ Database connection pool initialized');
}

/**
 * 연결 풀 가져오기
 */
export function getPool(): Pool | null {
  return pool;
}

/**
 * 데이터베이스 연결 테스트
 */
export async function testConnection(): Promise<boolean> {
  if (!pool) {
    return false;
  }

  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    logger.info('✅ Database connection successful:', result.rows[0].now);
    return true;
  } catch (error) {
    logger.error('❌ Database connection failed:', error);
    return false;
  }
}

/**
 * 트랜잭션 헬퍼
 */
export async function withTransaction<T>(
  callback: (client: any) => Promise<T>
): Promise<T> {
  if (!pool) {
    throw new Error('Database not initialized');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

**Repository 패턴**:
```typescript
// data-generator/src/db/repositories/user-repository.ts
import { getPool } from '../connection';
import { User } from '../../types';

/**
 * 사용자 생성
 */
export async function createUser(data: CreateUserData): Promise<User> {
  const pool = getPool();
  if (!pool) throw new Error('Database not available');

  const query = `
    INSERT INTO users (username, email, password_hash, full_name, role)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;

  const values = [data.username, data.email, data.passwordHash, data.fullName, data.role];
  const result = await pool.query(query, values);

  return mapRowToUser(result.rows[0]);
}

/**
 * 사용자 조회 (by username)
 */
export async function findUserByUsername(username: string): Promise<User | null> {
  const pool = getPool();
  if (!pool) return null;

  const query = 'SELECT * FROM users WHERE username = $1';
  const result = await pool.query(query, [username]);

  if (result.rows.length === 0) {
    return null;
  }

  return mapRowToUser(result.rows[0]);
}

/**
 * 사용자 조회 (by ID)
 */
export async function findUserById(userId: number): Promise<User | null> {
  const pool = getPool();
  if (!pool) return null;

  const query = 'SELECT * FROM users WHERE id = $1';
  const result = await pool.query(query, [userId]);

  if (result.rows.length === 0) {
    return null;
  }

  return mapRowToUser(result.rows[0]);
}

/**
 * 모든 사용자 조회
 */
export async function getAllUsers(): Promise<User[]> {
  const pool = getPool();
  if (!pool) return [];

  const query = 'SELECT * FROM users ORDER BY created_at DESC';
  const result = await pool.query(query);

  return result.rows.map(mapRowToUser);
}

/**
 * 사용자 정보 업데이트
 */
export async function updateUser(userId: number, updates: Partial<User>): Promise<User> {
  const pool = getPool();
  if (!pool) throw new Error('Database not available');

  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (updates.email !== undefined) {
    fields.push(`email = $${paramIndex++}`);
    values.push(updates.email);
  }
  if (updates.fullName !== undefined) {
    fields.push(`full_name = $${paramIndex++}`);
    values.push(updates.fullName);
  }
  if (updates.role !== undefined) {
    fields.push(`role = $${paramIndex++}`);
    values.push(updates.role);
  }
  if (updates.isActive !== undefined) {
    fields.push(`is_active = $${paramIndex++}`);
    values.push(updates.isActive);
  }

  values.push(userId);

  const query = `
    UPDATE users
    SET ${fields.join(', ')}, updated_at = NOW()
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  const result = await pool.query(query, values);
  return mapRowToUser(result.rows[0]);
}

/**
 * 마지막 로그인 시간 업데이트
 */
export async function updateLastLogin(userId: number): Promise<void> {
  const pool = getPool();
  if (!pool) return;

  const query = 'UPDATE users SET last_login_at = NOW() WHERE id = $1';
  await pool.query(query, [userId]);
}

/**
 * 사용자 삭제
 */
export async function deleteUser(userId: number): Promise<boolean> {
  const pool = getPool();
  if (!pool) throw new Error('Database not available');

  const query = 'DELETE FROM users WHERE id = $1';
  const result = await pool.query(query, [userId]);

  return result.rowCount > 0;
}

/**
 * DB Row → User 객체 변환
 */
function mapRowToUser(row: any): User {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    passwordHash: row.password_hash,
    fullName: row.full_name,
    profileImage: row.profile_image,
    role: row.role,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastLoginAt: row.last_login_at,
  };
}
```

---

### 4. 감사 로그 시스템

**자동 감사 로그 미들웨어**:
```typescript
// data-generator/src/api/audit-middleware.ts
import { Request, Response, NextFunction } from 'express';
import { createAuditLog } from '../db/repositories/audit-repository';

/**
 * 감사 로그 생성 헬퍼
 */
async function logAudit(
  req: Request,
  action: string,
  resourceType: string,
  resourceId?: string,
  details?: any,
  status: string = 'success',
  errorMessage?: string
) {
  try {
    await createAuditLog({
      userId: req.user?.userId || null,
      username: req.user?.username || 'anonymous',
      action,
      resourceType,
      resourceId,
      details,
      status,
      errorMessage,
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}

/**
 * 로그인 감사 미들웨어
 */
export const login = async (req: Request, res: Response, next: NextFunction) => {
  const originalSend = res.send;

  res.send = function (data: any) {
    const responseBody = typeof data === 'string' ? JSON.parse(data) : data;

    if (res.statusCode === 200 && responseBody.user) {
      logAudit(
        req,
        'login',
        'auth',
        responseBody.user.id?.toString(),
        { username: req.body.username },
        'success'
      );
    } else {
      logAudit(
        req,
        'login',
        'auth',
        undefined,
        { username: req.body.username },
        'failed',
        responseBody.error || 'Login failed'
      );
    }

    return originalSend.call(this, data);
  };

  next();
};

/**
 * 로그아웃 감사 미들웨어
 */
export const logout = async (req: Request, res: Response, next: NextFunction) => {
  await logAudit(req, 'logout', 'auth', req.user?.userId.toString());
  next();
};

/**
 * 데이터 생성 감사 미들웨어
 */
export const dataGeneration = async (req: Request, res: Response, next: NextFunction) => {
  const originalSend = res.send;

  res.send = function (data: any) {
    const responseBody = typeof data === 'string' ? JSON.parse(data) : data;

    if (res.statusCode === 202 && responseBody.runId) {
      logAudit(
        req,
        'create_run',
        'run',
        responseBody.runId,
        {
          scenario: req.body.scenario,
          dau: req.body.dau,
          dateRange: { start: req.body.dateStart, end: req.body.dateEnd }
        },
        'success'
      );
    } else if (res.statusCode >= 400) {
      logAudit(
        req,
        'create_run',
        'run',
        undefined,
        req.body,
        'failed',
        responseBody.error
      );
    }

    return originalSend.call(this, data);
  };

  next();
};

/**
 * Excel 업로드 감사 미들웨어
 */
export const excelUpload = async (req: Request, res: Response, next: NextFunction) => {
  const originalSend = res.send;

  res.send = function (data: any) {
    const responseBody = typeof data === 'string' ? JSON.parse(data) : data;

    if (res.statusCode === 200 && responseBody.path) {
      logAudit(
        req,
        'upload_excel',
        'excel',
        responseBody.path,
        { filename: req.file?.originalname, size: req.file?.size },
        'success'
      );
    }

    return originalSend.call(this, data);
  };

  next();
};

/**
 * 데이터 전송 감사 미들웨어
 */
export const dataSend = async (req: Request, res: Response, next: NextFunction) => {
  const originalSend = res.send;
  const runId = req.params.runId;

  res.send = function (data: any) {
    const responseBody = typeof data === 'string' ? JSON.parse(data) : data;

    if (res.statusCode === 200) {
      logAudit(
        req,
        'send_data',
        'data',
        runId,
        { receiverUrl: req.body.receiverUrl },
        'success'
      );
    } else {
      logAudit(
        req,
        'send_data',
        'data',
        runId,
        { receiverUrl: req.body.receiverUrl },
        'failed',
        responseBody.error
      );
    }

    return originalSend.call(this, data);
  };

  next();
};

export const auditMiddleware = {
  login,
  logout,
  dataGeneration,
  excelUpload,
  dataSend,
};
```

**사용 예시**:
```typescript
// 라우터에서 사용
router.post('/api/auth/login', auditMiddleware.login, loginHandler);
router.post('/api/generate/start', auditMiddleware.dataGeneration, generateHandler);
router.post('/api/excel/upload', auditMiddleware.excelUpload, uploadHandler);
router.post('/api/logbus/send/:runId', auditMiddleware.dataSend, sendHandler);
```

**감사 로그 조회 API**:
```typescript
// data-generator/src/api/routes/audit.ts
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const filters = {
      userId: req.query.userId ? parseInt(req.query.userId as string) : undefined,
      action: req.query.action as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 50,
    };

    const result = await getAuditLogs(filters);

    res.json(result);
  } catch (error: any) {
    logger.error('Failed to fetch audit logs:', error);
    res.status(500).json({ error: error.message });
  }
});
```

---

## 데이터베이스 설계

### ERD (Entity Relationship Diagram)

```
┌─────────────────────────────────────────────────────────────────────┐
│                            users                                     │
├─────────────────────────────────────────────────────────────────────┤
│ id (PK)              │ SERIAL                                        │
│ username             │ VARCHAR(50) UNIQUE NOT NULL                   │
│ email                │ VARCHAR(100) UNIQUE NOT NULL                  │
│ password_hash        │ VARCHAR(255) NOT NULL                         │
│ full_name            │ VARCHAR(100)                                  │
│ profile_image        │ TEXT                                          │
│ role                 │ VARCHAR(20) DEFAULT 'user'                    │
│ is_active            │ BOOLEAN DEFAULT true                          │
│ created_at           │ TIMESTAMP DEFAULT NOW()                       │
│ updated_at           │ TIMESTAMP DEFAULT NOW()                       │
│ last_login_at        │ TIMESTAMP                                     │
└──────────────┬──────────────────────────────────────────────────────┘
               │
               │ 1:1
               ↓
┌─────────────────────────────────────────────────────────────────────┐
│                        user_settings                                 │
├─────────────────────────────────────────────────────────────────────┤
│ id (PK)              │ SERIAL                                        │
│ user_id (FK)         │ INTEGER UNIQUE → users.id                     │
│                                                                       │
│ [AI Provider Settings]                                               │
│ anthropic_api_key    │ TEXT (encrypted)                              │
│ openai_api_key       │ TEXT (encrypted)                              │
│ gemini_api_key       │ TEXT (encrypted)                              │
│ excel_ai_provider    │ VARCHAR(20) DEFAULT 'anthropic'               │
│ data_ai_provider     │ VARCHAR(20) DEFAULT 'anthropic'               │
│ data_ai_model        │ VARCHAR(100)                                  │
│ validation_model_tier│ VARCHAR(20) DEFAULT 'fast'                    │
│ custom_validation_model │ VARCHAR(100)                               │
│                                                                       │
│ [ThinkingEngine Settings]                                            │
│ te_app_id            │ VARCHAR(100)                                  │
│ te_receiver_url      │ VARCHAR(255)                                  │
│                                                                       │
│ [File Retention Settings]                                            │
│ data_retention_days  │ INTEGER DEFAULT 7                             │
│ excel_retention_days │ INTEGER DEFAULT 30                            │
│ auto_delete_after_send │ BOOLEAN DEFAULT false                       │
│                                                                       │
│ created_at           │ TIMESTAMP DEFAULT NOW()                       │
│ updated_at           │ TIMESTAMP DEFAULT NOW()                       │
└─────────────────────────────────────────────────────────────────────┘

               ┌───────────────────┐
               │      users        │
               └─────────┬─────────┘
                         │ 1:N
                         ↓
┌─────────────────────────────────────────────────────────────────────┐
│                            runs                                      │
├─────────────────────────────────────────────────────────────────────┤
│ id (PK)              │ VARCHAR(100)                                  │
│ user_id (FK)         │ INTEGER → users.id                            │
│ excel_file_path      │ VARCHAR(500)                                  │
│ scenario             │ TEXT                                          │
│ dau                  │ INTEGER                                       │
│ date_start           │ DATE                                          │
│ date_end             │ DATE                                          │
│ status               │ VARCHAR(20)                                   │
│                      │   - pending, running, completed, failed, sent │
│ progress             │ INTEGER DEFAULT 0 (0-100)                     │
│ total_users          │ INTEGER                                       │
│ total_events         │ INTEGER                                       │
│ files_generated      │ JSONB                                         │
│                      │   { data: [...], metadata: [...] }            │
│ created_at           │ TIMESTAMP DEFAULT NOW()                       │
│ completed_at         │ TIMESTAMP                                     │
│ sent_at              │ TIMESTAMP                                     │
└─────────────────────────────────────────────────────────────────────┘

               ┌───────────────────┐
               │      users        │
               └─────────┬─────────┘
                         │ 1:N
                         ↓
┌─────────────────────────────────────────────────────────────────────┐
│                        audit_logs                                    │
├─────────────────────────────────────────────────────────────────────┤
│ id (PK)              │ SERIAL                                        │
│ user_id (FK)         │ INTEGER → users.id                            │
│ username             │ VARCHAR(50)                                   │
│ action               │ VARCHAR(50) NOT NULL                          │
│                      │   - login, logout, create_run,                │
│                      │     upload_excel, send_data, ...              │
│ resource_type        │ VARCHAR(50)                                   │
│                      │   - run, excel, data, user                    │
│ resource_id          │ VARCHAR(100)                                  │
│ details              │ JSONB                                         │
│ status               │ VARCHAR(20) (success, failed)                 │
│ error_message        │ TEXT                                          │
│ ip_address           │ VARCHAR(45)                                   │
│ user_agent           │ TEXT                                          │
│ created_at           │ TIMESTAMP DEFAULT NOW()                       │
└─────────────────────────────────────────────────────────────────────┘

               ┌───────────────────┐
               │      users        │
               └─────────┬─────────┘
                         │ 1:N
                         ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      excel_uploads                                   │
├─────────────────────────────────────────────────────────────────────┤
│ id (PK)              │ SERIAL                                        │
│ user_id (FK)         │ INTEGER → users.id                            │
│ original_filename    │ VARCHAR(255)                                  │
│ stored_filename      │ VARCHAR(255)                                  │
│ file_size            │ BIGINT                                        │
│ file_path            │ VARCHAR(500)                                  │
│ uploaded_at          │ TIMESTAMP DEFAULT NOW()                       │
└─────────────────────────────────────────────────────────────────────┘
```

### 주요 인덱스

```sql
-- 성능 최적화용 인덱스
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_runs_user_id ON runs(user_id);
CREATE INDEX idx_runs_status ON runs(status);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);
```

### 트리거 (자동 updated_at)

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## API 엔드포인트

### 인증 (Authentication)

| Method | Endpoint | 설명 | 인증 | 권한 |
|--------|----------|------|------|------|
| POST | `/api/auth/login` | 로그인 (JWT 발급) | ❌ | - |
| GET | `/api/auth/me` | 현재 사용자 정보 | ✅ | - |
| POST | `/api/auth/logout` | 로그아웃 | ✅ | - |

**로그인 예시**:
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin"
  }'

# Response:
{
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@te-platform.com",
    "fullName": "System Administrator",
    "role": "admin",
    "isActive": true
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Excel 관리

| Method | Endpoint | 설명 | 인증 | 권한 |
|--------|----------|------|------|------|
| POST | `/api/excel/generate` | AI 기반 Excel 생성 | ✅ | - |
| POST | `/api/excel/upload` | Excel 파일 업로드 | ✅ | - |
| GET | `/api/excel/list` | 업로드된 Excel 목록 | ✅ | - |
| GET | `/api/excel/download/:filename` | Excel 다운로드 | ✅ | - |

**AI Excel 생성 예시**:
```bash
curl -X POST http://localhost:3001/api/excel/generate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "scenario": "음식 배달 앱",
    "dau": 10000,
    "industry": "이커머스",
    "notes": "배달의민족 같은 서비스",
    "aiProvider": "anthropic"
  }'

# Response: (Streaming)
data: {"phase":"phase1","progress":20,"message":"이벤트 목록 생성 중..."}
data: {"phase":"phase2","progress":40,"message":"공통 속성 정의 중..."}
...
data: {"phase":"completed","progress":100,"path":"uploads/generated_1234567890.xlsx"}
```

### 데이터 생성

| Method | Endpoint | 설명 | 인증 | 권한 |
|--------|----------|------|------|------|
| POST | `/api/generate/start` | 데이터 생성 시작 | ✅ | - |
| GET | `/api/generate/status/:runId` | 진행 상황 조회 | ✅ | - |
| POST | `/api/generate/analyze-only` | AI 분석만 실행 | ✅ | - |
| GET | `/api/generate/analysis/:runId` | 분석 결과 조회 | ✅ | - |
| POST | `/api/generate/update-analysis/:runId` | 분석 결과 수정 | ✅ | - |
| GET | `/api/generate/download/:runId` | 생성 데이터 다운로드 | ✅ | - |

**데이터 생성 예시**:
```bash
# 1. 생성 시작
curl -X POST http://localhost:3001/api/generate/start \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "excelPath": "uploads/schema.xlsx",
    "scenario": "음식 배달 앱",
    "dau": 10000,
    "industry": "이커머스",
    "notes": "...",
    "dateStart": "2024-01-01",
    "dateEnd": "2024-01-31",
    "aiProvider": "anthropic"
  }'

# Response:
{
  "runId": "run_1234567890_5678",
  "status": "pending",
  "message": "Data generation started"
}

# 2. 진행 상황 폴링 (2초마다)
curl http://localhost:3001/api/generate/status/run_1234567890_5678 \
  -H "Authorization: Bearer <token>"

# Response:
{
  "runId": "run_1234567890_5678",
  "status": "running",
  "progress": 45,
  "message": "Generating events for day 15/31",
  "details": {
    "phase": "event_generation",
    "totalDays": 31,
    "completedDays": 15,
    "totalUsers": 12500,
    "totalEvents": 185000
  }
}

# 3. 완료 후 다운로드
curl http://localhost:3001/api/generate/download/run_1234567890_5678 \
  -H "Authorization: Bearer <token>" \
  -o data.zip
```

### LogBus2 제어

| Method | Endpoint | 설명 | 인증 | 권한 |
|--------|----------|------|------|------|
| POST | `/api/logbus/send/:runId` | ThinkingEngine 전송 | ✅ | - |
| POST | `/api/logbus/stop` | LogBus2 강제 종료 | ✅ | - |
| GET | `/api/logbus/status` | LogBus2 상태 조회 | ✅ | - |
| GET | `/api/logbus/logs` | LogBus2 로그 조회 | ✅ | - |

**데이터 전송 예시**:
```bash
curl -X POST http://localhost:3001/api/logbus/send/run_1234567890_5678 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "appId": "your-app-id",
    "receiverUrl": "https://te-receiver-naver.thinkingdata.kr/",
    "cpuLimit": 100
  }'

# Response: (Streaming)
data: {"status":"starting","progress":0,"message":"LogBus2 초기화 중..."}
data: {"status":"sending","progress":25,"message":"전송 중: 50000 / 200000 이벤트"}
data: {"status":"sending","progress":50,"message":"전송 중: 100000 / 200000 이벤트"}
...
data: {"status":"completed","progress":100,"message":"전송 완료"}
```

### 실행 기록

| Method | Endpoint | 설명 | 인증 | 권한 |
|--------|----------|------|------|------|
| GET | `/api/runs/list` | 실행 목록 조회 | ✅ | - |
| GET | `/api/runs/:runId` | 특정 실행 조회 | ✅ | - |
| DELETE | `/api/runs/:runId` | 실행 데이터 삭제 | ✅ | - |
| PUT | `/api/runs/:runId/retention` | 보관 기간 연장 | ✅ | - |

### 사용자 설정

| Method | Endpoint | 설명 | 인증 | 권한 |
|--------|----------|------|------|------|
| GET | `/api/settings` | 사용자 설정 조회 | ✅ | - |
| POST | `/api/settings` | 사용자 설정 저장 | ✅ | - |

**설정 예시**:
```json
{
  "anthropicApiKey": "sk-ant-...",
  "openaiApiKey": "sk-...",
  "geminiApiKey": "...",
  "excelAiProvider": "anthropic",
  "dataAiProvider": "anthropic",
  "dataAiModel": "claude-3-5-sonnet-20241022",
  "validationModelTier": "fast",
  "teAppId": "your-app-id",
  "teReceiverUrl": "https://te-receiver-naver.thinkingdata.kr/",
  "dataRetentionDays": 7,
  "excelRetentionDays": 30,
  "autoDeleteAfterSend": false
}
```

### 사용자 관리 (Admin Only)

| Method | Endpoint | 설명 | 인증 | 권한 |
|--------|----------|------|------|------|
| GET | `/api/users` | 사용자 목록 | ✅ | Admin |
| POST | `/api/users` | 사용자 생성 | ✅ | Admin |
| PUT | `/api/users/:userId` | 사용자 수정 | ✅ | Admin |
| DELETE | `/api/users/:userId` | 사용자 삭제 | ✅ | Admin |

### 감사 로그 (Admin Only)

| Method | Endpoint | 설명 | 인증 | 권한 |
|--------|----------|------|------|------|
| GET | `/api/audit-logs` | 감사 로그 조회 | ✅ | Admin |

**쿼리 파라미터**:
- `userId`: 특정 사용자 필터
- `action`: 액션 타입 필터 (login, create_run, upload_excel, ...)
- `startDate`: 시작 날짜 (YYYY-MM-DD)
- `endDate`: 종료 날짜 (YYYY-MM-DD)
- `page`: 페이지 번호 (기본: 1)
- `limit`: 페이지 크기 (기본: 50)

---

## 성능 최적화

### 1. 비동기 처리 (Async/Await)

**문제**: 데이터 생성은 수분이 걸리는 작업
**해결**: 즉시 응답 후 백그라운드 처리

```typescript
// 비동기 작업 맵 (In-Memory)
const progressMap = new Map<string, GenerationProgress>();

export async function generateDataAsync(
  runId: string,
  config: DataGeneratorConfig
): Promise<void> {
  // 초기 상태 설정
  progressMap.set(runId, {
    status: 'running',
    progress: 0,
    message: 'Starting data generation...'
  });

  try {
    // 데이터 생성 (오래 걸림)
    const generator = new DataGenerator(config, runId);
    const result = await generator.generate();

    // 완료 상태 업데이트
    progressMap.set(runId, {
      status: 'completed',
      progress: 100,
      message: 'Data generation completed',
      result
    });
  } catch (error: any) {
    // 실패 상태 업데이트
    progressMap.set(runId, {
      status: 'failed',
      progress: 0,
      message: 'Data generation failed',
      error: error.message
    });
  }
}

export function getGenerationProgress(runId: string): GenerationProgress | null {
  return progressMap.get(runId) || null;
}
```

**개선 방안**: Redis로 이전하여 서버 재시작 시에도 상태 유지

### 2. 진행 상황 콜백

**문제**: 사용자가 진행 상황을 알 수 없음
**해결**: 각 단계마다 콜백 호출

```typescript
export class DataGenerator {
  async generate(): Promise<GenerationResult> {
    // Phase 1: Excel 파싱 (5%)
    this.onProgress?.({
      status: 'parsing',
      progress: 5,
      message: 'Parsing Excel file...'
    });
    const schema = await this.parseExcel();

    // Phase 2: AI 분석 (10-30%)
    this.onProgress?.({
      status: 'analyzing',
      progress: 10,
      message: 'Analyzing with AI...'
    });
    const analysis = await this.analyzeWithAI(schema);

    // Phase 3: 코호트 생성 (30-40%)
    this.onProgress?.({
      status: 'generating_cohorts',
      progress: 30,
      message: 'Generating user cohorts...'
    });
    const cohorts = await this.generateCohorts();

    // Phase 4: 이벤트 생성 (40-90%)
    const totalDays = cohorts.size;
    let completedDays = 0;

    for (const [date, users] of cohorts) {
      const events = await this.generateEventsForDay(date, users);

      completedDays++;
      const progress = 40 + Math.floor((completedDays / totalDays) * 50);

      this.onProgress?.({
        status: 'generating_events',
        progress,
        message: `Generating events for day ${completedDays}/${totalDays}`,
        details: {
          date,
          totalUsers: users.length,
          totalEvents: events.length
        }
      });
    }

    // Phase 5: 파일 출력 (90-100%)
    this.onProgress?.({
      status: 'writing_files',
      progress: 95,
      message: 'Writing output files...'
    });
    await this.writeOutputFiles();

    this.onProgress?.({
      status: 'completed',
      progress: 100,
      message: 'Data generation completed'
    });

    return result;
  }
}
```

### 3. 파일 정리 스케줄러

**문제**: 오래된 파일이 디스크 용량 차지
**해결**: 자동 정리 스케줄러

```typescript
// data-generator/src/api/services/cleanup.service.ts
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../../utils/logger';

export function cleanupOldFiles(): void {
  const dataDir = path.resolve(__dirname, '../../../output/data');
  const excelDir = path.resolve(__dirname, '../../../uploads');

  // 데이터 파일 정리 (7일 지난 파일)
  cleanupDirectory(dataDir, 7);

  // Excel 파일 정리 (30일 지난 파일)
  cleanupDirectory(excelDir, 30);
}

function cleanupDirectory(dirPath: string, retentionDays: number): void {
  if (!fs.existsSync(dirPath)) {
    return;
  }

  const now = Date.now();
  const retentionMs = retentionDays * 24 * 60 * 60 * 1000;

  const files = fs.readdirSync(dirPath);
  let deletedCount = 0;

  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stats = fs.statSync(filePath);

    const ageMs = now - stats.mtimeMs;

    if (ageMs > retentionMs) {
      if (stats.isDirectory()) {
        fs.rmSync(filePath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(filePath);
      }
      deletedCount++;
      logger.info(`Deleted old file: ${file} (age: ${Math.floor(ageMs / 86400000)} days)`);
    }
  }

  logger.info(`Cleanup complete: ${deletedCount} files deleted from ${dirPath}`);
}
```

**스케줄링** (server.ts):
```typescript
// 서버 시작 시 즉시 실행
cleanupOldFiles();

// 24시간마다 실행
setInterval(() => {
  logger.info('\n🧹 Running scheduled cleanup...');
  cleanupOldFiles();
}, 24 * 60 * 60 * 1000);
```

### 4. 커넥션 풀 (PostgreSQL)

**문제**: 매번 새 연결 생성은 비효율적
**해결**: Connection Pool 사용

```typescript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,                      // 최대 20개 연결
  idleTimeoutMillis: 30000,     // 30초 유휴 후 연결 종료
  connectionTimeoutMillis: 2000, // 2초 연결 타임아웃
});
```

### 5. 파일 스트리밍

**문제**: 대용량 파일을 메모리에 모두 로드하면 OOM
**해결**: 스트림 기반 처리

```typescript
// JSONL 파일 스트리밍 출력
export async function writeEventsToFile(events: TEEvent[], filePath: string): Promise<void> {
  const writeStream = fs.createWriteStream(filePath, { encoding: 'utf8' });

  for (const event of events) {
    const jsonLine = JSON.stringify(event) + '\n';

    // 버퍼가 가득 차면 drain 이벤트 대기
    if (!writeStream.write(jsonLine)) {
      await new Promise(resolve => writeStream.once('drain', resolve));
    }
  }

  writeStream.end();
  await new Promise(resolve => writeStream.once('finish', resolve));
}
```

---

## 보안 구현

### 1. 비밀번호 해싱 (bcrypt)

```typescript
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

// 비밀번호 해싱
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

// 비밀번호 검증
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}
```

### 2. JWT 토큰 인증

```typescript
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const JWT_EXPIRES_IN = '24h';

// 토큰 발급
export function signToken(payload: any): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// 토큰 검증
export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}
```

### 3. API Key 암호화 저장

```typescript
// 사용자별 API Key를 암호화하여 DB에 저장
// (실제 구현은 crypto 모듈 사용)

import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'change-me';
const ALGORITHM = 'aes-256-cbc';

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(text: string): string {
  const parts = text.split(':');
  const iv = Buffer.from(parts.shift()!, 'hex');
  const encryptedText = Buffer.from(parts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}
```

### 4. 역할 기반 접근 제어 (RBAC)

```typescript
// 역할 정의
type UserRole = 'admin' | 'user' | 'viewer';

// 권한 체크 미들웨어
export function requireRole(roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!roles.includes(req.user.role as UserRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

// 사용 예시
router.get('/api/users', requireAuth, requireRole(['admin']), getUsersHandler);
router.delete('/api/runs/:runId', requireAuth, requireRole(['admin', 'user']), deleteRunHandler);
router.get('/api/runs/list', requireAuth, requireRole(['admin', 'user', 'viewer']), listRunsHandler);
```

### 5. 입력 검증

```typescript
// 파일 업로드 검증
const upload = multer({
  fileFilter: (req, file, cb) => {
    // 확장자 검증
    if (!file.originalname.endsWith('.xlsx')) {
      return cb(new Error('Only .xlsx files are allowed'));
    }

    // MIME 타입 검증
    if (file.mimetype !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      return cb(new Error('Invalid file type'));
    }

    cb(null, true);
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1
  }
});

// 요청 데이터 검증
router.post('/api/generate/start', requireAuth, async (req, res) => {
  const { excelPath, scenario, dau, dateStart, dateEnd } = req.body;

  // 필수 필드 검증
  if (!excelPath || !scenario || !dau || !dateStart || !dateEnd) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['excelPath', 'scenario', 'dau', 'dateStart', 'dateEnd']
    });
  }

  // DAU 범위 검증
  if (dau < 1 || dau > 1000000) {
    return res.status(400).json({ error: 'DAU must be between 1 and 1,000,000' });
  }

  // 날짜 형식 검증
  if (!isValidDate(dateStart) || !isValidDate(dateEnd)) {
    return res.status(400).json({ error: 'Invalid date format (YYYY-MM-DD required)' });
  }

  // 날짜 순서 검증
  if (new Date(dateStart) > new Date(dateEnd)) {
    return res.status(400).json({ error: 'dateStart must be before dateEnd' });
  }

  // ...
});
```

### 6. SQL Injection 방어

```typescript
// ❌ 취약한 코드
const query = `SELECT * FROM users WHERE username = '${username}'`;
await pool.query(query);

// ✅ 안전한 코드 (Parameterized Query)
const query = 'SELECT * FROM users WHERE username = $1';
await pool.query(query, [username]);
```

---

## 마무리

### 핵심 배운 점

1. **비동기 처리의 중요성**
   - 오래 걸리는 작업은 즉시 응답 후 백그라운드 처리
   - 진행 상황을 별도 엔드포인트로 제공

2. **TypeScript의 장점**
   - 복잡한 데이터 구조를 타입으로 명확히 정의
   - 컴파일 타임에 오류 발견
   - IDE 자동완성으로 생산성 향상

3. **Repository 패턴**
   - 데이터베이스 로직을 별도 레이어로 분리
   - 테스트 가능성 향상
   - 코드 재사용성 증가

4. **멀티 프로바이더 전략**
   - 3개 AI Provider 지원으로 유연성 확보
   - Provider별 특성에 맞게 모델 선택 가능

5. **보안 및 감사**
   - 모든 중요 작업을 감사 로그에 기록
   - 역할 기반 접근 제어로 권한 분리

---

## 향후 개선 사항

1. **Redis 도입**
   - progressMap을 Redis로 이전하여 서버 재시작 시 상태 유지
   - 캐싱으로 성능 향상

2. **WebSocket 또는 SSE**
   - 진행 상황을 폴링 대신 실시간 푸시
   - 더 나은 사용자 경험

3. **Queue System (Bull/BullMQ)**
   - 작업 큐 관리로 동시 실행 제어
   - 우선순위 기반 작업 처리
   - 실패 시 자동 재시도

4. **GraphQL**
   - REST API 대신 GraphQL로 전환 고려
   - 유연한 쿼리, 단일 엔드포인트

5. **테스트 코드**
   - Jest + Supertest로 API 테스트 작성
   - 단위 테스트, 통합 테스트
   - 테스트 커버리지 90% 이상 목표

6. **Docker Compose**
   - 전체 스택을 컨테이너로 패키징
   - 로컬 개발 환경 통일

7. **Kubernetes 배포**
   - 수평 확장 (Horizontal Scaling)
   - 롤링 업데이트, Health Check

---

**작성자**: ThinkingData Korea
**날짜**: 2025-01-29
**Node.js 버전**: v20.x
**TypeScript 버전**: v5.4.5
**프레임워크**: Express.js, Next.js 14
