@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0CapNhatEngine.ps1" %*
if errorlevel 1 (
    pause
    exit /b 1
)
pause
