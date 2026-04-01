# Test script for uploading an image to S3 via presigned URL

$API_ENDPOINT = "https://ko5zmchz7g.execute-api.ap-south-1.amazonaws.com/dev/upload-url"

Write-Host "==> Step 1: Requesting presigned URL..." -ForegroundColor Cyan

# Request presigned URL from API
$body = @{
    fileName = "test-image.jpg"
    contentType = "image/jpeg"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri $API_ENDPOINT -Method POST -Body $body -ContentType "application/json"

Write-Host "API Response:" -ForegroundColor Green
$response | ConvertTo-Json

$uploadUrl = $response.uploadUrl
$imageId = $response.imageId

if (-not $uploadUrl) {
    Write-Host "❌ Failed to get presigned URL" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "==> Step 2: Uploading test image to S3..." -ForegroundColor Cyan
Write-Host "Image ID: $imageId" -ForegroundColor Yellow

# Create a simple test image (minimal valid JPEG)
$testImagePath = Join-Path $PSScriptRoot "test-image.jpg"
$bytes = [byte[]](0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12, 0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20, 0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29, 0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32, 0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 0xFF, 0xC4, 0x00, 0x14, 0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00, 0x37, 0xFF, 0xD9)

Write-Host "Creating test image at: $testImagePath" -ForegroundColor Gray
[System.IO.File]::WriteAllBytes($testImagePath, $bytes)

# Verify file was created
if (-not (Test-Path $testImagePath)) {
    Write-Host "❌ Failed to create test image" -ForegroundColor Red
    exit 1
}

Write-Host "Test image created successfully" -ForegroundColor Gray

# Upload to S3 using presigned URL
try {
    $uploadResponse = Invoke-WebRequest -Uri $uploadUrl -Method PUT -InFile $testImagePath -ContentType "image/jpeg" -UseBasicParsing
    
    if ($uploadResponse.StatusCode -eq 200) {
        Write-Host "✅ Upload successful! (HTTP $($uploadResponse.StatusCode))" -ForegroundColor Green
        Write-Host "Image ID: $imageId" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "  1. Go to AWS Console → S3 → image-pipeline-uploads-dev-823151422906" -ForegroundColor White
        Write-Host "  2. Navigate to uploads/ folder" -ForegroundColor White
        Write-Host "  3. Look for file: $imageId.jpg" -ForegroundColor White
    } else {
        Write-Host "❌ Upload failed (HTTP $($uploadResponse.StatusCode))" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Upload failed: $_" -ForegroundColor Red
    Write-Host "Error details: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    # Cleanup
    if (Test-Path $testImagePath) {
        Remove-Item $testImagePath -ErrorAction SilentlyContinue
        Write-Host "Cleaned up test image" -ForegroundColor Gray
    }
}