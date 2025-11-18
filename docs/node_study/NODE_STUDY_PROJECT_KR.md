# Node.js 프로젝트 발표 자료

## ThinkingEngine AI 기반 이벤트 데이터 생성 플랫폼

> **프로젝트 목표**: Excel 스키마를 기반으로 현실적인 서비스 이벤트 데이터를 생성하고, 멀티유저 계정 시스템으로 관리하는 Node.js 백엔드 시스템

---

## 📋 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [Node.js 핵심 활용 영역](#2-nodejs-핵심-활용-영역)
3. [CRUD 구현 계획](#3-crud-구현-계획)
4. [데이터베이스 설계](#4-데이터베이스-설계)
5. [API 엔드포인트](#5-api-엔드포인트)
6. [프로젝트 아키텍처](#6-프로젝트-아키텍처)
7. [기술 스택](#7-기술-스택)

---

## 1. 프로젝트 개요

### 1.1 무엇을 만드는가?

- AI를 활용하여 **현실적인 사용자 행동 데이터**를 자동 생성하는 시스템
- Excel로 정의된 이벤트 스키마를 읽어서 수백만 개의 이벤트 데이터를 생성
- 멀티유저 계정 시스템으로 각 사용자가 독립적으로 데이터 관리

### 1.2 핵심 기능

1. **Excel 스키마 파싱** - 이벤트, 속성, 유저 세그먼트 정의 읽기
2. **AI 기반 데이터 생성** - Anthropic Claude API를 활용한 현실적 데이터 범위 생성
3. **유저 생명주기 시뮬레이션** - 신규/활성/복귀/이탈 유저 패턴 구현
4. **일자별 JSONL 파일 생성** - 날짜별로 분리된 이벤트 데이터
5. **LogBus2 자동 전송** - ThinkingEngine으로 데이터 전송
6. **멀티유저 계정 시스템** - 회원가입/로그인, 실행 히스토리 관리

---

## 2. Node.js 핵심 활용 영역

### 2.1 Express.js 기반 REST API 서버

```javascript
// src/api/server.ts
import express from 'express';

const app = express();
const PORT = process.env.API_PORT || 3001;

// 미들웨어
app.use(cors());
app.use(express.json());

// API 엔드포인트
app.get('/api/excel/list', async (req, res) => { ... });
app.post('/api/generate/start', async (req, res) => { ... });
app.post('/api/send-data/:runId', async (req, res) => { ... });

app.listen(PORT, () => {
  console.log(`🚀 API Server running on http://localhost:${PORT}`);
});
```

**Node.js 활용:**

- Express.js 미들웨어 체인
- 비동기 라우트 핸들러
- RESTful API 설계

---

### 2.2 파일 시스템 처리 (File I/O)

```typescript
// 파일 업로드 (Multer)
import multer from "multer";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const originalName = Buffer.from(file.originalname, "latin1").toString(
      "utf8"
    );
    cb(null, `${timestamp}_${originalName}`);
  },
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// 파일 읽기/쓰기 (fs)
import * as fs from "fs";

// Excel 파일 목록 조회
const files = fs
  .readdirSync(schemaDir)
  .filter((f) => f.endsWith(".xlsx"))
  .map((f) => ({
    name: f,
    path: path.join(schemaDir, f),
    size: fs.statSync(path.join(schemaDir, f)).size,
    modified: fs.statSync(path.join(schemaDir, f)).mtime,
  }));

// JSONL 파일 스트리밍 작성
const writeStream = fs.createWriteStream(outputPath);
events.forEach((event) => {
  writeStream.write(JSON.stringify(event) + "\n");
});
writeStream.end();
```

**Node.js 활용:**

- `fs` 모듈 (파일 읽기/쓰기/삭제)
- `multer` (멀티파트 파일 업로드)
- Stream API (대용량 파일 처리)
- `path` 모듈 (경로 조작)

---

### 2.3 Child Process 관리 (LogBus2 실행)

```typescript
// src/logbus/controller.ts
import { spawn, exec } from "child_process";

export class LogBus2Controller {
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      // LogBus2 프로세스 시작
      const logbusProcess = spawn(this.logbusPath, ["start"], {
        cwd: path.dirname(this.logbusPath),
        stdio: "pipe",
      });

      logbusProcess.on("exit", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`LogBus2 exited with code ${code}`));
      });
    });
  }

  async getProgress(): Promise<LogBusProgress> {
    return new Promise((resolve, reject) => {
      exec(`${this.logbusPath} progress`, (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        const progress = JSON.parse(stdout);
        resolve(progress);
      });
    });
  }

  async stop(): Promise<void> {
    await new Promise((resolve) => {
      exec(`${this.logbusPath} stop`, () => resolve(undefined));
    });
  }
}
```

**Node.js 활용:**

- `child_process.spawn` (외부 바이너리 실행)
- `child_process.exec` (명령어 실행 및 출력 캡처)
- Promise 기반 프로세스 제어

---

### 2.4 비동기 처리 (Async/Await, Promise)

```typescript
// 데이터 생성 비동기 함수
async function generateDataAsync(runId: string, config: DataGeneratorConfig) {
  try {
    // 초기 상태
    progressMap.set(runId, {
      status: 'starting',
      progress: 5,
      message: '데이터 생성 준비 중...'
    });

    // DataGenerator 실행 (비동기)
    const generator = new DataGenerator(config);
    const result = await generator.generate();

    // 완료 상태 업데이트
    progressMap.set(runId, {
      status: 'completed',
      progress: 100,
      message: '✅ 데이터 생성 완료!',
      result: { ... }
    });

  } catch (error: any) {
    // 에러 처리
    progressMap.set(runId, {
      status: 'error',
      message: `❌ 오류: ${error.message}`
    });
  }
}

// 비동기 데이터 전송 (LogBus2)
async function sendDataAsync(runId: string, appId: string) {
  const logbusController = new LogBus2Controller({ ... });

  await logbusController.createDaemonConfig();
  await logbusController.start();

  // 진행 상태 모니터링 (폴링)
  await logbusController.monitorProgress(3, (status) => {
    progressMap.set(runId, {
      progress: status.progress,
      message: `전송 중: ${status.uploadedFiles}/${status.totalFiles}`
    });
  });

  await logbusController.stop();
}
```

**Node.js 활용:**

- `async/await` 구문 (비동기 코드의 동기적 표현)
- Promise 체이닝
- 에러 핸들링 (try/catch)
- 비동기 콜백 패턴

---

### 2.5 환경변수 관리 (dotenv)

```typescript
// .env 파일
ANTHROPIC_API_KEY=sk-ant-xxx
OPENAI_API_KEY=sk-xxx
TE_APP_ID=your_app_id
TE_RECEIVER_URL=https://te-receiver-naver.thinkingdata.kr/
DATABASE_URL=postgresql://user:password@localhost:5432/demo_data_gen
JWT_SECRET=your-secret-key
DATA_RETENTION_DAYS=7
EXCEL_RETENTION_DAYS=30
AUTO_DELETE_AFTER_SEND=false

// 환경변수 로드
import * as dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.ANTHROPIC_API_KEY;
const dbUrl = process.env.DATABASE_URL;

// 설정 업데이트 (런타임)
function updateEnvVar(key: string, value: string) {
  const envPath = path.resolve(__dirname, '../../../.env');
  let envContent = fs.readFileSync(envPath, 'utf-8');

  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(envContent)) {
    envContent = envContent.replace(regex, `${key}=${value}`);
  } else {
    envContent += `\n${key}=${value}`;
  }

  fs.writeFileSync(envPath, envContent.trim() + '\n');
  process.env[key] = value;
}
```

**Node.js 활용:**

- `dotenv` 패키지 (환경변수 관리)
- `process.env` (환경변수 접근)
- 런타임 환경변수 업데이트

---

### 2.6 스케줄링 (자동 파일 정리)

```typescript
// 24시간마다 오래된 파일 정리
function cleanupOldFiles() {
  const dataRetentionDays = parseInt(process.env.DATA_RETENTION_DAYS || "7");
  const now = Date.now();

  // 데이터 파일 정리
  const dataDir = path.resolve(__dirname, "../../../output/data");
  if (fs.existsSync(dataDir)) {
    const runDirs = fs.readdirSync(dataDir).filter((d) => d.startsWith("run_"));

    for (const runDir of runDirs) {
      const runPath = path.join(dataDir, runDir);
      const stat = fs.statSync(runPath);
      const ageInDays = (now - stat.mtimeMs) / (1000 * 60 * 60 * 24);

      if (ageInDays > dataRetentionDays) {
        console.log(`🗑️  Removing old data: ${runDir}`);
        fs.rmSync(runPath, { recursive: true, force: true });
      }
    }
  }
}

// 서버 시작 시 초기 정리
app.listen(PORT, () => {
  console.log("🧹 Running initial cleanup...");
  cleanupOldFiles();

  // 24시간마다 정리 실행
  setInterval(() => {
    console.log("🧹 Running scheduled cleanup...");
    cleanupOldFiles();
  }, 24 * 60 * 60 * 1000);
});
```

**Node.js 활용:**

- `setInterval` (주기적 작업 실행)
- 파일 시스템 탐색 및 정리

---

### 2.7 HTTP 요청 처리 (외부 API 호출)

```typescript
// AI API 호출 (Anthropic Claude)
import Anthropic from "@anthropic-ai/sdk";

export class AIClient {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async generateDataRanges(prompt: string): Promise<AIResponse> {
    const response = await this.client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 16000,
      temperature: 0.7,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type === "text") {
      return JSON.parse(content.text);
    }

    throw new Error("Invalid AI response");
  }
}
```

**Node.js 활용:**

- HTTP 클라이언트 라이브러리
- REST API 통신
- JSON 파싱

---

## 3. CRUD 구현 계획

### 3.1 개요

**멀티유저 계정 시스템**을 구축하여 사용자별로 독립적인 데이터 관리를 지원합니다.

### 3.2 주요 CRUD 기능

#### 3.2.1 인증 시스템 (Authentication)

| 작업       | API 엔드포인트            | 설명                        |
| ---------- | ------------------------- | --------------------------- |
| **CREATE** | `POST /api/auth/register` | 회원가입 (이메일, 비밀번호) |
| **READ**   | `POST /api/auth/login`    | 로그인 (JWT 토큰 발급)      |
| **READ**   | `GET /api/auth/me`        | 현재 사용자 정보 조회       |
| **DELETE** | `POST /api/auth/logout`   | 로그아웃 (토큰 무효화)      |

**구현 상세:**

```typescript
// 회원가입
app.post("/api/auth/register", async (req, res) => {
  const { email, password, name } = req.body;

  // 비밀번호 해싱 (bcrypt)
  const hashedPassword = await bcrypt.hash(password, 10);

  // DB에 사용자 생성
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
    },
  });

  res.json({ success: true, userId: user.id });
});

// 로그인
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  // 사용자 조회
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  // 비밀번호 검증
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  // JWT 토큰 발급
  const token = jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET!,
    { expiresIn: "24h" }
  );

  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name },
  });
});
```

---

#### 3.2.2 사용자 설정 관리 (User Settings)

| 작업              | API 엔드포인트                   | 설명                            |
| ----------------- | -------------------------------- | ------------------------------- |
| **CREATE/UPDATE** | `PUT /api/user/settings`         | 설정 저장 (APP_ID, API Keys 등) |
| **READ**          | `GET /api/user/settings`         | 설정 조회                       |
| **DELETE**        | `DELETE /api/user/settings/:key` | 특정 설정 삭제                  |

**저장 데이터:**

- `TE_APP_ID` - ThinkingEngine 앱 ID
- `TE_RECEIVER_URL` - 데이터 수신 URL
- `ANTHROPIC_API_KEY` - AI API Key (암호화 저장)
- `OPENAI_API_KEY` - OpenAI API Key (암호화 저장)

---

#### 3.2.3 실행 히스토리 관리 (Run History)

| 작업       | API 엔드포인트             | 설명                               |
| ---------- | -------------------------- | ---------------------------------- |
| **CREATE** | `POST /api/generate/start` | 새 데이터 생성 실행                |
| **READ**   | `GET /api/runs`            | 내 실행 목록 조회 (페이징, 필터링) |
| **READ**   | `GET /api/runs/:runId`     | 실행 상세 정보 조회                |
| **DELETE** | `DELETE /api/runs/:runId`  | 실행 및 관련 파일 삭제             |

**조회 가능한 정보:**

- 실행 ID, 생성 날짜
- 시나리오, DAU, 산업
- 총 사용자 수, 총 이벤트 수
- 생성된 파일 목록
- 전송 상태 (pending, completed, sent)

**필터링 옵션:**

```typescript
GET /api/runs?status=completed&industry=commerce&limit=20&offset=0
```

---

#### 3.2.4 파일 관리 (File Management)

| 작업       | API 엔드포인트                    | 설명              |
| ---------- | --------------------------------- | ----------------- |
| **CREATE** | `POST /api/files/upload`          | Excel 파일 업로드 |
| **READ**   | `GET /api/files`                  | 내 파일 목록 조회 |
| **READ**   | `GET /api/files/:fileId/download` | 파일 다운로드     |
| **DELETE** | `DELETE /api/files/:fileId`       | 파일 삭제         |

**파일 유형:**

- `excel` - 업로드된 Excel 스키마
- `jsonl` - 생성된 이벤트 데이터
- `metadata` - 실행 메타데이터

---

## 4. 데이터베이스 설계

### 4.1 선택한 기술

- **PostgreSQL** 14+ (관계형 데이터베이스)
- **Prisma ORM** (타입 안전한 쿼리)
- **Docker Compose** (로컬 개발 환경)

### 4.2 테이블 구조

#### 4.2.1 ERD (Entity Relationship Diagram)

```
┌─────────────────┐
│     User        │
│─────────────────│
│ id (PK)         │◄─────┐
│ email (UNIQUE)  │      │
│ password        │      │
│ name            │      │
│ createdAt       │      │
│ updatedAt       │      │
└─────────────────┘      │
                         │ 1:1
                         │
                    ┌────┴────────────┐
                    │  UserSetting    │
                    │─────────────────│
                    │ id (PK)         │
                    │ userId (FK)     │
                    │ appId           │
                    │ receiverUrl     │
                    │ anthropicApiKey │ (암호화)
                    │ openaiApiKey    │ (암호화)
                    │ createdAt       │
                    │ updatedAt       │
                    └─────────────────┘

┌─────────────────┐
│     User        │
│─────────────────│
│ id (PK)         │◄─────┐
└─────────────────┘      │ 1:N
                         │
                    ┌────┴────────────┐
                    │      Run        │
                    │─────────────────│
                    │ id (PK)         │
                    │ userId (FK)     │
                    │ runId (UNIQUE)  │
                    │ status          │
                    │ scenario        │
                    │ dau             │
                    │ industry        │
                    │ notes           │
                    │ dateStart       │
                    │ dateEnd         │
                    │ totalUsers      │
                    │ totalEvents     │
                    │ totalDays       │
                    │ excelFileId     │
                    │ createdAt       │
                    │ updatedAt       │
                    │ completedAt     │
                    └────┬────────────┘
                         │ 1:N
                         │
                    ┌────┴────────────┐
                    │      File       │
                    │─────────────────│
                    │ id (PK)         │
                    │ userId (FK)     │
                    │ runId (FK)      │
                    │ fileName        │
                    │ filePath        │
                    │ fileType        │
                    │ fileSize        │
                    │ createdAt       │
                    └─────────────────┘
```

---

#### 4.2.2 Prisma 스키마 정의

```prisma
// prisma/schema.prisma

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// 사용자 테이블
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String   // bcrypt hashed
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  settings  UserSetting?
  runs      Run[]
  files     File[]

  @@index([email])
}

// 사용자 설정 테이블
model UserSetting {
  id              String   @id @default(uuid())
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  appId           String?  // TE_APP_ID
  receiverUrl     String?  // TE_RECEIVER_URL
  anthropicApiKey String?  // 암호화 저장
  openaiApiKey    String?  // 암호화 저장

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// 실행 히스토리 테이블
model Run {
  id              String   @id @default(uuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  runId           String   @unique  // run_timestamp 형식
  status          String   // pending, running, completed, error, sent
  scenario        String
  dau             Int
  industry        String
  notes           String?
  dateStart       String
  dateEnd         String

  totalUsers      Int?
  totalEvents     Int?
  totalDays       Int?

  excelFileId     String?
  dataFiles       File[]

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  completedAt DateTime?

  @@index([userId])
  @@index([runId])
  @@index([status])
}

// 파일 테이블
model File {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  runId     String?
  run       Run?     @relation(fields: [runId], references: [id], onDelete: Cascade)

  fileName  String
  filePath  String
  fileType  String   // excel, jsonl, metadata
  fileSize  Int

  createdAt DateTime @default(now())

  @@index([userId])
  @@index([runId])
  @@index([fileType])
}
```

---

#### 4.2.3 테이블 상세 설명

##### **User** 테이블

| 컬럼        | 타입     | 설명                         |
| ----------- | -------- | ---------------------------- |
| `id`        | UUID     | 사용자 고유 ID (Primary Key) |
| `email`     | String   | 이메일 (Unique, 로그인 ID)   |
| `password`  | String   | 비밀번호 (bcrypt 해싱)       |
| `name`      | String?  | 사용자 이름 (옵션)           |
| `createdAt` | DateTime | 가입 일시                    |
| `updatedAt` | DateTime | 마지막 수정 일시             |

##### **UserSetting** 테이블

| 컬럼              | 타입     | 설명                            |
| ----------------- | -------- | ------------------------------- |
| `id`              | UUID     | 설정 ID (Primary Key)           |
| `userId`          | UUID     | 사용자 ID (Foreign Key)         |
| `appId`           | String?  | ThinkingEngine APP_ID           |
| `receiverUrl`     | String?  | 데이터 수신 URL                 |
| `anthropicApiKey` | String?  | AI API Key (AES-256 암호화)     |
| `openaiApiKey`    | String?  | OpenAI API Key (AES-256 암호화) |
| `createdAt`       | DateTime | 생성 일시                       |
| `updatedAt`       | DateTime | 수정 일시                       |

##### **Run** 테이블

| 컬럼          | 타입      | 설명                                            |
| ------------- | --------- | ----------------------------------------------- |
| `id`          | UUID      | 실행 ID (Primary Key)                           |
| `userId`      | UUID      | 사용자 ID (Foreign Key)                         |
| `runId`       | String    | 실행 식별자 (run_timestamp)                     |
| `status`      | String    | 상태 (pending, running, completed, error, sent) |
| `scenario`    | String    | 시나리오 설명                                   |
| `dau`         | Int       | Daily Active Users                              |
| `industry`    | String    | 산업군 (commerce, game, fintech 등)             |
| `notes`       | String?   | 추가 메모                                       |
| `dateStart`   | String    | 시작 날짜 (YYYY-MM-DD)                          |
| `dateEnd`     | String    | 종료 날짜 (YYYY-MM-DD)                          |
| `totalUsers`  | Int?      | 총 생성된 사용자 수                             |
| `totalEvents` | Int?      | 총 생성된 이벤트 수                             |
| `totalDays`   | Int?      | 총 일수                                         |
| `excelFileId` | String?   | 사용된 Excel 파일 ID                            |
| `createdAt`   | DateTime  | 생성 일시                                       |
| `updatedAt`   | DateTime  | 수정 일시                                       |
| `completedAt` | DateTime? | 완료 일시                                       |

##### **File** 테이블

| 컬럼        | 타입     | 설명                               |
| ----------- | -------- | ---------------------------------- |
| `id`        | UUID     | 파일 ID (Primary Key)              |
| `userId`    | UUID     | 사용자 ID (Foreign Key)            |
| `runId`     | UUID?    | 실행 ID (Foreign Key, 옵션)        |
| `fileName`  | String   | 파일명                             |
| `filePath`  | String   | 파일 경로                          |
| `fileType`  | String   | 파일 유형 (excel, jsonl, metadata) |
| `fileSize`  | Int      | 파일 크기 (bytes)                  |
| `createdAt` | DateTime | 생성 일시                          |

---

### 4.3 인덱스 전략

- `User.email` - 로그인 조회 최적화
- `Run.userId` - 사용자별 실행 목록 조회
- `Run.runId` - runId로 빠른 검색
- `Run.status` - 상태별 필터링
- `File.userId` - 사용자별 파일 목록
- `File.runId` - 실행별 파일 조회

---

## 5. API 엔드포인트

### 5.1 인증 (Authentication)

| Method | Endpoint             | 설명         | 인증 필요 |
| ------ | -------------------- | ------------ | --------- |
| POST   | `/api/auth/register` | 회원가입     | ❌        |
| POST   | `/api/auth/login`    | 로그인       | ❌        |
| GET    | `/api/auth/me`       | 내 정보 조회 | ✅        |
| POST   | `/api/auth/logout`   | 로그아웃     | ✅        |

---

### 5.2 사용자 설정 (User Settings)

| Method | Endpoint                  | 설명           | 인증 필요 |
| ------ | ------------------------- | -------------- | --------- |
| GET    | `/api/user/settings`      | 설정 조회      | ✅        |
| PUT    | `/api/user/settings`      | 설정 저장      | ✅        |
| DELETE | `/api/user/settings/:key` | 특정 설정 삭제 | ✅        |

---

### 5.3 Excel 관리 (Excel Management)

| Method | Endpoint                        | 설명                       | 인증 필요 |
| ------ | ------------------------------- | -------------------------- | --------- |
| GET    | `/api/excel/list`               | Excel 파일 목록            | ✅        |
| POST   | `/api/excel/upload`             | Excel 파일 업로드          | ✅        |
| POST   | `/api/excel/parse`              | Excel 파일 파싱 (미리보기) | ✅        |
| GET    | `/api/excel/download/:filename` | Excel 파일 다운로드        | ✅        |

---

### 5.4 데이터 생성 (Data Generation)

| Method | Endpoint                      | 설명             | 인증 필요 |
| ------ | ----------------------------- | ---------------- | --------- |
| POST   | `/api/generate/start`         | 데이터 생성 시작 | ✅        |
| GET    | `/api/generate/status/:runId` | 진행 상태 조회   | ✅        |

---

### 5.5 실행 히스토리 (Run History)

| Method | Endpoint           | 설명              | 인증 필요 |
| ------ | ------------------ | ----------------- | --------- |
| GET    | `/api/runs`        | 내 실행 목록 조회 | ✅        |
| GET    | `/api/runs/:runId` | 실행 상세 조회    | ✅        |
| DELETE | `/api/runs/:runId` | 실행 삭제         | ✅        |

**쿼리 파라미터:**

```
GET /api/runs?status=completed&industry=game&limit=20&offset=0
```

---

### 5.6 파일 관리 (File Management)

| Method | Endpoint                      | 설명          | 인증 필요 |
| ------ | ----------------------------- | ------------- | --------- |
| GET    | `/api/files`                  | 내 파일 목록  | ✅        |
| GET    | `/api/files/:fileId/download` | 파일 다운로드 | ✅        |
| DELETE | `/api/files/:fileId`          | 파일 삭제     | ✅        |

---

### 5.7 데이터 전송 (Data Transmission)

| Method | Endpoint                | 설명                | 인증 필요 |
| ------ | ----------------------- | ------------------- | --------- |
| POST   | `/api/send-data/:runId` | ThinkingEngine 전송 | ✅        |

---

## 6. 프로젝트 아키텍처

### 6.1 전체 시스템 구조

```
┌─────────────────────────────────────────────────────────────┐
│                  프론트엔드 (Next.js 14)                     │
│                   http://localhost:3000                      │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ 로그인/회원가입 │  │ 데이터 생성 UI  │                  │
│  └─────────────────┘  └─────────────────┘                  │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ 실행 히스토리   │  │ 파일 관리       │                  │
│  └─────────────────┘  └─────────────────┘                  │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP/REST API
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              백엔드 API 서버 (Express + TypeScript)         │
│                   http://localhost:3001                      │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ 인증 미들웨어│  │ JWT 검증     │  │ CORS 설정    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                   REST API 라우터                     │  │
│  │  • /api/auth/*        - 인증                         │  │
│  │  • /api/user/*        - 사용자 설정                  │  │
│  │  • /api/excel/*       - Excel 관리                   │  │
│  │  • /api/generate/*    - 데이터 생성                  │  │
│  │  • /api/runs/*        - 실행 히스토리                │  │
│  │  • /api/files/*       - 파일 관리                    │  │
│  │  • /api/send-data/*   - 데이터 전송                  │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────┬─────────────────────┬───────────────────────────┘
            │                     │
            │                     │
            ▼                     ▼
┌─────────────────────┐  ┌─────────────────────────────────┐
│  PostgreSQL DB      │  │   데이터 생성 엔진               │
│  (Docker Container) │  │                                  │
│                     │  │  ┌───────────────────────────┐  │
│  ┌──────────────┐   │  │  │ Excel 파서               │  │
│  │ User         │   │  │  │ (ExcelJS)                 │  │
│  │ UserSetting  │   │  │  └───────────────────────────┘  │
│  │ Run          │   │  │  ┌───────────────────────────┐  │
│  │ File         │   │  │  │ AI 클라이언트             │  │
│  └──────────────┘   │  │  │ (Anthropic Claude)        │  │
│                     │  │  └───────────────────────────┘  │
│  Prisma ORM         │  │  ┌───────────────────────────┐  │
└─────────────────────┘  │  │ 코호트 생성기             │  │
                         │  │ (Faker.js)                │  │
                         │  └───────────────────────────┘  │
                         │  ┌───────────────────────────┐  │
                         │  │ 이벤트 생성기             │  │
                         │  │ (의존성 관리)             │  │
                         │  └───────────────────────────┘  │
                         │  ┌───────────────────────────┐  │
                         │  │ JSONL 포맷터              │  │
                         │  │ (파일 스트림)             │  │
                         │  └───────────────────────────┘  │
                         └────────────┬──────────────────────┘
                                      │ JSONL 파일
                                      ▼
                         ┌─────────────────────────────────┐
                         │   LogBus2 Controller             │
                         │                                  │
                         │  1. daemon.json 생성             │
                         │  2. LogBus2 프로세스 시작        │
                         │  3. 파일 업로드 모니터링         │
                         │  4. 전송 완료 후 종료            │
                         └────────────┬──────────────────────┘
                                      │ HTTPS (gzip)
                                      ▼
                         ┌─────────────────────────────────┐
                         │     ThinkingEngine              │
                         │  https://te-receiver-naver...   │
                         └─────────────────────────────────┘
```

---

### 6.2 데이터 흐름

#### **사용자 회원가입 및 로그인**

```
[프론트엔드] 회원가입 폼 입력
    ↓
POST /api/auth/register
    ↓
[백엔드] bcrypt 비밀번호 해싱
    ↓
[Prisma] User 테이블에 INSERT
    ↓
[프론트엔드] "회원가입 완료" 메시지

[프론트엔드] 로그인 폼 입력
    ↓
POST /api/auth/login
    ↓
[백엔드] 이메일로 사용자 조회
    ↓
[백엔드] bcrypt 비밀번호 검증
    ↓
[백엔드] JWT 토큰 생성 (24시간 유효)
    ↓
[프론트엔드] 토큰 저장 (localStorage)
    ↓
이후 모든 API 요청에 Authorization 헤더 포함
```

---

#### **데이터 생성 및 전송**

```
[프론트엔드] 데이터 생성 설정 입력
    ↓
POST /api/generate/start (JWT 포함)
    ↓
[백엔드 미들웨어] JWT 검증 → userId 추출
    ↓
[데이터 생성 엔진]
    1. Excel 파싱 → 스키마 객체
    2. AI 분석 → 이벤트 의존성, 데이터 범위
    3. 유저 코호트 생성 (Faker.js)
    4. 일자별 이벤트 생성
    5. JSONL 파일 저장
       output/data/{userId}/{runId}/YYYY-MM-DD.jsonl
    ↓
[Prisma] Run 테이블에 INSERT (userId 연결)
[Prisma] File 테이블에 INSERT (생성된 파일 기록)
    ↓
[프론트엔드] 진행 상태 폴링 (2초마다)
GET /api/generate/status/:runId
    ↓
[백엔드] progressMap에서 진행률 반환
    ↓
[프론트엔드] "생성 완료" 표시
    ↓
POST /api/send-data/:runId
    ↓
[LogBus2 Controller]
    1. daemon.json 생성
    2. LogBus2 프로세스 시작
    3. 파일 전송 (gzip 압축)
    4. 진행 모니터링
    5. 전송 완료 후 종료
    ↓
[Prisma] Run.status = 'sent' 업데이트
    ↓
[프론트엔드] "전송 완료" 표시
```

---

### 6.3 파일 시스템 구조

```
demo_data_gen/
├── output/
│   ├── data/                    # 생성된 데이터 (LogBus2 전송용)
│   │   └── {userId}/
│   │       └── {runId}/
│   │           ├── 2025-01-01.jsonl
│   │           ├── 2025-01-02.jsonl
│   │           └── ...
│   └── runs/                    # 실행 메타데이터
│       └── {userId}/
│           └── {runId}/
│               ├── metadata.json
│               ├── summary.json
│               └── schema.xlsx
│
├── uploads/                     # 업로드된 Excel 파일
│   └── {userId}/
│       └── {timestamp}_{filename}.xlsx
│
├── excel-schema-generator/
│   └── output/                  # AI 생성 Excel 스키마
│       └── {userId}/
│           └── generated_schema.xlsx
```

**중요**: 모든 파일 경로에 `userId`를 포함하여 사용자별 데이터 격리

---

## 7. 기술 스택

### 7.1 백엔드 (Node.js)

| 카테고리          | 기술                      | 용도                   |
| ----------------- | ------------------------- | ---------------------- |
| **런타임**        | Node.js 20+               | JavaScript 서버 환경   |
| **언어**          | TypeScript 5.x            | 타입 안전성            |
| **웹 프레임워크** | Express.js                | REST API 서버          |
| **데이터베이스**  | PostgreSQL 14+            | 관계형 데이터베이스    |
| **ORM**           | Prisma 5.x                | 타입 안전 쿼리 빌더    |
| **인증**          | JWT (jsonwebtoken)        | 토큰 기반 인증         |
| **비밀번호**      | bcrypt                    | 비밀번호 해싱          |
| **파일 업로드**   | Multer                    | 멀티파트 파일 처리     |
| **Excel 처리**    | ExcelJS, XLSX             | Excel 파일 읽기/쓰기   |
| **AI SDK**        | @anthropic-ai/sdk, openai | AI API 호출            |
| **더미 데이터**   | @faker-js/faker           | 현실적 데이터 생성     |
| **환경변수**      | dotenv                    | 환경 설정 관리         |
| **CORS**          | cors                      | Cross-Origin 요청 처리 |

---

### 7.2 프론트엔드

| 카테고리       | 기술        | 용도              |
| -------------- | ----------- | ----------------- |
| **프레임워크** | Next.js 14  | React 기반 풀스택 |
| **UI**         | React 18    | 컴포넌트 기반 UI  |
| **상태 관리**  | React Hooks | 로컬 상태 관리    |

---

### 7.3 인프라

| 카테고리           | 기술           | 용도                     |
| ------------------ | -------------- | ------------------------ |
| **컨테이너**       | Docker         | 개발 환경 통일           |
| **오케스트레이션** | Docker Compose | PostgreSQL + 서비스 관리 |
| **데이터 전송**    | LogBus2        | ThinkingEngine 전송      |

---

### 7.4 개발 도구

| 카테고리          | 기술                | 용도                    |
| ----------------- | ------------------- | ----------------------- |
| **패키지 매니저** | npm                 | 의존성 관리             |
| **타입 체크**     | TypeScript Compiler | 컴파일 타임 타입 검증   |
| **런타임 실행**   | tsx                 | TypeScript 직접 실행    |
| **빌드**          | tsc                 | TypeScript → JavaScript |

---

## 8. 프로젝트에서 배운 Node.js 핵심 개념

### 8.1 비동기 프로그래밍

- ✅ `async/await` 패턴으로 깔끔한 비동기 코드 작성
- ✅ Promise 체이닝 및 에러 핸들링
- ✅ 병렬 처리 (`Promise.all`, 여러 날짜 동시 생성)
- ✅ 콜백 함수 패턴 (진행 상태 업데이트)

### 8.2 파일 시스템 (fs)

- ✅ 파일 읽기/쓰기 (`fs.readFileSync`, `fs.writeFileSync`)
- ✅ 디렉토리 탐색 (`fs.readdirSync`)
- ✅ 파일 스트리밍 (`fs.createWriteStream`)
- ✅ 파일 삭제 (`fs.rmSync`)

### 8.3 HTTP 서버 (Express)

- ✅ REST API 설계 (GET, POST, PUT, DELETE)
- ✅ 미들웨어 체인 (인증, CORS, JSON 파싱)
- ✅ 라우트 파라미터 및 쿼리스트링
- ✅ 에러 핸들링 미들웨어

### 8.4 데이터베이스 (Prisma + PostgreSQL)

- ✅ ORM을 통한 타입 안전 쿼리
- ✅ 관계형 데이터 모델링 (1:1, 1:N)
- ✅ 마이그레이션 관리
- ✅ 트랜잭션 처리

### 8.5 프로세스 관리

- ✅ Child Process (`spawn`, `exec`)
- ✅ 환경변수 (`process.env`)
- ✅ 타이머 (`setInterval`, `setTimeout`)

### 8.6 보안

- ✅ JWT 토큰 기반 인증
- ✅ 비밀번호 해싱 (bcrypt)
- ✅ API Key 암호화 (AES-256)
- ✅ SQL Injection 방지 (Prisma ORM)

---

## 9. 향후 개발 계획

### Phase 1 (현재)

- ✅ Express REST API 서버 구축
- ✅ Excel 파싱 및 데이터 생성 엔진
- ✅ LogBus2 연동
- ✅ 파일 기반 진행 상태 관리

### Phase 2 (진행 중)

- 🚧 PostgreSQL + Prisma 설정
- 🚧 회원가입/로그인 API
- 🚧 JWT 인증 미들웨어
- 🚧 사용자 설정 CRUD
- 🚧 실행 히스토리 CRUD
- 🚧 파일 관리 CRUD

### Phase 3 (예정)

- ⏳ 프론트엔드 로그인 UI
- ⏳ 대시보드 (실행 히스토리 시각화)
- ⏳ 파일 다운로드/삭제 UI
- ⏳ 사용자 프로필 관리

### Phase 4 (미래)

- ⏳ Redis 기반 진행 상태 관리 (확장성)
- ⏳ WebSocket 실시간 진행률 전송
- ⏳ S3 파일 스토리지 연동
- ⏳ 팀/조직 기능 (멀티 테넌시)

---

## 10. 실행 방법

### 10.1 환경 설정

```bash
# 1. 저장소 클론
git clone <repository-url>
cd demo_data_gen

# 2. 환경변수 설정
cp .env.example .env
# .env 파일 편집 (DATABASE_URL, JWT_SECRET 등)

# 3. PostgreSQL 시작 (Docker)
docker-compose up -d

# 4. 의존성 설치
cd data-generator
npm install

# 5. Prisma 마이그레이션
npx prisma migrate dev

# 6. 서버 시작 (개발)
npm run api
```

### 10.2 API 테스트

```bash
# 회원가입
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# 로그인
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# 내 정보 조회
curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

---

## 11. 참고 자료

- **프로젝트 아키텍처**: [ARCHITECTURE_KR.md](./ARCHITECTURE_KR.md)
- **기술 명세서**: [TECHNICAL_SPEC_KR.md](./TECHNICAL_SPEC_KR.md)
- **배포 가이드**: [DEPLOYMENT_GUIDE_KR.md](./DEPLOYMENT_GUIDE_KR.md)
- **빠른 시작**: [QUICK_START_KR.md](./QUICK_START_KR.md)

---

## 12. 결론

이 프로젝트는 **Node.js의 핵심 기능을 실무적으로 활용**한 풀스택 애플리케이션입니다:

### Node.js 학습 요소

- ✅ Express.js 기반 REST API 서버 구축
- ✅ 파일 시스템 처리 (읽기/쓰기/스트리밍)
- ✅ 비동기 프로그래밍 (async/await, Promise)
- ✅ Child Process 관리 (외부 프로그램 실행)
- ✅ 데이터베이스 연동 (Prisma ORM)
- ✅ 인증 시스템 (JWT, bcrypt)
- ✅ 파일 업로드 처리 (Multer)
- ✅ 환경변수 관리 (dotenv)

### CRUD 구현

- ✅ **Create**: 회원가입, 데이터 생성, 파일 업로드
- ✅ **Read**: 실행 히스토리 조회, 파일 목록, 설정 조회
- ✅ **Update**: 사용자 설정 수정, 실행 상태 업데이트
- ✅ **Delete**: 실행 삭제, 파일 삭제, 계정 삭제

### 실무 기술

- ✅ TypeScript로 타입 안전성 확보
- ✅ PostgreSQL + Prisma ORM
- ✅ Docker Compose 기반 개발 환경
- ✅ RESTful API 설계 원칙
- ✅ 보안 (JWT, 비밀번호 해싱, API Key 암호화)

---
