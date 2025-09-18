#!/usr/bin/env bash
set -euo pipefail

# Sim/GKE deployment helper
# - Creates/uses a GKE cluster
# - Reserves/uses a global static IP
# - Creates a ManagedCertificate for your domains
# - Installs/updates the Helm chart with your values file

# Requirements:
# - gcloud (authenticated), kubectl, helm

usage() {
  cat <<EOF
Usage: $0 \
  --project <PROJECT_ID> \
  --region <REGION> \
  --cluster <CLUSTER_NAME> \
  --namespace <K8S_NAMESPACE> \
  --ip-name <GLOBAL_STATIC_IP_NAME> \
  --app-host <app.example.com> \
  --ws-host <ws.example.com> \
  --values <path/to/values.yaml> \
  [--create-cluster] [--autopilot] [--yes]

Notes:
  - Provide a ready values.yaml (you can start from helm/sim/examples/values-gcp.yaml).
  - --autopilot creates an Autopilot cluster (no GPU/nodepool tuning). Omit for Standard GKE.
  - --create-cluster will create the cluster if it doesn't exist.
  - --yes runs without interactive confirmations.
EOF
}

confirm() {
  local prompt="$1"
  if [[ "${ASSUME_YES:-false}" == "true" ]]; then
    return 0
  fi
  read -r -p "$prompt [y/N]: " ans || true
  [[ "$ans" == "y" || "$ans" == "Y" ]]
}

require_bin() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: required binary '$1' not found in PATH" >&2
    exit 1
  fi
}

PROJECT=""
REGION=""
CLUSTER=""
NAMESPACE=""
GLOBAL_IP_NAME=""
APP_HOST=""
WS_HOST=""
VALUES_FILE=""
CREATE_CLUSTER=false
AUTOPILOT=false
ASSUME_YES=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project) PROJECT="$2"; shift 2 ;;
    --region) REGION="$2"; shift 2 ;;
    --cluster) CLUSTER="$2"; shift 2 ;;
    --namespace) NAMESPACE="$2"; shift 2 ;;
    --ip-name) GLOBAL_IP_NAME="$2"; shift 2 ;;
    --app-host) APP_HOST="$2"; shift 2 ;;
    --ws-host) WS_HOST="$2"; shift 2 ;;
    --values) VALUES_FILE="$2"; shift 2 ;;
    --create-cluster) CREATE_CLUSTER=true; shift ;;
    --autopilot) AUTOPILOT=true; shift ;;
    --yes|-y) ASSUME_YES=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown arg: $1" >&2; usage; exit 1 ;;
  esac
done

for var in PROJECT REGION CLUSTER NAMESPACE GLOBAL_IP_NAME APP_HOST WS_HOST VALUES_FILE; do
  if [[ -z "${!var}" ]]; then
    echo "Missing required --${var,,} argument" >&2
    usage
    exit 1
  fi
done

require_bin gcloud
require_bin kubectl
require_bin helm

if [[ ! -f "$VALUES_FILE" ]]; then
  echo "Values file not found: $VALUES_FILE" >&2
  exit 1
fi

echo "Setting gcloud project: $PROJECT"
gcloud config set project "$PROJECT" >/dev/null

echo "Enabling required APIs (container, compute)"
gcloud services enable container.googleapis.com compute.googleapis.com >/dev/null

if ! gcloud compute addresses describe "$GLOBAL_IP_NAME" --global >/dev/null 2>&1; then
  echo "Creating global static IP: $GLOBAL_IP_NAME"
  gcloud compute addresses create "$GLOBAL_IP_NAME" --global >/dev/null
else
  echo "Global static IP '$GLOBAL_IP_NAME' already exists"
fi

IP_ADDR=$(gcloud compute addresses describe "$GLOBAL_IP_NAME" --global --format="value(address)")
echo "Global static IP address: $IP_ADDR"

if ! gcloud container clusters describe "$CLUSTER" --region "$REGION" >/dev/null 2>&1; then
  if [[ "$CREATE_CLUSTER" == true ]]; then
    echo "Creating GKE cluster: $CLUSTER in $REGION (autopilot=$AUTOPILOT)"
    if [[ "$AUTOPILOT" == true ]]; then
      gcloud container clusters create-auto "$CLUSTER" --region "$REGION"
    else
      gcloud container clusters create "$CLUSTER" \
        --region "$REGION" \
        --machine-type e2-standard-4 \
        --num-nodes 2 \
        --release-channel regular
    fi
  else
    echo "Cluster '$CLUSTER' not found in region '$REGION'. Re-run with --create-cluster to create it." >&2
    exit 1
  fi
else
  echo "Cluster '$CLUSTER' exists"
fi

echo "Fetching cluster credentials"
gcloud container clusters get-credentials "$CLUSTER" --region "$REGION"

if ! kubectl get namespace "$NAMESPACE" >/dev/null 2>&1; then
  echo "Creating namespace: $NAMESPACE"
  kubectl create namespace "$NAMESPACE"
else
  echo "Namespace '$NAMESPACE' exists"
fi

# Create/Update ManagedCertificate
CERT_NAME="simstudio-ssl-cert"
echo "Applying ManagedCertificate '$CERT_NAME' for $APP_HOST and $WS_HOST"
cat <<YAML | kubectl apply -n "$NAMESPACE" -f -
apiVersion: networking.gke.io/v1
kind: ManagedCertificate
metadata:
  name: $CERT_NAME
spec:
  domains:
    - $APP_HOST
    - $WS_HOST
YAML

echo "Preparing Helm release values"
RELEASE_NAME="sim"

echo "About to install/upgrade Helm chart with:\n  release: $RELEASE_NAME\n  namespace: $NAMESPACE\n  values: $VALUES_FILE"
if confirm "Proceed with helm upgrade --install?"; then
  helm upgrade --install "$RELEASE_NAME" /workspace/helm/sim \
    --namespace "$NAMESPACE" \
    --values "$VALUES_FILE"
else
  echo "Aborted by user"
  exit 1
fi

echo "Waiting for Ingress to be created (this may take several minutes)"
echo "Tip: kubectl get ingress -n $NAMESPACE -w"

echo "Done. Next steps:\n- Point DNS A records for $APP_HOST and $WS_HOST to $IP_ADDR\n- Monitor certificate provisioning: kubectl describe managedcertificate $CERT_NAME -n $NAMESPACE\n- Check Ingress: kubectl get ingress -n $NAMESPACE"

