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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

app.use(authMiddleware); // Apply Clerk middleware globally

// Public routes
app.get("/", (req, res) => {
    res.send("NexCV Backend is live!");
});

app.get("/health", (req, res) => {
    res.send("NexCV Backend is healthy!");
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
const shutdown = async (signal) => {
    console.log(`\nReceived ${signal}, shutting down...`);
    await cacheService.disconnect();
    process.exit(0);
};
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
