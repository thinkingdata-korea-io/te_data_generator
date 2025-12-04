# AI API 설정 가이드 - Anthropic Claude

## 개요

본 시스템은 **Anthropic Claude API**를 사용하여 AI 기반 데이터 분석 및 생성을 수행합니다.

**주요 용도**:
- 📄 **파일 분석**: PDF/TXT/Markdown 컨텍스트 이해
- 🤖 **AI 데이터 전략 분석**: 사용자 세그먼트, 이벤트 시퀀스, 트랜잭션 생성
- ✅ **검증**: 생성된 데이터 구조 검증

---

## 빠른 시작

### 1. API 키 발급

1. [Anthropic Console](https://console.anthropic.com/) 접속
2. 로그인 후 "API Keys" 메뉴 클릭
3. "Create Key" 버튼 클릭
4. API 키 복사 (예: `sk-ant-api03-...`)

### 2. 시스템 설정

#### 방법 1: 대시보드에서 설정 (권장)

```
1. 로그인
   ↓
2. 설정 페이지 (/dashboard/settings)
   ↓
3. "Anthropic API Key" 필드에 붙여넣기
   ↓
4. "저장" 버튼 클릭
```

#### 방법 2: 환경 변수 설정

```bash
# .env 파일
ANTHROPIC_API_KEY=sk-ant-api03-...
```

**주의**: 환경 변수보다 **대시보드 설정이 우선**됩니다.

---

## 지원 모델

### 데이터 생성용 모델

| 모델 | 설명 | 추천 용도 | 비용 |
|------|------|----------|------|
| **claude-sonnet-4-5** | 최신 Sonnet 모델 | 일반 데이터 생성 (권장) | 중간 |
| **claude-3-5-sonnet-20241022** | Sonnet 3.5 (2024.10 버전) | 안정적인 데이터 생성 | 중간 |
| **claude-3-5-sonnet-20240620** | Sonnet 3.5 (2024.06 버전) | 이전 버전 호환 | 중간 |
| **claude-3-opus-20240229** | Opus 3.0 | 복잡한 분석 필요 시 | 높음 |

### 파일 분석용 모델

| 모델 | 설명 | 추천 용도 | 비용 |
|------|------|----------|------|
| **claude-sonnet-4-5** | 최신 Sonnet 모델 | PDF/문서 분석 (권장) | 중간 |
| **claude-3-5-sonnet-20241022** | Sonnet 3.5 | 빠른 파일 분석 | 중간 |
| **claude-3-haiku-20240307** | Haiku 3.0 | 간단한 텍스트 분석 | 낮음 |

### 검증용 모델

#### Fast Tier (기본)
- **claude-3-5-haiku-20241022**: 빠르고 저렴한 검증

#### Balanced Tier
- **claude-3-5-sonnet-20241022**: 정확한 검증

**설정 방법**:
- 대시보드 → 설정 → "검증 모델 등급" 선택
- 환경 변수: `VALIDATION_MODEL_TIER=fast` 또는 `balanced`

---

## 모델 선택 가이드

### 시나리오별 추천

#### 1. 일반적인 데이터 생성
```
데이터 생성: claude-sonnet-4-5
파일 분석: claude-sonnet-4-5
검증: Fast (Haiku)
```
**예상 비용**: 1회 분석 약 $0.50 ~ $2.00

#### 2. 비용 최적화
```
데이터 생성: claude-3-5-sonnet-20241022
파일 분석: claude-3-haiku-20240307
검증: Fast (Haiku)
```
**예상 비용**: 1회 분석 약 $0.30 ~ $1.00

#### 3. 최고 품질
```
데이터 생성: claude-3-opus-20240229
파일 분석: claude-sonnet-4-5
검증: Balanced (Sonnet)
```
**예상 비용**: 1회 분석 약 $2.00 ~ $5.00

---

## 가격 정보

### Input/Output 토큰 가격 (2024년 12월 기준)

| 모델 | Input (per 1M tokens) | Output (per 1M tokens) |
|------|----------------------|------------------------|
| claude-sonnet-4-5 | $3.00 | $15.00 |
| claude-3-5-sonnet | $3.00 | $15.00 |
| claude-3-5-haiku | $0.80 | $4.00 |
| claude-3-opus | $15.00 | $75.00 |

**참고**: [공식 가격 페이지](https://www.anthropic.com/pricing#anthropic-api)

### 예상 사용량

#### AI 데이터 분석 1회
- **Input**: ~10,000 ~ 50,000 tokens
  - Excel 스키마 (2,000 ~ 10,000)
  - 사용자 입력 (500)
  - 시스템 프롬프트 (5,000 ~ 30,000)
- **Output**: ~5,000 ~ 20,000 tokens
  - 사용자 세그먼트, 이벤트 시퀀스, 트랜잭션 정의

**계산 예시** (claude-sonnet-4-5):
```
Input:  30,000 tokens × $3.00 / 1M = $0.09
Output: 10,000 tokens × $15.00 / 1M = $0.15
Total: $0.24
```

#### 파일 분석 1회
- **Input**: ~5,000 ~ 20,000 tokens (PDF/문서 내용)
- **Output**: ~1,000 ~ 3,000 tokens (요약)

**계산 예시** (claude-sonnet-4-5):
```
Input:  10,000 tokens × $3.00 / 1M = $0.03
Output: 2,000 tokens × $15.00 / 1M = $0.03
Total: $0.06
```

---

## 고급 설정

### 1. 커스텀 검증 모델 지정

**대시보드 설정**:
```
설정 → "고급 설정" → "커스텀 검증 모델"
입력: claude-3-5-sonnet-20241022
```

**환경 변수**:
```bash
CUSTOM_VALIDATION_MODEL=claude-3-5-sonnet-20241022
```

### 2. 모델별 컨텍스트 크기

| 모델 | 최대 컨텍스트 | 권장 사용 |
|------|--------------|----------|
| claude-sonnet-4-5 | 200K tokens | 대용량 문서 분석 |
| claude-3-5-sonnet | 200K tokens | 일반 분석 |
| claude-3-5-haiku | 200K tokens | 빠른 검증 |
| claude-3-opus | 200K tokens | 복잡한 추론 |

**주의**: 컨텍스트가 클수록 비용 증가

---

## 환경 변수 정리

```bash
# 필수
ANTHROPIC_API_KEY=sk-ant-api03-...

# 선택 (기본값 사용 가능)
DATA_AI_MODEL=claude-sonnet-4-5           # 데이터 생성 모델
FILE_ANALYSIS_MODEL=claude-sonnet-4-5     # 파일 분석 모델
VALIDATION_MODEL_TIER=fast                # fast | balanced
CUSTOM_VALIDATION_MODEL=                  # 비워두면 자동 선택

# 파일 분석 토큰 제한
FILE_ANALYSIS_MAX_TOKENS=4000             # 출력 토큰 제한
```

**우선순위**:
```
1. 대시보드 사용자 설정 (최우선)
2. 환경 변수
3. 시스템 기본값
```

---

## 모니터링 및 비용 관리

### 1. API 사용량 확인

[Anthropic Console](https://console.anthropic.com/) → "Usage" 메뉴

**확인 가능 정보**:
- 일별/월별 사용량
- 모델별 토큰 소비
- 예상 비용

### 2. 비용 최적화 팁

✅ **파일 분석에 Haiku 사용**
```
FILE_ANALYSIS_MODEL=claude-3-haiku-20240307
```
→ 비용 75% 절감

✅ **검증 모델 Fast 사용**
```
VALIDATION_MODEL_TIER=fast
```
→ 검증 비용 80% 절감

✅ **불필요한 파일 분석 최소화**
- 업로드 시 분석하지 않음 (현재 구현됨)
- "생성 시작" 클릭 시에만 분석

✅ **캐싱 활용** (향후 구현 예정)
- 동일한 Excel 스키마 재사용 시 캐싱

### 3. Rate Limit

| 모델 | RPM (Requests/min) | TPM (Tokens/min) |
|------|-------------------|------------------|
| claude-sonnet-4-5 | 50 | 100,000 |
| claude-3-5-sonnet | 50 | 100,000 |
| claude-3-5-haiku | 50 | 100,000 |

**대응 방법**:
- 시스템이 자동으로 재시도 (최대 3회)
- Rate Limit 초과 시 대기 후 재시도

---

## 트러블슈팅

### 문제 1: "Anthropic API key not configured"

**원인**: API 키 미설정

**해결**:
```
1. 대시보드 → 설정 → "Anthropic API Key" 입력
2. 저장 버튼 클릭
3. 페이지 새로고침
```

---

### 문제 2: "Invalid API key"

**원인**:
- API 키 오타
- 만료된 API 키
- 권한 없는 API 키

**해결**:
```bash
# API 키 확인
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "content-type: application/json" \
  -d '{
    "model": "claude-3-5-haiku-20241022",
    "max_tokens": 10,
    "messages": [{"role": "user", "content": "Hi"}]
  }'

# 정상 응답: {"id":"msg_...","content":[...],...}
# 오류 응답: {"error":{"message":"invalid x-api-key"}}
```

→ 오류 시 새 API 키 발급

---

### 문제 3: Rate Limit 초과

**증상**: `rate_limit_error`

**해결**:
- 대기 후 자동 재시도 (시스템 구현됨)
- 여러 API 키 로테이션 (향후 지원 예정)

---

### 문제 4: 비용이 너무 높음

**진단**:
```bash
# 로그에서 토큰 사용량 확인
grep "Total tokens" api.log

# 예시 출력:
# [INFO] Total tokens: input=45000, output=12000
```

**해결**:
1. **모델 다운그레이드**:
   - Opus → Sonnet: 비용 80% 절감
   - Sonnet → Haiku (파일 분석): 비용 75% 절감

2. **검증 Fast 모드**:
   ```
   VALIDATION_MODEL_TIER=fast
   ```

3. **파일 크기 제한**:
   - PDF: 10MB 이하
   - 텍스트: 50,000자 이하

---

## 보안 모범 사례

### ❌ 하지 말 것

```bash
# Git에 API 키 커밋 금지
git add .env  # ❌
```

### ✅ 해야 할 것

```bash
# .gitignore 확인
cat .gitignore | grep .env
# 출력: .env

# Kubernetes Secret 사용
kubectl create secret generic te-data-generator-secrets \
  --from-literal=anthropic-api-key='sk-ant-...' \
  -n korea
```

---

## 참고 자료

- [Anthropic 공식 문서](https://docs.anthropic.com/)
- [Claude API Reference](https://docs.anthropic.com/en/api)
- [모델 가격 정보](https://www.anthropic.com/pricing)
- [Rate Limits](https://docs.anthropic.com/en/api/rate-limits)
- [프로젝트 아키텍처](./ARCHITECTURE.md)

---

## 요약

| 항목 | 권장 설정 |
|------|----------|
| **데이터 생성 모델** | `claude-sonnet-4-5` |
| **파일 분석 모델** | `claude-sonnet-4-5` (또는 `claude-3-haiku` 비용 절감) |
| **검증 모델 등급** | `fast` (Haiku) |
| **예상 비용 (1회 분석)** | $0.30 ~ $0.50 |
| **API 키 설정** | 대시보드 → 설정 |

**핵심 포인트**:
- ✅ Anthropic Claude만 사용
- ✅ 사용자별 API 키 관리
- ✅ 대시보드에서 모델 변경 가능
- ✅ Fast/Balanced 검증 모드 선택 가능
