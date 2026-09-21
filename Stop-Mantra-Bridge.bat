@echo off
title Stop Mantra MFS100 Background Service
color 0C

echo ===================================================================
echo     STOP MANTRA MFS100 BACKGROUND SERVICE
echo ===================================================================
echo.

echo Stopping background Mantra PowerShell process...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8032"') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo [OK] Mantra Background Service has been stopped.
echo (Run Start-Mantra-Silent.vbs or Install-Mantra-AutoStart.bat to restart it).
echo.
pause
