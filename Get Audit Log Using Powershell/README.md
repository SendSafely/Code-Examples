# GetAuditLog PowerShell Script

## Overview

This PowerShell script is designed to query the "GetAudit Log" endpoint of the SendSafely API. It allows users to retrieve audit log entries by specifying various optional parameters to filter the results. The script requires a SendSafely admin API key and secret, along with the portal URL, to authenticate and make requests to the SendSafely API.

## Prerequisites

- PowerShell 5.1 or higher.
- A valid SendSafely admin API key and secret.
- The portal URL for your SendSafely instance.

## Usage

To use the script, open PowerShell and navigate to the directory where the script is saved. Then, execute the script by providing the required parameters (`apiKey`, `apiSecret`, and `portalUrl`) and any optional parameters you wish to include.

### Basic Command Structure

```powershell
pwsh getauditlogpwsh.ps1 -apiKey "your-api-key" -apiSecret "your-api-secret" -portalUrl "https://yourcompany.sendsafely.com/"
```

### Including Optional Parameters

The script supports several optional parameters to filter the audit logs:

- `eventType`: Filter results to only include a specific event type. Can be PACKAGE_FILE_DOWNLOAD, FINALIZE_PACKAGE, WORKSPACE_UPLOAD, WORKSPACE_DOWNLOAD, ADMIN_EVENT, USER_EVENT. Leave blank to return all event types. 
- `ipAddress`: Filter results to only include entries originating from a specific IP address.
- `authenticatedUser`: Filter results to only include entries originating from a specific user (email address).
- `impersonatedUser`: Filter results to only include entries where this user is being impersonated by an admin (email address).
- `packageOwner`: Filter results to only include packages owned by this user (email address).
- `minTimestamp`: Filter results to only include entries after this date/time. Format can be yyyy-MM-dd HH:mm:ss or yyyy-MM-dd.
- `maxTimestamp`: Filter results to only include entries before this date/time. Format can be yyyy-MM-dd HH:mm:ss or yyyy-MM-dd.
- `pageSize`: Specify how many records you want returned in each page. Can be any number from 1 to 100. 
- `rowIndex`: Offset of the first record to be returned in this page. Leave blank for the first page, otherwise use the nextRowIndex value returned from the previous page. 

#### Example with Optional Parameters

```powershell
pwsh getauditlogpwsh.ps1 -apiKey "your-api-key" -apiSecret "your-api-secret" -portalUrl "https://yourcompany.sendsafely.com/" -minTimestamp "2024-06-01" -maxTimestamp "2024-06-30"
```

This example retrieves audit logs for package file downloads that occurred in June 2024, with up to 50 records returned per page.

## Notes

- The API key used to run this script must belong to a SendSafely admin in your portal
- Ensure your execution policy allows running scripts. You may need to adjust it using `Set-ExecutionPolicy`.
- The `minTimestamp` and `maxTimestamp` parameters should be formatted as `yyyy-MM-dd` or `yyyy-MM-dd HH:mm:ss`.
- The `pageSize` can be any number from 1 to 100.
- If using `rowIndex`, refer to the `nextRowIndex` value returned from the previous page to paginate through results.
- The audit log can only retrieve logs from the past 90 days.

## Troubleshooting

- **Execution Policy**: If you encounter errors related to script execution policies, try adjusting the policy by running `Set-ExecutionPolicy RemoteSigned` in an elevated PowerShell prompt.
- **Signature Errors**: Ensure that the API key, API secret, and portal URL are correctly specified. Signature errors typically indicate a mismatch in the constructed request signature.

For further assistance, consult the SendSafely API documentation or contact SendSafely support.