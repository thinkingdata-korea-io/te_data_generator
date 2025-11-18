# TE Data Generator 배포 가이드

## 배포 아키텍처

- **백엔드**: `10.27.249.150:3001` (내부 서버)
- **프론트엔드**: Vercel (공개)
- **접근**: VPN 연결 필요

---

## 1. 백엔드 배포 (10.27.249.150 서버)

### 방법 A: Docker 사용 (추천)

1. 스크립트 수정:
```bash
# deploy-backend-docker.sh 파일에서 USER 수정
nano deploy-backend-docker.sh
# USER="your_username"을 실제 사용자명으로 변경
```

2. 배포 실행:
```bash
./deploy-backend-docker.sh
```

3. 환경변수 설정 (서버에서):
```bash
ssh your_username@10.27.249.150
export ANTHROPIC_API_KEY="your_key_here"
docker restart te-data-generator
```

### 방법 B: Node.js 직접 실행

1. 스크립트 수정:
```bash
nano deploy-backend.sh
# USER 변경
```

2. 배포 실행:
```bash
./deploy-backend.sh
```

### 배포 확인

```bash
# 서버 상태 확인
curl http://10.27.249.150:3001/api/excel/list

# Docker 로그 확인 (Docker 사용 시)
ssh your_username@10.27.249.150 'docker logs -f te-data-generator'

# PM2 로그 확인 (Node.js 직접 실행 시)
ssh your_username@10.27.249.150 'pm2 logs te-data-generator'
```

---

## 2. 프론트엔드 배포 (Vercel)

### 사전 준비

1. GitHub에 코드 푸시
2. Vercel 계정 생성 (https://vercel.com)

### Vercel 배포 단계

1. **Vercel에서 New Project 클릭**

2. **GitHub 저장소 연결**

3. **프로젝트 설정**:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

4. **환경변수 설정** (중요!):
   ```
   API_URL=http://10.27.249.150:3001
   ```

5. **Deploy 클릭**

### 배포 후 확인

- Vercel이 제공하는 URL로 접속 (예: `https://your-project.vercel.app`)
- VPN 연결 후 기능 테스트

---

## 3. Git 커밋 및 푸시

배포 전 변경사항 커밋:

```bash
# 변경사항 확인
git status

# 마케팅 스키마 관련 파일 추가
git add data-generator/src/schemas/
git add data-generator/src/generators/marketing-generator.ts
git add docs/marketing_attribution_spec.md

# 수정된 파일 추가
git add data-generator/src/api/server.ts
git add data-generator/src/excel/parser.ts
git add data-generator/Dockerfile
git add data-generator/tsconfig.json

# K8s 설정 (선택사항)
git add k8s/

# 배포 스크립트
git add deploy-backend*.sh
git add vercel.json
git add DEPLOYMENT.md

# 커밋
git commit -m "Add marketing attribution schema and deployment setup

- Implement auto-injected marketing schema (install, adjust_ad_revenue events)
- Add 79 event properties + 5 user properties for marketing attribution
- Create MarketingGenerator for realistic ad data generation
- Add Kubernetes deployment configuration
- Add deployment scripts for internal server
- Configure Vercel deployment for frontend"

# 푸시
git push origin main
```

---

## 4. 업데이트 배포

### 백엔드 업데이트

```bash
# Docker 방식
./deploy-backend-docker.sh

# Node.js 방식
./deploy-backend.sh
```

### 프론트엔드 업데이트

```bash
# Git 푸시만 하면 Vercel이 자동 배포
git push origin main
```

---

## 5. 트러블슈팅

### 백엔드 접속 안 됨

1. 서버 방화벽 확인:
```bash
ssh your_username@10.27.249.150
sudo ufw status
sudo ufw allow 3001
```

2. 프로세스 확인:
```bash
# Docker
docker ps | grep te-data-generator

# PM2
pm2 list
```

### 프론트엔드에서 백엔드 연결 안 됨

1. **VPN 연결 확인**
2. **브라우저 콘솔에서 에러 확인**
3. **Vercel 환경변수 확인**:
   - Vercel 대시보드 → Settings → Environment Variables
   - `API_URL=http://10.27.249.150:3001` 확인

### CORS 에러

백엔드 서버에서 CORS 설정 확인:
```bash
# data-generator/src/api/server.ts에 이미 cors() 설정되어 있음
# 필요시 특정 도메인만 허용하도록 수정:
app.use(cors({
  origin: 'https://your-project.vercel.app'
}));
```

---

## 6. 모니터링

### 백엔드 모니터링

```bash
# 로그 실시간 확인
ssh your_username@10.27.249.150
docker logs -f te-data-generator  # Docker
# 또는
pm2 logs te-data-generator         # PM2
```

### 프론트엔드 모니터링

- Vercel 대시보드에서 배포 상태 및 로그 확인
- Analytics 탭에서 사용 현황 확인

---

## 보안 권장사항

1. **API Key 보호**:
   - 환경변수로 관리
   - .env 파일은 Git에 커밋하지 않기

2. **VPN 필수**:
   - 백엔드는 내부 IP이므로 VPN 없이는 접근 불가
   - 이것이 보안 장점!

3. **HTTPS 사용**:
   - 프론트엔드는 Vercel이 자동으로 HTTPS 제공

---

## 다음 단계

배포 완료 후:

1. ✅ Excel 파일 업로드 테스트
2. ✅ 마케팅 이벤트 자동 추가 확인
3. ✅ 데이터 생성 및 다운로드 테스트
4. 📊 사용자 피드백 수집
5. 🚀 기능 개선 및 업데이트
