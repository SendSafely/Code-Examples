@echo off
setlocal
pushd "%~dp0"

rem Zips the publish output as SendSafelyExportUtility_v<FileVersion>.zip (version read from the csproj).
rem Run build_export.bat first.

set "PUBLISH_DIR=bin\publish"
set "EXE=%PUBLISH_DIR%\SendSafelyExportUtility.exe"

if not exist "%EXE%" (
    echo ERROR: "%EXE%" not found. Run build_export.bat first.
    popd
    exit /b 1
)

for /f "usebackq delims=" %%v in (`powershell -NoProfile -Command "(Select-Xml -Path 'SendSafelyExportUtility.csproj' -XPath '//FileVersion').Node.InnerText"`) do set "VERSION=%%v"
if not defined VERSION (
    echo ERROR: could not read FileVersion from SendSafelyExportUtility.csproj
    popd
    exit /b 1
)

powershell -NoProfile -Command "$s = Get-AuthenticodeSignature '%EXE%'; if ($s.Status -ne 'Valid') { Write-Host 'WARNING: EXE is unsigned or signature is invalid.' }"

if not exist dist mkdir dist
set "ZIP=dist\SendSafelyExportUtility_v%VERSION%.zip"

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
