import mongoose from "mongoose";

const PredictionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  input_order: {
    distance_km: Number,
    hour: Number,
    day_of_week: Number,
    prep_time_min: Number,
    rider_load: Number,
    weather_score: Number,
  },
  ai_prediction: {
    predicted_delay: Boolean,
    predicted_probability: Number,
    risk_level: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Prediction", PredictionSchema);
