@echo off
title Mantra MFS100 Scanner Diagnostic Tool
color 0B

set "PS_PATH=C:\Windows\SysWOW64\WindowsPowerShell\v1.0\powershell.exe"
if not exist "%PS_PATH%" (
    set "PS_PATH=powershell.exe"
)

"%PS_PATH%" -ExecutionPolicy Bypass -File "%~dp0diagnose.ps1"

pause
