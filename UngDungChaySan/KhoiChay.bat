@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist "%~dp0OmniMusicPlayer.exe" (
    call "%~dp0..\BuildBanChaySan.bat"
    if errorlevel 1 exit /b 1
)
start "" "%~dp0OmniMusicPlayer.exe"
exit
