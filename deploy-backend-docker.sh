#!/bin/bash

# Docker를 사용한 Backend 배포 스크립트
# 10.27.249.150 서버에 배포

set -e

SERVER="10.27.249.150"
USER="root"
IMAGE_NAME="te-data-generator-backend"
CONTAINER_NAME="te-data-generator"

echo "🚀 Deploying backend with Docker to $SERVER..."

# 1. 로컬에서 Docker 이미지 빌드
echo "🔨 Building Docker image..."
docker build -t $IMAGE_NAME:latest -f data-generator/Dockerfile .

# 2. 이미지를 tar로 저장
echo "📦 Saving Docker image..."
docker save $IMAGE_NAME:latest | gzip > /tmp/$IMAGE_NAME.tar.gz

# 3. 서버로 이미지 전송
echo "📤 Uploading to server..."
scp /tmp/$IMAGE_NAME.tar.gz $USER@$SERVER:/tmp/

# 4. 서버에서 이미지 로드 및 실행
echo "🚢 Deploying on server..."
ssh $USER@$SERVER << EOF
# 이미지 로드
docker load < /tmp/$IMAGE_NAME.tar.gz

# 기존 컨테이너 중지 및 삭제
docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true

# 데이터 디렉토리 생성 (호스트)
mkdir -p /home/$USER/te-data-generator/{output,uploads,excel-output,logbus}
echo "✅ Data directories created"

# 새 컨테이너 실행
docker run -d \
  --name $CONTAINER_NAME \
  --restart unless-stopped \
  -p 3001:3001 \
  -e NODE_ENV=production \
  -e ANTHROPIC_API_KEY=\${ANTHROPIC_API_KEY} \
  -e OPENAI_API_KEY=\${OPENAI_API_KEY:-} \
  -v /home/$USER/te-data-generator/output:/app/output \
  -v /home/$USER/te-data-generator/uploads:/app/uploads \
  -v /home/$USER/te-data-generator/excel-output:/app/excel-schema-generator/output \
  -v /home/$USER/te-data-generator/logbus:/app/logbus\ 2 \
  $IMAGE_NAME:latest

# 정리
rm /tmp/$IMAGE_NAME.tar.gz

echo "✅ Container started successfully!"
docker ps | grep $CONTAINER_NAME
EOF

# 로컬 정리
rm /tmp/$IMAGE_NAME.tar.gz

echo "🎉 Deployment complete!"
echo "📍 Backend URL: http://10.27.249.150:3001"
echo "📝 Check logs: ssh $USER@$SERVER 'docker logs -f $CONTAINER_NAME'"
