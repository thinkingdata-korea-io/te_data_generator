# 데이터 생성 백엔드

ThinkingEngine 이벤트 데이터를 생성하는 백엔드 로직입니다.

## 기능

- Excel 스키마 파일 파싱
- AI 기반 동적 데이터 범위 분석
- 국가별 현실적 데이터 생성 (Faker.js)
- 유저 생명주기 시뮬레이션
- 이벤트 의존성 및 퍼널 관리
- ThinkingEngine 형식 변환
- LogBus2 자동 업로드

## 설치

```bash
npm install
```

## 사용법

### CLI 사용

```bash
# 데이터 생성
npm run dev -- generate \
  -e ../excel-schema-generator/output/schema.xlsx \
  -s "E-commerce platform with high user engagement" \
  -d 1000 \
  -i "E-commerce" \
  --date-start 2025-01-01 \
  --date-end 2025-01-31

# 데이터 생성 및 업로드
npm run dev -- generate \
  -e ../excel-schema-generator/output/schema.xlsx \
  -s "Gaming app" \
  -d 5000 \
  -i "Gaming" \
  --date-start 2025-01-01 \
  --date-end 2025-01-07 \
  --app-id YOUR_APP_ID \
  --receiver-url https://te-receiver.thinkingdata.kr/ \
  --logbus-path "../logbus 2/logbus" \
  --upload
```

### 프로그래밍 사용

```typescript
import { DataGenerator } from './data-generator';

const generator = new DataGenerator({
  excelFilePath: './schema.xlsx',
  userInput: {
    scenario: 'E-commerce platform',
    dau: 1000,
    industry: 'E-commerce',
    notes: 'High engagement users',
    dateRange: {
      start: '2025-01-01',
      end: '2025-01-31'
    }
  },
  aiProvider: 'openai',
  aiApiKey: process.env.OPENAI_API_KEY!,
  outputDataPath: '../output/data',
  outputMetadataPath: '../output/runs'
});

const result = await generator.generate();
console.log(`Generated ${result.totalEvents} events`);

// 업로드
await generator.uploadToLogBus2();
```

## 구조

- `src/excel/`: Excel 스키마 파일 파싱
- `src/ai/`: AI API 클라이언트 (OpenAI/Claude)
- `src/generators/`: 데이터 생성 로직
  - 유저 코호트 생성
  - 이벤트 생성
  - 의존성 관리
  - Faker.js 유틸리티
- `src/logbus/`: LogBus2 제어
- `src/formatters/`: ThinkingEngine 형식 변환
- `src/types/`: TypeScript 타입 정의
- `src/utils/`: 유틸리티 함수

## 환경변수

`.env` 파일에 다음 설정:

```env
ANTHROPIC_API_KEY=your_key
OPENAI_API_KEY=your_key
```
