import express from "express";
// import { authMiddleware as  clerkMiddleware } from "../middlewares/clerkAuth.middleware.js";
import {
    createResume,
    getAllResumes,
    getResumeById,
    updateResume,
    deleteResume,
} from "../controllers/resume.controller.js";

const router = express.Router();

// IMPORTANT AUTH DISABLED FOR NOW
// Apply Clerk middleware to all routes
// router.use(clerkMiddleware);


//endpoints are /api/resumes/
// Resume routes
router.post("/", createResume);
router.get("/", getAllResumes);
router.get("/:id", getResumeById);
router.put("/:id", updateResume);
router.delete("/:id", deleteResume);

export default router;
