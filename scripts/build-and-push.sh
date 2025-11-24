#!/bin/bash

# Docker 이미지 빌드 및 푸시 스크립트
# 사용법: ./scripts/build-and-push.sh <registry> <version>
# 예시: ./scripts/build-and-push.sh harbor.your-domain.com/te v1.0.0

set -e

# 인자 확인
if [ "$#" -ne 2 ]; then
    echo "사용법: $0 <registry> <version>"
    echo "예시: $0 harbor.your-domain.com/te v1.0.0"
    exit 1
fi

REGISTRY=$1
VERSION=$2
BACKEND_IMAGE="${REGISTRY}/te-data-generator-backend:${VERSION}"
FRONTEND_IMAGE="${REGISTRY}/te-data-generator-frontend:${VERSION}"

echo "=========================================="
echo "Docker 이미지 빌드 및 푸시"
echo "=========================================="
echo "Registry: ${REGISTRY}"
echo "Version: ${VERSION}"
echo "Backend Image: ${BACKEND_IMAGE}"
echo "Frontend Image: ${FRONTEND_IMAGE}"
echo "=========================================="

# Backend 빌드
echo ""
echo "[1/4] Building Backend Docker image..."
# 모노레포 루트에서 빌드 (excel-schema-generator 접근을 위해)
docker build -f data-generator/Dockerfile -t "${BACKEND_IMAGE}" .
docker tag "${BACKEND_IMAGE}" "${REGISTRY}/te-data-generator-backend:latest"
echo "✅ Backend image built successfully"

# Backend 푸시
echo ""
echo "[2/4] Pushing Backend image to registry..."
docker push "${BACKEND_IMAGE}"
docker push "${REGISTRY}/te-data-generator-backend:latest"
echo "✅ Backend image pushed successfully"

# Frontend 빌드
echo ""
echo "[3/4] Building Frontend Docker image..."
docker build -f frontend/Dockerfile -t "${FRONTEND_IMAGE}" .
docker tag "${FRONTEND_IMAGE}" "${REGISTRY}/te-data-generator-frontend:latest"
echo "✅ Frontend image built successfully"

# Frontend 푸시
echo ""
echo "[4/4] Pushing Frontend image to registry..."
docker push "${FRONTEND_IMAGE}"
docker push "${REGISTRY}/te-data-generator-frontend:latest"
echo "✅ Frontend image pushed successfully"

echo ""
echo "=========================================="
echo "✅ 모든 이미지가 성공적으로 빌드되고 푸시되었습니다!"
echo "=========================================="
echo ""
echo "다음 단계:"
echo "1. k8s/deployment.yaml 에서 이미지 주소를 다음으로 업데이트:"
echo "   - ${BACKEND_IMAGE}"
echo "   - ${FRONTEND_IMAGE}"
echo ""
echo "2. 배포 실행:"
echo "   ./scripts/deploy.sh"
echo ""
