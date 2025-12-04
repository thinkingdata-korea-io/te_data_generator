#!/bin/bash

# API Server Startup Script with Database Connection Check

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🚀 Starting API Server..."
echo ""

# Check if PostgreSQL is running
echo "📊 Checking PostgreSQL connection..."

MAX_RETRIES=10
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if pg_isready -h localhost -p 5432 &> /dev/null; then
        # Test actual database connection
        if psql -U te_admin -d te_platform -c "SELECT 1" &> /dev/null; then
            echo -e "${GREEN}✅ PostgreSQL connection successful${NC}"
            break
        else
            echo -e "${YELLOW}⚠️  PostgreSQL is running but database connection failed (attempt $((RETRY_COUNT+1))/$MAX_RETRIES)${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  PostgreSQL is not responding (attempt $((RETRY_COUNT+1))/$MAX_RETRIES)${NC}"

        if [ $RETRY_COUNT -eq 0 ]; then
            echo "🔄 Attempting to start PostgreSQL..."
            brew services start postgresql@14 2>&1 || true
        fi
    fi

    RETRY_COUNT=$((RETRY_COUNT+1))

    if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
        echo "⏳ Waiting 2 seconds before retry..."
        sleep 2
    else
        echo -e "${RED}❌ Failed to connect to PostgreSQL after $MAX_RETRIES attempts${NC}"
        echo ""
        echo "Troubleshooting steps:"
        echo "  1. Check if PostgreSQL is installed: brew list postgresql@14"
        echo "  2. Start PostgreSQL: brew services start postgresql@14"
        echo "  3. Check PostgreSQL status: brew services list | grep postgresql"
        echo "  4. Run setup script: npm run dev:setup"
        exit 1
    fi
done

echo ""
echo "🌐 Starting Express server..."
echo ""

# Start the API server
tsx src/api/server.ts
