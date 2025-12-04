# 🏗️ 인프라 가이드 - Kubernetes & Storage

## 📋 목차

1. [개요](#개요)
2. [시스템 아키텍처](#시스템-아키텍처)
3. [Kubernetes 배포 구조](#kubernetes-배포-구조)
4. [스토리지 - PVC 완벽 가이드](#스토리지---pvc-완벽-가이드)
5. [데이터 흐름](#데이터-흐름)
6. [운영 가이드](#운영-가이드)
7. [트러블슈팅](#트러블슈팅)

---

## 개요

본 시스템은 **Kubernetes 기반 컨테이너 오케스트레이션**과 **Persistent Volume을 통한 영구 스토리지**를 사용하여 안정적인 데이터 생성 및 관리 환경을 제공합니다.

### 핵심 특징

- ✅ **컨테이너화된 마이크로서비스** (Frontend + Backend)
- ✅ **Persistent Volume을 통한 데이터 영속성**
- ✅ **자동 복구 및 스케일링** (Kubernetes)
- ✅ **GitLab CI/CD 파이프라인**
- ✅ **프라이빗 Docker Registry 사용**

---

## 시스템 아키텍처

### 전체 구성도

```
┌─────────────────────────────────────────────────────────────────┐
│                    External Access Layer                         │
│  Ingress Controller (ta-test.thinkingdata.cn)                   │
└────────────┬────────────────────────────────────────────────────┘
             │
    ┌────────┴────────┐
    │                 │
┌───▼─────────┐  ┌───▼─────────┐
│  Frontend   │  │  Backend    │
│  Service    │  │  Service    │
│  ClusterIP  │  │  ClusterIP  │
│  :3000      │  │  :3001      │
└─────┬───────┘  └─────┬───────┘
      │                │
┌─────▼─────────┐┌─────▼─────────┐
│ Frontend Pod  ││ Backend Pod   │
│ Next.js App   ││ Express API   │
│               ││               │
│ Resources:    ││ Resources:    │
│ 256Mi/512Mi   ││ 512Mi/2Gi     │
│ 250m/500m CPU ││ 500m/2000m CPU│
└───────────────┘└───┬───────────┘
                     │
         ┌───────────┴──────────┐
         │                      │
    ┌────▼────┐           ┌─────▼────┐
    │ data-pvc│           │logbus-pvc│
    │  500Gi  │           │   5Gi    │
    └────┬────┘           └─────┬────┘
         │                      │
    ┌────▼────────────────┬─────▼────┐
    │  Persistent Volume  │          │
    │  (NFS/Ceph/Local)   │          │
    └─────────────────────┴──────────┘
              │
    ┌─────────▼──────────┐
    │  Physical Storage  │
    │  (본사 서버실)      │
    └────────────────────┘
```

---

## Kubernetes 배포 구조

### 네임스페이스

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: korea
  labels:
    owner/name: korea
    owner/purpose: develop
```

**역할**: 리소스 격리 및 권한 관리

---

### Deployment - Backend

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: te-data-generator-backend
  namespace: korea
spec:
  replicas: 1
  selector:
    matchLabels:
      app: te-data-generator
      component: backend
  template:
    spec:
      containers:
        - name: backend
          image: docker-ta-inner.thinkingdata.cn/korea/data-generator-backend:latest
          ports:
            - containerPort: 3001
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: te-data-generator-secrets
                  key: database-url
          volumeMounts:
            - name: data
              mountPath: /app/output
            - name: logbus
              mountPath: /app/../logbus 2
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: data-pvc
```

**핵심 포인트**:
- Pod 내부 경로: `/app/output`
- PVC 마운트: `data-pvc` → 실제 스토리지
- Secret 사용: 민감정보 분리

---

### Deployment - Frontend

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: te-data-generator-frontend
  namespace: korea
spec:
  replicas: 1
  template:
    spec:
      containers:
        - name: frontend
          image: docker-ta-inner.thinkingdata.cn/korea/data-generator-frontend:latest
          ports:
            - containerPort: 3000
          env:
            - name: API_URL
              value: "http://te-data-generator-backend:3001"
```

**핵심 포인트**:
- 백엔드 호출: Service DNS 사용 (`te-data-generator-backend:3001`)
- 스토리지 불필요 (정적 파일은 이미지에 포함)

---

### Service

```yaml
# Backend Service
apiVersion: v1
kind: Service
metadata:
  name: te-data-generator-backend
  namespace: korea
spec:
  type: ClusterIP
  ports:
    - port: 3001
      targetPort: 3001
  selector:
    app: te-data-generator
    component: backend

---
# Frontend Service
apiVersion: v1
kind: Service
metadata:
  name: te-data-generator-frontend
  namespace: korea
spec:
  type: ClusterIP
  ports:
    - port: 3000
      targetPort: 3000
  selector:
    app: te-data-generator
    component: frontend
```

**역할**:
- Pod IP 추상화
- 로드 밸런싱
- 내부 DNS 제공 (`<service-name>.<namespace>.svc.cluster.local`)

---

### Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: te-data-generator-ingress
  namespace: korea
spec:
  rules:
    - host: ta-test.thinkingdata.cn
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: te-data-generator-frontend
                port:
                  number: 3000
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: te-data-generator-backend
                port:
                  number: 3001
```

**역할**:
- 외부 도메인 라우팅
- `/` → Frontend
- `/api` → Backend

---

## 스토리지 - PVC 완벽 가이드

### PVC란? (Persistent Volume Claim)

**간단 비유**:
```
PVC = 아파트 입주 신청서 (개발자가 작성)
PV  = 실제 아파트 (인프라팀이 제공)
StorageClass = 건설사 (자동으로 PV 생성)
```

---

### 3단계 스토리지 구조

#### 1️⃣ PVC (개발자가 요청)

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: data-pvc
  namespace: korea
spec:
  accessModes:
    - ReadWriteOnce  # 하나의 노드만 읽기/쓰기
  resources:
    requests:
      storage: 500Gi  # "500GB 주세요!"
```

**파일 위치**: `k8s/deployment.yaml`

#### 2️⃣ PV (인프라팀이 생성)

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: pv-data-001
spec:
  capacity:
    storage: 500Gi
  accessModes:
    - ReadWriteOnce
  # 실제 백엔드 스토리지 지정
  nfs:
    server: 192.168.1.100
    path: /mnt/k8s/data-pvc
```

**누가 만드나?**: 본사 인프라팀 (개발자는 만들지 않음)

#### 3️⃣ 실제 물리 스토리지

- **NFS Server**: `192.168.1.100:/mnt/k8s/data-pvc`
- **물리 디스크**: `/dev/sda2` (서버실 HDD/SSD)

---

### 스토리지 백엔드 종류

| 종류 | 설명 | 특징 | 사용 케이스 |
|------|------|------|-------------|
| **NFS** | Network File System | 여러 Pod 공유 가능 | 공유 파일 저장 |
| **Ceph** | 분산 스토리지 | 고가용성, 확장성 | 대용량 데이터 |
| **Local** | 노드 로컬 디스크 | 가장 빠름 | 단일 노드 전용 |
| **AWS EBS** | 클라우드 블록 스토리지 | 백업 쉬움 | AWS 환경 |
| **GCP PD** | Google Persistent Disk | 자동 관리 | GCP 환경 |

**본 프로젝트 추정**: NFS 또는 Ceph (ThinkingData 본사 인프라)

---

### AccessMode 설명

| Mode | 설명 | 동시 접근 |
|------|------|----------|
| **ReadWriteOnce (RWO)** | 하나의 노드만 읽기/쓰기 | ❌ 여러 Pod 불가 |
| **ReadOnlyMany (ROX)** | 여러 노드 읽기 전용 | ✅ 여러 Pod 읽기만 |
| **ReadWriteMany (RWX)** | 여러 노드 읽기/쓰기 | ✅ 여러 Pod 읽기/쓰기 |

**본 프로젝트**: `ReadWriteOnce` (단일 백엔드 Pod)

---

### S3 vs PVC 비교

| 구분 | S3 (Object Storage) | PVC (Block/File Storage) |
|------|---------------------|--------------------------|
| **접근 방식** | HTTP API (`aws s3 cp`) | 파일시스템 (`/app/output`) |
| **마운트** | ❌ 불가능 | ✅ `/app/output` 경로로 마운트 |
| **속도** | 느림 (네트워크 오버헤드) | 빠름 (로컬 디스크처럼) |
| **사용 방법** | SDK/CLI로 업로드 | 일반 파일 읽기/쓰기 (`fs.writeFileSync`) |
| **비용** | 저렴 (종량제) | 비쌈 (고정 용량) |
| **예시** | 백업, 로그 장기 보관 | 데이터베이스, 앱 데이터 |
| **백업** | 자동 복제 (내구성 99.999999999%) | 수동 백업 필요 |

**언제 PVC?**
- 파일시스템 접근 필요
- 빠른 I/O 필요
- Kubernetes 네이티브 통합

**언제 S3?**
- 장기 보관
- 백업/아카이브
- 비용 최적화

---

## 데이터 흐름

### 파일 생성 → 저장 → 조회 전체 흐름

```
1️⃣ 사용자가 "생성 시작" 클릭
   └→ Frontend: POST /api/generate/start

2️⃣ Backend Pod에서 데이터 생성
   └→ src/data-generator.ts
       fs.writeFileSync('/app/output/data/run_123/events.jsonl')

3️⃣ Kubernetes가 PVC를 통해 저장
   /app/output (Pod 내부 경로)
        ↓
   data-pvc (PersistentVolumeClaim)
        ↓
   pv-data-001 (PersistentVolume)
        ↓
   NFS: 192.168.1.100:/mnt/k8s/data-pvc/data/run_123/events.jsonl
        ↓
   물리 디스크: /dev/sda2

4️⃣ Pod 재시작 시에도 데이터 유지
   새 Pod 생성
        ↓
   같은 PVC 마운트 (data-pvc)
        ↓
   /app/output/data/run_123/events.jsonl (그대로 존재!)

5️⃣ 사용자가 파일 다운로드
   └→ Frontend: GET /api/generate/download-data/run_123
        └→ Backend: fs.readFileSync('/app/output/data/run_123/events.jsonl')
             └→ 압축 (ZIP)
                  └→ 다운로드
```

---

### 디렉토리 구조

```
/app/output/  (PVC 마운트 포인트)
├── data/                    # 생성된 데이터 (7일 보관)
│   └── run_1733123456789/
│       ├── events_20231201.jsonl
│       ├── events_20231202.jsonl
│       └── ...
├── runs/                    # 메타데이터 (7일 보관)
│   └── run_1733123456789/
│       └── metadata.json
├── analysis-excel/          # AI 분석 Excel (30일 보관)
│   ├── AI_Analysis_1733123456789.xlsx
│   └── ...
└── excel/                   # 업로드된 택소노미 (30일 보관)
    ├── event_taxonomy_v1.xlsx
    └── ...
```

**주의**: 위 경로는 모두 `.gitignore`에 포함되어 Git에 커밋되지 않음!

---

## 운영 가이드

### PVC 상태 확인

```bash
# PVC 목록 조회
kubectl get pvc -n korea

# 출력 예시:
# NAME        STATUS   VOLUME              CAPACITY   STORAGECLASS
# data-pvc    Bound    pv-nfs-data-001     500Gi      nfs-storage
# logbus-pvc  Bound    pv-nfs-logbus-001   5Gi        nfs-storage
```

**STATUS 의미**:
- `Bound`: PV와 연결 완료 ✅
- `Pending`: PV 할당 대기 중 ⏳
- `Lost`: PV 삭제됨 ❌

---

### PV 상세 정보 확인

```bash
# PV 이름 확인
kubectl get pvc data-pvc -n korea -o jsonpath='{.spec.volumeName}'

# PV 상세 조회
kubectl describe pv <PV_NAME>
```

**출력 예시**:
```yaml
Name:            pv-nfs-data-001
Capacity:        500Gi
Access Modes:    RWO
StorageClass:    nfs-storage
Status:          Bound
Claim:           korea/data-pvc
Source:
  Type:      NFS
  Server:    192.168.1.100
  Path:      /mnt/k8s/data-pvc
  ReadOnly:  false
```

➡️ **실제 저장 위치**: `192.168.1.100:/mnt/k8s/data-pvc`

---

### 용량 사용량 확인

#### 방법 1: Pod 내부에서 확인

```bash
# Pod 접속
kubectl exec -it <pod-name> -n korea -- /bin/sh

# 용량 확인
df -h /app/output
```

**출력 예시**:
```
Filesystem      Size  Used  Avail  Use%  Mounted on
nfs-server      500G  120G   380G   24%  /app/output
```

#### 방법 2: Kubernetes Metrics

```bash
# Metrics Server 설치 필요
kubectl top pvc -n korea
```

---

### 데이터 백업

#### 수동 백업 (관리자)

```bash
# Pod에서 로컬로 복사
kubectl cp korea/<pod-name>:/app/output/data ./backup/

# 압축
tar -czf backup_$(date +%Y%m%d).tar.gz ./backup/

# S3 업로드 (선택)
aws s3 cp backup_20231201.tar.gz s3://my-backup-bucket/
```

#### 자동 백업 (CronJob 예시)

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: backup-data
  namespace: korea
spec:
  schedule: "0 2 * * *"  # 매일 새벽 2시
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: backup
              image: alpine
              command:
                - /bin/sh
                - -c
                - tar -czf /backup/data_$(date +\%Y\%m\%d).tar.gz /app/output/data
              volumeMounts:
                - name: data
                  mountPath: /app/output
          volumes:
            - name: data
              persistentVolumeClaim:
                claimName: data-pvc
```

---

### PVC 용량 확장

#### 1. StorageClass 확인

```bash
kubectl get storageclass
```

**allowVolumeExpansion: true** 여부 확인

#### 2. PVC 용량 수정

```bash
# PVC 편집
kubectl edit pvc data-pvc -n korea

# storage: 500Gi → 1Ti 변경
```

#### 3. Pod 재시작

```bash
kubectl rollout restart deployment te-data-generator-backend -n korea
```

---

## 트러블슈팅

### 문제 1: PVC가 Pending 상태

**증상**:
```bash
kubectl get pvc -n korea
# NAME       STATUS    VOLUME   CAPACITY
# data-pvc   Pending   -        -
```

**원인**:
- PV가 없음
- StorageClass 미설정
- 용량 부족

**해결**:
```bash
# PV 목록 확인
kubectl get pv

# StorageClass 확인
kubectl get storageclass

# PVC 이벤트 확인
kubectl describe pvc data-pvc -n korea
```

➡️ 인프라팀에 PV 생성 요청

---

### 문제 2: Pod가 CrashLoopBackOff

**증상**:
```bash
kubectl get pods -n korea
# NAME                           STATUS             RESTARTS
# backend-xxx                    CrashLoopBackOff   5
```

**원인**:
- PVC 마운트 실패
- 권한 문제

**해결**:
```bash
# Pod 로그 확인
kubectl logs <pod-name> -n korea

# 이벤트 확인
kubectl describe pod <pod-name> -n korea

# PVC 상태 확인
kubectl get pvc -n korea
```

---

### 문제 3: 파일이 사라짐

**증상**:
- `/app/output/data/run_123` 디렉토리가 없음

**원인**:
1. **자동 정리**: 7일 경과 후 삭제됨 (환경 변수 확인)
2. **PVC 삭제**: 누군가 PVC를 삭제함
3. **다른 PVC 마운트**: 잘못된 PVC 연결

**해결**:
```bash
# 1. 보관 기간 확인
kubectl get configmap -n korea
kubectl describe configmap te-data-generator-config -n korea

# 2. PVC 확인
kubectl get pvc -n korea
kubectl describe pvc data-pvc -n korea

# 3. Pod의 마운트 확인
kubectl describe pod <pod-name> -n korea | grep -A 5 "Mounts"
```

---

### 문제 4: 용량 부족

**증상**:
```bash
df -h /app/output
# Filesystem      Size  Used  Avail  Use%
# nfs-server      500G  500G     0G  100%
```

**해결**:
```bash
# 1. 오래된 파일 수동 삭제
kubectl exec -it <pod-name> -n korea -- rm -rf /app/output/data/run_old

# 2. PVC 용량 확장 (위 "PVC 용량 확장" 참고)

# 3. 보관 기간 단축
# Settings 페이지에서 DATA_RETENTION_DAYS 변경: 7일 → 3일
```

---

## GitLab CI/CD 파이프라인

### .gitlab-ci.yml 구조

```yaml
stages:
  - build
  - deploy

build-backend:
  stage: build
  script:
    - docker build -t docker-ta-inner.thinkingdata.cn/korea/data-generator-backend:latest ./data-generator
    - docker push docker-ta-inner.thinkingdata.cn/korea/data-generator-backend:latest

deploy-backend:
  stage: deploy
  script:
    - kubectl rollout restart deployment te-data-generator-backend -n korea
```

**트리거**:
- `main` 브랜치에 푸시 시 자동 빌드 & 배포

---

## 보안 고려사항

### Secret 관리

```bash
# Secret 생성
kubectl create secret generic te-data-generator-secrets \
  --from-literal=database-url='postgresql://user:pass@host:5432/db' \
  --from-literal=jwt-secret='your-secret-key' \
  -n korea

# Secret 확인 (값은 base64 인코딩됨)
kubectl get secret te-data-generator-secrets -n korea -o yaml
```

**주의**:
- ❌ Secret을 Git에 커밋하지 말 것
- ❌ 로그에 Secret 출력하지 말 것
- ✅ `k8s/secret.yaml`은 `.gitignore`에 포함됨

---

## 체크리스트

### 배포 전 확인사항

- [ ] PVC가 `Bound` 상태인가?
- [ ] Secret이 생성되어 있는가?
- [ ] Ingress가 올바른 도메인으로 설정되어 있는가?
- [ ] Docker 이미지가 최신 버전인가?
- [ ] 환경 변수가 올바르게 설정되어 있는가?

### 운영 중 모니터링

- [ ] Pod CPU/Memory 사용량
- [ ] PVC 용량 사용률
- [ ] 로그 에러 확인
- [ ] 자동 정리 작업 정상 작동 확인

---

## 요약

### 핵심 개념

| 개념 | 설명 |
|------|------|
| **Namespace** | 리소스 격리 단위 (`korea`) |
| **Deployment** | Pod 배포 및 관리 (replicas, image) |
| **Service** | Pod 로드 밸런싱 및 DNS |
| **Ingress** | 외부 도메인 라우팅 |
| **PVC** | 스토리지 요청서 (개발자가 작성) |
| **PV** | 실제 스토리지 (인프라팀이 제공) |
| **Secret** | 민감정보 저장 (DB URL, API Key) |

### 데이터 흐름 요약

```
코드: fs.writeFileSync('/app/output/file.xlsx')
  ↓
Pod: /app/output/file.xlsx
  ↓
PVC: data-pvc
  ↓
PV: pv-nfs-data-001
  ↓
NFS: 192.168.1.100:/mnt/k8s/data-pvc/file.xlsx
  ↓
물리 디스크: /dev/sda2
```

### 개발자가 알아야 할 것

✅ **알아야 함**:
- PVC 이름 (`data-pvc`)
- 마운트 경로 (`/app/output`)
- 보관 기간 정책 (7일/30일)
- 용량 제한 (500Gi)

❌ **몰라도 됨**:
- PV 생성 방법
- NFS 서버 설정
- StorageClass 설정
- 물리 디스크 구성

---

## 참고 자료

- [Kubernetes 공식 문서 - Persistent Volumes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
- [Kubernetes 공식 문서 - Storage Classes](https://kubernetes.io/docs/concepts/storage/storage-classes/)
- [프로젝트 배포 가이드](./deployment-guide.md)
- [프로젝트 아키텍처](./common/ARCHITECTURE.md)
