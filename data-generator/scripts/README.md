# 개발 환경 자동화 스크립트

이 폴더에는 개발 환경을 자동으로 설정하고 관리하는 스크립트가 포함되어 있습니다.

## 🚀 빠른 시작

### 1. 처음 시작할 때 (또는 문제가 발생했을 때)

```bash
cd data-generator
npm run dev:setup
```

이 명령은 다음을 자동으로 수행합니다:
- ✅ PostgreSQL 실행 상태 확인 및 시작
- ✅ 데이터베이스 (`te_platform`) 생성
- ✅ 데이터베이스 사용자 (`te_admin`) 생성
- ✅ 테이블 생성 (스키마 적용)
- ✅ 기본 사용자 계정 생성 (seed 데이터)

### 2. 백엔드 API 서버 시작

```bash
npm run dev:api
```

이 명령은 다음을 자동으로 수행합니다:
- ✅ PostgreSQL 연결 확인 (최대 10번 재시도)
- ✅ PostgreSQL이 중지되어 있으면 자동 시작
- ✅ 연결 확인 후 API 서버 시작

### 3. 전체 개발 환경 시작 (권장)

```bash
# 백엔드
cd data-generator
npm run dev:setup  # 처음 한 번만
npm run dev:api

# 프론트엔드 (새 터미널)
cd frontend
npm run dev
```

## 📝 스크립트 설명

### `dev-setup.sh`
개발 환경을 초기화하고 검증하는 스크립트입니다.

**기능:**
- PostgreSQL 설치 확인
- PostgreSQL 실행 상태 확인 및 자동 시작
- 데이터베이스 및 사용자 role 생성
- 스키마 마이그레이션 (테이블 생성)
- Seed 데이터 삽입

**사용 시점:**
- 처음 프로젝트를 clone 했을 때
- PostgreSQL이 초기화되었을 때
- "role does not exist" 또는 "database does not exist" 에러가 발생했을 때

### `start-api.sh`
PostgreSQL 연결을 확인하고 API 서버를 시작하는 스크립트입니다.

**기능:**
- PostgreSQL 연결 상태 확인 (최대 10번 재시도)
- PostgreSQL이 중지되어 있으면 자동 시작
- 데이터베이스 연결 테스트
- Express API 서버 시작

**사용 시점:**
- 매일 개발을 시작할 때
- API 서버를 재시작할 때

## ⚙️ 설정

### PostgreSQL 설정

데이터베이스 연결 정보는 `.env` 파일에 저장되어 있습니다:

```env
DATABASE_URL=postgresql://te_admin:te_password_2025@localhost:5432/te_platform
```

### 기본 사용자 계정

시드 스크립트를 통해 다음 계정이 생성됩니다:

| Username | Password | Role |
|----------|----------|------|
| admin    | admin123 | admin |
| user     | user123  | user |
| viewer   | viewer123| viewer |

## 🔧 문제 해결

### PostgreSQL이 시작되지 않을 때

```bash
# PostgreSQL 상태 확인
brew services list | grep postgresql

# PostgreSQL 재시작
brew services restart postgresql@14

# PostgreSQL 로그 확인
tail -f /usr/local/var/log/postgresql@14.log
```

### "role does not exist" 에러

```bash
# 개발 환경 재설정
npm run dev:setup
```

### "Authentication required" 에러 (프론트엔드)

브라우저에서:
1. F12 (개발자 도구)
2. Application 탭
3. Local Storage → localhost:3000
4. `auth_token` 삭제
5. 새로고침 후 재로그인

또는 `src/lib/api-client.ts`가 자동으로 로그인 페이지로 리다이렉트합니다.

## 🎯 권장 워크플로우

### 매일 개발 시작할 때

```bash
# 1. 백엔드 시작
cd data-generator
npm run dev:api

# 2. 프론트엔드 시작 (새 터미널)
cd frontend
npm run dev
```

### 문제가 발생했을 때

```bash
# 1. 서버 중지 (Ctrl+C)

# 2. 환경 재설정
cd data-generator
npm run dev:setup

# 3. 다시 시작
npm run dev:api
```

## 📚 추가 정보

- PostgreSQL 공식 문서: https://www.postgresql.org/docs/
- Express.js 공식 문서: https://expressjs.com/
- Next.js 공식 문서: https://nextjs.org/docs
