# Upload a real image to test Rekognition

param(
    [Parameter(Mandatory=$true)]
    [string]$ImagePath
)

$API_ENDPOINT = "https://ko5zmchz7g.execute-api.ap-south-1.amazonaws.com/dev/upload-url"

if (-not (Test-Path $ImagePath)) {
    Write-Host "❌ Image not found: $ImagePath" -ForegroundColor Red
    exit 1
}

$fileName = Split-Path $ImagePath -Leaf
$extension = [System.IO.Path]::GetExtension($ImagePath).ToLower()

# Determine content type
$contentType = switch ($extension) {
    ".jpg"  { "image/jpeg" }
    ".jpeg" { "image/jpeg" }
    ".png"  { "image/png" }
    ".gif"  { "image/gif" }
    ".webp" { "image/webp" }
    default { "image/jpeg" }
}

Write-Host "==> Uploading: $fileName" -ForegroundColor Cyan
Write-Host "    Content-Type: $contentType" -ForegroundColor Gray

# Step 1: Request presigned URL
$body = @{
    fileName = $fileName
    contentType = $contentType
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri $API_ENDPOINT -Method POST -Body $body -ContentType "application/json"

$uploadUrl = $response.uploadUrl
$imageId = $response.imageId

Write-Host "    Image ID: $imageId" -ForegroundColor Yellow

# Step 2: Upload to S3
try {
    $uploadResponse = Invoke-WebRequest -Uri $uploadUrl -Method PUT -InFile $ImagePath -ContentType $contentType -UseBasicParsing
    
    if ($uploadResponse.StatusCode -eq 200) {
        Write-Host "✅ Upload successful!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "  1. Wait 5-10 seconds for processing to complete" -ForegroundColor White
        Write-Host "  2. Go to AWS Console → Step Functions → image-pipeline-pipeline-dev" -ForegroundColor White
        Write-Host "  3. Click on the latest execution to see Rekognition results" -ForegroundColor White
        Write-Host "  4. Image ID: $imageId" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Upload failed: $_" -ForegroundColor Red
    exit 1
}