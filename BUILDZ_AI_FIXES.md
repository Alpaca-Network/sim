# buildz.ai Error Fixes

This document outlines the fixes applied to resolve the 500 error and WebSocket connection issues on buildz.ai/workspace.

## Issues Identified

1. **API 500 Error**: `/api/workspaces` endpoint was failing due to insufficient error handling
2. **WebSocket Connection Failure**: `wss://buildz.ai/socket.io/` connection was being closed before establishment

## Root Causes

### 1. API Error Handling
- The `/api/workspaces` endpoint lacked comprehensive try-catch error handling
- Database connection errors or session issues were not properly caught and logged
- Error responses didn't provide sufficient debugging information

### 2. WebSocket Configuration Issues
- Missing WebSocket-specific ingress annotations for GKE
- No BackendConfig for proper WebSocket connection handling
- Potential CORS configuration issues for buildz.ai domain
- Client-side socket URL validation needed improvement

## Fixes Applied

### 1. Enhanced API Error Handling

**File**: `apps/sim/app/api/workspaces/route.ts`

- Wrapped the entire GET function in try-catch block
- Added comprehensive logging for debugging
- Enhanced error responses with detailed error messages
- Added user context logging for better troubleshooting

### 2. WebSocket Infrastructure Improvements

**File**: `helm/sim/examples/ingress-buildz.yaml`

- Added WebSocket-specific annotations:
  - `nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"`
  - `nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"`
  - `cloud.google.com/backend-config` reference for WebSocket support

**File**: `helm/sim/examples/backend-config-buildz.yaml` (NEW)

- Created BackendConfig for WebSocket connections:
  - Connection draining for graceful shutdowns
  - Extended timeout for WebSocket connections (3600s)
  - Session affinity with CLIENT_IP
  - Health check configuration pointing to `/health` endpoint

### 3. Socket Server CORS Configuration

**File**: `apps/sim/socket-server/config/socket.ts`

- Explicitly added buildz.ai domains to allowed origins:
  - `https://buildz.ai`
  - `https://www.buildz.ai`

### 4. Client-Side Socket Configuration

**File**: `apps/sim/contexts/socket-context.tsx`

- Added validation to detect socket URL misconfigurations
- Enhanced logging for socket connection debugging
- Added environment variable debugging information

## Deployment Instructions

### Automatic Deployment

Run the deployment script:

```bash
./deploy-buildz-fix.sh
```

### Manual Deployment

1. **Apply BackendConfig**:
   ```bash
   kubectl apply -f helm/sim/examples/backend-config-buildz.yaml
   ```

2. **Update Ingress**:
   ```bash
   kubectl apply -f helm/sim/examples/ingress-buildz.yaml
   ```

3. **Upgrade Helm Deployment**:
   ```bash
   helm upgrade sim-gcp ./helm/sim \
     --namespace simstudio \
     --values helm/sim/examples/values-gcp-buildz.yaml \
     --wait \
     --timeout=10m
   ```

4. **Verify Deployment**:
   ```bash
   kubectl get pods -n simstudio -l app.kubernetes.io/name=sim-gcp
   kubectl get ingress -n simstudio sim-ingress
   ```

## Verification Steps

### 1. API Endpoint Test
```bash
# Test the workspaces API (requires authentication)
curl -H "Authorization: Bearer <token>" https://buildz.ai/api/workspaces
```

### 2. WebSocket Health Check
```bash
# Test WebSocket server health
curl https://ws.buildz.ai/health
```

### 3. WebSocket Connection Test
- Open browser DevTools on https://buildz.ai
- Navigate to Network tab, filter by "WS"
- Look for successful socket.io connections to ws.buildz.ai

### 4. Diagnostic Script
Run the diagnostic script for comprehensive checks:
```bash
./diagnose-buildz-issue.sh
```

## Expected Behavior After Fixes

1. **API Endpoints**: Should return proper JSON responses or detailed error messages instead of generic 500 errors
2. **WebSocket Connections**: Should successfully connect to `wss://ws.buildz.ai/socket.io/`
3. **Real-time Features**: Collaborative editing, presence indicators, and live updates should work properly

## Monitoring and Troubleshooting

### Log Monitoring
```bash
# Monitor application logs
kubectl logs -n simstudio -l app.kubernetes.io/name=sim-gcp -f

# Monitor WebSocket server logs
kubectl logs -n simstudio -l app=sim-gcp-realtime -f
```

### Common Issues and Solutions

1. **DNS Resolution**: Ensure ws.buildz.ai resolves correctly
2. **SSL Certificate**: Verify certificate covers both buildz.ai and ws.buildz.ai
3. **Environment Variables**: Check NEXT_PUBLIC_SOCKET_URL is set correctly in pods
4. **Load Balancer**: Ensure GKE ingress properly routes WebSocket traffic

## Files Modified

1. `apps/sim/app/api/workspaces/route.ts` - Enhanced error handling
2. `apps/sim/socket-server/config/socket.ts` - Added buildz.ai CORS origins
3. `apps/sim/contexts/socket-context.tsx` - Added URL validation and debugging
4. `helm/sim/examples/ingress-buildz.yaml` - Added WebSocket annotations
5. `helm/sim/examples/backend-config-buildz.yaml` - NEW: WebSocket backend config

## Files Created

1. `deploy-buildz-fix.sh` - Automated deployment script
2. `diagnose-buildz-issue.sh` - Diagnostic script
3. `helm/sim/examples/backend-config-buildz.yaml` - WebSocket backend configuration
4. `BUILDZ_AI_FIXES.md` - This documentation

The fixes address both the immediate 500 error and the underlying WebSocket connectivity issues, providing a more robust and debuggable system.