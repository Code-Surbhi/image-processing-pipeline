#!/bin/bash

# Test script for uploading an image to S3 via presigned URL

API_ENDPOINT="https://ko5zmchz7g.execute-api.ap-south-1.amazonaws.com/dev"  # Replace with your actual endpoint

echo "==> Step 1: Requesting presigned URL..."

# Request presigned URL from API
RESPONSE=$(curl -s -X POST "$API_ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{"fileName": "test-image.jpg", "contentType": "image/jpeg"}')

echo "API Response:"
echo "$RESPONSE" | jq .

# Extract upload URL and imageId
UPLOAD_URL=$(echo "$RESPONSE" | jq -r '.uploadUrl')
IMAGE_ID=$(echo "$RESPONSE" | jq -r '.imageId')

if [ "$UPLOAD_URL" == "null" ]; then
  echo "❌ Failed to get presigned URL"
  exit 1
fi

echo ""
echo "==> Step 2: Uploading test image to S3..."
echo "Image ID: $IMAGE_ID"

# Create a test image (1x1 pixel JPEG)
echo -n -e '\xff\xd8\xff\xe0\x00\x10\x4a\x46\x49\x46\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00\xff\xdb\x00\x43\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\x09\x09\x08\x0a\x0c\x14\x0d\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c\x20\x24\x2e\x27\x20\x22\x2c\x23\x1c\x1c\x28\x37\x29\x2c\x30\x31\x34\x34\x34\x1f\x27\x39\x3d\x38\x32\x3c\x2e\x33\x34\x32\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00\xff\xc4\x00\x14\x00\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x03\xff\xc4\x00\x14\x10\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\xff\xda\x00\x08\x01\x01\x00\x00\x3f\x00\x37\xff\xd9' > test-image.jpg

# Upload to S3 using presigned URL
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "$UPLOAD_URL" \
  -H "Content-Type: image/jpeg" \
  --data-binary @test-image.jpg)

if [ "$HTTP_STATUS" == "200" ]; then
  echo "✅ Upload successful! (HTTP $HTTP_STATUS)"
  echo "Image ID: $IMAGE_ID"
  echo ""
  echo "Next: Check EventBridge in AWS Console to see the S3 ObjectCreated event"
else
  echo "❌ Upload failed (HTTP $HTTP_STATUS)"
  exit 1
fi

# Cleanup
rm test-image.jpg