# K3s Deployment Guide for TE Data Generator

## Overview
This guide describes how to deploy the TE Data Generator application to a K3s Kubernetes cluster.

## Prerequisites
- Local machine with Docker installed
- `sshpass` installed for SSH automation
- Access to the target K3s server (141.164.45.95)

## Files Created

### 1. `/deploy-k3s.sh`
Main deployment script that automates the entire deployment process:
- Builds Docker images locally
- Saves and transfers images to the K3s server
- Loads images into K3s containerd
- Deploys applications to the cluster
- Monitors deployment status

### 2. `/k8s/deployment.yaml` (Fixed)
Kubernetes deployment configuration with:
- PersistentVolumeClaims (500GB for data, 5GB for logbus)
- Backend deployment (te-data-generator-backend)
- Frontend deployment (te-data-generator-frontend)
- **Fixed**: Removed typo in volumeMount path (`/app/../logbus 2` → `/app/../logbus`)

### 3. `/k8s/service.yaml`
Kubernetes service configuration:
- Backend service on port 3001
- Frontend service on port 8080 (external) → 3000 (internal)

### 4. `/k8s/secrets.yaml.template`
Template for Kubernetes secrets. **You need to create the actual secrets file**:

```bash
cp k8s/secrets.yaml.template k8s/secrets.yaml
# Edit k8s/secrets.yaml with your actual credentials
```

Required secrets:
- `database-url`: PostgreSQL connection string
- `jwt-secret`: JWT authentication secret
- `anthropic-api-key`: Anthropic API key for AI features

## Deployment Steps

### Step 1: Create Secrets File
```bash
cp k8s/secrets.yaml.template k8s/secrets.yaml
vim k8s/secrets.yaml  # Edit with your actual credentials
```

### Step 2: Run Deployment Script
```bash
./deploy-k3s.sh
```

The script will:
1. Build Docker images locally (backend and frontend)
2. Save images to tar files
3. Copy images and manifests to the K3s server
4. Load images into K3s containerd
5. Deploy to the `korea` namespace
6. Wait for rollout completion
7. Display deployment status

### Step 3: Verify Deployment
```bash
# Check pod status
ssh root@141.164.45.95 "kubectl get pods -n korea"

# Check logs
ssh root@141.164.45.95 "kubectl logs -f -n korea -l component=backend"
ssh root@141.164.45.95 "kubectl logs -f -n korea -l component=frontend"
```

## Manual Deployment (Alternative)

If you prefer to deploy manually:

```bash
# 1. Build images
docker build -f data-generator/Dockerfile -t te-data-generator-backend:latest .
docker build -f frontend/Dockerfile -t te-data-generator-frontend:latest .

# 2. Save and transfer images
docker save te-data-generator-backend:latest -o /tmp/backend.tar
docker save te-data-generator-frontend:latest -o /tmp/frontend.tar
scp /tmp/*.tar root@141.164.45.95:/tmp/

# 3. Load images on K3s
ssh root@141.164.45.95 "k3s ctr images import /tmp/backend.tar"
ssh root@141.164.45.95 "k3s ctr images import /tmp/frontend.tar"

# 4. Copy manifests
scp k8s/*.yaml root@141.164.45.95:/tmp/

# 5. Deploy
ssh root@141.164.45.95 "kubectl create namespace korea --dry-run=client -o yaml | kubectl apply -f -"
ssh root@141.164.45.95 "kubectl apply -f /tmp/secrets.yaml -n korea"
ssh root@141.164.45.95 "kubectl apply -f /tmp/deployment.yaml -n korea"
ssh root@141.164.45.95 "kubectl apply -f /tmp/service.yaml -n korea"
```

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  nginx (Port 80) - Reverse Proxy                    │
│  ↓                                                   │
│  ┌─────────────────────────────────────────────┐    │
│  │  Frontend Service (Port 8080)                │    │
│  │  ↓                                           │    │
│  │  Frontend Pod (Next.js on Port 3000)         │    │
│  └─────────────────────────────────────────────┘    │
│                                                      │
│  ┌─────────────────────────────────────────────┐    │
│  │  Backend Service (Port 3001)                 │    │
│  │  ↓                                           │    │
│  │  Backend Pod (Node.js API on Port 3001)      │    │
│  │  ├─ Volume: /app/output (500GB PVC)          │    │
│  │  └─ Volume: /app/../logbus (5GB PVC)         │    │
│  └─────────────────────────────────────────────┘    │
│                                                      │
│  Storage:                                           │
│  - data-pvc (500GB) - for generated data            │
│  - logbus-pvc (5GB) - for logging                   │
└─────────────────────────────────────────────────────┘
```

## Environment Variables

Backend container environment:
- `NODE_ENV=production`
- `API_PORT=3001`
- `DATABASE_URL` (from secret)
- `JWT_SECRET` (from secret)
- `ANTHROPIC_API_KEY` (from secret)

Frontend container environment:
- `NODE_ENV=production`
- `API_URL=http://te-data-generator-backend:3001`

## Troubleshooting

### Pods are in Pending state
Check PVC status:
```bash
kubectl get pvc -n korea
kubectl describe pvc data-pvc -n korea
```

### Pods are in ErrImagePull
Verify images are loaded:
```bash
k3s ctr images ls | grep te-data-generator
```

### Container crashes on startup
Check logs:
```bash
kubectl logs -n korea -l component=backend
kubectl describe pod -n korea -l component=backend
```

### Database connection errors
Verify secrets are created:
```bash
kubectl get secrets -n korea
kubectl describe secret te-data-generator-secrets -n korea
```

## Resource Limits

Backend:
- Requests: 256Mi memory, 250m CPU
- Limits: 1Gi memory, 1000m CPU

Frontend:
- Requests: 256Mi memory, 250m CPU
- Limits: 512Mi memory, 500m CPU

## Next Steps

1. **Configure nginx** to proxy traffic to the frontend service
2. **Set up monitoring** (Prometheus/Grafana)
3. **Configure backup** for PVCs
4. **Set up CI/CD pipeline** for automated deployments
5. **Add health checks** and liveness probes
6. **Configure horizontal pod autoscaling** if needed

## Access

Once deployed:
- Frontend: http://141.164.45.95
- Backend API: http://141.164.45.95/api (via nginx proxy)

## Notes

- Images are stored in K3s containerd, not Docker registry
- `imagePullPolicy: Never` ensures K3s uses local images
- PVCs must be provisioned before pods can start
- Secrets must exist before deploying applications
