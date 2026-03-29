"""
train_model.py — Run this ONCE to generate the risk_model.joblib file.

Usage:
    python pipeline/train_model.py

This script:
 1. Generates synthetic gig worker training data
 2. Trains a GradientBoostingRegressor
 3. Saves the model to models/risk_model.joblib
"""

import os
import numpy as np
import joblib
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error

FEATURE_COLUMNS = ["weather", "traffic", "pollution", "history", "isNewUser"]
MODEL_OUT = os.path.join(os.path.dirname(__file__), '..', 'models', 'risk_model.joblib')

def generate_training_data(n_samples: int = 5000):
    """
    Synthetic data mimicking real gig-worker risk factors.
    Risk score logic:
      - storm + heavy traffic + high pollution → high risk
      - new users with no history → slightly elevated
      - experienced workers in clear weather → low risk
    """
    np.random.seed(42)

    weather   = np.random.randint(1, 4, n_samples)    # 1=clear, 2=rain, 3=storm
    traffic   = np.random.randint(1, 4, n_samples)    # 1=low, 2=moderate, 3=heavy
    pollution = np.random.randint(1, 4, n_samples)    # 1=low, 2=medium, 3=high
    history   = np.random.randint(0, 500, n_samples)  # activity count
    is_new    = (history == 0).astype(int)

    # Construct risk score as a weighted combination + noise
    risk = (
        (weather   / 3.0) * 0.30 +
        (traffic   / 3.0) * 0.25 +
        (pollution / 3.0) * 0.15 +
        (1.0 - np.clip(history / 200.0, 0, 1)) * 0.20 +
        is_new * 0.10 +
        np.random.normal(0, 0.03, n_samples)
    )
    risk = np.clip(risk, 0.0, 1.0)

    X = np.column_stack([weather, traffic, pollution, history, is_new])
    y = risk
    return X, y


def train():
    print("📊 Generating synthetic training data...")
    X, y = generate_training_data()
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    pipeline = Pipeline([
        ('scaler', StandardScaler()),
        ('model', GradientBoostingRegressor(
            n_estimators=200,
            learning_rate=0.05,
            max_depth=4,
            subsample=0.8,
            random_state=42
        ))
    ])

    print("🤖 Training GradientBoostingRegressor...")
    pipeline.fit(X_train, y_train)

    y_pred = pipeline.predict(X_test)
    rmse = mean_squared_error(y_test, y_pred, squared=False)
    print(f"✅ Training complete. Test RMSE: {rmse:.4f}")

    os.makedirs(os.path.dirname(MODEL_OUT), exist_ok=True)
    joblib.dump(pipeline, MODEL_OUT)
    print(f"💾 Model saved to: {MODEL_OUT}")


if __name__ == "__main__":
    train()
