## Deploy to Google Cloud (GKE)

Prerequisites:
- gcloud (authenticated), kubectl, helm installed
- A GCP project with billing enabled
- Two DNS hostnames for the app and websocket (e.g., sim.example.com, ws.sim.example.com)

1) Prepare values
- Copy the example and edit required fields:
```
cp /workspace/helm/sim/examples/values-gcp.yaml /workspace/helm/sim/values.prod.yaml
```
- Update in your copy:
  - app.env: NEXT_PUBLIC_APP_URL, BETTER_AUTH_URL, SOCKET_SERVER_URL, NEXT_PUBLIC_SOCKET_URL
  - app.env: BETTER_AUTH_SECRET, ENCRYPTION_KEY (use secure random)
  - app.env: GOOGLE_CLOUD_PROJECT, GOOGLE_CLOUD_REGION
  - ingress.annotations:
    - kubernetes.io/ingress.global-static-ip-name: your-global-ip-name
    - networking.gke.io/managed-certificates: simstudio-ssl-cert (matches the script)
  - ingress.app.host and ingress.realtime.host with your domains
  - If not using GPUs, set `ollama.enabled: false`
  - Choose database:
    - Internal: keep `postgresql.enabled: true` and set a strong password
    - Cloud SQL: set `postgresql.enabled: false`, `externalDatabase.enabled: true` and fill host/port/user/password/ssl

2) Create or use a GKE cluster
- Autopilot:
```
bash /workspace/scripts/gcp/deploy-gke.sh \
  --project YOUR_PROJECT \
  --region us-central1 \
  --cluster sim-autopilot \
  --namespace simstudio \
  --ip-name simstudio-ip \
  --app-host sim.example.com \
  --ws-host ws.sim.example.com \
  --values /workspace/helm/sim/values.prod.yaml \
  --create-cluster --autopilot --yes
```
- Standard (example sizing):
```
bash /workspace/scripts/gcp/deploy-gke.sh \
  --project YOUR_PROJECT \
  --region us-central1 \
  --cluster sim-standard \
  --namespace simstudio \
  --ip-name simstudio-ip \
  --app-host sim.example.com \
  --ws-host ws.sim.example.com \
  --values /workspace/helm/sim/values.prod.yaml \
  --create-cluster --yes
```

3) Point DNS to the static IP
- The script reserves/uses a global static IP named `--ip-name`.
- Get the IP: `gcloud compute addresses describe simstudio-ip --global --format='value(address)'`
- Create A records for `sim.example.com` and `ws.sim.example.com` pointing to that IP.

4) Verify
- Ingress: `kubectl get ingress -n simstudio`
- Certificate: `kubectl describe managedcertificate simstudio-ssl-cert -n simstudio`
- NEG/Backends (optional): `kubectl describe service sim-app -n simstudio`

Notes
- Workload Identity: set `serviceAccount.annotations.iam.gke.io/gcp-service-account` and bind IAM.
- GPUs: ensure a GPU node pool and keep `ollama.enabled: true` with matching selectors.
- Migrations: enabled by default; ensure DB is reachable on first deploy.

