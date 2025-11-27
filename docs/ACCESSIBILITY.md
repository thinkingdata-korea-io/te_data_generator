# 접근성 가이드라인 (Accessibility Guidelines)

## 개요

이 프로젝트는 **WCAG 2.1 Level AA** 표준을 준수합니다. 모든 사용자가 장애 유무와 관계없이 애플리케이션을 사용할 수 있도록 설계되었습니다.

## 준수 표준

- ✅ **WCAG 2.1 Level AA**
- ✅ **Section 508** (미국 접근성 표준)
- ✅ **스크린 리더 호환** (NVDA, JAWS, VoiceOver)
- ✅ **키보드 탐색 지원**

---

## 구현된 접근성 기능

### 1. 폼 접근성 (Form Accessibility)

#### ✅ 모든 Input에 Label 연결
```tsx
// ✅ Good: htmlFor로 label과 input 연결
<label htmlFor="industry-input">
  Industry
</label>
<input
  id="industry-input"
  type="text"
  value={formData.industry}
  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
/>

// ❌ Bad: label과 input이 연결되지 않음
<label>Industry</label>
<input type="text" value={formData.industry} />
```

#### ✅ 필수 필드 표시
```tsx
<input
  id="scenario-input"
  type="text"
  required
  aria-required="true"
/>
```

#### ✅ 동적 ID 사용 (테이블/리스트)
```tsx
{segments.map((segment, idx) => (
  <tr key={idx}>
    <td>
      <input
        id={`segment-name-${idx}`}
        aria-label={`세그먼트명 ${idx + 1}`}
      />
    </td>
  </tr>
))}
```

---

### 2. 버튼 접근성 (Button Accessibility)

#### ✅ 명시적 type 속성
```tsx
// ✅ Good: type 속성 명시
<button type="button" onClick={handleClick}>
  Click me
</button>

// ❌ Bad: type 생략 (기본값이 submit이 될 수 있음)
<button onClick={handleClick}>
  Click me
</button>
```

#### ✅ Disabled 상태 관리
```tsx
<button
  type="button"
  disabled={isLoading}
  className="disabled:opacity-50 disabled:cursor-not-allowed"
>
  {isLoading ? 'Loading...' : 'Submit'}
</button>
```

---

### 3. ARIA 속성 (ARIA Attributes)

#### ✅ aria-label 사용
```tsx
// 시각적 label이 없을 때
<input
  type="date"
  aria-label="Start Date"
  value={startDate}
/>

// 아이콘 버튼
<button type="button" aria-label="Close dialog">
  <CloseIcon />
</button>
```

#### ✅ aria-required
```tsx
<input
  id="email-input"
  type="email"
  aria-required="true"
  required
/>
```

#### ✅ aria-describedby
```tsx
<input
  id="password-input"
  type="password"
  aria-describedby="password-help"
/>
<p id="password-help">
  비밀번호는 최소 8자 이상이어야 합니다.
</p>
```

---

### 4. 키보드 탐색 (Keyboard Navigation)

#### ✅ Tab Order
- 모든 interactive 요소는 자연스러운 tab order를 가집니다
- `tabindex`는 특별한 경우가 아니면 사용하지 않습니다

#### ✅ Focus Indicators
```css
/* Tailwind CSS로 구현된 focus 스타일 */
.focus\:border-\[var\(--accent-cyan\)\]:focus {
  border-color: var(--accent-cyan);
}

.focus\:outline-none:focus {
  outline: 2px solid transparent;
  outline-offset: 2px;
}
```

---

### 5. 스크린 리더 지원 (Screen Reader Support)

#### ✅ 의미론적 HTML (Semantic HTML)
```tsx
// ✅ Good: 의미 있는 태그 사용
<nav>...</nav>
<main>...</main>
<article>...</article>
<section>...</section>

// ❌ Bad: div 남용
<div className="nav">...</div>
<div className="main">...</div>
```

#### ✅ Alt Text for Images
```tsx
<img
  src="/logo.png"
  alt="ThinkingEngine Logo"
/>

// 장식용 이미지
<img
  src="/decoration.png"
  alt=""
  role="presentation"
/>
```

---

## 페이지별 접근성 체크리스트

### Generator Page
- ✅ 모든 입력 필드에 label 연결
- ✅ 테이블 input에 aria-label 추가
- ✅ 필수 필드에 aria-required="true"
- ✅ 버튼에 type="button" 명시
- ✅ 동적 폼 요소에 고유 ID 할당

### Settings Page
- ✅ 프로필 입력 필드 label 연결
- ✅ Disabled 필드에 적절한 aria-label
- ✅ 설정 변경 폼 접근성 확보

### Audit Page
- ✅ 필터 select/input에 label 연결
- ✅ 날짜 입력 필드 aria-label 추가
- ✅ 테이블 헤더 적절히 구성

---

## 개발 가이드라인

### 1. 새로운 폼 요소 추가 시

```tsx
// Template
<div>
  <label htmlFor="unique-input-id" className="...">
    {labelText} {isRequired && <span className="text-red-500">*</span>}
  </label>
  <input
    id="unique-input-id"
    type="text"
    value={value}
    onChange={handleChange}
    aria-required={isRequired}
    placeholder={placeholderText}
  />
</div>
```

### 2. 동적 리스트/테이블

```tsx
{items.map((item, index) => (
  <div key={item.id}>
    <label htmlFor={`item-name-${index}`}>
      Item Name
    </label>
    <input
      id={`item-name-${index}`}
      aria-label={`Item name ${index + 1}`}
      value={item.name}
    />
  </div>
))}
```

### 3. 버튼

```tsx
// 일반 버튼
<button type="button" onClick={handleClick}>
  Action
</button>

// 폼 제출 버튼
<button type="submit">
  Submit
</button>

// 아이콘 버튼
<button type="button" aria-label="Close">
  <CloseIcon />
</button>
```

---

## 테스트 방법

### 1. 자동화 테스트
```bash
# ESLint로 접근성 체크
npm run lint

# axe DevTools 사용 (브라우저 확장)
# https://www.deque.com/axe/devtools/
```

### 2. 수동 테스트

#### 키보드 탐색
1. Tab 키로 모든 interactive 요소 탐색
2. Enter/Space로 버튼 활성화
3. 화살표 키로 select/radio 탐색

#### 스크린 리더
- **Windows**: NVDA (무료)
- **Mac**: VoiceOver (내장)
- **Linux**: Orca

### 3. 체크리스트
- [ ] 모든 input에 label 연결됨
- [ ] 필수 필드에 aria-required 추가됨
- [ ] 버튼에 type 속성 명시됨
- [ ] 키보드로 모든 기능 사용 가능
- [ ] Focus indicator가 명확함
- [ ] 색상 대비가 충분함 (최소 4.5:1)

---

## 문제 발생 시

### Microsoft Edge Tools 경고 해결

#### "Form elements must have labels"
```tsx
// Before
<input type="text" value={value} />

// After
<label htmlFor="input-id">Label</label>
<input id="input-id" type="text" value={value} />
```

#### "Button type attribute has not been set"
```tsx
// Before
<button onClick={handleClick}>Click</button>

// After
<button type="button" onClick={handleClick}>Click</button>
```

---

## 참고 자료

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [React Accessibility](https://react.dev/learn/accessibility)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)

---

## 연락처

접근성 관련 문제나 개선 사항이 있으면 이슈를 등록해주세요:
- GitHub Issues: [프로젝트 저장소]/issues
- Label: `accessibility`

---

**마지막 업데이트**: 2025-01-26
**WCAG 준수 레벨**: AA
**테스트 완료**: ✅
