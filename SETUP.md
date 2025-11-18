# ThinkingEngine Platform - Setup Guide

Complete setup guide for the Tech Terminal style B2B SaaS platform.

---

## 📋 Prerequisites

- **Node.js** 20+ (LTS recommended)
- **PostgreSQL** 15+ (optional - can run without database in MOCK mode)
- **npm** or **yarn**

---

## 🚀 Quick Start

### Option A: Run Without Database (MOCK Mode)

Perfect for development and testing. Uses in-memory data.

```bash
# 1. Install backend dependencies
cd data-generator
npm install

# 2. Install frontend dependencies
cd ../frontend
npm install

# 3. Start backend (port 3001)
cd ../data-generator
npm run api

# 4. Start frontend (port 3000)
cd ../frontend
npm run dev
```

**Access:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

**Test credentials:**
- `admin` / `admin` (Administrator)
- `user` / `user` (Regular user)
- `viewer` / `viewer` (Read-only)

---

### Option B: Run With PostgreSQL (Production Mode)

Full-featured mode with persistent data and audit logging.

#### Step 1: Setup PostgreSQL

```bash
# Install PostgreSQL (macOS)
brew install postgresql@15
brew services start postgresql@15

# Or using Docker
docker run --name te-postgres \
  -e POSTGRES_USER=te_admin \
  -e POSTGRES_PASSWORD=yourpassword \
  -e POSTGRES_DB=te_platform \
  -p 5432:5432 \
  -d postgres:15-alpine
```

#### Step 2: Configure Environment Variables

```bash
# Backend configuration
cd data-generator
cp .env.example .env

# Edit .env and set:
# DATABASE_URL=postgresql://te_admin:yourpassword@localhost:5432/te_platform
# JWT_SECRET=<your-secret-key>
# ANTHROPIC_API_KEY=<your-key>  # Optional
```

```bash
# Frontend configuration
cd ../frontend
cp .env.example .env

# Edit .env if backend is not on localhost:3001
```

#### Step 3: Run Database Migration

```bash
cd data-generator
npm run db:migrate
```

This will:
- Create all database tables
- Set up indexes
- Create default users (admin, user, viewer)

#### Step 4: Start Services

```bash
# Terminal 1: Backend
cd data-generator
npm run api

# Terminal 2: Frontend
cd frontend
npm run dev
```

---

## 🗄️ Database Schema

The system creates the following tables:

- **users** - User accounts and authentication
- **sessions** - Session management (optional)
- **runs** - Data generation execution history
- **audit_logs** - Security and activity audit trail
- **excel_uploads** - Excel file upload records

**Default users created:**
- username: `admin`, password: `admin`, role: `admin`
- username: `user`, password: `user`, role: `user`
- username: `viewer`, password: `viewer`, role: `viewer`

⚠️ **Change these passwords in production!**

---

## 🔐 Security Configuration

### JWT Secret

Generate a strong JWT secret:

```bash
# Option 1: OpenSSL
openssl rand -base64 32

# Option 2: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Update `JWT_SECRET` in `.env` file.

### Password Policy

Default passwords should be changed immediately:

1. Login as admin
2. Go to User Management
3. Update passwords for all default accounts

---

## 🎨 Frontend Features

All pages use **Tech Terminal aesthetic**:

- **Login Page** - Matrix-style terminal authentication
- **Dashboard** - System stats and quick actions
- **Data Generator** - AI-powered event data creation
- **Settings** - AI providers, platform config, retention policy
- **User Management** (Admin) - CRUD operations for users
- **Audit Logs** (Admin) - Security event monitoring

### Role-Based Access

| Role   | Permissions                          |
|--------|--------------------------------------|
| Admin  | Full access + user/audit management  |
| User   | Create, send data, view own records  |
| Viewer | Read-only access                     |

---

## 🛠️ Development

### Backend

```bash
cd data-generator

# Development mode (hot reload)
npm run api

# Build TypeScript
npm run build

# Type check
npm run type-check

# Database migration
npm run db:migrate
```

### Frontend

```bash
cd frontend

# Development mode
npm run dev

# Production build
npm run build

# Start production server
npm start
```

---

## 📦 Project Structure

```
/
├── data-generator/           # Backend (Express + PostgreSQL)
│   ├── src/
│   │   ├── api/              # API routes and middleware
│   │   │   ├── server.ts     # Main Express server
│   │   │   ├── auth.ts       # Authentication logic
│   │   │   ├── middleware.ts # Auth middleware
│   │   │   └── audit-middleware.ts  # Audit logging
│   │   ├── db/               # Database layer
│   │   │   ├── connection.ts # PostgreSQL connection
│   │   │   ├── schema.sql    # Database schema
│   │   │   ├── migrate.ts    # Migration script
│   │   │   └── repositories/ # Data access layer
│   │   └── ...
│   └── .env                  # Backend config
│
├── frontend/                 # Frontend (Next.js 14)
│   ├── src/
│   │   ├── app/              # Pages (App Router)
│   │   │   ├── login/        # Login page
│   │   │   └── dashboard/    # Protected pages
│   │   ├── components/       # Reusable components
│   │   │   ├── auth/         # Auth components
│   │   │   ├── effects/      # Terminal effects
│   │   │   └── layout/       # Sidebar, Header
│   │   └── contexts/         # React contexts
│   └── .env                  # Frontend config
│
└── docs/                     # Documentation
```

---

## 🐛 Troubleshooting

### Database connection failed

```
Error: Connection refused
```

**Solutions:**
1. Check PostgreSQL is running: `brew services list` or `docker ps`
2. Verify DATABASE_URL in `.env`
3. Check firewall settings
4. Run in MOCK mode by removing DATABASE_URL

### Port already in use

```
Error: Port 3001 already in use
```

**Solutions:**
```bash
# Find process using port
lsof -i :3001

# Kill process
kill -9 <PID>

# Or change port in .env
API_PORT=3002
```

### Frontend can't connect to backend

```
TypeError: Failed to fetch
```

**Solutions:**
1. Check backend is running on port 3001
2. Verify `NEXT_PUBLIC_API_URL` in frontend `.env`
3. Check CORS settings in `server.ts`

---

## 📚 Additional Documentation

- [Architecture (Korean)](./docs/ARCHITECTURE_KR.md)
- [Frontend Design](./docs/front.md)
- [TE Data Rules](./docs/TE_데이터_규칙_요약.md)

---

## 🔄 Updating

### Pull latest changes

```bash
git pull origin main

# Update backend dependencies
cd data-generator
npm install
npm run db:migrate  # Run migrations

# Update frontend dependencies
cd ../frontend
npm install
```

---

## 🚢 Production Deployment

### Environment Variables

**Required:**
- `DATABASE_URL` - PostgreSQL connection
- `JWT_SECRET` - Strong random secret
- `NEXT_PUBLIC_API_URL` - Production API URL

**Optional:**
- `ANTHROPIC_API_KEY` - For AI features
- `OPENAI_API_KEY` - For AI features

### Security Checklist

- [ ] Change default user passwords
- [ ] Set strong JWT_SECRET
- [ ] Use environment-specific DATABASE_URL
- [ ] Enable HTTPS
- [ ] Configure firewall rules
- [ ] Set up database backups
- [ ] Review audit logs regularly

---

## 📞 Support

For issues and questions:
- GitHub Issues: [te_data_generator/issues](https://github.com/your-org/te_data_generator/issues)
- Documentation: `docs/` folder

---

**Version:** 1.0.0
**Last Updated:** 2025-01-15
