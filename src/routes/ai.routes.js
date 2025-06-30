import express from 'express';
// import { requireAuth } from '@clerk/express';
import { authMiddleware as  clerkMiddleware } from "../middlewares/clerkAuth.middleware.js";
import { 
    chatWithAI,
    getConversationHistory,
    clearCache,
    getCacheStats,
    enhanceResume,
    testNormalization
} from '../controllers/ai.controller.js';
import { aiRateLimiter } from '../middlewares/rateLimit.middleware.js';
import { getAIInteractionLogs, getResumeAIInteractionLogs } from '../utils/logAiInteraction.js';
import requireCredits from '../middlewares/requireCredits.js';

const router = express.Router();

//IMPORTANT AUTH DISABLED FOR NOW
// TODO: When integrating Clerk, uncomment the next line to enable authentication
router.use(clerkMiddleware);

// Apply rate limiting to all AI routes
router.use(aiRateLimiter);



// here user can send message also
// Simple AI chat endpoint
router.post('/chat', requireCredits(1, 'chat-with-ai-cost'), chatWithAI);


// here userrr cant send message he just clicks this button and call is made
// Enhance resume with caching
router.post('/enhance-resume', requireCredits(1, 'enhance-resume-cost'), enhanceResume);




// Get conversation history
router.get('/conversation/:conversationId', getConversationHistory);

// Cache management endpoints
router.delete('/cache', clearCache);
router.get('/cache/stats', getCacheStats);

// Test fuzzy matching and normalization
router.post('/test-normalization', testNormalization);

// Debug endpoint for JSON parsing issues
router.post('/debug-json', (req, res) => {
    console.log('=== DEBUG JSON PARSING ===');
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Raw body length:', req.body ? Object.keys(req.body).length : 'No body');
    console.log('Body keys:', req.body ? Object.keys(req.body) : 'No body');
    console.log('Body type:', typeof req.body);
    console.log('Body preview:', JSON.stringify(req.body, null, 2).substring(0, 500));
    console.log('========================');
    
    res.json({
        success: true,
        message: 'Request received and logged',
        bodyType: typeof req.body,
        bodyKeys: req.body ? Object.keys(req.body) : [],
        contentType: req.headers['content-type']
    });
});

// Admin routes for AI interaction logs
// Get AI interaction logs for a specific user
router.get('/admin/logs/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const limit = parseInt(req.query.limit) || 50;
        
        const logs = await getAIInteractionLogs(userId, limit);
        res.json({ 
            success: true, 
            logs,
            count: logs.length,
            userId 
        });
    } catch (error) {
        console.error("Error fetching user AI logs:", error);
        res.status(500).json({ 
            error: "Failed to fetch AI logs",
            details: error.message 
        });
    }
});

// Get AI interaction logs for a specific resume
router.get('/admin/logs/resume/:resumeId', async (req, res) => {
    try {
        const { resumeId } = req.params;
        const limit = parseInt(req.query.limit) || 50;
        
        const logs = await getResumeAIInteractionLogs(resumeId, limit);
        res.json({ 
            success: true, 
            logs,
            count: logs.length,
            resumeId 
        });
    } catch (error) {
        console.error("Error fetching resume AI logs:", error);
        res.status(500).json({ 
            error: "Failed to fetch AI logs",
            details: error.message 
        });
    }
});

export default router; 