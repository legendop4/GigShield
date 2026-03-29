"""
main.py — GigShield AI ML Service
FastAPI application exposing the risk scoring endpoint.

Endpoints:
    GET  /health         → Service health + model status
    POST /risk-score     → Predict risk score for a gig worker

Run:
    uvicorn main:app --reload --host 0.0.0.0 --port 8000
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from schemas import RiskScoreRequest, RiskScoreResponse, HealthResponse
from utils.predictor import load_model, predict_risk
from config import HOST, PORT


# ─────────────────────────────────────────────
# Lifespan: load model once at startup
# ─────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load the ML model into memory when the server starts."""
    try:
        load_model()
    except FileNotFoundError as e:
        print(f"⚠️  WARNING: {e}")
        print("   The service will start but /risk-score will return 503 until model is trained.")
    yield
    # Cleanup on shutdown (if needed)
    print("🛑 ML Service shutting down.")


# ─────────────────────────────────────────────
# App
# ─────────────────────────────────────────────
app = FastAPI(
    title="GigShield AI — ML Risk Scoring Service",
    description="Predicts parametric risk scores for gig workers based on environmental and activity features.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Lock down in production
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────
# Health Check
# ─────────────────────────────────────────────
_model_loaded = False

@app.on_event("startup")
async def set_model_flag():
    """Track whether the model loaded successfully."""
    global _model_loaded
    try:
        from utils.predictor import _model
        _model_loaded = _model is not None
    except Exception:
        _model_loaded = False


@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """Returns service health status and whether the ML model is ready."""
    from utils.predictor import _model
    return HealthResponse(
        status="ok",
        model_loaded=_model is not None,
        version="1.0.0",
    )


# ─────────────────────────────────────────────
# Risk Score Endpoint
# ─────────────────────────────────────────────
@app.post("/risk-score", response_model=RiskScoreResponse, tags=["Risk Scoring"])
async def compute_risk_score(payload: RiskScoreRequest):
    """
    Accepts worker environmental features from the Node.js backend,
    runs inference via the trained GradientBoostingRegressor,
    and returns a risk_score between 0.0 (safe) and 1.0 (high risk).
    
    Called by: POST /api/risk/score/:userId in the Express backend.
    """
    from utils.predictor import _model
    if _model is None:
        raise HTTPException(
            status_code=503,
            detail="ML model is not loaded. Run 'python pipeline/train_model.py' first."
        )

    features = {
        "weather":   payload.weather,
        "traffic":   payload.traffic,
        "pollution": payload.pollution,
        "history":   payload.history,
        "isNewUser": int(payload.isNewUser),
    }

    try:
        score = predict_risk(features)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

    return RiskScoreResponse(
        userId=payload.userId,
        risk_score=round(score, 4),
    )
