param(
  [Parameter(Mandatory = $false)]
  [string]$AppUrl = "http://127.0.0.1:3000",

  [Parameter(Mandatory = $false)]
  [int]$TimeoutSec = 30,

  [Parameter(Mandatory = $false)]
  [int]$DryRun = 0
)

$ErrorActionPreference = "Stop"

function Ensure-Dir([string]$path) {
  if (-not (Test-Path -LiteralPath $path)) {
    New-Item -ItemType Directory -Path $path | Out-Null
  }
}

try {
  $here = Split-Path -Parent $MyInvocation.MyCommand.Path
  $logDir = Join-Path $here "logs"
  Ensure-Dir $logDir
  $logFile = Join-Path $logDir "cron-reminders.log"

  $secret = [string]$env:CRON_SECRET
  if ([string]::IsNullOrWhiteSpace($secret)) {
    $msg = "$(Get-Date -Format o) ERROR Missing env CRON_SECRET"
    Add-Content -LiteralPath $logFile -Value $msg
    exit 2
  }

  $url = "$AppUrl/api/cron/reminders"
  if ($DryRun -eq 1) {
    $url = "$url?dryRun=1"
  }

  $headers = @{
    "x-cron-secret" = $secret
  }

  $started = Get-Date
  $resp = Invoke-RestMethod -Method GET -Uri $url -Headers $headers -TimeoutSec $TimeoutSec
  $ms = [int]((Get-Date) - $started).TotalMilliseconds

  $line = "$(Get-Date -Format o) OK ${ms}ms url=$url emailsSent=$($resp.emailsSent) scannedTrips=$($resp.scannedTrips) dryRun=$($resp.dryRun)"
  Add-Content -LiteralPath $logFile -Value $line
  exit 0
} catch {
  try {
    $here = Split-Path -Parent $MyInvocation.MyCommand.Path
    $logDir = Join-Path $here "logs"
    Ensure-Dir $logDir
    $logFile = Join-Path $logDir "cron-reminders.log"
    $err = $_.Exception.Message
    $line = "$(Get-Date -Format o) ERROR $err"
    Add-Content -LiteralPath $logFile -Value $line
  } catch {
    # ignore logging errors
  }
  exit 1
}

