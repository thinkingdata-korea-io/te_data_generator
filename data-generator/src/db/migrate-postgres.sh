#!/bin/bash

echo "🔄 PostgreSQL Docker 마이그레이션 시작..."
echo ""

# 1. 기존 컨테이너 찾기
echo "1️⃣ 기존 PostgreSQL 컨테이너 확인 중..."
CONTAINER_ID=$(docker ps -q -f "expose=5432" 2>/dev/null | head -1)

if [ -z "$CONTAINER_ID" ]; then
    echo "⚠️  실행 중인 PostgreSQL 컨테이너를 찾을 수 없습니다."
    echo "   포트 5432를 사용하는 다른 방법으로 찾는 중..."
    CONTAINER_ID=$(docker ps | grep 5432 | awk '{print $1}' | head -1)
fi

if [ ! -z "$CONTAINER_ID" ]; then
    echo "✅ 컨테이너 발견: $CONTAINER_ID"

    # 2. 컨테이너 중지
    echo ""
    echo "2️⃣ 기존 컨테이너 중지 중..."
    docker stop $CONTAINER_ID
    echo "✅ 컨테이너 중지 완료"

    # 3. 컨테이너 제거
    echo ""
    echo "3️⃣ 기존 컨테이너 제거 중..."
    docker rm $CONTAINER_ID
    echo "✅ 컨테이너 제거 완료"
else
    echo "ℹ️  기존 컨테이너가 없습니다. 새로 시작합니다."
fi

# 4. docker-compose로 시작
echo ""
echo "4️⃣ docker-compose로 PostgreSQL 시작 중..."
docker-compose up -d postgres

echo ""
echo "⏳ PostgreSQL 초기화 대기 중 (5초)..."
sleep 5

# 5. 상태 확인
echo ""
echo "5️⃣ 상태 확인 중..."
docker-compose ps postgres

# 6. 시간 동기화 확인
echo ""
echo "6️⃣ 시간 동기화 확인 중..."
echo "호스트 시간:"
date "+%Y-%m-%d %H:%M:%S"

echo ""
echo "PostgreSQL 시간:"
docker exec te_platform_postgres psql -U te_admin -d te_platform -c "SELECT NOW();" 2>/dev/null

echo ""
echo "✅ 마이그레이션 완료!"
echo ""
echo "📝 다음 명령어로 로그 확인 가능:"
echo "   docker-compose logs -f postgres"
