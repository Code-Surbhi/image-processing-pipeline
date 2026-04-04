# Query processing results by imageId

param(
    [Parameter(Mandatory=$true)]
    [string]$ImageId
)

$API_ENDPOINT = "https://ko5zmchz7g.execute-api.ap-south-1.amazonaws.com/dev/results/$ImageId"

Write-Host "==> Querying results for imageId: $ImageId" -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri $API_ENDPOINT -Method GET
    
    Write-Host "✅ Results found!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Image ID: $($response.imageId)" -ForegroundColor Yellow
    Write-Host "Status: $($response.status)" -ForegroundColor Yellow
    Write-Host "Processed At: $($response.processedAt)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Labels Detected: $($response.results.labelCount)" -ForegroundColor Cyan
    Write-Host "Faces Detected: $($response.results.faceCount)" -ForegroundColor Cyan
    Write-Host "Resized Images: $($response.results.resizedImages.Count)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Full Response:" -ForegroundColor Gray
    $response | ConvertTo-Json -Depth 10

} catch {
    if ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "❌ Image not found" -ForegroundColor Red
    } else {
        Write-Host "❌ Error: $_" -ForegroundColor Red
    }
}