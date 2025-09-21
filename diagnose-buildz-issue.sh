#!/bin/bash

# Diagnostic script for buildz.ai issues
# This script helps identify the root cause of the API 500 error and WebSocket connection issues

set -e

echo "🔍 Diagnosing buildz.ai issues..."

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to test HTTP endpoint
test_http() {
    local url="$1"
    local description="$2"
    echo "Testing $description: $url"
    
    if command_exists curl; then
        response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
        if [[ "$response" == "200" ]]; then
            echo "✅ $description: OK ($response)"
        else
            echo "❌ $description: Failed ($response)"
        fi
    else
        echo "⚠️  curl not available, skipping HTTP test"
    fi
}

# Function to test DNS resolution
test_dns() {
    local domain="$1"
    echo "Testing DNS resolution for $domain..."
    
    if command_exists nslookup; then
        if nslookup "$domain" >/dev/null 2>&1; then
            echo "✅ DNS resolution for $domain: OK"
        else
            echo "❌ DNS resolution for $domain: Failed"
        fi
    else
        echo "⚠️  nslookup not available, skipping DNS test"
    fi
}

# Function to check Kubernetes resources
check_k8s_resources() {
    if ! command_exists kubectl; then
        echo "⚠️  kubectl not available, skipping Kubernetes checks"
        return
    fi
    
    echo "📋 Checking Kubernetes resources..."
    
    # Check if namespace exists
    if kubectl get namespace simstudio >/dev/null 2>&1; then
        echo "✅ Namespace 'simstudio' exists"
    else
        echo "❌ Namespace 'simstudio' not found"
        return
    fi
    
    # Check pods
    echo "Pod status:"
    kubectl get pods -n simstudio -l app.kubernetes.io/name=sim-gcp 2>/dev/null || echo "❌ No app pods found"
    kubectl get pods -n simstudio -l app=sim-gcp-realtime 2>/dev/null || echo "❌ No realtime pods found"
    
    # Check services
    echo "Service status:"
    kubectl get svc -n simstudio sim-gcp-app 2>/dev/null || echo "❌ App service not found"
    kubectl get svc -n simstudio sim-gcp-realtime 2>/dev/null || echo "❌ Realtime service not found"
    
    # Check ingress
    echo "Ingress status:"
    kubectl get ingress -n simstudio sim-ingress 2>/dev/null || echo "❌ Ingress not found"
    
    # Check backend config
    echo "BackendConfig status:"
    kubectl get backendconfig -n simstudio sim-gcp-realtime-backendconfig 2>/dev/null || echo "⚠️  BackendConfig not found (may not be applied yet)"
}

# Function to check environment variables in pods
check_env_vars() {
    if ! command_exists kubectl; then
        echo "⚠️  kubectl not available, skipping environment variable checks"
        return
    fi
    
    echo "🔧 Checking environment variables in pods..."
    
    # Get first app pod
    local app_pod=$(kubectl get pods -n simstudio -l app.kubernetes.io/name=sim-gcp -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
    if [[ -n "$app_pod" ]]; then
        echo "Checking environment variables in app pod: $app_pod"
        echo "NEXT_PUBLIC_APP_URL:"
        kubectl exec -n simstudio "$app_pod" -- printenv NEXT_PUBLIC_APP_URL 2>/dev/null || echo "❌ Not set"
        echo "NEXT_PUBLIC_SOCKET_URL:"
        kubectl exec -n simstudio "$app_pod" -- printenv NEXT_PUBLIC_SOCKET_URL 2>/dev/null || echo "❌ Not set"
        echo "DATABASE_URL:"
        kubectl exec -n simstudio "$app_pod" -- printenv DATABASE_URL 2>/dev/null | sed 's/.*@/***@/' || echo "❌ Not set"
    else
        echo "❌ No app pods found"
    fi
    
    # Get first realtime pod
    local realtime_pod=$(kubectl get pods -n simstudio -l app=sim-gcp-realtime -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
    if [[ -n "$realtime_pod" ]]; then
        echo "Checking environment variables in realtime pod: $realtime_pod"
        echo "SOCKET_SERVER_URL:"
        kubectl exec -n simstudio "$realtime_pod" -- printenv SOCKET_SERVER_URL 2>/dev/null || echo "❌ Not set"
        echo "NEXT_PUBLIC_APP_URL:"
        kubectl exec -n simstudio "$realtime_pod" -- printenv NEXT_PUBLIC_APP_URL 2>/dev/null || echo "❌ Not set"
    else
        echo "❌ No realtime pods found"
    fi
}

echo "🌐 Testing DNS resolution..."
test_dns "buildz.ai"
test_dns "ws.buildz.ai"

echo ""
echo "🔗 Testing HTTP endpoints..."
test_http "https://buildz.ai" "Main app"
test_http "https://ws.buildz.ai/health" "WebSocket server health"

echo ""
check_k8s_resources

echo ""
check_env_vars

echo ""
echo "📝 Manual checks to perform:"
echo "1. Verify SSL certificate covers both buildz.ai and ws.buildz.ai"
echo "2. Check if NEXT_PUBLIC_SOCKET_URL is properly set in the browser (DevTools -> Application -> Local Storage)"
echo "3. Test WebSocket connection manually:"
echo "   - Open browser DevTools on https://buildz.ai"
echo "   - Go to Network tab, filter by WS"
echo "   - Look for socket.io connections and check for errors"
echo "4. Check application logs:"
echo "   kubectl logs -n simstudio -l app.kubernetes.io/name=sim-gcp --tail=100"
echo "   kubectl logs -n simstudio -l app=sim-gcp-realtime --tail=100"

echo ""
echo "🔍 Diagnosis complete!"