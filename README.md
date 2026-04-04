# 🚀 Distributed Image Processing Pipeline on AWS

A production-grade serverless image processing system demonstrating distributed systems patterns, AI integration, and observability best practices.

[![Deploy to AWS](https://github.com/Code-Surbhi/image-processing-pipeline/actions/workflows/deploy.yml/badge.svg)](https://github.com/Code-Surbhi/image-processing-pipeline/actions/workflows/deploy.yml)

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
- [Interview Prep](#interview-prep)
- [Author](#author)

## 🎯 Overview

This project implements a high-throughput async image processing pipeline that:

1. **Accepts image uploads** via S3 presigned URLs (no Lambda proxy bottleneck)
2. **Triggers distributed processing** via EventBridge → Step Functions
3. **Processes in parallel** using 3 concurrent branches:
   - AWS Rekognition object/scene detection
   - AWS Rekognition face detection with emotions
   - Image resizing to 3 sizes (thumbnail, medium, large)
4. **Aggregates results** and stores in DynamoDB
5. **Provides REST API** to query processing results
6. **Monitors end-to-end** with X-Ray tracing and CloudWatch dashboards

**Why this project stands out:** Most AWS projects are CRUD apps or simple Lambdas. This demonstrates distributed systems thinking — fan-out parallelism, async processing, event-driven architecture, and production observability.

## 🏗️ Architecture

```
User → Presigned URL → S3 → EventBridge → Step Functions (Parallel)
                                              ├─ Rekognition Labels
                                              ├─ Rekognition Faces
                                              └─ Image Resize (sharp)
                                                    ↓
                                              Aggregator → DynamoDB
                                                           ↓ Stream
                                                    Notification Lambda
Query API ← DynamoDB ← User
```

**Full architecture details:** [docs/architecture.md](docs/architecture.md)

## ✨ Features

### Core Functionality

- ✅ **Presigned URL generation** for direct S3 uploads (avoids API Gateway 10MB limit)
- ✅ **AI-powered image analysis** via AWS Rekognition (zero ML code)
- ✅ **Parallel processing** with Step Functions (3 branches run simultaneously)
- ✅ **High-performance image resizing** using sharp library (4-5x faster than alternatives)
- ✅ **Event-driven architecture** with EventBridge (loose coupling)
- ✅ **REST API** for querying results by imageId

### Production Patterns

- ✅ **Distributed tracing** with AWS X-Ray across entire pipeline
- ✅ **Error handling** with automatic retries and exponential backoff
- ✅ **Idempotency** via DynamoDB conditional writes
- ✅ **Cost optimization** with S3 lifecycle policies and Intelligent-Tiering
- ✅ **Real-time notifications** via DynamoDB Streams
- ✅ **CloudWatch dashboard** with custom metrics and alarms
- ✅ **CI/CD pipeline** with GitHub Actions (auto-deploy on push to main)

## 🛠️ Tech Stack

| Category             | Technologies                                         |
| -------------------- | ---------------------------------------------------- |
| **Orchestration**    | AWS Step Functions (Standard Workflow)               |
| **Compute**          | AWS Lambda (Node.js 20.x, 7 functions)               |
| **Storage**          | Amazon S3 (uploads + processed buckets), DynamoDB    |
| **AI/ML**            | AWS Rekognition (DetectLabels, DetectFaces)          |
| **Observability**    | AWS X-Ray, CloudWatch Logs/Metrics/Dashboards/Alarms |
| **Event Bus**        | Amazon EventBridge                                   |
| **API**              | Amazon API Gateway (REST API)                        |
| **IaC**              | AWS SAM (CloudFormation)                             |
| **CI/CD**            | GitHub Actions                                       |
| **Image Processing** | sharp (libvips) via Lambda Layer                     |

## 📚 Key Learning Outcomes

### Distributed Systems

- Fan-out parallelism with Step Functions Parallel state
- Event-driven architecture with loose coupling
- Async processing vs synchronous request-response
- Idempotency and retry patterns

### AWS Services (Developer Associate Level)

- Step Functions state machine design (ASL)
- EventBridge event patterns and filtering
- DynamoDB single-table design with composite keys
- S3 lifecycle policies and storage classes
- Lambda Layers for native dependencies
- X-Ray service maps and trace analysis

### Production Engineering

- CI/CD with trunk-based development
- Cost optimization strategies
- CloudWatch observability (not just logging)
- Performance testing and bottleneck identification
- Infrastructure as Code with SAM

## 📊 Performance

**Load test results (6 concurrent uploads):**

| Metric                  | Value                                |
| ----------------------- | ------------------------------------ |
| **Upload throughput**   | 0.29 uploads/second                  |
| **Processing time**     | ~3.2 seconds per image               |
| **Success rate**        | 100% (6/6)                           |
| **Lambda auto-scaling** | Instant (no throttling)              |
| **Bottleneck**          | Image Resize Lambda (~2 seconds avg) |

**Cost per image:** ~$0.0021 (Rekognition API calls are 95% of cost)

**Details:** [docs/performance-analysis.md](docs/performance-analysis.md)

## 💰 Cost Analysis

**Monthly cost at 10,000 images/month:**

- Rekognition: $20 (2 API calls × $0.001 per image × 10,000)
- Lambda: $0.15 (4 invocations × avg 1.5s × 1024MB)
- Step Functions: $0.25 (10,000 executions)
- DynamoDB: <$0.10 (on-demand, 40,000 writes)
- S3: <$0.50 (storage + requests)
- **Total: ~$21/month** or **$0.0021 per image**

**Free Tier covers:**

- First 5,000 Rekognition images/month for 12 months
- 1M Lambda requests/month forever
- 4,000 Step Functions state transitions/month forever

## 🚀 Getting Started

### Prerequisites

- AWS Account
- AWS CLI configured
- SAM CLI installed
- Node.js 20.x
- Docker (for building Lambda Layers)

### Quick Deploy

```bash
# Clone the repository
git clone https://github.com/Code-Surbhi/image-processing-pipeline.git
cd image-processing-pipeline

# Build
sam build --use-container

# Deploy
sam deploy --guided
```

### Test the Pipeline

```powershell
# Upload an image
cd tests
.\upload-real-image.ps1 -ImagePath "your-image.jpg"

# Query results (wait 10 seconds for processing)
.\query-results.ps1 -ImageId "your-image-id"
```

## 📁 Project Structure

```
image-processing-pipeline/
├── src/                          # Lambda functions
│   ├── presigned-url/            # Generate S3 presigned URLs
│   ├── rekognition-labels/       # Object detection
│   ├── rekognition-faces/        # Face detection
│   ├── image-resize/             # Resize to 3 sizes
│   ├── aggregator/               # Merge results → DynamoDB
│   ├── notification/             # DynamoDB Stream trigger
│   └── query-api/                # REST API for results
├── layers/                       # Lambda Layers
│   └── sharp-layer/              # Sharp library (Linux binaries)
├── statemachine/                 # Step Functions definition
│   └── pipeline.asl.json         # Amazon States Language
├── tests/                        # Test scripts
│   ├── upload-real-image.ps1     # Single upload
│   ├── query-results.ps1         # Query by imageId
│   └── load-test.ps1             # Concurrent uploads
├── docs/                         # Documentation
│   ├── architecture.md           # Architecture diagram
│   ├── performance-analysis.md   # Load test results
│   └── interview-prep.md         # Q&A for placements
├── .github/workflows/            # CI/CD
│   └── deploy.yml                # GitHub Actions
├── template.yaml                 # SAM template (IaC)
└── README.md
```

## 🔄 Deployment

### Automated (CI/CD)

Every push to `main` triggers GitHub Actions:

1. SAM validate (lint template)
2. SAM build (in Docker container)
3. SAM deploy (to AWS)

### Manual

```bash
sam build --use-container
sam deploy
```

## 🧪 Testing

```powershell
# Single upload
cd tests
.\upload-real-image.ps1 -ImagePath "sample.jpg"

# Load test (10 concurrent)
.\load-test.ps1 -ImageCount 10 -ImagePath "sample.jpg"

# Query results
.\query-results.ps1 -ImageId "your-uuid-here"
```

## 📈 Monitoring

### X-Ray Service Map

- **AWS Console** → **X-Ray** → **Service map**
- Shows: Request flow, latency, errors, dependencies
- Use for: Bottleneck identification, distributed tracing

### CloudWatch Dashboard

- **AWS Console** → **CloudWatch** → **Dashboards** → `image-pipeline-dev`
- Shows: Step Functions executions, Lambda metrics, DynamoDB throughput, API Gateway traffic
- Use for: Health monitoring, capacity planning

### CloudWatch Alarms

- **Step Functions failures** (threshold: 1 failure)
- **Aggregator error rate** (threshold: >5%)
- **Rekognition slow duration** (threshold: >10s avg)

## 🎓 Interview Prep

This project demonstrates answers to common AWS interview questions:

**System Design:**

- "Design an image processing pipeline that handles 10,000 uploads/minute"
- "How would you add video processing to this system?"
- "What happens if the Rekognition API is down?"

**AWS-Specific:**

- "Why Step Functions instead of chaining Lambdas?"
- "What is the difference between Step Functions Standard and Express?"
- "How does X-Ray help debug distributed systems?"
- "What is a DynamoDB Stream and why use it?"

**Cost/Scaling:**

- "How much does this cost at 1,000 images/day?"
- "What would you change to handle 10x the load?"

**Full Q&A:** [docs/interview-prep.md](docs/interview-prep.md)

## 👤 Author

**Surbhi**  
3rd Year CSE Student | Chitkara University  
AWS Certified Cloud Practitioner | AWS Certified AI Practitioner

**Contact:**

- GitHub: [@Code-Surbhi](https://github.com/Code-Surbhi)
- LinkedIn: [Your LinkedIn]
- Email: [Your Email]

**Built for:** Campus placements June 2026

## 📄 License

MIT License - feel free to use this project for learning!

---

⭐ **Star this repo if it helped you learn AWS!**
