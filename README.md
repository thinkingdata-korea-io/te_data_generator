# ThinkingEngine Data Generator (TE 데이터 생성기)

AI 기반으로 산업별 맞춤형 이벤트 분류체계(Event Taxonomy)를 자동 생성하고, 현실적인 서비스 이벤트 데이터를 생성하여 LogBus2를 통해 ThinkingEngine에 전송하는 엔터프라이즈급 시스템입니다.

## ✨ 주요 기능

### 🤖 AI 기반 이벤트 분류체계 생성
- **자동 이벤트 설계**: 산업/서비스 설명만으로 전체 이벤트 분류체계 자동 생성
- **5단계 AI 파이프라인**: Event List → Common Properties → Event Properties → Property Groups → Validation
- **다중 AI 제공자 지원**: Claude (Anthropic), GPT (OpenAI), Gemini (Google)
- **스트리밍 진행 상황**: 실시간 AI 생성 과정 모니터링
- **Excel 자동 생성**: TE 플랫폼 업로드 가능한 형식으로 자동 변환

### 📊 현실적인 데이터 생성
- **유저 생명주기 시뮬레이션**: 신규 → 활성 → 복귀 → 이탈 단계별 행동 패턴
- **이벤트 의존성 관리**: 퍼널 기반 순차적 이벤트 발생 (예: 회원가입 → 로그인 → 구매)
- **Faker.js 통합**: 국가별 현실적인 개인정보 (이름, 주소, 전화번호, 이메일 등)
- **마케팅 어트리뷰션**: UTM 파라미터 및 채널 추적
- **시간대별 패턴**: 시간대, 요일별 차등 이벤트 발생률

### 🚀 LogBus2 자동 전송
- **원클릭 전송**: 생성된 데이터를 TE로 즉시 전송
- **실시간 모니터링**: 전송 진행률 및 로그 실시간 확인
- **자동 압축**: gzip 압축으로 효율적인 전송
- **에러 핸들링**: 실패 시 자동 재시도 및 상세 로그

### 🌍 다국어 지원 (i18n)
- **3개 언어**: 한국어 (ko), 영어 (en), 중국어 (zh)
- **완전한 UI 번역**: 모든 텍스트, 버튼, 메시지, 에러 등
- **실시간 언어 전환**: 페이지 새로고침 없이 즉시 전환

### 👥 사용자 관리 시스템
- **역할 기반 권한**: Admin, User, Viewer 3단계 권한
- **JWT 인증**: 안전한 토큰 기반 인증
- **감사 로그**: 모든 사용자 활동 기록 및 추적
- **PostgreSQL 연동**: 엔터프라이즈급 데이터베이스 지원

## 🏗️ 프로젝트 구조

```
demo_data_gen/
├── data-generator/              # 백엔드 API 서버 (Node.js/TypeScript)
│   ├── src/
│   │   ├── ai/                  # AI 클라이언트 (Claude, GPT, Gemini)
│   │   ├── api/                 # REST API 엔드포인트
│   │   │   ├── server.ts        # Express 서버 (3001 포트)
│   │   │   ├── auth.ts          # JWT 인증 미들웨어
│   │   │   └── routes/          # API 라우트
│   │   ├── db/                  # PostgreSQL 연동
│   │   │   ├── connection.ts    # DB 커넥션 풀
│   │   │   ├── schema.sql       # 테이블 스키마
│   │   │   └── repositories/    # 데이터 접근 계층
│   │   ├── generators/          # 데이터 생성 로직
│   │   ├── formatters/          # TE 포맷 변환
│   │   └── types/               # TypeScript 타입 정의
│   ├── Dockerfile               # 백엔드 Docker 이미지
│   └── package.json
│
├── frontend/                    # 프론트엔드 (Next.js 14 + TypeScript)
│   ├── src/
│   │   ├── app/                 # App Router
│   │   │   ├── dashboard/       # 대시보드 페이지
│   │   │   │   ├── page.tsx     # 메인 대시보드
│   │   │   │   ├── generator/   # 데이터 생성
│   │   │   │   ├── users/       # 사용자 관리
│   │   │   │   ├── audit/       # 감사 로그
│   │   │   │   └── settings/    # 설정
│   │   │   └── login/           # 로그인
│   │   ├── components/          # React 컴포넌트
│   │   ├── contexts/            # Context API (AuthContext)
│   │   └── i18n/                # 다국어 지원
│   │       └── locales/         # 번역 파일 (ko, en, zh)
│   ├── Dockerfile               # 프론트엔드 Docker 이미지
│   └── package.json
│
├── excel-schema-generator/      # Excel 생성 라이브러리
│   ├── src/
│   │   ├── schema-generator.ts  # Excel 생성 로직
│   │   ├── taxonomy-builder-v2.ts # AI 기반 분류체계 생성
│   │   └── prompts/             # AI 프롬프트 템플릿
│   └── package.json
│
├── logbus 2/                    # LogBus2 바이너리
│   ├── logbus                   # 실행 파일
│   ├── conf/                    # 설정 파일
│   ├── log/                     # 로그 (자동 생성)
│   └── runtime/                 # 실행 상태 (⚠️ 삭제 금지)
│
├── k8s/                         # Kubernetes 배포 설정
│   ├── deployment.yaml          # Pod 배포 설정
│   ├── service.yaml             # 서비스 노출
│   ├── ingress.yaml             # 도메인 라우팅
│   ├── configmap.yaml           # 환경 설정
│   └── secret.yaml              # 시크릿 (API 키 등)
│
├── scripts/                     # 유틸리티 스크립트
│   ├── cleanup-logbus.sh        # LogBus2 정리
│   └── deploy/                  # 배포 스크립트
│
├── docs/                        # 문서
│   ├── common/                  # 공통 문서
│   │   ├── ARCHITECTURE.md      # 아키텍처 설계
│   │   ├── LOGBUS2.md           # LogBus2 가이드
│   │   └── UPLOAD_GUIDE.md      # 업로드 가이드
│   └── platforms/               # 플랫폼별 문서
│
├── output/                      # 생성된 데이터
│   ├── excel/                   # Excel 파일
│   └── data/                    # JSONL 데이터
│
├── .gitlab-ci.yml               # GitLab CI/CD 파이프라인
├── docker-compose.yml           # 로컬 개발 환경 (PostgreSQL)
└── README.md
```

## 🚀 빠른 시작

### 로컬 개발 환경

1. **데이터베이스 실행**
   ```bash
   docker-compose up -d
   ```

2. **백엔드 실행**
   ```bash
   cd data-generator
   npm install
   npm run api       # http://localhost:3001
   ```

3. **프론트엔드 실행**
   ```bash
   cd frontend
   npm install
   npm run dev       # http://localhost:3000
   ```

4. **기본 로그인 정보**
   - Admin: `admin` / `admin`
   - User: `user` / `user`
   - Viewer: `viewer` / `viewer`

### 서버 배포

- **프론트엔드**: http://te-data-generator.tx-local.thinkingdata.cn
- **GitLab CI/CD**: 자동 빌드 및 배포 (`.gitlab-ci.yml`)

## 📚 문서

### 개발자 가이드
- **[개발 가이드](./DEVELOPMENT_GUIDE.md)** - 🔥 **필수** - 코딩 규칙, i18n, 스타일링
- [AI 코딩 규칙](./.clinerules) - AI 보조 개발 규칙

### 아키텍처 & 명세
- [아키텍처 문서](./docs/common/ARCHITECTURE.md) - 시스템 설계 및 구조
- [LogBus2 가이드](./docs/common/LOGBUS2.md) - 데이터 전송 설정
- [업로드 가이드](./docs/common/UPLOAD_GUIDE.md) - TE 업로드 방법
- [마케팅 어트리뷰션](./docs/common/MARKETING_ATTRIBUTION.md) - UTM 추적

### ThinkingData 플랫폼
- [TE 개요](./docs/platforms/ThinkingData/OVERVIEW.md)
- [데이터 규칙](./docs/platforms/ThinkingData/DATA_RULES.md)
- [프리셋 속성](./docs/platforms/ThinkingData/PRESET_PROPERTIES.md)

## 🛠️ 기술 스택

### Backend
- **Runtime**: Node.js 20
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL 15
- **Auth**: JWT
- **AI**: Anthropic SDK, OpenAI SDK

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animation**: Framer Motion
- **i18n**: next-intl

### DevOps
- **Container**: Docker
- **Orchestration**: Kubernetes
- **CI/CD**: GitLab CI
- **Registry**: Harbor (docker-ta-inner.thinkingdata.cn)

## 📝 라이선스

MIT License - ThinkingData Korea

## 🤝 기여

자세한 개발 가이드는 [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)를 참조하세요.
