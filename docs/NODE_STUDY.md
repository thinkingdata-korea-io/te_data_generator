# Node.js 프로젝트 기술 스터디 - AI 데이터 생성기

## 📋 프로젝트 개요

**프로젝트명**: ThinkingEngine AI 데이터 생성기
**목적**: AI 기반 이벤트 트래킹 데이터 자동 생성 및 분석 플랫폼
**백엔드**: Node.js + TypeScript + Express + PostgreSQL
**프론트엔드**: Next.js 14 (App Router) + React + TypeScript
**배포**: Kubernetes + Docker

---

## 🛠️ Node.js 기술 스택 상세

### 1. 코어 기술

#### Node.js 런타임
- **버전**: Node.js 20 LTS
- **TypeScript**: 5.4.5 (완전한 타입 안정성)
- **실행 환경**:
  - 개발: `tsx` (TypeScript 직접 실행)
  - 프로덕션: `tsc` 컴파일 → `node dist/`

#### Express.js 5.1.0
```typescript
// src/api/server.ts
import express from 'express';
const app = express();

app.use(express.json());
app.use(cors());
app.use(requireAuth); // JWT 미들웨어
```

**선택 이유**:
- ✅ 가장 안정적인 Node.js 웹 프레임워크
- ✅ 풍부한 미들웨어 생태계
- ✅ TypeScript 지원 완벽

---

### 2. 주요 NPM 패키지

#### 백엔드 핵심 라이브러리

| 패키지 | 버전 | 용도 | 사용 위치 |
|--------|------|------|----------|
| **express** | 5.1.0 | 웹 프레임워크 | `src/api/server.ts` |
| **pg** | 8.16.3 | PostgreSQL 드라이버 | `src/db/connection.ts` |
| **jsonwebtoken** | 9.0.2 | JWT 인증 | `src/api/middleware.ts` |
| **bcrypt** | 6.0.0 | 비밀번호 해싱 | `src/api/routes/users.ts` |
| **cors** | 2.8.5 | CORS 처리 | `src/api/server.ts` |
| **multer** | 2.0.2 | 파일 업로드 | `src/api/routes/files.ts` |
| **archiver** | 7.0.1 | ZIP 압축 | `src/api/routes/generate.ts` |
| **exceljs** | 4.4.0 | Excel 파싱/생성 | `src/excel/parser.ts` |
| **dotenv** | 16.4.5 | 환경 변수 관리 | `.env` |

#### AI/ML 라이브러리

| 패키지 | 버전 | 용도 |
|--------|------|------|
| **@anthropic-ai/sdk** | 0.71.0 | Claude API (메인) |
| **@faker-js/faker** | 8.4.1 | 가짜 데이터 생성 |
| **openai** | 4.47.1 | OpenAI API (예비) |
| **@google/generative-ai** | 0.24.1 | Gemini API (예비) |

---

## 🗄️ 데이터베이스 - PostgreSQL

### ERD (Entity Relationship Diagram)

```
┌─────────────┐       ┌──────────────────┐
│    users    │───────│  user_settings   │
│             │ 1:1   │                  │
│ - id        │       │ - user_id (FK)   │
│ - username  │       │ - anthropic_api  │
│ - email     │       │ - data_ai_model  │
│ - password  │       │ - te_app_id      │
│ - role      │       │ - retention_days │
└─────┬───────┘       └──────────────────┘
      │
      │ 1:N
      │
┌─────▼───────┐       ┌──────────────────┐
│    runs     │       │   audit_logs     │
│             │       │                  │
│ - id        │       │ - user_id (FK)   │
│ - user_id   │◄──────│ - action         │
│ - status    │  1:N  │ - resource_type  │
│ - excel_path│       │ - created_at     │
└─────────────┘       └──────────────────┘
      │
      │ 1:N
      │
┌─────▼───────┐
│excel_uploads│
│             │
│ - user_id   │
│ - filename  │
│ - file_path │
└─────────────┘
```

### 테이블 상세

#### 1. **users** (사용자 관리)
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100),
  role VARCHAR(20) NOT NULL DEFAULT 'user', -- admin/user/viewer
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**CRUD 구현**:
- **CREATE**: `POST /api/users` (Admin만)
- **READ**: `GET /api/users` (목록), `GET /api/auth/me` (본인)
- **UPDATE**: `PUT /api/users/:id` (Admin), `PUT /api/users/profile` (본인)
- **DELETE**: `DELETE /api/users/:id` (Admin만)

#### 2. **user_settings** (사용자별 설정)
```sql
CREATE TABLE user_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  anthropic_api_key TEXT,
  data_ai_model VARCHAR(100),
  te_app_id VARCHAR(100),
  data_retention_days INTEGER DEFAULT 7,
  excel_retention_days INTEGER DEFAULT 30
);
```

**CRUD 구현**:
- **CREATE**: 자동 생성 (사용자 생성 시)
- **READ**: `GET /api/settings`
- **UPDATE**: `POST /api/settings`
- **DELETE**: 사용자 삭제 시 CASCADE

#### 3. **runs** (실행 기록)
```sql
CREATE TABLE runs (
  id VARCHAR(100) PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  excel_file_path VARCHAR(500),
  scenario TEXT,
  status VARCHAR(20), -- pending/running/completed/failed
  total_users INTEGER,
  total_events INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**CRUD 구현**:
- **CREATE**: `POST /api/generate/start`
- **READ**: `GET /api/runs/list`, `GET /api/runs/:runId`
- **UPDATE**: `PUT /api/runs/:runId/retention` (보관기간 연장)
- **DELETE**: `DELETE /api/runs/:runId`

#### 4. **audit_logs** (감사 로그)
```sql
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action VARCHAR(50) NOT NULL, -- login/create_run/upload_excel
  resource_type VARCHAR(50), -- run/excel/data
  status VARCHAR(20), -- success/failed
  created_at TIMESTAMP DEFAULT NOW()
);
```

**CRUD 구현**:
- **CREATE**: 모든 중요 작업마다 자동 로깅
- **READ**: `GET /api/audit` (Admin 전용)
- **UPDATE**: 없음 (Immutable)
- **DELETE**: 자동 정리 (90일 후)

---

## 🔌 RESTful API 설계

### API 라우트 구조

```
src/api/routes/
├── auth.ts         (인증: 로그인/로그아웃)
├── users.ts        (사용자 관리 CRUD)
├── settings.ts     (설정 관리)
├── excel.ts        (Excel 파일 CRUD)
├── files.ts        (파일 업로드/분석)
├── generate.ts     (데이터 생성/분석)
├── runs.ts         (실행 기록 CRUD)
├── data.ts         (데이터 다운로드)
├── audit.ts        (감사 로그 조회)
└── logbus.ts       (ThinkingEngine 전송)
```

**총 9개 라우터**, **61개 TypeScript 파일**

---

### 주요 API 엔드포인트 (CRUD 매핑)

#### 1️⃣ 사용자 관리 (`/api/users`, `/api/auth`)

| Method | Endpoint | CRUD | 설명 | 권한 |
|--------|----------|------|------|------|
| POST | `/api/auth/login` | - | 로그인 | Public |
| POST | `/api/auth/logout` | - | 로그아웃 | All |
| GET | `/api/auth/me` | **R**ead | 현재 사용자 조회 | All |
| GET | `/api/users` | **R**ead | 사용자 목록 | Admin |
| POST | `/api/users` | **C**reate | 사용자 생성 | Admin |
| PUT | `/api/users/:id` | **U**pdate | 사용자 수정 | Admin |
| DELETE | `/api/users/:id` | **D**elete | 사용자 삭제 | Admin |
| PUT | `/api/users/profile` | **U**pdate | 프로필 수정 | User |

**핵심 코드**:
```typescript
// src/api/routes/users.ts
router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const { username, email, password, role } = req.body;

  // 비밀번호 해싱
  const passwordHash = await bcrypt.hash(password, 10);

  // PostgreSQL INSERT
  const result = await pool.query(
    'INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING *',
    [username, email, passwordHash, role]
  );

  res.json({ user: result.rows[0] });
});
```

---

#### 2️⃣ Excel 파일 관리 (`/api/excel`)

| Method | Endpoint | CRUD | 설명 |
|--------|----------|------|------|
| POST | `/api/excel/upload` | **C**reate | Excel 업로드 |
| GET | `/api/excel/list` | **R**ead | Excel 목록 |
| GET | `/api/excel/download/:filename` | **R**ead | Excel 다운로드 |
| DELETE | `/api/excel/:filename` | **D**elete | Excel 삭제 |
| PUT | `/api/excel/:filename/retention` | **U**pdate | 보관기간 연장 |

**핵심 코드**:
```typescript
// src/api/routes/excel.ts
import multer from 'multer';
const upload = multer({ dest: 'uploads/' });

router.post('/upload', upload.single('file'), async (req, res) => {
  // Multer로 파일 업로드
  const file = req.file;

  // ExcelJS로 파싱
  const parser = new ExcelParser();
  const schema = await parser.parseExcelFile(file.path);

  // PostgreSQL 기록
  await pool.query(
    'INSERT INTO excel_uploads (user_id, filename, file_path) VALUES ($1, $2, $3)',
    [userId, file.originalname, file.path]
  );

  res.json({ schema, filePath: file.path });
});
```

---

#### 3️⃣ 데이터 생성 (`/api/generate`)

| Method | Endpoint | CRUD | 설명 |
|--------|----------|------|------|
| POST | `/api/generate/start` | **C**reate | 데이터 생성 시작 |
| GET | `/api/generate/status/:runId` | **R**ead | 진행 상태 조회 |
| POST | `/api/generate/analyze` | **C**reate | AI 분석만 수행 |
| GET | `/api/generate/analysis-excel-list` | **R**ead | AI 분석 Excel 목록 |
| GET | `/api/generate/download-data/:runId` | **R**ead | 데이터 ZIP 다운로드 |
| DELETE | `/api/generate/analysis-excel/:filename` | **D**elete | AI 분석 Excel 삭제 |
| PUT | `/api/generate/analysis-excel/:filename/retention` | **U**pdate | 보관기간 연장 |

**핵심 코드**:
```typescript
// src/api/routes/generate.ts
router.post('/start', requireAuth, async (req, res) => {
  const runId = `run_${Date.now()}`;

  // 비동기 데이터 생성 시작
  generateDataAsync(runId, config).catch(err => {
    logger.error('Generation failed:', err);
  });

  // 즉시 응답 (Non-blocking)
  res.json({
    runId,
    statusUrl: `/api/generate/status/${runId}`
  });
});

// 비동기 함수
async function generateDataAsync(runId: string, config: any) {
  // 1. AI 분석 (Anthropic Claude)
  const aiAnalysis = await aiClient.analyzeSchema(schema, userInput);

  // 2. 코호트 생성 (사용자 세그먼트)
  const cohorts = await cohortGenerator.generate(aiAnalysis);

  // 3. 이벤트 생성 (Faker.js)
  const events = await eventGenerator.generate(cohorts, aiAnalysis);

  // 4. JSONL 파일 저장
  fs.writeFileSync(`output/data/${runId}/events.jsonl`, events);

  // 5. PostgreSQL 기록
  await pool.query(
    'UPDATE runs SET status = $1, total_events = $2 WHERE id = $3',
    ['completed', events.length, runId]
  );
}
```

---

#### 4️⃣ 실행 기록 (`/api/runs`)

| Method | Endpoint | CRUD | 설명 |
|--------|----------|------|------|
| GET | `/api/runs/list` | **R**ead | 실행 목록 |
| GET | `/api/runs/:runId` | **R**ead | 실행 상세 |
| DELETE | `/api/runs/:runId` | **D**elete | 실행 삭제 |
| PUT | `/api/runs/:runId/retention` | **U**pdate | 보관기간 연장 |

**핵심 코드**:
```typescript
// src/api/routes/runs.ts
router.get('/list', requireAuth, async (req, res) => {
  // PostgreSQL JOIN
  const result = await pool.query(`
    SELECT r.*, u.username
    FROM runs r
    LEFT JOIN users u ON r.user_id = u.id
    WHERE r.user_id = $1
    ORDER BY r.created_at DESC
  `, [userId]);

  res.json({ runs: result.rows });
});
```

---

#### 5️⃣ 설정 관리 (`/api/settings`)

| Method | Endpoint | CRUD | 설명 |
|--------|----------|------|------|
| GET | `/api/settings` | **R**ead | 사용자 설정 조회 |
| POST | `/api/settings` | **U**pdate | 설정 저장 (UPSERT) |

**핵심 코드**:
```typescript
// src/api/routes/settings.ts
router.post('/', requireAuth, async (req, res) => {
  const { ANTHROPIC_API_KEY, DATA_AI_MODEL } = req.body;

  // PostgreSQL UPSERT
  await pool.query(`
    INSERT INTO user_settings (user_id, anthropic_api_key, data_ai_model)
    VALUES ($1, $2, $3)
    ON CONFLICT (user_id) DO UPDATE
    SET anthropic_api_key = $2, data_ai_model = $3
  `, [userId, ANTHROPIC_API_KEY, DATA_AI_MODEL]);

  res.json({ success: true });
});
```

---

#### 6️⃣ 감사 로그 (`/api/audit`)

| Method | Endpoint | CRUD | 설명 |
|--------|----------|------|------|
| GET | `/api/audit` | **R**ead | 감사 로그 조회 (Admin) |

**핵심 코드**:
```typescript
// src/api/routes/audit.ts
router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  const result = await pool.query(`
    SELECT a.*, u.username
    FROM audit_logs a
    LEFT JOIN users u ON a.user_id = u.id
    ORDER BY a.created_at DESC
    LIMIT 100
  `);

  res.json({ logs: result.rows });
});
```

---

## 🔐 인증 & 인가 (Authentication & Authorization)

### JWT (JSON Web Token) 기반 인증

#### 로그인 플로우
```
1. POST /api/auth/login
   ↓ (username + password)
2. bcrypt.compare(password, hash)
   ↓ (검증 성공)
3. jwt.sign({ userId, role }, SECRET)
   ↓ (토큰 생성)
4. 클라이언트에 토큰 반환
   ↓
5. 클라이언트: localStorage에 저장
   ↓
6. 이후 요청: Authorization: Bearer <token>
```

#### 미들웨어 구현
```typescript
// src/api/middleware.ts
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = decoded; // { userId, role, username }
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.user.role !== role) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}
```

#### 사용 예시
```typescript
// Admin 전용 API
router.get('/users', requireAuth, requireRole('admin'), async (req, res) => {
  // 로직
});

// 인증된 사용자만
router.post('/settings', requireAuth, async (req, res) => {
  // 로직
});
```

---

## 🎯 주요 기능 구현 상세

### 1. 파일 업로드 (Multer)

```typescript
// src/api/routes/files.ts
import multer from 'multer';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.mimetype === 'text/plain') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

router.post('/upload', upload.array('files', 5), async (req, res) => {
  const files = req.files as Express.Multer.File[];
  res.json({ files: files.map(f => ({ name: f.originalname, path: f.path })) });
});
```

---

### 2. ZIP 다운로드 (Archiver)

```typescript
// src/api/routes/generate.ts
import archiver from 'archiver';

router.get('/download-data/:runId', async (req, res) => {
  const { runId } = req.params;
  const dataDir = `output/data/${runId}`;

  // ZIP 스트림 생성
  const archive = archiver('zip', { zlib: { level: 9 } });

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename=data_${runId}.zip`);

  archive.pipe(res);
  archive.directory(dataDir, false);
  await archive.finalize();
});
```

---

### 3. Excel 파싱 (ExcelJS)

```typescript
// src/excel/parser.ts
import ExcelJS from 'exceljs';

export class ExcelParser {
  async parseExcelFile(filePath: string): Promise<ParsedSchema> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const eventSheet = workbook.getWorksheet('#이벤트 데이터');
    const events: EventDefinition[] = [];

    eventSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // 헤더 스킵

      events.push({
        name: row.getCell(1).value as string,
        displayName: row.getCell(2).value as string,
        category: row.getCell(3).value as string
      });
    });

    return { events, properties: [...] };
  }
}
```

---

### 4. AI 분석 (Anthropic Claude)

```typescript
// src/ai/client.ts
import Anthropic from '@anthropic-ai/sdk';

export class AIClient {
  private anthropic: Anthropic;

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({ apiKey });
  }

  async analyzeSchema(schema: ParsedSchema, userInput: UserInput): Promise<AIAnalysisResult> {
    const prompt = buildStrategyPrompt(schema, userInput);

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 8000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const content = response.content[0].text;
    const analysis = JSON.parse(content);

    return {
      userSegments: analysis.segments,
      eventSequences: analysis.sequences,
      transactions: analysis.transactions
    };
  }
}
```

---

### 5. 가짜 데이터 생성 (Faker.js)

```typescript
// src/generators/faker-utils.ts
import { faker } from '@faker-js/faker';

export function generateUserProperty(propertyName: string, dataType: string): any {
  switch (dataType) {
    case 'string':
      if (propertyName.includes('name')) return faker.person.fullName();
      if (propertyName.includes('email')) return faker.internet.email();
      if (propertyName.includes('phone')) return faker.phone.number();
      return faker.lorem.word();

    case 'number':
      if (propertyName.includes('age')) return faker.number.int({ min: 18, max: 65 });
      if (propertyName.includes('price')) return faker.number.int({ min: 1000, max: 100000 });
      return faker.number.int({ min: 0, max: 100 });

    case 'date':
      return faker.date.recent().toISOString();

    default:
      return faker.lorem.word();
  }
}
```

---

## 🔄 비동기 처리 패턴

### 1. Promise + async/await

```typescript
// 나쁜 예: Callback Hell
db.query('SELECT * FROM users', (err, users) => {
  if (err) throw err;
  db.query('SELECT * FROM settings WHERE user_id = ?', [users[0].id], (err, settings) => {
    if (err) throw err;
    // ...
  });
});

// 좋은 예: async/await
async function getUserWithSettings(userId: number) {
  const user = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
  const settings = await pool.query('SELECT * FROM user_settings WHERE user_id = $1', [userId]);
  return { user: user.rows[0], settings: settings.rows[0] };
}
```

---

### 2. Non-blocking 데이터 생성

```typescript
// 클라이언트가 기다리지 않도록 비동기 처리
router.post('/start', async (req, res) => {
  const runId = generateRunId();

  // 비동기 작업 시작 (await 없음!)
  generateDataAsync(runId, config).catch(err => {
    logger.error('Generation failed:', err);
  });

  // 즉시 응답 반환
  res.json({ runId, status: 'started' });
});

// 클라이언트는 폴링으로 상태 확인
router.get('/status/:runId', (req, res) => {
  const progress = getProgress(req.params.runId);
  res.json(progress);
});
```

---

## 🔧 Node.js 고급 기법

### 1. Stream API (메모리 효율)

```typescript
// 나쁜 예: 전체 파일을 메모리에 로드
const data = fs.readFileSync('large-file.jsonl', 'utf-8');
res.send(data); // 메모리 부족 위험

// 좋은 예: Stream으로 전송
const stream = fs.createReadStream('large-file.jsonl');
stream.pipe(res);
```

---

### 2. Cluster Mode (멀티코어 활용)

```typescript
// src/api/server.ts
import cluster from 'cluster';
import os from 'os';

if (cluster.isPrimary) {
  const numCPUs = os.cpus().length;

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker) => {
    console.log(`Worker ${worker.process.pid} died, restarting...`);
    cluster.fork();
  });
} else {
  // Worker 프로세스에서 서버 실행
  app.listen(3001);
}
```

---

### 3. Connection Pooling (PostgreSQL)

```typescript
// src/db/connection.ts
import { Pool } from 'pg';

// ❌ 나쁜 예: 매번 새 연결
const client = new Client({ connectionString });
await client.connect();
await client.query('SELECT * FROM users');
await client.end();

// ✅ 좋은 예: Connection Pool
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // 최대 20개 연결 유지
  idleTimeoutMillis: 30000
});

// 사용
const result = await pool.query('SELECT * FROM users');
// 자동으로 연결 반환
```

---

## 📊 성능 최적화

### 1. 인덱스 활용
```sql
-- 빈번한 조회를 위한 인덱스
CREATE INDEX idx_runs_user_id ON runs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
```

### 2. N+1 쿼리 방지
```typescript
// ❌ 나쁜 예: N+1 쿼리
const runs = await pool.query('SELECT * FROM runs');
for (const run of runs.rows) {
  const user = await pool.query('SELECT * FROM users WHERE id = $1', [run.user_id]);
  run.user = user.rows[0];
}

// ✅ 좋은 예: JOIN
const result = await pool.query(`
  SELECT r.*, u.username, u.email
  FROM runs r
  LEFT JOIN users u ON r.user_id = u.id
`);
```

### 3. Redis 캐싱 (향후 예정)
```typescript
import Redis from 'ioredis';
const redis = new Redis();

async function getUserSettings(userId: number) {
  // 캐시 확인
  const cached = await redis.get(`settings:${userId}`);
  if (cached) return JSON.parse(cached);

  // DB 조회
  const result = await pool.query('SELECT * FROM user_settings WHERE user_id = $1', [userId]);

  // 캐시 저장 (1시간)
  await redis.setex(`settings:${userId}`, 3600, JSON.stringify(result.rows[0]));

  return result.rows[0];
}
```

---

## 🐛 에러 처리

### 1. 글로벌 에러 핸들러

```typescript
// src/api/server.ts
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error:', err);

  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});
```

### 2. Try-Catch 패턴

```typescript
router.post('/users', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('INSERT INTO users ...');
    res.json({ user: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json({ error: 'Username already exists' });
    }
    throw error; // 글로벌 핸들러로 전달
  }
});
```

---

## 📦 프로젝트 구조

```
data-generator/
├── src/
│   ├── api/                     # Express 서버
│   │   ├── server.ts            # 메인 서버
│   │   ├── middleware.ts        # JWT 인증 미들웨어
│   │   ├── routes/              # 9개 라우터
│   │   │   ├── auth.ts
│   │   │   ├── users.ts
│   │   │   ├── settings.ts
│   │   │   ├── excel.ts
│   │   │   ├── files.ts
│   │   │   ├── generate.ts
│   │   │   ├── runs.ts
│   │   │   ├── audit.ts
│   │   │   └── logbus.ts
│   │   └── services/            # 비즈니스 로직
│   │       ├── analysis.service.ts
│   │       └── file-analyzer.ts
│   ├── db/                      # PostgreSQL
│   │   ├── connection.ts        # Connection Pool
│   │   ├── schema.sql           # 테이블 스키마
│   │   └── repositories/        # Repository 패턴
│   ├── ai/                      # AI 클라이언트
│   │   ├── client.ts            # Anthropic SDK
│   │   ├── prompts.ts           # 프롬프트 빌더
│   │   └── validation-pipeline.ts
│   ├── generators/              # 데이터 생성
│   │   ├── cohort-generator.ts  # 사용자 세그먼트
│   │   ├── event-generator.ts   # 이벤트 생성
│   │   └── faker-utils.ts       # Faker.js 래퍼
│   ├── excel/                   # Excel 처리
│   │   └── parser.ts            # ExcelJS 래퍼
│   └── utils/                   # 유틸리티
│       ├── logger.ts
│       ├── random.ts
│       └── date.ts
├── package.json                 # 의존성
├── tsconfig.json                # TypeScript 설정
└── .env                         # 환경 변수
```

**총 코드 라인 수**: 약 10,000줄

---

## 🎤 발표 포인트 정리

### 1. **Node.js 선택 이유**
- ✅ **비동기 I/O**: AI API 호출, DB 쿼리 동시 처리
- ✅ **JavaScript 생태계**: NPM 패키지 풍부 (ExcelJS, Faker.js)
- ✅ **TypeScript**: 타입 안정성 + 대규모 프로젝트 관리

### 2. **핵심 기술 스택**
- **Express.js**: RESTful API 서버
- **PostgreSQL + pg**: 관계형 DB, Connection Pool
- **JWT**: 무상태(stateless) 인증
- **Multer**: 파일 업로드 (multipart/form-data)
- **Archiver**: ZIP 스트림
- **ExcelJS**: Excel 파싱/생성
- **Anthropic SDK**: Claude AI 연동

### 3. **CRUD 완전 구현**
- ✅ **Users**: 사용자 관리 (CRUD 전부)
- ✅ **Settings**: 설정 관리 (UPSERT)
- ✅ **Excel**: 파일 업로드/다운로드/삭제
- ✅ **Runs**: 실행 기록 관리
- ✅ **Audit Logs**: 감사 로그 (읽기 전용)

### 4. **고급 패턴**
- ✅ **Repository 패턴**: DB 로직 분리
- ✅ **Middleware 패턴**: 인증/인가/로깅
- ✅ **Service Layer**: 비즈니스 로직 분리
- ✅ **Non-blocking**: 비동기 데이터 생성
- ✅ **Stream API**: 대용량 파일 전송

### 5. **보안**
- ✅ **bcrypt**: 비밀번호 해싱 (Salt 10 rounds)
- ✅ **JWT**: 토큰 기반 인증
- ✅ **RBAC**: 역할 기반 접근 제어 (admin/user/viewer)
- ✅ **SQL Injection 방지**: Parameterized Queries
- ✅ **CORS**: 허용 도메인 제한

### 6. **성능 최적화**
- ✅ **Connection Pool**: 최대 20개 연결 재사용
- ✅ **인덱스**: 빈번한 쿼리 최적화
- ✅ **Pagination**: 대량 데이터 분할 조회
- ✅ **ZIP Stream**: 메모리 효율

---

## 📈 배운 점 & 개선 방향

### 배운 점
1. **TypeScript의 중요성**: 런타임 에러 사전 방지
2. **비동기 패턴**: async/await로 코드 가독성 향상
3. **DB Connection Pool**: 성능 최적화의 핵심
4. **미들웨어 체이닝**: 재사용 가능한 로직 분리
5. **RESTful 설계**: 직관적인 API 구조

### 개선 방향
1. **Redis 캐싱**: 설정 조회 성능 향상
2. **WebSocket**: 실시간 진행률 푸시
3. **Bull Queue**: 작업 큐 관리
4. **GraphQL**: 유연한 데이터 페칭
5. **Unit Test**: Jest로 테스트 커버리지 확보

---

## 🔗 참고 자료

- [Node.js 공식 문서](https://nodejs.org/docs/)
- [Express.js 가이드](https://expressjs.com/)
- [PostgreSQL Node.js 클라이언트](https://node-postgres.com/)
- [Anthropic Claude API](https://docs.anthropic.com/)
- [프로젝트 아키텍처 문서](./common/ARCHITECTURE.md)
