# ThinkingEngine 데이터 생성기

Excel 스키마 파일을 기반으로 현실적인 서비스 이벤트 데이터를 생성하여 LogBus2로 ThinkingEngine에 전송하는 시스템입니다.

## 주요 기능

- Excel 스키마 기반 이벤트 데이터 생성
- AI 기반 현실적인 데이터 범위 자동 생성
- 유저 생명주기 시뮬레이션 (신규/활성/복귀/이탈)
- Faker.js 기반 국가별 현실적인 데이터 (이름, 주소, 전화번호 등)
- 이벤트 의존성 및 퍼널 관리
- LogBus2 연동 자동 전송

## 프로젝트 구조

```
demo_data_gen/
├── excel-schema-generator/   # 외부 Excel 생성 프로그램
│   ├── src/
│   └── output/               # 생성된 Excel 파일
├── data-generator/           # 데이터 생성 백엔드
│   └── src/                  # 생성 로직 (TypeScript)
├── frontend/                 # 웹 UI (Next.js)
│   ├── src/app/
│   ├── src/components/
│   └── src/hooks/
├── output/
│   ├── runs/                 # 실행 메타데이터
│   └── data/                 # 생성된 JSONL (LogBus2용)
└── logbus 2/                 # LogBus2 바이너리
```

## 문서

### 개발자 가이드
- **[개발 가이드](./DEVELOPMENT_GUIDE.md)** - 🔥 **코드 작성 시 필수 참조** - i18n, 스타일링, 패턴 등 모든 규칙
- [AI 코딩 규칙](./.clinerules) - AI가 참조하는 필수 규칙

### 아키텍처 & 명세
- [아키텍처 문서](./docs/ARCHITECTURE_KR.md)
- [기술 명세서](./docs/TECHNICAL_SPEC_KR.md)
- [업로드 가이드](./docs/UPLOAD_GUIDE.md)
- [i18n 구현 가이드](./docs/I18N_IMPLEMENTATION_GUIDE.md)

## 시작하기

자세한 내용은 문서를 참조하세요.

## 라이선스

TBD
