@echo off
title Install Mantra MFS100 24x7 Silent Background Service
color 0A

echo ===================================================================
echo     INSTALL MANTRA MFS100 24x7 BACKGROUND AUTO-START SERVICE
echo ===================================================================
echo.
echo Setting up silent background service...
echo This ensures the Mantra scanner ALWAYS works automatically
echo without needing to keep any black CMD window open!
echo.

set "SCRIPT_DIR=%~dp0"
set "TARGET_VBS=%SCRIPT_DIR%Start-Mantra-Silent.vbs"
set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT_VBS=%STARTUP_FOLDER%\MantraMFS100AutoBridge.vbs"

if not exist "%TARGET_VBS%" (
    echo [ERROR] %TARGET_VBS% not found!
    pause
    exit /b 1
)

:: Create a lightweight startup launcher inside Windows Startup Folder
echo Set WshShell = CreateObject("WScript.Shell") > "%SHORTCUT_VBS%"
echo WshShell.Run """%TARGET_VBS%""", 0, False >> "%SHORTCUT_VBS%"

echo.
echo [OK] Added to Windows Startup Folder:
echo      "%SHORTCUT_VBS%"
echo.
echo Starting the background service right now...
wscript.exe "%TARGET_VBS%"

timeout /t 2 /nobreak >nul

echo.
echo Checking connection on Port 8032...
curl -s http://127.0.0.1:8032/mfs100/info >nul 2>&1
if %errorlevel% equ 0 (
    echo [SUCCESS] Mantra MFS100 Bridge is now RUNNING IN THE BACKGROUND!
) else (
    echo [NOTE] Background service started. Please make sure Mantra device is plugged into USB.
)

echo.
echo ===================================================================
echo   SETUP COMPLETED!
echo   1. The scanner will now run SILENTLY in the background 24x7.
echo   2. Whenever you restart or turn on this PC, it starts automatically!
echo   3. No CMD or black window will ever stay open on your screen.
echo ===================================================================
echo.
pause
