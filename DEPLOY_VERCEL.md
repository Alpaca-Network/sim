# Deploying Sim to Vercel

⚠️ **Important Limitation**: Vercel deployment is **partial** and only includes the Next.js application. The Socket.IO realtime server cannot run on Vercel due to serverless function limitations.

## What Works on Vercel

✅ **Supported Features:**
- Next.js web application
- API routes and serverless functions
- Static file serving
- Cron jobs for scheduled tasks
- Authentication (better-auth)
- Database connections (external)

❌ **Not Supported:**
- Socket.IO realtime server (requires persistent connections)
- Real-time collaboration features
- Live workflow editing
- Persistent WebSocket connections

## Prerequisites

1. [Vercel CLI](https://vercel.com/cli) installed
2. Vercel account
3. External PostgreSQL database with pgvector extension
4. External Socket.IO server hosting (Railway, Render, etc.)

## Quick Deploy (Next.js App Only)

1. **Clone and setup:**
   ```bash
   git clone https://github.com/Alpaca-Network/sim.git
   cd sim
   bun install
   ```

2. **Deploy to Vercel:**
   ```bash
   bun run deploy:vercel
   ```

## Complete Setup (Hybrid Deployment)

For full functionality, use a hybrid approach:
- **Vercel**: Next.js application
- **Railway/Render**: Socket.IO server
- **External Provider**: PostgreSQL with pgvector

### 1. Database Setup

Choose a PostgreSQL provider that supports pgvector:

**Recommended Providers:**
- [Supabase](https://supabase.com/) - Native pgvector support
- [Neon](https://neon.tech/) - Serverless PostgreSQL with pgvector
- [Railway](https://railway.app/) - PostgreSQL with pgvector template
- [Render](https://render.com/) - Managed PostgreSQL with extensions

**Supabase Setup:**
```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;
```

### 2. Socket.IO Server Deployment

Deploy the realtime server to a platform that supports persistent connections:

**Option A: Railway**
```bash
# Create separate Railway project for realtime server
railway new sim-realtime
railway add --template nodejs

# Set environment variables
railway variables set NODE_ENV=production
railway variables set DATABASE_URL=your_database_url
railway variables set BETTER_AUTH_SECRET=your_secret

# Deploy
railway up --service realtime
```

**Option B: Render**
```yaml
# render.yaml
services:
  - type: web
    name: sim-realtime
    env: node
    buildCommand: cd apps/sim && bun install
    startCommand: cd apps/sim && bun run socket-server/index.ts
    envVars:
      - key: NODE_ENV
        value: production
```

### 3. Vercel Environment Variables

Configure in Vercel dashboard or `.env.local`:

```bash
# Database
DATABASE_URL=your_external_database_url

# Authentication  
BETTER_AUTH_SECRET=your_32_char_secret
BETTER_AUTH_URL=https://your-vercel-app.vercel.app

# NextJS
NEXT_PUBLIC_APP_URL=https://your-vercel-app.vercel.app

# Security
ENCRYPTION_KEY=your_32_char_encryption_key

# External Socket.IO Server
SOCKET_SERVER_URL=https://your-realtime-server.railway.app
NEXT_PUBLIC_SOCKET_URL=https://your-realtime-server.railway.app

# Optional: AI Providers
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key

# Optional: OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Optional: Email
RESEND_API_KEY=your_resend_key
```

### 4. Database Migration

Run migrations against your external database:

```bash
# Set DATABASE_URL locally
export DATABASE_URL=your_database_url

# Run migrations
cd apps/sim
bunx drizzle-kit migrate
```

## Vercel Configuration

The `vercel.json` file includes:

- **Build optimization** for monorepo structure
- **Function configuration** with extended timeouts
- **Cron jobs** for scheduled tasks
- **Rewrites** for Socket.IO fallback handling

## Limitations and Workarounds

### Real-time Features

**Problem**: Socket.IO requires persistent connections
**Workaround**: Deploy Socket.IO server separately

**Problem**: Live collaboration won't work
**Workaround**: Use polling-based updates or disable real-time features

### File Uploads

**Problem**: Serverless function size limits
**Workaround**: Use Vercel Blob or external storage (S3, Cloudinary)

### Background Jobs

**Problem**: No persistent background processes
**Workaround**: Use Vercel Cron Jobs or external job queue (Trigger.dev)

## Monitoring

**Vercel Analytics:**
- Function execution times
- Error rates
- Performance metrics

**External Monitoring:**
- Socket.IO server health checks
- Database connection monitoring
- Third-party service status

## Cost Considerations

**Vercel Costs:**
- Function execution time
- Bandwidth usage
- Build minutes

**Additional Costs:**
- External database hosting
- Socket.IO server hosting
- Third-party service fees

## Alternative: Full Railway Deployment

For complete functionality without limitations, consider deploying entirely on Railway:

```bash
# Deploy everything on Railway
git clone https://github.com/Alpaca-Network/sim.git
cd sim
railway login
railway new
railway add --template postgresql-pgvector
bun run deploy:railway
```

See [DEPLOY_RAILWAY.md](./DEPLOY_RAILWAY.md) for complete Railway deployment guide.

## Support

- [Vercel Documentation](https://vercel.com/docs)
- [Railway Documentation](https://docs.railway.app/) (for Socket.IO server)
- [Sim Documentation](https://docs.sim.ai/)

## Security Checklist

- [ ] Generate secure secrets for all environment variables
- [ ] Configure CORS for external Socket.IO server
- [ ] Use HTTPS for all service communications
- [ ] Enable Vercel's security headers
- [ ] Secure external database with SSL
