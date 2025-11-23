# 🔄 데이터 마이그레이션 가이드

다양한 분석 플랫폼에서 ThinkingData로 데이터를 변환하고 마이그레이션하는 가이드

## 📋 개요

이 마이그레이션 도구는 다음을 지원합니다:

1. **플랫폼 간 데이터 변환**: Amplitude, Mixpanel 등의 데이터를 ThinkingData 형식으로 변환
2. **Excel 스키마 변환**: 생성된 Excel 텍소노미를 여러 플랫폼 형식으로 변환
3. **속성 매핑**: 플랫폼별 속성 이름 및 구조 자동 매핑

## 🎯 지원 변환 경로

### 현재 지원
- ✅ **Excel → ThinkingData**: 자동 데이터 생성 (구현 완료)

### 개발 예정
- 🚧 **Amplitude → ThinkingData**: 히스토리 데이터 마이그레이션
- 🚧 **Mixpanel → ThinkingData**: 히스토리 데이터 마이그레이션
- 🚧 **Excel → Amplitude**: 스키마 기반 데이터 생성
- 🚧 **Excel → Mixpanel**: 스키마 기반 데이터 생성

## 📊 플랫폼 데이터 형식 비교

### 이벤트 구조 비교

| 항목 | ThinkingData | Amplitude | Mixpanel |
|------|-------------|-----------|----------|
| **유저 ID** | `#account_id`, `#distinct_id` | `user_id`, `device_id` | `distinct_id` |
| **이벤트명** | `#event_name` | `event_type` | `event` |
| **시간** | `#time` (문자열) | `time` (ms timestamp) | `time` (s timestamp) |
| **타입** | `#type` (track/user_set/user_add) | 이벤트/유저 프로퍼티 분리 | 이벤트/유저 프로퍼티 분리 |
| **프리셋 속성** | `#` 접두사 (root/properties) | `$` 접두사 | `$` 접두사 |
| **커스텀 속성** | `properties` 객체 내 | `event_properties` | `properties` 내 |

### 속성 이름 매핑

| 개념 | ThinkingData | Amplitude | Mixpanel |
|------|-------------|-----------|----------|
| IP 주소 | `#ip` | `ip` | `$ip` |
| 국가 | `#country` | `country` | `$country` |
| 디바이스 모델 | `#device_model` | `device_model` | `$device` |
| OS | `#os` | `os_name` | `$os` |
| 디바이스 ID | `#device_id` | `device_id` | `$device_id` |

## 🛠️ 사용 예정 도구

### 1. 데이터 변환기 (Converter)
```bash
# Amplitude 데이터를 ThinkingData 형식으로 변환
npm run convert -- --from amplitude --to thinkingdata --input ./amplitude_data.json
```

### 2. 스키마 변환기 (Schema Transformer)
```bash
# Excel 스키마를 Amplitude 형식으로 변환
npm run transform-schema -- --platform amplitude --input ./schema.xlsx
```

### 3. 배치 마이그레이션
```bash
# 대량 데이터 마이그레이션
npm run migrate -- --from amplitude --to thinkingdata --date-range 2024-01-01:2024-12-31
```

## 📝 마이그레이션 단계

### Amplitude → ThinkingData

1. **데이터 추출**: Amplitude Export API 사용
2. **스키마 매핑**: 이벤트/속성 이름 매핑 테이블 생성
3. **데이터 변환**: TE 형식으로 변환
4. **검증**: 변환된 데이터 무결성 확인
5. **전송**: LogBus2를 통해 TE로 전송

상세 가이드: [AMPLITUDE_TO_TE.md](./AMPLITUDE_TO_TE.md) *(준비 중)*

### Mixpanel → ThinkingData

1. **데이터 추출**: Mixpanel Raw Data Export 사용
2. **스키마 매핑**: 이벤트/속성 이름 매핑 테이블 생성
3. **데이터 변환**: TE 형식으로 변환
4. **검증**: 변환된 데이터 무결성 확인
5. **전송**: LogBus2를 통해 TE로 전송

상세 가이드: [MIXPANEL_TO_TE.md](./MIXPANEL_TO_TE.md) *(준비 중)*

## 🔗 관련 문서

- [ThinkingData 데이터 형식](../platforms/ThinkingData/DATA_RULES.md)
- [Amplitude 플랫폼 가이드](../platforms/Amplitude/README.md)
- [Mixpanel 플랫폼 가이드](../platforms/Mixpanel/README.md)
- [LogBus2 전송 가이드](../common/LOGBUS2.md)

## 🚀 로드맵

- [ ] Amplitude → TE 변환기 구현
- [ ] Mixpanel → TE 변환기 구현
- [ ] 속성 매핑 테이블 자동 생성
- [ ] 배치 처리 및 성능 최적화
- [ ] 데이터 검증 및 품질 체크
- [ ] UI 기반 마이그레이션 도구

---

*이 가이드는 마이그레이션 기능 개발과 함께 지속적으로 업데이트됩니다.*
