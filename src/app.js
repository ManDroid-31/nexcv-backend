import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import process from "process";
import resumeRoutes from "./routes/resumes.routes.js";
import protectedRoute from "./routes/protected.js";
import aiRoutes from "./routes/ai.routes.js";
import { getPublicResume } from "./controllers/resume.controller.js";
import cacheService from "./services/cacheService.js";
import { authMiddleware } from "./middlewares/clerkAuth.middleware.js";
import creditsRoutes from "./routes/credits.routes.js";
import * as creditsController from "./controllers/credits.controller.js";
import pino from "pino";

const logger = pino({ level: process.env.LOG_LEVEL || "info" });

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || true }));
app.set("trust proxy", true);

// Stripe webhook route (must be before express.json)
app.post(
    "/api/credits/webhook",
    express.raw({ type: "application/json" }),
    creditsController.stripeWebhook
);

// Body parsers for all other routes
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(authMiddleware); // Apply Clerk middleware globally

// Public routes
app.get("/", (req, res) => {
    res.send("NexCV Backend is live!");
});

app.get("/health", (req, res) => {
    logger.info("Health check OK");
    res.json({ status: "ok" });
});

// Public resume route (no authentication required)
app.get("/api/public/:slug", getPublicResume);

// Protected routes
app.use("/api/resumes", resumeRoutes);
app.use("/api/ai", aiRoutes);

//custom route to serve as clerk backend working
app.use("/api/protected", protectedRoute);

// Connect to Redis
cacheService.connect().catch((err) => {
    console.error("Failed to connect to Redis:", err);
    process.exit(1);
});

// Graceful shutdown
const shutdown = (signal) => {
    logger.info(`Received ${signal}. Shutting down server...`);
    cacheService.disconnect().then(() => {
        logger.info("Cache disconnected");
        process.exit(0);
    });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// All other credits routes (except webhook)
app.use("/api/credits", creditsRoutes);

// added 0.0.0.0 for anywhere access, cuz somehow it should work
app.listen(PORT, "0.0.0.0", () => {
    logger.info(`Server running on port ${PORT}`);
});
