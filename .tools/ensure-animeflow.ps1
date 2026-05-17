$ErrorActionPreference = "Stop"

$scriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $scriptDir "..")).Path
$hostName = "127.0.0.1"
$port = 3000
$storageDir = Join-Path $projectRoot "storage"
$stdoutLog = Join-Path $storageDir "server.log"
$stderrLog = Join-Path $storageDir "server.err.log"
$watchdogLog = Join-Path $storageDir "server-watchdog.log"
$stateFile = Join-Path $storageDir "server-watchdog.state.json"
$restartCooldownSeconds = 90
$healthUrl = "http://127.0.0.1:3000"

if (-not (Test-Path -LiteralPath $storageDir)) {
  New-Item -ItemType Directory -Force -Path $storageDir | Out-Null
}

function Write-Log {
  param([string]$Message)
  Add-Content -LiteralPath $watchdogLog -Value ("{0} {1}" -f (Get-Date).ToString("s"), $Message)
}

function Get-AppProcesses {
  @(Get-CimInstance Win32_Process |
    Where-Object {
      $_.Name -eq "node.exe" -and
      $_.CommandLine -like "*next start*" -and
      $_.CommandLine -like "*-H $hostName*" -and
      $_.CommandLine -like "*-p $port*"
    })
}

function Test-AppHealthy {
  try {
    $response = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 10
    return $response.StatusCode -ge 200 -and $response.StatusCode -lt 300
  } catch {
    return $false
  }
}

function Stop-AppProcesses {
  param([object[]]$Processes)

  foreach ($process in $Processes) {
    try {
      Stop-Process -Id $process.ProcessId -Force
      Write-Log "stopped app process id=$($process.ProcessId)"
    } catch {
      Write-Log "failed to stop app process id=$($process.ProcessId) message=$($_.Exception.Message)"
    }
  }
}

function Get-LastRestartAt {
  if (-not (Test-Path -LiteralPath $stateFile)) {
    return $null
  }

  try {
    $state = Get-Content -LiteralPath $stateFile -Raw | ConvertFrom-Json
    if ($state.LastRestart) {
      return [DateTime]::Parse($state.LastRestart)
    }
  } catch {
    Write-Log "failed to read restart state message=$($_.Exception.Message)"
  }

  return $null
}

function Set-LastRestartAt {
  @{ LastRestart = (Get-Date).ToString("o") } | ConvertTo-Json | Set-Content -LiteralPath $stateFile -Encoding UTF8
}

function Start-App {
  $npm = (Get-Command "npm.cmd" -ErrorAction Stop).Source
  Start-Process `
    -FilePath $npm `
    -ArgumentList @("run", "start", "--", "-H", $hostName, "-p", "$port") `
    -WorkingDirectory $projectRoot `
    -RedirectStandardOutput $stdoutLog `
    -RedirectStandardError $stderrLog `
    -WindowStyle Hidden
  Write-Log "started app process"
}

$listener = Get-NetTCPConnection -LocalAddress $hostName -LocalPort $port -State Listen -ErrorAction SilentlyContinue
$healthy = $false
if ($listener) {
  $healthy = Test-AppHealthy
}

if ($healthy) {
  exit 0
}

$lastRestart = Get-LastRestartAt
if ($lastRestart) {
  $age = (New-TimeSpan -Start $lastRestart -End (Get-Date)).TotalSeconds
  if ($age -lt $restartCooldownSeconds) {
    Write-Log "restart cooldown active age=$([int]$age)s"
    exit 0
  }
}

$processes = Get-AppProcesses
if ($processes.Count) {
  Stop-AppProcesses -Processes $processes
  Start-Sleep -Seconds 2
}

Start-App
Set-LastRestartAt
