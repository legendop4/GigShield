"""
test_ml_service.py — Unit tests for the ML service.

Run with:
    pytest tests/test_ml_service.py -v

Tests run without a live server using FastAPI's TestClient.
The predictor is mocked so no trained model file is required.
"""

import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

# Patch the model loader before importing the app
with patch("utils.predictor.load_model"):
    from main import app

client = TestClient(app)

VALID_PAYLOAD = {
    "userId": "507f1f77bcf86cd799439011",
    "weather": 2,
    "traffic": 2,
    "pollution": 1,
    "history": 100,
    "isNewUser": False,
}


# ─────────────────────────────────────────────
# Health endpoint
# ─────────────────────────────────────────────
def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "model_loaded" in data
    assert "version" in data


# ─────────────────────────────────────────────
# /risk-score — validation
# ─────────────────────────────────────────────
def test_risk_score_missing_field():
    """Missing required fields should return 422."""
    payload = {k: v for k, v in VALID_PAYLOAD.items() if k != "userId"}
    response = client.post("/risk-score", json=payload)
    assert response.status_code == 422


def test_risk_score_invalid_weather():
    """Weather must be 1, 2, or 3."""
    payload = {**VALID_PAYLOAD, "weather": 5}
    response = client.post("/risk-score", json=payload)
    assert response.status_code == 422


def test_risk_score_negative_history():
    """History cannot be negative."""
    payload = {**VALID_PAYLOAD, "history": -1}
    response = client.post("/risk-score", json=payload)
    assert response.status_code == 422


# ─────────────────────────────────────────────
# /risk-score — model not loaded
# ─────────────────────────────────────────────
def test_risk_score_model_not_loaded():
    """Returns 503 if model is not loaded."""
    with patch("utils.predictor._model", None):
        response = client.post("/risk-score", json=VALID_PAYLOAD)
    assert response.status_code == 503


# ─────────────────────────────────────────────
# /risk-score — successful prediction
# ─────────────────────────────────────────────
def test_risk_score_success():
    """Returns risk_score in [0, 1] on valid input with loaded model."""
    mock_model = MagicMock()
    with patch("utils.predictor._model", mock_model):
        with patch("main.predict_risk", return_value=0.4231) as mock_predict:
            response = client.post("/risk-score", json=VALID_PAYLOAD)

    assert response.status_code == 200
    data = response.json()
    assert data["userId"] == VALID_PAYLOAD["userId"]
    assert 0.0 <= data["risk_score"] <= 1.0
    assert data["model_version"] == "1.0.0"


def test_risk_score_clamped():
    """Even if model returns >1, response is clamped to 1.0."""
    with patch("utils.predictor._model", MagicMock()):
        with patch("main.predict_risk", return_value=1.0):
            response = client.post("/risk-score", json=VALID_PAYLOAD)
    assert response.status_code == 200
    assert response.json()["risk_score"] <= 1.0


def test_risk_score_new_user():
    """New users (isNewUser=True, history=0) should compute correctly."""
    payload = {**VALID_PAYLOAD, "history": 0, "isNewUser": True}
    with patch("utils.predictor._model", MagicMock()):
        with patch("main.predict_risk", return_value=0.75):
            response = client.post("/risk-score", json=payload)
    assert response.status_code == 200
    assert response.json()["risk_score"] == 0.75
