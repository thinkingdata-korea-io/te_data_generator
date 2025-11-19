# 다국어(i18n) 구현 가이드

## 📋 현재 상태 (2025-11-19)

### ✅ 완료된 작업

1. **i18n 시스템 구축**
   - `src/i18n/locales/ko.ts` - 한국어 번역
   - `src/i18n/locales/en.ts` - 영어 번역
   - `src/i18n/locales/zh.ts` - 중국어 번역
   - `src/contexts/LanguageContext.tsx` - 언어 Context Provider
   - `src/components/LanguageSwitcher.tsx` - 언어 전환 UI 컴포넌트

2. **적용 완료된 컴포넌트**
   - ✅ `src/components/layout/Header.tsx` - LanguageSwitcher 추가됨
   - ✅ `src/components/layout/Sidebar.tsx` - 네비게이션 메뉴 번역 완료
   - ✅ `src/app/dashboard/layout.tsx` - LanguageProvider 추가됨
   - ✅ `src/app/dashboard/generator/page.tsx` - 모드 선택 화면만 번역 완료 (**부분 완료**)

### ⚠️ 미완료 작업

다음 페이지 및 섹션에 번역이 아직 적용되지 않았습니다:

1. **Data Generator 페이지** (`src/app/dashboard/generator/page.tsx`)
   - ❌ Input 폼 (서비스 정보 입력)
   - ❌ Excel 업로드 섹션
   - ❌ Excel 미리보기
   - ❌ 데이터 생성 설정
   - ❌ 진행 상태 표시
   - ❌ 완료 화면
   - ❌ 버튼 텍스트들

2. **Settings 페이지** (`src/app/dashboard/settings/page.tsx`)
   - ❌ 전체 페이지 미적용

3. **Dashboard 페이지** (`src/app/dashboard/page.tsx`)
   - ❌ 전체 페이지 미적용

4. **User Management 페이지** (`src/app/dashboard/users/page.tsx`)
   - ❌ 전체 페이지 미적용

5. **Audit Logs 페이지** (`src/app/dashboard/audit/page.tsx`)
   - ❌ 전체 페이지 미적용

6. **Login 페이지** (`src/app/login/page.tsx`)
   - ❌ 전체 페이지 미적용

---

## 🚀 구현 방법

### 1단계: 번역 키 확인

이미 작성된 번역 파일 확인:
- `src/i18n/locales/ko.ts`
- `src/i18n/locales/en.ts`
- `src/i18n/locales/zh.ts`

각 파일에는 다음 섹션들이 포함되어 있습니다:
```typescript
{
  common: { ... },        // 공통 단어 (저장, 취소, 삭제 등)
  auth: { ... },          // 인증 관련
  nav: { ... },           // 네비게이션
  dashboard: { ... },     // 대시보드
  generator: { ... },     // 데이터 생성기
  settings: { ... },      // 설정
  users: { ... },         // 사용자 관리
  audit: { ... },         // 감사 로그
  errors: { ... },        // 오류 메시지
  success: { ... },       // 성공 메시지
}
```

### 2단계: 컴포넌트에 useLanguage Hook 추가

각 페이지/컴포넌트에서 다음과 같이 추가:

```typescript
// 1. Import 추가
import { useLanguage } from '@/contexts/LanguageContext';

// 2. 컴포넌트 내부에서 hook 사용
export default function MyPage() {
  const { t } = useLanguage();

  // 3. 하드코딩된 텍스트를 번역 키로 교체
  return (
    <div>
      <h1>{t.generator.title}</h1>
      <button>{t.common.save}</button>
    </div>
  );
}
```

### 3단계: 하드코딩된 텍스트 찾기 및 교체

예시:
```typescript
// ❌ Before
<h2>데이터 생성 설정</h2>

// ✅ After
<h2>{t.generator.generationConfig}</h2>
```

```typescript
// ❌ Before
<button>엑셀 생성 시작</button>

// ✅ After
<button>{t.generator.generateExcel}</button>
```

---

## 📝 페이지별 상세 작업 가이드

### A. Login 페이지 (`src/app/login/page.tsx`)

**필요한 번역 키:**
- `t.auth.login` - 로그인
- `t.auth.username` - 사용자명
- `t.auth.password` - 비밀번호
- `t.auth.loginButton` - 시스템 접속
- `t.auth.loginSuccess` - 인증 성공
- `t.auth.loginFailed` - 인증 실패

**작업 순서:**
1. `import { useLanguage } from '@/contexts/LanguageContext';` 추가
2. `const { t } = useLanguage();` 추가
3. 모든 하드코딩된 한국어 텍스트를 `t.auth.*` 키로 교체

**주의사항:**
- Login 페이지는 `LanguageProvider` 밖에 있으므로, `src/app/layout.tsx`에 LanguageProvider를 추가하거나
- Login 페이지 자체에 별도의 LanguageProvider를 감싸야 합니다.

**권장 방법:**
```typescript
// src/app/login/page.tsx
export default function LoginPage() {
  return (
    <LanguageProvider>
      <LoginContent />
    </LanguageProvider>
  );
}

function LoginContent() {
  const { t } = useLanguage();
  // ... 로그인 UI
}
```

---

### B. Dashboard 페이지 (`src/app/dashboard/page.tsx`)

**필요한 번역 키:**
- `t.dashboard.title` - ThinkingEngine
- `t.dashboard.subtitle` - AI 기반 이벤트 데이터 생성 플랫폼
- `t.dashboard.totalRuns` - 총 실행 횟수
- `t.dashboard.totalEvents` - 총 이벤트 수
- `t.dashboard.activeUsers` - 활성 사용자
- `t.dashboard.storageUsed` - 스토리지 사용량
- `t.dashboard.recentActivity` - 최근 활동
- `t.dashboard.quickActions` - 빠른 작업

**작업 순서:**
1. 파일 상단에 `import { useLanguage } from '@/contexts/LanguageContext';` 추가
2. 컴포넌트 내부에 `const { t } = useLanguage();` 추가
3. 제목, 라벨, 버튼 텍스트를 번역 키로 교체

---

### C. Data Generator 페이지 (`src/app/dashboard/generator/page.tsx`)

**현재 상태:**
- ✅ 모드 선택 화면 (select-mode) - 완료
- ❌ 나머지 모든 단계 - 미완료

**미완료 섹션:**

#### C-1. Input Form (서비스 정보 입력)
라인 500-600 근처에서 다음 텍스트들을 교체:

```typescript
// 찾기:
"서비스 정보 입력" → t.generator.serviceInfo
"시나리오 설명" → t.generator.scenario
"DAU (일일 활성 사용자 수)" → t.generator.dau
"산업 분류" → t.generator.industry
"추가 요구사항" → t.generator.notes
"데이터 생성 기간" → t.generator.dateRange
"시작일" → t.generator.startDate
"종료일" → t.generator.endDate
"엑셀 생성 시작" → t.generator.generateExcel
```

#### C-2. Excel Upload Section
라인 700-800 근처:

```typescript
"엑셀 파일 업로드" → t.generator.uploadExcel
"ThinkingEngine 스키마 형식의 엑셀 파일을 선택하세요" → t.generator.uploadDesc
"파일을 드래그하거나 클릭하여 선택" → t.generator.dragDrop
"지원 형식: .xlsx, .xls (최대 10MB)" → t.generator.supportedFormats
"파일 업로드" → t.generator.uploadButton
"업로드 중..." → t.generator.uploading
```

#### C-3. Excel Preview
라인 900-1000 근처:

```typescript
"엑셀 파일 미리보기" → t.generator.excelPreview
"스키마 요약" → t.generator.previewSummary
"이벤트 수" → t.generator.eventCount
"이벤트 속성 수" → t.generator.eventPropertiesCount
"공통 속성 수" → t.generator.commonPropertiesCount
"엑셀 다운로드" → t.generator.downloadExcel
"데이터 생성 단계로" → t.generator.proceedToGeneration
```

#### C-4. Data Generation Config
라인 1000-1100 근처:

```typescript
"데이터 생성 설정" → t.generator.generationConfig
"APP ID" → t.generator.appId
"Receiver URL" → t.generator.receiverUrl
"생성할 이벤트 수" → t.generator.eventCountToGenerate
"데이터 생성 시작" → t.generator.generateData
```

#### C-5. Progress Indicators
라인 1100-1200 근처:

```typescript
"엑셀 생성 중..." → t.generator.generatingExcel
"데이터 생성 중..." → t.generator.generatingData
"데이터 전송 중..." → t.generator.sendingData
"완료" → t.generator.completed
"진행률" → t.generator.progress
```

#### C-6. Results/Complete Screen
라인 1200-1300 근처:

```typescript
"데이터 생성 완료" → t.generator.generationComplete
"데이터 전송 완료" → t.generator.sendingComplete
"생성된 총 이벤트" → t.generator.totalGenerated
"전송된 총 이벤트" → t.generator.totalSent
"데이터 다운로드" → t.generator.downloadData
"ThinkingEngine으로 전송" → t.generator.sendToTE
"새로 시작" → t.generator.startNew
```

**작업 방법:**
1. 파일 열기: `src/app/dashboard/generator/page.tsx`
2. 이미 `const { t } = useLanguage();`가 추가되어 있음 (Line 47)
3. Ctrl+F로 한국어 텍스트 검색하여 하나씩 교체
4. 주의: placeholder 텍스트도 교체 필요 (예: `placeholder={t.generator.scenarioPlaceholder}`)

---

### D. Settings 페이지 (`src/app/dashboard/settings/page.tsx`)

**필요한 번역 키:**

```typescript
// 탭 제목
t.settings.userProfile
t.settings.aiProviders
t.settings.platformConfig
t.settings.dataRetention

// User Profile
t.settings.displayName
t.settings.email
t.settings.role
t.settings.currentPassword
t.settings.newPassword
t.settings.confirmPassword
t.settings.updateProfile

// AI Providers
t.settings.anthropicKey
t.settings.openaiKey
t.settings.excelProvider
t.settings.dataProvider
t.settings.testConnection

// Platform Config
t.settings.teAppId
t.settings.teReceiverUrl
t.settings.defaultDau
t.settings.defaultOutputDir

// Data Retention
t.settings.dataRetentionDays
t.settings.excelRetentionDays
t.settings.autoDeleteAfterSend
t.settings.days
t.settings.enabled
t.settings.disabled

// Common
t.common.save
t.common.cancel
```

**작업 순서:**
1. 파일 열기: `src/app/dashboard/settings/page.tsx`
2. Import 추가: `import { useLanguage } from '@/contexts/LanguageContext';`
3. Hook 추가: `const { t } = useLanguage();`
4. 탭 제목 교체 (라인 100-200 근처):
   ```typescript
   const tabs = [
     { id: 'profile', label: t.settings.userProfile, icon: '👤' },
     { id: 'ai', label: t.settings.aiProviders, icon: '🤖' },
     { id: 'platform', label: t.settings.platformConfig, icon: '⚙️' },
     { id: 'retention', label: t.settings.dataRetention, icon: '🗄️' },
   ];
   ```
5. 모든 라벨, 버튼, 플레이스홀더 텍스트 교체

---

### E. User Management 페이지 (`src/app/dashboard/users/page.tsx`)

**필요한 번역 키:**

```typescript
t.users.title          // 사용자 관리
t.users.addUser        // 사용자 추가
t.users.editUser       // 사용자 수정
t.users.deleteUser     // 사용자 삭제
t.users.username       // 사용자명
t.users.email          // 이메일
t.users.role           // 역할
t.users.createdAt      // 생성일
t.users.lastLogin      // 마지막 로그인
t.users.actions        // 작업
t.users.admin          // 관리자
t.users.user           // 사용자
t.users.viewer         // 뷰어

t.common.save
t.common.cancel
t.common.delete
t.common.edit
```

**작업 순서:**
1. 파일 열기: `src/app/dashboard/users/page.tsx`
2. Import 및 Hook 추가
3. 테이블 헤더 교체
4. 버튼 텍스트 교체
5. 모달 텍스트 교체

---

### F. Audit Logs 페이지 (`src/app/dashboard/audit/page.tsx`)

**필요한 번역 키:**

```typescript
t.audit.title         // 감사 로그
t.audit.timestamp     // 시간
t.audit.user          // 사용자
t.audit.action        // 작업
t.audit.resource      // 리소스
t.audit.ipAddress     // IP 주소
t.audit.userAgent     // User Agent
t.audit.details       // 상세 정보

t.common.search
t.common.filter
t.common.export
```

**작업 순서:**
1. 파일 열기: `src/app/dashboard/audit/page.tsx`
2. Import 및 Hook 추가
3. 테이블 헤더 교체
4. 필터 라벨 교체

---

## 🔧 누락된 번역 키 추가 방법

만약 번역 파일에 없는 텍스트를 발견하면:

### 1. 한국어 번역 추가 (`src/i18n/locales/ko.ts`)

```typescript
export const ko = {
  // 기존 내용...

  // 새로운 섹션 추가 또는 기존 섹션에 키 추가
  generator: {
    // 기존 키들...
    newKey: '새로운 텍스트',  // ← 추가
  },
};
```

### 2. 영어 번역 추가 (`src/i18n/locales/en.ts`)

```typescript
export const en = {
  generator: {
    newKey: 'New Text',
  },
};
```

### 3. 중국어 번역 추가 (`src/i18n/locales/zh.ts`)

```typescript
export const zh = {
  generator: {
    newKey: '新文本',
  },
};
```

### 4. 컴포넌트에서 사용

```typescript
<div>{t.generator.newKey}</div>
```

---

## 📋 체크리스트

다음 체크리스트를 사용하여 진행 상황을 추적하세요:

### 페이지별 체크리스트

- [ ] **Login 페이지** (`src/app/login/page.tsx`)
  - [ ] LanguageProvider 추가
  - [ ] useLanguage hook 추가
  - [ ] 모든 텍스트 번역 적용
  - [ ] 테스트 완료

- [ ] **Dashboard 페이지** (`src/app/dashboard/page.tsx`)
  - [ ] useLanguage hook 추가
  - [ ] 제목/부제 번역
  - [ ] 통계 라벨 번역
  - [ ] 버튼 텍스트 번역
  - [ ] 테스트 완료

- [ ] **Data Generator 페이지** (`src/app/dashboard/generator/page.tsx`)
  - [x] 모드 선택 화면 (완료)
  - [ ] Input Form 섹션
  - [ ] Excel Upload 섹션
  - [ ] Excel Preview 섹션
  - [ ] Generation Config 섹션
  - [ ] Progress 표시
  - [ ] Complete 화면
  - [ ] 모든 버튼/라벨
  - [ ] Placeholder 텍스트
  - [ ] 테스트 완료

- [ ] **Settings 페이지** (`src/app/dashboard/settings/page.tsx`)
  - [ ] useLanguage hook 추가
  - [ ] 탭 제목 번역
  - [ ] User Profile 섹션
  - [ ] AI Providers 섹션
  - [ ] Platform Config 섹션
  - [ ] Data Retention 섹션
  - [ ] 테스트 완료

- [ ] **User Management 페이지** (`src/app/dashboard/users/page.tsx`)
  - [ ] useLanguage hook 추가
  - [ ] 테이블 헤더 번역
  - [ ] 버튼 텍스트 번역
  - [ ] 모달 번역
  - [ ] 테스트 완료

- [ ] **Audit Logs 페이지** (`src/app/dashboard/audit/page.tsx`)
  - [ ] useLanguage hook 추가
  - [ ] 테이블 헤더 번역
  - [ ] 필터 라벨 번역
  - [ ] 테스트 완료

---

## 🧪 테스트 방법

각 페이지 작업 완료 후:

1. **브라우저에서 페이지 열기**
2. **Header의 언어 전환 버튼 클릭**
3. **한국어(KO) → 영어(EN) → 중국어(ZH) 순서로 전환**
4. **모든 텍스트가 제대로 번역되는지 확인**
5. **콘솔 에러 없는지 확인**

---

## ⚡ 빠른 시작 (AI 에이전트용 지침)

AI 에이전트가 이 작업을 이어서 진행할 때:

1. **먼저 읽어야 할 파일들:**
   - `src/i18n/locales/ko.ts` - 사용 가능한 모든 번역 키 확인
   - `src/contexts/LanguageContext.tsx` - Hook 사용법 확인

2. **작업 우선순위:**
   ```
   1순위: Data Generator 나머지 섹션 (가장 많이 사용되는 페이지)
   2순위: Settings 페이지
   3순위: Dashboard 페이지
   4순위: User Management 페이지
   5순위: Audit Logs 페이지
   6순위: Login 페이지
   ```

3. **각 페이지 작업 시 패턴:**
   ```typescript
   // Step 1: Import 추가
   import { useLanguage } from '@/contexts/LanguageContext';

   // Step 2: Hook 사용
   const { t } = useLanguage();

   // Step 3: 텍스트 교체
   // Before: <h1>제목</h1>
   // After:  <h1>{t.section.key}</h1>
   ```

4. **주의사항:**
   - Login 페이지는 별도 LanguageProvider 필요
   - Placeholder, title, aria-label 등도 모두 번역 필요
   - 동적 텍스트 (예: 숫자, 날짜)는 번역하지 않음

5. **완료 후 확인:**
   - 빌드 에러 없는지 확인: `npm run dev`에서 컴파일 성공
   - 브라우저에서 3개 언어 모두 테스트
   - 콘솔 에러 없는지 확인

---

## 📞 문제 해결

### 문제: 번역 키를 찾을 수 없음
```
Cannot find property 'someKey' of undefined
```

**해결:**
1. `src/i18n/locales/ko.ts`에 해당 키가 있는지 확인
2. 없다면 ko.ts, en.ts, zh.ts 모두에 추가
3. TypeScript 에러 확인 후 재시작

### 문제: LanguageProvider 에러
```
useLanguage must be used within a LanguageProvider
```

**해결:**
- 해당 컴포넌트가 `<LanguageProvider>` 내부에 있는지 확인
- Dashboard 하위는 자동으로 감싸져 있음
- Login 페이지는 별도 Provider 필요

### 문제: 번역이 적용되지 않음

**해결:**
1. 브라우저 캐시 삭제 후 새로고침
2. `localStorage.clear()` 실행
3. 개발 서버 재시작

---

## 📚 참고 자료

- **현재 구현된 파일들:**
  - `src/i18n/locales/*.ts` - 번역 데이터
  - `src/contexts/LanguageContext.tsx` - Context Provider
  - `src/components/LanguageSwitcher.tsx` - UI 컴포넌트
  - `src/components/layout/Sidebar.tsx` - 적용 예시
  - `src/app/dashboard/generator/page.tsx` - 부분 적용 예시

- **기술 스택:**
  - React Context API
  - TypeScript
  - localStorage for persistence
  - Browser language detection (navigator.language)

---

## 🎯 최종 목표

모든 작업 완료 시:
- ✅ 모든 페이지에서 한국어/영어/중국어 전환 가능
- ✅ 브라우저 언어 자동 감지
- ✅ 선택한 언어 유지 (localStorage)
- ✅ Tech Terminal 스타일 유지
- ✅ 에러 없이 빌드 성공
- ✅ 모든 UI 텍스트 번역 완료

---

**작성일:** 2025-11-19
**버전:** 1.0
**작성자:** Claude (Sonnet 4.5)
