# Load test script - upload multiple images in parallel

param(
    [int]$ImageCount = 10,
    [string]$ImagePath = "sample-cat.jpg"
)

$API_ENDPOINT = "https://ko5zmchz7g.execute-api.ap-south-1.amazonaws.com/dev/upload-url"

# Get absolute path
$absolutePath = (Resolve-Path $ImagePath).Path

if (-not (Test-Path $absolutePath)) {
    Write-Host "❌ Image not found: $absolutePath" -ForegroundColor Red
    exit 1
}

Write-Host "🚀 Load Test Starting..." -ForegroundColor Cyan
Write-Host "   Images to upload: $ImageCount" -ForegroundColor Yellow
Write-Host "   Image: $absolutePath" -ForegroundColor Yellow
Write-Host ""

$fileName = Split-Path $absolutePath -Leaf
$extension = [System.IO.Path]::GetExtension($absolutePath).ToLower()
$contentType = switch ($extension) {
    ".jpg"  { "image/jpeg" }
    ".jpeg" { "image/jpeg" }
    ".png"  { "image/png" }
    default { "image/jpeg" }
}

$startTime = Get-Date
$jobs = @()

# Upload images in parallel using PowerShell jobs
for ($i = 1; $i -le $ImageCount; $i++) {
    $job = Start-Job -ScriptBlock {
        param($ApiEndpoint, $AbsolutePath, $FileName, $ContentType, $Index)
        
        try {
            # Request presigned URL
            $body = @{
                fileName = $FileName
                contentType = $ContentType
            } | ConvertTo-Json
            
            $response = Invoke-RestMethod -Uri $ApiEndpoint -Method POST -Body $body -ContentType "application/json"
            
            # Upload to S3
            $uploadResponse = Invoke-WebRequest -Uri $response.uploadUrl -Method PUT -InFile $AbsolutePath -ContentType $ContentType -UseBasicParsing
            
            return @{
                Index = $Index
                ImageId = $response.imageId
                Success = ($uploadResponse.StatusCode -eq 200)
                Error = $null
            }
        } catch {
            return @{
                Index = $Index
                ImageId = $null
                Success = $false
                Error = $_.Exception.Message
            }
        }
    } -ArgumentList $API_ENDPOINT, $absolutePath, $fileName, $contentType, $i
    
    $jobs += $job
    Write-Host "[$i/$ImageCount] Started upload job..." -ForegroundColor Gray
}

Write-Host ""
Write-Host "⏳ Waiting for all uploads to complete..." -ForegroundColor Cyan

# Wait for all jobs to complete
$results = $jobs | Wait-Job | Receive-Job

# Clean up jobs
$jobs | Remove-Job

$endTime = Get-Date
$duration = ($endTime - $startTime).TotalSeconds

$successCount = ($results | Where-Object {$_.Success} | Measure-Object).Count
$failCount = ($results | Where-Object {-not $_.Success} | Measure-Object).Count

Write-Host ""
Write-Host "✅ Load Test Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Results:" -ForegroundColor Cyan
Write-Host "  Total uploads: $ImageCount" -ForegroundColor White
Write-Host "  Successful: $successCount" -ForegroundColor Green
Write-Host "  Failed: $failCount" -ForegroundColor Red
Write-Host "  Duration: $([math]::Round($duration, 2)) seconds" -ForegroundColor Yellow

if ($successCount -gt 0) {
    Write-Host "  Throughput: $([math]::Round($successCount / $duration, 2)) uploads/second" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Image IDs:" -ForegroundColor Cyan
$results | Where-Object {$_.Success} | ForEach-Object {
    Write-Host "  [$($_.Index)] $($_.ImageId)" -ForegroundColor Gray
}

if ($failCount -gt 0) {
    Write-Host ""
    Write-Host "Failed uploads:" -ForegroundColor Red
    $results | Where-Object {-not $_.Success} | ForEach-Object {
        Write-Host "  [$($_.Index)] $($_.Error)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Wait 30-60 seconds for processing to complete" -ForegroundColor White
Write-Host "  2. Go to AWS Console → X-Ray → Service map" -ForegroundColor White
Write-Host "  3. Go to AWS Console → CloudWatch → Dashboards → image-pipeline-dev" -ForegroundColor White
Write-Host "  4. Screenshot the service map and dashboard!" -ForegroundColor White