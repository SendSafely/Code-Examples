# SendSafely Windows CLI

A command-line client for SendSafely on Windows. It supports connecting with your
API key, creating packages, adding files and recipients, generating secure links,
and downloading packages.

## Download

Get the latest build from the
[Releases page](https://github.com/SendSafely/Code-Examples/releases) — look for the
release tagged `windows-cli-v<version>`.

The release zip contains a single `SendSafely CLI.exe`, built self-contained: no
.NET installation is required. Extract and run it from a command prompt. (Builds
you produce yourself may differ — see Building from source below.)

> Older versions remain in the `dist/` folder for reference. New versions are
> published only as Releases.

## Usage

See the help center article:
[SendSafely Windows CLI](https://support.sendsafely.com/hc/en-us/articles/215184466-SendSafely-Windows-CLI)

## Building from source

Requires the [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0) (or newer).

```
build_cli.bat            framework-dependent build (needs the .NET 8 runtime to run)
build_cli.bat single     self-contained single-file exe (what the releases ship)
```

Output goes to `SendSafelyCLI\bin\publish\`. `package_cli.bat` zips it as
`SendSafely_Windows_CLI_v<version>.zip` with the version taken from the csproj.

The project references the [SendSafely Windows Client API](https://github.com/SendSafely/Windows-Client-API)
(`SendsafelyAPI.dll`) via the copy vendored in `SendSafelyCLI/SendSafelyAPI/`.

## Support

Questions or issues: support@sendsafely.com
