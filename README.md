# 🚀 Distributed Image Processing Pipeline on AWS

A production-grade serverless image processing system built on AWS, demonstrating distributed systems thinking, fan-out parallelism, and end-to-end observability.

## 🎯 Project Overview

This pipeline processes uploaded images in parallel using AWS Step Functions, performing:

- **AI-powered analysis** via AWS Rekognition (object detection, face detection)
- **Image resizing** into multiple dimensions (thumbnail, medium, large)
- **Distributed tracing** with AWS X-Ray across the entire workflow
- **Event-driven notifications** via DynamoDB Streams

## 🏗️ Architecture

```
User Upload → S3 → EventBridge → Step Functions (Parallel Processing)
  ├── Rekognition Labels
  ├── Rekognition Faces
  └── Image Resize (3 sizes)
      └── Aggregator → DynamoDB → Notification
```

**Full architecture diagram:** [Coming in Phase 14]

## 🛠️ Tech Stack

- **Orchestration:** AWS Step Functions (Standard Workflow)
- **Compute:** AWS Lambda (Node.js 20.x)
- **Storage:** Amazon S3, DynamoDB
- **AI/ML:** AWS Rekognition
- **Observability:** AWS X-Ray, CloudWatch
- **IaC:** AWS SAM
- **CI/CD:** GitHub Actions

## 📦 Project Status

**Current Phase:** Phase 0 - Repository Bootstrap ✅

**Completed Phases:**

- [x] Phase 0 - Setup & Repository Bootstrap

**Upcoming Phases:**

- [ ] Phase 1 - S3 Upload Infrastructure
- [ ] Phase 2 - EventBridge Integration
- [ ] Phase 3 - Step Functions State Machine
- [ ] Phase 4 - Rekognition Lambdas
- [ ] Phase 5 - Image Resize Lambda
- [ ] Phase 6 - Aggregator Lambda + DynamoDB
- [ ] Phase 7 - X-Ray Tracing
- [ ] Phase 8 - DynamoDB Streams + Notifications
- [ ] Phase 9 - Results Query API
- [ ] Phase 10 - S3 Lifecycle + Cost Optimization
- [ ] Phase 11 - CloudWatch Dashboard + Alarms
- [ ] Phase 12 - CI/CD Pipeline
- [ ] Phase 13 - Load Test + Observability Demo
- [ ] Phase 14 - Final Documentation + Interview Prep

## 🚀 Deployment

```bash
# Build
sam build

# Deploy to dev
sam deploy

# Deploy to prod
sam deploy --config-env prod
```

## 📊 Cost Estimation

**Free Tier Usage:**

- Step Functions: 4,000 state transitions/month (Free Tier)
- Rekognition: 5,000 images/month for 12 months (Free Tier)
- Lambda: 1M requests/month (Free Tier)
- X-Ray: 100,000 traces/month (Free Tier)

**Estimated cost (after Free Tier):** ~$0.50 per 1,000 images processed

## 📚 What I Learned

This project demonstrates:

- **Fan-out parallelism** with Step Functions Parallel states
- **Distributed tracing** with X-Ray across multiple services
- **Event-driven architecture** with EventBridge and DynamoDB Streams
- **Cost optimization** with S3 lifecycle policies
- **Infrastructure as Code** with AWS SAM
- **Trunk Based Development** with direct-to-main commits

## 👤 Author

**Surbhi**  
3rd Year CSE Student | Chitkara University  
AWS Certified Cloud Practitioner | AWS Certified AI Practitioner

Building for Knowledge 🎯

## 📄 License

MIT License - feel free to use this project for learning!
