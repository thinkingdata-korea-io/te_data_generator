# 빠른 시작 가이드

서버에 ThinkingEngine 데이터 생성기를 빠르게 배포하는 가이드입니다.

## 사전 준비

1. **서버에 접속**
   ```bash
   ssh your-server
   ```

2. **프로젝트 클론**
   ```bash
   git clone <repository-url>
   cd demo_data_gen
   ```

3. **필수 정보 준비**
   - Docker Registry 주소 (예: `harbor.your-domain.com/te`)
   - Anthropic API Key
   - (선택) OpenAI API Key
   - ThinkingEngine APP_ID

## 1단계: Docker 이미지 빌드 및 푸시

```bash
# 이미지 빌드 및 푸시 (약 5-10분 소요)
./scripts/build-and-push.sh harbor.your-domain.com/te v1.0.0
```

이 스크립트는:
- Backend 및 Frontend Docker 이미지 빌드
- Docker Registry에 푸시
- `latest` 태그도 함께 푸시

## 2단계: Kubernetes Secret 생성

```bash
# Secret 템플릿 복사
cp k8s/secret.yaml.template k8s/secret.yaml

# API 키를 base64로 인코딩
echo -n "sk-ant-api03-your-key-here" | base64

# 출력된 값을 복사하여 k8s/secret.yaml 파일에 입력
vi k8s/secret.yaml
```

**secret.yaml 예시:**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: te-data-generator-secrets
type: Opaque
data:
  anthropic-api-key: "c2stYW50LWFwaT..."  # 여기에 인코딩된 값 입력
  openai-api-key: "c2stb3BlbmFp..."       # 선택사항
```

## 3단계: ConfigMap 및 Deployment 설정

### ConfigMap 수정
```bash
vi k8s/configmap.yaml
```

APP_ID를 실제 값으로 변경:
```yaml
data:
  te-receiver-url: "https://te-receiver-naver.thinkingdata.kr/"
  te-app-id: "your-actual-app-id-here"  # 여기 수정
```

### Deployment 이미지 주소 업데이트
```bash
# 스크립트로 자동 업데이트
./scripts/update-deployment-images.sh harbor.your-domain.com/te v1.0.0

# 또는 수동으로 편집
vi k8s/deployment.yaml
```

## 4단계: Ingress 설정 (선택사항)

외부에서 접근 가능하게 하려면:

```bash
vi k8s/ingress.yaml
```

도메인을 실제 값으로 변경:
```yaml
spec:
  rules:
  - host: te-data-generator.your-domain.com  # 여기 수정
```

## 5단계: 배포 실행

```bash
# 한 번에 모든 리소스 배포
./scripts/deploy.sh
```

이 스크립트는:
1. Secret 배포
2. ConfigMap 배포
3. Deployment 배포 (Backend & Frontend)
4. Service 배포
5. (선택) Ingress 배포

## 6단계: 배포 확인

### Pod 상태 확인
```bash
kubectl get pods -l app=te-data-generator
```

정상 출력 예시:
```
NAME                                            READY   STATUS    RESTARTS   AGE
te-data-generator-backend-xxxxxxxxxx-xxxxx      1/1     Running   0          1m
te-data-generator-frontend-xxxxxxxxxx-xxxxx     1/1     Running   0          1m
```

### 로그 확인
```bash
# Backend 로그
kubectl logs -f deployment/te-data-generator-backend

# Frontend 로그
kubectl logs -f deployment/te-data-generator-frontend
```

### 포트 포워딩으로 테스트
```bash
# Frontend 포트 포워딩
kubectl port-forward svc/te-data-generator-frontend 3000:3000
```

브라우저에서 접속: `http://localhost:3000`

## 접속 방법

### Ingress를 사용하는 경우
```
http://te-data-generator.your-domain.com
```

### 포트 포워딩을 사용하는 경우
```bash
kubectl port-forward svc/te-data-generator-frontend 3000:3000
```
브라우저: `http://localhost:3000`

## 업데이트 배포

코드가 변경된 경우:

```bash
# 1. 새 버전 빌드 및 푸시
./scripts/build-and-push.sh harbor.your-domain.com/te v1.1.0

# 2. Deployment 이미지 업데이트
./scripts/update-deployment-images.sh harbor.your-domain.com/te v1.1.0

# 3. 재배포
kubectl apply -f k8s/deployment.yaml

# 4. 롤아웃 상태 확인
kubectl rollout status deployment/te-data-generator-backend
kubectl rollout status deployment/te-data-generator-frontend
```

## 문제 해결

### Pod가 시작되지 않을 때
```bash
# Pod 상세 정보 확인
kubectl describe pod <pod-name>

# 최근 이벤트 확인
kubectl get events --sort-by=.metadata.creationTimestamp | tail -20
```

### 이미지 Pull 실패
```bash
# Docker Registry 로그인 확인
docker login harbor.your-domain.com

# Kubernetes Secret 생성 (필요시)
kubectl create secret docker-registry regcred \
  --docker-server=harbor.your-domain.com \
  --docker-username=<username> \
  --docker-password=<password>
```

Deployment에 imagePullSecrets 추가:
```yaml
spec:
  template:
    spec:
      imagePullSecrets:
      - name: regcred
```

### API 키 오류
```bash
# Secret 값 확인
kubectl get secret te-data-generator-secrets -o yaml

# Base64 디코딩하여 값 확인
kubectl get secret te-data-generator-secrets -o jsonpath='{.data.anthropic-api-key}' | base64 -d
```

## 전체 삭제

모든 리소스를 삭제하려면:

```bash
kubectl delete -f k8s/deployment.yaml
kubectl delete -f k8s/service.yaml
kubectl delete -f k8s/ingress.yaml
kubectl delete -f k8s/configmap.yaml
kubectl delete -f k8s/secret.yaml
```

---

## 요약: 3분 배포

준비가 완료된 경우:

```bash
# 1. 이미지 빌드 및 푸시
./scripts/build-and-push.sh harbor.your-domain.com/te v1.0.0

# 2. Secret 생성 (최초 1회)
cp k8s/secret.yaml.template k8s/secret.yaml
# API 키 입력 후...

# 3. 설정 업데이트
./scripts/update-deployment-images.sh harbor.your-domain.com/te v1.0.0
# k8s/configmap.yaml에서 APP_ID 수정

# 4. 배포
./scripts/deploy.sh

# 5. 확인
kubectl get pods -l app=te-data-generator
```

완료!
