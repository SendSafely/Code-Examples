@echo off
setlocal
pushd "%~dp0"

rem Zips the publish output as SendSafely_Windows_CLI_v<FileVersion>.zip (version read from the csproj).
rem Run build_cli.bat and sign_cli.bat first.

set "PUBLISH_DIR=SendSafelyCLI\bin\publish"
set "EXE=%PUBLISH_DIR%\SendSafely CLI.exe"

if not exist "%EXE%" (
    echo ERROR: "%EXE%" not found. Run build_cli.bat first.
    popd
    exit /b 1
)

for /f "usebackq delims=" %%v in (`powershell -NoProfile -Command "(Select-Xml -Path 'SendSafelyCLI\SendSafelyCLI.csproj' -XPath '//FileVersion').Node.InnerText"`) do set "VERSION=%%v"
if not defined VERSION (
    echo ERROR: could not read FileVersion from SendSafelyCLI.csproj
    popd
    exit /b 1
)

powershell -NoProfile -Command "$s = Get-AuthenticodeSignature '%EXE%'; if ($s.Status -ne 'Valid') { Write-Host 'WARNING: EXE is unsigned or signature is invalid. Run sign_cli.bat before packaging a release.' }"

if not exist dist mkdir dist
set "ZIP=dist\SendSafely_Windows_CLI_v%VERSION%.zip"

powershell -NoProfile -Command "$f = Get-ChildItem '%PUBLISH_DIR%' -File | Where-Object { $_.Extension -ne '.pdb' }; Compress-Archive -Path $f.FullName -DestinationPath '%ZIP%' -Force"
if errorlevel 1 (
    echo PACKAGING FAILED
    popd
    exit /b 1
)

echo.
echo Created %ZIP%:
powershell -NoProfile -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; $z = [IO.Compression.ZipFile]::OpenRead((Resolve-Path '%ZIP%').Path); $z.Entries | ForEach-Object { $_.FullName }; $z.Dispose()"
popd
endlocal
