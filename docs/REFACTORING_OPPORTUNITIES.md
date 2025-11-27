# Frontend 리팩토링 기회 분석

## 📊 현재 구조 분석

### 발견된 문제점

#### 🔴 **Critical Issues**

1. **중복된 State 관리**
   - `page.tsx`에 17개의 useState (20줄)
   - `useGeneratorState.ts` hook이 있지만 **사용되지 않음**
   - 동일한 state를 두 곳에서 정의

2. **거대한 page.tsx 파일**
   - **1,365줄** - 너무 큼!
   - 단일 파일에 모든 로직 집중
   - 유지보수 어려움

---

## 🔧 **리팩토링 계획**

### **Phase 1: State 관리 통합** (우선순위: 높음)

#### 문제
```tsx
// ❌ Bad: page.tsx에 중복 정의
const [formData, setFormData] = useState<FormData>({...});
const [currentStep, setCurrentStep] = useState<ProcessStep>('select-mode');
const [startMode, setStartMode] = useState<'new' | 'upload' | null>(null);
// ... 17개의 state

// ❌ 사용되지 않는 hook
// useGeneratorState.ts 파일이 존재하지만 import되지 않음
```

#### 해결방법
```tsx
// ✅ Good: Custom hook 사용
// page.tsx
import { useGeneratorState } from './hooks/useGeneratorState';

export default function Home() {
  const {
    formData,
    setFormData,
    currentStep,
    setCurrentStep,
    // ... 모든 state
  } = useGeneratorState();

  // 비즈니스 로직만 남음
}
```

**예상 효과:**
- page.tsx 크기: 1,365줄 → **~800줄** (40% 감소)
- State 관리 중앙화
- 테스트 용이성 향상

---

### **Phase 2: 컴포넌트 분리** (우선순위: 중간)

#### 현재 구조
```
components/
  ├── AIAnalysisCompleted.tsx     ✅ 이미 분리됨
  ├── AIAnalysisProgress.tsx      ✅ 이미 분리됨
  ├── DataCompleted.tsx           ✅ 이미 분리됨
  ├── ExcelCompleted.tsx          ✅ 이미 분리됨
  └── ... (8개 컴포넌트)
```

#### 추가 분리 필요
```tsx
// page.tsx에서 추출 가능한 컴포넌트들:

1. ServiceInfoForm.tsx
   - scenario, industry, notes 입력 폼
   - 약 100줄

2. DataSettingsForm.tsx
   - DAU, dateStart, dateEnd 설정
   - 약 80줄

3. CombinedConfigForm.tsx
   - 결합된 설정 폼
   - 약 150줄
```

**예상 구조:**
```
components/
  ├── forms/
  │   ├── ServiceInfoForm.tsx      🆕
  │   ├── DataSettingsForm.tsx     🆕
  │   └── CombinedConfigForm.tsx   🆕
  ├── progress/
  │   ├── AIAnalysisProgress.tsx
  │   └── DataGenerationProgress.tsx
  └── completed/
      ├── AIAnalysisCompleted.tsx
      ├── DataCompleted.tsx
      └── ExcelCompleted.tsx
```

---

### **Phase 3: 비즈니스 로직 분리** (우선순위: 중간)

#### 문제
```tsx
// ❌ Bad: page.tsx에 모든 로직
const handleStartExcelGeneration = async () => {
  // 50줄의 복잡한 로직
  // SSE 처리, 에러 핸들링 등
};

const handleStartAIAnalysis = async () => {
  // 40줄의 로직
};

const handleStartDataGeneration = async () => {
  // 40줄의 로직
};
```

#### 해결방법
```tsx
// ✅ Good: hooks로 분리
// hooks/useExcelGeneration.ts
export function useExcelGeneration() {
  const handleStartExcelGeneration = async (formData) => {
    // 로직
  };

  return { handleStartExcelGeneration };
}

// hooks/useAIAnalysis.ts
export function useAIAnalysis() {
  const handleStartAIAnalysis = async (params) => {
    // 로직
  };

  return { handleStartAIAnalysis };
}

// page.tsx
const { handleStartExcelGeneration } = useExcelGeneration();
const { handleStartAIAnalysis } = useAIAnalysis();
```

**새로운 hooks:**
```
hooks/
  ├── useGeneratorState.ts         ✅ 이미 존재 (미사용)
  ├── useExcelGeneration.ts        🆕
  ├── useAIAnalysis.ts             🆕
  ├── useDataGeneration.ts         🆕
  └── useProgressPolling.ts        🆕
```

---

### **Phase 4: 타입 정의 개선** (우선순위: 낮음)

#### 문제
```tsx
// ❌ Bad: any 타입 사용
const [progress, setProgress] = useState<any>(null);
const [fileAnalysisResult, setFileAnalysisResult] = useState<any>(null);
const [aiAnalysisResult, setAiAnalysisResult] = useState<any>(null);
```

#### 해결방법
```tsx
// ✅ Good: 명시적 타입
// types/index.ts에 추가
export interface ProgressData {
  status: string;
  progress: number;
  message: string;
  step?: string;
  details?: string[];
  result?: GenerationResult;
}

export interface FileAnalysisResult {
  analysisId: string;
  summary: string;
  // ...
}

// page.tsx
const [progress, setProgress] = useState<ProgressData | null>(null);
const [fileAnalysisResult, setFileAnalysisResult] = useState<FileAnalysisResult | null>(null);
```

---

## 📋 **구체적인 리팩토링 단계**

### **Step 1: useGeneratorState Hook 활성화**

```bash
# 예상 작업 시간: 30분
```

**변경 파일:**
- `page.tsx` - useGeneratorState import 및 사용
- `hooks/useGeneratorState.ts` - language 파라미터 추가

**Before:**
```tsx
// page.tsx (20줄의 useState)
const [formData, setFormData] = useState<FormData>({...});
const [currentStep, setCurrentStep] = useState<ProcessStep>('select-mode');
// ... 15개 더
```

**After:**
```tsx
// page.tsx (1줄)
const state = useGeneratorState();
```

---

### **Step 2: Form 컴포넌트 분리**

```bash
# 예상 작업 시간: 1시간
```

**생성할 파일:**
```
components/forms/
  ├── ServiceInfoForm.tsx
  ├── DataSettingsForm.tsx
  └── CombinedConfigForm.tsx
```

**ServiceInfoForm.tsx 예시:**
```tsx
interface ServiceInfoFormProps {
  formData: FormData;
  onFormDataChange: (data: FormData) => void;
  onNext: () => void;
  onCancel: () => void;
}

export const ServiceInfoForm: React.FC<ServiceInfoFormProps> = ({
  formData,
  onFormDataChange,
  onNext,
  onCancel
}) => {
  return (
    <div className="...">
      {/* scenario, industry, notes 입력 폼 */}
    </div>
  );
};
```

---

### **Step 3: 비즈니스 로직 Hook 분리**

```bash
# 예상 작업 시간: 2시간
```

**생성할 파일:**
```
hooks/
  ├── useExcelGeneration.ts
  ├── useAIAnalysis.ts
  ├── useDataGeneration.ts
  └── useProgressPolling.ts
```

**useExcelGeneration.ts 예시:**
```tsx
export function useExcelGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);

  const startGeneration = async (params: ExcelGenerationParams) => {
    setIsGenerating(true);
    try {
      const response = await fetch(`${API_URL}/api/excel/generate-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });

      // SSE 처리 로직
      const reader = response.body?.getReader();
      // ...
    } catch (error) {
      console.error('Excel generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    isGenerating,
    startGeneration
  };
}
```

---

## 📊 **리팩토링 전/후 비교**

### **코드 크기**

| 파일 | Before | After | 감소율 |
|------|--------|-------|--------|
| page.tsx | 1,365줄 | ~600줄 | **56%** ↓ |
| hooks/ | 129줄 (1개) | ~500줄 (5개) | +371줄 |
| components/forms/ | 0줄 | ~300줄 (3개) | +300줄 |
| **총계** | 1,494줄 | 1,400줄 | **6%** ↓ |

### **유지보수성**

| 항목 | Before | After |
|------|--------|-------|
| State 관리 | ⚠️ 분산 | ✅ 중앙화 |
| 컴포넌트 크기 | ⚠️ 1,365줄 | ✅ ~600줄 |
| 테스트 용이성 | ⚠️ 어려움 | ✅ 쉬움 |
| 재사용성 | ⚠️ 낮음 | ✅ 높음 |
| 타입 안전성 | ⚠️ any 사용 | ✅ 명시적 타입 |

---

## 🎯 **우선순위 추천**

### **즉시 시행 (High Priority)**

1. ✅ **useGeneratorState Hook 활성화**
   - 시간: 30분
   - 영향: 큼
   - 리스크: 낮음

2. ✅ **any 타입 제거**
   - 시간: 1시간
   - 영향: 중간
   - 리스크: 낮음

### **단계적 시행 (Medium Priority)**

3. ⏳ **Form 컴포넌트 분리**
   - 시간: 1-2시간
   - 영향: 중간
   - 리스크: 중간

4. ⏳ **비즈니스 로직 Hook 분리**
   - 시간: 2-3시간
   - 영향: 큼
   - 리스크: 중간

### **선택적 시행 (Low Priority)**

5. 📅 **폴더 구조 재정리**
   - 시간: 1시간
   - 영향: 낮음
   - 리스크: 낮음

---

## 🚀 **실행 계획**

### **Week 1: Quick Wins**
- [ ] useGeneratorState Hook 활성화
- [ ] any 타입을 명시적 타입으로 변경
- [ ] TypeScript strict mode 검증

### **Week 2: Component Refactoring**
- [ ] ServiceInfoForm 분리
- [ ] DataSettingsForm 분리
- [ ] CombinedConfigForm 분리

### **Week 3: Logic Separation**
- [ ] useExcelGeneration hook 생성
- [ ] useAIAnalysis hook 생성
- [ ] useDataGeneration hook 생성

### **Week 4: Testing & Documentation**
- [ ] 리팩토링 검증
- [ ] 문서 업데이트
- [ ] 성능 테스트

---

## 💡 **추가 개선 제안**

### **1. Error Boundary 추가**
```tsx
// components/ErrorBoundary.tsx
export class ErrorBoundary extends React.Component {
  // 에러 처리 로직
}

// page.tsx
<ErrorBoundary>
  <GeneratorWorkflow />
</ErrorBoundary>
```

### **2. React Query 도입 (선택)**
```tsx
// API 호출을 React Query로 관리
const { data, isLoading, error } = useQuery({
  queryKey: ['excel-generation'],
  queryFn: () => generateExcel(params)
});
```

### **3. Context API로 전역 상태 관리**
```tsx
// contexts/GeneratorContext.tsx
export const GeneratorContext = createContext();

export function GeneratorProvider({ children }) {
  const state = useGeneratorState();

  return (
    <GeneratorContext.Provider value={state}>
      {children}
    </GeneratorContext.Provider>
  );
}
```

---

## 📚 **참고 자료**

- [React Hooks Best Practices](https://react.dev/reference/react/hooks)
- [Component Composition](https://react.dev/learn/passing-props-to-a-component)
- [Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks)

---

**마지막 업데이트:** 2025-01-26
**분석 도구:** Manual Code Review
**분석자:** SYNERGY AI
