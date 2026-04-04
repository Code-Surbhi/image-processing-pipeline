# Architecture Diagram

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER / CLIENT                                 │
│                              │                                       │
│                              ▼                                       │
│                    ┌─────────────────┐                              │
│                    │  API Gateway    │                              │
│                    │  /upload-url    │                              │
│                    └────────┬────────┘                              │
│                             │                                       │
│                             ▼                                       │
│                    ┌─────────────────┐                              │
│                    │ Presigned URL   │                              │
│                    │    Lambda       │                              │
│                    └────────┬────────┘                              │
│                             │                                       │
│                    ┌────────▼─────────┐                             │
│                    │   S3 Uploads     │                             │
│                    │   Bucket         │                             │
│                    └────────┬─────────┘                             │
│                             │                                       │
│                    ┌────────▼────────┐                              │
│                    │   EventBridge   │                              │
│                    └────────┬────────┘                              │
│                             │                                       │
│              ┌──────────────▼──────────────┐                        │
│              │  Step Functions             │                        │
│              │  (State Machine)            │                        │
│              └──────────────┬──────────────┘                        │
│                             │                                       │
│         ┌───────────────────┼───────────────────┐                  │
│         │                   │                   │                  │
│         ▼                   ▼                   ▼                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐           │
│  │ Rekognition │    │ Rekognition │    │Image Resize │           │
│  │   Labels    │    │   Faces     │    │   Lambda    │           │
│  │   Lambda    │    │   Lambda    │    │             │           │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘           │
│         │                   │                   │                  │
│         │                   │                   ▼                  │
│         │                   │          ┌─────────────┐            │
│         │                   │          │     S3      │            │
│         │                   │          │  Processed  │            │
│         │                   │          │   Bucket    │            │
│         │                   │          └─────────────┘            │
│         │                   │                                     │
│         └───────────────────┴───────────────┐                     │
│                                             │                     │
│                                             ▼                     │
│                                    ┌─────────────┐                │
│                                    │ Aggregator  │                │
│                                    │   Lambda    │                │
│                                    └──────┬──────┘                │
│                                           │                       │
│                                           ▼                       │
│                                    ┌─────────────┐                │
│                                    │  DynamoDB   │                │
│                                    │Results Table│                │
│                                    └──────┬──────┘                │
│                                           │                       │
│                                           │ Stream                │
│                                           ▼                       │
│                                    ┌─────────────┐                │
│                                    │Notification │                │
│                                    │   Lambda    │                │
│                                    └─────────────┘                │
│                                                                   │
│                    ┌─────────────────┐                            │
│                    │  API Gateway    │                            │
│                    │ /results/{id}   │                            │
│                    └────────┬────────┘                            │
│                             │                                     │
│                             ▼                                     │
│                    ┌─────────────────┐                            │
│                    │   Query API     │                            │
│                    │    Lambda       │                            │
│                    └────────┬────────┘                            │
│                             │                                     │
│                             ▼                                     │
│                    ┌─────────────────┐                            │
│                    │    DynamoDB     │                            │
│                    │  (Query)        │                            │
│                    └─────────────────┘                            │
│                                                                   │
│  Observability Layer (across everything):                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   X-Ray     │  │ CloudWatch  │  │ CloudWatch  │             │
│  │  Tracing    │  │    Logs     │  │  Dashboard  │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Details

### Storage

- **S3 Uploads Bucket:** Stores original images with lifecycle policy (Glacier after 30 days)
- **S3 Processed Bucket:** Stores resized images with Intelligent-Tiering
- **DynamoDB Results Table:** Stores processing results with TTL (90 days)

### Compute

- **7 Lambda Functions:** Presigned URL, Rekognition Labels, Rekognition Faces, Image Resize, Aggregator, Notification, Query API
- **1 Lambda Layer:** Sharp image processing library (Linux x86_64 binaries)

### Orchestration

- **Step Functions State Machine:** Parallel processing with 3 branches, automatic retries, error handling
- **EventBridge Rule:** Triggers Step Functions on S3 ObjectCreated events

### Observability

- **X-Ray:** Distributed tracing across all services
- **CloudWatch:** Logs, metrics, dashboard, alarms
- **SNS Topic:** Alarm notifications via email

### APIs

- **POST /upload-url:** Generate S3 presigned URL
- **GET /results/{imageId}:** Query processing results

## Data Flow

1. User requests presigned URL from API Gateway
2. Presigned URL Lambda generates time-limited S3 upload URL (5 min expiry)
3. User uploads image directly to S3 (no Lambda proxy)
4. S3 emits ObjectCreated event to EventBridge
5. EventBridge triggers Step Functions state machine
6. Step Functions fans out to 3 parallel branches:
   - Branch A: Rekognition DetectLabels (objects, scenes)
   - Branch B: Rekognition DetectFaces (faces, emotions, age, gender)
   - Branch C: Image Resize (thumbnail 150x150, medium 500x500, large 1024x1024)
7. Aggregator Lambda merges all results
8. Aggregator writes 4 items to DynamoDB (LABELS, FACES, RESIZE, AGGREGATED)
9. DynamoDB Stream triggers Notification Lambda
10. Notification Lambda logs completion (placeholder for email/SMS/webhook)
11. User queries results via GET /results/{imageId}
12. Query API Lambda reads from DynamoDB and returns combined results

## Key Design Decisions

### Why Presigned URLs?

- Avoid Lambda payload size limits (6 MB sync, 256 KB response)
- Lower latency (direct S3 upload)
- Lower cost (no Lambda execution for file transfer)

### Why EventBridge (not S3 Lambda trigger)?

- Loose coupling (S3 doesn't know about Step Functions)
- Fan-out (one event can trigger multiple consumers)
- Better filtering (prefix, size, metadata patterns)

### Why Step Functions Parallel State?

- True concurrency (all 3 branches run simultaneously)
- Built-in retry logic (exponential backoff)
- Visual workflow (execution graph in console)
- Audit trail (90-day execution history)

### Why DynamoDB Single-Table Design?

- One query returns all data for an image
- All related data in same partition (fast reads)
- Fewer tables = simpler billing

### Why Lambda Layer for Sharp?

- Sharp has native binaries (C++ libvips)
- Must be compiled for Lambda's Linux x86_64 architecture
- Layer allows sharing across functions (smaller deployment packages)

### Why X-Ray Everywhere?

- End-to-end request tracing
- Performance bottleneck identification
- Service dependency visualization
- No code changes needed (just enable tracing)

## Performance Analysis

### Load Test Results (6 concurrent uploads)

- **Success rate:** 100% (6/6)
- **Processing time:** ~3.2 seconds per image
- **Lambda auto-scaling:** Instant, no throttling

### Lambda Performance Breakdown

| Lambda Function    | Avg Duration | Bottleneck? |
| ------------------ | ------------ | ----------- |
| Presigned URL      | 50ms         | ❌ No       |
| Rekognition Labels | 1,500ms      | ⚠️ Moderate |
| Rekognition Faces  | 1,200ms      | ⚠️ Moderate |
| Image Resize       | 2,000ms      | ✅ **Yes**  |
| Aggregator         | 200ms        | ❌ No       |

### Bottleneck: Image Resize Lambda

**Why it's slow:**

- Downloads image from S3 (~100ms)
- Resizes to 3 sizes in parallel (~1,500ms for sharp processing)
- Uploads 3 images to S3 (~400ms total)

**Optimization opportunities:**

1. Increase Lambda memory from 1024MB to 1792MB (gets full CPU, 30% faster)
2. Use S3 Transfer Acceleration for faster uploads
3. Consider Lambda@Edge for geographically distributed processing

## Cost Analysis

**Per image processing cost:**

- Step Functions: $0.000025
- Lambda: $0.000015 (4 invocations, avg 1.5s each at 1024MB)
- Rekognition: $0.002 (2 API calls)
- DynamoDB: <$0.000001 (4 writes)
- S3: <$0.000001 (4 PUTs)
- **Total: ~$0.0021 per image**

**At scale (10,000 images/month):**

- **Monthly cost: ~$21**
- **Annual cost: ~$252**

## Scalability

**Theoretical max throughput:**

- Lambda concurrency limit: 1,000 (default account limit)
- With 4 Lambdas per image: **250 images processing simultaneously**
- Step Functions: 25,000 executions/second (regional limit)
- **Bottleneck: Lambda concurrency (can request increase to 10,000+)**
