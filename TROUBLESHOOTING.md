# GitLab CI 빌드 실패 트러블슈팅

## 증상
- build-backend, build-frontend 작업이 계속 실패

## 확인된 사항
- ✅ 로컬 Docker 빌드는 정상 작동
- ✅ Dockerfile 설정 정상
- ✅ 최근 코드 변경사항 (OpenAI 모델 업데이트) 문제 없음

## 가능한 원인 및 해결 방법

### 1. Docker 레지스트리 인증 실패
**증상**: "unauthorized" 또는 "authentication required" 오류

**해결**:
```bash
# GitLab CI/CD 설정에서 DOCKER_REGISTRY_PASSWORD 확인
# Settings > CI/CD > Variables > DOCKER_REGISTRY_PASSWORD
```

### 2. GitLab Runner 리소스 부족
**증상**: "no space left on device" 또는 메모리 부족 오류

**해결**:
```bash
# Runner에서 Docker 정리
docker system prune -af --volumes
```

### 3. 네트워크 문제
**증상**: Docker pull/push 타임아웃

**해결**:
- Docker 레지스트리 `docker-ta-inner.thinkingdata.cn` 접근 가능 확인
- 방화벽 또는 VPN 설정 확인

### 4. 캐시 문제
**해결**:
- GitLab UI에서 "CI/CD" > "Pipelines" > "Clear runner caches"
- 또는 커밋 메시지에 `[ci skip cache]` 추가

### 5. GitLab Runner 재시작
```bash
# Runner가 있는 서버에서
sudo gitlab-runner restart
```

## 추천 디버깅 순서

1. **GitLab UI에서 실패한 Job 로그 확인**
   - 정확한 오류 메시지 확인
   - 어느 단계에서 실패했는지 파악

2. **레지스트리 인증 테스트**
   ```bash
   echo $DOCKER_REGISTRY_PASSWORD | docker login docker-ta-inner.thinkingdata.cn -u root --password-stdin
   ```

3. **로컬에서 CI 시뮬레이션**
   ```bash
   # .gitlab-ci.yml의 명령어를 로컬에서 실행
   docker build -f data-generator/Dockerfile -t test .
   ```

4. **Runner 상태 확인**
   ```bash
   sudo gitlab-runner status
   sudo gitlab-runner verify
   ```

## 긴급 해결 방법

만약 계속 실패한다면:

1. **수동 배포**:
   ```bash
   # 로컬에서 빌드하고 푸시
   docker build -f data-generator/Dockerfile -t docker-ta-inner.thinkingdata.cn/korea/data-generator-backend:latest .
   docker push docker-ta-inner.thinkingdata.cn/korea/data-generator-backend:latest
   ```

2. **CI를 일시적으로 스킵**:
   ```bash
   git commit -m "fix: update code [ci skip]"
   ```
