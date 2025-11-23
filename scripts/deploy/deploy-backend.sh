#!/bin/bash

# Backend 배포 스크립트
# 10.27.249.150 서버에 배포

set -e

SERVER="10.27.249.150"
USER="your_username"  # 여기에 실제 사용자명 입력
DEPLOY_DIR="/home/$USER/te-data-generator"

echo "🚀 Deploying backend to $SERVER..."

# 1. 서버에 디렉토리 생성
ssh $USER@$SERVER "mkdir -p $DEPLOY_DIR"

# 2. 필요한 파일들 복사
echo "📦 Copying files..."
rsync -avz --exclude 'node_modules' --exclude 'dist' --exclude '.git' \
  data-generator/ $USER@$SERVER:$DEPLOY_DIR/data-generator/

rsync -avz --exclude 'node_modules' --exclude 'dist' --exclude '.git' \
  excel-schema-generator/ $USER@$SERVER:$DEPLOY_DIR/excel-schema-generator/

# 3. 서버에서 빌드 및 실행
echo "🔨 Building on server..."
ssh $USER@$SERVER << 'EOF'
cd $DEPLOY_DIR

# Excel schema generator 빌드
cd excel-schema-generator
npm install
npm run build

# Data generator 빌드
cd ../data-generator
npm install
npm run build

# PM2로 실행 (이미 실행 중이면 재시작)
npm install -g pm2
pm2 delete te-data-generator || true
pm2 start dist/api/server.js --name te-data-generator

# 부팅 시 자동 시작 설정
pm2 save
pm2 startup

echo "✅ Backend deployed successfully!"
echo "📍 Backend URL: http://10.27.249.150:3001"
EOF

echo "🎉 Deployment complete!"
