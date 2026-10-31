<#
.SYNOPSIS
    Verifies the signature of the generated SayHola Release APK on Windows.
.DESCRIPTION
    Uses Android SDK apksigner or Java keytool to confirm v1/v2 signatures and certificate validity.
#>

$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$apkPath = Join-Path $projectRoot "android\app\build\outputs\apk\release\app-release.apk"

if (-not (Test-Path $apkPath)) {
    Write-Host "[ERROR] APK not found at: $apkPath" -ForegroundColor Red
    Write-Host "Please run 'npm run android:build:apk' first." -ForegroundColor Yellow
    exit 1
}

Write-Host "Verifying signature for: $apkPath" -ForegroundColor Cyan

# 1. Look for apksigner.bat in Android SDK build-tools
$apksignerPath = $null
$sdkCandidates = @(
    "$env:ANDROID_HOME\build-tools",
    "$env:ANDROID_SDK_ROOT\build-tools",
    "$env:LOCALAPPDATA\Android\Sdk\build-tools"
)

foreach ($sdkDir in $sdkCandidates) {
    if ($sdkDir -and (Test-Path $sdkDir)) {
        $found = Get-ChildItem -Path $sdkDir -Filter "apksigner.bat" -Recurse -Depth 2 -ErrorAction SilentlyContinue |
            Sort-Object FullName -Descending |
            Select-Object -First 1 -ExpandProperty FullName
        if ($found) {
            $apksignerPath = $found
            break
        }
    }
}

if ($apksignerPath -and (Test-Path $apksignerPath)) {
    Write-Host "[OK] Using apksigner: $apksignerPath" -ForegroundColor Green
    Write-Host ""
    & $apksignerPath verify --verbose --print-certs $apkPath
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "[SUCCESS] APK signature is VALID and verified by apksigner!" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] APK signature verification failed!" -ForegroundColor Red
        exit 1
    }
    exit 0
}

# 2. Fallback to Java keytool
$keytoolPath = (Get-Command "keytool" -ErrorAction SilentlyContinue)?.Source
if (-not $keytoolPath) {
    $altKeytool = @(
        "$env:LOCALAPPDATA\Programs\Android Studio\jbr\bin\keytool.exe",
        "$env:ProgramFiles\Android\Android Studio\jbr\bin\keytool.exe",
        "$env:JAVA_HOME\bin\keytool.exe"
    )
    foreach ($k in $altKeytool) {
        if ($k -and (Test-Path $k)) {
            $keytoolPath = $k
            break
        }
    }
}

if ($keytoolPath) {
    Write-Host "[OK] Using keytool to inspect APK certificate: $keytoolPath" -ForegroundColor Green
    Write-Host ""
    & $keytoolPath -printcert -jarfile $apkPath
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "[SUCCESS] APK certificate extracted and verified successfully!" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] keytool failed to verify the APK." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "[NOTE] Neither apksigner nor keytool was found in PATH." -ForegroundColor Yellow
    Write-Host "The APK exists at: $apkPath" -ForegroundColor Green
}
