# 📚 Documentation Hub

AI 기반 이벤트 트래킹 데이터 생성 시스템 - 완전 가이드

---

## 🗂️ 문서 구조

### 🏗️ 시스템 이해하기

#### 1. **[아키텍처 가이드](./common/ARCHITECTURE.md)** ⭐ 필독
전체 시스템 아키텍처 및 구조
- 엔터프라이즈 인증 시스템 (JWT, RBAC)
- Multi-User 지원 및 PostgreSQL DB
- AI 기반 데이터 생성 워크플로우
- 백엔드 API 전체 목록
- 프론트엔드 대시보드 구조

#### 1-1. **[Node.js 기술 스터디](./NODE_STUDY.md)** 🎓 학습/발표용
Node.js 프로젝트 기술 상세 분석
- Node.js 기술 스택 완전 정리 (Express, PostgreSQL, JWT, Multer 등)
- CRUD 구현 전체 매핑 (9개 라우터, 61개 파일)
- 데이터베이스 ERD 및 테이블 구조
- 주요 기능 코드 예시 (파일 업로드, AI 분석, 비동기 처리)
- 성능 최적화 기법 (Connection Pool, 인덱스, Stream)

#### 2. **[인프라 가이드](./INFRASTRUCTURE.md)** ⭐ 신규
Kubernetes & 스토리지 완벽 가이드
- Kubernetes 배포 구조 (Deployment, Service, Ingress)
- **PVC (Persistent Volume Claim) 완전 정복**
  - PVC vs S3 비교
  - 데이터 흐름 (Pod → PVC → PV → 물리 디스크)
  - 스토리지 백엔드 종류 (NFS, Ceph, Local)
- 운영 가이드 (용량 확인, 백업, 트러블슈팅)
- GitLab CI/CD 파이프라인

#### 3. **[배포 가이드](./DEPLOYMENT.md)** ⚡ 필수
실전 배포 완벽 가이드
- **VPN 연결 필수** (GitLab 푸시 전)
- Git 푸시 전체 프로세스 (GitHub + GitLab)
- Jenkins 자동 배포 흐름
- 서버 주소 및 접속 정보
- 트러블슈팅 (VPN, Docker, K8s)
- 보안 정보 관리

#### 3-1. **[기존 배포 가이드](./deployment-guide.md)**
Git & Docker 워크플로우 개념
- 플랫폼별 역할 (GitHub vs Docker Registry)
- 일상적인 개발 워크플로우
- 릴리스 배포 전략

#### 4. **[현실적인 데이터 생성 로직](./realistic-data-generation.md)**
데이터 생성 핵심 원리
- AI 기반 사용자 세그먼트 생성
- 이벤트 의존성 및 제약 조건
- 통계 분포 함수 (정규, 지수, 파레토)
- 산업별 특화 로직

---

### 🎯 실무 가이드

#### 5. **[이벤트 택소노미 가이드](./common/EVENT_TAXONOMY_GUIDE.md)**
이벤트 설계 및 Excel 작성법
- 4-Sheet 구조 (#유저 ID 체계, #이벤트 데이터, #공통 속성, #유저 데이터)
- 이벤트 명명 규칙 (PascalCase)
- 필수/선택 속성 정의

#### 6. **[파일 업로드 가이드](./common/UPLOAD_GUIDE.md)**
컨텍스트 파일 분석
- PDF/TXT/Markdown 업로드 및 AI 분석
- 지원 파일 형식 및 크기 제한
- 분석 결과 활용 방법

#### 7. **[마케팅 어트리뷰션](./common/MARKETING_ATTRIBUTION.md)**
광고 성과 분석 데이터 생성
- 설치 → 캠페인 → 수익 체인
- UTM 파라미터 구조
- 광고 플랫폼별 매핑

#### 8. **[AI API 가이드](./common/AI_APIS.md)**
Anthropic Claude API 설정
- API 키 발급 및 설정
- 모델 선택 가이드 (Sonnet, Opus, Haiku)
- 비용 최적화 팁
- 트러블슈팅

---

### 📊 플랫폼별 문서

#### [ThinkingData (ThinkingEngine)](./platforms/ThinkingData/)

- **[OVERVIEW.md](./platforms/ThinkingData/OVERVIEW.md)** - ThinkingEngine 개요
- **[DATA_RULES.md](./platforms/ThinkingData/DATA_RULES.md)** - TE 데이터 규칙 요약
- **[PRESET_PROPERTIES.md](./platforms/ThinkingData/PRESET_PROPERTIES.md)** - TE 프리셋 속성 가이드
- **[LOGBUS2.md](./platforms/ThinkingData/LOGBUS2.md)** - LogBus2 전송 가이드

#### [Amplitude](./platforms/Amplitude/)
*(준비 중)*

#### [Mixpanel](./platforms/Mixpanel/)
*(준비 중)*

---

### 🔒 보안 & 운영

#### 9. **[보안 가이드](./SECURITY.md)**
보안 정책 및 베스트 프랙티스
- API Key 관리
- Secret 처리
- 데이터 보호

---

## 🚀 빠른 시작 가이드

### 시나리오 1: 처음 사용하는 개발자

```
1. [아키텍처 가이드] 읽기 (전체 흐름 이해)
   ↓
2. [인프라 가이드] 읽기 (K8s & PVC 이해)
   ↓
3. [이벤트 택소노미 가이드] 읽기 (Excel 작성법)
   ↓
4. [배포 가이드] 읽기 (Git 워크플로우)
```

### 시나리오 2: 데이터 생성하고 싶은 사용자

```
1. [이벤트 택소노미 가이드] - Excel 작성
   ↓
2. [AI API 가이드] - API Key 설정
   ↓
3. 대시보드에서 데이터 생성
   ↓
4. [ThinkingData/LOGBUS2.md] - TE 전송
```

### 시나리오 3: 코드 수정 후 배포하는 개발자

```
1. [배포 가이드 (DEPLOYMENT.md)] ⚡ 필수 읽기
   ↓
2. VPN 연결 확인
   ↓
3. Git 커밋 & 푸시 (GitHub + GitLab)
   ↓
4. Jenkins 자동 배포 확인
   ↓
5. http://te-data-generator.tx-local.thinkingdata.cn 접속 확인
```

### 시나리오 4: 인프라 운영자

```
1. [인프라 가이드] - K8s 배포 구조
   ↓
2. [배포 가이드 (DEPLOYMENT.md)] - 배포 프로세스
   ↓
3. [보안 가이드] - Secret 관리
```

---

## 📂 문서 파일 구조

```
docs/
├── README.md                        # 이 파일 (문서 허브)
├── NODE_STUDY.md                    # 🎓 Node.js 기술 스터디 (발표용)
├── INFRASTRUCTURE.md                # 🆕 K8s & PVC 가이드
├── DEPLOYMENT.md                    # ⚡ 실전 배포 가이드 (VPN, Jenkins)
├── deployment-guide.md              # Git & Docker 워크플로우 개념
├── realistic-data-generation.md     # 데이터 생성 로직
├── SECURITY.md                      # 보안 가이드
├── common/                          # 공통 가이드
│   ├── ARCHITECTURE.md              # 전체 아키텍처 ⭐
│   ├── EVENT_TAXONOMY_GUIDE.md      # Excel 작성법
│   ├── UPLOAD_GUIDE.md              # 파일 업로드
│   ├── MARKETING_ATTRIBUTION.md     # 마케팅 데이터
│   └── AI_APIS.md                   # AI Provider 설정
└── platforms/                       # 플랫폼별 문서
    └── ThinkingData/
        ├── OVERVIEW.md              # TE 개요
        ├── DATA_RULES.md            # TE 규칙
        ├── PRESET_PROPERTIES.md     # TE 프리셋
        └── LOGBUS2.md               # 🆕 이동됨
```

---

## 🔄 최근 업데이트

### 2024-12-04 (최신)
- ✅ **신규**: `DEPLOYMENT.md` - 실전 배포 완벽 가이드 (VPN, GitLab, Jenkins)
- ✅ **신규**: `INFRASTRUCTURE.md` - K8s & PVC 완벽 가이드 추가
- ✅ **신규**: `NODE_STUDY.md` - Node.js 기술 스터디 문서 (발표용)
- ✅ **정리**: 불필요한 문서 삭제 (`ACCESSIBILITY.md`, `study/`, `migration/`)
- ✅ **재구성**: `LOGBUS2.md` → `platforms/ThinkingData/`로 이동
- ✅ **전면 재작성**: `AI_APIS.md` - Anthropic Claude 전용 가이드로 업데이트
- ✅ **개선**: `README.md` 구조 재편성 (배포 시나리오 추가)

---

## 📞 문의 및 기여

문서 개선 제안이나 오류 발견 시 이슈를 등록해주세요.

**문서 작성 규칙**:
- Markdown 표준 준수
- 코드 블록에 언어 명시
- 시각 자료 적극 활용 (다이어그램, 테이블)
- 실무 예시 포함
