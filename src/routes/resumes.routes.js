import express from "express";
// import { authMiddleware as  clerkMiddleware } from "../middlewares/clerkAuth.middleware.js";
import {
    createResume,
    getAllResumes,
    getResumeById,
    updateResume,
    deleteResume,
    fetchLinkedInResume,
} from "../controllers/resume.controller.js";
import { resumeRateLimiter } from "../middlewares/rateLimit.middleware.js";
const { requireCredits } = require("../middlewares/requireCredits");

const router = express.Router();

// IMPORTANT AUTH DISABLED FOR NOW
// TODO: When integrating Clerk, uncomment the next line to enable authentication
// router.use(clerkMiddleware);

// Apply rate limiting to resume operations
router.use(resumeRateLimiter);

//endpoints are /api/resumes/
// Resume routes
router.post("/", createResume);
router.get("/", getAllResumes);
router.get("/:id", getResumeById);
router.put("/:id", updateResume);
router.delete("/:id", deleteResume);

// Fetch LinkedIn data and format as resume
router.post('/fetch-linkedin', requireCredits(7, 'linkedin-fetch'), fetchLinkedInResume);

export default router;
