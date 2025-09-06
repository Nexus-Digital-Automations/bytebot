# Kubernetes Deployment Guide

## Overview

This guide covers deploying Bytebot in a production Kubernetes environment with enterprise-grade security, monitoring, and reliability features implemented in Phase 1.

## Prerequisites

- Kubernetes cluster v1.25+ 
- kubectl configured for cluster access
- Helm 3.0+ installed
- Docker registry access
- PostgreSQL database (managed or self-hosted)
- Redis for job queuing and session storage
- TLS certificates for HTTPS

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Kubernetes Cluster                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Load Balancer │  │     Ingress     │  │       TLS       │ │
│  │   (External)    │  │   Controller    │  │   Termination   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    Bytebot Services                         │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │ │
│  │  │   API        │  │   Worker     │  │  WebSocket   │    │ │
│  │  │   Server     │  │   Pods       │  │   Handler    │    │ │
│  │  │   (3 pods)   │  │  (5 pods)    │  │   (2 pods)   │    │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘    │ │
│  └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                   Data & Monitoring                        │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │ │
│  │  │  PostgreSQL  │  │    Redis     │  │  Prometheus  │    │ │
│  │  │    (HA)      │  │   Cluster    │  │  + Grafana   │    │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘    │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Add Bytebot Helm Repository

```bash
helm repo add bytebot https://charts.bytebot.com
helm repo update
```

### 2. Create Namespace

```bash
kubectl create namespace bytebot-production
kubectl label namespace bytebot-production name=bytebot-production
```

### 3. Configure Secrets

```bash
# Database credentials
kubectl create secret generic bytebot-db-secret \
  --namespace=bytebot-production \
  --from-literal=username='bytebot_user' \
  --from-literal=password='secure_db_password' \
  --from-literal=host='postgres.database.svc.cluster.local' \
  --from-literal=database='bytebot_production'

# Redis credentials  
kubectl create secret generic bytebot-redis-secret \
  --namespace=bytebot-production \
  --from-literal=password='secure_redis_password' \
  --from-literal=host='redis.cache.svc.cluster.local'

# JWT signing keys
kubectl create secret generic bytebot-jwt-secret \
  --namespace=bytebot-production \
  --from-literal=access-token-private-key="$(cat ./keys/access-token-private.pem)" \
  --from-literal=access-token-public-key="$(cat ./keys/access-token-public.pem)" \
  --from-literal=refresh-token-private-key="$(cat ./keys/refresh-token-private.pem)" \
  --from-literal=refresh-token-public-key="$(cat ./keys/refresh-token-public.pem)"

# TLS certificates
kubectl create secret tls bytebot-tls-secret \
  --namespace=bytebot-production \
  --cert=./certs/bytebot.crt \
  --key=./certs/bytebot.key
```

### 4. Install with Helm

```bash
helm install bytebot bytebot/bytebot \
  --namespace bytebot-production \
  --values values-production.yaml \
  --wait --timeout=10m
```

## Configuration

### Production Values File

Create `values-production.yaml`:

```yaml
# values-production.yaml
global:
  environment: production
  domain: api.bytebot.com
  imageRegistry: your-registry.com/bytebot
  imageTag: "1.0.0"

# Replica configuration
replicas:
  api: 3
  worker: 5
  websocket: 2
  scheduler: 1

# Resource limits
resources:
  api:
    requests:
      cpu: 500m
      memory: 1Gi
    limits:
      cpu: 2000m
      memory: 4Gi
  worker:
    requests:
      cpu: 1000m
      memory: 2Gi
    limits:
      cpu: 4000m
      memory: 8Gi
  websocket:
    requests:
      cpu: 200m
      memory: 512Mi
    limits:
      cpu: 1000m
      memory: 2Gi

# Database configuration
database:
  type: postgresql
  host: postgres.database.svc.cluster.local
  port: 5432
  name: bytebot_production
  existingSecret: bytebot-db-secret
  ssl: true
  poolSize: 20
  connectionTimeout: 30s

# Redis configuration
redis:
  host: redis.cache.svc.cluster.local
  port: 6379
  existingSecret: bytebot-redis-secret
  database: 0
  keyPrefix: "bytebot:prod:"

# Security configuration
security:
  jwt:
    existingSecret: bytebot-jwt-secret
    accessTokenLifetime: "15m"
    refreshTokenLifetime: "7d"
  
  cors:
    enabled: true
    origins:
      - "https://app.bytebot.com"
      - "https://dashboard.bytebot.com"
    credentials: true
  
  rateLimiting:
    enabled: true
    windowMs: 60000  # 1 minute
    max: 100         # requests per window
    
  helmet:
    enabled: true
    hsts: true
    noSniff: true
    xssFilter: true

# Ingress configuration
ingress:
  enabled: true
  className: nginx
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "50m"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
  
  hosts:
    - host: api.bytebot.com
      paths:
        - path: /
          pathType: Prefix
          service: bytebot-api
  
  tls:
    - secretName: bytebot-tls-secret
      hosts:
        - api.bytebot.com

# Health checks
healthCheck:
  livenessProbe:
    enabled: true
    path: /health/live
    initialDelaySeconds: 30
    periodSeconds: 10
    timeoutSeconds: 5
    failureThreshold: 3
    
  readinessProbe:
    enabled: true
    path: /health/ready
    initialDelaySeconds: 10
    periodSeconds: 5
    timeoutSeconds: 3
    failureThreshold: 2
    
  startupProbe:
    enabled: true
    path: /health/startup
    initialDelaySeconds: 10
    periodSeconds: 10
    timeoutSeconds: 5
    failureThreshold: 30

# Monitoring
monitoring:
  enabled: true
  prometheus:
    enabled: true
    port: 9090
    path: /metrics
    interval: 30s
    
  grafana:
    enabled: true
    dashboards:
      - bytebot-overview
      - bytebot-performance
      - bytebot-security
      
  logging:
    level: info
    format: json
    structured: true

# Storage
persistence:
  enabled: true
  storageClass: fast-ssd
  size: 100Gi
  accessMode: ReadWriteOnce

# HPA (Horizontal Pod Autoscaler)
autoscaling:
  enabled: true
  api:
    minReplicas: 3
    maxReplicas: 10
    targetCPUUtilizationPercentage: 70
    targetMemoryUtilizationPercentage: 80
  
  worker:
    minReplicas: 5
    maxReplicas: 20
    targetCPUUtilizationPercentage: 80
    targetMemoryUtilizationPercentage: 85

# Pod Disruption Budget
podDisruptionBudget:
  enabled: true
  api:
    minAvailable: 2
  worker:
    minAvailable: 3

# Network Policies
networkPolicy:
  enabled: true
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
      ports:
        - protocol: TCP
          port: 3000
    - from:
        - namespaceSelector:
            matchLabels:
              name: monitoring
      ports:
        - protocol: TCP
          port: 9090
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              name: database
      ports:
        - protocol: TCP
          port: 5432
    - to:
        - namespaceSelector:
            matchLabels:
              name: cache
      ports:
        - protocol: TCP
          port: 6379
```

### Environment-Specific Configurations

#### Staging Environment

```yaml
# values-staging.yaml
global:
  environment: staging
  domain: api-staging.bytebot.com

replicas:
  api: 2
  worker: 3
  websocket: 1

resources:
  api:
    requests:
      cpu: 250m
      memory: 512Mi
    limits:
      cpu: 1000m
      memory: 2Gi

database:
  name: bytebot_staging
  poolSize: 10

autoscaling:
  enabled: false
```

#### Development Environment

```yaml
# values-development.yaml
global:
  environment: development
  domain: api-dev.bytebot.com

replicas:
  api: 1
  worker: 2
  websocket: 1

resources:
  api:
    requests:
      cpu: 100m
      memory: 256Mi
    limits:
      cpu: 500m
      memory: 1Gi

database:
  name: bytebot_development
  poolSize: 5

security:
  rateLimiting:
    enabled: false
    
monitoring:
  enabled: false

autoscaling:
  enabled: false

persistence:
  enabled: false
```

## Deployment Commands

### Initial Deployment

```bash
# Create namespace
kubectl create namespace bytebot-production

# Apply secrets
kubectl apply -f secrets/

# Install with Helm
helm install bytebot bytebot/bytebot \
  --namespace bytebot-production \
  --values values-production.yaml \
  --wait --timeout=15m

# Verify deployment
kubectl get pods -n bytebot-production
kubectl get services -n bytebot-production
kubectl get ingress -n bytebot-production
```

### Rolling Updates

```bash
# Update to new version
helm upgrade bytebot bytebot/bytebot \
  --namespace bytebot-production \
  --values values-production.yaml \
  --set global.imageTag=1.1.0 \
  --wait --timeout=15m

# Check rollout status
kubectl rollout status deployment/bytebot-api -n bytebot-production
kubectl rollout status deployment/bytebot-worker -n bytebot-production

# Rollback if needed
helm rollback bytebot -n bytebot-production
```

### Scaling Operations

```bash
# Manual scaling
kubectl scale deployment bytebot-worker --replicas=10 -n bytebot-production

# Update HPA limits
kubectl patch hpa bytebot-worker-hpa -n bytebot-production \
  --patch '{"spec":{"maxReplicas":25}}'

# Check HPA status
kubectl get hpa -n bytebot-production
```

## Security Configuration

### RBAC Setup

```yaml
# rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: bytebot-service-account
  namespace: bytebot-production

---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: bytebot-production
  name: bytebot-role
rules:
- apiGroups: [""]
  resources: ["pods", "pods/log"]
  verbs: ["get", "list", "watch"]
- apiGroups: [""]
  resources: ["configmaps", "secrets"]
  verbs: ["get", "list", "watch"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: bytebot-role-binding
  namespace: bytebot-production
subjects:
- kind: ServiceAccount
  name: bytebot-service-account
  namespace: bytebot-production
roleRef:
  kind: Role
  name: bytebot-role
  apiGroup: rbac.authorization.k8s.io
```

### Network Policies

```yaml
# network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: bytebot-network-policy
  namespace: bytebot-production
spec:
  podSelector:
    matchLabels:
      app: bytebot
  policyTypes:
  - Ingress
  - Egress
  
  ingress:
  # Allow ingress controller
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 3000
  
  # Allow monitoring
  - from:
    - namespaceSelector:
        matchLabels:
          name: monitoring
    ports:
    - protocol: TCP
      port: 9090
  
  egress:
  # Allow database access
  - to:
    - namespaceSelector:
        matchLabels:
          name: database
    ports:
    - protocol: TCP
      port: 5432
  
  # Allow Redis access
  - to:
    - namespaceSelector:
        matchLabels:
          name: cache
    ports:
    - protocol: TCP
      port: 6379
  
  # Allow DNS
  - to: []
    ports:
    - protocol: UDP
      port: 53
  
  # Allow HTTPS outbound
  - to: []
    ports:
    - protocol: TCP
      port: 443
```

### Pod Security Standards

```yaml
# pod-security-policy.yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: bytebot-psp
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
    - ALL
  volumes:
    - 'configMap'
    - 'emptyDir'
    - 'projected'
    - 'secret'
    - 'downwardAPI'
    - 'persistentVolumeClaim'
  runAsUser:
    rule: 'MustRunAsNonRoot'
  seLinux:
    rule: 'RunAsAny'
  fsGroup:
    rule: 'RunAsAny'
```

## Monitoring Setup

### Prometheus Configuration

```yaml
# prometheus-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: bytebot-prometheus-config
  namespace: bytebot-production
data:
  prometheus.yml: |
    global:
      scrape_interval: 30s
      evaluation_interval: 30s
    
    rule_files:
      - "/etc/prometheus/rules/*.yml"
    
    scrape_configs:
    - job_name: 'bytebot-api'
      kubernetes_sd_configs:
      - role: endpoints
        namespaces:
          names: [bytebot-production]
      relabel_configs:
      - source_labels: [__meta_kubernetes_service_name]
        action: keep
        regex: bytebot-api
      - source_labels: [__meta_kubernetes_endpoint_port_name]
        action: keep
        regex: metrics
    
    - job_name: 'bytebot-worker'
      kubernetes_sd_configs:
      - role: endpoints
        namespaces:
          names: [bytebot-production]
      relabel_configs:
      - source_labels: [__meta_kubernetes_service_name]
        action: keep
        regex: bytebot-worker
      - source_labels: [__meta_kubernetes_endpoint_port_name]
        action: keep
        regex: metrics
```

### Alert Rules

```yaml
# alert-rules.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: bytebot-alert-rules
  namespace: bytebot-production
data:
  bytebot.yml: |
    groups:
    - name: bytebot.rules
      rules:
      
      # API Health
      - alert: BytebotAPIDown
        expr: up{job="bytebot-api"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Bytebot API is down"
          description: "Bytebot API has been down for more than 2 minutes."
      
      # High Error Rate
      - alert: BytebotHighErrorRate
        expr: |
          (
            rate(http_requests_total{job="bytebot-api",code=~"5.."}[5m]) /
            rate(http_requests_total{job="bytebot-api"}[5m])
          ) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate in Bytebot API"
          description: "Error rate is {{ $value | humanizePercentage }}"
      
      # High Response Time
      - alert: BytebotHighResponseTime
        expr: |
          histogram_quantile(0.95,
            rate(http_request_duration_seconds_bucket{job="bytebot-api"}[5m])
          ) > 2
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High response time in Bytebot API"
          description: "95th percentile response time is {{ $value }}s"
      
      # Database Connection Issues
      - alert: BytebotDatabaseConnectionHigh
        expr: |
          bytebot_database_connections_active /
          bytebot_database_connections_max > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High database connection usage"
          description: "Database connection usage is {{ $value | humanizePercentage }}"
      
      # Memory Usage
      - alert: BytebotHighMemoryUsage
        expr: |
          container_memory_usage_bytes{container="bytebot"} /
          container_spec_memory_limit_bytes{container="bytebot"} > 0.9
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage in Bytebot pods"
          description: "Memory usage is {{ $value | humanizePercentage }}"
      
      # Task Processing Issues
      - alert: BytebotTaskProcessingFailed
        expr: |
          rate(bytebot_tasks_total{status="failed"}[5m]) /
          rate(bytebot_tasks_total[5m]) > 0.02
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High task failure rate"
          description: "Task failure rate is {{ $value | humanizePercentage }}"
```

## Backup and Recovery

### Database Backup

```yaml
# db-backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: bytebot-db-backup
  namespace: bytebot-production
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: postgres-backup
            image: postgres:15
            env:
            - name: PGPASSWORD
              valueFrom:
                secretKeyRef:
                  name: bytebot-db-secret
                  key: password
            - name: PGHOST
              valueFrom:
                secretKeyRef:
                  name: bytebot-db-secret
                  key: host
            - name: PGUSER
              valueFrom:
                secretKeyRef:
                  name: bytebot-db-secret
                  key: username
            - name: PGDATABASE
              valueFrom:
                secretKeyRef:
                  name: bytebot-db-secret
                  key: database
            command:
            - /bin/bash
            - -c
            - |
              DATE=$(date +%Y%m%d_%H%M%S)
              pg_dump -h $PGHOST -U $PGUSER -d $PGDATABASE \
                --no-password --clean --if-exists \
                > /backup/bytebot_backup_$DATE.sql
              
              # Upload to S3 (optional)
              # aws s3 cp /backup/bytebot_backup_$DATE.sql \
              #   s3://your-backup-bucket/db-backups/
              
              # Keep only last 7 days
              find /backup -name "bytebot_backup_*.sql" -mtime +7 -delete
            volumeMounts:
            - name: backup-storage
              mountPath: /backup
          volumes:
          - name: backup-storage
            persistentVolumeClaim:
              claimName: backup-pvc
```

### Application State Backup

```bash
# backup-script.sh
#!/bin/bash

NAMESPACE="bytebot-production"
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/k8s-backup-$BACKUP_DATE"

mkdir -p $BACKUP_DIR

# Backup ConfigMaps
kubectl get configmap -n $NAMESPACE -o yaml > $BACKUP_DIR/configmaps.yaml

# Backup Secrets (base64 encoded)
kubectl get secret -n $NAMESPACE -o yaml > $BACKUP_DIR/secrets.yaml

# Backup PVCs
kubectl get pvc -n $NAMESPACE -o yaml > $BACKUP_DIR/pvcs.yaml

# Backup Helm release
helm get values bytebot -n $NAMESPACE > $BACKUP_DIR/helm-values.yaml
helm get manifest bytebot -n $NAMESPACE > $BACKUP_DIR/helm-manifest.yaml

# Create archive
tar -czf /backups/bytebot-backup-$BACKUP_DATE.tar.gz -C /backups k8s-backup-$BACKUP_DATE

# Upload to storage (customize as needed)
# aws s3 cp /backups/bytebot-backup-$BACKUP_DATE.tar.gz s3://your-backup-bucket/
```

## Troubleshooting

### Common Issues

#### Pod Startup Failures

```bash
# Check pod status
kubectl get pods -n bytebot-production

# Get pod details
kubectl describe pod <pod-name> -n bytebot-production

# Check logs
kubectl logs <pod-name> -n bytebot-production --previous

# Check events
kubectl get events -n bytebot-production --sort-by='.lastTimestamp'
```

#### Database Connection Issues

```bash
# Test database connectivity
kubectl run -it --rm debug --image=postgres:15 --restart=Never \
  -- psql -h postgres.database.svc.cluster.local -U bytebot_user bytebot_production

# Check database secret
kubectl get secret bytebot-db-secret -n bytebot-production -o yaml

# Verify service discovery
kubectl get svc -n database
kubectl describe svc postgres -n database
```

#### Performance Issues

```bash
# Check resource usage
kubectl top pods -n bytebot-production
kubectl top nodes

# Check HPA status
kubectl get hpa -n bytebot-production
kubectl describe hpa bytebot-api-hpa -n bytebot-production

# Check metrics
curl -s http://localhost:9090/metrics | grep bytebot_
```

### Emergency Procedures

#### Rolling Back Deployment

```bash
# View rollout history
helm history bytebot -n bytebot-production

# Rollback to previous version
helm rollback bytebot -n bytebot-production

# Check rollback status
kubectl rollout status deployment/bytebot-api -n bytebot-production
```

#### Scale Down for Maintenance

```bash
# Scale all deployments to 0
kubectl scale deployment --all --replicas=0 -n bytebot-production

# Verify all pods are terminated
kubectl get pods -n bytebot-production

# Scale back up
kubectl scale deployment bytebot-api --replicas=3 -n bytebot-production
kubectl scale deployment bytebot-worker --replicas=5 -n bytebot-production
```

#### Emergency Database Maintenance

```bash
# Create maintenance mode ConfigMap
kubectl create configmap maintenance-mode \
  --from-literal=enabled=true \
  --namespace=bytebot-production

# Restart API pods to pick up maintenance mode
kubectl rollout restart deployment/bytebot-api -n bytebot-production

# Remove maintenance mode
kubectl delete configmap maintenance-mode -n bytebot-production
kubectl rollout restart deployment/bytebot-api -n bytebot-production
```

## Performance Optimization

### Resource Tuning

```yaml
# Optimized resource configuration
resources:
  api:
    requests:
      cpu: 500m
      memory: 1Gi
    limits:
      cpu: 2000m
      memory: 4Gi
  
  worker:
    requests:
      cpu: 1000m
      memory: 2Gi
    limits:
      cpu: 4000m
      memory: 8Gi

# JVM tuning for better performance
env:
- name: NODE_OPTIONS
  value: "--max-old-space-size=3072 --max-semi-space-size=128"
```

### Database Optimization

```yaml
database:
  poolSize: 20
  connectionTimeout: 30s
  idleTimeout: 10m
  maxLifetime: 30m
  ssl: true
  sslMode: require
  
  # Connection pool configuration
  acquireTimeoutMillis: 60000
  createTimeoutMillis: 30000
  destroyTimeoutMillis: 5000
  idleTimeoutMillis: 600000
  maxUses: 7500
  testQuery: "SELECT 1"
```

### Redis Optimization

```yaml
redis:
  # Connection pool settings
  maxTotal: 50
  maxIdle: 20
  minIdle: 5
  
  # Timeout settings
  connectionTimeout: 2000
  socketTimeout: 2000
  
  # Retry settings
  maxRetries: 3
  retryDelayMillis: 100
```

## Security Hardening

### Pod Security Context

```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  runAsGroup: 3000
  fsGroup: 2000
  seccompProfile:
    type: RuntimeDefault
  
containerSecurityContext:
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true
  runAsNonRoot: true
  runAsUser: 1000
  capabilities:
    drop:
    - ALL
```

### Image Security

```yaml
image:
  repository: your-registry.com/bytebot/api
  tag: "1.0.0"
  pullPolicy: IfNotPresent
  
  # Image scanning
  securityContext:
    runAsNonRoot: true
    readOnlyRootFilesystem: true
    allowPrivilegeEscalation: false
    
imagePullSecrets:
  - name: registry-secret
```

---

**Last Updated**: September 6, 2025  
**Version**: 1.0.0  
**Next Review**: December 6, 2025