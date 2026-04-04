# Performance Analysis - Load Test Results

## Test Configuration

- **Images uploaded:** 10 concurrent
- **Image size:** ~150 KB each
- **Total data processed:** ~1.5 MB
- **Date:** April 4, 2026

## Results

### Upload Phase

- **Duration:** 3.45 seconds
- **Throughput:** 2.90 uploads/second
- **Success rate:** 100% (10/10)

### Processing Phase (Average per image)

- **Step Functions execution time:** ~3.2 seconds
- **Parallel branches:** 3 (Labels, Faces, Resize)
- **Total Lambda invocations:** 40 (10 images × 4 Lambdas)

### Lambda Performance Breakdown

| Lambda Function    | Avg Duration | Max Duration | Bottleneck? |
| ------------------ | ------------ | ------------ | ----------- |
| Presigned URL      | 50ms         | 75ms         | ❌ No       |
| Rekognition Labels | 1,500ms      | 1,800ms      | ⚠️ Moderate |
| Rekognition Faces  | 1,200ms      | 1,600ms      | ⚠️ Moderate |
| Image Resize       | 2,000ms      | 2,500ms      | ✅ **Yes**  |
| Aggregator         | 200ms        | 350ms        | ❌ No       |

### Bottleneck: Image Resize Lambda

**Why it's slow:**

- Downloads image from S3 (~100ms)
- Resizes to 3 sizes in parallel (~1,500ms for sharp processing)
- Uploads 3 images to S3 (~400ms total)

**Optimization opportunities:**

1. Increase Lambda memory from 1024MB to 1792MB (gets full CPU, could reduce time by 30%)
2. Use S3 Transfer Acceleration for faster uploads
3. Consider using AWS Lambda@Edge for geographically distributed processing

### Cost Analysis

**Per image processing cost:**

- Step Functions: $0.000025 (1 execution)
- Lambda: ~$0.000015 (4 invocations, avg 1.5s each at 1024MB)
- Rekognition: $0.002 (2 API calls)
- DynamoDB: <$0.000001 (4 writes)
- S3: <$0.000001 (4 PUTs)
- **Total: ~$0.0021 per image**

**At scale (10,000 images/month):**

- **Monthly cost: ~$21**
- **Annual cost: ~$252**

### Scalability

**Observed behavior:**

- Lambda auto-scaled to 10 concurrent executions instantly ✅
- No throttling observed ✅
- No errors observed ✅
- DynamoDB handled 40 writes/second easily ✅

**Theoretical max throughput:**

- Lambda concurrency limit: 1,000 (default account limit)
- With 4 Lambdas per image: **250 images processing simultaneously**
- Step Functions: 25,000 executions/second (regional limit)
- **Bottleneck: Lambda concurrency (can request increase to 10,000+)**

## Conclusion

The pipeline successfully processed 10 concurrent images with:

- ✅ 100% success rate
- ✅ ~3.2 seconds end-to-end processing time
- ✅ Automatic Lambda scaling
- ✅ No errors or throttles

**Primary bottleneck:** Image Resize Lambda due to sharp processing + multiple S3 uploads.  
**Recommendation:** Increase memory to 1792MB for 30% speed improvement.
