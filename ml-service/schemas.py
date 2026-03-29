from pydantic import BaseModel, Field
from typing import Optional


class RiskScoreRequest(BaseModel):
    """
    Exact payload the Node.js backend sends to POST /risk-score.
    Matches the mlPayload object built in riskController.js.
    """
    userId: str = Field(..., description="MongoDB ObjectId of the worker")
    weather: int = Field(..., ge=1, le=3, description="1=clear, 2=rain, 3=storm")
    traffic: int = Field(..., ge=1, le=3, description="1=low, 2=moderate, 3=heavy")
    pollution: int = Field(..., ge=1, le=3, description="1=low, 2=medium, 3=high")
    history: int = Field(..., ge=0, description="Total activity count for this user")
    isNewUser: bool = Field(..., description="True if history == 0")


class RiskScoreResponse(BaseModel):
    """
    Response returned to Node.js. Must include risk_score as a float.
    """
    userId: str
    risk_score: float = Field(..., ge=0.0, le=1.0, description="Predicted risk score (0=safe, 1=high risk)")
    model_version: str = "1.0.0"


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    version: str
