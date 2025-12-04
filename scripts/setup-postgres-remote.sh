#!/bin/bash
# PostgreSQL 설치 및 설정 스크립트 (141.164.45.95 서버용)

set -e

echo "🐘 PostgreSQL 설치 및 설정 시작..."

# 1. PostgreSQL 저장소 추가 및 설치
echo "📦 PostgreSQL 15 설치 중..."
if command -v apt-get &> /dev/null; then
    # Ubuntu/Debian
    apt-get update
    apt-get install -y postgresql-15 postgresql-contrib-15
elif command -v yum &> /dev/null; then
    # CentOS/RHEL
    yum install -y https://download.postgresql.org/pub/repos/yum/reporpms/EL-$(rpm -E %{rhel})-x86_64/pgdg-redhat-repo-latest.noarch.rpm
    yum install -y postgresql15-server postgresql15-contrib
    /usr/pgsql-15/bin/postgresql-15-setup initdb
    systemctl enable postgresql-15
    systemctl start postgresql-15
fi

# 2. PostgreSQL 시작 및 활성화
echo "🚀 PostgreSQL 서비스 시작..."
systemctl start postgresql
systemctl enable postgresql

# 3. 데이터베이스 및 사용자 생성
echo "👤 데이터베이스 및 사용자 생성..."
sudo -u postgres psql <<EOF
-- 데이터베이스 생성
CREATE DATABASE te_platform;

-- 사용자 생성 및 비밀번호 설정
CREATE USER te_admin WITH ENCRYPTED PASSWORD 'te_password_2025';

-- 권한 부여
GRANT ALL PRIVILEGES ON DATABASE te_platform TO te_admin;

-- 연결 확인
\l
\du
EOF

echo "✅ 데이터베이스 생성 완료!"

# 4. 외부 접속 허용 설정
echo "🌐 외부 접속 설정 중..."

# postgresql.conf 수정 (모든 IP에서 접속 허용)
PG_CONF=$(sudo -u postgres psql -t -P format=unaligned -c 'SHOW config_file')
echo "PostgreSQL config: $PG_CONF"

# listen_addresses 설정
sudo sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/g" "$PG_CONF"
sudo sed -i "s/listen_addresses = 'localhost'/listen_addresses = '*'/g" "$PG_CONF"

# pg_hba.conf 수정 (비밀번호 인증 허용)
PG_HBA=$(sudo -u postgres psql -t -P format=unaligned -c 'SHOW hba_file')
echo "PostgreSQL HBA: $PG_HBA"

# K8s에서 접속 허용 (모든 IP - 운영환경에서는 특정 IP로 제한 권장)
echo "host    all             all             0.0.0.0/0               md5" | sudo tee -a "$PG_HBA"

# 5. 방화벽 설정 (포트 5432 오픈)
echo "🔥 방화벽 설정..."
if command -v ufw &> /dev/null; then
    # Ubuntu (ufw)
    ufw allow 5432/tcp
    ufw reload
elif command -v firewall-cmd &> /dev/null; then
    # CentOS/RHEL (firewalld)
    firewall-cmd --permanent --add-port=5432/tcp
    firewall-cmd --reload
fi

# 6. PostgreSQL 재시작
echo "🔄 PostgreSQL 재시작..."
systemctl restart postgresql

# 7. 상태 확인
echo ""
echo "✅ 설치 완료!"
echo ""
echo "📊 PostgreSQL 상태:"
systemctl status postgresql --no-pager

echo ""
echo "🔗 연결 정보:"
echo "  Host: 141.164.45.95"
echo "  Port: 5432"
echo "  Database: te_platform"
echo "  User: te_admin"
echo "  Password: te_password_2025"
echo ""
echo "📝 K8s Secret용 DATABASE_URL:"
echo "  postgresql://te_admin:te_password_2025@141.164.45.95:5432/te_platform"
echo ""

# 8. 연결 테스트
echo "🧪 연결 테스트..."
sudo -u postgres psql -h localhost -U te_admin -d te_platform -c "SELECT version();" || echo "⚠️ 로컬 연결 실패 (비밀번호 입력 필요)"

echo ""
echo "✅ 모든 설정 완료!"
