# Enforce Workspace Expiration Script

## Overview

This PowerShell script is designed to interact with the SendSafely API to identify and optionally delete files within Workspaces that are older than a specified age. It is particularly useful for maintaining compliance and managing data retention policies within your SendSafely portal.

## Features

- **Identify Old Files**: The script can scan all active Workspace packages within your SendSafely portal and list files that exceed a certain age (default is 90 days).
- **Selective Deletion**: You have the option to delete these identified files automatically or perform a dry run to see which files would be deleted without actually removing them.
- **Target Specific Workspaces**: While the script by default scans all Workspaces, it can also target a specific Workspace or Workspaces by providing their package ID(s).

## Prerequisites

- PowerShell 5.1 or higher.
- A valid SendSafely admin API Key and Secret.
- Your SendSafely portal URL.

## Parameters

- `apiKey` (required): Your SendSafely admin API Key.
- `apiSecret` (required): Your SendSafely API Secret.
- `portalUrl` (required): The base URL of your SendSafely portal, formatted as `https://yourcompany.sendsafely.com/`.
- `maxWorkspaceFileAge` (optional): The maximum age (in days) of files to retain within Workspaces. Defaults to 90 days.
- `liveRun` (optional): A switch parameter. If set to $false, the script will only list files that would be deleted without actually removing them.
- `specificPackageIds` (optional): A comma-separated list of specific Workspace package IDs to target. If left empty, the script targets all Workspaces.

## How to Use

1. **Prepare the Script**: Save the script to a file with a `.ps1` extension, for example, `EnforceWorkspaceExpiration.ps1`.

2. **Execute the Script**: Open PowerShell and navigate to the directory containing the script. Execute the script with the required parameters. For example:

    ```powershell
    .\EnforceWorkspaceExpiration.ps1 -apiKey "your_api_key" -apiSecret "your_api_secret" -portalUrl "https://yourcompany.sendsafely.com/"
    ```

    To modify the maximum age of Workspace files:

    ```powershell
    .\EnforceWorkspaceExpiration.ps1 -apiKey "your_api_key" -apiSecret "your_api_secret" -portalUrl "https://yourcompany.sendsafely.com/" -maxWorkspaceFileAge 15 -liveRun $true
    ```

    To perform a dry run and see which files would be deleted:

    ```powershell
    .\EnforceWorkspaceExpiration.ps1 -apiKey "your_api_key" -apiSecret "your_api_secret" -portalUrl "https://yourcompany.sendsafely.com/"
    ```

    To target a specific Workspace:

    ```powershell
    .\EnforceWorkspaceExpiration.ps1 -apiKey "your_api_key" -apiSecret "your_api_secret" -portalUrl "https://yourcompany.sendsafely.com/" -liveRun $true -specificPackageIds "packageId1"
    ```

    To target specific Workspaces:

    ```powershell
    .\EnforceWorkspaceExpiration.ps1 -apiKey "your_api_key" -apiSecret "your_api_secret" -portalUrl "https://yourcompany.sendsafely.com/" -liveRun $true -specificPackageIds "packageId1,packageId2"
    ```

## Notes

- Ensure that you're using an admin API key and secret.
- Set the `liveRun` parameter to false to testing the script's output before performing any deletions.

## Conclusion

This script is a powerful tool for managing file retention within SendSafely Workspaces. By automating the process of identifying and deleting old files, it helps maintain a clean and compliant data storage environment.