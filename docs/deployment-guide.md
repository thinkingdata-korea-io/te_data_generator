# 배포 가이드 - Git & Docker 워크플로우

## 목차
1. [플랫폼별 역할](#플랫폼별-역할)
2. [일상적인 개발 워크플로우](#일상적인-개발-워크플로우)
3. [릴리스 배포 워크플로우](#릴리스-배포-워크플로우)
4. [GitHub/GitLab 미러링](#githubgitlab-미러링)
5. [CI/CD 자동화](#cicd-자동화)
6. [Docker 이미지 관리](#docker-이미지-관리)
7. [배포 전략](#배포-전략)

---

## 플랫폼별 역할

### GitHub / GitLab (소스 코드 저장소)

**역할**:
- 📝 코드 버전 관리
- 👥 팀 협업 및 코드 리뷰
- 📋 이슈 트래킹
- 📚 문서 관리

**푸시 시점**:
- ✅ 코드가 변경될 때마다 (가장 자주)
- ✅ 기능 개발 완료 시
- ✅ 버그 수정 시
- ✅ 문서 업데이트 시
- ✅ 설정 파일 변경 시

**언제 푸시하지 않나요?**
- ❌ 빌드 결과물 (node_modules, dist, build 등)
- ❌ 환경 변수 파일 (.env)
- ❌ 로그 파일
- ❌ 임시 파일

---

### Docker Hub / Docker Registry (컨테이너 이미지 저장소)

**역할**:
- 🐳 빌드된 Docker 이미지 배포
- 🔄 버전별 이미지 관리
- 📦 운영 환경 배포용

**푸시 시점**:
- ✅ 새 버전 릴리스 시 (예: v1.0.0, v1.1.0)
- ✅ 배포 준비가 완료된 안정적인 빌드
- ✅ Hotfix 배포 시
- ❌ 개발 중인 코드 변경마다 푸시하지 않음 (불필요)

**언제 푸시하지 않나요?**
- ❌ 로컬 개발 및 테스트 중
- ❌ PR/MR이 머지되기 전
- ❌ 불안정한 개발 중인 기능

---

## 일상적인 개발 워크플로우

### 1. 기본 개발 사이클

```bash
# 1. 작업 브랜치 생성
git checkout -b feature/add-new-feature

# 2. 코드 수정 및 로컬 테스트
npm run dev  # 로컬에서 테스트
npm run build  # 빌드 확인

# 3. 변경사항 커밋
git add .
git commit -m "feat: add new feature"

# 4. GitHub/GitLab에 푸시
git push origin feature/add-new-feature
```

**→ Docker 푸시 불필요** (로컬 개발 단계)

---

### 2. Pull Request / Merge Request 생성

```bash
# GitHub CLI 사용 (선택사항)
gh pr create --title "feat: add new feature" --body "..."

# 또는 웹 UI에서 PR 생성
# → 코드 리뷰
# → 승인 후 main 브랜치에 머지
```

**→ 여전히 Docker 푸시 불필요**

---

### 3. 브랜치 전략 (Git Flow)

```
main (production)
  ├── develop (개발 통합)
  │     ├── feature/user-auth (기능 개발)
  │     ├── feature/data-generator (기능 개발)
  │     └── bugfix/login-error (버그 수정)
  └── hotfix/critical-bug (긴급 수정)
```

**브랜치별 용도**:
- `main`: 프로덕션 배포용 (안정적인 코드만)
- `develop`: 개발 통합 브랜치
- `feature/*`: 새 기능 개발
- `bugfix/*`: 버그 수정
- `hotfix/*`: 긴급 수정
- `release/*`: 릴리스 준비

**예시**:
```bash
# 새 기능 개발
git checkout develop
git checkout -b feature/file-analyzer
# ... 개발 ...
git add .
git commit -m "feat: add file analyzer"
git push origin feature/file-analyzer
# → PR 생성 → 리뷰 → develop에 머지

# 릴리스 준비
git checkout develop
git checkout -b release/v1.2.0
# ... 마지막 테스트 및 버전 업데이트 ...
git push origin release/v1.2.0
# → PR 생성 → main에 머지 + 태그 생성
```

---

## 릴리스 배포 워크플로우

### 1. 버전 관리 (Semantic Versioning)

**버전 형식**: `MAJOR.MINOR.PATCH` (예: 1.2.3)

- **MAJOR**: 호환되지 않는 API 변경
- **MINOR**: 하위 호환되는 기능 추가
- **PATCH**: 하위 호환되는 버그 수정

**예시**:
- `1.0.0` → `1.0.1`: 버그 수정
- `1.0.1` → `1.1.0`: 새 기능 추가
- `1.1.0` → `2.0.0`: Breaking Change

---

### 2. 릴리스 프로세스

```bash
# 1. develop 브랜치에서 릴리스 브랜치 생성
git checkout develop
git checkout -b release/v1.2.0

# 2. package.json 버전 업데이트
npm version 1.2.0 --no-git-tag-version

# 3. CHANGELOG.md 업데이트
echo "## [1.2.0] - 2025-01-29
### Added
- AI 기반 파일 분석 기능
- 4-Mode 워크플로우 시스템

### Fixed
- 로그인 버그 수정
" >> CHANGELOG.md

# 4. 커밋 및 푸시
git add package.json CHANGELOG.md
git commit -m "chore: bump version to 1.2.0"
git push origin release/v1.2.0

# 5. PR 생성 (release/v1.2.0 → main)
# → 리뷰 및 승인

# 6. main 브랜치에 머지 후 태그 생성
git checkout main
git pull origin main
git tag -a v1.2.0 -m "Release version 1.2.0"
git push origin v1.2.0

# 7. develop 브랜치에도 반영
git checkout develop
git merge main
git push origin develop
```

**→ 이제 Docker 이미지 빌드 및 푸시**

---

### 3. Docker 이미지 빌드 및 푸시

#### Option 1: 수동 빌드 및 푸시

```bash
# 1. 백엔드 이미지 빌드
cd data-generator
docker build -t your-username/te-data-generator-backend:v1.2.0 .
docker tag your-username/te-data-generator-backend:v1.2.0 \
           your-username/te-data-generator-backend:latest

# 2. 프론트엔드 이미지 빌드
cd ../frontend
docker build -t your-username/te-data-generator-frontend:v1.2.0 .
docker tag your-username/te-data-generator-frontend:v1.2.0 \
           your-username/te-data-generator-frontend:latest

# 3. 로컬 테스트
docker-compose up

# 4. Docker Hub에 푸시
docker login
docker push your-username/te-data-generator-backend:v1.2.0
docker push your-username/te-data-generator-backend:latest
docker push your-username/te-data-generator-frontend:v1.2.0
docker push your-username/te-data-generator-frontend:latest
```

#### Option 2: Multi-platform 빌드 (ARM64 + AMD64)

```bash
# Buildx 설정 (최초 1회)
docker buildx create --name multiplatform --use
docker buildx inspect --bootstrap

# Multi-platform 빌드 및 푸시
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t your-username/te-data-generator-backend:v1.2.0 \
  -t your-username/te-data-generator-backend:latest \
  --push \
  ./data-generator
```

---

## GitHub/GitLab 미러링

### 1. GitHub와 GitLab 모두 사용하는 경우

**언제 필요한가?**
- 백업 용도
- 회사 정책 (내부 GitLab + 공개 GitHub)
- CI/CD 파이프라인이 양쪽에 있을 때

**설정 방법**:

```bash
# 1. 두 개의 remote 추가
git remote add github https://github.com/username/te-data-generator.git
git remote add gitlab https://gitlab.com/username/te-data-generator.git

# 2. 확인
git remote -v
# github    https://github.com/username/te-data-generator.git (fetch)
# github    https://github.com/username/te-data-generator.git (push)
# gitlab    https://gitlab.com/username/te-data-generator.git (fetch)
# gitlab    https://gitlab.com/username/te-data-generator.git (push)

# 3. 양쪽에 푸시
git push github main
git push gitlab main
```

---

### 2. 자동 미러링 설정

#### 방법 1: Git Config 설정

```bash
# .git/config 파일 수정
[remote "origin"]
    url = https://github.com/username/te-data-generator.git
    fetch = +refs/heads/*:refs/remotes/origin/*

[remote "all"]
    url = https://github.com/username/te-data-generator.git
    url = https://gitlab.com/username/te-data-generator.git

# 이후 한 번에 양쪽 푸시
git push all main
git push all --tags
```

#### 방법 2: GitHub Actions로 자동 미러링

```yaml
# .github/workflows/mirror-to-gitlab.yml
name: Mirror to GitLab

on:
  push:
    branches:
      - main
      - develop
  create:
    tags:

jobs:
  mirror:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - name: Mirror to GitLab
        env:
          GITLAB_TOKEN: ${{ secrets.GITLAB_TOKEN }}
        run: |
          git remote add gitlab https://oauth2:${GITLAB_TOKEN}@gitlab.com/username/te-data-generator.git
          git push gitlab --all
          git push gitlab --tags
```

---

## CI/CD 자동화

### 1. GitHub Actions (권장)

#### 전체 워크플로우 파일

```yaml
# .github/workflows/deploy.yml
name: Build and Deploy

on:
  push:
    branches:
      - main
      - develop
    tags:
      - 'v*.*.*'

jobs:
  test:
    name: Run Tests
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: data-generator/package-lock.json

      - name: Install dependencies
        working-directory: ./data-generator
        run: npm ci

      - name: Run type check
        working-directory: ./data-generator
        run: npm run type-check

      - name: Run tests
        working-directory: ./data-generator
        run: npm test

  build-and-push:
    name: Build and Push Docker Images
    needs: test
    runs-on: ubuntu-latest
    if: startsWith(github.ref, 'refs/tags/v')
    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2

      - name: Log in to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Extract version
        id: version
        run: echo "VERSION=${GITHUB_REF#refs/tags/}" >> $GITHUB_OUTPUT

      - name: Build and push backend
        uses: docker/build-push-action@v4
        with:
          context: ./data-generator
          platforms: linux/amd64,linux/arm64
          push: true
          tags: |
            ${{ secrets.DOCKER_USERNAME }}/te-data-generator-backend:${{ steps.version.outputs.VERSION }}
            ${{ secrets.DOCKER_USERNAME }}/te-data-generator-backend:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Build and push frontend
        uses: docker/build-push-action@v4
        with:
          context: ./frontend
          platforms: linux/amd64,linux/arm64
          push: true
          tags: |
            ${{ secrets.DOCKER_USERNAME }}/te-data-generator-frontend:${{ steps.version.outputs.VERSION }}
            ${{ secrets.DOCKER_USERNAME }}/te-data-generator-frontend:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    name: Deploy to Kubernetes
    needs: build-and-push
    runs-on: ubuntu-latest
    if: startsWith(github.ref, 'refs/tags/v')
    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Setup kubectl
        uses: azure/setup-kubectl@v3

      - name: Configure kubectl
        run: |
          echo "${{ secrets.KUBE_CONFIG }}" | base64 -d > kubeconfig
          export KUBECONFIG=kubeconfig

      - name: Update deployment
        run: |
          kubectl set image deployment/te-backend \
            te-backend=${{ secrets.DOCKER_USERNAME }}/te-data-generator-backend:${{ steps.version.outputs.VERSION }}
          kubectl set image deployment/te-frontend \
            te-frontend=${{ secrets.DOCKER_USERNAME }}/te-data-generator-frontend:${{ steps.version.outputs.VERSION }}

      - name: Wait for rollout
        run: |
          kubectl rollout status deployment/te-backend
          kubectl rollout status deployment/te-frontend
```

**Secrets 설정** (GitHub Repository Settings → Secrets):
- `DOCKER_USERNAME`: Docker Hub 사용자명
- `DOCKER_PASSWORD`: Docker Hub 토큰
- `KUBE_CONFIG`: Kubernetes 설정 (base64 인코딩)
- `GITLAB_TOKEN`: GitLab 미러링용 (선택)

---

### 2. GitLab CI/CD

```yaml
# .gitlab-ci.yml
stages:
  - test
  - build
  - deploy

variables:
  DOCKER_DRIVER: overlay2
  DOCKER_TLS_CERTDIR: "/certs"

# 테스트 단계
test:
  stage: test
  image: node:20
  cache:
    paths:
      - data-generator/node_modules/
  script:
    - cd data-generator
    - npm ci
    - npm run type-check
    - npm test
  only:
    - branches
    - tags

# Docker 빌드 (태그 푸시 시에만)
build-backend:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  before_script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD
  script:
    - cd data-generator
    - docker build -t $DOCKER_USERNAME/te-data-generator-backend:$CI_COMMIT_TAG .
    - docker tag $DOCKER_USERNAME/te-data-generator-backend:$CI_COMMIT_TAG \
                 $DOCKER_USERNAME/te-data-generator-backend:latest
    - docker push $DOCKER_USERNAME/te-data-generator-backend:$CI_COMMIT_TAG
    - docker push $DOCKER_USERNAME/te-data-generator-backend:latest
  only:
    - tags

build-frontend:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  before_script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD
  script:
    - cd frontend
    - docker build -t $DOCKER_USERNAME/te-data-generator-frontend:$CI_COMMIT_TAG .
    - docker tag $DOCKER_USERNAME/te-data-generator-frontend:$CI_COMMIT_TAG \
                 $DOCKER_USERNAME/te-data-generator-frontend:latest
    - docker push $DOCKER_USERNAME/te-data-generator-frontend:$CI_COMMIT_TAG
    - docker push $DOCKER_USERNAME/te-data-generator-frontend:latest
  only:
    - tags

# Kubernetes 배포
deploy:
  stage: deploy
  image: bitnami/kubectl:latest
  before_script:
    - echo "$KUBE_CONFIG" | base64 -d > kubeconfig
    - export KUBECONFIG=kubeconfig
  script:
    - kubectl set image deployment/te-backend te-backend=$DOCKER_USERNAME/te-data-generator-backend:$CI_COMMIT_TAG
    - kubectl set image deployment/te-frontend te-frontend=$DOCKER_USERNAME/te-data-generator-frontend:$CI_COMMIT_TAG
    - kubectl rollout status deployment/te-backend
    - kubectl rollout status deployment/te-frontend
  only:
    - tags
  when: manual
```

---

## Docker 이미지 관리

### 1. 태그 전략

**권장 태그 구조**:
```
your-username/te-data-generator-backend:v1.2.0      # 특정 버전
your-username/te-data-generator-backend:1.2         # Minor 버전
your-username/te-data-generator-backend:1           # Major 버전
your-username/te-data-generator-backend:latest      # 최신 안정 버전
your-username/te-data-generator-backend:develop     # 개발 버전 (선택)
```

**태그 생성 예시**:
```bash
# 특정 버전 빌드
docker build -t your-username/te-data-generator-backend:v1.2.3 .

# 추가 태그 생성
docker tag your-username/te-data-generator-backend:v1.2.3 \
           your-username/te-data-generator-backend:1.2
docker tag your-username/te-data-generator-backend:v1.2.3 \
           your-username/te-data-generator-backend:1
docker tag your-username/te-data-generator-backend:v1.2.3 \
           your-username/te-data-generator-backend:latest

# 모두 푸시
docker push your-username/te-data-generator-backend:v1.2.3
docker push your-username/te-data-generator-backend:1.2
docker push your-username/te-data-generator-backend:1
docker push your-username/te-data-generator-backend:latest
```

---

### 2. Docker Compose 배포

```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    image: your-username/te-data-generator-backend:latest
    container_name: te-backend
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    volumes:
      - ./output:/app/output
      - ./uploads:/app/uploads
    restart: unless-stopped

  frontend:
    image: your-username/te-data-generator-frontend:latest
    container_name: te-frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:3001
    depends_on:
      - backend
    restart: unless-stopped

  postgres:
    image: postgres:16
    container_name: te-postgres
    environment:
      - POSTGRES_DB=te_platform
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres-data:
```

**배포 명령어**:
```bash
# 최신 이미지 pull 및 실행
docker-compose pull
docker-compose up -d

# 로그 확인
docker-compose logs -f

# 재시작
docker-compose restart

# 중지 및 삭제
docker-compose down
```

---

### 3. 오래된 이미지 정리

```bash
# 사용하지 않는 이미지 삭제
docker image prune -a

# 특정 버전 이미지만 삭제
docker rmi your-username/te-data-generator-backend:v1.0.0

# Docker Hub에서 이미지 삭제 (CLI)
# 1. Docker Hub Personal Access Token 생성
# 2. 삭제 스크립트 사용
TOKEN="your-docker-hub-token"
curl -X DELETE \
  -H "Authorization: JWT ${TOKEN}" \
  https://hub.docker.com/v2/repositories/your-username/te-data-generator-backend/tags/v1.0.0/
```

---

## 배포 전략

### 1. Blue-Green 배포

**개념**: 구 버전(Blue)과 신 버전(Green)을 동시에 실행하고, 트래픽을 전환

```bash
# 1. 현재 버전 (Blue) 실행 중
docker-compose -f docker-compose-blue.yml up -d

# 2. 새 버전 (Green) 배포
docker-compose -f docker-compose-green.yml up -d

# 3. 헬스 체크
curl http://localhost:3002/health

# 4. 트래픽 전환 (Nginx 등)
# upstream backend {
#     server localhost:3001;  # Blue (기존)
# }
# →
# upstream backend {
#     server localhost:3002;  # Green (신규)
# }

# 5. Blue 버전 종료
docker-compose -f docker-compose-blue.yml down
```

---

### 2. Rolling Update (Kubernetes)

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: te-backend
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1  # 최대 1개 Pod만 동시 종료
      maxSurge: 1        # 최대 1개 추가 Pod 생성
  template:
    spec:
      containers:
      - name: te-backend
        image: your-username/te-data-generator-backend:v1.2.0
        ports:
        - containerPort: 3001
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 10
          periodSeconds: 5
```

**배포 명령어**:
```bash
# 이미지 업데이트
kubectl set image deployment/te-backend \
  te-backend=your-username/te-data-generator-backend:v1.2.0

# 롤아웃 상태 확인
kubectl rollout status deployment/te-backend

# 롤백 (문제 발생 시)
kubectl rollout undo deployment/te-backend
```

---

### 3. Canary 배포

**개념**: 신 버전을 일부 트래픽에만 먼저 배포하고, 점진적으로 확대

```yaml
# k8s/deployment-canary.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: te-backend-canary
spec:
  replicas: 1  # 전체의 10%
  template:
    metadata:
      labels:
        app: te-backend
        version: canary
    spec:
      containers:
      - name: te-backend
        image: your-username/te-data-generator-backend:v1.2.0
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: te-backend-stable
spec:
  replicas: 9  # 전체의 90%
  template:
    metadata:
      labels:
        app: te-backend
        version: stable
    spec:
      containers:
      - name: te-backend
        image: your-username/te-data-generator-backend:v1.1.0
```

**트래픽 분산** (Service):
```yaml
apiVersion: v1
kind: Service
metadata:
  name: te-backend
spec:
  selector:
    app: te-backend  # version 라벨 제외 → 자동 로드밸런싱
  ports:
  - port: 3001
    targetPort: 3001
```

---

## 요약 및 체크리스트

### 📋 일상 개발 체크리스트

- [ ] 코드 수정
- [ ] 로컬 테스트 (`npm run dev`)
- [ ] 빌드 확인 (`npm run build`)
- [ ] Git 커밋 및 푸시 (GitHub/GitLab)
- [ ] PR/MR 생성 및 리뷰
- [ ] ✅ 완료 (Docker 푸시 불필요)

---

### 🚀 릴리스 배포 체크리스트

- [ ] 버전 번호 결정 (Semantic Versioning)
- [ ] CHANGELOG.md 업데이트
- [ ] package.json 버전 업데이트
- [ ] 릴리스 브랜치 생성 (`release/vX.Y.Z`)
- [ ] PR 생성 및 리뷰
- [ ] main 브랜치에 머지
- [ ] Git 태그 생성 및 푸시 (`git tag vX.Y.Z`)
- [ ] Docker 이미지 빌드
- [ ] Docker Hub에 푸시
- [ ] 배포 환경 업데이트 (Kubernetes/Docker Compose)
- [ ] 헬스 체크 및 모니터링
- [ ] develop 브랜치에 반영

---

### 🤖 CI/CD 자동화 후 체크리스트

- [ ] Git 태그 생성 및 푸시 (`git tag vX.Y.Z`)
- [ ] GitHub Actions/GitLab CI 실행 확인
- [ ] ✅ 완료 (나머지는 자동)

---

### 📊 비교표

| 작업 | GitHub/GitLab | Docker Hub | 빈도 |
|------|---------------|------------|------|
| 코드 수정 | ✅ 푸시 | ❌ | 매일 |
| 기능 개발 | ✅ 푸시 | ❌ | 자주 |
| 버그 수정 | ✅ 푸시 | ❌ | 자주 |
| 릴리스 | ✅ 태그 | ✅ 이미지 푸시 | 가끔 (주 1회) |
| Hotfix | ✅ 태그 | ✅ 이미지 푸시 | 드물게 |

---

### 🎯 권장 워크플로우

**개발 중**:
```bash
git add .
git commit -m "feat: add new feature"
git push origin feature/new-feature
# → PR 생성 → 머지
```

**릴리스 시**:
```bash
git tag v1.2.0
git push origin v1.2.0
# → CI/CD가 자동으로:
#    ✅ 테스트 실행
#    ✅ Docker 이미지 빌드
#    ✅ Docker Hub 푸시
#    ✅ Kubernetes 배포
```

---

**작성자**: ThinkingData Korea
**날짜**: 2025-01-29
**버전**: 1.0.0
