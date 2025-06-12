import express from 'express';
// import { requireAuth } from '@clerk/express';
import { enhanceResume, scrapeProfile, autoFill } from '../controllers/ai.controller.js';

const router = express.Router();


//IMPORTANT AUTH DISABLED FOR NOW
// All routes require authentication
// router.use(requireAuth);

// sample route /api/ai

// Enhance resume content
router.post('/enhance-resume', enhanceResume);

// Scrape profile from URL
router.post('/scrape-profile', scrapeProfile);

// Auto-fill resume fields
router.post('/auto-fill', autoFill);

export default router; 