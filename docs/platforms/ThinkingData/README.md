# ThinkingData Platform

ThinkingEngine 플랫폼용 데이터 생성 및 전송 가이드

## 📚 문서 목록

### [OVERVIEW.md](./OVERVIEW.md)
ThinkingEngine 플랫폼 개요 및 기본 개념

### [DATA_RULES.md](./DATA_RULES.md)
ThinkingEngine 데이터 형식 및 규칙 요약
- TE 이벤트 형식 (`#` 필드 구조)
- track, user_set, user_add 이벤트 타입
- 필수 필드 및 제약사항

### [PRESET_PROPERTIES.md](./PRESET_PROPERTIES.md)
ThinkingEngine 프리셋 속성 상세 가이드
- 기본 공통 속성 (`#ip`, `#country`, `#device_id` 등)
- 플랫폼별 속성 (모바일, 웹)
- 이벤트별 전용 속성
- 시스템 필드

### [LOGBUS2.md](../../common/LOGBUS2.md)
LogBus2를 통한 ThinkingEngine 데이터 전송 (공통 전송 도구)
- LogBus2 설치 및 설정
- JSONL 형식 데이터 전송
- Gzip 압축 전송
- 전송 모니터링

## 🚀 빠른 시작

1. **개요 이해**: [OVERVIEW.md](./OVERVIEW.md)에서 ThinkingEngine의 기본 개념 파악
2. **데이터 형식**: [DATA_RULES.md](./DATA_RULES.md)에서 TE 데이터 형식 이해
3. **속성 정의**: [PRESET_PROPERTIES.md](./PRESET_PROPERTIES.md)에서 사용 가능한 속성 확인
4. **데이터 전송**: [LOGBUS2.md](../../common/LOGBUS2.md)에서 LogBus2 설정 및 전송

## 🔗 관련 문서

- [공통 아키텍처](../../common/ARCHITECTURE.md) - 전체 시스템 구조
- [이벤트 택소노미 가이드](../../common/EVENT_TAXONOMY_GUIDE.md) - 이벤트 설계 방법
- [마이그레이션 가이드](../../migration/README.md) - 다른 플랫폼에서 TE로 전환

## 📊 TE 데이터 형식 개요

```json
{
  "#account_id": "user_12345",
  "#distinct_id": "device_abc",
  "#time": "2025-01-15 10:30:00.123",
  "#type": "track",
  "#event_name": "purchase_complete",
  "#ip": "192.168.1.1",
  "properties": {
    "#country": "South Korea",
    "#device_model": "iPhone 13",
    "product_id": "prod_789",
    "amount": 29900
  }
}
```

자세한 내용은 [DATA_RULES.md](./DATA_RULES.md)를 참고하세요.
