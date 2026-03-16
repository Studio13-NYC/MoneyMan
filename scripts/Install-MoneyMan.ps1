#Requires -RunAsAdministrator
<#
.SYNOPSIS
  Installs MoneyMan into C:\Program Files\MoneyMan.
.DESCRIPTION
  Copies the built app (portable exe or latest dist-build-* folder) to Program Files,
  and optionally creates a Start Menu shortcut.
.PARAMETER SourcePath
  Path to the folder containing MoneyMan 1.0.0.exe (e.g. dist-build-1734567890123).
  If omitted, uses the latest dist-build-* folder in the script's project root.
.PARAMETER SkipShortcut
  If set, does not create a Start Menu shortcut.
.EXAMPLE
  .\Install-MoneyMan.ps1
  .\Install-MoneyMan.ps1 -SourcePath "D:\Studio13\Lab\Code\MoneyMan\dist-build-1734567890123"
#>
[CmdletBinding()]
param(
  [Parameter(Position = 0)]
  [string] $SourcePath,

  [switch] $SkipShortcut
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$InstallDir = "${env:ProgramFiles}\MoneyMan"
$ExeName = "MoneyMan 1.0.0.exe"
$ShortcutName = "MoneyMan.lnk"

# Resolve source folder: prefer dist-build, else latest dist-build-*
if (-not $SourcePath) {
  $simpleBuild = Join-Path $ProjectRoot "dist-build"
  $buildFolders = Get-ChildItem -Path $ProjectRoot -Directory -Filter "dist-build-*" -ErrorAction SilentlyContinue
  if (Test-Path -LiteralPath $simpleBuild) {
    $SourcePath = $simpleBuild
  } elseif ($buildFolders) {
    $SourcePath = ($buildFolders | Sort-Object Name -Descending | Select-Object -First 1).FullName
  } else {
    Write-Error "No dist-build or dist-build-* folder found in $ProjectRoot. Run 'npm run build' first."
  }
  Write-Host "Using build: $SourcePath"
}

# Prefer portable exe at root; else use win-unpacked folder (full app)
$portableExe = Join-Path $SourcePath $ExeName
$winUnpackedDir = Join-Path $SourcePath "win-unpacked"
$winUnpackedExe = Join-Path $winUnpackedDir "MoneyMan.exe"

$usePortable = Test-Path -LiteralPath $portableExe
$useWinUnpacked = (-not $usePortable) -and (Test-Path -LiteralPath $winUnpackedExe)

if (-not $usePortable -and -not $useWinUnpacked) {
  Write-Error "No valid build found in $SourcePath. Expected either '$ExeName' or 'win-unpacked\MoneyMan.exe'. The build may be incomplete - run 'npm run build' and wait for it to finish."
}

Write-Host "Installing to $InstallDir ..."
New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null

if ($usePortable) {
  Copy-Item -LiteralPath $portableExe -Destination (Join-Path $InstallDir "MoneyMan.exe") -Force
  Write-Host "Copied portable MoneyMan.exe"
} else {
  Copy-Item -Path (Join-Path $winUnpackedDir "*") -Destination $InstallDir -Recurse -Force
  Write-Host "Copied win-unpacked app (MoneyMan.exe + resources)"
}

# Copy .env so keys work: install dir and userData (portable exe runs from temp and only sees userData)
$envInSource = Join-Path $SourcePath ".env"
$envInProject = Join-Path $ProjectRoot ".env"
$envDest = Join-Path $InstallDir ".env"
$userDataDir = Join-Path $env:APPDATA "MoneyMan"
$envDestUserData = Join-Path $userDataDir ".env"
$envSource = $null
if (Test-Path -LiteralPath $envInSource) { $envSource = $envInSource }
elseif (Test-Path -LiteralPath $envInProject) { $envSource = $envInProject }
if ($envSource) {
  Copy-Item -LiteralPath $envSource -Destination $envDest -Force
  New-Item -ItemType Directory -Path $userDataDir -Force | Out-Null
  Copy-Item -LiteralPath $envSource -Destination $envDestUserData -Force
  Write-Host "Copied .env to install dir and to $userDataDir (for portable exe)"
} else {
  Write-Host "No .env found. Add one to $InstallDir or $userDataDir for API keys."
}

# Start Menu shortcut
if (-not $SkipShortcut) {
  $WshShell = New-Object -ComObject WScript.Shell
  $StartMenuDir = [Environment]::GetFolderPath('CommonStartMenu')
  $ProgramsDir = Join-Path $StartMenuDir "Programs"
  $shortcutPath = Join-Path $ProgramsDir $ShortcutName
  $shortcut = $WshShell.CreateShortcut($shortcutPath)
  $shortcut.TargetPath = Join-Path $InstallDir "MoneyMan.exe"
  $shortcut.WorkingDirectory = $InstallDir
  $shortcut.Description = "OpenAI & Cursor spend this month"
  $shortcut.Save()
  [System.Runtime.Interopservices.Marshal]::ReleaseComObject($WshShell) | Out-Null
  Write-Host "Start Menu shortcut created: $shortcutPath"
}

Write-Host ""
Write-Host "MoneyMan is installed at: $InstallDir"
Write-Host "Run: $InstallDir\MoneyMan.exe"
if (-not $SkipShortcut) { Write-Host "Or start from the Start Menu (search 'MoneyMan')." }
