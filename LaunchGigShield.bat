@echo off
title GigShield Multi-Service Launcher

echo Starting React Frontend...
start "GigShield React Frontend" powershell -NoExit -Command "cd frontend; npm install; npm run dev"

echo Starting Express Core & Trigger Engine...
start "GigShield Node.js Backend" powershell -NoExit -Command "npm install; echo Seeding Atlas Database...; node backend/seed_demo_accounts.js; npm run dev"

echo Starting Python XGBoost AI Engine...
start "GigShield Python ML Service" cmd /k "cd ml-service && (if not exist venv python -m venv venv) && call venv\Scripts\activate.bat && pip install -r requirements.txt && uvicorn main:app --host 0.0.0.0 --port 8000"

echo All services are launching in separate windows!
