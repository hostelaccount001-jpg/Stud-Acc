@echo off
title Gurukul Kiosk - Direct Silent Auto-Print Launcher
color 0A

echo ===================================================================
echo     SHREE SWAMINARAYAN GURUKUL KIOSK - DIRECT SILENT PRINT
echo ===================================================================
echo.
echo Launching Google Chrome / Edge in Dedicated POS Kiosk-Printing Mode...
echo (All receipts will print directly to the default thermal printer with ZERO dialogs / NO popups)
echo.

:: Chrome Path detection
set CHROME_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist %CHROME_PATH% (
    set CHROME_PATH="C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
)
if not exist %CHROME_PATH% (
    set CHROME_PATH="%LocalAppData%\Google\Chrome\Application\chrome.exe"
)

:: Edge Path detection
set EDGE_PATH="C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if not exist %EDGE_PATH% (
    set EDGE_PATH="C:\Program Files\Microsoft\Edge\Application\msedge.exe"
)

:: Create dedicated temp profile to enforce clean kiosk flags
set KIOSK_DIR="%TEMP%\gurukul-kiosk-chrome-profile"

if exist %CHROME_PATH% (
    echo Starting Google Chrome in Silent Kiosk Print Mode on http://localhost:8080 ...
    start "" %CHROME_PATH% --kiosk-printing --user-data-dir=%KIOSK_DIR% --app=http://localhost:8080
    exit
) else if exist %EDGE_PATH% (
    echo Starting Microsoft Edge in Silent Kiosk Print Mode on http://localhost:8080 ...
    start "" %EDGE_PATH% --kiosk-printing --user-data-dir=%KIOSK_DIR% --app=http://localhost:8080
    exit
) else (
    echo [ERROR] Neither Google Chrome nor Microsoft Edge was found.
    pause
)
