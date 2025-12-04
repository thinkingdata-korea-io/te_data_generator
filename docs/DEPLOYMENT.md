# 배포 가이드 (Deployment Guide)

## 📋 배포 전 체크리스트

### 1. VPN 연결 (필수!)
```bash
# ⚠️ CRITICAL: GitLab 푸시 전에 반드시 VPN을 켜야 합니다!
# VPN 연결 없이 GitLab 푸시 시 다음 오류 발생:
# fatal: unable to access 'http://10.27.249.150:8888/...': Failed to connect to 10.27.249.150
```

**VPN 연결 확인**:
- GitLab 서버: `10.27.249.150:8888`
- Docker Registry: `docker-ta-inner.thinkingdata.cn`
- 애플리케이션 URL: `http://te-data-generator.tx-local.thinkingdata.cn`

---

## 🌐 서버 및 저장소 정보

### Git Repositories

#### GitHub (Public)
- **URL**: `https://github.com/thinkingdata-korea-io/te_data_generator.git`
- **Remote**: `origin`
- **용도**: 외부 백업 및 협업

#### GitLab (Internal)
- **URL**: `http://10.27.249.150:8888/korea/te_data_generator.git`
- **Remote**: `gitlab`
- **용도**: 내부 배포 및 Jenkins CI/CD 트리거
- **⚠️ 주의**: VPN 연결 필요!

### Docker Registry
- **Registry**: `docker-ta-inner.thinkingdata.cn`
- **Username**: `root`
- **Images**:
  - Backend: `docker-ta-inner.thinkingdata.cn/korea/data-generator-backend:latest`
  - Frontend: `docker-ta-inner.thinkingdata.cn/korea/data-generator-frontend:latest`

### Kubernetes
- **Namespace**: `korea`
- **Application URL**: `http://te-data-generator.tx-local.thinkingdata.cn`

---

## 🚀 배포 프로세스

### Step 1: 변경사항 확인

```bash
# 현재 디렉토리 확인
pwd
# 출력: /Users/jegaljin-u/workspace/demo_data_gen

# Git 상태 확인
git status

# 변경사항 요약 확인
git diff --stat
```

### Step 2: 커밋

```bash
# 모든 변경사항 스테이징
git add -A

# 상태 재확인 (로그 파일 등이 제외되었는지 확인)
git status

# 커밋 (상세한 메시지 작성)
git commit -m "$(cat <<'EOF'
feat: [기능 설명]

[상세 변경사항]

Backend Changes:
- [백엔드 변경사항 나열]

Frontend Changes:
- [프론트엔드 변경사항 나열]

Documentation:
- [문서 변경사항 나열]

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

### Step 3: 푸시 (중요!)

```bash
# ⚠️ STEP 1: VPN 연결 확인!
# VPN이 켜져 있는지 반드시 확인하세요.

# STEP 2: GitHub 푸시
git push origin main

# STEP 3: GitLab 푸시 (VPN 필요)
git push gitlab main

# GitLab 푸시 성공 메시지:
# remote: To create a merge request for main, visit:
# remote:   http://10.27.249.150:8888/korea/te_data_generator/merge_requests/new?...
# To http://10.27.249.150:8888/korea/te_data_generator.git
#    xxxxxxx..yyyyyyy  main -> main
```

### Step 4: 자동 배포 확인

GitLab에 푸시하면 **Jenkins가 자동으로 배포**를 시작합니다.

#### Jenkins 자동 배포 과정:

1. **Docker 이미지 빌드**
   ```bash
   # Backend 이미지 빌드
   docker build -f data-generator/Dockerfile -t docker-ta-inner.thinkingdata.cn/korea/data-generator-backend:latest .

   # Frontend 이미지 빌드
   docker build -f frontend/Dockerfile -t docker-ta-inner.thinkingdata.cn/korea/data-generator-frontend:latest .
   ```

2. **Docker Registry 푸시**
   ```bash
   docker push docker-ta-inner.thinkingdata.cn/korea/data-generator-backend:latest
   docker push docker-ta-inner.thinkingdata.cn/korea/data-generator-frontend:latest
   ```

3. **Kubernetes 배포**
   ```bash
   kubectl apply -f k8s/namespace.yaml
   kubectl apply -f k8s/configmap.yaml -n korea

   # ⚠️ Secret은 서버에 미리 생성되어 있어야 함 (보안상 Git에 커밋 안됨)
   # Secret이 없다면 먼저 생성:
   # kubectl create secret generic te-data-generator-secrets -n korea \
   #   --from-literal=database-url="postgresql://user:password@host:5432/dbname" \
   #   --from-literal=jwt-secret="your-secure-jwt-secret" \
   #   --from-literal=anthropic-api-key="sk-ant-..."

   kubectl apply -f k8s/deployment.yaml -n korea
   kubectl apply -f k8s/service.yaml -n korea
   kubectl apply -f k8s/ingress.yaml -n korea

   # Rolling update 완료 대기
   kubectl rollout status deployment/te-data-generator-backend -n korea --timeout=5m
   kubectl rollout status deployment/te-data-generator-frontend -n korea --timeout=5m
   ```

4. **배포 완료**
   - 애플리케이션 URL: `http://te-data-generator.tx-local.thinkingdata.cn`

---

## 🔍 배포 상태 확인

### Jenkins 콘솔
Jenkins 콘솔에서 빌드 진행 상황 확인

### Kubernetes 상태 확인

```bash
# Pod 상태 확인
kubectl get pods -n korea

# Deployment 상태 확인
kubectl get deployments -n korea

# Service 상태 확인
kubectl get services -n korea

# Ingress 상태 확인
kubectl get ingress -n korea

# Pod 로그 확인
kubectl logs -f deployment/te-data-generator-backend -n korea
kubectl logs -f deployment/te-data-generator-frontend -n korea

# Pod 재시작 (필요 시)
kubectl rollout restart deployment/te-data-generator-backend -n korea
kubectl rollout restart deployment/te-data-generator-frontend -n korea
```

---

## 🐛 트러블슈팅

### 문제 1: GitLab 푸시 실패 - "Failed to connect"

**증상**:
```
fatal: unable to access 'http://10.27.249.150:8888/...': Failed to connect to 10.27.249.150 port 8888 after 75001 ms: Couldn't connect to server
```

**원인**: VPN 미연결

**해결**:
```bash
# 1. VPN 연결
# 2. 연결 확인
curl http://10.27.249.150:8888

# 3. 재시도
git push gitlab main
```

---

### 문제 2: Docker 이미지 빌드 실패

**증상**: Jenkins 빌드 로그에서 Docker build 실패

**원인**: Dockerfile 경로 또는 의존성 문제

**해결**:
```bash
# 로컬에서 Docker 이미지 빌드 테스트
cd /Users/jegaljin-u/workspace/demo_data_gen

# Backend 빌드 테스트
docker build -f data-generator/Dockerfile -t test-backend .

# Frontend 빌드 테스트
docker build -f frontend/Dockerfile -t test-frontend ./frontend
```

---

### 문제 3: Jenkins 배포 실패 - "k8s/configmap.yaml does not exist"

**증상**:
```
error: the path "k8s/configmap.yaml" does not exist
script returned exit code 1
```

**원인**:
1. ConfigMap 파일이 Git에 커밋되지 않았거나
2. Secret 파일이 Git에 없어서 오류 발생 (보안상 정상)

**해결**:
```bash
# 1. ConfigMap이 Git에 있는지 확인
git ls-files k8s/configmap.yaml

# 2. ConfigMap이 없다면 커밋
git add k8s/configmap.yaml
git commit -m "Add k8s configmap"
git push origin main
git push gitlab main

# 3. Secret은 서버에 미리 생성 (최초 1회)
# 서버 SSH 접속 후:
kubectl create secret generic te-data-generator-secrets \
  --from-literal=database-url='postgresql://...' \
  --from-literal=jwt-secret='...' \
  --from-literal=anthropic-api-key='sk-ant-...' \
  -n korea
```

**⚠️ 참고**: `.gitlab-ci.yml`이 수정되어 Secret 파일 누락 시에도 배포가 계속 진행됩니다.

---

### 문제 4: Jenkins 배포 실패 - "deployment not found"

**증상**:
```
kubectl delete deployment te-data-generator-frontend -n korea
Error from server (NotFound): deployments.apps "te-data-generator-frontend" not found
script returned exit code 1
```

**원인**: 첫 배포 시 deployment가 존재하지 않아서 delete 실패

**해결**:
이것은 **정상적인 첫 배포 에러**입니다. Jenkins 스크립트가 다음과 같이 진행됩니다:
1. `kubectl delete deployment` (deployment 없으면 실패 - 정상)
2. `kubectl apply -f k8s/deployment.yaml` (새로 생성)

**대응 방법**:
```bash
# 서버에서 수동으로 deployment 생성 (첫 배포 시에만)
kubectl apply -f k8s/deployment.yaml -n korea

# 또는 Jenkins 스크립트에서 에러 무시하도록 수정 (|| true 추가)
kubectl delete deployment te-data-generator-frontend -n korea || true
```

**중요**: 이 에러는 무시해도 됩니다. 다음 단계인 `kubectl apply`가 실행되면 deployment가 정상적으로 생성됩니다.

---

### 문제 5: Kubernetes Pod 시작 실패

**증상**: Pod가 CrashLoopBackOff 또는 ImagePullBackOff 상태

**확인**:
```bash
# Pod 상세 정보
kubectl describe pod <pod-name> -n korea

# Pod 로그
kubectl logs <pod-name> -n korea

# 이벤트 확인
kubectl get events -n korea --sort-by='.lastTimestamp'
```

**주요 원인**:
1. **ImagePullBackOff**: Docker Registry 인증 문제
   - Secret 확인: `kubectl get secret -n korea`

2. **CrashLoopBackOff**: 애플리케이션 시작 실패
   - 환경 변수 확인: `kubectl get configmap -n korea`
   - **Secret 확인**: PostgreSQL 연결 정보, API Key 등
     ```bash
     # Secret이 존재하는지 확인
     kubectl get secret te-data-generator-secrets -n korea

     # Secret이 없다면 생성 (보안 섹션 참고)
     kubectl create secret generic te-data-generator-secrets \
       --from-literal=database-url='...' \
       --from-literal=jwt-secret='...' \
       --from-literal=anthropic-api-key='...' \
       -n korea
     ```

---

### 문제 4: 애플리케이션 접속 불가

**증상**: `http://te-data-generator.tx-local.thinkingdata.cn` 접속 안됨

**확인**:
```bash
# Ingress 상태 확인
kubectl get ingress -n korea

# Service 상태 확인
kubectl get svc -n korea

# Pod IP 및 포트 확인
kubectl get pods -n korea -o wide
```

**해결**:
1. Ingress 규칙 확인
2. Service와 Deployment 라벨 매칭 확인
3. 방화벽 규칙 확인

---

## 📁 .gitignore 관리

배포 시 다음 파일들은 **절대 커밋하지 않습니다**:

```bash
# 로그 파일
*.log
data-generator/api.log
frontend/frontend.log

# 런타임 데이터
logbus/log/
logbus/runtime/

# 생성된 데이터
output/
uploads/

# 환경 변수
.env
.env*.local

# Kubernetes Secret
k8s/secret.yaml
```

**확인**:
```bash
# .gitignore 설정 확인
cat .gitignore

# 스테이징된 파일 중 제외해야 할 파일 확인
git status
```

---

## 🔐 보안 정보 관리

### 절대 커밋하지 않을 것:

❌ API Keys (Anthropic API Key)
❌ Database Passwords
❌ Docker Registry Credentials
❌ Kubernetes Secret 파일

### 안전하게 관리:

✅ **Kubernetes Secret 생성 (최초 1회 필수)**

서버에 접속하여 다음 명령어로 Secret을 생성합니다:

```bash
# Secret 생성 (실제 값으로 교체하여 실행)
kubectl create secret generic te-data-generator-secrets \
  --from-literal=database-url='postgresql://user:password@postgres-host:5432/te_data_generator' \
  --from-literal=jwt-secret='your-very-secure-random-jwt-secret-key-here' \
  --from-literal=anthropic-api-key='sk-ant-api03-...' \
  -n korea

# Secret 생성 확인
kubectl get secret te-data-generator-secrets -n korea

# Secret 내용 확인 (base64 인코딩됨)
kubectl describe secret te-data-generator-secrets -n korea
```

**⚠️ 중요**:
- 이 Secret은 **최초 1회만** 생성하면 됩니다
- 이후 배포 시에는 자동으로 기존 Secret을 사용합니다
- Secret이 없으면 Pod가 시작되지 않습니다

✅ ConfigMap 사용 (비밀번호가 아닌 설정값)
```bash
# ConfigMap은 Git에 커밋되어 있으므로 자동으로 적용됩니다
kubectl apply -f k8s/configmap.yaml -n korea
```

---

## 📝 배포 히스토리 (최근 배포)

### 2024-12-04 - 주요 기능 개선 및 문서화
**커밋**: `2e38207`

**Backend 변경사항**:
- ✅ 트랜잭션 감지 버그 수정 (src/ai/client.ts)
- ✅ API 토큰 최적화 (파일 분석 지연 처리)
- ✅ 파일 관리 CRUD 기능 추가 (삭제/다운로드/보존기간)
- ✅ TypeScript strict 모드 활성화
- ✅ 경로 일관성 수정 (analysis-results → analysis-excel)

**Frontend 변경사항**:
- ✅ i18n 완성 (한국어/영어/일본어/중국어)
- ✅ 파일 관리 UI 개선 및 기능 추가
- ✅ 데이터 생성 워크플로우 개선

**Documentation**:
- ✅ `INFRASTRUCTURE.md` 추가 (K8s & PVC 가이드)
- ✅ `NODE_STUDY.md` 추가 (Node.js 기술 발표 자료)
- ✅ `AI_APIS.md` 재작성 (Claude 전용)
- ✅ 문서 구조 정리 (불필요한 문서 삭제)

**배포 결과**:
- GitHub 푸시: ✅ 성공
- GitLab 푸시: ✅ 성공 (VPN 연결 후)
- Jenkins 자동 배포: ✅ 대기 중
- 애플리케이션 URL: `http://te-data-generator.tx-local.thinkingdata.cn`

---

## 🔄 CI/CD 파이프라인

### 현재 설정: Jenkins (GitLab CI 비활성화)

`.gitlab-ci.yml` 파일에 다음과 같이 설정되어 있습니다:

```yaml
# GitLab CI 비활성화 - Jenkins 사용
workflow:
  rules:
    - when: never
```

### GitLab CI 활성화 (향후 필요 시)

`.gitlab-ci.yml` 수정:
```yaml
# workflow 섹션 삭제 또는 주석 처리
# workflow:
#   rules:
#     - when: never

stages:
  - build
  - deploy
```

---

## 📚 관련 문서

- **[인프라 가이드](./INFRASTRUCTURE.md)** - Kubernetes & PVC 완벽 가이드
- **[아키텍처 가이드](./common/ARCHITECTURE.md)** - 전체 시스템 구조
- **[배포 가이드](./deployment-guide.md)** - Git & Docker 워크플로우 (기존 문서)
- **[보안 가이드](./SECURITY.md)** - 보안 정책 및 베스트 프랙티스

---

## ⚡ 빠른 배포 체크리스트

```bash
# [ ] 1. VPN 연결 확인
# [ ] 2. 변경사항 확인: git status
# [ ] 3. 스테이징: git add -A
# [ ] 4. 커밋: git commit -m "..."
# [ ] 5. GitHub 푸시: git push origin main
# [ ] 6. GitLab 푸시: git push gitlab main
# [ ] 7. Jenkins 빌드 상태 확인
# [ ] 8. 애플리케이션 접속 확인: http://te-data-generator.tx-local.thinkingdata.cn
```

---

## 💡 팁 및 베스트 프랙티스

### 1. 배포 전 로컬 테스트
```bash
# Backend 테스트
cd data-generator
npm run api

# Frontend 테스트
cd frontend
npm run dev
```

### 2. Docker 이미지 로컬 빌드 테스트
```bash
# 배포 전 Docker 이미지가 정상적으로 빌드되는지 확인
docker build -f data-generator/Dockerfile -t test-backend .
docker build -f frontend/Dockerfile -t test-frontend ./frontend
```

### 3. 커밋 메시지 컨벤션
- `feat:` - 새로운 기능
- `fix:` - 버그 수정
- `docs:` - 문서 변경
- `refactor:` - 코드 리팩토링
- `perf:` - 성능 개선
- `test:` - 테스트 추가/수정
- `chore:` - 빌드/설정 변경

### 4. VPN 연결 자동 확인 스크립트 (선택 사항)
```bash
#!/bin/bash
# check-vpn.sh

if curl -s --connect-timeout 5 http://10.27.249.150:8888 > /dev/null; then
    echo "✅ VPN 연결됨"
else
    echo "❌ VPN 연결 안됨 - VPN을 켜주세요!"
    exit 1
fi
```

---

## 🎯 요약

### 필수 정보
- **VPN 필수**: GitLab 푸시 전 반드시 VPN 연결
- **GitLab URL**: `http://10.27.249.150:8888/korea/te_data_generator.git`
- **애플리케이션 URL**: `http://te-data-generator.tx-local.thinkingdata.cn`
- **배포 방식**: Jenkins 자동 배포 (GitLab CI 비활성화)
- **Namespace**: `korea`

### 배포 순서
1. VPN 연결 ✅
2. Git 커밋 ✅
3. GitHub 푸시 ✅
4. GitLab 푸시 ✅ (VPN 필요)
5. Jenkins 자동 배포 대기 ✅
6. 애플리케이션 확인 ✅
