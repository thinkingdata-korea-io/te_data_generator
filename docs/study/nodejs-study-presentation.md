# ThinkingEngine 데이터 생성 플랫폼 - Node.js 스터디 발표자료

## 프로젝트 개요

Excel 스키마 파일을 기반으로 AI를 활용해 현실적인 서비스 이벤트 데이터를 생성하고, LogBus2를 통해 ThinkingEngine으로 전송하는 엔터프라이즈 데이터 생성 플랫폼입니다.

### 기술 스택
- **Backend**: Node.js + TypeScript + Express.js
- **Frontend**: Next.js 14 (App Router) + React + Tailwind CSS
- **Database**: PostgreSQL
- **AI Integration**: Anthropic Claude, OpenAI GPT, Google Gemini
- **데이터 전송**: LogBus2 (바이너리 래퍼)

---

## Node.js가 사용된 주요 영역

### 1. Express.js 기반 REST API 서버
**파일**: `data-generator/src/api/server.ts`

Node.js의 Express.js 프레임워크를 사용하여 전체 백엔드 API를 구축했습니다.

#### 주요 엔드포인트
```
POST   /api/auth/login              # JWT 기반 인증
GET    /api/auth/me                 # 현재 사용자 정보
POST   /api/excel/generate          # AI 기반 Excel 스키마 생성
POST   /api/excel/upload            # Excel 파일 업로드
GET    /api/excel/list              # Excel 파일 목록
POST   /api/generate/start          # 데이터 생성 시작 (비동기)
GET    /api/generate/status/:runId  # 생성 진행 상황 조회
POST   /api/send-data/:runId        # ThinkingEngine으로 전송
GET    /api/runs/list               # 실행 기록 조회
GET    /api/settings                # 사용자 설정 조회
POST   /api/settings                # 사용자 설정 저장
GET    /api/users                   # 사용자 관리 (Admin)
GET    /api/audit-logs              # 감사 로그 (Admin)
```

#### Node.js의 장점을 활용한 부분
- **비동기 I/O**: 데이터 생성 작업을 비동기로 처리하여 API 응답성 유지
- **이벤트 기반**: 진행 상황을 실시간으로 업데이트
- **파일 스트리밍**: 대용량 Excel 및 JSONL 파일 처리

---

### 2. 데이터 생성 엔진 (Core Logic)
**파일**: `data-generator/src/data-generator.ts`

TypeScript로 작성된 데이터 생성 오케스트레이터입니다.

#### 주요 기능
```typescript
export class DataGenerator {
  async generate(): Promise<GenerationResult> {
    // 1. Excel 스키마 파싱
    const schema = await this.parseExcel();

    // 2. AI를 통한 데이터 범위 분석
    const analysis = await this.analyzeWithAI(schema);

    // 3. 사용자 코호트 생성 (신규/활성/복귀/이탈)
    const users = await this.generateUsers();

    // 4. 이벤트 데이터 생성 (퍼널 고려)
    const events = await this.generateEvents(users);

    // 5. ThinkingEngine 형식으로 변환
    const teEvents = await this.formatToTE(events);

    // 6. JSONL 파일 출력
    await this.writeToFile(teEvents);
  }
}
```

---

### 3. PostgreSQL 연동 (CRUD)
**위치**: `data-generator/src/db/`

Node.js의 `pg` 패키지를 사용하여 PostgreSQL과 연동합니다.

#### 데이터베이스 테이블 구조

##### 1. **Users 테이블** (사용자 관리)
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100),
  role VARCHAR(20) DEFAULT 'user',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login_at TIMESTAMP
);
```

**CRUD 구현**: `src/db/repositories/user-repository.ts`
```typescript
// CREATE
export async function createUser(data: CreateUserData): Promise<User>

// READ
export async function findUserByUsername(username: string): Promise<User | null>
export async function findUserById(userId: number): Promise<User | null>
export async function getAllUsers(): Promise<User[]>

// UPDATE
export async function updateUser(userId: number, updates: Partial<User>): Promise<User>
export async function updateLastLogin(userId: number): Promise<void>

// DELETE
export async function deleteUser(userId: number): Promise<boolean>
```

##### 2. **User Settings 테이블** (사용자별 설정)
```sql
CREATE TABLE user_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,

  -- AI Provider 설정
  anthropic_api_key TEXT,
  openai_api_key TEXT,
  gemini_api_key TEXT,
  excel_ai_provider VARCHAR(20) DEFAULT 'anthropic',
  data_ai_provider VARCHAR(20) DEFAULT 'anthropic',
  validation_model_tier VARCHAR(20) DEFAULT 'fast',

  -- ThinkingEngine 설정
  te_app_id VARCHAR(100),
  te_receiver_url VARCHAR(255),

  -- 파일 보관 설정
  data_retention_days INTEGER DEFAULT 7,
  excel_retention_days INTEGER DEFAULT 30,
  auto_delete_after_send BOOLEAN DEFAULT false,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**CRUD 구현**: `src/db/repositories/user-settings-repository.ts`
```typescript
// CREATE (자동 생성, upsert 패턴)
export async function getUserSettings(userId: number): Promise<UserSettings>

// UPDATE
export async function updateUserSettings(userId: number, settings: Partial<UserSettings>)
```

##### 3. **Runs 테이블** (데이터 생성 실행 기록)
```sql
CREATE TABLE runs (
  id VARCHAR(100) PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  excel_file_path VARCHAR(500),
  scenario TEXT,
  dau INTEGER,
  date_start DATE,
  date_end DATE,
  status VARCHAR(20), -- pending, running, completed, failed, sent
  progress INTEGER DEFAULT 0,
  total_users INTEGER,
  total_events INTEGER,
  files_generated JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  sent_at TIMESTAMP
);
```

**CRUD 구현**: `src/api/server.ts`에서 직접 처리
```typescript
// READ - 실행 목록 조회
GET /api/runs/list

// READ - 특정 실행 조회
GET /api/runs/:runId

// DELETE - 실행 데이터 삭제
DELETE /api/runs/:runId

// UPDATE - 보관 기간 연장
PUT /api/runs/:runId/retention
```

##### 4. **Audit Logs 테이블** (감사 로그)
```sql
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  username VARCHAR(50),
  action VARCHAR(50) NOT NULL, -- login, create_run, upload_excel, send_data
  resource_type VARCHAR(50),   -- run, excel, data, user
  resource_id VARCHAR(100),
  details JSONB,               -- 추가 상세 정보
  status VARCHAR(20),          -- success, failed
  error_message TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**CRUD 구현**: `src/db/repositories/audit-repository.ts`
```typescript
// CREATE
export async function createAuditLog(log: AuditLogInput): Promise<void>

// READ - 필터링 및 페이지네이션
export async function getAuditLogs(filters: AuditLogFilters): Promise<{
  logs: AuditLog[];
  pagination: Pagination;
}>
```

##### 5. **Excel Uploads 테이블** (업로드된 Excel 파일 추적)
```sql
CREATE TABLE excel_uploads (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  original_filename VARCHAR(255),
  stored_filename VARCHAR(255),
  file_size BIGINT,
  file_path VARCHAR(500),
  uploaded_at TIMESTAMP DEFAULT NOW()
);
```

---

### 4. 주요 생성기 모듈 (Node.js TypeScript)

#### 4.1 Cohort Generator (코호트 생성기)
**파일**: `src/generators/cohort-generator.ts`

사용자 생명주기를 시뮬레이션합니다.

```typescript
export class CohortGenerator {
  // 신규 유저 (New Users)
  // 활성 유저 (Active Users)
  // 복귀 유저 (Returning Users)
  // 이탈 유저 (Churned Users)

  generateDailyUsers(date: Date, dau: number): User[]
}
```

#### 4.2 Event Generator (이벤트 생성기)
**파일**: `src/generators/event-generator.ts`

사용자 행동 시뮬레이션 및 이벤트 생성

```typescript
export class EventGenerator {
  // 이벤트 의존성 관리
  // 퍼널 추적 (Funnel Tracking)
  // 세션 생성

  generateEventsForUser(user: User, date: Date): TEEvent[]
}
```

#### 4.3 Marketing Generator (마케팅 데이터 생성기)
**파일**: `src/generators/marketing-generator.ts`

UTM 파라미터 및 광고 채널 시뮬레이션

```typescript
export class MarketingGenerator {
  generateUTMParams(): {
    utm_source: string;
    utm_medium: string;
    utm_campaign: string;
  }
}
```

#### 4.4 Dependency Manager (의존성 관리)
**파일**: `src/generators/dependency-manager.ts`

이벤트 간 의존성 추적 (예: 회원가입 → 로그인 → 구매)

```typescript
export class DependencyManager {
  checkDependencies(eventName: string, firedEvents: Set<string>): boolean
  trackEvent(eventName: string): void
}
```

---

### 5. AI 통합 (Multi-Provider)
**파일**: `src/ai/client.ts`

Node.js에서 3개 AI Provider를 동시 지원합니다.

```typescript
export class AIClient {
  constructor(
    provider: 'openai' | 'anthropic' | 'gemini',
    apiKey: string
  ) {
    if (provider === 'openai') {
      this.client = new OpenAI({ apiKey });
    } else if (provider === 'anthropic') {
      this.client = new Anthropic({ apiKey });
    } else {
      this.client = new GoogleGenerativeAI(apiKey);
    }
  }

  async analyzeSchema(schema: ParsedSchema, userInput: UserInput): Promise<AIAnalysisResult>
}
```

#### AI 사용 사례
1. **Excel 스키마 생성**: 사용자가 "쇼핑몰 서비스" 설명 → AI가 이벤트/속성 설계
2. **데이터 범위 추론**: "이커머스, DAU 10,000명" → AI가 적절한 숫자 범위 제안
3. **검증 파이프라인**: 생성된 데이터를 AI로 검증하여 품질 보장

---

### 6. 파일 처리 (Excel, JSONL)

#### Excel 파싱
**파일**: `src/excel/parser.ts`

```typescript
import ExcelJS from 'exceljs';

export class ExcelParser {
  async parseExcelFile(filePath: string): Promise<ParsedSchema> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    // 시트별 파싱
    // - Event List
    // - Event Properties
    // - Common Properties
    // - User Data
    // - Funnels
  }
}
```

#### JSONL 출력 (ThinkingEngine 형식)
**파일**: `src/formatters/te-formatter.ts`

```typescript
export class TEFormatter {
  formatEvent(event: EventData): TEEvent {
    return {
      "#account_id": appId,
      "#distinct_id": event.distinctId,
      "#event_name": event.eventName,
      "#time": event.timestamp,
      ...event.properties
    };
  }
}
```

---

### 7. LogBus2 제어 (Child Process)
**파일**: `src/logbus/controller.ts`

Node.js의 `child_process`를 사용하여 LogBus2 바이너리를 제어합니다.

```typescript
import { exec, spawn } from 'child_process';

export class LogBus2Controller {
  async start(): Promise<void> {
    await this.execLogBus('start');
  }

  async stop(): Promise<void> {
    await this.execLogBus('stop');
  }

  async monitorProgress(intervalSec: number, callback: ProgressCallback): Promise<void> {
    // LogBus2 'progress' 명령어 주기적 실행
    // 파일 업로드 진행 상황 추적
  }
}
```

---

### 8. 인증 및 보안 (JWT, bcrypt)
**파일**: `src/api/auth.ts`

```typescript
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export async function authenticateUser(username: string, password: string) {
  const user = await findUserByUsername(username);
  const isValid = await bcrypt.compare(password, user.passwordHash);

  if (isValid) {
    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET);
    return { user, token };
  }
}
```

#### 미들웨어
- `requireAuth`: JWT 토큰 검증
- `requireAdmin`: Admin 권한 확인
- `auditMiddleware`: 감사 로그 자동 기록

---

### 9. 파일 업로드 (Multer)
**파일**: `src/api/server.ts`

```typescript
import multer from 'multer';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
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

app.post('/api/excel/upload', upload.single('file'), handler);
```

---

## 주요 데이터 흐름

```
1. 사용자 로그인 (JWT 발급)
   ↓
2. Excel 스키마 업로드 또는 AI 생성
   ↓
3. POST /api/generate/start (비동기 시작)
   ├─ Excel 파싱
   ├─ AI 분석 (데이터 범위)
   ├─ 코호트 생성 (유저 시뮬레이션)
   ├─ 이벤트 생성 (퍼널 고려)
   └─ JSONL 파일 출력
   ↓
4. GET /api/generate/status/:runId (진행 상황 폴링)
   ↓
5. POST /api/send-data/:runId
   ├─ LogBus2 설정
   ├─ LogBus2 시작
   ├─ 데이터 전송 모니터링
   └─ LogBus2 종료
   ↓
6. ThinkingEngine에서 데이터 확인
```

---

## 성능 최적화

### 1. 비동기 데이터 생성
```typescript
async function generateDataAsync(runId: string, config: DataGeneratorConfig) {
  // 즉시 202 Accepted 반환
  // 백그라운드에서 데이터 생성
  // progressMap으로 상태 추적
}
```

### 2. 진행 상황 콜백
```typescript
export type ProgressCallback = (progress: {
  status: string;
  progress: number;  // 0-100
  message: string;
  step?: string;     // "1/5"
}) => void;
```

### 3. 파일 정리 스케줄러
```typescript
// 매일 자정에 오래된 파일 자동 삭제
setInterval(() => {
  cleanupOldFiles();
}, 24 * 60 * 60 * 1000);
```

---

## 보안 기능

1. **JWT 기반 인증**: 상태 비저장(stateless) 인증
2. **Role-Based Access Control (RBAC)**: admin, user, viewer
3. **bcrypt 암호화**: 비밀번호 해싱 (Salt Rounds: 10)
4. **감사 로그**: 모든 중요 작업 기록 (누가, 언제, 무엇을)
5. **API Key 암호화 저장**: 사용자별 AI API Key 안전 보관

---

## 환경 변수 (.env)

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/te_platform

# JWT
JWT_SECRET=your-super-secret-key

# AI Providers
ANTHROPIC_API_KEY=sk-ant-xxx
OPENAI_API_KEY=sk-xxx
GEMINI_API_KEY=xxx

# AI Models
EXCEL_AI_PROVIDER=anthropic
DATA_AI_PROVIDER=anthropic
DATA_AI_MODEL=claude-3-5-sonnet-20241022
VALIDATION_MODEL_TIER=fast

# ThinkingEngine
TE_APP_ID=your-app-id
TE_RECEIVER_URL=https://te-receiver-naver.thinkingdata.kr/

# File Retention
DATA_RETENTION_DAYS=7
EXCEL_RETENTION_DAYS=30
AUTO_DELETE_AFTER_SEND=false

# Server
API_PORT=3001
```

---

## 프로젝트 구조

```
demo_data_gen/
├── data-generator/              # Node.js Backend
│   ├── src/
│   │   ├── api/                # Express.js REST API
│   │   │   ├── server.ts       # 메인 서버
│   │   │   ├── auth.ts         # 인증 로직
│   │   │   ├── middleware.ts   # 인증/권한 미들웨어
│   │   │   └── routes/         # 라우터 분리
│   │   │       ├── excel.ts    # Excel 관련 API
│   │   │       └── files.ts    # 파일 관리 API
│   │   ├── db/                 # PostgreSQL 연동
│   │   │   ├── connection.ts   # DB 커넥션 풀
│   │   │   ├── schema.sql      # 테이블 스키마
│   │   │   └── repositories/   # Repository 패턴
│   │   │       ├── user-repository.ts
│   │   │       ├── user-settings-repository.ts
│   │   │       └── audit-repository.ts
│   │   ├── generators/         # 데이터 생성 로직
│   │   │   ├── cohort-generator.ts
│   │   │   ├── event-generator.ts
│   │   │   ├── marketing-generator.ts
│   │   │   └── dependency-manager.ts
│   │   ├── ai/                 # AI 통합
│   │   │   ├── client.ts       # Multi-provider AI client
│   │   │   └── prompts.ts      # AI 프롬프트
│   │   ├── excel/              # Excel 처리
│   │   │   └── parser.ts       # ExcelJS 파싱
│   │   ├── formatters/         # 데이터 포맷터
│   │   │   └── te-formatter.ts # ThinkingEngine 형식
│   │   ├── logbus/             # LogBus2 제어
│   │   │   └── controller.ts   # child_process 래퍼
│   │   ├── types/              # TypeScript 타입 정의
│   │   └── utils/              # 유틸리티
│   └── package.json
│
├── frontend/                    # Next.js Frontend
│   ├── src/
│   │   ├── app/                # App Router
│   │   │   ├── login/
│   │   │   └── dashboard/
│   │   ├── components/         # React 컴포넌트
│   │   ├── contexts/           # React Context (AuthContext)
│   │   └── i18n/               # 다국어 지원 (ko, en, zh)
│   └── package.json
│
├── excel-schema-generator/      # Excel 생성 프로그램
│   └── src/
│       ├── schema-generator.ts  # AI 기반 Excel 생성
│       └── taxonomy-builder-v2.ts
│
├── output/
│   ├── data/                   # 생성된 JSONL 데이터
│   └── runs/                   # 실행 메타데이터
│
└── logbus 2/                   # LogBus2 바이너리
    └── logbus
```

---

## 실행 방법

### 1. 백엔드 실행
```bash
cd data-generator
npm install
npm run api    # Express 서버 시작 (Port 3001)
```

### 2. 프론트엔드 실행
```bash
cd frontend
npm install
npm run dev    # Next.js 서버 시작 (Port 3000)
```

### 3. 데이터베이스 마이그레이션
```bash
cd data-generator
npm run db:migrate    # schema.sql 실행
```

---

## 핵심 Node.js 기술 요약

| 기술 | 사용 목적 | 파일 위치 |
|------|----------|----------|
| **Express.js** | REST API 서버 | `api/server.ts` |
| **TypeScript** | 타입 안정성 | 전체 프로젝트 |
| **pg (node-postgres)** | PostgreSQL 연동 | `db/connection.ts` |
| **bcrypt** | 비밀번호 해싱 | `api/auth.ts` |
| **jsonwebtoken** | JWT 인증 | `api/auth.ts` |
| **multer** | 파일 업로드 | `api/server.ts` |
| **ExcelJS** | Excel 파싱 | `excel/parser.ts` |
| **child_process** | LogBus2 제어 | `logbus/controller.ts` |
| **Anthropic SDK** | Claude AI | `ai/client.ts` |
| **OpenAI SDK** | GPT AI | `ai/client.ts` |
| **@faker-js/faker** | 현실적인 더미 데이터 | `generators/faker-utils.ts` |

---

## 특징 및 배운 점

### 1. 비동기 처리의 중요성
- 데이터 생성은 수분이 걸리는 작업
- 즉시 응답 후 백그라운드 처리
- 진행 상황을 별도 엔드포인트로 제공

### 2. TypeScript의 장점
- 복잡한 데이터 구조를 타입으로 명확히 정의
- 컴파일 타임에 오류 발견
- IDE 자동완성으로 생산성 향상

### 3. Repository 패턴
- 데이터베이스 로직을 별도 레이어로 분리
- 테스트 가능성 향상
- 코드 재사용성 증가

### 4. 멀티 프로바이더 전략
- 3개 AI Provider 지원으로 유연성 확보
- Provider별 특성에 맞게 모델 선택 가능

### 5. 보안 및 감사
- 모든 중요 작업을 감사 로그에 기록
- 역할 기반 접근 제어로 권한 분리

---

## 향후 개선 사항

1. **Redis 도입**: progressMap을 Redis로 이전하여 서버 재시작 시 상태 유지
2. **WebSocket**: 진행 상황을 폴링 대신 실시간 푸시
3. **Queue System**: Bull/BullMQ로 작업 큐 관리
4. **Docker Compose**: 전체 스택을 컨테이너로 패키징
5. **GraphQL**: REST API 대신 GraphQL로 전환 고려
6. **테스트 코드**: Jest + Supertest로 API 테스트 작성

---

## Q&A

질문이 있으시면 언제든지 물어보세요!

---

**작성자**: ThinkingData Korea
**날짜**: 2025-01-13
**Node.js 버전**: v20.x
**TypeScript 버전**: v5.4.5
