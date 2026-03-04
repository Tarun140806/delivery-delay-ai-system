import { callAIService } from "../services/ai.service.js";
import Prediction from "../models/prediction.model.js";

export const predictDelay = async (req, res) => {
  try {
    const aiPrediction = await callAIService(req.body);

    const savedPrediction = await Prediction.create({
      user: req.userId,
      input_order: {
        distance_km: req.body.distance_km,
        hour: req.body.hour,
        day_of_week: req.body.day_of_week,
        prep_time_min: req.body.prep_time_min,
        rider_load: req.body.rider_load,
        weather_score: req.body.weather_score,
      },
      ai_prediction: {
        predicted_delay: aiPrediction.predicted_delay,
        predicted_probability: aiPrediction.delay_probability,
        risk_level: aiPrediction.risk_level,
      },
    });

    res.status(200).json({
      message: "Prediction successful",
      data: savedPrediction,
    });
  } catch (err) {
    console.error("Prediction Error:", err);
    res.status(500).json({
      error: "AI service not reachable",
    });
  }
};

export const getAllPredictions = async (req, res) => {
  try {
    const predictions = await Prediction.find({ user: req.userId }).sort({
      createdAt: -1,
    });
    res.status(200).json(predictions);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch predictions" });
  }
};

export const deletePrediction = async (req, res) => {
  try {
    const prediction = await Prediction.findOneAndDelete({
      _id: req.params.id,
      user: req.userId,
    });
    if (!prediction) {
      return res.status(404).json({ error: "Prediction not found" });
    }
    res.status(200).json({ message: "Prediction deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete prediction" });
  }
};
