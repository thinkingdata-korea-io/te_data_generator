# 코드베이스 개선 분석 리포트

**작성일**: 2025-11-14  
**분석 대상**: demo_data_gen 프로젝트  
**분석 범위**: TypeScript/React 소스코드

---

## Executive Summary

프로젝트는 **AI 기반 이벤트 데이터 생성 플랫폼**으로, Express 백엔드, Next.js 프론트엔드, 데이터 생성 엔진으로 구성되어 있습니다.

### 주요 발견사항
- **심각한 문제**: 1개 (코드 중복)
- **주요 문제**: 5개 (에러 처리, 타입 안전성, 아키텍처)
- **개선 권장**: 8개 (성능, 유지보수성)

### 전체 우선순위
- **High**: 4개 항목
- **Medium**: 7개 항목  
- **Low**: 8개 항목

---

## 1. 코드 품질 & 리팩토링

### 1.1 중복 코드 (DRY 원칙 위반) - HIGH PRIORITY

#### 문제: 동일한 엔드포인트 중복 정의

**파일**: `/data-generator/src/api/server.ts` (라인 246-290)

```typescript
// 라인 246-265: 첫 번째 정의
app.get('/api/excel/download/:filename', (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    // ... 동일한 로직
  } catch (error: any) {
    console.error('Error downloading Excel:', error);
    res.status(500).json({ error: error.message });
  }
});

// 라인 271-290: 정확히 동일한 두 번째 정의
app.get('/api/excel/download/:filename', (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    // ... 동일한 로직 반복
  }
});
```

**영향도**: Express 라우팅이 예측 불가능해짐, 후속 요청이 첫 번째 핸들러만 사용

**개선 방안**:
- 둘 중 하나 제거
- 라우트 정의를 전용 모듈로 분리

**예상 작업시간**: 15분

**우선순위**: HIGH

---

### 1.2 Excel 속성 분류 코드 중복 - MEDIUM PRIORITY

**파일**: `/data-generator/src/api/server.ts` (라인 162-163, 207-209)

```typescript
// 라인 162-163 (excel/generate 엔드포인트)
const eventProperties = schema.properties.filter(p => p.event_name);
const commonProperties = schema.properties.filter(p => !p.event_name);

// 라인 207-209 (excel/upload 엔드포인트)
const eventProperties = schema.properties.filter(p => p.event_name);
const commonProperties = schema.properties.filter(p => !p.event_name);
```

**개선 방안**:
```typescript
// utils/schema-helper.ts
export const classifyProperties = (properties: PropertyDefinition[]) => {
  return {
    event: properties.filter(p => p.event_name),
    common: properties.filter(p => !p.event_name)
  };
};
```

**예상 작업시간**: 20분

**우선순위**: MEDIUM

---

### 1.3 설정 업데이트 로직 중복 - MEDIUM PRIORITY

**파일**: `/data-generator/src/api/server.ts` (라인 496-541)

```typescript
// 라인 497-504
const updateEnvVar = (key: string, value: string) => {
  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(envContent)) {
    envContent = envContent.replace(regex, `${key}=${value}`);
  } else {
    envContent += `\n${key}=${value}`;
  }
};

// 이후 수동으로 반복:
if (ANTHROPIC_API_KEY !== undefined) {
  updateEnvVar('ANTHROPIC_API_KEY', ANTHROPIC_API_KEY);
  process.env.ANTHROPIC_API_KEY = ANTHROPIC_API_KEY;
}
// ... 이후 8번 더 반복
```

**개선 방안**:
```typescript
const settingKeys: Array<[keyof Settings, string]> = [
  ['ANTHROPIC_API_KEY', 'ANTHROPIC_API_KEY'],
  ['OPENAI_API_KEY', 'OPENAI_API_KEY'],
  // ...
];

for (const [key, envKey] of settingKeys) {
  if (req.body[key] !== undefined) {
    updateEnvVar(envKey, req.body[key]);
    process.env[envKey] = req.body[key];
  }
}
```

**예상 작업시간**: 30분

**우선순위**: MEDIUM

---

### 1.4 Progress Map 상태 업데이트 코드 중복 - MEDIUM PRIORITY

**파일**: `/data-generator/src/api/server.ts` (라인 675-745)

```typescript
// progressMap 업데이트가 여러 곳에서 반복됨
progressMap.set(runId, {
  ...progressMap.get(runId),
  status: 'sending',
  progress: 10,
  message: '...'
});

// 같은 패턴이 6번 반복
progressMap.set(runId, {
  ...progressMap.get(runId),
  status: 'sending',
  progress: 20,
  message: '...'
});
```

**개선 방안**:
```typescript
const updateProgress = (
  id: string,
  updates: Partial<typeof progressMap.get(id)>
) => {
  const current = progressMap.get(id) || {};
  progressMap.set(id, { ...current, ...updates });
};

// 사용
updateProgress(runId, { status: 'sending', progress: 10, message: '...' });
```

**예상 작업시간**: 25분

**우선순위**: MEDIUM

---

### 1.5 긴 함수/파일 (SRP 위반) - HIGH PRIORITY

#### 5.1 Frontend 메인 컴포넌트

**파일**: `/frontend/src/app/page.tsx` (1,348줄)

**문제점**:
- 단일 파일에 전체 UI 로직 + 상태 관리 + API 호출 통합
- 15개 이상의 상태(useState) 선언
- 10개 이상의 핸들러 함수 포함
- JSX 조건부 렌더링이 복잡하게 중첩

```typescript
// 라인 45-74: 상태가 너무 많음
const [formData, setFormData] = useState({...});
const [currentStep, setCurrentStep] = useState<ProcessStep>('select-mode');
const [startMode, setStartMode] = useState<'new' | 'upload' | null>(null);
const [uploadedExcelPath, setUploadedExcelPath] = useState<string>('');
const [excelPreview, setExcelPreview] = useState<ExcelPreviewSummary | null>(null);
const [uploadError, setUploadError] = useState<string>('');
// ... 더 많음
```

**개선 방안**:

```
frontend/src/
├── app/
│   └── page.tsx (상위 오케스트레이션만)
├── components/
│   ├── ModeSelector/
│   ├── InputForm/
│   ├── ExcelGeneration/
│   ├── DataGeneration/
│   ├── DataTransmission/
│   ├── Settings/
│   └── ProgressBar/
├── hooks/
│   ├── useFormData.ts (formData 상태 관리)
│   ├── useProgress.ts (진행 상황 폴링)
│   └── useSettings.ts (설정 관리)
└── services/
    └── api.ts (API 호출 통합)
```

**예상 작업시간**: 4-6시간

**우선순위**: HIGH

---

#### 5.2 API 서버 메인 파일

**파일**: `/data-generator/src/api/server.ts` (889줄)

**문제점**:
- 라우트 정의와 비즈니스 로직 혼합
- 설정 관리, 파일 정리 등 여러 책임 포함
- 비동기 함수가 890줄 끝에 정의

**개선 방안**:

```
data-generator/src/api/
├── server.ts (Express 앱 초기화만)
├── routes/
│   ├── excel.routes.ts (Excel 관련)
│   ├── generate.routes.ts (데이터 생성)
│   ├── send.routes.ts (데이터 전송)
│   ├── settings.routes.ts (설정)
│   └── runs.routes.ts (실행 이력)
├── handlers/
│   ├── excel.handler.ts
│   ├── generate.handler.ts
│   └── send.handler.ts
├── services/
│   ├── progress.service.ts (Progress 관리)
│   ├── cleanup.service.ts (파일 정리)
│   └── env.service.ts (환경변수 관리)
└── middleware/
    ├── errorHandler.ts
    └── validation.ts
```

**예상 작업시간**: 5-7시간

**우선순위**: HIGH

---

### 1.6 하드코딩된 값 - MEDIUM PRIORITY

**파일**: `/data-generator/src/api/server.ts`

| 라인 | 값 | 개선 제안 |
|-----|-----|---------|
| 22 | `3001` | PORT 환경변수 기본값 O (개선됨) |
| 58 | `10 * 1024 * 1024` | MULTER_SIZE_LIMIT 상수 필요 |
| 664 | `'https://te-receiver-naver.thinkingdata.kr/'` | DEFAULT_TE_RECEIVER_URL 상수 |
| 811 | `7` | DEFAULT_DATA_RETENTION_DAYS 상수 |
| 812 | `30` | DEFAULT_EXCEL_RETENTION_DAYS 상수 |
| 363 | `8 + Math.floor(Math.random() * 12)` | SESSION_START_HOUR_RANGE 상수 |
| 881 | `24 * 60 * 60 * 1000` | CLEANUP_INTERVAL_MS 상수 |

**개선 방안**:

```typescript
// config/constants.ts
export const CONSTANTS = {
  API_PORT: process.env.API_PORT || 3001,
  MULTER_SIZE_LIMIT: 10 * 1024 * 1024,
  DEFAULT_TE_RECEIVER_URL: 'https://te-receiver-naver.thinkingdata.kr/',
  DEFAULT_DATA_RETENTION_DAYS: 7,
  DEFAULT_EXCEL_RETENTION_DAYS: 30,
  SESSION_START_HOUR_RANGE: { min: 8, max: 20 },
  CLEANUP_INTERVAL_MS: 24 * 60 * 60 * 1000,
} as const;
```

**예상 작업시간**: 20분

**우선순위**: MEDIUM

---

### 1.7 복잡한 조건문 중첩 - MEDIUM PRIORITY

**파일**: `/frontend/src/app/page.tsx` (라인 428-439)

```typescript
const isActive =
  (step.key === 'input' && (currentStep === 'input' || currentStep === 'upload-excel')) ||
  (step.key === 'excel' && (currentStep === 'generating-excel' || currentStep === 'excel-completed' || currentStep === 'upload-completed' || currentStep === 'combined-config')) ||
  (step.key === 'data' && (currentStep === 'generating-data' || currentStep === 'data-completed')) ||
  (step.key === 'send' && currentStep === 'sending-data') ||
  (step.key === 'complete' && currentStep === 'sent');

const isCompleted =
  (step.key === 'input' && !['select-mode', 'input', 'upload-excel'].includes(currentStep)) ||
  (step.key === 'excel' && ['generating-data', 'data-completed', 'sending-data', 'sent'].includes(currentStep)) ||
  (step.key === 'data' && ['sending-data', 'sent'].includes(currentStep)) ||
  (step.key === 'send' && currentStep === 'sent');
```

**개선 방안**:

```typescript
// hooks/useStepStatus.ts
const STEP_CONFIG = {
  input: { activeSteps: ['input', 'upload-excel'], completedSteps: ['excel-completed', ...] },
  excel: { activeSteps: ['generating-excel', ...], completedSteps: ['generating-data', ...] },
  // ...
};

const useStepStatus = (stepKey: string, currentStep: ProcessStep) => {
  const config = STEP_CONFIG[stepKey];
  return {
    isActive: config.activeSteps.includes(currentStep),
    isCompleted: config.completedSteps.includes(currentStep)
  };
};
```

**예상 작업시간**: 30분

**우선순위**: MEDIUM

---

## 2. 에러 핸들링 - HIGH PRIORITY

### 2.1 Try-Catch 누락 및 부분적 에러 처리

**파일**: `/data-generator/src/api/server.ts` (라인 75-89)

```typescript
// 문제: 동기 작업인데 try-catch 없음
const files = fs.readdirSync(EXCEL_OUTPUT_DIR)
  .filter(f => f.endsWith('.xlsx'))
  .map(f => ({
    name: f,
    path: path.join(EXCEL_OUTPUT_DIR, f),
    size: fs.statSync(path.join(EXCEL_OUTPUT_DIR, f)).size,
    modified: fs.statSync(path.join(EXCEL_OUTPUT_DIR, f)).mtime
  }));
```

**문제**: 파일 stat 호출이 Exception 발생 가능 (파일 삭제됨, 권한 문제 등)

**개선 방안**:

```typescript
const getExcelFiles = async (dir: string) => {
  try {
    if (!fs.existsSync(dir)) return [];
    
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.xlsx'));
    return files.map(f => {
      try {
        const filePath = path.join(dir, f);
        const stat = fs.statSync(filePath);
        return { name: f, path: filePath, size: stat.size, modified: stat.mtime };
      } catch (err) {
        logger.warn(`Failed to stat file ${f}:`, err);
        return null;
      }
    }).filter(Boolean);
  } catch (err) {
    logger.error(`Failed to read Excel directory:`, err);
    throw new ApiError(500, 'Failed to list Excel files');
  }
};
```

**예상 작업시간**: 45분

**우선순위**: HIGH

---

### 2.2 에러 메시지 부족

**문제 사례**:

| 파일 | 라인 | 문제 |
|-----|-----|------|
| server.ts | 100 | `error: 'excelPath is required'` - 필드명만 있음 |
| server.ts | 139 | 복수 필드 요구사항 명확하지 않음 |
| server.ts | 1118 | API 에러만 전달, 원인 불명 |
| page.tsx | 224 | `error instanceof Error` 체크 없음 |

**개선 방안**:

```typescript
// errors/ApiError.ts
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public context?: {
      field?: string;
      value?: any;
      requiredFields?: string[];
    }
  ) {
    super(message);
    this.name = 'ApiError';
  }

  toJSON() {
    return {
      error: this.message,
      statusCode: this.statusCode,
      context: this.context,
      timestamp: new Date().toISOString()
    };
  }
}

// 사용 예
if (!excelPath) {
  throw new ApiError(400, 'Excel file path is required', {
    field: 'excelPath',
    requiredFields: ['excelPath', 'scenario', 'dau', 'industry', 'dateStart', 'dateEnd']
  });
}
```

**예상 작업시간**: 1시간

**우선순위**: HIGH

---

### 2.3 비동기 작업의 에러 복구 부재 - MEDIUM PRIORITY

**파일**: `/data-generator/src/api/server.ts` (라인 592-641)

```typescript
async function generateDataAsync(runId: string, config: DataGeneratorConfig) {
  try {
    // ... 생성 로직
  } catch (error: any) {
    progressMap.set(runId, {
      status: 'error',
      progress: 0,
      message: `❌ 오류: ${error.message}`,
      error: error.stack,
      failedAt: new Date().toISOString()
    });
  }
  // 재시도 로직 없음
}
```

**개선 방안**:

```typescript
async function generateDataWithRetry(
  runId: string,
  config: DataGeneratorConfig,
  maxRetries: number = 3
) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      progressMap.set(runId, {
        status: 'generating',
        message: `시도 ${attempt}/${maxRetries}...`
      });
      
      const generator = new DataGenerator(config, runId);
      return await generator.generate();
      
    } catch (error: any) {
      if (attempt === maxRetries) {
        progressMap.set(runId, {
          status: 'error',
          message: `최종 실패: ${error.message}`,
          retryCount: maxRetries
        });
        throw error;
      }
      
      logger.warn(`Attempt ${attempt} failed, retrying...`, error.message);
      await delay(2 ** attempt * 1000); // 지수 백오프
    }
  }
}
```

**예상 작업시간**: 1시간

**우선순위**: MEDIUM

---

## 3. 타입 안전성 - HIGH PRIORITY

### 3.1 Any 타입 남용

**발견된 any 타입 사용**:

| 파일 | 라인 | 컨텍스트 | 개선 방안 |
|-----|-----|---------|---------|
| server.ts | 63 | `const progressMap = new Map<string, any>()` | `Map<string, ProgressStatus>` |
| server.ts | 85 | `catch (error: any)` | 구체적 에러 타입 |
| page.tsx | 61 | `const [progress, setProgress] = useState<any>(null)` | `useState<Progress \| null>` |
| parser.ts | 91 | `sheet_to_json<any>(worksheet, ...)` | 구체적 Row 타입 |
| data-generator.ts | 349 | `user: any` | `User` 타입 정의 |

**개선 방안** - 타입 정의 강화:

```typescript
// types/progress.ts
export interface ProgressStatus {
  status: 'starting' | 'parsing' | 'analyzing' | 'generating' | 'saving' | 'completed' | 'error';
  progress: number; // 0-100
  message: string;
  step?: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  result?: {
    runId: string;
    totalUsers: number;
    totalEvents: number;
    totalDays: number;
    filesGenerated: string[];
  };
}

// types/row.ts
export interface ExcelRow {
  eventName: string;
  eventAlias: string;
  eventDescription: string;
  eventTag: string;
  propertyName: string;
  propertyAlias: string;
  propertyType: string;
  propertyDescription: string;
}

// types/user.ts
export interface User {
  account_id: string;
  segment: string;
  total_sessions: number;
  total_events: number;
  // ... 다른 필드
}
```

**예상 작업시간**: 1.5시간

**우선순위**: HIGH

---

### 3.2 Optional Chaining 누락

**파일**: `/frontend/src/app/page.tsx`

```typescript
// 라인 1039: Optional chaining 없음
{progress.result.totalEvents?.toLocaleString()}

// 개선
{progress?.result?.totalEvents?.toLocaleString() ?? '-'}
```

**발견 사례**:
- 라인 1039: `progress.result.totalEvents`
- 라인 1043: `progress.result.totalUsers`
- 라인 1047: `progress.result.totalDays`
- 라인 1051: `progress.result.runId`

**개선 방안**:

```typescript
// hooks/useProgressData.ts
export const useProgressData = (progress: Progress | null) => {
  return {
    totalEvents: progress?.result?.totalEvents ?? 0,
    totalUsers: progress?.result?.totalUsers ?? 0,
    totalDays: progress?.result?.totalDays ?? 0,
    runId: progress?.result?.runId ?? '',
  };
};

// 사용
const { totalEvents, totalUsers, totalDays, runId } = useProgressData(progress);
<p className="text-2xl font-bold text-gray-800">{totalEvents.toLocaleString()}</p>
```

**예상 작업시간**: 30분

**우선순위**: MEDIUM

---

### 3.3 Interface vs Type 일관성 - LOW PRIORITY

**문제**: 파일 전체에서 inconsistent 사용

```typescript
// interface 사용 (권장)
interface Settings { ... }
interface ExcelPreviewSummary { ... }

// type 사용
type ProcessStep = '...' | '...' | '...'
type ProgressCallback = (progress: {...}) => void
```

**표준화**:
- 객체 정의: `interface` 사용
- Union/Function 타입: `type` 사용

**예상 작업시간**: 20분

**우선순위**: LOW

---

## 4. 성능 최적화

### 4.1 불필요한 폴링 - MEDIUM PRIORITY

**파일**: `/frontend/src/app/page.tsx` (라인 88-112)

```typescript
// 문제: 모든 non-terminal 상태에서 2초마다 폴링
useEffect(() => {
  if (!runId || currentStep === 'select-mode' || ...) return;

  const interval = setInterval(() => {
    fetch(`${API_URL}/api/generate/status/${runId}`)
      .then(res => res.json())
      .then(data => {
        setProgress(data);
        // ... 상태 체크
      })
  }, 2000); // 2초 간격

  return () => clearInterval(interval);
}, [runId, currentStep]);
```

**문제점**:
- 2초 간격은 너무 자주 폴링 (불필요한 네트워크/CPU)
- WebSocket이나 Server-Sent Events로 전환 필요

**개선 방안**:

```typescript
// hooks/useProgressPolling.ts
export const useProgressPolling = (runId: string | null, enabled: boolean) => {
  const [progress, setProgress] = useState<ProgressStatus | null>(null);
  
  useEffect(() => {
    if (!enabled || !runId) return;

    // 백오프 전략: 초반엔 빠르게, 나중엔 느리게
    let interval: NodeJS.Timeout;
    let pollCount = 0;
    const maxPolls = 180; // 최대 6분 (30초 + 백오프)

    const poll = async () => {
      try {
        const res = await fetch(`${API_URL}/api/generate/status/${runId}`);
        const data = await res.json();
        setProgress(data);

        // 완료/에러 상태면 폴링 중단
        if (['completed', 'sent', 'error', 'send-error'].includes(data.status)) {
          clearInterval(interval);
          return;
        }

        // 횟수 초과면 중단
        if (++pollCount >= maxPolls) {
          clearInterval(interval);
        }
      } catch (err) {
        logger.error('Polling failed:', err);
      }
    };

    // 초기 폴링 즉시 + 이후 지수 백오프
    poll();
    
    // 초반 5초, 이후 점진적 증가
    const getInterval = (count: number) => {
      if (count < 6) return 2000; // 0-12초: 2초
      if (count < 12) return 5000; // 12-60초: 5초
      return 10000; // 60초 이후: 10초
    };

    let currentInterval = 2000;
    interval = setInterval(() => {
      currentInterval = getInterval(pollCount);
      poll();
    }, currentInterval);

    return () => clearInterval(interval);
  }, [runId, enabled]);

  return progress;
};
```

**장점**:
- 초반: 2초 (빠른 피드백)
- 중반: 5초 (안정적 추적)
- 후반: 10초 (최소화 자원)

**예상 작업시간**: 1시간

**우선순위**: MEDIUM

---

### 4.2 파일 시스템 I/O 최적화 - MEDIUM PRIORITY

**파일**: `/data-generator/src/api/server.ts` (라인 818-830)

```typescript
// 문제: 오래된 파일 정리 시 모든 파일 stat 호출
for (const runDir of runDirs) {
  const runPath = path.join(dataDir, runDir);
  const stat = fs.statSync(runPath); // 동기 I/O!
  const ageInDays = (now - stat.mtimeMs) / (1000 * 60 * 60 * 24);
  
  if (ageInDays > dataRetentionDays) {
    fs.rmSync(runPath, { recursive: true, force: true }); // 동기 삭제!
  }
}
```

**문제점**:
- 동기 I/O로 이벤트 루프 차단
- 대량 파일 삭제 시 서버 응답 지연

**개선 방안**:

```typescript
// services/cleanup.service.ts
export class CleanupService {
  async cleanupOldFiles() {
    const dataDir = path.resolve(__dirname, '../../../output/data');
    
    try {
      // 1. 병렬로 stat 수행 (Promise.all)
      const files = await fs.promises.readdir(dataDir);
      const fileStats = await Promise.all(
        files.map(async (f) => {
          try {
            const stat = await fs.promises.stat(path.join(dataDir, f));
            return { file: f, stat };
          } catch (err) {
            logger.warn(`Failed to stat ${f}:`, err);
            return null;
          }
        })
      );

      // 2. 삭제 대상 필터링
      const now = Date.now();
      const retentionMs = this.dataRetentionDays * 24 * 60 * 60 * 1000;
      const toDelete = fileStats
        .filter((fs) => fs && (now - fs.stat.mtimeMs) > retentionMs)
        .map(fs => fs!.file);

      // 3. 병렬 삭제 (동시성 제어: 5개씩)
      await this.deleteFilesInBatches(toDelete, 5);

      logger.info(`Cleanup completed: ${toDelete.length} directories removed`);
    } catch (err) {
      logger.error('Cleanup failed:', err);
    }
  }

  private async deleteFilesInBatches(files: string[], batchSize: number) {
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      await Promise.all(
        batch.map(f => fs.promises.rm(path.join(this.dataDir, f), {
          recursive: true,
          force: true
        }))
      );
    }
  }
}
```

**예상 작업시간**: 1시간

**우선순위**: MEDIUM

---

### 4.3 데이터 생성 메모리 효율성 - LOW PRIORITY

**파일**: `/data-generator/src/data-generator.ts` (라인 268-340)

**현재**: 하루 전체 이벤트를 메모리에 로드 후 JSONL 저장

```typescript
for (const [dateKey, users] of cohorts.entries()) {
  const dailyEvents: TEEvent[] = []; // 전체 하루 데이터
  
  for (const user of users) {
    const sessions = this.generateUserSessions(user, ...);
    for (const session of sessions) {
      const sessionEvents = eventGenerator.generateSessionEvents(session);
      dailyEvents.push(...sessionEvents); // 메모리 누적
    }
  }
  
  // 모든 이벤트를 로드 후 JSONL 생성
  const jsonl = teFormatter.toJSONL(dailyEvents);
  fs.writeFileSync(filePath, jsonl);
}
```

**문제**: 대용량 데이터 생성 시 메모리 부족 가능

**개선 방안** - 스트리밍 쓰기:

```typescript
import { createWriteStream } from 'fs';

const writeStream = createWriteStream(filePath);
let eventCount = 0;

for (const user of users) {
  const sessions = this.generateUserSessions(user, ...);
  for (const session of sessions) {
    const sessionEvents = eventGenerator.generateSessionEvents(session);
    for (const event of sessionEvents) {
      const jsonlLine = JSON.stringify(event) + '\n';
      writeStream.write(jsonlLine);
      eventCount++;
    }
  }
}

await new Promise((resolve, reject) => {
  writeStream.end();
  writeStream.on('finish', resolve);
  writeStream.on('error', reject);
});
```

**예상 작업시간**: 1.5시간

**우선순위**: LOW

---

## 5. 아키텍처 & 구조

### 5.1 관심사 분리 부족 - HIGH PRIORITY

#### 문제: API 서버에 너무 많은 책임

**현재 구조**:
```
server.ts (889줄)
├── Express 앱 초기화
├── Multer 설정
├── 15개 라우트 핸들러
├── 비동기 데이터 생성 함수
├── 데이터 전송 함수
├── 환경변수 설정 관리
├── 파일 정리 스케줄러
└── 설정 저장 로직
```

**개선된 구조**:

```
api/
├── server.ts (30줄 - 앱 초기화만)
├── config/
│   ├── multer.ts (파일 업로드 설정)
│   ├── constants.ts (상수 정의)
│   └── middleware.ts (미들웨어)
├── routes/
│   ├── excel.routes.ts (Excel 관련 5개 라우트)
│   ├── generate.routes.ts (데이터 생성 2개 라우트)
│   ├── send.routes.ts (데이터 전송 1개 라우트)
│   ├── settings.routes.ts (설정 2개 라우트)
│   └── runs.routes.ts (실행 이력 2개 라우트)
├── services/
│   ├── ExcelService
│   ├── DataGenerationService
│   ├── DataTransmissionService
│   ├── SettingsService
│   ├── ProgressService
│   └── CleanupService
├── handlers/
│   ├── excel.handler.ts
│   ├── generate.handler.ts
│   └── send.handler.ts
├── errors/
│   ├── ApiError.ts
│   └── errorHandler.ts
└── middleware/
    ├── asyncHandler.ts (비동기 에러 처리)
    ├── validation.ts (요청 검증)
    └── logging.ts (로깅)
```

**예상 작업시간**: 6-8시간

**우선순위**: HIGH

---

### 5.2 의존성 주입 부재 - MEDIUM PRIORITY

**현재**: 각 클래스에서 의존성을 직접 생성

```typescript
// data-generator.ts
const aiClient = new AIClient({...});
const parser = new ExcelParser();
const cohortGenerator = new CohortGenerator(...);
```

**문제**: 테스트 어려움, 결합도 높음

**개선 방안** - 간단한 DI 컨테이너:

```typescript
// container/DIContainer.ts
export class DIContainer {
  private services: Map<string, any> = new Map();

  register(name: string, factory: () => any) {
    this.services.set(name, factory);
  }

  get(name: string) {
    if (!this.services.has(name)) {
      throw new Error(`Service ${name} not registered`);
    }
    return this.services.get(name)();
  }
}

// 초기화
const container = new DIContainer();
container.register('aiClient', () => new AIClient(config));
container.register('excelParser', () => new ExcelParser());
container.register('dataGenerator', () => 
  new DataGenerator(container.get('aiClient'), container.get('excelParser'))
);
```

**예상 작업시간**: 1.5시간

**우선순위**: MEDIUM

---

### 5.3 설정 관리 개선 - MEDIUM PRIORITY

**문제**: 환경변수가 여러 곳에서 산발적으로 사용

```typescript
process.env.ANTHROPIC_API_KEY
process.env.OPENAI_API_KEY
process.env.EXCEL_AI_PROVIDER
process.env.DATA_AI_PROVIDER
process.env.TE_APP_ID
process.env.TE_RECEIVER_URL
// ... 등등
```

**개선 방안** - Config 클래스:

```typescript
// config/Config.ts
export class Config {
  private static instance: Config;
  private settings: Record<string, any>;

  private constructor() {
    this.settings = {
      api: {
        port: this.getEnvNumber('API_PORT', 3001),
      },
      ai: {
        anthropicKey: this.getEnv('ANTHROPIC_API_KEY'),
        openaiKey: this.getEnv('OPENAI_API_KEY'),
        excelProvider: this.getEnv('EXCEL_AI_PROVIDER', 'anthropic'),
        dataProvider: this.getEnv('DATA_AI_PROVIDER', 'anthropic'),
      },
      thinkingEngine: {
        appId: this.getEnv('TE_APP_ID'),
        receiverUrl: this.getEnv('TE_RECEIVER_URL', 'https://te-receiver-naver.thinkingdata.kr/'),
      },
      retention: {
        dataRetentionDays: this.getEnvNumber('DATA_RETENTION_DAYS', 7),
        excelRetentionDays: this.getEnvNumber('EXCEL_RETENTION_DAYS', 30),
        autoDeleteAfterSend: this.getEnvBool('AUTO_DELETE_AFTER_SEND', false),
      }
    };
  }

  static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }
    return Config.instance;
  }

  get(path: string): any {
    return path.split('.').reduce((obj, key) => obj?.[key], this.settings);
  }

  private getEnv(key: string, defaultValue?: string): string {
    const value = process.env[key];
    if (!value && defaultValue === undefined) {
      throw new Error(`Required environment variable ${key} not set`);
    }
    return value || defaultValue || '';
  }

  private getEnvNumber(key: string, defaultValue?: number): number {
    const value = this.getEnv(key, defaultValue?.toString());
    const num = Number(value);
    if (Number.isNaN(num)) {
      throw new Error(`Invalid number for ${key}: ${value}`);
    }
    return num;
  }

  private getEnvBool(key: string, defaultValue: boolean = false): boolean {
    const value = this.getEnv(key, defaultValue.toString());
    return value === 'true';
  }
}

// 사용
const config = Config.getInstance();
const port = config.get('api.port');
const anthropicKey = config.get('ai.anthropicKey');
```

**예상 작업시간**: 1시간

**우선순위**: MEDIUM

---

## 6. 추가 발견사항

### 6.1 로깅 및 모니터링 부족 - LOW PRIORITY

**현재**: `console.log/error` 직접 사용

**개선 방안**:

```typescript
// logger/Logger.ts
export class Logger {
  static log(message: string, data?: any) {
    console.log(`[${new Date().toISOString()}] [INFO] ${message}`, data || '');
  }

  static warn(message: string, data?: any) {
    console.warn(`[${new Date().toISOString()}] [WARN] ${message}`, data || '');
  }

  static error(message: string, error?: Error | any) {
    console.error(`[${new Date().toISOString()}] [ERROR] ${message}`, error?.message || error);
  }
}

// 또는 Winston, Pino 같은 라이브러리 도입
```

**예상 작업시간**: 1시간

**우선순위**: LOW

---

### 6.2 테스트 커버리지 부재 - LOW PRIORITY

**발견**: 테스트 파일 없음 (test-marketing-schema.ts 제외)

**권장**: 
- Unit 테스트 (Services, Utils)
- Integration 테스트 (API endpoints)
- E2E 테스트 (UI flow)

**초기 목표**: API 주요 경로 60% 커버리지

**예상 작업시간**: 8-10시간

**우선순위**: LOW

---

## 7. 개선 우선순위 요약

### Quick Wins (1-2시간)

1. 중복 엔드포인트 제거 (15분)
2. 하드코딩된 값 상수화 (20분)
3. 에러 메시지 개선 (1시간)

### High Priority (4-8시간)

1. Frontend 컴포넌트 분할 (4-6시간)
2. API 서버 모듈화 (5-7시간)
3. 타입 안전성 강화 (1.5시간)
4. 에러 처리 개선 (1.5시간)

### Medium Priority (6-10시간)

1. Progress 관리 리팩토링 (1시간)
2. 설정 클래스 도입 (1시간)
3. 의존성 주입 (1.5시간)
4. 폴링 전략 개선 (1시간)
5. 파일 I/O 최적화 (1시간)
6. 복잡한 조건문 정리 (30분)

### Low Priority (10+시간)

1. 메모리 효율성 (1.5시간)
2. 로깅 개선 (1시간)
3. 테스트 작성 (8-10시간)

---

## 8. 구현 로드맵 (8주)

### 1주차
- [ ] 중복 코드 제거
- [ ] 하드코딩 상수화
- [ ] 에러 클래스 정의

### 2주차
- [ ] API 서버 라우트 분리
- [ ] Service 클래스 추출

### 3주차
- [ ] Config 클래스 구현
- [ ] 타입 정의 강화

### 4주차
- [ ] Frontend 컴포넌트 분할 (50%)

### 5주차
- [ ] Frontend 컴포넌트 분할 (완료)
- [ ] 의존성 주입 도입

### 6주차
- [ ] 에러 처리 개선
- [ ] 폴링 최적화

### 7주차
- [ ] Unit 테스트 작성 (API)

### 8주차
- [ ] 성능 최적화
- [ ] 문서 작성

---

## 9. 체크리스트

마이그레이션 검증을 위한 체크리스트:

```
Code Quality
[ ] 모든 console.log 제거 또는 Logger 사용
[ ] 모든 any 타입 제거
[ ] 모든 하드코딩된 값 상수화
[ ] 복잡한 조건문 단순화

Error Handling
[ ] 모든 비동기 함수에 try-catch
[ ] 모든 에러에 적절한 메시지와 컨텍스트
[ ] 재시도 로직 구현

Architecture
[ ] 모든 라우트가 라우팅 파일에 정의
[ ] 모든 비즈니스 로직이 Service에 있음
[ ] 의존성이 순환참조 없음

Testing
[ ] 핵심 Service 60% 이상 테스트
[ ] 주요 API 엔드포인트 40% 이상 테스트

Documentation
[ ] API 문서 작성 (OpenAPI/Swagger)
[ ] 아키텍처 문서 작성
[ ] 배포 가이드 작성
```

---

## 결론

이 프로젝트는 **기능적으로는 완성도 높지만, 코드 품질과 유지보수성 측면에서 개선의 여지가 있습니다**. 

특히:
- **단기** (1-2주): 중복 제거, 타입 안전성 강화로 빠른 개선
- **중기** (3-4주): 아키텍처 분리로 확장성 확보
- **장기** (5-8주): 테스트, 성능 최적화로 프로덕션 준비

가장 높은 임팩트는 **Frontend 컴포넌트 분할(4-6시간)**과 **API 서버 모듈화(5-7시간)**입니다.
