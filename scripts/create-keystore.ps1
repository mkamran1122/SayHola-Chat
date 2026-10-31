<#
.SYNOPSIS
    Automated generation of release signing keystore for SayHola Android App.
.DESCRIPTION
    Safely creates a 2048-bit RSA production keystore using Java keytool, prompts for
    passwords securely, and generates android/keystore.properties automatically.
#>

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  SayHola - Automated Android Release Keystore Generator  " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$androidDir = Join-Path $projectRoot "android"
$keystoreFile = Join-Path $androidDir "sayhola-release.jks"
$propertiesFile = Join-Path $androidDir "keystore.properties"

# 1. Guard against accidental keystore overwrite
if (Test-Path $keystoreFile) {
    Write-Host "[WARNING] An existing release keystore was detected at:" -ForegroundColor Yellow
    Write-Host "  $keystoreFile" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "CRITICAL: If you have already published an APK or update signed with this key," -ForegroundColor Red
    Write-Host "overwriting it will make it IMPOSSIBLE to update existing installs on users' devices" -ForegroundColor Red
    Write-Host "or update your app on Google Play!" -ForegroundColor Red
    Write-Host ""
    $confirmation = Read-Host "Are you ABSOLUTELY sure you want to overwrite it? Type 'YES' to proceed"
    if ($confirmation -ne "YES") {
        Write-Host "Aborted without changes. Existing keystore preserved." -ForegroundColor Green
        exit 0
    }
}

# 2. Locate keytool.exe
$keytoolPath = $null

# Check PATH first
$cmd = Get-Command "keytool" -ErrorAction SilentlyContinue
if ($cmd) {
    $keytoolPath = $cmd.Source
}

# Check common Android Studio & Java locations on Windows
if (-not $keytoolPath) {
    $candidatePaths = @(
        "$env:LOCALAPPDATA\Programs\Android Studio\jbr\bin\keytool.exe",
        "$env:ProgramFiles\Android\Android Studio\jbr\bin\keytool.exe",
        "$env:ProgramFiles\Android\Android Studio\jre\bin\keytool.exe",
        "$env:ProgramFiles(x86)\Android\Android Studio\jre\bin\keytool.exe"
    )

    if ($env:JAVA_HOME) {
        $candidatePaths += "$env:JAVA_HOME\bin\keytool.exe"
    }

    # Search Program Files\Java
    if (Test-Path "C:\Program Files\Java") {
        $javaJdks = Get-ChildItem -Path "C:\Program Files\Java" -Filter "keytool.exe" -Recurse -Depth 3 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName
        if ($javaJdks) { $candidatePaths += $javaJdks }
    }

    # Search Eclipse Adoptium / Temurin
    if (Test-Path "C:\Program Files\Eclipse Adoptium") {
        $adoptJdks = Get-ChildItem -Path "C:\Program Files\Eclipse Adoptium" -Filter "keytool.exe" -Recurse -Depth 3 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName
        if ($adoptJdks) { $candidatePaths += $adoptJdks }
    }

    foreach ($p in $candidatePaths) {
        if ($p -and (Test-Path $p)) {
            $keytoolPath = $p
            break
        }
    }
}

if (-not $keytoolPath) {
    Write-Host "[ERROR] Could not locate keytool.exe on this computer." -ForegroundColor Red
    Write-Host "Please ensure Android Studio or a Java Development Kit (JDK 17+) is installed." -ForegroundColor Yellow
    Write-Host "If Android Studio is installed, keytool is usually at:" -ForegroundColor Yellow
    Write-Host "  C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -ForegroundColor Gray
    Write-Host "You can add that path to your Windows PATH or set JAVA_HOME." -ForegroundColor Gray
    exit 1
}

Write-Host "[OK] Using keytool at: $keytoolPath" -ForegroundColor Green
Write-Host ""

# 3. Securely prompt for password
Write-Host "Choose a password for your new release keystore (minimum 6 characters)." -ForegroundColor Cyan
Write-Host "(Input will be masked for security)" -ForegroundColor Gray

$plainStorePass = ""
while ($true) {
    $secPass1 = Read-Host -AsSecureString "Enter Keystore Password"
    $bstr1 = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secPass1)
    $pass1 = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr1)
    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr1)

    if ([string]::IsNullOrWhiteSpace($pass1) -or $pass1.Length -lt 6) {
        Write-Host "Password must be at least 6 characters. Please try again." -ForegroundColor Yellow
        continue
    }

    $secPass2 = Read-Host -AsSecureString "Confirm Keystore Password"
    $bstr2 = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secPass2)
    $pass2 = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr2)
    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr2)

    if ($pass1 -ne $pass2) {
        Write-Host "Passwords do not match. Please try again." -ForegroundColor Red
        continue
    }

    $plainStorePass = $pass1
    break
}

# Prompt for key password (recommend identical)
Write-Host ""
$sameKeyPass = Read-Host "Use the same password for key alias 'sayhola'? (Y/n, default: Y)"
$plainKeyPass = $plainStorePass

if ($sameKeyPass.Trim().ToLower() -eq "n") {
    while ($true) {
        $secKey1 = Read-Host -AsSecureString "Enter Key Alias Password (min 6 characters)"
        $bstrK1 = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secKey1)
        $kPass1 = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstrK1)
        [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstrK1)

        if ([string]::IsNullOrWhiteSpace($kPass1) -or $kPass1.Length -lt 6) {
            Write-Host "Key password must be at least 6 characters." -ForegroundColor Yellow
            continue
        }

        $secKey2 = Read-Host -AsSecureString "Confirm Key Alias Password"
        $bstrK2 = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secKey2)
        $kPass2 = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstrK2)
        [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstrK2)

        if ($kPass1 -ne $kPass2) {
            Write-Host "Key passwords do not match. Please try again." -ForegroundColor Red
            continue
        }

        $plainKeyPass = $kPass1
        break
    }
}

# 4. Generate the keystore
Write-Host ""
Write-Host "Generating 2048-bit RSA keystore (valid for 10,000 days)..." -ForegroundColor Cyan

$aliasName = "sayhola"
$dname = "CN=SayHola, OU=Mobile, O=MK Labs, L=Default, ST=Default, C=US"

$keytoolArgs = @(
    "-genkeypair",
    "-v",
    "-keystore", $keystoreFile,
    "-alias", $aliasName,
    "-keyalg", "RSA",
    "-keysize", "2048",
    "-validity", "10000",
    "-storepass", $plainStorePass,
    "-keypass", $plainKeyPass,
    "-dname", $dname
)

& $keytoolPath $keytoolArgs

if ($LASTEXITCODE -ne 0 -or -not (Test-Path $keystoreFile)) {
    Write-Host "[ERROR] Failed to generate keystore." -ForegroundColor Red
    exit 1
}

# 5. Write android/keystore.properties
$propertiesContent = @"
# SayHola Android Release Signing Properties
# Generated automatically on $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
# DO NOT COMMIT THIS FILE TO VERSION CONTROL
storeFile=sayhola-release.jks
storePassword=$plainStorePass
keyAlias=$aliasName
keyPassword=$plainKeyPass
"@

[System.IO.File]::WriteAllText($propertiesFile, $propertiesContent, [System.Text.Encoding]::UTF8)

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  SUCCESS! Release Keystore and Configuration Generated!  " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Keystore file:       $keystoreFile" -ForegroundColor Cyan
Write-Host "Properties file:     $propertiesFile" -ForegroundColor Cyan
Write-Host "Key alias:           $aliasName" -ForegroundColor Cyan
Write-Host ""
Write-Host "CRITICAL BACKUP ADVICE:" -ForegroundColor Yellow
Write-Host "1. Store a copy of 'sayhola-release.jks' and your password in a safe backup" -ForegroundColor Yellow
Write-Host "   (e.g., your password manager or secure external drive)." -ForegroundColor Yellow
Write-Host "2. Never delete this keystore. You must reuse this exact keystore for all future updates." -ForegroundColor Yellow
Write-Host ""
Write-Host "Next step: Run 'npm run android:build:apk' to build your signed Release APK." -ForegroundColor Green
