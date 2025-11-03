@echo off
echo 🚀 Starting Second Brain Deployment on Windows...

REM Load environment variables
if exist .env.production (
    for /f "tokens=1,2 delims==" %%A in (.env.production) do (
        set %%A=%%B
    )
)

REM Install dependencies
echo 📦 Installing dependencies...
pip install -r requirements.txt

REM Create data directory if it doesn't exist
if not exist data mkdir data

REM Run production server
echo ✅ Starting production server...
echo 📊 Your Second Brain will be available at: http://localhost:5000
echo 🛑 Press Ctrl+C to stop the server
python production.py