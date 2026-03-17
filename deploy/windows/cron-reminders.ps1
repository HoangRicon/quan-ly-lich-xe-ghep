param(
  [Parameter(Mandatory = $false)]
  [string]$AppUrl = "http://127.0.0.1:3000",

  [Parameter(Mandatory = $false)]
  [string]$CronSecret = "",

  [Parameter(Mandatory = $false)]
  [int]$LoadDotEnv = 0,

  [Parameter(Mandatory = $false)]
  [string]$EnvFile = "",

  [Parameter(Mandatory = $false)]
  [int]$PreferDotEnv = 0,

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

function Try-LoadDotEnv([string]$logFile, [string]$scriptDir, [string]$explicitEnvFile, [int]$enabled) {
  if ($enabled -ne 1) { return $null }

  $candidates = @()
  if (-not [string]::IsNullOrWhiteSpace($explicitEnvFile)) {
    $candidates += $explicitEnvFile
  } else {
    # Try common locations relative to this script:
    # - repoRoot/.env (repoRoot assumed to be parent of deploy\windows)
    # - scriptDir/.env (in case someone copied script elsewhere)
    $repoRootGuess = Resolve-Path (Join-Path $scriptDir "..\..") -ErrorAction SilentlyContinue
    if ($repoRootGuess) { $candidates += (Join-Path $repoRootGuess.Path ".env") }
    $candidates += (Join-Path $scriptDir ".env")
  }

  foreach ($p in $candidates) {
    try {
      if (-not (Test-Path -LiteralPath $p)) { continue }

      $loaded = 0
      $lines = Get-Content -LiteralPath $p -ErrorAction Stop
      foreach ($lineRaw in $lines) {
        $line = [string]$lineRaw
        if ([string]::IsNullOrWhiteSpace($line)) { continue }
        $trim = $line.Trim()
        if ($trim.StartsWith("#")) { continue }
        $eq = $trim.IndexOf("=")
        if ($eq -lt 1) { continue }

        $key = $trim.Substring(0, $eq).Trim()
        $val = $trim.Substring($eq + 1).Trim()
        if ([string]::IsNullOrWhiteSpace($key)) { continue }

        # Strip optional surrounding quotes
        if (($val.StartsWith('"') -and $val.EndsWith('"')) -or ($val.StartsWith("'") -and $val.EndsWith("'"))) {
          if ($val.Length -ge 2) { $val = $val.Substring(1, $val.Length - 2) }
        }

        # Only set if not already present in process env
        if ([string]::IsNullOrWhiteSpace([string]${env:$key})) {
          Set-Item -Path ("Env:\" + $key) -Value $val
          $loaded++
        }
      }

      Add-Content -LiteralPath $logFile -Value "$(Get-Date -Format o) INFO DotEnv loaded. file=$p keysLoaded=$loaded"
      return $p
    } catch {
      # Non-fatal; continue trying other candidates
    }
  }

  Add-Content -LiteralPath $logFile -Value "$(Get-Date -Format o) WARN DotEnv enabled but no .env found (checked: $([string]::Join(';', $candidates)))"
  return $null
}

function Read-HttpErrorBody([object]$ex) {
  try {
    if (-not $ex) { return "" }
    $resp = $ex.Response
    if (-not $resp) { return "" }
    $stream = $resp.GetResponseStream()
    if (-not $stream) { return "" }
    $reader = New-Object System.IO.StreamReader($stream)
    $body = $reader.ReadToEnd()
    $reader.Close()
    return [string]$body
  } catch {
    return ""
  }
}

try {
  $here = Split-Path -Parent $MyInvocation.MyCommand.Path
  $logDir = Join-Path $here "logs"
  Ensure-Dir $logDir
  $logFile = Join-Path $logDir "cron-reminders.log"

  # Optional: load .env for local/manual runs (Task Scheduler as SYSTEM should rely on Machine env)
  $null = Try-LoadDotEnv -logFile $logFile -scriptDir $here -explicitEnvFile $EnvFile -enabled $LoadDotEnv

  $secret = [string]$CronSecret
  $secretSource = "param"
  if ([string]::IsNullOrWhiteSpace($secret)) {
    # For local dev, it can be useful to prefer the .env-provided secret (matches next dev/next start behavior).
    if ($PreferDotEnv -eq 1 -and $LoadDotEnv -eq 1 -and -not [string]::IsNullOrWhiteSpace([string]$env:CRON_SECRET)) {
      $secret = [string]$env:CRON_SECRET
      $secretSource = "dotenv_process_env"
    }
  }
  if ([string]::IsNullOrWhiteSpace($secret)) {
    # Prefer Machine-scoped env so it works with Task Scheduler running as SYSTEM
    $secret = [string][Environment]::GetEnvironmentVariable("CRON_SECRET", "Machine")
    $secretSource = "machine_env"
  }
  if ([string]::IsNullOrWhiteSpace($secret)) {
    # Common during manual runs: secret is set for the current user only
    $secret = [string][Environment]::GetEnvironmentVariable("CRON_SECRET", "User")
    $secretSource = "user_env"
  }
  if ([string]::IsNullOrWhiteSpace($secret)) {
    # Fall back to the current process env
    $secret = [string]$env:CRON_SECRET
    $secretSource = "process_env"
  }
  # Defensive: avoid hidden whitespace/newlines causing 401 mismatch
  if (-not [string]::IsNullOrWhiteSpace($secret)) {
    $secret = $secret.Trim()
  }
  if ([string]::IsNullOrWhiteSpace($secret)) {
    $who = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
    $dotenvNote = "disabled"
    if ($LoadDotEnv -eq 1) {
      if (-not [string]::IsNullOrWhiteSpace($EnvFile)) {
        $dotenvNote = "enabled (EnvFile=$EnvFile)"
      } else {
        $dotenvNote = "enabled (auto-discovery)"
      }
    }
    $msg = "$(Get-Date -Format o) ERROR Missing CRON_SECRET. Looked in: -CronSecret param, Machine env, User env, process env. DotEnv=$dotenvNote. Fix: set Machine env var CRON_SECRET (recommended for Task Scheduler), or pass -CronSecret, or run with -LoadDotEnv 1. runningAs=$who"
    Add-Content -LiteralPath $logFile -Value $msg
    exit 2
  }

  # Log where the secret was sourced from without leaking it
  $who2 = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
  $len = $secret.Length
  Add-Content -LiteralPath $logFile -Value "$(Get-Date -Format o) INFO CRON_SECRET loaded. source=$secretSource length=$len runningAs=$who2"

  $app = [string]$AppUrl
  if ([string]::IsNullOrWhiteSpace($app)) {
    $msg = "$(Get-Date -Format o) ERROR Missing AppUrl (pass -AppUrl 'https://your-domain' or keep default)."
    Add-Content -LiteralPath $logFile -Value $msg
    exit 2
  }
  $app = $app.Trim().TrimEnd("/")
  try {
    $null = [Uri]$app
  } catch {
    Add-Content -LiteralPath $logFile -Value "$(Get-Date -Format o) ERROR Invalid AppUrl: '$app' (must include http(s)://)"
    exit 2
  }
  Add-Content -LiteralPath $logFile -Value "$(Get-Date -Format o) INFO Using AppUrl='$app'"

  # Build a safe absolute URI (avoid string concatenation edge cases / hidden chars)
  $path = "/api/cron/reminders"
  $qs = ""
  if ($DryRun -eq 1) { $qs = "dryRun=1" }

  try {
    $baseUri = [Uri]$app
    $ub = New-Object System.UriBuilder($baseUri)
    $ub.Path = $path
    $ub.Query = $qs
    $uri = $ub.Uri
  } catch {
    $msg = "$(Get-Date -Format o) ERROR Invalid URI build. AppUrl='$app' Path='$path' Query='$qs' err=$($_.Exception.Message)"
    Add-Content -LiteralPath $logFile -Value $msg
    exit 2
  }

  # Final sanity check (log the exact URI we will call)
  Add-Content -LiteralPath $logFile -Value "$(Get-Date -Format o) INFO Calling URI='$($uri.AbsoluteUri)'"

  $headers = @{
    "x-cron-secret" = $secret
  }

  $started = Get-Date
  $resp = Invoke-RestMethod -Method GET -Uri $uri -Headers $headers -TimeoutSec $TimeoutSec
  $ms = [int]((Get-Date) - $started).TotalMilliseconds

  $line = "$(Get-Date -Format o) OK ${ms}ms url=$($uri.AbsoluteUri) emailsSent=$($resp.emailsSent) scannedTrips=$($resp.scannedTrips) dryRun=$($resp.dryRun)"
  Add-Content -LiteralPath $logFile -Value $line
  exit 0
} catch {
  try {
    $here = Split-Path -Parent $MyInvocation.MyCommand.Path
    $logDir = Join-Path $here "logs"
    Ensure-Dir $logDir
    $logFile = Join-Path $logDir "cron-reminders.log"
    $err = $_.Exception
    $msg = [string]$err.Message

    $status = ""
    try {
      if ($err.Response -and $err.Response.StatusCode) {
        $status = [string]$err.Response.StatusCode
      }
    } catch { }

    $body = Read-HttpErrorBody $err
    if (-not [string]::IsNullOrWhiteSpace($body)) {
      $bodyOneLine = ($body -replace "(\r\n|\n|\r)", " ").Trim()
      if ($bodyOneLine.Length -gt 2000) { $bodyOneLine = $bodyOneLine.Substring(0, 2000) + "…(truncated)" }
      Add-Content -LiteralPath $logFile -Value "$(Get-Date -Format o) ERROR HTTP status=$status msg=$msg body=$bodyOneLine"
    } else {
      Add-Content -LiteralPath $logFile -Value "$(Get-Date -Format o) ERROR HTTP status=$status msg=$msg"
    }
  } catch {
    # ignore logging errors
  }
  exit 1
}

