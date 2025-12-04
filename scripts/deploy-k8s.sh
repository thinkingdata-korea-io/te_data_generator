#!/bin/bash
set -e

NAMESPACE=${NAMESPACE:-korea}

echo "🚀 Deploying to Kubernetes namespace: ${NAMESPACE}"

# Apply namespace (idempotent)
echo "📦 Applying namespace..."
kubectl apply -f k8s/namespace.yaml

# Apply ConfigMap
echo "⚙️  Applying ConfigMap..."
kubectl apply -f k8s/configmap.yaml -n ${NAMESPACE}

# Check Secret (don't fail if missing)
echo "🔐 Checking Secret..."
kubectl get secret te-data-generator-secrets -n ${NAMESPACE} > /dev/null 2>&1 || \
  echo "⚠️  Warning: Secret 'te-data-generator-secrets' not found. Please create it manually."

# Delete old deployments (ignore errors if not exist)
echo "🗑️  Deleting old deployments (if any)..."
kubectl delete deployment te-data-generator-backend -n ${NAMESPACE} 2>/dev/null || echo "  Backend deployment not found (OK for first deploy)"
kubectl delete deployment te-data-generator-frontend -n ${NAMESPACE} 2>/dev/null || echo "  Frontend deployment not found (OK for first deploy)"

# Apply new deployments
echo "📦 Applying Deployments..."
kubectl apply -f k8s/deployment.yaml -n ${NAMESPACE}

# Apply Services
echo "🌐 Applying Services..."
kubectl apply -f k8s/service.yaml -n ${NAMESPACE}

# Apply Ingress
echo "🔀 Applying Ingress..."
kubectl apply -f k8s/ingress.yaml -n ${NAMESPACE}

# Wait for rollout
echo "⏳ Waiting for rollout to complete..."
kubectl rollout status deployment/te-data-generator-backend -n ${NAMESPACE} --timeout=5m || true
kubectl rollout status deployment/te-data-generator-frontend -n ${NAMESPACE} --timeout=5m || true

# Show deployment status
echo ""
echo "✅ Deployment completed!"
echo ""
echo "📊 Deployment Status:"
kubectl get deployments -n ${NAMESPACE}
echo ""
echo "🏃 Pod Status:"
kubectl get pods -n ${NAMESPACE}
echo ""
echo "🌐 Service Status:"
kubectl get svc -n ${NAMESPACE}
echo ""
echo "🔗 Application URL: http://te-data-generator.tx-local.thinkingdata.cn"
