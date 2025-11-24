# 🚀 배포 가이드

## 목차
- [개요](#개요)
- [자동 배포 (권장)](#자동-배포-권장)
- [수동 배포](#수동-배포)
- [배포 상태 확인](#배포-상태-확인)
- [트러블슈팅](#트러블슈팅)

---

## 개요

이 프로젝트는 **GitLab CI/CD**를 통한 자동 배포가 설정되어 있습니다.
`main` 브랜치에 코드를 푸시하면 자동으로 빌드, 테스트, Docker 이미지 생성, Registry 푸시, Kubernetes 배포가 진행됩니다.

### 배포 아키텍처

```
코드 수정
  ↓
git commit & push
  ↓
GitLab CI/CD 자동 실행
  ↓
[Build Stage]
  - Backend Docker 이미지 빌드 → docker-ta-inner.thinkingdata.cn 푸시
  - Frontend Docker 이미지 빌드 → docker-ta-inner.thinkingdata.cn 푸시
  ↓
[Deploy Stage]
  - Kubernetes 배포 (korea namespace)
  - 롤아웃 완료 대기
  ↓
완료! ✅
http://te-data-generator.tx-local.thinkingdata.cn
```

---

## 자동 배포 (권장)

### 1️⃣ 기본 워크플로우

```bash
# 1. 코드 수정 후 커밋
git add .
git commit -m "feat: 새로운 기능 추가"

# 2. main 브랜치에 푸시
git push origin main

# 3. GitLab CI/CD 자동 실행 (자동으로 진행됨)
#    ✅ Backend Docker 이미지 빌드
#    ✅ Frontend Docker 이미지 빌드
#    ✅ Docker Registry 푸시
#    ✅ Kubernetes 배포
#    ✅ 롤아웃 완료 대기

# 4. 완료! 애플리케이션 접속
#    http://te-data-generator.tx-local.thinkingdata.cn
```

### 2️⃣ GitLab CI/CD 파이프라인 모니터링

1. GitLab 웹 인터페이스 접속
2. **CI/CD > Pipelines** 메뉴로 이동
3. 최근 파이프라인 상태 확인
   - ✅ passed: 성공
   - ❌ failed: 실패 (로그 확인 필요)
   - 🔄 running: 실행 중

### 3️⃣ 자동 배포 트리거 조건

- **브랜치**: `main` 브랜치에 푸시할 때만 자동 배포
- **이미지 태그**:
  - `{DOCKER_REGISTRY}/korea/data-generator-backend:${CI_COMMIT_SHORT_SHA}`
  - `{DOCKER_REGISTRY}/korea/data-generator-backend:latest`

---

## 수동 배포

GitLab CI/CD를 사용하지 않고 로컬에서 직접 배포하는 방법입니다.

### Option 1: 스크립트 사용 (권장)

```bash
# 1. Docker 이미지 빌드 및 Registry 푸시
./scripts/build-and-push.sh docker-ta-inner.thinkingdata.cn/korea v1.2.0

# 2. Kubernetes 배포
./scripts/deploy.sh
```

#### 스크립트 파라미터

- **registry**: Docker Registry 주소 (예: `docker-ta-inner.thinkingdata.cn/korea`)
- **version**: 이미지 버전 태그 (예: `v1.2.0`, `v1.3.0`)

### Option 2: 개별 명령어 실행

#### Step 1: Docker 이미지 빌드

```bash
# 프로젝트 루트에서 실행
cd /Users/jegaljin-u/workspace/demo_data_gen

# Backend 이미지 빌드
docker build -f data-generator/Dockerfile -t backend:latest .

# Frontend 이미지 빌드
docker build -f frontend/Dockerfile -t frontend:latest .
```

#### Step 2: Docker Registry에 푸시

```bash
# Registry 로그인
docker login docker-ta-inner.thinkingdata.cn

# 이미지 태그
docker tag backend:latest docker-ta-inner.thinkingdata.cn/korea/data-generator-backend:v1.2.0
docker tag backend:latest docker-ta-inner.thinkingdata.cn/korea/data-generator-backend:latest

docker tag frontend:latest docker-ta-inner.thinkingdata.cn/korea/data-generator-frontend:v1.2.0
docker tag frontend:latest docker-ta-inner.thinkingdata.cn/korea/data-generator-frontend:latest

# 푸시
docker push docker-ta-inner.thinkingdata.cn/korea/data-generator-backend:v1.2.0
docker push docker-ta-inner.thinkingdata.cn/korea/data-generator-backend:latest
docker push docker-ta-inner.thinkingdata.cn/korea/data-generator-frontend:v1.2.0
docker push docker-ta-inner.thinkingdata.cn/korea/data-generator-frontend:latest
```

#### Step 3: Kubernetes 배포

```bash
# Secret 설정 (최초 1회)
cp k8s/secret.yaml.template k8s/secret.yaml
# secret.yaml 파일 편집하여 API 키 입력 (base64 인코딩)

# 배포 실행
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml -n korea
kubectl apply -f k8s/secret.yaml -n korea
kubectl apply -f k8s/deployment.yaml -n korea
kubectl apply -f k8s/service.yaml -n korea
kubectl apply -f k8s/ingress.yaml -n korea

# 롤아웃 상태 확인
kubectl rollout status deployment/te-data-generator-backend -n korea
kubectl rollout status deployment/te-data-generator-frontend -n korea
```

### Option 3: 기존 배포 재시작

코드 변경 없이 Pod만 재시작하는 경우:

```bash
kubectl rollout restart deployment/te-data-generator-backend -n korea
kubectl rollout restart deployment/te-data-generator-frontend -n korea
```

---

## 배포 상태 확인

### 1️⃣ Kubernetes 리소스 확인

```bash
# 전체 리소스 확인
kubectl get all -n korea -l app=te-data-generator

# Pod 상태 확인
kubectl get pods -n korea -l app=te-data-generator

# Service 확인
kubectl get svc -n korea -l app=te-data-generator

# Ingress 확인
kubectl get ingress -n korea
```

### 2️⃣ 로그 확인

```bash
# Backend 로그 (실시간)
kubectl logs -f deployment/te-data-generator-backend -n korea

# Frontend 로그 (실시간)
kubectl logs -f deployment/te-data-generator-frontend -n korea

# 최근 100줄만 확인
kubectl logs --tail=100 deployment/te-data-generator-backend -n korea

# 특정 Pod 로그
kubectl logs <pod-name> -n korea
```

### 3️⃣ 배포 히스토리 확인

```bash
# 롤아웃 히스토리
kubectl rollout history deployment/te-data-generator-backend -n korea

# 특정 리비전 상세 정보
kubectl rollout history deployment/te-data-generator-backend -n korea --revision=2
```

### 4️⃣ Pod 상세 정보

```bash
# Pod 상세 정보
kubectl describe pod <pod-name> -n korea

# Pod 이벤트 확인
kubectl get events -n korea --sort-by='.lastTimestamp'
```

### 5️⃣ 로컬 포트 포워딩 테스트

```bash
# Backend 포트 포워딩
kubectl port-forward svc/te-data-generator-backend 3001:3001 -n korea

# Frontend 포트 포워딩
kubectl port-forward svc/te-data-generator-frontend 3000:3000 -n korea

# 접속: http://localhost:3000 또는 http://localhost:3001
```

---

## 트러블슈팅

### 문제 1: Docker 빌드 실패

#### 증상
```
ERROR: Cannot find module '@excel-schema-generator/schema-generator'
```

#### 해결 방법
프로젝트 루트에서 빌드하는지 확인:

```bash
# ❌ 잘못된 방법
cd data-generator
docker build -t backend:latest .

# ✅ 올바른 방법
cd /Users/jegaljin-u/workspace/demo_data_gen
docker build -f data-generator/Dockerfile -t backend:latest .
```

### 문제 2: Pod가 CrashLoopBackOff 상태

#### 원인
- 환경변수 누락
- Secret 미설정
- 잘못된 이미지 태그

#### 해결 방법
```bash
# Pod 로그 확인
kubectl logs <pod-name> -n korea

# Pod 상세 정보 확인
kubectl describe pod <pod-name> -n korea

# Secret 확인
kubectl get secret -n korea

# ConfigMap 확인
kubectl get configmap -n korea
```

### 문제 3: 이미지 Pull 실패 (ImagePullBackOff)

#### 원인
- Registry 인증 실패
- 잘못된 이미지 이름 또는 태그

#### 해결 방법
```bash
# Secret 재생성
kubectl delete secret regcred -n korea
kubectl create secret docker-registry regcred \
  --docker-server=docker-ta-inner.thinkingdata.cn \
  --docker-username=root \
  --docker-password=<password> \
  -n korea

# Deployment 재배포
kubectl rollout restart deployment/te-data-generator-backend -n korea
```

### 문제 4: GitLab CI/CD 파이프라인 실패

#### 확인 사항
1. GitLab Runner 상태 확인
2. `.gitlab-ci.yml` 문법 확인
3. Docker Registry 접근 권한 확인
4. Kubernetes 클러스터 접근 권한 확인

#### 해결 방법
```bash
# GitLab 웹 인터페이스에서 파이프라인 로그 확인
# CI/CD > Pipelines > 실패한 Job 클릭 > 로그 확인

# 필요한 Secret 변수 확인:
# - DOCKER_REGISTRY_PASSWORD
# - KUBECONFIG (Kubernetes 인증)
```

### 문제 5: 롤아웃 타임아웃

#### 증상
```
error: timed out waiting for the condition
```

#### 해결 방법
```bash
# 현재 Pod 상태 확인
kubectl get pods -n korea

# 이벤트 확인
kubectl get events -n korea --sort-by='.lastTimestamp'

# 롤백
kubectl rollout undo deployment/te-data-generator-backend -n korea
```

---

## 롤백 가이드

### 이전 버전으로 롤백

```bash
# 롤아웃 히스토리 확인
kubectl rollout history deployment/te-data-generator-backend -n korea

# 바로 이전 버전으로 롤백
kubectl rollout undo deployment/te-data-generator-backend -n korea

# 특정 리비전으로 롤백
kubectl rollout undo deployment/te-data-generator-backend -n korea --to-revision=2

# 롤백 상태 확인
kubectl rollout status deployment/te-data-generator-backend -n korea
```

---

## 환경별 배포

### 개발 환경 (Local)

```bash
# Docker Compose 사용
docker-compose up -d

# 접속
# Frontend: http://localhost:3000
# Backend: http://localhost:3001
```

### 스테이징 환경

```bash
# 스테이징 브랜치에서 배포
git checkout staging
git push origin staging

# 또는 수동 배포
./scripts/build-and-push.sh docker-ta-inner.thinkingdata.cn/korea staging-v1.0.0
```

### 프로덕션 환경

```bash
# main 브랜치에서 배포 (자동)
git checkout main
git push origin main

# 또는 수동 배포
./scripts/build-and-push.sh docker-ta-inner.thinkingdata.cn/korea v1.0.0
./scripts/deploy.sh
```

---

## 유용한 명령어 모음

```bash
# === Docker 관련 ===
# 이미지 목록 확인
docker images | grep te-data-generator

# 실행 중인 컨테이너 확인
docker ps

# 컨테이너 로그 확인
docker logs <container-id>

# === Kubernetes 관련 ===
# 네임스페이스 목록
kubectl get namespaces

# 모든 리소스 확인
kubectl get all -n korea

# Pod 셸 접속
kubectl exec -it <pod-name> -n korea -- /bin/sh

# Secret 디코딩
kubectl get secret <secret-name> -n korea -o jsonpath='{.data.API_KEY}' | base64 -d

# === GitLab 관련 ===
# 최근 파이프라인 확인 (GitLab CLI 사용시)
# gitlab-ci-multi-runner verify

# === 모니터링 ===
# 리소스 사용량 확인
kubectl top pods -n korea
kubectl top nodes
```

---

## 참고 자료

- **프로젝트 구조**: [README.md](./README.md)
- **개발 가이드**: [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)
- **Kubernetes 설정**: [k8s/](./k8s/)
- **GitLab CI/CD**: [.gitlab-ci.yml](./.gitlab-ci.yml)

---

## 문의

배포 관련 문제나 질문이 있으시면:
- 이슈 생성: GitLab Issues
- 담당자: ThinkingData Korea Team
