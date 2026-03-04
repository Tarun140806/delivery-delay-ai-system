from fastapi import FastAPI
from pydantic import BaseModel
import joblib
import numpy as np
import os
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Delivery Delay Prediction API")

# CORS — allow backend to reach the AI service
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = os.path.join(os.path.dirname(__file__), "model.pkl")
model = joblib.load(MODEL_PATH)


@app.get("/health")
def health_check():
    return {"status": "ok", "model_loaded": model is not None}


# Define input schema
class OrderInput(BaseModel):
    distance_km: float
    hour: int
    day_of_week: int
    prep_time_min: int
    rider_load: int
    weather_score: float

@app.post("/predict")
def predict_delay(order: OrderInput):
    features = np.array([[
        order.distance_km,
        order.hour,
        order.day_of_week,
        order.prep_time_min,
        order.rider_load,
        order.weather_score
    ]])

    prediction = model.predict(features)[0]
    probability = model.predict_proba(features)[0][1]
    
    risk = "HIGH" if probability > 0.6 else "LOW"

    return {
        "predicted_delay": bool(prediction),
        "delay_probability": round(float(probability), 2),
        "risk_level": risk
    }
