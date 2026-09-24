# Deployment Architecture & Infrastructure Topology: QPMS

## Purpose
This document specifies the target deployment topology, containerization models, cloud/on-premise infrastructure requirements, and network configurations for the **University Question Paper Management & Generation System**.

## Scope
Covers deployment environments (Development, Staging, Production), container specifications (Docker), orchestration (Kubernetes), load balancing, and secure network isolation.

---

## 1. Multi-Tier Production Topology

```mermaid
graph TD
    Internet((Public Internet)) --> Cloudflare[Cloudflare CDN & DDoS Protection]
    Cloudflare --> ALB[Application Load Balancer - TLS 1.3 Termination]
    
    subgraph PublicSubnet["Public Subnet / DMZ"]
        ALB
        NAT[NAT Gateway]
    end

    subgraph AppSubnet["Private Application Subnet (No Direct Internet Access)"]
        K8s_API[API Pods: Node.js / NestJS Auto-Scaled]
        K8s_Gen[Generator Engine Worker Pods]
        K8s_PDF[Chromium PDF Worker Pods]
    end

    subgraph DataSubnet["Isolated Data Subnet (Strict VPC Firewalls)"]
        PG_Primary[(PostgreSQL 16 Primary)]
        PG_Standby[(PostgreSQL 16 Read Replica)]
        Redis_Cluster[(Redis 7 Cluster)]
        MinIO[(Encrypted S3-Compatible Object Store)]
    end

    ALB --> K8s_API
    K8s_API --> K8s_Gen
    K8s_API --> K8s_PDF
    K8s_API --> PG_Primary
    K8s_API --> PG_Standby
    K8s_API --> Redis_Cluster
    K8s_PDF --> MinIO
    NAT -.->|Outbound Only| AppSubnet
```

---

## 2. Containerization Strategy (Docker)

The platform is decomposed into three standard Docker images:

### 2.1 Web & API Container (`qpms-api:latest`)
- **Base Image:** `node:20-alpine` (or `python:3.12-slim`).
- **Role:** Handles incoming REST API requests, authentication, authorization, and database transactions.
- **Resource Limits:** 1 vCPU, 1 GB RAM per replica.

### 2.2 Chromium PDF & Print Worker (`qpms-pdf-worker:latest`)
- **Base Image:** `node:20-bookworm-slim` (with bundled Google Noto fonts and Chromium dependencies).
- **Role:** Subscribes to Redis print queues, compiles KaTeX math, and generates watermarked PDFs.
- **Resource Limits:** 2 vCPU, 2 GB RAM per replica.

### 2.3 Frontend Static Container (`qpms-web:latest`)
- **Base Image:** `nginx:1.27-alpine`.
- **Role:** Serves compiled static assets (`dist/`) with gzip/brotli compression, HTTP/2, and security headers.

---

## 3. Environment Progression & Configuration Management

| Environment | Purpose | Hosting Topology | Database Configuration | Data Seeding |
| :--- | :--- | :--- | :--- | :--- |
| **Development (Local)** | Feature development and unit tests. | Docker Compose (`docker-compose.yml`) on developer workstation. | Single PostgreSQL container with RLS. | Realistic mock university data (Apex Institute, CSE Dept). |
| **Staging (QA)** | Integration testing, security scans, and UAT. | Kubernetes staging namespace / Cloud ECS. | Managed RDS PostgreSQL with automated migrations. | Sanitized, anonymized university curriculum data. |
| **Production** | Live university examinations. | Multi-AZ Kubernetes cluster with auto-scaling. | Multi-AZ PostgreSQL with automated failover and daily snapshots. | Production institutional records only. |

---

## 4. Environment Variables Specification

```env
# Application Core
NODE_ENV=production
PORT=4000
APP_SECRET=a_very_long_cryptographically_secure_random_string_256bit
API_BASE_URL=https://api.qpms.university.edu

# Database & Cache
DATABASE_URL=postgresql://qpms_user:SecretPassword@pg-primary.internal:5432/qpms_db?sslmode=verify-full
DATABASE_REPLICA_URL=postgresql://qpms_user:SecretPassword@pg-replica.internal:5432/qpms_db?sslmode=verify-full
REDIS_URL=redis://:RedisPassword@redis-cluster.internal:6379

# Object Storage & KMS
S3_ENDPOINT=https://s3.ap-south-1.amazonaws.com
S3_BUCKET_NAME=qpms-sealed-paper-vault
S3_ACCESS_KEY=AKIA...
S3_SECRET_KEY=wJalr...
MASTER_EXAM_KMS_KEY_ID=arn:aws:kms:ap-south-1:123456789012:key/...

# CORS & Security
CORS_ALLOWED_ORIGINS=https://qpms.university.edu
COOKIE_DOMAIN=.university.edu
```

---

## Current State vs. Proposed State

* **Current State:** No Dockerfiles, no `docker-compose.yml`, no environment files (`.env`), and no deployment configuration exist. The app runs only via `npm run dev` in Vite.
* **Proposed State:** A complete enterprise deployment architecture featuring multi-stage Dockerfiles, Docker Compose for local development, multi-AZ Kubernetes topology, and isolated network subnets.

## Decisions
1. Isolate the Chromium PDF rendering worker into its own container to prevent memory spikes from impacting core API responsiveness.
2. Place all database and cache nodes in a private data subnet with zero direct inbound internet access.

## Open Questions
- None.

## Related Documents
- [DEVOPS.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/DEVOPS.md)
- [PERFORMANCE.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/PERFORMANCE.md)
- [SECURITY.md](file:///home/mohammad-ali/Projects/mj_question_paper_genrator/docs/SECURITY.md)
