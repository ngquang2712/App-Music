@echo off
chcp 65001 >nul
cd /d "%~dp0"
where cargo >nul 2>nul
if %errorlevel% neq 0 (
    echo Can cai Rust va Visual Studio Build Tools voi Desktop development with C++.
    echo Xem HuongDanSuaLoi.md. Sau khi cai, mo lai Terminal.
    pause
    exit /b 1
)
if not exist "%~dp0DuLieu\ThucThi\yt-dlp.exe" goto update_engine
if not exist "%~dp0DuLieu\ThucThi\deno.exe" goto update_engine
goto run_app
:update_engine
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0CapNhatEngine.ps1"
if errorlevel 1 (
    pause
    exit /b 1
)
:run_app
cd /d "%~dp0MaNguonTauri"
cargo run --release --features custom-protocol
if errorlevel 1 pause
