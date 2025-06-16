@echo off
REM 簡單的Windows通知腳本
REM 參數: %1=標題 %2=訊息

if "%~1"=="" (
    echo 使用方法: simple-notify.cmd "標題" "訊息"
    exit /b 1
)

set "title=%~1"
set "message=%~2"

REM 使用PowerShell顯示通知
powershell -NoProfile -ExecutionPolicy Bypass -Command "& {Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show('%message%', 'Smart Tasks: %title%', 'OK', 'Information')}"

echo 通知已發送: %title%