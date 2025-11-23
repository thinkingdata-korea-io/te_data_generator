# 📚 Documentation Hub

AI 기반 이벤트 트래킹 데이터 생성 및 변환 시스템 문서

## 🗂️ 문서 구조

### 📖 [공통 문서](./common/)
플랫폼에 무관한 공통 가이드 및 시스템 아키텍처

- **[ARCHITECTURE.md](./common/ARCHITECTURE.md)** - 전체 시스템 아키텍처 및 구조
- **[AI_APIS.md](./common/AI_APIS.md)** - AI Provider 가이드 (Anthropic, OpenAI, Gemini)
- **[EVENT_TAXONOMY_GUIDE.md](./common/EVENT_TAXONOMY_GUIDE.md)** - 이벤트 택소노미 설계 가이드
- **[UPLOAD_GUIDE.md](./common/UPLOAD_GUIDE.md)** - 파일 업로드 및 분석 가이드
- **[MARKETING_ATTRIBUTION.md](./common/MARKETING_ATTRIBUTION.md)** - 마케팅 어트리뷰션 스펙

### 🎯 [플랫폼별 문서](./platforms/)
각 분석 플랫폼별 데이터 형식 및 전송 가이드

#### [ThinkingData](./platforms/ThinkingData/)
- **[OVERVIEW.md](./platforms/ThinkingData/OVERVIEW.md)** - ThinkingEngine 개요
- **[DATA_RULES.md](./platforms/ThinkingData/DATA_RULES.md)** - TE 데이터 규칙 요약
- **[PRESET_PROPERTIES.md](./platforms/ThinkingData/PRESET_PROPERTIES.md)** - TE 프리셋 속성 가이드
- **[LOGBUS2.md](./platforms/ThinkingData/LOGBUS2.md)** - LogBus2 전송 가이드

#### [Amplitude](./platforms/Amplitude/)
*(준비 중)*

#### [Mixpanel](./platforms/Mixpanel/)
*(준비 중)*

#### [Google Analytics](./platforms/GoogleAnalytics/)
*(준비 중)*

### 🔄 [마이그레이션 가이드](./migration/)
플랫폼 간 데이터 변환 및 마이그레이션

- **[README.md](./migration/README.md)** - 마이그레이션 개요
- **Amplitude → ThinkingData** *(준비 중)*
- **Mixpanel → ThinkingData** *(준비 중)*

---

## 🚀 빠른 시작

### 새로운 데이터 생성
1. [공통 문서/아키텍처](./common/ARCHITECTURE.md)로 전체 시스템 이해
2. [이벤트 택소노미 가이드](./common/EVENT_TAXONOMY_GUIDE.md)로 이벤트 설계
3. 원하는 플랫폼 문서 참고하여 데이터 생성

### 기존 데이터 마이그레이션
1. [마이그레이션 가이드](./migration/README.md) 확인
2. 소스 플랫폼과 타겟 플랫폼 문서 검토
3. 변환 도구 사용

---

## 📞 문의 및 기여

문서 개선 제안이나 오류 발견 시 이슈를 등록해주세요.
