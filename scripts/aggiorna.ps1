<#
.SYNOPSIS
  Aggiorna StudioFlow Costi sul PC che fa da server e lo riavvia.

.DESCRIPTION
  1. controlla che il database risponda e, se serve, lo avvia (Docker Desktop o servizio Windows);
  2. controlla se su GitHub ci sono novità sul ramo main;
  3. scarica il nuovo codice;
  4. installa le dipendenze (solo se sono cambiate);
  5. prepara la nuova versione in una cartella separata (.next-a / .next-b), mentre quella
     in funzione continua a servire gli utenti;
  6. ferma solo il processo StudioFlow in ascolto sulla porta (gli altri programmi Node, come
     Streamlit o altri server, non vengono toccati) e aggiorna il database;
  7. avvia la nuova versione e controlla che risponda. Se non parte, riavvia quella di prima.

  Se la build fallisce, la versione in funzione resta attiva e non viene fermata.
  Se non ci sono novità e StudioFlow è già avviato, non fa nulla; se non è avviato, lo avvia.

.PARAMETER Porta
  Porta su cui gira StudioFlow Costi (predefinita 3100).

.PARAMETER CartellaStudioFlow
  Cartella di StudioFlow, dove c'è il docker-compose.yml del database (predefinita: la cartella
  "studioflow" accanto a questa).

.PARAMETER Ramo
  Ramo di GitHub da seguire (predefinito main).

.PARAMETER Forza
  Rifà build e riavvio anche se non ci sono novità.

.PARAMETER SoloControllo
  Dice soltanto se ci sono novità, senza scaricare né riavviare nulla.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\scripts\aggiorna.ps1

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\scripts\aggiorna.ps1 -SoloControllo
#>
[CmdletBinding()]
param(
  [int]$Porta = 3100,
  [string]$CartellaStudioFlow = "",
  [string]$Ramo = "main",
  [switch]$Forza,
  [switch]$SoloControllo
)

# I comandi esterni (git, pnpm) scrivono l'avanzamento su stderr: con "Stop" PowerShell 5 lo
# scambierebbe per un errore. Gli esiti si controllano con $LASTEXITCODE.
$ErrorActionPreference = "Continue"

$Root = Split-Path -Parent $PSScriptRoot
$StateDir = Join-Path $Root ".costi-server"
$StateFile = Join-Path $StateDir "stato.json"
$LogDir = Join-Path $StateDir "log"
$Slots = @(".next-a", ".next-b")
$WindowMarker = "StudioFlow-Costi"
$TotalSteps = 7

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$LogFile = Join-Path $LogDir ("aggiornamento-{0}.log" -f (Get-Date -Format "yyyyMMdd-HHmmss"))

# ---------- Messaggi ----------

function Write-Log([string]$Text) {
  Add-Content -Path $LogFile -Value ("[{0}] {1}" -f (Get-Date -Format "HH:mm:ss"), $Text) -Encoding UTF8
}

function Write-Step([int]$Number, [string]$Text) {
  Write-Host ""
  Write-Host ("[{0}/{1}] {2}" -f $Number, $TotalSteps, $Text) -ForegroundColor Cyan
  Write-Log "== $Text"
}

function Write-Info([string]$Text) {
  Write-Host "      $Text"
  Write-Log $Text
}

function Write-Ok([string]$Text) {
  Write-Host "      OK - $Text" -ForegroundColor Green
  Write-Log "OK - $Text"
}

function Write-Warn([string]$Text) {
  Write-Host "      ATTENZIONE - $Text" -ForegroundColor Yellow
  Write-Log "ATTENZIONE - $Text"
}

function Stop-WithError([string]$Text, [string[]]$Hints = @()) {
  Write-Host ""
  Write-Host "ERRORE - $Text" -ForegroundColor Red
  Write-Log "ERRORE - $Text"
  foreach ($hint in $Hints) {
    Write-Host "  - $hint" -ForegroundColor Yellow
    Write-Log "  - $hint"
  }
  Write-Host ""
  Write-Host "Dettagli completi nel registro: $LogFile" -ForegroundColor DarkGray
  exit 1
}

# Esegue un comando esterno mostrando l'output in grigio e salvandolo nel registro.
# L'output resta in $script:ToolOutput per mostrare l'errore se il comando fallisce.
function Invoke-Tool([string]$Command, [string[]]$Arguments) {
  Write-Log ("> {0} {1}" -f $Command, ($Arguments -join " "))
  $script:ToolOutput = New-Object System.Collections.Generic.List[string]
  & $Command @Arguments 2>&1 | ForEach-Object {
    $line = "$_"
    # PowerShell 5 scrive così le righe vuote arrivate da stderr: non dicono nulla.
    if ($line -eq "System.Management.Automation.RemoteException") { return }
    Add-Content -Path $LogFile -Value $line -Encoding UTF8
    if ($line.Trim()) {
      $script:ToolOutput.Add($line)
      Write-Host "        $line" -ForegroundColor DarkGray
    }
  }
  return $LASTEXITCODE
}

# Righe utili per capire perché un comando è fallito: quelle con l'errore, altrimenti le ultime.
function Show-ToolErrors([int]$Max = 25) {
  $lines = @($script:ToolOutput)
  $errorAt = -1
  for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "(?i)error|errore|failed|cannot find|not found|⨯") { $errorAt = $i; break }
  }
  $start = if ($errorAt -ge 0) { [Math]::Max(0, $errorAt - 2) } else { [Math]::Max(0, $lines.Count - $Max) }
  $selected = $lines | Select-Object -Skip $start -First $Max
  if (-not $selected) { return }
  Write-Host ""
  Write-Host "Righe dell'errore (da mandare all'assistenza se non è chiaro):" -ForegroundColor Yellow
  foreach ($line in $selected) { Write-Host "  $line" -ForegroundColor Red }
}

# Esegue git e restituisce l'output come testo (senza mostrarlo).
function Get-Git([string[]]$Arguments) {
  $output = & git @Arguments 2>$null
  if ($LASTEXITCODE -ne 0) { return $null }
  return (($output | ForEach-Object { "$_" }) -join "`n").Trim()
}

# ---------- Stato dell'ultima versione avviata ----------

function Read-State {
  if (-not (Test-Path $StateFile)) { return $null }
  try { return Get-Content -Path $StateFile -Raw -Encoding UTF8 | ConvertFrom-Json } catch { return $null }
}

function Save-State([string]$Slot, [string]$Commit) {
  $state = [ordered]@{
    cartella = $Slot
    commit   = $Commit
    avviato  = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    porta    = $Porta
  }
  $state | ConvertTo-Json | Set-Content -Path $StateFile -Encoding UTF8
}

function Test-Build([string]$Slot) {
  return Test-Path (Join-Path (Join-Path $Root $Slot) "BUILD_ID")
}

# ---------- Processi ----------

function Get-ProcessInfo([int]$ProcessId) {
  return Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessId" -ErrorAction SilentlyContinue
}

function Get-PortOwner {
  $conn = Get-NetTCPConnection -LocalPort $Porta -State Listen -ErrorAction SilentlyContinue |
    Select-Object -First 1
  if (-not $conn) { return $null }
  return Get-ProcessInfo $conn.OwningProcess
}

function Test-IsStudioFlow($Process) {
  if (-not $Process -or $Process.Name -ine "node.exe") { return $false }
  $commandLine = [string]$Process.CommandLine
  # Senza permessi la riga di comando può essere vuota: un node sulla porta di StudioFlow
  # lo consideriamo nostro.
  return ([string]::IsNullOrEmpty($commandLine) -or $commandLine -match "(?i)next")
}

# Risale da "next start" a chi l'ha lanciato (pnpm e la finestra aperta da questo script), così
# si chiude tutto il gruppo e non solo l'ultimo processo. Si ferma a PowerShell/Esplora risorse.
function Get-StopTarget($Process) {
  $target = $Process
  $current = $Process
  for ($i = 0; $i -lt 6; $i++) {
    $parent = Get-ProcessInfo $current.ParentProcessId
    if (-not $parent) { break }
    $commandLine = [string]$parent.CommandLine
    if ($parent.Name -ieq "cmd.exe" -and $commandLine -match $WindowMarker) { return $parent }
    if ($parent.Name -ieq "node.exe" -and $commandLine -match "(?i)pnpm") {
      $target = $parent
    } elseif ($parent.Name -ine "cmd.exe") {
      break
    }
    $current = $parent
  }
  return $target
}

function Stop-StudioFlow($Process) {
  $target = Get-StopTarget $Process
  Write-Info ("Chiudo il processo {0} (PID {1}) e quelli avviati da lui." -f $target.Name, $target.ProcessId)
  & taskkill.exe /PID $target.ProcessId /T /F 2>&1 | ForEach-Object { Write-Log "$_" }
  for ($i = 0; $i -lt 30; $i++) {
    if (-not (Get-PortOwner)) { return $true }
    Start-Sleep -Milliseconds 500
  }
  return $false
}

function Start-StudioFlow([string]$Slot) {
  # La finestra resta aperta (ridotta a icona) con i messaggi del server; il titolo serve a
  # ritrovarla al prossimo aggiornamento.
  $env:STUDIOFLOW_DIST_DIR = $Slot
  $commandLine = "title $WindowMarker porta $Porta & pnpm exec next start -p $Porta"
  Start-Process -FilePath "cmd.exe" -ArgumentList "/k", $commandLine -WorkingDirectory $Root -WindowStyle Minimized
  Write-Log "Avviato: $commandLine (STUDIOFLOW_DIST_DIR=$Slot)"
}

function Wait-StudioFlowReady([int]$TimeoutSeconds = 90) {
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  Write-Host "      Attendo che risponda " -NoNewline
  while ((Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 2
    Write-Host "." -NoNewline
    try {
      # Pagina che legge il database: risponde solo se anche PostgreSQL funziona.
      $response = Invoke-WebRequest -Uri "http://localhost:$Porta/accedi" -UseBasicParsing -TimeoutSec 10
      if ($response.StatusCode -lt 500) { Write-Host ""; return $true }
    } catch {
      $response = $_.Exception.Response
      if ($response -and [int]$response.StatusCode -lt 500) { Write-Host ""; return $true }
    }
  }
  Write-Host ""
  return $false
}

function Show-Addresses {
  Write-Host ""
  Write-Host "StudioFlow Costi è in funzione:" -ForegroundColor Green
  Write-Host "  - su questo PC:        http://localhost:$Porta"
  $addresses = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" }
  foreach ($address in $addresses) {
    Write-Host ("  - dalla rete:          http://{0}:{1}" -f $address.IPAddress, $Porta)
  }
  Write-Host "  - con Tailscale:       http://<nome-del-pc>:$Porta oppure http://100.x.x.x:$Porta"
  Write-Host ""
  Write-Host "La finestra '$WindowMarker' ridotta a icona è il server: se la chiudi, StudioFlow Costi si ferma." -ForegroundColor DarkGray
}

# ---------- Database ----------

# Host e porta di PostgreSQL letti da DATABASE_URL nel file .env.
function Get-DatabaseEndpoint {
  $line = Get-Content -Path (Join-Path $Root ".env") -Encoding UTF8 |
    Where-Object { $_ -match '^\s*DATABASE_URL\s*=' } | Select-Object -First 1
  if (-not $line -or $line -notmatch '@\[?([^:/?\]]+)\]?(?::(\d+))?/') { return $null }
  $port = if ($Matches[2]) { [int]$Matches[2] } else { 5432 }
  return [pscustomobject]@{ Host = $Matches[1]; Port = $port }
}

function Test-TcpPort([string]$HostName, [int]$Port) {
  $client = New-Object System.Net.Sockets.TcpClient
  try {
    $attempt = $client.BeginConnect($HostName, $Port, $null, $null)
    return ($attempt.AsyncWaitHandle.WaitOne(2000) -and $client.Connected)
  } catch {
    return $false
  } finally {
    $client.Close()
  }
}

function Wait-TcpPort([string]$HostName, [int]$Port, [int]$TimeoutSeconds) {
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-TcpPort $HostName $Port) { return $true }
    Start-Sleep -Seconds 2
  }
  return $false
}

function Test-DockerEngine {
  & docker info 2>&1 | Out-Null
  return $LASTEXITCODE -eq 0
}

# Dopo un riavvio del PC PostgreSQL può non essere partito: lo avviamo prima di StudioFlow.
function Initialize-Database {
  $endpoint = Get-DatabaseEndpoint
  if (-not $endpoint) {
    Stop-WithError "Non trovo DATABASE_URL nel file .env." @("Controlla il file .env (vedi .env.example).")
  }
  $where = "{0}:{1}" -f $endpoint.Host, $endpoint.Port
  if (Test-TcpPort $endpoint.Host $endpoint.Port) {
    Write-Ok "Il database risponde ($where)."
    return
  }
  Write-Info "Il database ($where) non risponde: provo ad avviarlo."
  if ($endpoint.Host -notin @("localhost", "127.0.0.1", "::1")) {
    Stop-WithError "Il database su $where non risponde." @("Accendi il PC o il servizio che ospita PostgreSQL e rilancia.")
  }

  # PostgreSQL installato come servizio di Windows.
  $services = @(Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue)
  foreach ($service in $services) {
    if ($service.Status -ne "Running") {
      Write-Info "Avvio il servizio $($service.Name)..."
      Start-Service -Name $service.Name -ErrorAction SilentlyContinue
    }
  }
  if ($services.Count -gt 0 -and (Wait-TcpPort $endpoint.Host $endpoint.Port 30)) {
    Write-Ok "Database avviato (servizio di Windows)."
    return
  }

  # PostgreSQL in Docker: è quello di StudioFlow (docker-compose.yml nella sua cartella).
  $composeDir = if ($CartellaStudioFlow) { $CartellaStudioFlow } else { Join-Path (Split-Path -Parent $Root) "studioflow" }
  if ((Get-Command docker -ErrorAction SilentlyContinue) -and (Test-Path (Join-Path $composeDir "docker-compose.yml"))) {
    if (-not (Test-DockerEngine)) {
      $desktop = Join-Path $env:ProgramFiles "Docker\Docker\Docker Desktop.exe"
      if (Test-Path $desktop) {
        Write-Info "Avvio Docker Desktop (può richiedere un paio di minuti)..."
        Start-Process -FilePath $desktop
      }
      Write-Host "      Attendo Docker " -NoNewline
      $deadline = (Get-Date).AddSeconds(180)
      while (-not (Test-DockerEngine) -and (Get-Date) -lt $deadline) {
        Start-Sleep -Seconds 3
        Write-Host "." -NoNewline
      }
      Write-Host ""
    }
    if (Test-DockerEngine) {
      Write-Info "Avvio il contenitore del database (docker compose up)..."
      Invoke-Tool "docker" @("compose", "--project-directory", $composeDir, "up", "-d", "--wait", "postgres") | Out-Null
      if (Wait-TcpPort $endpoint.Host $endpoint.Port 60) {
        Write-Ok "Database avviato (Docker)."
        return
      }
    }
  }

  Stop-WithError "Non riesco ad avviare il database ($where): StudioFlow Costi non funzionerebbe." @(
    "Se usi Docker: apri Docker Desktop, attendi 'Engine running' e rilancia.",
    "Se PostgreSQL è installato su Windows: Win+R, services.msc, avvia il servizio 'postgresql' (serve essere amministratore).",
    "Per non doverlo rifare: in Docker Desktop, Settings > General > 'Start Docker Desktop when you sign in'."
  )
}

# ---------- Inizio ----------

Set-Location $Root
# Così i messaggi di pnpm e Next.js (in UTF-8) non escono con caratteri strani.
try {
  [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
  $OutputEncoding = [System.Text.Encoding]::UTF8
} catch { }
Write-Host "StudioFlow Costi - aggiornamento del server" -ForegroundColor White
Write-Host "Cartella: $Root" -ForegroundColor DarkGray
Write-Log "Cartella $Root, porta $Porta, ramo $Ramo, Forza=$Forza, SoloControllo=$SoloControllo"

# Un solo aggiornamento alla volta (es. doppio clic ripetuto).
$mutex = New-Object System.Threading.Mutex($false, "StudioFlowCostiAggiornamento")
if (-not $mutex.WaitOne(0)) {
  Stop-WithError "C'è già un aggiornamento in corso in un'altra finestra."
}

foreach ($tool in @("git", "pnpm", "node")) {
  if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
    Stop-WithError "Non trovo il comando '$tool'." @("Installa Node.js 22, Git e pnpm (corepack enable) e riapri la finestra.")
  }
}
if (-not (Test-Path (Join-Path $Root ".env"))) {
  Stop-WithError "Manca il file .env nella cartella di StudioFlow Costi." @("Copia .env.example in .env e completa i valori (vedi README).")
}

# ---------- 1. Database ----------

if (-not $SoloControllo) {
  Write-Step 1 "Controllo il database"
  Initialize-Database
}

# ---------- 2. Novità su GitHub ----------

Write-Step 2 "Controllo se su GitHub ci sono novità ($Ramo)"

$owner = Get-PortOwner
$running = Test-IsStudioFlow $owner
if ($owner -and -not $running) {
  Stop-WithError ("La porta {0} è occupata da un altro programma ({1}, PID {2}): non lo chiudo." -f $Porta, $owner.Name, $owner.ProcessId) @(
    "Chiudi quel programma oppure usa un'altra porta: -Porta 3001."
  )
}
if ($running) { Write-Info "StudioFlow Costi è in funzione sulla porta $Porta (PID $($owner.ProcessId))." }
else { Write-Info "StudioFlow Costi non è in funzione sulla porta $Porta." }

$changes = Get-Git @("status", "--porcelain", "--untracked-files=no")
if ($changes) {
  Write-Log $changes
  Stop-WithError "Ci sono file del programma modificati a mano su questo PC: non scarico per non perderli." @(
    "File modificati: $($changes -replace "`n", ', ')",
    "Per metterli da parte: git stash   (poi rilancia l'aggiornamento)"
  )
}

if ((Invoke-Tool "git" @("fetch", "origin", $Ramo)) -ne 0) {
  Stop-WithError "Non riesco a contattare GitHub." @(
    "Controlla la connessione a Internet e l'accesso al repository.",
    "La versione in funzione non è stata toccata."
  )
}

$branch = Get-Git @("rev-parse", "--abbrev-ref", "HEAD")
$localCommit = Get-Git @("rev-parse", "HEAD")
$remoteCommit = Get-Git @("rev-parse", "origin/$Ramo")
$state = Read-State
$deployedCommit = if ($state) { [string]$state.commit } else { "" }
$activeSlot = if ($state -and $running) { [string]$state.cartella } else { $null }

$newCommits = Get-Git @("log", "--oneline", "--no-decorate", "HEAD..origin/$Ramo")
$hasNews = ($branch -ne $Ramo) -or ($localCommit -ne $remoteCommit)
$needsBuild = $Forza -or $hasNews -or ($deployedCommit -ne $remoteCommit) -or
  -not ($state -and (Test-Build ([string]$state.cartella)))

if ($newCommits) {
  Write-Info "Novità da scaricare:"
  $newCommits -split "`n" | ForEach-Object { Write-Info "  * $_" }
} elseif ($hasNews) {
  Write-Info "Passo dal ramo '$branch' al ramo '$Ramo'."
} else {
  Write-Ok "Il codice su questo PC è già l'ultimo."
  if ($Forza) { Write-Info "Richiesto -Forza: rifaccio comunque build e riavvio." }
  elseif ($needsBuild) { Write-Info "La versione avviata non risulta preparata da questo script: la preparo ora." }
}

if ($SoloControllo) {
  if ($needsBuild) { Write-Info "Lanciando l'aggiornamento senza -SoloControllo verrà installata la nuova versione." }
  exit 0
}

if (-not $needsBuild) {
  if ($running) {
    Write-Host ""
    Write-Host "Nessuna novità: StudioFlow Costi è già aggiornato e in funzione." -ForegroundColor Green
    exit 0
  }
  Write-Step 7 "Avvio StudioFlow Costi (nessuna novità, uso la versione già pronta)"
  Start-StudioFlow ([string]$state.cartella)
  if (-not (Wait-StudioFlowReady)) {
    Stop-WithError "StudioFlow Costi non risponde dopo l'avvio." @("Apri la finestra '$WindowMarker' per leggere l'errore.")
  }
  Save-State ([string]$state.cartella) $remoteCommit
  Show-Addresses
  exit 0
}

# ---------- 3. Download ----------

Write-Step 3 "Scarico il nuovo codice"
if (-not $hasNews) { Write-Info "Niente da scaricare." }
if ($branch -ne $Ramo) {
  if ((Invoke-Tool "git" @("checkout", $Ramo)) -ne 0) {
    Stop-WithError "Non riesco a passare al ramo '$Ramo'." @("La versione in funzione non è stata toccata.")
  }
}
if ((Invoke-Tool "git" @("merge", "--ff-only", "origin/$Ramo")) -ne 0) {
  Stop-WithError "Non riesco ad allineare il codice a GitHub." @(
    "Su questo PC ci sono commit che su GitHub non esistono: chiedi prima di cancellarli.",
    "La versione in funzione non è stata toccata."
  )
}
$newCommit = Get-Git @("rev-parse", "HEAD")
Write-Ok ("Codice aggiornato alla versione {0}." -f $newCommit.Substring(0, 7))

# ---------- 4. Dipendenze ----------

Write-Step 4 "Controllo le dipendenze"
$dependenciesChanged = $true
if ($deployedCommit -and -not $Forza -and (Test-Path (Join-Path $Root "node_modules"))) {
  $changedFiles = Get-Git @("diff", "--name-only", $deployedCommit, $newCommit, "--", "package.json", "pnpm-lock.yaml")
  $dependenciesChanged = ($null -eq $changedFiles) -or ($changedFiles -ne "")
}
if ($dependenciesChanged) {
  Write-Info "Installo le dipendenze (pnpm install)..."
  if ((Invoke-Tool "pnpm" @("install", "--frozen-lockfile")) -ne 0) {
    Stop-WithError "Installazione delle dipendenze non riuscita." @(
      "Se l'errore parla di file in uso (EPERM, EBUSY), chiudi la finestra '$WindowMarker' e rilancia.",
      "La versione in funzione non è stata toccata."
    )
  }
  Write-Ok "Dipendenze installate."
} else {
  Write-Ok "Nessuna dipendenza cambiata, salto l'installazione."
  if ((Invoke-Tool "pnpm" @("db:generate", "--no-hints")) -ne 0) {
    Stop-WithError "Generazione del client del database non riuscita." @("La versione in funzione non è stata toccata.")
  }
}

# ---------- 5. Build ----------

$buildSlot = if ($activeSlot -eq $Slots[0]) { $Slots[1] } else { $Slots[0] }
Write-Step 5 "Preparo la nuova versione (build in $buildSlot, può richiedere qualche minuto)"
if ($running) { Write-Info "Intanto StudioFlow Costi continua a funzionare." }
$buildPath = Join-Path $Root $buildSlot
if (Test-Path $buildPath) { Remove-Item -Recurse -Force $buildPath -ErrorAction SilentlyContinue }
# Il controllo dei tipi della build legge anche i tipi generati nelle altre cartelle (tsconfig):
# quelli di una versione vecchia puntano a pagine che non esistono più e la farebbero fallire.
# Alla versione in funzione non servono.
foreach ($other in @(".next") + $Slots) {
  if ($other -eq $buildSlot) { continue }
  foreach ($typesDir in @("types", "dev\types")) {
    $typesPath = Join-Path (Join-Path $Root $other) $typesDir
    if (Test-Path $typesPath) { Remove-Item -Recurse -Force $typesPath -ErrorAction SilentlyContinue }
  }
}
$env:STUDIOFLOW_DIST_DIR = $buildSlot
$started = Get-Date
$buildExit = Invoke-Tool "pnpm" @("build")
if ($buildExit -ne 0 -or -not (Test-Build $buildSlot)) {
  Show-ToolErrors
  $hints = @("Il codice nuovo è scaricato: al prossimo avvio dello script la build verrà ritentata.")
  if ($running) { $hints = @("La versione in funzione NON è stata fermata: gli utenti continuano a lavorare.") + $hints }
  Stop-WithError "La build della nuova versione non è riuscita." $hints
}
Write-Ok ("Nuova versione pronta in {0:N0} secondi." -f ((Get-Date) - $started).TotalSeconds)

# ---------- 6. Arresto e database ----------

Write-Step 6 "Fermo la versione in funzione e aggiorno il database"
# Rilettura: StudioFlow potrebbe essere stato avviato o chiuso durante la build.
$owner = Get-PortOwner
if ($owner -and -not (Test-IsStudioFlow $owner)) {
  Stop-WithError ("Durante la build la porta {0} è stata occupata da un altro programma ({1})." -f $Porta, $owner.Name)
}
$previousSlot = $null
if ($owner) {
  $previousSlot = if ($activeSlot) { $activeSlot } else { ".next" }
  if (-not (Stop-StudioFlow $owner)) {
    Stop-WithError "La porta $Porta è ancora occupata dopo la chiusura." @("Chiudi a mano la finestra di StudioFlow Costi e rilancia.")
  }
  Write-Ok "Versione precedente fermata."
} else {
  Write-Info "Non c'era niente da fermare."
}

if ((Invoke-Tool "pnpm" @("db:deploy")) -ne 0) {
  if ($previousSlot -and (Test-Build $previousSlot)) {
    Write-Warn "Aggiornamento del database non riuscito: riavvio la versione precedente."
    Start-StudioFlow $previousSlot
    if (Wait-StudioFlowReady) { Show-Addresses }
  }
  Stop-WithError "Aggiornamento del database non riuscito." @("I dettagli sono nel registro qui sotto.")
}
Write-Ok "Database aggiornato."

# ---------- 7. Avvio ----------

Write-Step 7 "Avvio la nuova versione"
Start-StudioFlow $buildSlot
if (-not (Wait-StudioFlowReady)) {
  $owner = Get-PortOwner
  if ($owner -and (Test-IsStudioFlow $owner)) { Stop-StudioFlow $owner | Out-Null }
  if ($previousSlot -and (Test-Build $previousSlot)) {
    Write-Warn "La nuova versione non risponde: riavvio quella precedente."
    Start-StudioFlow $previousSlot
    if (Wait-StudioFlowReady) {
      if ($previousSlot -ne ".next") { Save-State $previousSlot $deployedCommit }
      Show-Addresses
    }
  }
  Stop-WithError "La nuova versione non è partita." @("Il registro e la finestra '$WindowMarker' riportano l'errore.")
}
Save-State $buildSlot $newCommit
Write-Ok ("Versione {0} avviata." -f $newCommit.Substring(0, 7))

# Tengo solo gli ultimi 20 registri.
Get-ChildItem -Path $LogDir -Filter "aggiornamento-*.log" | Sort-Object Name -Descending |
  Select-Object -Skip 20 | Remove-Item -Force -ErrorAction SilentlyContinue

Show-Addresses
exit 0
