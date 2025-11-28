# Docker Build & Run Guide

이 문서는 ThinkingEngine Data Generator 프로젝트의 Docker 빌드 및 실행 방법을 설명합니다.

## 📋 목차

1. [Quick Start](#quick-start)
2. [개별 서비스 빌드](#개별-서비스-빌드)
3. [문제 해결](#문제-해결)

---

## Quick Start

가장 간단한 방법은 `docker-compose`를 사용하는 것입니다:

```bash
# 프로젝트 루트 디렉토리로 이동
cd /Users/jegaljin-u/workspace/demo_data_gen

# 전체 스택 빌드 및 실행
docker-compose up --build

# 백그라운드 실행
docker-compose up -d --build

# 종료
docker-compose down
```

### 서비스 포트

- **Frontend**: http://localhost:3000
- **API Server**: http://localhost:3001
- **PostgreSQL**: localhost:5432

---

## 개별 서비스 빌드

### 1. Data Generator API

**⚠️ 중요**: `data-generator` Dockerfile은 **반드시 루트 디렉토리에서** 빌드해야 합니다.

#### 이유
- `data-generator`는 `excel-schema-generator` 패키지에 의존합니다
- 두 프로젝트를 모두 복사해야 하므로 상위 디렉토리가 build context여야 합니다

#### 빌드 명령어

```bash
# 프로젝트 루트로 이동
cd /Users/jegaljin-u/workspace/demo_data_gen

# Docker 이미지 빌드
docker build -f data-generator/Dockerfile -t data-generator .

# 컨테이너 실행
docker run -d \
  -p 3001:3001 \
  -e DATABASE_URL=postgresql://te_admin:te_password_2025@host.docker.internal:5432/te_platform \
  -e JWT_SECRET=te_platform_secret_key_change_in_production_2025 \
  --name data-generator \
  data-generator
```

### 2. Frontend

**빌드 명령어**:

```bash
# 방법 1: frontend 디렉토리에서 빌드 (권장)
cd frontend
docker build -t frontend .

# 방법 2: 루트에서 빌드
cd /Users/jegaljin-u/workspace/demo_data_gen
docker build -f frontend/Dockerfile -t frontend ./frontend

# 컨테이너 실행
docker run -d \
  -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=http://localhost:3001 \
  --name frontend \
  frontend
```

### 3. PostgreSQL

```bash
docker-compose up -d postgres
```

---

## 문제 해결

### 오류: "failed to calculate checksum of ref ... not found"

**원인**: 잘못된 build context에서 Dockerfile을 실행

**해결책**:
```bash
# ❌ 잘못된 방법
cd data-generator
docker build -t data-generator .

# ✅ 올바른 방법
cd ..  # 루트로 이동
docker build -f data-generator/Dockerfile -t data-generator .
```

### 오류: TypeScript 컴파일 에러

**원인**: Settings 인터페이스 타입 불일치

**해결책**: 최신 코드로 업데이트되었습니다
- `/frontend/src/app/dashboard/generator/types/index.ts` - 통합된 Settings 인터페이스 사용
- `/frontend/src/app/dashboard/settings/page.tsx` - 중복 인터페이스 제거
- `/frontend/src/components/settings/AIConfigSection.tsx` - 통합 타입 import

### Frontend 빌드 시 API 연결 오류

**원인**: 환경 변수 설정 누락

**해결책**:
```bash
# .env.local 파일 생성 (frontend/.env.local)
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## 개발 환경 vs 프로덕션 환경

### 개발 환경 (로컬)

```bash
# 개발 서버 실행 (Hot Reload)
cd data-generator
npm run api

cd frontend
npm run dev
```

### 프로덕션 환경 (Docker)

```bash
# Docker Compose로 전체 스택 실행
docker-compose up -d
```

---

## 유용한 명령어

```bash
# 로그 확인
docker-compose logs -f data-generator
docker-compose logs -f frontend

# 특정 서비스만 재시작
docker-compose restart data-generator

# 빌드 캐시 없이 재빌드
docker-compose build --no-cache

# 모든 컨테이너 및 볼륨 삭제
docker-compose down -v
```

---

## 환경 변수

### Data Generator

| 변수명 | 설명 | 기본값 |
|--------|------|--------|
| `DATABASE_URL` | PostgreSQL 연결 문자열 | - |
| `JWT_SECRET` | JWT 서명 키 | - |
| `API_PORT` | API 서버 포트 | 3001 |
| `ANTHROPIC_API_KEY` | Anthropic API 키 | - |
| `OPENAI_API_KEY` | OpenAI API 키 | - |

### Frontend

| 변수명 | 설명 | 기본값 |
|--------|------|--------|
| `NEXT_PUBLIC_API_URL` | API 서버 URL | http://localhost:3001 |

---

## 문의

문제가 지속되면 다음을 확인하세요:
1. Docker 버전: `docker --version` (20.10 이상 권장)
2. Docker Compose 버전: `docker-compose --version` (1.29 이상 권장)
3. 디스크 공간 확인: Docker 이미지 빌드 시 충분한 공간 필요
