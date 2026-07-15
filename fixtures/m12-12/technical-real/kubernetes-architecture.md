# Kubernetes Cluster Architecture: Production Deployment Guide

## Overview

This document describes the production Kubernetes cluster architecture for our microservices platform. The cluster runs on a hybrid cloud infrastructure spanning AWS and GCP, providing high availability, disaster recovery, and elastic scaling capabilities.

## Architecture Principles

### Design Goals
- **High Availability**: 99.99% uptime SLA across all services
- **Security**: Zero-trust networking, encrypted communications, RBAC enforcement
- **Observability**: Comprehensive logging, metrics, and tracing
- **Scalability**: Horizontal pod autoscaling based on real-time demand
- **Cost Efficiency**: Spot instance utilization for non-critical workloads

### Cluster Topology
- **Control Plane**: 3 master nodes across 3 availability zones (HA etcd cluster)
- **Worker Nodes**: 24 nodes across 6 AZs (mix of on-demand and spot instances)
- **Network**: Calico CNI with network policies, Cilium for eBPF-based observability
- **Storage**: EBS gp3 for stateful, EFS for shared volumes, S3 for backups

## Service Mesh

### Istio Configuration
- **mTLS**: Strict mode for all service-to-service communication
- **Traffic Management**: Canary deployments, A/B testing, traffic splitting
- **Rate Limiting**: Per-service quotas to prevent overload
- **Fault Injection**: Circuit breaking with configurable timeouts and retries

### Gateway Setup
- External traffic routed through Envoy gateways
- TLS termination at the ingress layer
- JWT authentication for API endpoints
- Request/response header manipulation for routing

## Monitoring Stack

### Metrics Collection
```
Prometheus (3 replicas) → Thanos (query + store) → Grafana
```

**Key metrics tracked:**
- Pod CPU/memory utilization
- Network throughput and latency
- Application-level request rates and error rates
- Database connection pool utilization
- Queue depth and processing times

### Logging
```
Fluent Bit (sidecar) → Kafka → Elasticsearch → Kibana
```

**Log categories:**
- Application logs (structured JSON)
- Audit logs (RBAC events)
- Security logs (firewall, intrusion detection)
- Compliance logs (data access, configuration changes)

### Distributed Tracing
```
OpenTelemetry → Jaeger → Grafana Tempo
```

- Trace sampling at 10% for production (adjustable)
- Span context propagation across all services
- Custom business metrics embedded in traces

## CI/CD Pipeline

### GitOps Workflow
```
GitHub → ArgoCD → Kubernetes
```

**Pipeline stages:**
1. **Build**: Docker images built in GitHub Actions with SBOM generation
2. **Scan**: Trivy vulnerability scanning + Snyk license compliance
3. **Push**: Images pushed to ECR with tag signing
4. **Deploy**: ArgoCD syncs manifests from Git repository
5. **Verify**: Automated health checks and smoke tests

### Deployment Strategies
- **Blue-Green**: For zero-downtime major version upgrades
- **Canary**: Gradual rollout with automated rollback on error rate spike
- **Rolling**: Default strategy for minor updates

## Security Architecture

### Identity and Access Management
- IAM roles bound to Kubernetes service accounts (IRSA)
- OIDC federation for cross-cloud authentication
- Secret management via HashiCorp Vault with dynamic secrets
- Pod security admission: restricted policy enforced

### Network Security
- Default deny network policies
- Namespace isolation for multi-tenant workloads
- WAF (Web Application Firewall) at the edge
- DDoS protection via CloudFront + Shield Advanced

### Data Protection
- Encryption at rest: AES-256 for all volumes and snapshots
- Encryption in transit: TLS 1.3 everywhere, mTLS within cluster
- Database encryption: AWS RDS encryption + application-level field encryption
- Backup encryption: Vault-managed keys for all backup data

## Disaster Recovery

### Backup Strategy
- Etcd snapshots: Every 6 hours to encrypted S3 bucket
- Persistent volume backups: Velero with S3 backend
- Cross-region replication: DR cluster in us-west-2 (primary is us-east-1)

### Recovery Objectives
- **RPO (Recovery Point Objective)**: 6 hours for stateful services
- **RTO (Recovery Time Objective)**: 4 hours for full cluster restoration
- **Failover testing**: Quarterly drill with full documentation

## Cost Management

### Optimization Levers
- **Right-sizing**: Vertical Pod Autoscaler recommendations reviewed weekly
- **Spot instances**: 60% of worker nodes use spot pricing (~60% savings)
- **Reserved instances**: 1-year committed for baseline on-demand capacity
- **Storage tiering**: Hot/WARM/COLD storage classes based on access patterns

### Cost Allocation
- Tag-based cost allocation by team/service/project
- Monthly cost reports with trend analysis
- Budget alerts at 50%, 75%, 90%, and 100% thresholds

## Operational Runbook

### Common Operations
1. **Scale deployment**: `kubectl scale deployment <name> --replicas=<n>`
2. **Rollback**: `kubectl rollout undo deployment/<name>`
3. **Debug pod**: `kubectl debug -it <pod-name> --image=busybox`
4. **View logs**: `kubectl logs -f deployment/<name> -c <container>`
5. **Port forward**: `kubectl port-forward svc/<service> 8080:80`

### Escalation Matrix
- **P1** (outage): On-call engineer → Platform team lead → VP Engineering
- **P2** (degraded): On-call engineer → Senior SRE
- **P3** (minor issue): Ticket in Jira, next sprint review

## Appendix

### Infrastructure as Code
- Terraform modules for cluster provisioning
- Helm charts for application deployments
- Crossplane for managed service orchestration

### Key References
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Istio Best Practices](https://istio.io/latest/docs/ops/best-practices/)
- [CNCF Security Whitepaper](https://www.cncf.io/whitepapers/)
