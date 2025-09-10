# Deploying Sim to Railway

Railway is the **recommended platform** for deploying Sim due to its excellent support for multi-service applications and PostgreSQL with pgvector extension.

## Prerequisites

1. [Railway CLI](https://docs.railway.app/develop/cli) installed
2. Railway account with billing enabled
3. Git repository connected to Railway

## Architecture

Railway deployment consists of three services:
- **Main App**: Next.js application (port 3000)
- **Realtime Server**: Socket.IO server (port 3002) 
- **Database**: PostgreSQL with pgvector extension

## Quick Deploy

1. **Clone and setup the repository:**
   ```bash
   git clone https://github.com/Alpaca-Network/sim.git
   cd sim
   bun install
   ```

2. **Login to Railway:**
   ```bash
   railway login
   ```

3. **Create a new Railway project:**
   ```bash
   railway new
   ```

4. **Add PostgreSQL with pgvector:**
   ```bash
   railway add --template postgresql-pgvector
   ```

5. **Deploy the services:**
   ```bash
   bun run deploy:railway
   ```

## Manual Setup

### 1. Database Setup

Add a PostgreSQL database with pgvector extension:

```bash
railway add --template postgresql-pgvector
```

This will create a PostgreSQL service with the pgvector extension pre-installed.

### 2. Environment Variables

Set the following environment variables in your Railway project:

**Required Variables:**
```bash
# Database (automatically set by Railway PostgreSQL service)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Authentication (generate with: openssl rand -hex 32)
BETTER_AUTH_SECRET=your_32_char_secret_here
BETTER_AUTH_URL=${{RAILWAY_PUBLIC_DOMAIN}}

# NextJS
NEXT_PUBLIC_APP_URL=${{RAILWAY_PUBLIC_DOMAIN}}

# Security (generate with: openssl rand -hex 32)  
ENCRYPTION_KEY=your_32_char_encryption_key_here

# Service URLs (Railway internal networking)
SOCKET_SERVER_URL=http://realtime.railway.internal:3002
NEXT_PUBLIC_SOCKET_URL=${{RAILWAY_PUBLIC_DOMAIN}}/socket.io
```

**Optional Variables:**
```bash
# Email Provider
RESEND_API_KEY=your_resend_api_key

# OAuth Providers
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_CLIENT_ID=your_github_client_id  
GITHUB_CLIENT_SECRET=your_github_client_secret

# AI Providers
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key

# Local AI Models (if using Ollama)
OLLAMA_URL=http://ollama.railway.internal:11434
```

### 3. Service Configuration

The `railway.json` file is configured for multi-service deployment:

- **App Service**: Runs the Next.js application
- **Realtime Service**: Runs the Socket.IO server

### 4. Database Migration

After deployment, run the database migrations:

```bash
railway run --service app bunx drizzle-kit migrate
```

## Custom Domains

1. **Add a custom domain in Railway dashboard**
2. **Update environment variables:**
   ```bash
   BETTER_AUTH_URL=https://yourdomain.com
   NEXT_PUBLIC_APP_URL=https://yourdomain.com
   NEXT_PUBLIC_SOCKET_URL=https://yourdomain.com/socket.io
   ```

## Monitoring and Logs

**View logs:**
```bash
# Main app logs
railway logs --service app

# Realtime server logs  
railway logs --service realtime

# Database logs
railway logs --service postgres
```

**Health checks:**
- Main app: `https://yourdomain.com/api/health`
- Realtime server: `https://yourdomain.com/socket.io/health`

## Scaling

Railway automatically handles scaling based on traffic. You can configure:

- **Vertical scaling**: Increase memory/CPU in service settings
- **Horizontal scaling**: Enable autoscaling in Railway dashboard

## Troubleshooting

### Common Issues

1. **Build failures:**
   - Ensure Bun is properly configured in Railway
   - Check build logs for dependency issues

2. **Database connection issues:**
   - Verify DATABASE_URL is correctly set
   - Ensure pgvector extension is installed

3. **Socket.IO connection issues:**
   - Check SOCKET_SERVER_URL and NEXT_PUBLIC_SOCKET_URL
   - Verify realtime service is running

4. **Authentication issues:**
   - Ensure BETTER_AUTH_SECRET is set and 32 characters
   - Verify BETTER_AUTH_URL matches your domain

### Support

- [Railway Documentation](https://docs.railway.app/)
- [Railway Discord](https://discord.gg/railway)
- [Sim Documentation](https://docs.sim.ai/)

## Cost Optimization

- Use Railway's sleep mode for development environments
- Monitor resource usage in Railway dashboard
- Consider using Railway's shared databases for development

## Security Checklist

- [ ] Generate secure secrets for BETTER_AUTH_SECRET and ENCRYPTION_KEY
- [ ] Use environment variables for all sensitive data
- [ ] Enable Railway's built-in security features
- [ ] Configure proper CORS settings
- [ ] Use HTTPS for production domains
