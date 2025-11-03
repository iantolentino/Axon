@echo off
echo Starting Second Brain as Windows Service...
echo This will run in the background. Check logs in service.log

REM Run in background and log output
python production.py > service.log 2>&1 &
echo Service started. PID: %ERRORLEVEL%
echo Check logs with: tail -f service.log