@echo off
rem Doppio clic: programma il backup notturno di StudioFlow Costi e ne fa subito uno.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\installa-backup.ps1" %*
echo.
pause
