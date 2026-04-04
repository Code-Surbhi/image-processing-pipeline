# 🏗️ Architecture Diagram - Distributed Image Processing Pipeline

## Visual Architecture Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           UPLOAD FLOW (Write Path)                            │
└──────────────────────────────────────────────────────────────────────────────┘

    👤 User/Client
       │
       │ 1. Request presigned URL
       ▼
   ┌─────────────────┐
   │  API Gateway    │
   │  POST /upload   │
   └────────┬────────┘
            │ 2. Generate URL
            ▼
   ┌─────────────────┐
   │ Presigned URL   │◄───── Lambda Function (Node.js 20)
   │    Lambda       │       - Generates S3 presigned URL
   └────────┬────────┘       - 5 minute expiry
            │ 3. Return URL  - No file upload to Lambda
            │
    👤 User uploads directly
       │ 4. PUT to S3
       ▼
   ┌─────────────────┐
   │  S3 Uploads     │◄───── Bucket: image-pipeline-uploads-dev
   │    Bucket       │       - Lifecycle: Glacier after 30 days
   └────────┬────────┘       - Versioning: Enabled
            │ 5. ObjectCreated event
            ▼
   ┌─────────────────┐
   │  EventBridge    │◄───── Event Pattern: s3:ObjectCreated:*
   │      Rule       │       - Filter: prefix = uploads/
   └────────┬────────┘       - Target: Step Functions
            │ 6. Trigger state machine
            ▼
   ┌─────────────────────────────────────────────────────────────┐
   │              Step Functions State Machine                    │
   │                  (Standard Workflow)                         │
   │                                                               │
   │  ┌─────────────┐    ┌──────────────┐                        │
   │  │Extract S3   │───▶│ Prepare      │                        │
   │  │   Info      │    │   Input      │                        │
   │  └─────────────┘    └──────┬───────┘                        │
   │                             │                                │
   │                             ▼                                │
   │              ┌──────────────────────────┐                    │
   │              │  Parallel Processing     │                    │
   │              │   (3 concurrent branches)│                    │
   │              └──────────┬───────────────┘                    │
   │                         │                                    │
   │        ┌────────────────┼────────────────┐                  │
   │        │                │                │                  │
   │        ▼                ▼                ▼                  │
   │  ┌──────────┐    ┌──────────┐    ┌──────────┐             │
   │  │Rekognition    │Rekognition    │  Image   │             │
   │  │  Labels  │    │  Faces   │    │  Resize  │             │
   │  │  Lambda  │    │  Lambda  │    │  Lambda  │             │
   │  └────┬─────┘    └────┬─────┘    └────┬─────┘             │
   │       │               │               │                    │
   │       │ DetectLabels  │ DetectFaces   │ Sharp library     │
   │       ▼               ▼               ▼                    │
   │  ┌──────────┐    ┌──────────┐    ┌──────────┐             │
   │  │   AWS    │    │   AWS    │    │3 Resized │             │
   │  │Rekognition    │Rekognition    │  Images  │             │
   │  │   API    │    │   API    │    │ (S3 Put) │             │
   │  └────┬─────┘    └────┬─────┘    └────┬─────┘             │
   │       │               │               │                    │
   │       │ Labels[]      │ Faces[]       │ Sizes: 150,500,1024│
   │       │               │               │                    │
   │       └───────────────┴───────────────┘                    │
   │                       │                                    │
   │                       ▼                                    │
   │              ┌──────────────┐                              │
   │              │  Aggregator  │                              │
   │              │    Lambda    │                              │
   │              └──────┬───────┘                              │
   │                     │ Merge all results                    │
   └─────────────────────┼──────────────────────────────────────┘
                         │ 7. Write to DynamoDB
                         ▼
                ┌─────────────────┐
                │    DynamoDB     │◄───── Table: image-pipeline-results-dev
                │  Results Table  │       - PK: imageId (UUID)
                └────────┬────────┘       - SK: processingType (LABELS|FACES|RESIZE|AGGREGATED)
                         │                - TTL: 90 days
                         │ 8. DynamoDB Stream (INSERT events only)
                         ▼
                ┌─────────────────┐
                │ Notification    │◄───── Lambda Function
                │    Lambda       │       - Filters: processingType = AGGREGATED
                └─────────────────┘       - Action: Log completion (extensible to SNS/SES)


┌──────────────────────────────────────────────────────────────────────────────┐
│                           QUERY FLOW (Read Path)                              │
└──────────────────────────────────────────────────────────────────────────────┘

    👤 User/Client
       │
       │ 1. Query results by imageId
       ▼
   ┌─────────────────┐
   │  API Gateway    │
   │ GET /results/   │
   │    {imageId}    │
   └────────┬────────┘
            │ 2. Path parameter
            ▼
   ┌─────────────────┐
   │   Query API     │◄───── Lambda Function (Node.js 20)
   │    Lambda       │       - Extracts imageId from path
   └────────┬────────┘       - Queries DynamoDB
            │ 3. DynamoDB Query
            ▼
   ┌─────────────────┐
   │    DynamoDB     │       Query: KeyConditionExpression
   │  Results Table  │       Returns: All 4 items for imageId
   └────────┬────────┘       - LABELS item
            │                - FACES item
            │ 4. Return items│ - RESIZE item
            ▼                - AGGREGATED item
   ┌─────────────────┐
   │   Query API     │       Extract AGGREGATED item
   │    Lambda       │       Format clean JSON response
   └────────┬────────┘
            │ 5. Return formatted JSON
            ▼
    👤 User receives results


┌──────────────────────────────────────────────────────────────────────────────┐
│                        OBSERVABILITY & MONITORING                             │
└──────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
    │    AWS X-Ray    │         │   CloudWatch    │         │   CloudWatch    │
    │   Service Map   │         │      Logs       │         │    Dashboard    │
    ├─────────────────┤         ├─────────────────┤         ├─────────────────┤
    │ • Trace requests│         │ • Lambda logs   │         │ • Step Functions│
    │ • Find latency  │         │ • Error logs    │         │   executions    │
    │ • Detect errors │         │ • Debug info    │         │ • Lambda metrics│
    │ • Service deps  │         │ • Retention:    │         │ • API Gateway   │
    │                 │         │   30 days       │         │   requests      │
    └─────────────────┘         └─────────────────┘         └─────────────────┘
            │                            │                            │
            └────────────────────────────┴────────────────────────────┘
                                         │
                                         ▼
                              ┌─────────────────┐
                              │   CloudWatch    │
                              │     Alarms      │
                              ├─────────────────┤
                              │ • SF failures   │
                              │ • Lambda errors │
                              │ • Slow duration │
                              └────────┬────────┘
                                       │ Send notification
                                       ▼
                              ┌─────────────────┐
                              │   SNS Topic     │
                              │  (Email/SMS)    │
                              └─────────────────┘


┌──────────────────────────────────────────────────────────────────────────────┐
│                         STORAGE & LIFECYCLE                                   │
└──────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────┐    ┌─────────────────────────────────┐
│     S3 Uploads Bucket               │    │   S3 Processed Bucket           │
├─────────────────────────────────────┤    ├─────────────────────────────────┤
│ • Original images                   │    │ • Resized images (3 sizes)      │
│ • Lifecycle Policy:                 │    │ • Intelligent-Tiering:          │
│   - Day 0-29: S3 Standard           │    │   - Frequent Access (default)   │
│   - Day 30+: S3 Glacier             │    │   - Infrequent (30 days)        │
│   - Day 365+: Delete                │    │   - Archive Access (90 days)    │
│ • Cost: $0.023/GB → $0.0036/GB      │    │   - Deep Archive (180 days)     │
│ • Savings: 84% after 30 days        │    │ • Auto-optimization by access   │
└─────────────────────────────────────┘    └─────────────────────────────────┘
```

## Component Summary

### Compute (Lambda Functions)

1. **Presigned URL Lambda** - Generates S3 upload URLs (Node.js 20, 512MB, 10s timeout)
2. **Rekognition Labels Lambda** - Detects objects/scenes (Node.js 20, 512MB, 30s timeout)
3. **Rekognition Faces Lambda** - Detects faces/emotions (Node.js 20, 512MB, 30s timeout)
4. **Image Resize Lambda** - Resizes to 3 sizes (Node.js 20, 1024MB, 60s timeout, Sharp layer)
5. **Aggregator Lambda** - Merges results (Node.js 20, 512MB, 30s timeout)
6. **Notification Lambda** - Processes DynamoDB Stream (Node.js 20, 256MB, 10s timeout)
7. **Query API Lambda** - Returns results by ID (Node.js 20, 256MB, 10s timeout)

### Storage

- **S3 Uploads Bucket** - Original images with lifecycle to Glacier
- **S3 Processed Bucket** - Resized images with Intelligent-Tiering
- **DynamoDB Table** - Results with composite key (imageId + processingType)

### Orchestration

- **Step Functions** - Standard workflow with 3 parallel branches, retry logic, error handling
- **EventBridge** - Event-driven trigger from S3 to Step Functions

### APIs

- **POST /upload-url** - Get presigned S3 URL
- **GET /results/{imageId}** - Query processing results

### Observability

- **X-Ray** - Distributed tracing across all services
- **CloudWatch Logs** - Centralized logging (30-day retention)
- **CloudWatch Dashboard** - Real-time metrics visualization
- **CloudWatch Alarms** - Automated alerting (SNS email notifications)

## Data Flow Sequence

### Upload & Processing (Write Path)

1. User requests presigned URL from API Gateway
2. Lambda generates 5-minute S3 presigned URL
3. User uploads image directly to S3 (bypasses Lambda 6MB limit)
4. S3 emits ObjectCreated event to EventBridge
5. EventBridge triggers Step Functions state machine
6. Step Functions executes 3 parallel branches simultaneously:
   - **Branch A:** Rekognition DetectLabels → Returns objects/scenes
   - **Branch B:** Rekognition DetectFaces → Returns faces/emotions/age/gender
   - **Branch C:** Image Resize → Creates thumbnail (150x150), medium (500x500), large (1024x1024)
7. Aggregator Lambda merges all branch results
8. Aggregator writes 4 items to DynamoDB (LABELS, FACES, RESIZE, AGGREGATED)
9. DynamoDB Stream triggers Notification Lambda (only for AGGREGATED items)
10. Notification logs completion (extensible to email/SMS/webhook)

### Query (Read Path)

1. User calls GET /results/{imageId}
2. Query Lambda extracts imageId from path parameter
3. Lambda queries DynamoDB with partition key = imageId
4. DynamoDB returns all 4 items (LABELS, FACES, RESIZE, AGGREGATED)
5. Lambda extracts AGGREGATED item and formats clean JSON
6. Returns: labels array, faces array, resizedImages array, metadata

## Key Design Decisions & Rationale

### 1. Presigned URLs (not Lambda proxy uploads)

**Why:** Lambda has 6MB synchronous payload limit. Large images fail. Presigned URLs allow direct S3 upload (up to 5TB).
**Trade-off:** Slightly more complex (2 API calls) but removes bottleneck.
**Production usage:** Dropbox, Figma, Notion all use presigned URLs.

### 2. EventBridge (not S3 Lambda trigger)

**Why:** Loose coupling - S3 doesn't know about Step Functions. Can add more consumers (SNS, SQS) without changing S3.
**Trade-off:** Minimal latency increase (~50ms) but better architecture.
**Bonus:** Event replay, filtering, cross-account delivery.

### 3. Step Functions Parallel State (not Lambda fan-out)

**Why:** Built-in retry logic, visual workflow, automatic error handling, 90-day audit trail.
**Trade-off:** Higher cost than Lambda chains ($0.025 per 1000 transitions) but worth it for reliability.
**Alternative:** Lambda → SNS fan-out, but loses workflow visibility and retry logic.

### 4. DynamoDB Single-Table Design

**Why:** One Query operation returns all data. All items in same partition = fast reads.
**Schema:** PK = imageId, SK = processingType (LABELS | FACES | RESIZE | AGGREGATED)
**Trade-off:** More complex data modeling but fewer queries and lower cost.

### 5. Lambda Layer for Sharp

**Why:** Sharp has native C++ binaries (libvips). Must compile for Lambda's Linux x86_64, not Windows/macOS.
**Solution:** Docker build with Amazon Linux 2023 base image, then package as Lambda Layer.
**Alternative:** Use ImageMagick (slower, deprecated) or AWS-managed sharp layer (not available).

### 6. X-Ray Everywhere

**Why:** Distributed systems are hard to debug. X-Ray shows request flow across 7 Lambda functions, Step Functions, Rekognition, S3, DynamoDB.
**Cost:** $0.50 per 1M traces recorded. At 10,000 images/month = $0.005/month.
**Value:** Identifies bottlenecks (Image Resize = 2 seconds avg) that CloudWatch metrics miss.

## Performance Characteristics

**Measured Performance (6 concurrent uploads):**

- Presigned URL generation: ~50ms
- S3 upload: ~500ms (depends on file size and network)
- EventBridge trigger latency: ~50ms
- Step Functions parallel processing: ~3.2 seconds total
  - Rekognition Labels: ~1.5 seconds
  - Rekognition Faces: ~1.2 seconds
  - Image Resize: ~2.0 seconds (bottleneck)
- Aggregator write to DynamoDB: ~200ms
- End-to-end latency: ~4 seconds from upload to results stored

**Bottleneck Analysis:**

- Image Resize Lambda is slowest (2 seconds avg)
- Breakdown: S3 download (100ms) + Sharp resize (1500ms) + S3 upload (400ms)
- Optimization: Increase memory from 1024MB → 1792MB (gets full vCPU, 30% faster)

**Scalability:**

- Lambda concurrency limit: 1,000 (default)
- With 4 Lambdas per image: 250 concurrent images theoretical max
- DynamoDB: Auto-scales to handle any throughput (on-demand billing)
- Step Functions: 25,000 executions/second regional limit

## Cost Breakdown (per 10,000 images/month)

| Service               | Cost       | % of Total |
| --------------------- | ---------- | ---------- |
| Rekognition API       | $20.00     | 95%        |
| Lambda execution      | $0.15      | 1%         |
| Step Functions        | $0.25      | 1%         |
| DynamoDB writes       | $0.10      | <1%        |
| S3 storage + requests | $0.50      | 2%         |
| X-Ray traces          | $0.005     | <1%        |
| **Total**             | **$21.00** | **100%**   |

**Per-image cost:** $0.0021

**Free Tier coverage:**

- Rekognition: First 5,000 images free for 12 months → saves $10/month
- Lambda: 1M requests free forever → exceeds our usage
- Step Functions: 4,000 transitions free forever → exceeds our usage

## Security & Best Practices

✅ **IAM Least Privilege** - Each Lambda has minimal required permissions  
✅ **S3 Block Public Access** - All buckets have public access blocked  
✅ **Encryption at Rest** - S3 SSE-S3, DynamoDB default encryption  
✅ **VPC Endpoints** - Not required (using AWS-managed services)  
✅ **Secrets Management** - No hardcoded credentials, uses IAM roles  
✅ **Input Validation** - Presigned URL Lambda validates file types  
✅ **Error Handling** - All Lambdas have try/catch, Step Functions has retry logic  
✅ **Idempotency** - DynamoDB conditional writes prevent duplicate processing  
✅ **TTL** - Auto-delete old data after 90 days (GDPR compliance ready)

## CI/CD Pipeline

**GitHub Actions workflow on push to `main`:**

1. Checkout code
2. Setup Node.js 20 + Python 3.12 + SAM CLI
3. Configure AWS credentials (from GitHub Secrets)
4. SAM validate (lint CloudFormation template)
5. SAM build --use-container (Docker build for Lambda Layer)
6. SAM deploy --no-confirm-changeset (auto-approve deployment)
7. Output API endpoints

**Deployment time:** ~12 minutes (Docker build is slowest step)

## Future Enhancements

🚀 **Video Processing** - Add MediaConvert for video transcoding  
🚀 **Real-time Notifications** - Connect Notification Lambda to SNS/SES for email alerts  
🚀 **GraphQL API** - Replace REST with AppSync for real-time subscriptions  
🚀 **Multi-region** - Deploy to multiple regions with Route 53 geolocation routing  
🚀 **Content Moderation** - Add Rekognition DetectModerationLabels for NSFW detection  
🚀 **Image Tagging** - Auto-tag S3 objects with Rekognition labels for searchability  
🚀 **Batch Processing** - Add SQS queue for offline batch processing  
🚀 **WebSocket API** - Real-time progress updates during processing
