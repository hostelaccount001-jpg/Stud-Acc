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

"C:\Windows\SysWOW64\WindowsPowerShell\v1.0\powershell.exe" -ExecutionPolicy Bypass -File "%~dp0mantra_service.ps1"

pause
