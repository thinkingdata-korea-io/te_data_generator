#!/bin/bash

# Development Environment Setup Script
# This script ensures PostgreSQL is running and initializes the development environment

set -e

echo "🚀 Starting Development Environment Setup..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ PostgreSQL is not installed${NC}"
    echo "Install with: brew install postgresql@14"
    exit 1
fi

echo "📊 Checking PostgreSQL status..."

# Check if PostgreSQL is running
if ! pg_isready -h localhost -p 5432 &> /dev/null; then
    echo -e "${YELLOW}⚠️  PostgreSQL is not running. Starting...${NC}"
    brew services start postgresql@14

    # Wait for PostgreSQL to be ready
    echo "⏳ Waiting for PostgreSQL to start..."
    for i in {1..30}; do
        if pg_isready -h localhost -p 5432 &> /dev/null; then
            echo -e "${GREEN}✅ PostgreSQL is ready${NC}"
            break
        fi
        sleep 1
        if [ $i -eq 30 ]; then
            echo -e "${RED}❌ PostgreSQL failed to start after 30 seconds${NC}"
            exit 1
        fi
    done
else
    echo -e "${GREEN}✅ PostgreSQL is already running${NC}"
fi

echo ""
echo "🗄️  Checking database setup..."

# Check if database exists
if ! psql -lqt | cut -d \| -f 1 | grep -qw te_platform; then
    echo -e "${YELLOW}⚠️  Database 'te_platform' does not exist. Creating...${NC}"
    psql postgres -c "CREATE DATABASE te_platform OWNER te_admin;" 2>&1 | grep -v "already exists" || true
    echo -e "${GREEN}✅ Database created${NC}"
else
    echo -e "${GREEN}✅ Database exists${NC}"
fi

# Check if user role exists
if ! psql postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='te_admin'" | grep -q 1; then
    echo -e "${YELLOW}⚠️  User 'te_admin' does not exist. Creating...${NC}"
    psql postgres -c "CREATE ROLE te_admin WITH LOGIN PASSWORD 'te_password_2025';" 2>&1 | grep -v "already exists" || true
    echo -e "${GREEN}✅ User created${NC}"
else
    echo -e "${GREEN}✅ User exists${NC}"
fi

# Check if tables exist
TABLE_COUNT=$(psql -U te_admin -d te_platform -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null || echo "0")

if [ "$TABLE_COUNT" -eq "0" ]; then
    echo -e "${YELLOW}⚠️  Tables do not exist. Running migrations...${NC}"
    if [ -f "src/db/schema.sql" ]; then
        psql -U te_admin -d te_platform -f src/db/schema.sql
        echo -e "${GREEN}✅ Tables created${NC}"
    else
        echo -e "${RED}❌ Schema file not found at src/db/schema.sql${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ Tables exist ($TABLE_COUNT tables)${NC}"
fi

# Check if default users exist
USER_COUNT=$(psql -U te_admin -d te_platform -tAc "SELECT COUNT(*) FROM users;" 2>/dev/null || echo "0")

if [ "$USER_COUNT" -eq "0" ]; then
    echo -e "${YELLOW}⚠️  No users found. Running seed script...${NC}"
    if [ -f "scripts/seed-users.sql" ]; then
        psql -U te_admin -d te_platform -f scripts/seed-users.sql
        echo -e "${GREEN}✅ Seed users created${NC}"
    else
        echo -e "${YELLOW}⚠️  Seed script not found. You may need to create users manually.${NC}"
    fi
else
    echo -e "${GREEN}✅ Users exist ($USER_COUNT users)${NC}"
fi

echo ""
echo -e "${GREEN}✅ Development environment is ready!${NC}"
echo ""
echo "Next steps:"
echo "  1. Start backend:  npm run dev:api"
echo "  2. Start frontend: cd ../frontend && npm run dev"
echo ""
