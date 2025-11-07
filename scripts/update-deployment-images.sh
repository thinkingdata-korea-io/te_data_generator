#!/bin/bash

# Deployment YAML에서 이미지 주소를 업데이트하는 스크립트
# 사용법: ./scripts/update-deployment-images.sh <registry> <version>
# 예시: ./scripts/update-deployment-images.sh harbor.your-domain.com/te v1.0.0

set -e

if [ "$#" -ne 2 ]; then
    echo "사용법: $0 <registry> <version>"
    echo "예시: $0 harbor.your-domain.com/te v1.0.0"
    exit 1
fi

REGISTRY=$1
VERSION=$2
BACKEND_IMAGE="${REGISTRY}/te-data-generator-backend:${VERSION}"
FRONTEND_IMAGE="${REGISTRY}/te-data-generator-frontend:${VERSION}"
DEPLOYMENT_FILE="k8s/deployment.yaml"

echo "=========================================="
echo "Deployment 이미지 주소 업데이트"
echo "=========================================="
echo "Backend Image: ${BACKEND_IMAGE}"
echo "Frontend Image: ${FRONTEND_IMAGE}"
echo "=========================================="

# 백업 생성
cp "${DEPLOYMENT_FILE}" "${DEPLOYMENT_FILE}.backup"
echo "✅ 백업 생성: ${DEPLOYMENT_FILE}.backup"

# Mac과 Linux 모두 호환되도록 sed 사용
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s|image: your-registry/te-data-generator-backend:.*|image: ${BACKEND_IMAGE}|g" "${DEPLOYMENT_FILE}"
    sed -i '' "s|image: your-registry/te-data-generator-frontend:.*|image: ${FRONTEND_IMAGE}|g" "${DEPLOYMENT_FILE}"
else
    # Linux
    sed -i "s|image: your-registry/te-data-generator-backend:.*|image: ${BACKEND_IMAGE}|g" "${DEPLOYMENT_FILE}"
    sed -i "s|image: your-registry/te-data-generator-frontend:.*|image: ${FRONTEND_IMAGE}|g" "${DEPLOYMENT_FILE}"
fi

echo "✅ 이미지 주소가 업데이트되었습니다"
echo ""
echo "변경 사항:"
grep "image:" "${DEPLOYMENT_FILE}" | grep -E "(backend|frontend)"
echo ""
