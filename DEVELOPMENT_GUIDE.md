# ThinkingEngine Data Generator - Development Guide

> **AI Code Generation Reference**: This document contains mandatory rules and patterns that MUST be followed when writing any code for this project.

---

## 🌍 1. INTERNATIONALIZATION (i18n) - MANDATORY

### Rule: ALL user-facing text MUST use i18n translations

**❌ NEVER do this:**

```typescript
<button>데이터 생성</button>
<p>File uploaded successfully</p>
<span>生成数据</span>
```

**✅ ALWAYS do this:**

```typescript
import { useLanguage } from "@/contexts/LanguageContext";

function MyComponent() {
  const { t } = useLanguage();

  return (
    <>
      <button>{t.generator.generateData}</button>
      <p>{t.generator.uploadSuccess}</p>
    </>
  );
}
```

### Steps for adding new UI text:

1. **Add translation keys to ALL 3 language files:**

   - `/frontend/src/i18n/locales/ko.ts` (Korean)
   - `/frontend/src/i18n/locales/en.ts` (English)
   - `/frontend/src/i18n/locales/zh.ts` (Chinese)

2. **Translation key structure:**

```typescript
// ko.ts
export const ko = {
  sectionName: {
    keyName: "한국어 텍스트",
    buttonLabel: "버튼",
    errorMessage: "오류가 발생했습니다",
  },
};

// en.ts
export const en = {
  sectionName: {
    keyName: "English text",
    buttonLabel: "Button",
    errorMessage: "An error occurred",
  },
};

// zh.ts
export const zh = {
  sectionName: {
    keyName: "中文文本",
    buttonLabel: "按钮",
    errorMessage: "发生错误",
  },
};
```

3. **Use in components:**

```typescript
const { t } = useLanguage();
<div>{t.sectionName.keyName}</div>;
```

### Existing translation sections:

- `common`: Loading, save, cancel, delete, edit, back, next, confirm, search, filter, export, import
- `auth`: Login, logout, username, password
- `login`: Login page specific text
- `nav`: Dashboard, data generator, settings, user management, audit logs
- `dashboard`: Dashboard page content
- `generator`: Data generator page (largest section with 80+ keys)
- `settings`: Settings page with 4 tabs
- `users`: User management page
- `audit`: Audit logs page
- `errors`: Generic error messages
- `success`: Generic success messages

---

## 🎨 2. UI/UX PATTERNS - MANDATORY

### Terminal-style Theme

This project uses a **terminal/cyberpunk aesthetic**. Always follow these patterns:

**Color Variables (use CSS variables):**

```typescript
// ✅ Correct
className =
  "text-[var(--accent-cyan)] bg-[var(--bg-secondary)] border-[var(--border)]";

// ❌ Wrong
className = "text-blue-500 bg-gray-800 border-gray-600";
```

**Available CSS Variables:**

```css
--bg-primary: Main background
--bg-secondary: Card/panel background
--bg-tertiary: Input/tertiary background
--text-primary: Main text
--text-secondary: Secondary text
--text-dimmed: Dimmed text
--accent-cyan: Primary accent (cyan)
--accent-green: Success/positive
--accent-yellow: Warning
--error-red: Error/negative
--border: Normal border
--border-bright: Highlighted border
--terminal-cyan: Terminal cyan
--terminal-green: Terminal green
--terminal-magenta: Terminal magenta
```

**Terminal Effects:**

```typescript
// Terminal glow effect
className = "terminal-glow";

// Scan lines effect
className = "scan-lines";

// Cursor blink
className = "cursor-blink";

// CRT screen effect
className = "crt-screen";
```

### Component Structure Pattern

```typescript
"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";

/**
 * Component Name
 * @brief: Brief description of what this component does
 */
export default function MyComponent() {
  const { t } = useLanguage();
  const [state, setState] = useState("");

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[var(--bg-secondary)] border-2 border-[var(--border-bright)] rounded-lg p-6 terminal-glow"
      >
        <h1 className="text-2xl font-bold text-terminal-cyan mb-2">
          {t.section.title}
        </h1>
        <p className="text-[var(--text-secondary)] text-sm font-mono">
          {t.section.description}
        </p>
      </motion.div>

      {/* Content */}
      {/* ... */}
    </div>
  );
}
```

---

## 📁 3. FILE STRUCTURE & IMPORTS

### Frontend Structure

```
frontend/src/
├── app/                    # Next.js 14 App Router
│   ├── login/page.tsx     # Login page
│   ├── dashboard/         # Dashboard routes
│   │   ├── page.tsx       # Main dashboard
│   │   ├── generator/     # Data generator
│   │   ├── settings/      # Settings
│   │   ├── users/         # User management
│   │   └── audit/         # Audit logs
│   └── layout.tsx         # Root layout (has LanguageProvider)
├── components/            # Reusable components
│   ├── layout/           # Layout components (Header, Sidebar)
│   ├── effects/          # Animation effects (TypingAnimation, TerminalPrompt)
│   └── LanguageSwitcher.tsx
├── contexts/             # React contexts
│   ├── AuthContext.tsx
│   └── LanguageContext.tsx
├── i18n/                 # Internationalization
│   └── locales/
│       ├── ko.ts         # Korean translations
│       ├── en.ts         # English translations
│       └── zh.ts         # Chinese translations
└── styles/
    └── globals.css       # Global styles & CSS variables
```

### Import Order (mandatory)

```typescript
// 1. React & Next.js
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// 2. Third-party libraries
import { motion } from "framer-motion";

// 3. Contexts
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

// 4. Components
import { Header } from "@/components/layout/Header";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

// 5. Types
import type { User } from "@/types";
```

---

## 🔐 4. AUTHENTICATION & SECURITY

### Protected Routes

All dashboard pages MUST use authentication:

```typescript
"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProtectedPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  return <div>Protected content</div>;
}
```

### API Calls - Always include auth token

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const token = localStorage.getItem("auth_token");

const response = await fetch(`${API_URL}/api/endpoint`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify(data),
});
```

---

## 🎯 5. STATE MANAGEMENT PATTERNS

### Form State

```typescript
const [formData, setFormData] = useState({
  field1: "",
  field2: "",
});

const handleChange = (field: string, value: string) => {
  setFormData((prev) => ({ ...prev, [field]: value }));
};
```

### Loading States

```typescript
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState("");

try {
  setIsLoading(true);
  setError("");
  // ... operation
} catch (err) {
  setError(t.errors.generic);
} finally {
  setIsLoading(false);
}
```

### Progress Tracking

```typescript
interface Progress {
  status: "idle" | "generating" | "completed" | "error";
  progress: number; // 0-100
  message: string;
  error?: string;
}

const [progress, setProgress] = useState<Progress>({
  status: "idle",
  progress: 0,
  message: "",
});
```

---

## 🎬 6. ANIMATION PATTERNS

### Page Transitions

```typescript
import { motion } from "framer-motion";

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }}
>
  {/* content */}
</motion.div>;
```

### List Items

```typescript
{
  items.map((item, index) => (
    <motion.div
      key={item.id}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      {/* item content */}
    </motion.div>
  ));
}
```

---

## 🔧 7. BACKEND API CONVENTIONS

### Response Format

```typescript
// Success
{
  success: true,
  data: { ... },
  message: 'Operation successful'
}

// Error
{
  success: false,
  error: 'Error message',
  details?: { ... }
}
```

### API Endpoints Pattern

```
POST   /api/auth/login
GET    /api/users
POST   /api/users
PUT    /api/users/:id
DELETE /api/users/:id
GET    /api/audit-logs
POST   /api/generate/start
GET    /api/generate/progress/:runId
POST   /api/excel/upload
GET    /api/excel/list
```

---

## 📝 8. NAMING CONVENTIONS

### Files

- Components: `PascalCase.tsx` (e.g., `DataGenerator.tsx`)
- Utilities: `camelCase.ts` (e.g., `apiClient.ts`)
- Pages (App Router): `page.tsx`, `layout.tsx`

### Variables & Functions

- Variables: `camelCase` (e.g., `userData`, `isLoading`)
- Functions: `camelCase` (e.g., `handleSubmit`, `fetchUsers`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `API_URL`, `MAX_FILE_SIZE`)
- Components: `PascalCase` (e.g., `UserTable`, `LoginForm`)

### CSS Classes

- Use Tailwind utility classes
- Use CSS variables for colors
- Font: Always use `font-mono` for terminal aesthetic

---

## 🚨 9. ERROR HANDLING

### Frontend Error Display

```typescript
{
  error && (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="text-[var(--error-red)] text-sm font-mono"
    >
      <span className="text-terminal-cyan">[ERROR]</span> {error}
    </motion.div>
  );
}
```

### Success Messages

```typescript
{
  success && (
    <div className="p-4 bg-[var(--accent-green)]/10 border border-[var(--accent-green)] rounded">
      <p className="text-[var(--accent-green)] font-mono">✓ {successMessage}</p>
    </div>
  );
}
```

---

## 📊 10. DATA VALIDATION

### Form Validation Pattern

```typescript
const validateForm = () => {
  if (!username.trim()) {
    setError(t.login.usernameRequired);
    return false;
  }
  if (!password.trim()) {
    setError(t.login.passwordRequired);
    return false;
  }
  return true;
};

const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();

  if (!validateForm()) return;

  // ... proceed with submission
};
```

---

## 🎯 11. ACCESSIBILITY

### Form Labels

Always use proper labels and placeholders with i18n:

```typescript
<label className="block text-sm font-semibold mb-2 text-[var(--text-primary)]">
  {t.auth.username}
</label>
<input
  type="text"
  placeholder={t.auth.username}
  aria-label={t.auth.username}
  className="..."
/>
```

### Button States

```typescript
<button
  disabled={isLoading}
  className="... disabled:opacity-50 disabled:cursor-not-allowed"
>
  {isLoading ? t.common.loading : t.common.save}
</button>
```

---

## 🔄 12. CODE REVIEW CHECKLIST

Before submitting any code, verify:

- [ ] ALL user-facing text uses i18n (`t.section.key`)
- [ ] Translations added to ko.ts, en.ts, AND zh.ts
- [ ] CSS variables used for colors (not hardcoded)
- [ ] `font-mono` class applied for terminal aesthetic
- [ ] Terminal effects applied where appropriate
- [ ] Authentication checked for protected routes
- [ ] Error handling implemented
- [ ] Loading states handled
- [ ] TypeScript types defined
- [ ] Comments added for complex logic
- [ ] No console.log in production code (use only for debugging)

---

## 🚀 13. PERFORMANCE BEST PRACTICES

### Dynamic Imports

```typescript
// For heavy components
const HeavyComponent = dynamic(() => import("@/components/HeavyComponent"), {
  loading: () => <div>{t.common.loading}</div>,
});
```

### Memoization

```typescript
const memoizedValue = useMemo(() => expensiveCalculation(data), [data]);

const memoizedCallback = useCallback(() => {
  doSomething(param);
}, [param]);
```

---

## 📱 14. RESPONSIVE DESIGN

### Grid Layouts

```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  {/* cards */}
</div>
```

### Text Visibility

```typescript
<span className="hidden sm:inline">{t.nav.dashboard}</span>
<span className="sm:hidden">📊</span>
```

---

## 🎨 15. COMPONENT PATTERNS

### Modal Pattern

```typescript
{
  isOpen && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center"
      onClick={() => setIsOpen(false)}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-6 max-w-2xl w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* modal content */}
      </motion.div>
    </motion.div>
  );
}
```

---

## 💡 REMEMBER

**When AI generates code for this project:**

1. **ALWAYS use i18n** for any text that users will see
2. **ALWAYS add translations to all 3 languages** (ko, en, zh)
3. **ALWAYS use CSS variables** for colors (--accent-cyan, --bg-secondary, etc.)
4. **ALWAYS use font-mono** class for terminal aesthetic
5. **ALWAYS include proper error handling**
6. **ALWAYS check authentication** for protected pages
7. **ALWAYS use TypeScript types**
8. **NEVER hardcode user-facing text** in any language

---

**This guide is MANDATORY. All code must follow these patterns.**
