@echo off
cd /d "%~dp0"
set NEXT_TELEMETRY_DISABLED=1
call npm run dev
pause
