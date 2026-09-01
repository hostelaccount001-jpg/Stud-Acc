@echo off
title Gurukul Kiosk - Direct Silent Auto-Print Launcher (Vercel Cloud Mode)
color 0A

echo ===================================================================
echo     SHREE SWAMINARAYAN GURUKUL KIOSK - CLOUD DIRECT SILENT PRINT
echo ===================================================================
echo.

:: -------------------------------------------------------------------
:: 1. Configuration: Kiosk Web URL
:: -------------------------------------------------------------------
set CONFIG_FILE=%~dp0kiosk-url.txt

if exist "%CONFIG_FILE%" (
    set /p TARGET_URL=<"%CONFIG_FILE%"
)

if "%TARGET_URL%"=="" (
    set TARGET_URL=https://sgrsstud.vercel.app/
    echo %TARGET_URL%>"%CONFIG_FILE%"
)

echo Target URL: %TARGET_URL%
echo.
echo Launching Google Chrome / Edge in Dedicated POS Kiosk-Printing Mode...
echo (Silent direct printing + Mantra Biometric RD Bridge enabled)
echo.

:: -------------------------------------------------------------------
:: 2. Browser Detection
:: -------------------------------------------------------------------
set CHROME_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist %CHROME_PATH% (
    set CHROME_PATH="C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
)
if not exist %CHROME_PATH% (
    set CHROME_PATH="%LocalAppData%\Google\Chrome\Application\chrome.exe"
)

set EDGE_PATH="C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if not exist %EDGE_PATH% (
    set EDGE_PATH="C:\Program Files\Microsoft\Edge\Application\msedge.exe"
)

:: Dedicated temp profile to enforce clean kiosk flags
set KIOSK_DIR="%TEMP%\gurukul-kiosk-chrome-profile"

:: Security flags to allow HTTPS Vercel to communicate seamlessly with local Mantra RD Service on 127.0.0.1
set SEC_FLAGS=--allow-running-insecure-content --ignore-certificate-errors --unsafely-treat-insecure-origin-as-secure=http://127.0.0.1:11100,http://127.0.0.1:11101,http://127.0.0.1:11102,http://127.0.0.1:11103,http://127.0.0.1:11104,http://127.0.0.1:11105,http://127.0.0.1:8004,http://127.0.0.1:8005,http://127.0.0.1:8003

if exist %CHROME_PATH% (
    echo Starting Google Chrome in Silent Kiosk Print Mode on %TARGET_URL% ...
    start "" %CHROME_PATH% --kiosk-printing --user-data-dir=%KIOSK_DIR% %SEC_FLAGS% --app=%TARGET_URL%
    exit
) else if exist %EDGE_PATH% (
    echo Starting Microsoft Edge in Silent Kiosk Print Mode on %TARGET_URL% ...
    start "" %EDGE_PATH% --kiosk-printing --user-data-dir=%KIOSK_DIR% %SEC_FLAGS% --app=%TARGET_URL%
    exit
) else (
    echo [ERROR] Neither Google Chrome nor Microsoft Edge was found.
    pause
)
