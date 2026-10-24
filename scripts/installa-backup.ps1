<#
.SYNOPSIS
  Programma il backup di StudioFlow Costi ogni sera alle 23 (Utilità di pianificazione di Windows)
  e ne fa subito uno di prova.
#>
[CmdletBinding()]
param([string]$Ora = "23:00")

$Root = Split-Path -Parent $PSScriptRoot
$script = Join-Path $PSScriptRoot "backup.ps1"
$taskName = "StudioFlow Costi - backup"
$command = "powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$script`""

& schtasks.exe /Create /F /SC DAILY /ST $Ora /TN $taskName /TR $command | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Host "ERRORE - Non riesco a creare l'attività pianificata." -ForegroundColor Red
  exit 1
}
Write-Host "OK - Backup programmato ogni giorno alle $Ora (attività '$taskName')." -ForegroundColor Green
Write-Host "    Se il PC è spento a quell'ora, il backup si fa la sera dopo."
Write-Host ""
Write-Host "Faccio subito un backup di prova..."
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $script
