param(
    # required
    [string]$apiKey,
    [string]$apiSecret,
    [string]$portalUrl,
    # optional
    [string]$eventType = "",
    [string]$ipAddress = "",
    [string]$authenticatedUser = "",
    [string]$impersonatedUser = "",
    [string]$packageOwner = "",
    [string]$minTimestamp = "",
    [string]$maxTimestamp = ""
)

function New-Signature {
    param(
        [string]$apiSecret,
        [string]$apiKey,
        [string]$portalUrl,
        [string]$requestPath,
        [string]$timestamp,
        [string]$body
    )

    $baseUrlPath = $portalUrl.Substring($portalUrl.IndexOf('/', 8))
    $fullPath = $baseUrlPath + $requestPath

    $dataToHash = $apiKey + $fullPath + $timestamp + $body

    $hmacsha = New-Object System.Security.Cryptography.HMACSHA256
    $hmacsha.Key = [Text.Encoding]::ASCII.GetBytes($apiSecret)
    $signatureBytes = $hmacsha.ComputeHash([Text.Encoding]::ASCII.GetBytes($dataToHash))
    $signature = [BitConverter]::ToString($signatureBytes) -replace '-', ''
    return $signature.ToLower()
}

#Initialize required variables
$pageSize = 100
$rowIndex = 0

function Get-AuditLog {
    $requestPath = "api/v2.0/enterprise/audit-logs/"
    $timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss") + "+0000"
    $body = @{
        eventType = $eventType
        ipAddress = $ipAddress
        authenticatedUser = $authenticatedUser
        impersonatedUser = $impersonatedUser
        packageOwner = $packageOwner
        minTimestamp = $minTimestamp
        maxTimestamp = $maxTimestamp
        pageSize = $pageSize
        rowIndex = $rowIndex
    } | ConvertTo-Json -Compress

    $signature = New-Signature -apiSecret $apiSecret -apiKey $apiKey -portalUrl $portalUrl -requestPath $requestPath -timestamp $timestamp -body $body

    $headers = @{
        "ss-api-key" = $apiKey
        "ss-request-signature" = $signature
        "ss-request-timestamp" = $timestamp
        "content-type" = "application/json"
    }

    $response = Invoke-RestMethod -Uri "$portalUrl$requestPath" -Method Post -Headers $headers -Body $body
    return $response
}

do {
    $response = Get-AuditLog
    $response | ConvertTo-Json -Depth 100
    $rowsReturned = $response.pagination.rowsReturned -as [int] # Convert rowsReturned to integer for comparison
    $rowIndex += $pageSize

    # Check if rowsReturned is less than pageSize, if so, break the loop
    if ($rowsReturned -lt $pageSize) {
        break
    }
} while ($true)