# SendSafely Package Export Utility

A Windows command-line utility for exporting items sent and received through your
SendSafely Enterprise portal. It downloads each package (files and secure message)
into a local archive folder, and can generate the user or enterprise key pairs the
export requires.

## Download

Get the latest build from the
[Releases page](https://github.com/SendSafely/Code-Examples/releases) — look for the
release tagged `export-utility-v<version>`.

The release zip contains a single `SendSafelyExportUtility.exe`, built self-contained:
no .NET installation is required. Extract and run it from a command prompt. (Builds
you produce yourself may differ — see Building from source below.)

> Older versions remain in the `bin/` folder for reference. New versions are
> published only as Releases.

## Usage

See the help center article:
[Secure Package Export Utility](https://support.sendsafely.com/hc/en-us/articles/360022844931-Secure-Package-Export-Utility)

## Building from source

Requires the [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0) (or newer).

```
build_export.bat            framework-dependent build (needs the .NET 10 runtime to run)
build_export.bat single     self-contained single-file exe (what the releases ship)
```

Output goes to `bin\publish\`. `package_export.bat` zips it as
`SendSafelyExportUtility_v<version>.zip` with the version taken from the csproj.

The project references the [SendSafely Windows Client API](https://github.com/SendSafely/Windows-Client-API)
(`SendsafelyAPI.dll`) via the copy vendored in `SendSafelyAPI/`.

## Support

Questions or issues: support@sendsafely.com
