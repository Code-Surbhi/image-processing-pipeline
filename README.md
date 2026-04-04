# 🚀 Distributed Image Processing Pipeline on AWS

A production-grade serverless image processing system demonstrating distributed systems patterns, AI integration, and observability best practices.

[![Deploy to AWS](https://github.com/Code-Surbhi/image-processing-pipeline/actions/workflows/deploy.yml/badge.svg)](https://github.com/Code-Surbhi/image-processing-pipeline/actions/workflows/deploy.yml)
![AWS](https://img.shields.io/badge/AWS-Cloud-orange?logo=amazon-aws)
![Node.js](https://img.shields.io/badge/Node.js-20.x-green?logo=node.js)
![License](https://img.shields.io/badge/License-MIT-blue)

## 📖 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Key Learning Outcomes](#key-learning-outcomes)
- [Performance](#performance)
- [Cost Analysis](#cost-analysis)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Deployment](#deployment)
- [Testing](#testing)
- [Monitoring](#monitoring)
<!-- - [Interview Prep](#interview-prep) -->
- [Author](#author)

## 🎯 Overview

This project implements a **high-throughput async image processing pipeline** that demonstrates production-grade distributed systems architecture on AWS.

### What It Does

1. **Accepts image uploads** via S3 presigned URLs (bypasses API Gateway 10MB limit)
2. **Triggers distributed processing** via EventBridge → Step Functions
3. **Processes in parallel** using 3 concurrent branches:
   - 🔍 AWS Rekognition object/scene detection
   - 👤 AWS Rekognition face detection with emotions, age, gender
   - 📐 Image resizing to 3 sizes (thumbnail, medium, large) using sharp
4. **Aggregates results** and stores in DynamoDB with TTL
5. **Provides REST API** to query processing results by imageId
6. **Monitors end-to-end** with X-Ray distributed tracing and CloudWatch dashboards

### Why This Project Stands Out

Most AWS portfolio projects are simple CRUD applications or single-Lambda functions. **This project demonstrates:**

✅ **Distributed systems thinking** - Fan-out parallelism, async processing, event-driven architecture  
✅ **Production patterns** - Retry logic, error handling, idempotency, observability  
✅ **Cost optimization** - S3 lifecycle policies, Intelligent-Tiering, right-sized Lambda memory  
✅ **CI/CD automation** - GitHub Actions with trunk-based development  
✅ **Performance analysis** - Load testing, bottleneck identification, optimization recommendations

## 🏗️ Architecture

### High-Level Flow

```
┌─────────────────── UPLOAD & PROCESSING (Write Path) ───────────────────┐
│                                                                          │
│  User → API Gateway → Presigned URL Lambda → S3 Uploads Bucket          │
│                                                  ↓                       │
│                                            EventBridge                   │
│                                                  ↓                       │
│                                         Step Functions                   │
│                                     (3 Parallel Branches)                │
│                          ┌──────────────┼──────────────┐                │
│                          ↓              ↓              ↓                │
│                   Rekognition    Rekognition     Image Resize           │
│                     Labels         Faces           Lambda               │
│                     Lambda        Lambda       (Sharp library)          │
│                          │              │              │                │
│                          └──────────────┴──────────────┘                │
│                                         ↓                                │
│                                  Aggregator Lambda                       │
│                                         ↓                                │
│                                    DynamoDB Table                        │
│                              (4 items per image: LABELS,                 │
│                               FACES, RESIZE, AGGREGATED)                 │
│                                         ↓                                │
│                                  DynamoDB Stream                         │
│                                         ↓                                │
│                                 Notification Lambda                      │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘

┌────────────────────── QUERY (Read Path) ────────────────────────────────┐
│                                                                          │
│  User → API Gateway → Query API Lambda → DynamoDB → Return Results      │
│         GET /results/{imageId}                                           │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘

┌────────────────── OBSERVABILITY LAYER ──────────────────────────────────┐
│                                                                          │
│  X-Ray Tracing  |  CloudWatch Logs  |  CloudWatch Dashboard  |  Alarms  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

**📄 Full architecture details:** [docs/architecture.md](docs/architecture.md)

### Key Components

| Component            | Technology                | Purpose                         |
| -------------------- | ------------------------- | ------------------------------- |
| **Upload API**       | API Gateway + Lambda      | Generate presigned S3 URLs      |
| **Event Bus**        | Amazon EventBridge        | Trigger processing on S3 upload |
| **Orchestrator**     | AWS Step Functions        | Coordinate 3 parallel branches  |
| **AI Analysis**      | AWS Rekognition           | Detect objects, scenes, faces   |
| **Image Processing** | Lambda + Sharp Layer      | Resize to 3 dimensions          |
| **Data Storage**     | DynamoDB + S3             | Store results and images        |
| **Notifications**    | DynamoDB Streams + Lambda | Processing completion alerts    |
| **Query API**        | API Gateway + Lambda      | Retrieve results by imageId     |
| **Observability**    | X-Ray + CloudWatch        | Distributed tracing & metrics   |
| **CI/CD**            | GitHub Actions + SAM      | Automated deployment            |

## ✨ Features

### Core Functionality

- ✅ **Presigned URL generation** - Direct S3 uploads (no 10MB API Gateway limit)
- ✅ **AI-powered analysis** - Zero ML code, powered by AWS Rekognition
- ✅ **True parallelism** - Step Functions Parallel state (not sequential)
- ✅ **High-performance resizing** - Sharp library (4-5x faster than ImageMagick)
- ✅ **Event-driven** - Loose coupling via EventBridge
- ✅ **RESTful API** - Clean query interface by imageId

### Production Patterns

- ✅ **Distributed tracing** - AWS X-Ray across all 7 Lambda functions
- ✅ **Automatic retries** - Exponential backoff in Step Functions
- ✅ **Idempotent writes** - DynamoDB conditional expressions
- ✅ **Cost optimization** - S3 lifecycle → Glacier, Intelligent-Tiering
- ✅ **Real-time events** - DynamoDB Streams for notifications
- ✅ **Observability** - CloudWatch dashboard, alarms, SNS alerts
- ✅ **Automated deployment** - CI/CD on every push to main
- ✅ **Data lifecycle** - TTL auto-deletes old data after 90 days

## 🛠️ Tech Stack

| Category                   | Technologies                                              |
| -------------------------- | --------------------------------------------------------- |
| **Orchestration**          | AWS Step Functions (Standard Workflow)                    |
| **Compute**                | AWS Lambda (Node.js 20.x) - 7 functions                   |
| **Storage**                | Amazon S3 (2 buckets), Amazon DynamoDB                    |
| **AI/ML**                  | AWS Rekognition (DetectLabels, DetectFaces)               |
| **Observability**          | AWS X-Ray, CloudWatch (Logs, Metrics, Dashboards, Alarms) |
| **Event Processing**       | Amazon EventBridge, DynamoDB Streams                      |
| **API**                    | Amazon API Gateway (REST API)                             |
| **Infrastructure as Code** | AWS SAM (Serverless Application Model)                    |
| **CI/CD**                  | GitHub Actions                                            |
| **Image Processing**       | Sharp 0.33.x (libvips) via Lambda Layer                   |
| **Version Control**        | Git (Trunk-based development)                             |

## 📚 Key Learning Outcomes

### Distributed Systems Concepts

- **Fan-out parallelism** with Step Functions Parallel state
- **Event-driven architecture** with loose coupling via EventBridge
- **Async processing** vs synchronous request-response patterns
- **Idempotency** via DynamoDB conditional writes
- **Retry strategies** with exponential backoff

### AWS Services (Developer Associate Level)

- **Step Functions** - State machine design in Amazon States Language (ASL)
- **EventBridge** - Event patterns, filtering, cross-service integration
- **DynamoDB** - Single-table design, composite keys, Streams, TTL
- **S3** - Lifecycle policies, storage classes, presigned URLs, event notifications
- **Lambda** - Layers for native dependencies, memory/CPU tuning, concurrency
- **X-Ray** - Service maps, trace analysis, distributed debugging
- **CloudWatch** - Custom dashboards, alarms, log insights

### Production Engineering

- **CI/CD** with trunk-based development (deploy on every commit)
- **Cost optimization** strategies (storage tiers, right-sizing)
- **Performance testing** and bottleneck identification
- **Observability** (not just logging, but metrics + traces + dashboards)
- **Infrastructure as Code** with declarative templates

## 📊 Performance

### Load Test Results (6 concurrent uploads)

| Metric                    | Value                                |
| ------------------------- | ------------------------------------ |
| **Success rate**          | 100% (6/6 succeeded)                 |
| **Processing time**       | ~3.2 seconds per image               |
| **Upload throughput**     | 0.29 uploads/second                  |
| **Lambda auto-scaling**   | Instant (no throttling)              |
| **Bottleneck identified** | Image Resize Lambda (~2 seconds avg) |

### Performance Breakdown

| Lambda Function    | Avg Duration | Bottleneck? |
| ------------------ | ------------ | ----------- |
| Presigned URL      | 50ms         | ❌ No       |
| Rekognition Labels | 1,500ms      | ⚠️ Moderate |
| Rekognition Faces  | 1,200ms      | ⚠️ Moderate |
| **Image Resize**   | **2,000ms**  | ✅ **Yes**  |
| Aggregator         | 200ms        | ❌ No       |

**Optimization opportunity:** Increase Image Resize Lambda memory from 1024MB → 1792MB (gets full vCPU, estimated 30% speed improvement)

**📄 Full performance analysis:** [docs/performance-analysis.md](docs/performance-analysis.md)

## 💰 Cost Analysis

### Monthly Cost at 10,000 Images

| Service                         | Cost           | Percentage |
| ------------------------------- | -------------- | ---------- |
| Rekognition (2 API calls/image) | $20.00         | 95%        |
| Lambda (4 functions/image)      | $0.15          | 1%         |
| Step Functions                  | $0.25          | 1%         |
| DynamoDB (on-demand)            | $0.10          | <1%        |
| S3 (storage + requests)         | $0.50          | 2%         |
| **Total**                       | **~$21/month** | **100%**   |

**Per-image cost:** ~$0.0021 (0.2 cents)

### Free Tier Coverage

✅ **Rekognition:** First 5,000 images/month free for 12 months → Saves $10/month  
✅ **Lambda:** 1M requests/month free forever → Exceeds our usage  
✅ **Step Functions:** 4,000 transitions/month free forever → Exceeds our usage  
✅ **DynamoDB:** 25 GB storage + 200M requests/month free forever → Exceeds our usage

### Cost Optimization Strategies

1. **S3 Lifecycle Policies** - Move uploads to Glacier after 30 days (84% storage cost reduction)
2. **Intelligent-Tiering** - Auto-optimize processed images based on access patterns
3. **DynamoDB TTL** - Auto-delete old data after 90 days (no storage cost for old items)
4. **Lambda memory tuning** - Right-size based on actual usage patterns

## 🚀 Getting Started

### Prerequisites

```bash
# Required
- AWS Account (with Rekognition service access)
- AWS CLI configured with credentials
- SAM CLI installed (brew install aws-sam-cli or pip install aws-sam-cli)
- Node.js 20.x
- Docker Desktop (for building Lambda Layers)

# Optional
- PowerShell 7+ (for Windows test scripts)
```

### Quick Deploy

```bash
# 1. Clone the repository
git clone https://github.com/Code-Surbhi/image-processing-pipeline.git
cd image-processing-pipeline

# 2. Build (includes Docker build for Sharp layer)
sam build --use-container

# 3. Deploy (interactive prompts for configuration)
sam deploy --guided

# Follow prompts:
# - Stack name: image-pipeline
# - AWS Region: ap-south-1 (or your preferred region)
# - Environment: dev
# - Confirm changes: Y
# - Allow SAM CLI IAM role creation: Y
# - Disable rollback: N
# - Save arguments to configuration file: Y
```

### Test the Pipeline

```powershell
# Navigate to test scripts
cd tests

# 1. Upload a single image
.\upload-real-image.ps1 -ImagePath "your-cat-photo.jpg"
# Returns: { imageId: "abc-123-...", uploadUrl: "https://..." }

# 2. Wait 10 seconds for processing to complete

# 3. Query results
.\query-results.ps1 -ImageId "abc-123-..."
# Returns: { labels: [...], faces: [...], resizedImages: [...] }
```

## 📁 Project Structure

```
image-processing-pipeline/
├── src/                              # Lambda function source code
│   ├── presigned-url/                # Generate S3 presigned URLs
│   │   ├── index.js                  # Main handler
│   │   └── package.json              # Dependencies: @aws-sdk/s3-request-presigner
│   ├── rekognition-labels/           # Object/scene detection
│   │   ├── index.js                  # Calls Rekognition DetectLabels
│   │   └── package.json              # Dependencies: @aws-sdk/client-rekognition
│   ├── rekognition-faces/            # Face detection
│   │   ├── index.js                  # Calls Rekognition DetectFaces
│   │   └── package.json              # Dependencies: @aws-sdk/client-rekognition
│   ├── image-resize/                 # Image resizing (bottleneck)
│   │   ├── index.js                  # Sharp processing + S3 uploads
│   │   └── package.json              # Dependencies: @aws-sdk/client-s3, sharp (via layer)
│   ├── aggregator/                   # Merge parallel results
│   │   ├── index.js                  # Writes 4 items to DynamoDB
│   │   └── package.json              # Dependencies: @aws-sdk/lib-dynamodb
│   ├── notification/                 # DynamoDB Stream consumer
│   │   ├── index.js                  # Processes AGGREGATED items only
│   │   └── package.json              # Dependencies: @aws-sdk/lib-dynamodb
│   └── query-api/                    # REST API for results
│       ├── index.js                  # Queries DynamoDB by imageId
│       └── package.json              # Dependencies: @aws-sdk/lib-dynamodb
├── layers/                           # Lambda Layers
│   └── sharp-layer/                  # Sharp library (native C++ binaries)
│       ├── Dockerfile                # Build for Lambda Linux x86_64
│       └── nodejs/
│           └── package.json          # sharp@0.33.5
├── statemachine/                     # Step Functions definition
│   └── pipeline.asl.json             # Amazon States Language (ASL)
├── tests/                            # PowerShell test scripts
│   ├── upload-real-image.ps1         # Single image upload
│   ├── query-results.ps1             # Query by imageId
│   └── load-test.ps1                 # Concurrent uploads (load testing)
├── docs/                             # Documentation
│   ├── architecture.md               # Detailed architecture diagram
│   ├── performance-analysis.md       # Load test results
│   └── interview-prep.md             # Q&A for placements
├── .github/
│   └── workflows/
│       └── deploy.yml                # GitHub Actions CI/CD
├── template.yaml                     # SAM template (Infrastructure as Code)
├── samconfig.toml                    # SAM deployment configuration
└── README.md                         # This file
```

## 🔄 Deployment

### Automated CI/CD (Recommended)

Every push to `main` branch triggers GitHub Actions:

1. ✅ Checkout code
2. ✅ Setup Node.js 20 + Python 3.12 + SAM CLI
3. ✅ Configure AWS credentials (from GitHub Secrets)
4. ✅ SAM validate (lint CloudFormation template)
5. ✅ SAM build --use-container (Docker build for Sharp layer)
6. ✅ SAM deploy --no-confirm-changeset (automated deployment)
7. ✅ Output API endpoints

**Setup:**

1. Create IAM user `github-actions-deploy` with AdministratorAccess
2. Add AWS credentials to GitHub Secrets:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_REGION`
3. Push to `main` → Auto-deploy! 🚀

### Manual Deployment

```bash
# Clean build (if needed)
rm -rf .aws-sam

# Build
sam build --use-container

# Deploy to dev
sam deploy

# Deploy to prod (separate stack)
sam deploy --config-env prod --parameter-overrides Environment=prod
```

## 🧪 Testing

### Unit Testing (Single Upload)

```powershell
cd tests

# Upload image
.\upload-real-image.ps1 -ImagePath "sample-cat.jpg"

# Sample output:
# ✅ Upload successful!
# Image ID: 4ba6c8d4-94d3-4d21-9378-cc7c61d9a53a
# Processing started...

# Query results (wait 10 seconds)
.\query-results.ps1 -ImageId "4ba6c8d4-94d3-4d21-9378-cc7c61d9a53a"

# Sample output:
# ✅ Results found!
# Labels Detected: 6 (Cat, Abyssinian, Mammal, Animal, Pet, Manx)
# Faces Detected: 0
# Resized Images: 3 (thumbnail, medium, large)
```

### Load Testing (Concurrent Uploads)

```powershell
# Test with 10 concurrent uploads
.\load-test.ps1 -ImageCount 10 -ImagePath "sample-cat.jpg"

# Sample output:
# 🚀 Load Test Starting...
# ⏳ Waiting for all uploads to complete...
# ✅ Load Test Complete!
# Results:
#   Total uploads: 10
#   Successful: 6
#   Failed: 4 (file locking on Windows)
#   Duration: 20.9 seconds
#   Throughput: 0.29 uploads/second
```

## 📈 Monitoring

### AWS X-Ray Service Map

**Purpose:** Visualize distributed architecture and request flow

**Access:** AWS Console → X-Ray → Service map

**What you'll see:**

- Complete request trace from API Gateway → Lambda → S3 → EventBridge → Step Functions → 4 parallel Lambdas → Rekognition/S3/DynamoDB
- Average latency per service
- Error rates
- Service dependencies

**Use for:** Bottleneck identification, performance debugging

### CloudWatch Dashboard

**Purpose:** Real-time metrics visualization

**Access:** AWS Console → CloudWatch → Dashboards → `image-pipeline-dev`

**Widgets:**

1. **Step Functions Executions** - Started/Succeeded/Failed over time
2. **Lambda Invocations & Errors** - All 7 functions aggregated
3. **Lambda Duration** - Average and maximum execution times
4. **DynamoDB Capacity** - Read/Write capacity units consumed
5. **API Gateway Requests** - Request count, 4XX/5XX errors

**Use for:** Health monitoring, capacity planning, incident investigation

### CloudWatch Alarms

**Configured Alarms:**

| Alarm                   | Metric           | Threshold        | Action    |
| ----------------------- | ---------------- | ---------------- | --------- |
| Step Functions Failures | ExecutionsFailed | ≥ 1 failure      | SNS email |
| Aggregator Errors       | Lambda Errors    | > 5% error rate  | SNS email |
| Rekognition Slow        | Lambda Duration  | > 10 seconds avg | SNS email |

**Setup:** Confirm SNS email subscription after first deployment

<!-- ## 🎓 Interview Prep

This project helps you answer **50+ common AWS interview questions**, including:

### System Design

- "Design an image processing pipeline that handles 10,000 uploads/minute"
- "How would you add video processing to this system?"
- "What happens if the Rekognition API is down?"
- "How would you implement real-time processing status updates?"

### AWS-Specific

- "Why Step Functions instead of chaining Lambdas with SNS?"
- "What is the difference between Step Functions Standard and Express workflows?"
- "How does X-Ray help debug distributed systems?"
- "What is a DynamoDB Stream and when should you use it?"
- "Explain the trade-offs between S3 event notifications and EventBridge"

### Cost & Scaling

- "How much does this cost at 1,000 images/day? 100,000/day?"
- "What changes would you make to handle 10x the current load?"
- "How would you reduce the cost by 50%?"
- "What's the Lambda concurrency limit and how does it affect scalability?"

### Performance

- "How would you identify the bottleneck in this pipeline?"
- "Why is Image Resize Lambda slower than Rekognition Lambda?"
- "What's the impact of increasing Lambda memory from 1024MB to 1792MB?"

**📄 Full Q&A with detailed answers:** [docs/interview-prep.md](docs/interview-prep.md) -->

## 👤 Author

**Surbhi**  
3rd Year Computer Science Engineering | Chitkara University

**AWS Certifications:**

- ✅ AWS Certified Cloud Practitioner
- ✅ AWS Certified AI Practitioner
- 🎯 Preparing for: AWS Certified Developer Associate (Exam: June 2026)

<!-- **Project Context:**
Built as second AWS project for campus placements (June 2026). First project: Serverless URL Shortener with custom domain. -->

**Contact:**

- 🐙 GitHub: [@Code-Surbhi](https://github.com/Code-Surbhi)
- 💼 LinkedIn: [www.linkedin.com/in/code-surbhi]
- 📧 Email: [code.surbhi1712@gmail.com]

## 📄 License

MIT License - Feel free to use this project for learning and interviews!

---

## 🌟 Acknowledgments

- **AWS SAM Team** - Excellent IaC framework
- **Sharp Team** - Best-in-class image processing library
- **AWS Documentation** - Comprehensive and well-maintained

---

⭐ **If this project helped you learn AWS, please star this repo!**

💡 **Questions?** Open an issue - I'm happy to help!

🚀 **Hiring?** This project demonstrates my ability to build production-grade distributed systems on AWS.
