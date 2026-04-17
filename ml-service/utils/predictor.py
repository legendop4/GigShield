"""
predictor.py — Loads the trained model and exposes a predict() function.

The model is loaded once at startup to avoid disk I/O on every request.
"""

import joblib
import numpy as np
from pathlib import Path
from config import MODEL_PATH, FEATURE_COLUMNS

_model = None


def load_model():
    """Load the trained sklearn pipeline from disk into memory."""
    global _model
    model_path = Path(MODEL_PATH)
    if not model_path.exists():
        raise FileNotFoundError(
            f"Model file not found at '{model_path}'. "
            "Run 'python pipeline/train_model.py' first."
        )
    _model = joblib.load(model_path)
    print(f"Model loaded from {model_path}")


def predict_risk(features: dict) -> float:
    """
    Run inference on a single worker's feature dict.

    Args:
        features: dict with keys matching FEATURE_COLUMNS

    Returns:
        float risk score between 0.0 and 1.0
    """
    if _model is None:
        raise RuntimeError("Model is not loaded. Call load_model() at startup.")

    # Build feature vector in the exact column order used during training
    row = np.array([[features[col] for col in FEATURE_COLUMNS]])
    score = _model.predict(row)[0]

    # Clamp to [0,1] as a safety net
    return float(np.clip(score, 0.0, 1.0))
