import express from "express";
import {
  predictDelay,
  getAllPredictions,
  deletePrediction,
} from "../controllers/prediction.controller.js";
import { validatePredictionInput } from "../middlewares/validate.js";
import { requireAuth } from "../middlewares/auth.js";

const router = express.Router();

// All prediction routes require authentication
router.use(requireAuth);

router.get("/", getAllPredictions);
router.post("/predict", validatePredictionInput, predictDelay);
router.delete("/:id", deletePrediction);

export default router;
