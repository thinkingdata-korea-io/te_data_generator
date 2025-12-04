# Deployment Scripts

## deploy-k8s.sh

Kubernetes 배포 스크립트 (에러 무시 기능 포함)

### 사용법

```bash
# 기본 사용 (korea namespace)
./scripts/deploy-k8s.sh

# 다른 namespace 지정
NAMESPACE=production ./scripts/deploy-k8s.sh
```

### 주요 기능

1. **에러 무시**: 첫 배포 시 deployment가 없어도 에러 없이 진행
2. **멱등성**: 여러 번 실행해도 안전
3. **상세 로그**: 각 단계의 진행 상황 표시
4. **배포 상태 확인**: 배포 완료 후 상태 자동 출력

### 실행 순서

1. Namespace 생성/업데이트
2. ConfigMap 적용
3. Secret 확인 (없으면 경고만 표시)
4. 기존 Deployment 삭제 (없으면 무시)
5. 새 Deployment 생성
6. Service 생성
7. Ingress 생성
8. Rollout 완료 대기
9. 배포 상태 출력

### 필수 사전 작업

Secret은 수동으로 생성해야 합니다:

```bash
kubectl create secret generic te-data-generator-secrets \
  --from-literal=database-url='postgresql://user:password@host:5432/te_data_generator' \
  --from-literal=jwt-secret='your-secure-jwt-secret' \
  --from-literal=anthropic-api-key='sk-ant-...' \
  -n korea
```
