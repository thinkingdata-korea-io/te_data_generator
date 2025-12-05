#!/bin/bash
# Vultr 서버에서 애플리케이션을 관리하기 위한 스크립트
# 실행 방법: bash manage-app.sh [command]

set -e

# 앱 디렉토리 설정
APP_DIR=$(pwd)
COMPOSE_FILE="${APP_DIR}/docker-compose.yml"

# 환경 변수 로드
if [ -f ~/.env ]; then
    source ~/.env
fi

# 명령어 검사
if [ $# -eq 0 ]; then
    echo "사용법: $0 [start|stop|restart|status|logs|update]"
    exit 1
fi

# 기능 구현
case "$1" in
    start)
        echo "🚀 애플리케이션 시작 중..."
        docker-compose -f ${COMPOSE_FILE} up -d
        echo "✅ 애플리케이션이 시작되었습니다."
        ;;
    stop)
        echo "🛑 애플리케이션 중지 중..."
        docker-compose -f ${COMPOSE_FILE} down
        echo "✅ 애플리케이션이 중지되었습니다."
        ;;
    restart)
        echo "🔄 애플리케이션 재시작 중..."
        docker-compose -f ${COMPOSE_FILE} restart
        echo "✅ 애플리케이션이 재시작되었습니다."
        ;;
    status)
        echo "📊 애플리케이션 상태:"
        docker-compose -f ${COMPOSE_FILE} ps
        ;;
    logs)
        if [ $# -eq 2 ]; then
            echo "📜 $2 서비스의 로그 출력:"
            docker-compose -f ${COMPOSE_FILE} logs --tail=100 -f "$2"
        else
            echo "📜 전체 로그 출력:"
            docker-compose -f ${COMPOSE_FILE} logs --tail=50 -f
        fi
        ;;
    update)
        echo "🔄 코드 업데이트 중..."
        git pull
        
        echo "🏗️ 컨테이너 재빌드 및 재시작 중..."
        docker-compose -f ${COMPOSE_FILE} down
        docker-compose -f ${COMPOSE_FILE} build
        docker-compose -f ${COMPOSE_FILE} up -d
        
        echo "✅ 업데이트가 완료되었습니다."
        ;;
    *)
        echo "⚠️ 잘못된 명령어입니다. 사용 가능한 명령어: start, stop, restart, status, logs, update"
        exit 1
        ;;
esac

exit 0