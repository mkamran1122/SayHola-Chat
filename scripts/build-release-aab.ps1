<#
.SYNOPSIS
    Builds a signed Release Android App Bundle (.aab) for Google Play Console.
.DESCRIPTION
    Executes web build, Capacitor sync, and Gradle bundleRelease.
#>

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  SayHola - Automated Signed Release AAB (Google Play)    " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$androidDir = Join-Path $projectRoot "android"
$propertiesFile = Join-Path $androidDir "keystore.properties"

if (-not (Test-Path $propertiesFile)) {
    Write-Host "[WARNING] 'android/keystore.properties' was not found!" -ForegroundColor Yellow
    Write-Host "Please run 'npm run android:keystore' first to generate your signing key." -ForegroundColor Yellow
    exit 1
}

# 1. Build web application
Write-Host "Step 1/3: Building web application..." -ForegroundColor Cyan
Set-Location $projectRoot
npm run build
if ($LASTEXITCODE -ne 0) { exit 1 }

# 2. Capacitor Sync
Write-Host ""
Write-Host "Step 2/3: Syncing into Android project..." -ForegroundColor Cyan
npx cap sync android
if ($LASTEXITCODE -ne 0) { exit 1 }

# 3. Gradle bundleRelease
Write-Host ""
Write-Host "Step 3/3: Building Release Android App Bundle with Gradle..." -ForegroundColor Cyan
Set-Location $androidDir

$gradlew = ".\gradlew.bat"
if (-not (Test-Path $gradlew)) {
    $gradlew = "gradlew.bat"
}

& $gradlew bundleRelease
if ($LASTEXITCODE -ne 0) {
    Set-Location $projectRoot
    exit 1
}

Set-Location $projectRoot

$expectedAab = Join-Path $androidDir "app\build\outputs\bundle\release\app-release.aab"
if (Test-Path $expectedAab) {
    $aabItem = Get-Item $expectedAab
    $aabSizeMb = [math]::Round($aabItem.Length / 1MB, 2)

    Write-Host ""
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host "  SUCCESS! Signed Release AAB Created for Google Play!    " -ForegroundColor Green
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "AAB Location:  $($aabItem.FullName)" -ForegroundColor Cyan
    Write-Host "File Size:     $aabSizeMb MB" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "You can upload this .aab file directly to the Google Play Console." -ForegroundColor Green
} else {
    Write-Host "[ERROR] Bundle file not found at: $expectedAab" -ForegroundColor Red
    exit 1
}
