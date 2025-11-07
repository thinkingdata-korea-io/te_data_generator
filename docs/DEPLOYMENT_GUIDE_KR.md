# ThinkingEngine 데이터 생성기 배포 가이드

## 목차
1. [사전 요구사항](#사전-요구사항)
2. [Docker 이미지 빌드](#docker-이미지-빌드)
3. [Kubernetes 배포](#kubernetes-배포)
4. [환경 설정](#환경-설정)
5. [접속 및 테스트](#접속-및-테스트)
6. [트러블슈팅](#트러블슈팅)

---

## 사전 요구사항

### 필수 도구
- Docker (v20.10 이상)
- kubectl (Kubernetes CLI)
- 접근 가능한 Docker Registry (Harbor, Docker Hub 등)
- Kubernetes 클러스터 접근 권한

### 필수 정보
- Anthropic API Key
- ThinkingEngine Receiver URL
- ThinkingEngine APP_ID (기본값)
- Docker Registry 주소

---

## Docker 이미지 빌드

### 1. Backend 이미지 빌드

```bash
cd data-generator

# 이미지 빌드
docker build -t your-registry/te-data-generator-backend:v1.0.0 .

# 레지스트리에 푸시
docker push your-registry/te-data-generator-backend:v1.0.0
```

### 2. Frontend 이미지 빌드

```bash
cd ../frontend

# 이미지 빌드
docker build -t your-registry/te-data-generator-frontend:v1.0.0 .

# 레지스트리에 푸시
docker push your-registry/te-data-generator-frontend:v1.0.0
```

### 3. LogBus2 준비

LogBus2는 백엔드 컨테이너와 함께 배포됩니다. 다음을 확인하세요:
- `logbus 2/logbus` 실행 파일이 프로젝트 루트에 있는지 확인
- Dockerfile에서 올바른 경로로 복사되는지 확인

---

## Kubernetes 배포

### 1. Secret 생성

API 키를 base64로 인코딩:

```bash
# Anthropic API Key 인코딩
echo -n "sk-ant-api03-your-key-here" | base64

# OpenAI API Key 인코딩 (선택사항)
echo -n "sk-your-openai-key-here" | base64
```

`k8s/secret.yaml.template`을 복사하여 `k8s/secret.yaml` 생성:

```bash
cp k8s/secret.yaml.template k8s/secret.yaml
```

`secret.yaml` 파일을 편집하여 base64로 인코딩된 API 키 입력:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: te-data-generator-secrets
type: Opaque
data:
  anthropic-api-key: "U0tBTlRBUEkwMy15b3VyLWtleS1oZXJl"  # 실제 인코딩된 값으로 교체
  openai-api-key: "c2steW91ci1vcGVuYWkta2V5LWhlcmU="      # 선택사항
```

Secret 배포:

```bash
kubectl apply -f k8s/secret.yaml
```

⚠️ **보안 주의사항**: `secret.yaml` 파일은 Git에 커밋하지 마세요!

### 2. ConfigMap 수정 및 배포

`k8s/configmap.yaml` 파일을 편집:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: te-data-generator-config
data:
  te-receiver-url: "https://te-receiver-naver.thinkingdata.kr/"
  te-app-id: "df6fff48a373418ca2da97d104df2188"  # 실제 APP_ID로 교체
```

ConfigMap 배포:

```bash
kubectl apply -f k8s/configmap.yaml
```

### 3. Deployment 수정 및 배포

`k8s/deployment.yaml` 파일에서 이미지 주소 수정:

```yaml
# Backend
image: your-registry/te-data-generator-backend:v1.0.0

# Frontend
image: your-registry/te-data-generator-frontend:v1.0.0
```

Deployment 배포:

```bash
kubectl apply -f k8s/deployment.yaml
```

### 4. Service 배포

```bash
kubectl apply -f k8s/service.yaml
```

### 5. Ingress 배포 (선택사항)

`k8s/ingress.yaml` 파일에서 도메인 수정:

```yaml
spec:
  rules:
  - host: te-data-generator.your-domain.com  # 실제 도메인으로 변경
```

Ingress 배포:

```bash
kubectl apply -f k8s/ingress.yaml
```

---

## 환경 설정

### ConfigMap 설정값

| 키 | 설명 | 예시 |
|---|---|---|
| `te-receiver-url` | ThinkingEngine Receiver URL | `https://te-receiver-naver.thinkingdata.kr/` |
| `te-app-id` | 기본 ThinkingEngine APP_ID | `df6fff48a373418ca2da97d104df2188` |

### Secret 설정값

| 키 | 설명 | 필수 여부 |
|---|---|---|
| `anthropic-api-key` | Anthropic Claude API Key | 필수 |
| `openai-api-key` | OpenAI API Key | 선택 |

### 리소스 설정

현재 설정된 리소스 제한:

**Backend:**
- Request: 512Mi 메모리, 500m CPU
- Limit: 2Gi 메모리, 2000m CPU

**Frontend:**
- Request: 256Mi 메모리, 250m CPU
- Limit: 512Mi 메모리, 500m CPU

필요에 따라 `k8s/deployment.yaml`에서 조정 가능합니다.

---

## 접속 및 테스트

### 1. 배포 상태 확인

```bash
# Pod 상태 확인
kubectl get pods -l app=te-data-generator

# Service 확인
kubectl get svc -l app=te-data-generator

# Ingress 확인
kubectl get ingress te-data-generator
```

### 2. 로그 확인

```bash
# Backend 로그
kubectl logs -f deployment/te-data-generator-backend

# Frontend 로그
kubectl logs -f deployment/te-data-generator-frontend
```

### 3. 포트 포워딩으로 로컬 테스트

Ingress 없이 테스트하려면:

```bash
# Frontend 포트 포워딩
kubectl port-forward svc/te-data-generator-frontend 3000:3000

# Backend 포트 포워딩 (다른 터미널에서)
kubectl port-forward svc/te-data-generator-backend 3001:3001
```

브라우저에서 `http://localhost:3000` 접속

### 4. Ingress로 접속

Ingress가 설정되어 있으면:

```
http://te-data-generator.your-domain.com
```

---

## 트러블슈팅

### Pod가 시작되지 않을 때

```bash
# Pod 상세 정보 확인
kubectl describe pod <pod-name>

# 이벤트 확인
kubectl get events --sort-by=.metadata.creationTimestamp
```

**주요 원인:**
- 이미지 Pull 실패: Registry 접근 권한 확인
- Secret/ConfigMap 누락: `kubectl get secrets`, `kubectl get configmap` 확인
- 리소스 부족: 클러스터 리소스 확인

### API 키 오류

```bash
# Secret이 올바르게 생성되었는지 확인
kubectl get secret te-data-generator-secrets -o yaml

# Base64 디코딩하여 값 확인
kubectl get secret te-data-generator-secrets -o jsonpath='{.data.anthropic-api-key}' | base64 -d
```

### LogBus2 오류

Backend 로그에서 LogBus2 관련 오류 확인:

```bash
kubectl logs -f deployment/te-data-generator-backend | grep -i logbus
```

**주요 원인:**
- LogBus2 실행 파일 권한: Dockerfile에서 `chmod +x` 확인
- 경로 문제: LogBus2 경로가 올바른지 확인
- CPU 제한: `cpu_limit` 설정 조정

### Frontend에서 Backend API 호출 실패

```bash
# Backend Service가 정상인지 확인
kubectl get svc te-data-generator-backend

# Frontend 환경변수 확인
kubectl exec deployment/te-data-generator-frontend -- env | grep API_URL
```

**해결 방법:**
- `API_URL`이 `http://te-data-generator-backend:3001`로 설정되어 있는지 확인
- Backend Pod가 정상 실행 중인지 확인

### 파일 업로드 실패

Ingress 사용 시 파일 크기 제한 확인:

```yaml
annotations:
  nginx.ingress.kubernetes.io/proxy-body-size: "50m"  # 필요시 증가
```

---

## 업데이트 배포

### 1. 이미지 재빌드 및 푸시

```bash
# 새 버전으로 빌드
docker build -t your-registry/te-data-generator-backend:v1.1.0 .
docker push your-registry/te-data-generator-backend:v1.1.0
```

### 2. Deployment 업데이트

```bash
# 이미지 버전 업데이트
kubectl set image deployment/te-data-generator-backend \
  backend=your-registry/te-data-generator-backend:v1.1.0

# 롤아웃 상태 확인
kubectl rollout status deployment/te-data-generator-backend
```

### 3. 롤백 (필요시)

```bash
# 이전 버전으로 롤백
kubectl rollout undo deployment/te-data-generator-backend

# 특정 버전으로 롤백
kubectl rollout undo deployment/te-data-generator-backend --to-revision=2
```

---

## 삭제

모든 리소스 삭제:

```bash
kubectl delete -f k8s/ingress.yaml
kubectl delete -f k8s/service.yaml
kubectl delete -f k8s/deployment.yaml
kubectl delete -f k8s/configmap.yaml
kubectl delete -f k8s/secret.yaml
```

또는 한번에:

```bash
kubectl delete -f k8s/
```

---

## 참고 자료

- [Kubernetes 공식 문서](https://kubernetes.io/docs/)
- [Docker 공식 문서](https://docs.docker.com/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [ThinkingEngine 문서](https://docs.thinkingdata.cn/)
