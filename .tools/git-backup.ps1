$ErrorActionPreference = "Stop"

$scriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $scriptDir "..")).Path
$logDir = Join-Path $projectRoot "storage"
$logPath = Join-Path $logDir "git-backup.log"

if (-not (Test-Path -LiteralPath $logDir)) {
  New-Item -ItemType Directory -Force -Path $logDir | Out-Null
}

function Write-Log {
  param([string]$Message)
  Add-Content -LiteralPath $logPath -Value ("{0} {1}" -f (Get-Date).ToString("s"), $Message)
}

function Invoke-Git {
  param([string[]]$Arguments)
  & git -C $projectRoot @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "git $($Arguments -join ' ') failed with exit code $LASTEXITCODE"
  }
}

try {
  $gitDir = Join-Path $projectRoot ".git"
  if (-not (Test-Path -LiteralPath $gitDir)) {
    throw "Git repository is not initialized"
  }

  $origin = (& git -C $projectRoot remote get-url origin 2>$null)
  if ($LASTEXITCODE -ne 0 -or -not $origin) {
    throw "Remote 'origin' is not configured"
  }

  & git -C $projectRoot ls-files --error-unmatch .env *> $null
  if ($LASTEXITCODE -eq 0) {
    throw ".env is tracked; refusing to continue"
  }

  $status = (& git -C $projectRoot status --porcelain)
  if (-not $status) {
    Write-Log "nothing to commit"
    exit 0
  }

  Invoke-Git @("add", "-A")

  $staged = (& git -C $projectRoot diff --cached --name-only)
  if (-not $staged) {
    Write-Log "no staged changes after git add"
    exit 0
  }

  $message = "chore: automated backup {0}" -f (Get-Date).ToString("yyyy-MM-dd HH:mm")
  Invoke-Git @("commit", "-m", $message)

  $branch = (& git -C $projectRoot branch --show-current).Trim()
  if (-not $branch) {
    throw "Unable to determine current branch"
  }

  Invoke-Git @("push", "origin", $branch)
  Write-Log "pushed branch=$branch remote=$origin"
} catch {
  Write-Log "failed: $($_.Exception.Message)"
  throw
}
