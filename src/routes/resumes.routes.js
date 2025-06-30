import express from "express";
import clerkHeaderAuth from "../middlewares/clerkHeaderAuth.middleware.js";
import {
    createResume,
    getAllResumes,
    getResumeById,
    updateResume,
    deleteResume,
    fetchLinkedInResume,
} from "../controllers/resume.controller.js";
import { resumeRateLimiter } from "../middlewares/rateLimit.middleware.js";
import requireCredits from "../middlewares/requireCredits.js";
const router = express.Router();

// Apply rate limiting to resume operations
router.use(resumeRateLimiter);

//endpoints are /api/resumes/
// Resume routes
router.post("/", clerkHeaderAuth, createResume);
router.get("/", clerkHeaderAuth, getAllResumes);
// Public route: no auth
router.get("/:id", getResumeById);
router.put("/:id", clerkHeaderAuth, updateResume);
router.delete("/:id", clerkHeaderAuth, deleteResume);

// Fetch LinkedIn data and format as resume
router.post('/fetch-linkedin', clerkHeaderAuth, requireCredits(7, 'linkedin-fetch'), fetchLinkedInResume);

export default router;
