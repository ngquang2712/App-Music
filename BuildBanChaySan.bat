@echo off
chcp 65001 >nul
cd /d "%~dp0MaNguonTauri"
cargo build --release --features custom-protocol
if errorlevel 1 (
    pause
    exit /b 1
)
if not exist "%~dp0UngDungChaySan" mkdir "%~dp0UngDungChaySan"
copy /y "target\release\omni-music-player.exe" "%~dp0UngDungChaySan\NgQuang Music App.exe" >nul
if errorlevel 1 (
    pause
    exit /b 1
)
if not exist "%~dp0DuLieu\ThucThi" (
    echo Khong tim thay DuLieu\ThucThi. Chay CapNhatEngine.bat de tai engine.
    pause
    exit /b 1
)
xcopy "%~dp0DuLieu\ThucThi" "%~dp0UngDungChaySan\DuLieu\ThucThi" /E /I /Y >nul
if errorlevel 1 (
    echo Khong chep duoc engine vao UngDungChaySan.
    pause
    exit /b 1
)
if not exist "%~dp0UngDungChaySan\data" (
    if exist "%~dp0MaNguonTauri\data" (
        xcopy "%~dp0MaNguonTauri\data" "%~dp0UngDungChaySan\data" /E /I /Y >nul
    ) else if exist "%~dp0data" (
        xcopy "%~dp0data" "%~dp0UngDungChaySan\data" /E /I /Y >nul
    )
)
echo Build thanh cong. Chay "UngDungChaySan\NgQuang Music App.exe".
echo Gui ca thu muc UngDungChaySan cho nguoi khac de kem day du engine.
pause
