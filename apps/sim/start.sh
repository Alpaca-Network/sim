#!/bin/bash

# Buildz.ai Startup Script
# This script sets up the environment and starts the application

echo "🚀 Starting buildz.ai application..."

# Set environment variables
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/simstudio"
export BETTER_AUTH_URL="http://localhost:3000"
export BETTER_AUTH_SECRET="your_auth_secret_here_32_chars_minimum"
export ENCRYPTION_KEY="your_encryption_key_here_32_chars_minimum"
export INTERNAL_API_SECRET="your_internal_api_secret_here_32_chars_minimum"
export NEXT_PUBLIC_APP_URL="http://localhost:3000"
export NEXT_PUBLIC_SOCKET_URL="http://localhost:3002"
export NODE_ENV="development"
export LOG_LEVEL="DEBUG"

# Check if PostgreSQL is running
if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo "❌ PostgreSQL is not running. Starting PostgreSQL..."
    sudo service postgresql start
    sleep 2
fi

# Check if database exists
if ! psql -h localhost -U postgres -d simstudio -c "SELECT 1;" > /dev/null 2>&1; then
    echo "❌ Database 'simstudio' does not exist. Creating..."
    sudo -u postgres createdb simstudio
    sudo -u postgres psql -d simstudio -c "CREATE EXTENSION IF NOT EXISTS vector;"
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    bun install
fi

# Run database migrations
echo "🗄️ Running database migrations..."
bun run db:push

# Start the application
echo "🎯 Starting application services..."

# Start main application in background
bun run dev &
MAIN_PID=$!

# Start socket server in background
bun run dev:sockets &
SOCKET_PID=$!

echo "✅ Application started!"
echo "🌐 Main app: http://localhost:3000"
echo "🔌 Socket server: http://localhost:3002"
echo "📊 Health check: http://localhost:3002/health"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
trap "echo '🛑 Stopping services...'; kill $MAIN_PID $SOCKET_PID; exit" INT
wait