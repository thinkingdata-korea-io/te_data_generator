# Multi-stage build for monorepo
FROM node:20-alpine AS builder

WORKDIR /workspace

# 전체 모노레포 복사
COPY . .

# excel-schema-generator 먼저 빌드
WORKDIR /workspace/excel-schema-generator
RUN npm install && npm run build

# data-generator 빌드
WORKDIR /workspace/data-generator
RUN npm install && npm run build

# Production 이미지
FROM node:20-alpine

WORKDIR /app

# data-generator의 package.json 복사 및 프로덕션 의존성 설치
COPY data-generator/package*.json ./
RUN npm ci --omit=dev

# excel-schema-generator 의존성 설치
COPY --from=builder /workspace/excel-schema-generator/package*.json ../excel-schema-generator/
WORKDIR /excel-schema-generator
RUN npm ci --omit=dev

WORKDIR /app

# 빌드된 파일들 복사
COPY --from=builder /workspace/data-generator/dist ./dist
COPY --from=builder /workspace/excel-schema-generator/dist ../excel-schema-generator/dist

# excel-schema-generator의 prompts 디렉토리 복사 (런타임 필수)
COPY --from=builder /workspace/excel-schema-generator/prompts ../excel-schema-generator/prompts

# LogBus2 실행 파일 권한 설정
RUN chmod +x ../logbus\ 2/logbus || true

# 포트 노출
EXPOSE 3001

# 프로덕션 모드로 실행
CMD ["node", "dist/api/server.js"]
