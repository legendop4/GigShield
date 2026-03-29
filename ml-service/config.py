import os
from dotenv import load_dotenv

load_dotenv()

# Server
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", 8000))

# Model
MODEL_PATH = os.getenv("MODEL_PATH", "models/risk_model.joblib")

# Feature order must match training
FEATURE_COLUMNS = ["weather", "traffic", "pollution", "history", "isNewUser"]
