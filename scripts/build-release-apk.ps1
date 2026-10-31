<#
.SYNOPSIS
    Builds a fully signed Release APK for SayHola Android App on Windows.
.DESCRIPTION
    1. Verifies release keystore and keystore.properties
    2. Runs 'npm run build' to produce fresh web assets
    3. Runs 'npx cap sync android' to update Android assets and native plugins
    4. Executes Gradle assembleRelease with signing configuration
    5. Confirms output APK and verifies signature
#>

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  SayHola - Automated Signed Release APK Builder          " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$androidDir = Join-Path $projectRoot "android"
$propertiesFile = Join-Path $androidDir "keystore.properties"
$keystoreFile = Join-Path $androidDir "sayhola-release.jks"

# 1. Check for keystore and keystore.properties
if (-not (Test-Path $propertiesFile)) {
    Write-Host "[WARNING] 'android/keystore.properties' was not found!" -ForegroundColor Yellow
    Write-Host "Would you like to generate a new release keystore now? (Y/n)" -ForegroundColor Cyan
    $answer = Read-Host
    if ($answer.Trim().ToLower() -ne "n") {
        & (Join-Path $PSScriptRoot "create-keystore.ps1")
        if (-not (Test-Path $propertiesFile)) {
            Write-Host "[ERROR] Keystore was not created. Cannot build signed release APK." -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "Please create 'android/keystore.properties' (see keystore.properties.example) before building." -ForegroundColor Red
        exit 1
    }
}

# 2. Build web assets
Write-Host "Step 1/4: Building web application (Vite React TypeScript)..." -ForegroundColor Cyan
Set-Location $projectRoot
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Web application build failed!" -ForegroundColor Red
    exit 1
}

# 3. Capacitor Sync
Write-Host ""
Write-Host "Step 2/4: Syncing web assets and native plugins into Android project..." -ForegroundColor Cyan
npx cap sync android
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Capacitor sync failed!" -ForegroundColor Red
    exit 1
}

# 4. Run Gradle assembleRelease
Write-Host ""
Write-Host "Step 3/4: Compiling signed Android Release APK with Gradle..." -ForegroundColor Cyan
Set-Location $androidDir

$gradlew = ".\gradlew.bat"
if (-not (Test-Path $gradlew)) {
    $gradlew = "gradlew.bat"
}

& $gradlew assembleRelease
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Gradle assembleRelease failed!" -ForegroundColor Red
    Set-Location $projectRoot
    exit 1
}

Set-Location $projectRoot

# 5. Check Output APK
$expectedApk = Join-Path $androidDir "app\build\outputs\apk\release\app-release.apk"
if (-not (Test-Path $expectedApk)) {
    # Check if named app-release-unsigned.apk
    $unsignedApk = Join-Path $androidDir "app\build\outputs\apk\release\app-release-unsigned.apk"
    if (Test-Path $unsignedApk) {
        Write-Host "[ERROR] An unsigned APK was produced ($unsignedApk)." -ForegroundColor Red
        Write-Host "Please ensure your keystore path and passwords in android/keystore.properties are valid." -ForegroundColor Yellow
        exit 1
    }
    Write-Host "[ERROR] Release APK was not found at expected location: $expectedApk" -ForegroundColor Red
    exit 1
}

$apkItem = Get-Item $expectedApk
$apkSizeMb = [math]::Round($apkItem.Length / 1MB, 2)

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  SUCCESS! Signed Release APK Built Successfully!         " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host ""
Write-Host "APK Location:  $($apkItem.FullName)" -ForegroundColor Cyan
Write-Host "File Size:     $apkSizeMb MB" -ForegroundColor Cyan
Write-Host ""

# 6. Verify signature
Write-Host "Step 4/4: Verifying APK signature..." -ForegroundColor Cyan
& (Join-Path $PSScriptRoot "verify-apk.ps1")
