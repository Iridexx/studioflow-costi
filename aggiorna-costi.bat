@echo off
rem Doppio clic: scarica da GitHub l'ultima versione di StudioFlow Costi e la riavvia.
rem Tutti i passaggi sono in scripts\aggiorna.ps1 (accetta -SoloControllo, -Forza, -Porta).
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\aggiorna.ps1" %*
echo.
pause
