# Buildz.ai Setup Guide

This guide will help you set up and run the buildz.ai application locally.

## Prerequisites

- Ubuntu 24.04+ (or similar Linux distribution)
- PostgreSQL 17+
- Bun runtime (v1.2+)
- Node.js 20+ (if not using Bun)

## Quick Start

1. **Run the setup script:**
   ```bash
   ./start.sh
   ```

   This will:
   - Install PostgreSQL if not present
   - Create the database and user
   - Install the pgvector extension
   - Install dependencies
   - Run database migrations
   - Start both the main app and socket server

## Manual Setup

If you prefer to set up manually:

### 1. Install PostgreSQL and pgvector

```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib postgresql-17-pgvector
sudo service postgresql start
```

### 2. Create Database and User

```bash
sudo -u postgres psql -c "CREATE DATABASE simstudio;"
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE simstudio TO postgres;"
sudo -u postgres psql -d simstudio -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### 3. Install Bun

```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
```

### 4. Install Dependencies

```bash
bun install
```

### 5. Set Environment Variables

```bash
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/simstudio"
export BETTER_AUTH_URL="http://localhost:3000"
export BETTER_AUTH_SECRET="your_auth_secret_here_32_chars_minimum"
export ENCRYPTION_KEY="your_encryption_key_here_32_chars_minimum"
export INTERNAL_API_SECRET="your_internal_api_secret_here_32_chars_minimum"
export NEXT_PUBLIC_APP_URL="http://localhost:3000"
export NEXT_PUBLIC_SOCKET_URL="http://localhost:3002"
```

### 6. Run Database Migrations

```bash
bun run db:push
```

### 7. Start the Application

**Terminal 1 - Main Application:**
```bash
bun run dev
```

**Terminal 2 - Socket Server:**
```bash
bun run dev:sockets
```

## Accessing the Application

- **Main Application:** http://localhost:3000
- **Socket Server Health:** http://localhost:3002/health
- **API Endpoints:** http://localhost:3000/api/*

## Troubleshooting

### Database Connection Issues

1. Check if PostgreSQL is running:
   ```bash
   sudo service postgresql status
   ```

2. Test database connection:
   ```bash
   psql -h localhost -U postgres -d simstudio -c "SELECT 1;"
   ```

### Port Already in Use

If ports 3000 or 3002 are already in use:

1. Find the process using the port:
   ```bash
   lsof -i :3000
   lsof -i :3002
   ```

2. Kill the process or change the ports in your environment variables

### Environment Variables Not Loading

Make sure to export the environment variables in the same terminal session where you're running the application, or use the `.env.local` file.

## Production Deployment

For production deployment, use the `.env.production` file and update the following:

1. **Database URL:** Point to your production PostgreSQL instance
2. **Authentication Secrets:** Generate secure random strings
3. **OAuth Credentials:** Configure with your actual OAuth app credentials
4. **Email Configuration:** Set up your email service (Resend, etc.)
5. **Domain URLs:** Update to your production domain

## API Endpoints

- `GET /api/workspaces` - List user workspaces
- `POST /api/workspaces` - Create new workspace
- `GET /api/auth/socket-token` - Get socket authentication token
- `GET /health` - Socket server health check

## Socket Events

The socket server supports real-time collaboration features:

- `join-workflow` - Join a workflow room
- `leave-workflow` - Leave current workflow room
- `workflow-operation` - Real-time workflow updates
- `subblock-update` - Real-time subblock updates
- `cursor-update` - Real-time cursor positions
- `presence-update` - User presence information

## Support

If you encounter any issues, check the logs in the terminal where the services are running. The application uses structured logging with different levels (DEBUG, INFO, WARN, ERROR).