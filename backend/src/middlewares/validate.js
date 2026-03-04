/**
 * Validates the request body for the /predict endpoint.
 * Returns 400 with specific errors if input is invalid.
 */
export const validatePredictionInput = (req, res, next) => {
  const errors = [];
  const {
    distance_km,
    hour,
    day_of_week,
    prep_time_min,
    rider_load,
    weather_score,
  } = req.body;

  if (
    distance_km == null ||
    typeof distance_km !== "number" ||
    distance_km <= 0
  ) {
    errors.push("distance_km must be a positive number");
  }
  if (hour == null || !Number.isInteger(hour) || hour < 0 || hour > 23) {
    errors.push("hour must be an integer between 0 and 23");
  }
  if (
    day_of_week == null ||
    !Number.isInteger(day_of_week) ||
    day_of_week < 0 ||
    day_of_week > 6
  ) {
    errors.push("day_of_week must be an integer between 0 and 6");
  }
  if (
    prep_time_min == null ||
    !Number.isInteger(prep_time_min) ||
    prep_time_min < 1
  ) {
    errors.push("prep_time_min must be a positive integer");
  }
  if (rider_load == null || !Number.isInteger(rider_load) || rider_load < 0) {
    errors.push("rider_load must be a non-negative integer");
  }
  if (
    weather_score == null ||
    typeof weather_score !== "number" ||
    weather_score < 0 ||
    weather_score > 1
  ) {
    errors.push("weather_score must be a number between 0 and 1");
  }

  if (errors.length > 0) {
    return res
      .status(400)
      .json({ error: "Validation failed", details: errors });
  }

  next();
};
