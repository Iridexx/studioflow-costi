<#
.SYNOPSIS
  Salva una copia del database di StudioFlow Costi (backup notturno).

.DESCRIPTION
  Crea un file .dump nella cartella indicata da COSTI_BACKUP_DIR nel file .env (meglio se
  sincronizzata, es. OneDrive) oppure nella cartella "backup" del programma. Tiene gli ultimi
  30 file. Usa pg_dump se è installato su Windows, altrimenti quello del contenitore Docker del
  database. Per farlo partire ogni sera: doppio clic su installa-backup.bat.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\scripts\backup.ps1
#>
[CmdletBinding()]
param([int]$DaTenere = 30)

$ErrorActionPreference = "Continue"
$Root = Split-Path -Parent $PSScriptRoot
$LogDir = Join-Path (Join-Path $Root ".costi-server") "log"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$LogFile = Join-Path $LogDir "backup.log"

function Write-Log([string]$Text, [string]$Color = "Gray") {
  Write-Host $Text -ForegroundColor $Color
  Add-Content -Path $LogFile -Value ("[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Text) -Encoding UTF8
}

function Read-EnvValue([string]$Name) {
  $envFile = Join-Path $Root ".env"
  if (-not (Test-Path $envFile)) { return $null }
  $line = Get-Content -Path $envFile -Encoding UTF8 | Where-Object { $_ -match "^\s*$Name\s*=" } | Select-Object -First 1
  if (-not $line) { return $null }
  return ($line -replace "^\s*$Name\s*=\s*", "").Trim().Trim('"').Trim("'")
}

$url = Read-EnvValue "DATABASE_URL"
$pattern = '^postgres(?:ql)?://([^:@/]+)(?::([^@/]*))?@\[?([^:/?\]]+)\]?(?::(\d+))?/([^?]+)'
if (-not $url -or -not ($url -match $pattern)) {
  Write-Log "ERRORE - DATABASE_URL mancante o non valida nel file .env." Red
  exit 1
}
$dbUser = [Uri]::UnescapeDataString($Matches[1])
$dbPassword = if ($Matches[2]) { [Uri]::UnescapeDataString($Matches[2]) } else { "" }
$dbHost = $Matches[3]
$dbPort = if ($Matches[4]) { $Matches[4] } else { "5432" }
$dbName = [Uri]::UnescapeDataString($Matches[5])

$target = Read-EnvValue "COSTI_BACKUP_DIR"
if (-not $target) { $target = Join-Path $Root "backup" }
New-Item -ItemType Directory -Force -Path $target | Out-Null
$file = Join-Path $target ("studioflow-costi-{0}.dump" -f (Get-Date -Format "yyyyMMdd-HHmmss"))

$done = $false
if (Get-Command pg_dump -ErrorAction SilentlyContinue) {
  $env:PGPASSWORD = $dbPassword
  & pg_dump -h $dbHost -p $dbPort -U $dbUser -Fc -f $file $dbName 2>&1 | ForEach-Object { Add-Content -Path $LogFile -Value "$_" }
  $done = ($LASTEXITCODE -eq 0)
} elseif (Get-Command docker -ErrorAction SilentlyContinue) {
  # Il contenitore che pubblica la porta del database (quello di StudioFlow).
  $container = & docker ps --filter "publish=$dbPort" --format "{{.Names}}" 2>$null | Select-Object -First 1
  if (-not $container) {
    Write-Log "ERRORE - Nessun contenitore Docker del database in funzione sulla porta $dbPort." Red
    exit 1
  }
  $inside = "/tmp/studioflow-costi.dump"
  & docker exec -e "PGPASSWORD=$dbPassword" $container pg_dump -U $dbUser -Fc -f $inside $dbName 2>&1 | ForEach-Object { Add-Content -Path $LogFile -Value "$_" }
  if ($LASTEXITCODE -eq 0) {
    & docker cp "${container}:$inside" $file 2>&1 | ForEach-Object { Add-Content -Path $LogFile -Value "$_" }
    $done = ($LASTEXITCODE -eq 0)
    & docker exec $container rm -f $inside 2>&1 | Out-Null
  }
} else {
  Write-Log "ERRORE - Non trovo né pg_dump né Docker per fare il backup." Red
  exit 1
}

if (-not $done -or -not (Test-Path $file) -or (Get-Item $file).Length -eq 0) {
  Write-Log "ERRORE - Backup non riuscito: dettagli in $LogFile" Red
  if (Test-Path $file) { Remove-Item $file -Force }
  exit 1
}
Write-Log ("OK - Backup salvato: {0} ({1:N0} KB)" -f $file, ((Get-Item $file).Length / 1KB)) Green

Get-ChildItem -Path $target -Filter "studioflow-costi-*.dump" | Sort-Object Name -Descending |
  Select-Object -Skip $DaTenere | Remove-Item -Force -ErrorAction SilentlyContinue
exit 0
