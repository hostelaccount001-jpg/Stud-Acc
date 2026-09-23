@echo off
title Enable Microsoft Edge Silent Printing for Gurukul Kiosk
color 0A

:: Check for Administrator permissions and auto-elevate if needed
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Requesting Administrator privileges...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo ===================================================================
echo     ENABLE MICROSOFT EDGE 100%% SILENT PRINTING FOR GURUKUL KIOSK
echo ===================================================================
echo.
echo Applying Microsoft Edge Official Group Policies...
echo.

:: 1. Enable Silent Printing (System-wide HKLM + Current User HKCU)
reg add "HKLM\SOFTWARE\Policies\Microsoft\Edge" /v "SilentPrintingEnabled" /t REG_DWORD /d 1 /f
reg add "HKCU\SOFTWARE\Policies\Microsoft\Edge" /v "SilentPrintingEnabled" /t REG_DWORD /d 1 /f

:: 2. Allow Private Network Requests (for Mantra MFS100 on 127.0.0.1:8032)
reg add "HKLM\SOFTWARE\Policies\Microsoft\Edge" /v "InsecurePrivateNetworkRequestsAllowed" /t REG_DWORD /d 1 /f
reg add "HKCU\SOFTWARE\Policies\Microsoft\Edge" /v "InsecurePrivateNetworkRequestsAllowed" /t REG_DWORD /d 1 /f

:: 3. Allow Insecure Content for Vercel ERP domain
reg add "HKLM\SOFTWARE\Policies\Microsoft\Edge\InsecureContentAllowedForUrls" /v "1" /t REG_SZ /d "https://sgrsstud.vercel.app" /f
reg add "HKCU\SOFTWARE\Policies\Microsoft\Edge\InsecureContentAllowedForUrls" /v "1" /t REG_SZ /d "https://sgrsstud.vercel.app" /f

echo.
echo ===================================================================
echo   [SUCCESS] MICROSOFT EDGE SILENT PRINTING ENABLED!
echo   1. Edge will now print directly to default printer without ANY dialog.
echo   2. Works inside Windows Kiosk (Assigned Access) with Edge!
echo   3. Mantra scanner localhost connection is also permitted.
echo ===================================================================
echo.
pause
