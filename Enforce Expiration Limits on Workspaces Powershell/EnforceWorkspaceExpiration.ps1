param(
    # required
    [string]$apiKey,
    [string]$apiSecret,
    [string]$portalUrl, #in the format https://yourcompany.sendsafely.com/
    # optional
    [int]$maxWorkspaceFileAge = 90,
    [switch]$liveRun = $false,
    [string]$specificPackageIds = "" # If you only want to target specific Workspaces, provide a comma-separated list of their packageIds
)

Write-Host "Max Workspace File Age: $maxWorkspaceFileAge"
Write-Host "Live Run: $liveRun"

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

function Get-ActiveWorkspacePackages {
    param(
        [int]$rowIndex,
        [int]$pageSize
    )
    $requestPath = "api/v2.0/package/organization/search"
    $timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss") + "+0000"
    $body = @{
        status = "ACTIVE"
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

function Get-PackageInformation {
    param(
        [string]$packageId
    )
    $requestPath = "api/v2.0/package/$packageId"
    $timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss") + "+0000"
    $body = ""

    $signature = New-Signature -apiSecret $apiSecret -apiKey $apiKey -portalUrl $portalUrl -requestPath $requestPath -timestamp $timestamp -body $body

    $headers = @{
        "ss-api-key" = $apiKey
        "ss-request-signature" = $signature
        "ss-request-timestamp" = $timestamp
        "content-type" = "application/json"
    }

    $response = Invoke-RestMethod -Uri "$portalUrl$requestPath" -Method Get -Headers $headers
    return $response
}

function Invoke-DirectoryProcessing {
    param(
        [object]$directory,
        [string]$path = "", # Initialize with an empty string for the top-level directory
        [string]$packageId
    )
    # Update the path with the current directory ID
    $currentPath = $path + ($directory.directoryId + "/")

    # Calculate the threshold date
    $thresholdDate = (Get-Date).AddDays(-$maxWorkspaceFileAge)

    foreach ($file in $directory.files) {
        $fileId = $file.fileId
        $fileName = $file.fileName
        $uploaded = $file.uploaded
        $uploadedDate = [datetime]::Parse($uploaded)

        # Check if the file was uploaded before the threshold date
        if ($uploadedDate -lt $thresholdDate) {
            # Add the file information to the collection
            $fileInfo = New-Object PSObject -Property @{
                PackageId = $packageId
                DirectoryId = $directory.directoryId
                FileId = $fileId
                FileName = $fileName
                Uploaded = $uploaded
                Path = $currentPath
            }
            $oldFilesCollection.Add($fileInfo)
        }
    }

    # Recursively process subdirectories
    foreach ($subDirectory in $directory.subDirectories) {
        Invoke-DirectoryProcessing -directory $subDirectory -path $currentPath -packageId $packageId
    }
}

# Initialize required variables
$rowIndex = 0
$pageSize = 100
$activeWorkspacePackages = @()
$oldFilesCollection = [System.Collections.ArrayList]::new()
$thresholdDate = (Get-Date).AddDays(-$maxWorkspaceFileAge)

if (!$specificPackageIds.Contains('-')) {
    Write-Host "Looking at all Workspaces"
    # Loop to fetch packages in batches of 100
    do {
        # Call the function to get active workspace packages
        Write-Host "Looking at Workspaces from $rowIndex on."
        $response = Get-ActiveWorkspacePackages -rowIndex $rowIndex -pageSize $pageSize

        # Iterate through each package to check for packageIsVdr
        foreach ($package in $response.packages) {
            if ($package.packageIsVdr -eq $true) {
                $activeWorkspacePackages += $package.packageId # Add packageId to the list
            }
        }

        # Check if the number of packages returned is less than pageSize
        $packagesReturned = $response.packages.Count
        if ($packagesReturned -lt $pageSize) {
            break # Exit the loop if this is the last batch
        }

        # Increment rowIndex for the next batch
        $rowIndex += $pageSize
        Write-Host "New row index is $rowIndex"
    } while ($true)
} else {
    $packageIdArray = $specificPackageIds.Split(',')
    # Use the provided list of specific package IDs
    $activeWorkspacePackages = $packageIdArray
}

Write-Host "Total count of Active Workspace Packages: $($activeWorkspacePackages.Count)"
Write-Host "All Active Workspace Packages: $activeWorkspacePackages"

foreach ($packageId in $activeWorkspacePackages) {
    $packageInfo = Get-PackageInformation -packageId $packageId

    # Process top-level files
    foreach ($file in $packageInfo.files) {
        $fileId = $file.fileId
        $fileName = $file.fileName
        $uploaded = $file.fileUploaded
        $uploadedDate = [datetime]::Parse($uploaded)
        # Check if the file was uploaded before the threshold date
        if ($uploadedDate -lt $thresholdDate) {
            # Add the file information to the collection
            $fileInfo = New-Object PSObject -Property @{
                PackageId = $packageId
                DirectoryId = $packageInfo.rootDirectoryId
                FileId = $fileId
                FileName = $fileName
                Uploaded = $uploaded
                Path = $currentPath
            }
            $oldFilesCollection.Add($fileInfo)
        }
    }

    # Iterate through each directory
    foreach ($directory in $packageInfo.directories) {
        Invoke-DirectoryProcessing -directory $directory -packageId $packageId
    }
}

Write-Host "Total count of Old Files: $($oldFilesCollection.Count)"

# Sort the collection by Uploaded date from youngest to oldest and print each record
$oldFilesCollection | Sort-Object {[datetime]::Parse($_.Uploaded)} -Descending | ForEach-Object {    
    # Check if liveRun
    if ($liveRun) {
        $requestPath = "api/v2.0/package/$($_.PackageId)/directory/$($_.DirectoryId)/file/$($_.FileId)/"
        $timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss") + "+0000"
        $body = ""

        $signature = New-Signature -apiSecret $apiSecret -apiKey $apiKey -portalUrl $portalUrl -requestPath $requestPath -timestamp $timestamp -body $body

        $headers = @{
            "ss-api-key" = $apiKey
            "ss-request-signature" = $signature
            "ss-request-timestamp" = $timestamp
            "content-type" = "application/json"
        }

        try {
            Invoke-RestMethod -Uri "$portalUrl$requestPath" -Method Delete -Headers $headers
            Write-Host "Deleted FileId: $($_.FileId) from PackageId: $($_.PackageId), DirectoryId: $($_.DirectoryId)"
        } catch {
            Write-Host "Failed to delete FileId: $($_.FileId) from PackageId: $($_.PackageId), DirectoryId: $($_.DirectoryId). Error: $_"
        }
    }
    else {
        Write-Host "This is a dry run. Otherwise we'd delete PackageId: $($_.PackageId), DirectoryId: $($_.DirectoryId), FileId: $($_.FileId), FileName: $($_.FileName), Uploaded: $($_.Uploaded), Path: $($_.Path)"
    }
}