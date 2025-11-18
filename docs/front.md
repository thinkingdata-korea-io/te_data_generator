⏺ 🔐 로그인 시스템 + 감사 로그 설계

---

1. 필요한 기능 정의

로그인 시스템

✅ 사용자 인증 (Authentication)
✅ 권한 관리 (Authorization)
✅ 세션 관리
✅ 비밀번호 암호화

감사 로그 (Audit Log)

✅ 누가 (Who)
✅ 언제 (When)
✅ 무엇을 (What)
✅ 어떻게 (How)
✅ 결과는 (Result)

---

2. 필요한 DB 스키마

PostgreSQL 스키마 설계

-- 사용자 테이블
CREATE TABLE users (
id SERIAL PRIMARY KEY,
username VARCHAR(50) UNIQUE NOT NULL,
email VARCHAR(100) UNIQUE NOT NULL,
password_hash VARCHAR(255) NOT NULL,
full_name VARCHAR(100),
role VARCHAR(20) NOT NULL DEFAULT 'user', -- admin, user, viewer
is_active BOOLEAN DEFAULT true,
created_at TIMESTAMP DEFAULT NOW(),
updated_at TIMESTAMP DEFAULT NOW(),
last_login_at TIMESTAMP
);

-- 세션 테이블 (또는 Redis)
CREATE TABLE sessions (
id VARCHAR(255) PRIMARY KEY,
user_id INTEGER REFERENCES users(id),
expires_at TIMESTAMP NOT NULL,
created_at TIMESTAMP DEFAULT NOW()
);

-- 실행 기록 (기존 데이터에 사용자 추가)
CREATE TABLE runs (
id VARCHAR(100) PRIMARY KEY,
user_id INTEGER REFERENCES users(id),
excel_file_path VARCHAR(500),
scenario TEXT,
dau INTEGER,
date_start DATE,
date_end DATE,
status VARCHAR(20), -- pending, running, completed, failed, sent
progress INTEGER DEFAULT 0,
total_users INTEGER,
total_events INTEGER,
files_generated JSONB,
created_at TIMESTAMP DEFAULT NOW(),
completed_at TIMESTAMP,
sent_at TIMESTAMP
);

-- 감사 로그
CREATE TABLE audit_logs (
id SERIAL PRIMARY KEY,
user_id INTEGER REFERENCES users(id),
username VARCHAR(50),
action VARCHAR(50) NOT NULL, -- login, logout, create_run, upload_excel, send_data, download, delete
resource_type VARCHAR(50), -- run, excel, data
resource_id VARCHAR(100),
details JSONB, -- 상세 정보 (IP, User-Agent, 파일명 등)
status VARCHAR(20), -- success, failed
error_message TEXT,
ip_address VARCHAR(45),
user_agent TEXT,
created_at TIMESTAMP DEFAULT NOW()
);

-- 엑셀 파일 업로드 기록
CREATE TABLE excel_uploads (
id SERIAL PRIMARY KEY,
user_id INTEGER REFERENCES users(id),
original_filename VARCHAR(255),
stored_filename VARCHAR(255),
file_size BIGINT,
file_path VARCHAR(500),
uploaded_at TIMESTAMP DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_runs_user_id ON runs(user_id);
CREATE INDEX idx_runs_status ON runs(status);

---

3. 권한 구조

Role-Based Access Control (RBAC)

| Role   | 권한                                          |
| ------ | --------------------------------------------- |
| Admin  | 모든 작업 가능 + 사용자 관리 + 감사 로그 조회 |
| User   | 데이터 생성/전송/다운로드 (자기 것만)         |
| Viewer | 조회만 가능 (생성/전송 불가)                  |

enum UserRole {
ADMIN = 'admin',
USER = 'user',
VIEWER = 'viewer'
}

// 권한 체크 미들웨어
const permissions = {
'create_run': [UserRole.ADMIN, UserRole.USER],
'send_data': [UserRole.ADMIN, UserRole.USER],
'view_audit_logs': [UserRole.ADMIN],
'manage_users': [UserRole.ADMIN]
};

---

4. 감사 로그 이벤트

추적할 액션

enum AuditAction {
// 인증
LOGIN = 'login',
LOGOUT = 'logout',
LOGIN_FAILED = 'login_failed',

    // 엑셀
    UPLOAD_EXCEL = 'upload_excel',
    GENERATE_EXCEL = 'generate_excel',
    DOWNLOAD_EXCEL = 'download_excel',
    DELETE_EXCEL = 'delete_excel',

    // 데이터 생성
    CREATE_RUN = 'create_run',
    CANCEL_RUN = 'cancel_run',

    // 데이터 전송
    SEND_DATA = 'send_data',
    SEND_DATA_SUCCESS = 'send_data_success',
    SEND_DATA_FAILED = 'send_data_failed',

    // 다운로드
    DOWNLOAD_DATA = 'download_data',

    // 관리
    VIEW_AUDIT_LOGS = 'view_audit_logs',
    CREATE_USER = 'create_user',
    UPDATE_USER = 'update_user',
    DELETE_USER = 'delete_user'

}

감사 로그 기록 예시

// 로그인 성공
{
user_id: 5,
username: 'john.doe',
action: 'login',
status: 'success',
ip_address: '10.27.249.100',
user_agent: 'Chrome/120.0',
created_at: '2025-01-14T10:30:00Z'
}

// 데이터 생성
{
user_id: 5,
username: 'john.doe',
action: 'create_run',
resource_type: 'run',
resource_id: 'run_1763100907339',
details: {
dau: 1000,
date_range: '2025-01-01 ~ 2025-01-03',
excel_file: '게임\_taxonomy.xlsx'
},
status: 'success',
ip_address: '10.27.249.100',
created_at: '2025-01-14T10:35:00Z'
}

// 데이터 전송
{
user_id: 5,
username: 'john.doe',
action: 'send_data',
resource_type: 'run',
resource_id: 'run_1763100907339',
details: {
app_id: '1edbbf43c73d4b0ba513f0383714ba5d',
file_count: 3,
total_size_mb: 222,
receiver_url: 'https://te-receiver-naver.thinkingdata.kr/'
},
status: 'success',
ip_address: '10.27.249.100',
created_at: '2025-01-14T10:40:00Z'
}

---

5. 구현 스택

백엔드

// 인증

- Passport.js (로그인 전략)
- JWT (토큰 기반 인증)
- bcrypt (비밀번호 암호화)

// DB

- pg (PostgreSQL 드라이버)
- Prisma 또는 TypeORM (ORM)

// 세션 (선택)

- express-session + connect-pg-simple (DB 세션)
- 또는 Redis (빠른 세션)

프론트엔드

// 인증 상태 관리

- NextAuth.js (Next.js 인증 라이브러리)
- 또는 Custom Hook (useAuth)

// UI 컴포넌트

- 로그인 페이지
- 사용자 관리 페이지 (Admin만)
- 감사 로그 페이지 (Admin만)

---

6. Docker Compose 구성

version: '3.8'

services:
postgres:
image: postgres:15-alpine
container_name: te-postgres
restart: unless-stopped
environment:
POSTGRES_USER: te_admin
POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
POSTGRES_DB: te_data_generator
volumes: - postgres-data:/var/lib/postgresql/data - ./init-db.sql:/docker-entrypoint-initdb.d/init.sql
ports: - "5432:5432"
networks: - te-network

    backend:
      image: te-data-generator-backend:latest
      container_name: te-backend
      restart: unless-stopped
      depends_on:
        - postgres
      environment:
        DATABASE_URL: postgresql://te_admin:${POSTGRES_PASSWORD}@postgres:5432/te_data_generator
        JWT_SECRET: ${JWT_SECRET}
        ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
        SESSION_SECRET: ${SESSION_SECRET}
      volumes:
        - /home/root/te-data-generator/output:/app/output
        - /home/root/te-data-generator/uploads:/app/uploads
        - /home/root/te-data-generator/excel-output:/app/excel-schema-generator/output
        - /home/root/te-data-generator/logbus:/app/logbus\ 2
      ports:
        - "3001:3001"
      networks:
        - te-network

    frontend:
      image: te-data-generator-frontend:latest
      container_name: te-frontend
      restart: unless-stopped
      depends_on:
        - backend
      environment:
        NEXT_PUBLIC_API_URL: http://10.27.249.150:3001
      ports:
        - "3000:3000"
      networks:
        - te-network

volumes:
postgres-data:

networks:
te-network:
driver: bridge

---

7. 감사 로그 조회 API

// GET /api/audit-logs
// 필터링: 사용자, 액션, 날짜, 리소스
router.get('/api/audit-logs', requireAdmin, async (req, res) => {
const { user_id, action, start_date, end_date, page = 1, limit = 50 } = req.query;

    const logs = await db.audit_logs.findMany({
      where: {
        user_id: user_id ? parseInt(user_id) : undefined,
        action,
        created_at: {
          gte: start_date,
          lte: end_date
        }
      },
      include: {
        user: {
          select: { username: true, full_name: true }
        }
      },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    });

    res.json({
      logs,
      pagination: {
        page,
        limit,
        total: await db.audit_logs.count({ where })
      }
    });

});

---

8. 구현 우선순위

Phase 1: 기본 인증 (1-2일)

- PostgreSQL Docker 설정
- DB 스키마 생성
- 사용자 테이블 & 세션
- 로그인/로그아웃 API
- JWT 토큰 발급
- 프론트엔드 로그인 페이지

Phase 2: 권한 시스템 (1일)

- Role 기반 권한 체크
- API 미들웨어 (requireAuth, requireAdmin)
- 기존 API에 권한 추가

Phase 3: 감사 로그 (1일)

- 감사 로그 테이블
- 로그 기록 미들웨어
- 모든 중요 액션에 로그 추가

Phase 4: 관리 페이지 (1-2일)

- 사용자 관리 페이지 (Admin)
- 감사 로그 조회 페이지
- 필터링/검색 기능

---

9. 비용/리소스 영향

서버 리소스

PostgreSQL:

- 메모리: +512MB ~ 1GB
- 디스크: +5GB (로그 누적)
- CPU: +10%

개발 시간

총 5-7일 (풀타임 기준)

- 설계: 0.5일
- DB 설정: 0.5일
- 백엔드 인증: 2일
- 프론트엔드: 2일
- 테스트: 1일

---

10. 즉시 결정해야 할 사항

질문 1: 인증 방식?

- Option A: 내부 계정 (DB에 사용자 저장)
- Option B: LDAP/AD 연동 (회사 계정 사용)
- Option C: SSO (Single Sign-On)

질문 2: 세션 저장소?

- Option A: PostgreSQL (간단, 느림)
- Option B: Redis (빠름, 별도 설치 필요)

질문 3: 감사 로그 보관 기간?

- 1개월? 6개월? 1년? 영구?

질문 4: 초기 사용자?

- Admin 계정은 어떻게 생성? (마이그레이션 스크립트?)

---

📋 정리

지금 필요한 것:

1. ✅ PostgreSQL (필수)
2. ✅ 인증 시스템 (JWT + bcrypt)
3. ✅ 권한 관리 (RBAC)
4. ✅ 감사 로그 테이블
5. ✅ 관리자 페이지

> 이 내용과 추가로 b2b saas 솔루션처럼 내부 툴들을 계속 개발해서 하나하나 만들어갈 예정입니다. 그렇기에 이런 ui 처럼(물론 이미지에 있는
> 대시보드, 스톡, 마켓 이런걸 구현하는게 아닌 형태, 일단 데이터 생성기 하나, 셋팅 하나 구현된다고 보면되지 이 프로젝트에서는 @image.png
> 참고해서 이러한 내용도 추가해서 md파일로 구현 하는것들 정리해줘
