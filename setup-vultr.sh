#!/bin/bash
# Vultr 서버 초기 설정 스크립트
# 실행 방법: sudo bash setup-vultr.sh

set -e

echo "===== Vultr 서버 설정을 시작합니다 ====="

# 시스템 업데이트
echo "🔄 시스템 업데이트 중..."
apt update && apt upgrade -y

# 필수 패키지 설치
echo "📦 필수 패키지 설치 중..."
apt install -y \
    curl \
    git \
    htop \
    vim \
    wget \
    gnupg \
    lsb-release \
    ca-certificates \
    apt-transport-https \
    software-properties-common

# Docker 설치
echo "🐳 Docker 설치 중..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl enable docker
    systemctl start docker
    usermod -aG docker $USER
    echo "Docker 설치 완료"
else
    echo "Docker가 이미 설치되어 있습니다"
fi

# Docker Compose 설치
echo "🐙 Docker Compose 설치 중..."
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    echo "Docker Compose 설치 완료"
else
    echo "Docker Compose가 이미 설치되어 있습니다"
fi

# 애플리케이션 디렉토리 생성
echo "📁 애플리케이션 디렉토리 생성 중..."
mkdir -p ~/app/data-generator/uploads
mkdir -p ~/app/output

# 환경 변수 파일 생성
echo "⚙️ 환경 변수 파일 생성 중..."
cat > ~/.env << EOL
# 데이터베이스 설정
POSTGRES_DB=te_platform
POSTGRES_USER=te_admin
POSTGRES_PASSWORD=te_password_$(date +%Y)

# JWT 시크릿
JWT_SECRET=vultr_platform_secret_key_$(openssl rand -hex 12)

# Anthropic API 키 (필요시 설정)
# ANTHROPIC_API_KEY=your-anthropic-api-key-here
EOL

echo "⚠️ ~/.env 파일에 ANTHROPIC_API_KEY를 설정해주세요!"

echo "✅ Vultr 서버 설정이 완료되었습니다."
echo "💡 다음 단계: 코드를 클론하고 애플리케이션을 실행하세요."
echo "💡 예시: "
echo "  git clone <repository-url> ~/app"
echo "  cd ~/app"
echo "  source ~/.env"
echo "  docker-compose up -d"

echo "===== 설정 완료 ====="