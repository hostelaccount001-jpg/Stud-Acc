@echo off
title Gurukul Kiosk - Cloud Direct Silent Print Launcher
color 0A

echo ===================================================================
echo     SHREE SWAMINARAYAN GURUKUL KIOSK - CLOUD DIRECT SILENT PRINT
echo ===================================================================
echo.

set "TARGET_URL=https://sgrsstud.vercel.app/"
set "CONFIG_FILE=%~dp0kiosk-url.txt"

if exist "%CONFIG_FILE%" (
    set /p TARGET_URL=<"%CONFIG_FILE%"
) else (
    echo %TARGET_URL%>"%CONFIG_FILE%"
)

echo Target URL: %TARGET_URL%
echo.

:: 1. Check for mantra_service.ps1
if not exist "%~dp0mantra_service.ps1" (
    echo ===================================================================
    echo [ERROR] mantra_service.ps1 file was not found in this folder!
    echo Please make sure mantra_service.ps1 is in the same folder as this file.
    echo ===================================================================
    pause
    exit /b 1
)

:: 2. Auto-Start Mantra MFS100 Direct Web Bridge (Port 8032)
set "PS_PATH=C:\Windows\SysWOW64\WindowsPowerShell\v1.0\powershell.exe"
if not exist "%PS_PATH%" (
    set "PS_PATH=powershell.exe"
)

netstat -ano | findstr ":8032.*LISTENING" >nul
if errorlevel 1 (
    echo Starting Mantra MFS100 Native Direct Web Bridge on Port 8032...
    start "Mantra MFS100 Bridge" /min "%PS_PATH%" -ExecutionPolicy Bypass -File "%~dp0mantra_service.ps1"
    timeout /t 2 /nobreak >nul
) else (
    echo Mantra MFS100 Native Web Bridge is already active on Port 8032.
)

echo.
echo Detecting Google Chrome or Microsoft Edge...

set "BROWSER_EXE="
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    set "BROWSER_EXE=C:\Program Files\Google\Chrome\Application\chrome.exe"
)
if not defined BROWSER_EXE if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    set "BROWSER_EXE=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
)
if not defined BROWSER_EXE if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" (
    set "BROWSER_EXE=%LocalAppData%\Google\Chrome\Application\chrome.exe"
)
if not defined BROWSER_EXE if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    set "BROWSER_EXE=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
)
if not defined BROWSER_EXE if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" (
    set "BROWSER_EXE=C:\Program Files\Microsoft\Edge\Application\msedge.exe"
)

if not defined BROWSER_EXE (
    echo ===================================================================
    echo [ERROR] Neither Google Chrome nor Microsoft Edge was found!
    echo Please install Google Chrome to run the Gurukul Kiosk.
    echo ===================================================================
    pause
    exit /b 1
)

set "KIOSK_DIR=%TEMP%\gurukul-kiosk-chrome-profile"
set "SEC_FLAGS=--allow-running-insecure-content --ignore-certificate-errors --unsafely-treat-insecure-origin-as-secure=http://127.0.0.1:8032,http://127.0.0.1:11100,http://127.0.0.1:11101,http://127.0.0.1:11102,http://127.0.0.1:11103,http://127.0.0.1:11104,http://127.0.0.1:11105,http://127.0.0.1:8004,http://127.0.0.1:8005,http://127.0.0.1:8003"

echo Launching browser in Kiosk Mode...
start "" "%BROWSER_EXE%" --kiosk-printing --user-data-dir="%KIOSK_DIR%" %SEC_FLAGS% --app="%TARGET_URL%"

exit /b 0
