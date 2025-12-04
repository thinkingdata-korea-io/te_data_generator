#!/bin/bash
# 올인원 프로덕션 서버 설치 스크립트
# 서버: 141.164.45.95
# 목적: PostgreSQL + K3s + 애플리케이션 배포

set -e

echo "🚀 프로덕션 서버 환경 구축 시작..."
echo "📍 서버: 141.164.45.95"
echo ""

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${GREEN}==>${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# ============================================
# Step 1: 시스템 업데이트
# ============================================
print_step "Step 1: 시스템 업데이트"
apt-get update
apt-get upgrade -y
apt-get install -y curl wget git vim

# ============================================
# Step 2: Docker 설치
# ============================================
print_step "Step 2: Docker 설치"

if command -v docker &> /dev/null; then
    echo "✅ Docker 이미 설치됨"
else
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl start docker
    systemctl enable docker
    echo "✅ Docker 설치 완료"
fi

docker --version

# ============================================
# Step 3: PostgreSQL 설치 및 설정
# ============================================
print_step "Step 3: PostgreSQL 15 설치"

if command -v psql &> /dev/null; then
    echo "✅ PostgreSQL 이미 설치됨"
else
    # PostgreSQL 저장소 추가
    sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
    wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -

    apt-get update
    apt-get install -y postgresql-15 postgresql-contrib-15

    systemctl start postgresql
    systemctl enable postgresql
    echo "✅ PostgreSQL 설치 완료"
fi

# PostgreSQL 설정
print_step "데이터베이스 및 사용자 생성"

sudo -u postgres psql -c "SELECT 1 FROM pg_database WHERE datname = 'te_platform'" | grep -q 1 || \
sudo -u postgres psql <<EOF
CREATE DATABASE te_platform;
CREATE USER te_admin WITH ENCRYPTED PASSWORD 'te_password_2025';
GRANT ALL PRIVILEGES ON DATABASE te_platform TO te_admin;
ALTER DATABASE te_platform OWNER TO te_admin;
\c te_platform
GRANT ALL ON SCHEMA public TO te_admin;
EOF

echo "✅ 데이터베이스 생성 완료"

# PostgreSQL 외부 접속 허용
print_step "PostgreSQL 외부 접속 설정"

PG_CONF="/etc/postgresql/15/main/postgresql.conf"
PG_HBA="/etc/postgresql/15/main/pg_hba.conf"

# listen_addresses 설정
sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/g" "$PG_CONF"
sed -i "s/listen_addresses = 'localhost'/listen_addresses = '*'/g" "$PG_CONF"

# 로컬호스트에서 접속 허용
grep -q "host.*all.*all.*127.0.0.1/32.*md5" "$PG_HBA" || \
echo "host    all             all             127.0.0.1/32            md5" >> "$PG_HBA"

# K3s pod CIDR에서 접속 허용 (10.42.0.0/16)
grep -q "host.*all.*all.*10.42.0.0/16.*md5" "$PG_HBA" || \
echo "host    all             all             10.42.0.0/16            md5" >> "$PG_HBA"

systemctl restart postgresql

echo "✅ PostgreSQL 설정 완료"

# 연결 테스트
print_step "PostgreSQL 연결 테스트"
sudo -u postgres psql -h 127.0.0.1 -U te_admin -d te_platform -c "SELECT version();" 2>&1 | grep PostgreSQL && echo "✅ 연결 성공!" || echo "⚠️  연결 실패"

# ============================================
# Step 4: K3s (Kubernetes) 설치
# ============================================
print_step "Step 4: K3s (Kubernetes) 설치"

if command -v kubectl &> /dev/null; then
    echo "✅ K3s 이미 설치됨"
else
    curl -sfL https://get.k3s.io | sh -s - --write-kubeconfig-mode 644

    # kubectl 설정
    export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
    echo "export KUBECONFIG=/etc/rancher/k3s/k3s.yaml" >> ~/.bashrc

    # K3s 시작 대기
    sleep 10

    echo "✅ K3s 설치 완료"
fi

kubectl version --short

# K3s 노드 확인
print_step "K3s 노드 상태 확인"
kubectl get nodes

# ============================================
# Step 5: 애플리케이션 코드 다운로드
# ============================================
print_step "Step 5: 애플리케이션 코드 다운로드"

APP_DIR="/opt/te-data-generator"

if [ -d "$APP_DIR" ]; then
    echo "⚠️  기존 디렉토리 발견. 업데이트 중..."
    cd "$APP_DIR"
    git pull
else
    git clone https://github.com/thinkingdata-korea-io/te_data_generator.git "$APP_DIR"
    cd "$APP_DIR"
fi

echo "✅ 코드 다운로드 완료"

# ============================================
# Step 6: Docker 이미지 빌드
# ============================================
print_step "Step 6: Docker 이미지 빌드"

# Backend 이미지 빌드
docker build -f data-generator/Dockerfile -t te-data-generator-backend:latest .

# Frontend 이미지 빌드
docker build -f frontend/Dockerfile -t te-data-generator-frontend:latest .

echo "✅ 이미지 빌드 완료"

# K3s에 이미지 import (K3s는 containerd 사용)
# docker save te-data-generator-backend:latest | k3s ctr images import -
# docker save te-data-generator-frontend:latest | k3s ctr images import -

# ============================================
# Step 7: Kubernetes Secret 생성
# ============================================
print_step "Step 7: Kubernetes Secret 생성"

# Namespace 생성
kubectl apply -f k8s/namespace.yaml

# 기존 Secret 삭제 (있다면)
kubectl delete secret te-data-generator-secrets -n korea 2>/dev/null || true

# Secret 생성
# ANTHROPIC_API_KEY 환경변수 확인
if [ -z "$ANTHROPIC_API_KEY" ]; then
    print_warning "ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다."
    echo "다음 명령어로 Secret을 수동으로 생성하세요:"
    echo ""
    echo "kubectl create secret generic te-data-generator-secrets -n korea \\"
    echo "  --from-literal=database-url=\"postgresql://te_admin:te_password_2025@127.0.0.1:5432/te_platform\" \\"
    echo "  --from-literal=jwt-secret=\"te_platform_secret_key_change_in_production_2025\" \\"
    echo "  --from-literal=anthropic-api-key=\"YOUR_ANTHROPIC_API_KEY\""
    echo ""
    read -p "계속하려면 Enter를 누르세요 (Secret은 나중에 생성)..."
else
    kubectl create secret generic te-data-generator-secrets -n korea \
      --from-literal=database-url="postgresql://te_admin:te_password_2025@127.0.0.1:5432/te_platform" \
      --from-literal=jwt-secret="te_platform_secret_key_change_in_production_2025" \
      --from-literal=anthropic-api-key="$ANTHROPIC_API_KEY"
    echo "✅ Secret 생성 완료"
fi

echo "✅ Secret 생성 완료"

# ============================================
# Step 8: 애플리케이션 배포
# ============================================
print_step "Step 8: 애플리케이션 배포"

# ConfigMap 적용
kubectl apply -f k8s/configmap.yaml -n korea

# Deployment 적용 (postgres.yaml은 제외 - 서버에 직접 설치함)
kubectl apply -f k8s/deployment.yaml -n korea

# Service 적용
kubectl apply -f k8s/service.yaml -n korea

# Ingress 적용
kubectl apply -f k8s/ingress.yaml -n korea

echo "✅ 애플리케이션 배포 완료"

# ============================================
# Step 9: 배포 상태 확인
# ============================================
print_step "Step 9: 배포 상태 확인"

echo ""
echo "⏳ Pod 생성 대기 중 (30초)..."
sleep 30

echo ""
echo "📊 Deployment 상태:"
kubectl get deployments -n korea

echo ""
echo "🏃 Pod 상태:"
kubectl get pods -n korea

echo ""
echo "🌐 Service 상태:"
kubectl get svc -n korea

echo ""
echo "🔀 Ingress 상태:"
kubectl get ingress -n korea

# ============================================
# 완료
# ============================================
echo ""
echo "============================================"
echo "✅ 프로덕션 서버 구축 완료!"
echo "============================================"
echo ""
echo "📊 시스템 정보:"
echo "  - 서버 IP: 141.164.45.95"
echo "  - PostgreSQL: 127.0.0.1:5432"
echo "  - Database: te_platform"
echo "  - K8s Namespace: korea"
echo ""
echo "🔗 접속 정보:"
echo "  - Frontend: http://141.164.45.95:8080 (또는 Ingress 설정에 따라)"
echo "  - Backend API: http://141.164.45.95:3001"
echo ""
echo "📝 유용한 명령어:"
echo "  - Pod 로그 확인: kubectl logs -f <pod-name> -n korea"
echo "  - Pod 재시작: kubectl rollout restart deployment/<name> -n korea"
echo "  - PostgreSQL 접속: psql -h 127.0.0.1 -U te_admin -d te_platform"
echo ""
echo "⚠️  주의사항:"
echo "  - 방화벽에서 80, 3001, 8080 포트를 열어야 외부 접속 가능"
echo "  - 도메인 연결 시 Ingress 설정 수정 필요"
echo ""
