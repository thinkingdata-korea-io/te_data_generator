#!/bin/bash

# LogBus2 클린업 스크립트
# 사용법: ./scripts/cleanup-logbus.sh

set -e

LOGBUS_DIR="logbus 2"
LOG_DIR="$LOGBUS_DIR/log"

echo "🧹 LogBus2 클린업 시작..."

# 1. LogBus2 중지
echo "1️⃣ LogBus2 중지 중..."
cd "$LOGBUS_DIR"
./logbus stop || echo "⚠️  LogBus2가 이미 중지되어 있습니다."
cd ..

# 2. 로그 파일 삭제
echo "2️⃣ 로그 파일 삭제 중..."
rm -f "$LOG_DIR"/*.log
echo "✅ 로그 파일 삭제 완료"

# 3. 상태 확인
echo ""
echo "📊 현재 상태:"
ls -lh "$LOG_DIR"

echo ""
echo "✅ LogBus2 클린업 완료!"
echo ""
echo "💡 참고:"
echo "  - runtime/ 디렉토리는 자동으로 정리되지 않습니다."
echo "  - 완전히 초기화하려면: cd '$LOGBUS_DIR' && ./logbus reset"
