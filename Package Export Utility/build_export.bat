@echo off
setlocal
pushd "%~dp0"

rem Builds the SendSafely Package Export Utility from the command line.
rem Usage:
rem   build_export.bat          - framework-dependent build (small, requires .NET 10 runtime on the target machine)
rem   build_export.bat single   - self-contained single-file EXE (large, no runtime install needed)

set "PUBLISH_DIR=bin\publish"
set "MODE=%~1"

if exist "%PUBLISH_DIR%" rmdir /s /q "%PUBLISH_DIR%"

if /i "%MODE%"=="single" (
    echo Building self-contained single-file EXE ^(win-x86^)...
    dotnet publish SendSafelyExportUtility.csproj -c Release -r win-x86 --self-contained true -p:PublishSingleFile=true -o "%PUBLISH_DIR%"
) else (
    echo Building framework-dependent EXE ^(target machine needs the .NET 10 runtime^)...
    dotnet publish SendSafelyExportUtility.csproj -c Release -o "%PUBLISH_DIR%"
)
if errorlevel 1 (
    echo.
    echo BUILD FAILED
    popd
    exit /b 1
)

echo.
echo Build output in %PUBLISH_DIR%:
dir /b "%PUBLISH_DIR%"
popd
endlocal
