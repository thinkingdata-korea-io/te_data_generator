# 데이터 생성 백엔드

ThinkingEngine 이벤트 데이터를 생성하는 백엔드 로직입니다.

## 구조

- `src/excel/`: Excel 스키마 파일 파싱
- `src/ai/`: AI API 클라이언트 (OpenAI/Claude)
- `src/generators/`: 데이터 생성 로직
  - 유저 코호트 생성
  - 이벤트 생성
  - 의존성 관리
  - Faker.js 유틸리티
- `src/logbus/`: LogBus2 제어
- `src/formatters/`: ThinkingEngine 형식 변환
- `src/types/`: TypeScript 타입 정의
- `src/utils/`: 유틸리티 함수

## 개발 예정

TypeScript로 개발 예정
