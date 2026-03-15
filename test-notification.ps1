$body = @{
    type = "reminder"
    title = "Test thong bao"
    content = "Day la thong bao test tu API"
    userId = 1
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/api/notifications" -Method POST -ContentType "application/json" -Body $body -ErrorAction Stop
    Write-Host "Success: $($response | ConvertTo-Json)"
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    $errorResponse = $_.Exception.Response
    if ($errorResponse) {
        $reader = New-Object System.IO.StreamReader($errorResponse.GetResponseStream())
        $reader.BaseStream.Position = 0
        $errorContent = $reader.ReadToEnd()
        Write-Host "Response: $errorContent"
    }
}
