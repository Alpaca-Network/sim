#!/bin/bash

# Deployment script for buildz.ai WebSocket and API fixes
# This script applies the necessary configurations to fix the 500 error and WebSocket connection issues

set -e

echo "🚀 Deploying fixes for buildz.ai..."

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl not found. Please install kubectl and configure it for your cluster."
    exit 1
fi

# Check if we're in the right directory
if [[ ! -f "helm/sim/examples/values-gcp-buildz.yaml" ]]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

echo "📋 Applying configurations..."

# Apply the backend config for WebSocket support
echo "1. Creating BackendConfig for WebSocket support..."
kubectl apply -f helm/sim/examples/backend-config-buildz.yaml

# Apply the updated ingress configuration
echo "2. Updating Ingress configuration..."
kubectl apply -f helm/sim/examples/ingress-buildz.yaml

# Update the Helm deployment with the latest configurations
echo "3. Upgrading Helm deployment..."
helm upgrade sim-gcp ./helm/sim \
  --namespace simstudio \
  --values helm/sim/examples/values-gcp-buildz.yaml \
  --wait \
  --timeout=10m

echo "4. Waiting for pods to be ready..."
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=sim-gcp --namespace=simstudio --timeout=300s

echo "5. Checking deployment status..."
kubectl get pods -n simstudio -l app.kubernetes.io/name=sim-gcp

echo "6. Checking ingress status..."
kubectl get ingress -n simstudio sim-ingress

echo "✅ Deployment completed successfully!"
echo ""
echo "🔍 To verify the fixes:"
echo "1. Check API endpoint: curl -H 'Authorization: Bearer <token>' https://buildz.ai/api/workspaces"
echo "2. Check WebSocket health: curl https://ws.buildz.ai/health"
echo "3. Monitor logs: kubectl logs -n simstudio -l app=sim-gcp-realtime -f"
echo ""
echo "📝 If issues persist, check:"
echo "- DNS resolution for ws.buildz.ai"
echo "- SSL certificate for ws.buildz.ai subdomain"
echo "- Environment variable NEXT_PUBLIC_SOCKET_URL in the app pods"