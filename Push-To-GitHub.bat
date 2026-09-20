@echo off
title Push Stud-Acc Kiosk ERP to GitHub
echo ========================================================
echo Pushing Gurukul Kiosk ERP to GitHub:
echo https://github.com/hostelaccount001-jpg/Stud-Acc.git
echo ========================================================
echo.
cd /d "%~dp0"
git remote set-url origin https://github.com/hostelaccount001-jpg/Stud-Acc.git
git branch -M main
git push -u origin main
echo.
echo ========================================================
echo Completed!
echo ========================================================
pause
