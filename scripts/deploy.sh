#!/bin/bash

# Kubernetes 배포 스크립트
# 사용법: ./scripts/deploy.sh

set -e

echo "=========================================="
echo "ThinkingEngine 데이터 생성기 배포"
echo "=========================================="

# Secret 파일 확인
if [ ! -f "k8s/secret.yaml" ]; then
    echo "❌ 오류: k8s/secret.yaml 파일이 없습니다."
    echo ""
    echo "다음 단계를 수행하세요:"
    echo "1. k8s/secret.yaml.template을 복사:"
    echo "   cp k8s/secret.yaml.template k8s/secret.yaml"
    echo ""
    echo "2. API 키를 base64로 인코딩:"
    echo "   echo -n 'your-api-key' | base64"
    echo ""
    echo "3. k8s/secret.yaml 파일을 편집하여 인코딩된 키 입력"
    echo ""
    exit 1
fi

# 1. Secret 배포
echo ""
echo "[1/5] Deploying Secret..."
kubectl apply -f k8s/secret.yaml
echo "✅ Secret deployed"

# 2. ConfigMap 배포
echo ""
echo "[2/5] Deploying ConfigMap..."
kubectl apply -f k8s/configmap.yaml
echo "✅ ConfigMap deployed"

# 3. Deployment 배포
echo ""
echo "[3/5] Deploying Deployments..."
kubectl apply -f k8s/deployment.yaml
echo "✅ Deployments deployed"

# 4. Service 배포
echo ""
echo "[4/5] Deploying Services..."
kubectl apply -f k8s/service.yaml
echo "✅ Services deployed"

# 5. Ingress 배포 (선택사항)
if [ -f "k8s/ingress.yaml" ]; then
    read -p "Ingress를 배포하시겠습니까? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo "[5/5] Deploying Ingress..."
        kubectl apply -f k8s/ingress.yaml
        echo "✅ Ingress deployed"
    else
        echo "[5/5] Ingress 배포를 건너뜁니다."
    fi
else
    echo "[5/5] Ingress 파일이 없습니다. 건너뜁니다."
fi

echo ""
echo "=========================================="
echo "✅ 배포가 완료되었습니다!"
echo "=========================================="
echo ""

# 배포 상태 확인
echo "배포 상태 확인 중..."
echo ""
kubectl get pods -l app=te-data-generator
echo ""
kubectl get svc -l app=te-data-generator

echo ""
echo "=========================================="
echo "다음 명령어로 상태를 확인할 수 있습니다:"
echo "=========================================="
echo ""
echo "# Pod 로그 확인"
echo "kubectl logs -f deployment/te-data-generator-backend"
echo "kubectl logs -f deployment/te-data-generator-frontend"
echo ""
echo "# 포트 포워딩 (로컬 테스트)"
echo "kubectl port-forward svc/te-data-generator-frontend 3000:3000"
echo ""
echo "# 배포 상태 확인"
echo "kubectl get all -l app=te-data-generator"
echo ""
