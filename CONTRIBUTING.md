# Contributing Guide

ThinkingEngine 데이터 생성기 프로젝트에 기여해주셔서 감사합니다! 🎉

## 목차

- [개발 환경 설정](#개발-환경-설정)
- [코드 스타일](#코드-스타일)
- [접근성 가이드라인](#접근성-가이드라인)
- [TypeScript 규칙](#typescript-규칙)
- [Pull Request 프로세스](#pull-request-프로세스)

---

## 개발 환경 설정

### 필수 요구사항
- Node.js 18.x 이상
- npm 또는 yarn
- Git

### 설치
```bash
# 저장소 클론
git clone <repository-url>
cd demo_data_gen

# Backend 설정
cd data-generator
npm install

# Frontend 설정
cd ../frontend
npm install
```

### 실행
```bash
# Backend (Port 3001)
cd data-generator
npm run dev

# Frontend (Port 3000)
cd frontend
npm run dev
```

---

## 코드 스타일

### TypeScript

#### 명명 규칙
```typescript
// ✅ Good
interface UserData {
  userName: string;
  userId: number;
}

const getUserProfile = (id: number): UserData => { }

// ❌ Bad
interface user_data {
  user_name: string;
}

const get_user_profile = (id: number) => { }
```

#### 타입 정의
```typescript
// ✅ Good: 명시적 타입
const handleSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
  event.preventDefault();
}

// ❌ Bad: any 타입 사용
const handleSubmit = (event: any) => {
  event.preventDefault();
}
```

#### Interface vs Type
```typescript
// ✅ Good: 객체 형태는 interface
interface FormData {
  scenario: string;
  industry: string;
}

// ✅ Good: Union/Intersection은 type
type ProcessStep = 'select-mode' | 'input' | 'generating-excel';
```

---

### React 컴포넌트

#### 컴포넌트 구조
```tsx
// ✅ Good: Props 타입 정의
interface ButtonProps {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ onClick, disabled, children }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="..."
    >
      {children}
    </button>
  );
};

// ❌ Bad: Props 타입 없음
export const Button = ({ onClick, disabled, children }) => {
  return <button onClick={onClick}>{children}</button>;
};
```

#### Hooks 사용
```tsx
// ✅ Good: useState 타입 명시
const [formData, setFormData] = useState<FormData>({
  scenario: '',
  industry: '',
});

// ✅ Good: useEffect 의존성 배열
useEffect(() => {
  fetchData();
}, [dependency1, dependency2]);

// ❌ Bad: 빈 의존성 배열 남용
useEffect(() => {
  fetchData(); // dependency를 사용하지만 배열에 없음
}, []);
```

---

## 접근성 가이드라인

### 필수 사항

#### 1. 모든 폼 요소에 Label 연결
```tsx
// ✅ Good
<label htmlFor="email-input">Email</label>
<input
  id="email-input"
  type="email"
  value={email}
  onChange={handleChange}
/>

// ❌ Bad
<input type="email" value={email} />
```

#### 2. 버튼 Type 명시
```tsx
// ✅ Good
<button type="button" onClick={handleClick}>
  Click
</button>

// ❌ Bad
<button onClick={handleClick}>Click</button>
```

#### 3. ARIA 속성 사용
```tsx
// ✅ Good: 필수 필드 표시
<input
  type="text"
  aria-required="true"
  required
/>

// ✅ Good: 동적 리스트
<input
  id={`item-${index}`}
  aria-label={`Item ${index + 1}`}
/>
```

자세한 내용은 [docs/ACCESSIBILITY.md](./docs/ACCESSIBILITY.md)를 참조하세요.

---

## TypeScript 규칙

### 엄격 모드 (Strict Mode)

프로젝트는 TypeScript strict mode를 사용합니다:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

### 타입 에러 허용 안 됨

```typescript
// ❌ Bad: @ts-ignore 사용 금지
// @ts-ignore
const result = dangerousFunction();

// ✅ Good: 적절한 타입 정의
interface DangerousResult {
  data: unknown;
}
const result: DangerousResult = dangerousFunction();
```

### Any 타입 최소화

```typescript
// ❌ Bad
const processData = (data: any) => { }

// ✅ Good: Generic 사용
const processData = <T>(data: T): T => {
  return data;
}

// ✅ Good: unknown 사용 후 타입 가드
const processData = (data: unknown) => {
  if (typeof data === 'string') {
    return data.toUpperCase();
  }
}
```

---

## Pull Request 프로세스

### 1. 브랜치 생성

```bash
# Feature
git checkout -b feature/add-new-feature

# Bug fix
git checkout -b fix/fix-issue-123

# Refactor
git checkout -b refactor/improve-performance
```

### 2. 커밋 메시지

```bash
# ✅ Good
git commit -m "feat: add user authentication feature"
git commit -m "fix: resolve TypeScript error in server.ts"
git commit -m "docs: update accessibility guidelines"
git commit -m "refactor: optimize form validation logic"

# ❌ Bad
git commit -m "update"
git commit -m "fix bug"
git commit -m "changes"
```

#### 커밋 타입
- `feat`: 새로운 기능
- `fix`: 버그 수정
- `docs`: 문서 변경
- `style`: 코드 포맷팅 (기능 변경 없음)
- `refactor`: 코드 리팩토링
- `test`: 테스트 추가/수정
- `chore`: 빌드 프로세스 또는 도구 변경

### 3. 코드 체크

PR 생성 전 다음을 확인하세요:

```bash
# TypeScript 컴파일 체크
cd frontend && npx tsc --noEmit
cd data-generator && npx tsc --noEmit

# 빌드 테스트
npm run build

# 접근성 체크
# - Microsoft Edge DevTools 사용
# - axe DevTools 브라우저 확장 사용
```

### 4. PR 템플릿

```markdown
## Description
[변경 사항에 대한 간단한 설명]

## Type of Change
- [ ] 새로운 기능 (feat)
- [ ] 버그 수정 (fix)
- [ ] 리팩토링 (refactor)
- [ ] 문서 (docs)

## Checklist
- [ ] TypeScript 컴파일 에러 없음
- [ ] 접근성 가이드라인 준수
- [ ] 적절한 타입 정의 추가
- [ ] 커밋 메시지 규칙 준수

## Screenshots (if applicable)
[스크린샷 또는 GIF]

## Related Issues
Closes #[이슈 번호]
```

---

## 코드 리뷰 체크리스트

### TypeScript
- [ ] 모든 변수/함수에 타입 정의
- [ ] `any` 타입 사용 최소화
- [ ] Interface/Type 적절히 사용

### 접근성
- [ ] 모든 input에 label 연결
- [ ] 버튼에 type 속성 명시
- [ ] ARIA 속성 적절히 사용
- [ ] 키보드 탐색 가능

### 성능
- [ ] 불필요한 re-render 방지
- [ ] useMemo/useCallback 적절히 사용
- [ ] 큰 리스트에 virtualization 고려

### 보안
- [ ] SQL Injection 방지
- [ ] XSS 방지 (사용자 입력 sanitize)
- [ ] 환경변수로 민감 정보 관리

---

## 문제 해결

### TypeScript 에러

```bash
# 타입 정의 파일 재생성
npm run build

# node_modules 재설치
rm -rf node_modules package-lock.json
npm install
```

### 접근성 에러

Microsoft Edge DevTools 사용:
1. F12로 DevTools 열기
2. "Issues" 탭 선택
3. Accessibility 섹션 확인

---

## 도움받기

- **Documentation**: [docs/](./docs/)
- **Issues**: GitHub Issues 탭
- **Discussions**: GitHub Discussions

---

## License

이 프로젝트에 기여함으로써, 귀하의 기여가 프로젝트와 동일한 라이선스 하에 있음에 동의합니다.

---

**Happy Contributing! 🚀**
