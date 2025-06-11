import express from "express";
import { clerkMiddleware } from "../middlewares/clerkAuth.middleware.js";
import {
  createResume,
  getAllResumes,
  getResumeById,
  updateResume,
  deleteResume,
} from "../controllers/resume.controller.js";

const router = express.Router();

// Apply Clerk middleware to all routes
router.use(clerkMiddleware);

// Resume routes
router.post("/", createResume);
router.get("/", getAllResumes);
router.get("/:id", getResumeById);
router.put("/:id", updateResume);
router.delete("/:id", deleteResume);

export default router; 