# Backend Dockerfile
FROM node:20-alpine

WORKDIR /app

# 의존성 파일 복사 및 설치
COPY package*.json ./
RUN npm ci --only=production

# TypeScript 빌드를 위해 devDependencies도 임시로 설치
COPY package*.json ./
RUN npm install

# 소스 코드 복사
COPY . .

# TypeScript 빌드
RUN npm run build

# devDependencies 제거
RUN npm prune --production

# LogBus2 실행 파일 권한 설정
RUN chmod +x ../logbus\ 2/logbus || true

# 포트 노출
EXPOSE 3001

# 프로덕션 모드로 실행
CMD ["node", "dist/api/server.js"]
