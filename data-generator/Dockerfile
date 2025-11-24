# Multi-stage build for monorepo
FROM node:20-alpine AS builder

WORKDIR /workspace

# 전체 모노레포 복사 (상위 디렉토리에서 실행하므로 컨텍스트 조정 필요)
COPY excel-schema-generator ./excel-schema-generator
COPY data-generator ./data-generator

# excel-schema-generator 먼저 빌드
WORKDIR /workspace/excel-schema-generator
RUN npm install && npm run build

# data-generator 빌드
WORKDIR /workspace/data-generator
RUN npm install

# TypeScript path alias를 위해 excel-schema-generator 소스를 참조 가능하게 설정
# 빌드 시 TypeScript가 ../excel-schema-generator/src/* 경로를 찾을 수 있도록 함
RUN npm run build

# Production 이미지
FROM node:20-alpine

# 워크스페이스 구조 유지 (컴파일된 JS의 상대 경로가 작동하도록)
WORKDIR /workspace/data-generator

# data-generator의 package.json 복사 및 프로덕션 의존성 설치
COPY --from=builder /workspace/data-generator/package*.json ./
RUN npm install --production

# 빌드된 파일들 복사
COPY --from=builder /workspace/data-generator/dist ./dist

# excel-schema-generator 전체 복사 (상대 경로 참조를 위해 필요)
COPY --from=builder /workspace/excel-schema-generator /workspace/excel-schema-generator

# 포트 노출
EXPOSE 3001

# 프로덕션 모드로 실행
CMD ["node", "dist/api/server.js"]
