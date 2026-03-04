import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import predictionRoutes from "./routes/prediction.routes.js";
import authRoutes from "./routes/auth.routes.js";
import errorHandler from "./middlewares/errorHandler.js";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const app = express();

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

app.use(cors());
app.use(express.json());

// Rate limiting — 100 requests per minute per IP
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

// Stricter limit for auth endpoints — 20 per minute
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many auth attempts, please try again later" },
});

// Health check
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// Auth routes (public, stricter rate limit)
app.use("/api/auth", authLimiter, authRoutes);

// Prediction routes (protected)
app.use("/api", apiLimiter, predictionRoutes);

// Global error handler (must be after routes)
app.use(errorHandler);

export default app;
