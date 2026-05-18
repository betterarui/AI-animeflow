$ErrorActionPreference = "Stop"

$scriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $scriptDir "..")).Path
$tunnelName = "animeflow"
$configPath = "C:\ProgramData\cloudflared\config.yml"
$cloudflared = "C:\ProgramData\cloudflared\cloudflared.exe"
$logDir = Join-Path $projectRoot ".tunnel"
$stdoutLog = Join-Path $logDir "cloudflared-named.out.log"
$stderrLog = Join-Path $logDir "cloudflared-named.err.log"
$watchdogLog = Join-Path $logDir "cloudflared-watchdog.log"
$stateFile = Join-Path $logDir "cloudflared-watchdog.state.json"
$restartCooldownSeconds = 120

if (-not (Test-Path -LiteralPath $logDir)) {
  New-Item -ItemType Directory -Force -Path $logDir | Out-Null
}

function Write-Log {
  param([string]$Message)
  Add-Content -LiteralPath $watchdogLog -Value ("{0} {1}" -f (Get-Date).ToString("s"), $Message)
}

function Get-TunnelProcesses {
  @(Get-CimInstance Win32_Process |
    Where-Object {
      $_.Name -eq "cloudflared.exe" -and
      $_.CommandLine -like "*--config*" -and
      $_.CommandLine -like "*$configPath*" -and
      $_.CommandLine -like "*tunnel run*" -and
      $_.CommandLine -like "*$tunnelName*"
    })
}

function Start-Tunnel {
  Start-Process `
    -FilePath $cloudflared `
    -ArgumentList @("--config", $configPath, "tunnel", "run", $tunnelName) `
    -WorkingDirectory $projectRoot `
    -RedirectStandardOutput $stdoutLog `
    -RedirectStandardError $stderrLog `
    -WindowStyle Hidden
  Write-Log "started tunnel process"
}

function Stop-TunnelProcesses {
  param([object[]]$Processes)

  foreach ($process in $Processes) {
    try {
      Stop-Process -Id $process.ProcessId -Force
      Write-Log "stopped tunnel process id=$($process.ProcessId)"
    } catch {
      Write-Log "failed to stop tunnel process id=$($process.ProcessId) message=$($_.Exception.Message)"
    }
  }
}

function Stop-ExtraTunnelProcesses {
  param([object[]]$Processes)

  if ($Processes.Count -le 1) {
    return
  }

  $ordered = @($Processes | Sort-Object CreationDate -Descending)
  $keep = $ordered[0]
  $extra = @($ordered | Select-Object -Skip 1)
  Write-Log "multiple tunnel processes detected keep=$($keep.ProcessId) stop=$(@($extra | ForEach-Object { $_.ProcessId }) -join ',')"
  Stop-TunnelProcesses -Processes $extra
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

function Test-TunnelHealthy {
  if (-not (Test-Path -LiteralPath $cloudflared)) {
    Write-Log "cloudflared binary not found"
    return $false
  }

  $tempOut = Join-Path $env:TEMP ("cloudflared-info-{0}.out" -f ([guid]::NewGuid().ToString("N")))
  $tempErr = Join-Path $env:TEMP ("cloudflared-info-{0}.err" -f ([guid]::NewGuid().ToString("N")))
  try {
    $process = Start-Process `
      -FilePath $cloudflared `
      -ArgumentList @("tunnel", "info", $tunnelName) `
      -WorkingDirectory $projectRoot `
      -RedirectStandardOutput $tempOut `
      -RedirectStandardError $tempErr `
      -PassThru `
      -WindowStyle Hidden

    if (-not $process.WaitForExit(15000)) {
      try {
        $process.Kill()
      } catch {
      }
      Write-Log "tunnel info timed out"
      return $false
    }

    $stdout = if (Test-Path -LiteralPath $tempOut) { Get-Content -LiteralPath $tempOut -Raw } else { "" }
    $stderr = if (Test-Path -LiteralPath $tempErr) { Get-Content -LiteralPath $tempErr -Raw } else { "" }
    $combined = "$stdout`n$stderr"

    if ($combined -match "No active connections") {
      Write-Log "tunnel info reports no active connections"
      return $false
    }

    if ($combined -match "CONNECTOR ID" -and $combined -match "EDGE" -and $combined -match "windows_amd64") {
      Write-Log "tunnel info shows active connector"
      return $true
    }

    Write-Log "tunnel info output not recognized exitcode=$($process.ExitCode) output=$($combined.Trim())"
    return $false
  } finally {
    Remove-Item -LiteralPath $tempOut, $tempErr -Force -ErrorAction SilentlyContinue
  }
}

$processes = Get-TunnelProcesses
$healthy = Test-TunnelHealthy

if ($healthy) {
  Stop-ExtraTunnelProcesses -Processes $processes
  Write-Log "tunnel is healthy"
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

if ($processes.Count) {
  Stop-TunnelProcesses -Processes $processes
  Start-Sleep -Seconds 2
}

Start-Tunnel
Set-LastRestartAt
