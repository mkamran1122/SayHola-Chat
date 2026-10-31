<#
.SYNOPSIS
    Complete End-to-End Android Release Build Automation Script for SayHola.
.DESCRIPTION
    Automates the full production workflow on Windows:
    1. Verifies prerequisites and release signing configuration
    2. Installs dependencies ('npm install')
    3. Compiles the Vite React web app ('npm run build')
    4. Syncs web assets and native plugins ('npx cap sync android')
    5. Executes Gradle 'assembleRelease' within the android/ directory
    6. Confirms the final APK output and validates the release signature
#>

[CmdletBinding()]
param(
    [switch]$SkipNpmInstall,
    [switch]$SkipVerify
)

$ErrorActionPreference = "Stop"
$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()

function Write-StepHeader {
    param([int]$StepNumber, [int]$TotalSteps, [string]$Title)
    Write-Host ""
    Write-Host "======================================================================" -ForegroundColor Cyan
    Write-Host " [$StepNumber/$TotalSteps] $Title" -ForegroundColor Cyan
    Write-Host "======================================================================" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-WarningMsg {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Failure {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$androidDir = Join-Path $projectRoot "android"
$keystoreProperties = Join-Path $androidDir "keystore.properties"
$keystoreFile = Join-Path $androidDir "sayhola-release.jks"
$apkOutputDir = Join-Path $androidDir "app\build\outputs\apk\release"
$expectedSignedApk = Join-Path $apkOutputDir "app-release.apk"
$unsignedApk = Join-Path $apkOutputDir "app-release-unsigned.apk"

$totalSteps = 5

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "        SayHola Android Complete Release Build Pipeline               " -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "Project Root : $projectRoot" -ForegroundColor Gray
Write-Host "Android Dir  : $androidDir" -ForegroundColor Gray
Write-Host "Start Time   : $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray

# -------------------------------------------------------------------------
# STEP 1: Verify Environment & Signing Configuration
# -------------------------------------------------------------------------
Write-StepHeader -StepNumber 1 -TotalSteps $totalSteps -Title "Checking Prerequisites & Keystore Configuration"

# Check Node.js and npm
try {
    $nodeVer = (node -v).Trim()
    $npmVer = (npm -v).Trim()
    Write-Host "Node.js Version: $nodeVer" -ForegroundColor Gray
    Write-Host "npm Version    : $npmVer" -ForegroundColor Gray
} catch {
    Write-Failure "Node.js or npm is not available in your PATH. Please install Node.js."
    exit 1
}

# Check Android directory
if (-not (Test-Path $androidDir)) {
    Write-Failure "Android directory was not found at '$androidDir'."
    exit 1
}

# Check keystore.properties
if (-not (Test-Path $keystoreProperties)) {
    Write-WarningMsg "'android/keystore.properties' was not found."
    Write-Host "A release keystore is required to generate a signed APK that installs on devices." -ForegroundColor Yellow
    Write-Host ""
    $createPrompt = Read-Host "Would you like to run the automated keystore generator now? (Y/n)"
    if ($createPrompt.Trim().ToLower() -ne "n") {
        $createScript = Join-Path $PSScriptRoot "create-keystore.ps1"
        if (Test-Path $createScript) {
            & $createScript
        } else {
            Write-Failure "Generator script not found at '$createScript'."
            exit 1
        }
        if (-not (Test-Path $keystoreProperties)) {
            Write-Failure "Keystore configuration was not generated. Aborting build."
            exit 1
        }
    } else {
        Write-WarningMsg "Continuing build without keystore.properties. The resulting APK will be unsigned."
    }
} else {
    Write-Host "Signing configuration: Found ($keystoreProperties)" -ForegroundColor Gray
    if (Test-Path $keystoreFile) {
        Write-Host "Keystore binary file : Found ($keystoreFile)" -ForegroundColor Gray
    }
}

Write-Success "Prerequisites verified."

# -------------------------------------------------------------------------
# STEP 2: Install Node Dependencies
# -------------------------------------------------------------------------
Write-StepHeader -StepNumber 2 -TotalSteps $totalSteps -Title "Installing Node Dependencies ('npm install')"

if ($SkipNpmInstall) {
    Write-Host "Skipping npm install as requested via -SkipNpmInstall parameter." -ForegroundColor Yellow
} else {
    Set-Location $projectRoot
    Write-Host "Running 'npm install' to ensure all packages are up to date..." -ForegroundColor Gray
    & npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Failure "npm install failed with exit code $LASTEXITCODE."
        exit $LASTEXITCODE
    }
    Write-Success "Node dependencies installed successfully."
}

# -------------------------------------------------------------------------
# STEP 3: Build Web Application
# -------------------------------------------------------------------------
Write-StepHeader -StepNumber 3 -TotalSteps $totalSteps -Title "Building Web Application ('npm run build')"

Set-Location $projectRoot
Write-Host "Compiling Vite React TypeScript production bundle..." -ForegroundColor Gray
& npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Failure "Web application build failed with exit code $LASTEXITCODE."
    exit $LASTEXITCODE
}

$distDir = Join-Path $projectRoot "dist"
$distIndex = Join-Path $distDir "index.html"
if (-not (Test-Path $distIndex)) {
    Write-Failure "Build artifact 'dist/index.html' was not created."
    exit 1
}

Write-Success "Web assets compiled into 'dist/' successfully."

# -------------------------------------------------------------------------
# STEP 4: Sync Capacitor Android
# -------------------------------------------------------------------------
Write-StepHeader -StepNumber 4 -TotalSteps $totalSteps -Title "Syncing Capacitor Android ('npx cap sync android')"

Set-Location $projectRoot
Write-Host "Copying web assets and updating Android native plugins..." -ForegroundColor Gray
& npx cap sync android
if ($LASTEXITCODE -ne 0) {
    Write-Failure "Capacitor sync failed with exit code $LASTEXITCODE."
    exit $LASTEXITCODE
}

$copiedAssetsIndex = Join-Path $androidDir "app\src\main\assets\public\index.html"
if (-not (Test-Path $copiedAssetsIndex)) {
    Write-Failure "Capacitor failed to copy web assets to '$copiedAssetsIndex'."
    exit 1
}

Write-Success "Capacitor Android sync completed successfully."

# -------------------------------------------------------------------------
# STEP 5: Run Gradle assembleRelease
# -------------------------------------------------------------------------
Write-StepHeader -StepNumber 5 -TotalSteps $totalSteps -Title "Compiling Release APK with Gradle ('gradlew assembleRelease')"

$origLocation = Get-Location
try {
    Set-Location $androidDir

    $gradlew = ".\gradlew.bat"
    if (-not (Test-Path $gradlew)) {
        $gradlew = "gradlew.bat"
    }

    Write-Host "Executing '$gradlew assembleRelease' in $(Get-Location)..." -ForegroundColor Gray
    & $gradlew assembleRelease

    if ($LASTEXITCODE -ne 0) {
        Write-Failure "Gradle assembleRelease failed with exit code $LASTEXITCODE."
        exit $LASTEXITCODE
    }
} finally {
    Set-Location $origLocation
}

# -------------------------------------------------------------------------
# POST-BUILD: Verification and Summary
# -------------------------------------------------------------------------
Write-Host ""
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "                      Build Output & Verification                     " -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

if (Test-Path $expectedSignedApk) {
    $apkItem = Get-Item $expectedSignedApk
    $apkSizeMb = [math]::Round($apkItem.Length / 1MB, 2)
    $stopwatch.Stop()
    $elapsed = "{0:mm}m {0:ss}s" -f $stopwatch.Elapsed

    Write-Host ""
    Write-Host "**********************************************************************" -ForegroundColor Green
    Write-Host "        SUCCESS! Signed Release APK Generated Successfully!           " -ForegroundColor Green
    Write-Host "**********************************************************************" -ForegroundColor Green
    Write-Host ""
    Write-Host "  APK Location : $($apkItem.FullName)" -ForegroundColor Cyan
    Write-Host "  File Size    : $apkSizeMb MB" -ForegroundColor Cyan
    Write-Host "  Build Time   : $elapsed" -ForegroundColor Cyan
    Write-Host ""

    if (-not $SkipVerify) {
        $verifyScript = Join-Path $PSScriptRoot "verify-apk.ps1"
        if (Test-Path $verifyScript) {
            Write-Host "Verifying signature on the new APK..." -ForegroundColor Gray
            & $verifyScript
        }
    }

    Write-Host ""
    Write-Host "Install to a connected phone using:" -ForegroundColor Yellow
    Write-Host "  adb install -r `"$($apkItem.FullName)`"" -ForegroundColor Gray
    Write-Host ""
    exit 0

} elseif (Test-Path $unsignedApk) {
    $uItem = Get-Item $unsignedApk
    $stopwatch.Stop()
    Write-WarningMsg "An UNSIGNED APK was created at: $($uItem.FullName)"
    Write-Host "Android devices will reject unsigned APKs. To sign it, run 'npm run android:keystore'." -ForegroundColor Yellow
    exit 0
} else {
    $stopwatch.Stop()
    Write-Failure "Expected APK was not found at '$expectedSignedApk'."
    exit 1
}
