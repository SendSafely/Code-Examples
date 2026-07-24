@echo off
setlocal
pushd "%~dp0"

rem Builds the SendSafely CLI from the command line.
rem Usage:
rem   build_cli.bat          - framework-dependent build (small, requires .NET 8 runtime on the target machine)
rem   build_cli.bat single   - self-contained single-file EXE (large, no runtime install needed)

set "PUBLISH_DIR=SendSafelyCLI\bin\publish"
set "MODE=%~1"

if exist "%PUBLISH_DIR%" rmdir /s /q "%PUBLISH_DIR%"

if /i "%MODE%"=="single" (
    echo Building self-contained single-file EXE ^(win-x86^)...
    dotnet publish SendSafelyCLI\SendSafelyCLI.csproj -c Release -r win-x86 --self-contained true -p:PublishSingleFile=true -o "%PUBLISH_DIR%"
) else (
    echo Building framework-dependent EXE ^(target machine needs the .NET 8 runtime^)...
    dotnet publish SendSafelyCLI\SendSafelyCLI.csproj -c Release -o "%PUBLISH_DIR%"
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
