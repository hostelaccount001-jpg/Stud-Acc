@echo off
title Mantra MFS100 Direct Web Bridge (Port 8032)
color 0B

echo ===================================================================
echo     MANTRA MFS100 NATIVE DIRECT WEB BRIDGE (PORT 8032)
echo ===================================================================
echo.
echo Starting Mantra MFS100 Native Bridge Service...
echo (Allows Web Browser and Kiosk on Vercel to directly capture fingerprints)
echo.

set "PS_PATH=C:\Windows\SysWOW64\WindowsPowerShell\v1.0\powershell.exe"
if not exist "%PS_PATH%" (
    set "PS_PATH=powershell.exe"
)

"%PS_PATH%" -ExecutionPolicy Bypass -File "%~dp0mantra_service.ps1"

pause
