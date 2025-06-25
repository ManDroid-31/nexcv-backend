import { PrismaClient } from "@prisma/client";
import { logAIInteraction } from "../utils/logAiInteraction.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import cacheService from "../services/cacheService.js";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const DEFAULT_USER_ID = "507f1f77bcf86cd799439011";

// Initialize cache service
cacheService.connect().catch(console.error);

const getUserId = (req) => {
    if (req.auth && req.auth.userId) return req.auth.userId;
    console.log("⚠️  No Clerk auth found, using default user ID for development");
    return DEFAULT_USER_ID;
};

// Get conversation history from cache or database
async function getCachedConversationHistory(userId, conversationId, limit = 10) {
    // Try Redis cache first
    const cached = await cacheService.getCachedConversationHistory(userId, conversationId);
    if (cached) {
        console.log("📦 Using Redis cached conversation history");
        return cached.slice(0, limit);
    }

    console.log("🗄️ Fetching conversation history from database");
    const logs = await prisma.aIInteraction.findMany({
        where: { 
            userId,
            section: "chat"
        },
        orderBy: { createdAt: "desc" },
        take: limit
    });

    // Cache the result in Redis
    await cacheService.cacheConversationHistory(userId, conversationId, logs);

    return logs;
}

// Simple chat endpoint for AI assistance
export const chatWithAI = async (req, res) => {
    try {
        const { message, conversationId, resume } = req.body;
        const userId = getUserId(req);

        if (!message) {
            return res.status(400).json({ error: "Message is required" });
        }

        // Get conversation history for context
        const history = await getCachedConversationHistory(userId, conversationId);

        // Generate AI response with context from resume and conversation history
        const aiResponse = await generateAIResponse(message, conversationId, resume, history);

        // Check if the response contains updated resume data and extract it
        const extractedData = extractResumeDataFromResponse(aiResponse);
        
        // Filter the response to remove conversational elements
        const filteredResponse = filterAIResponse(aiResponse);

        // Log the interaction
        const logData = {
            userId,
            resumeId: resume?.id || "general",
            section: "chat",
            prompt: message,
            response: aiResponse,
        };

        await logAIInteraction(logData);

        // Prepare response data
        const responseData = {
            response: filteredResponse,
            conversationId: conversationId || generateConversationId(),
            contextUsed: {
                hasResume: !!resume,
                historyLength: history.length,
                cached: false,
                source: "ai_generated"
            }
        };

        // Add extracted resume data if found
        if (extractedData) {
            responseData.updatedResume = extractedData;
        }

        res.json(responseData);
    } catch (error) {
        console.error("Error in AI chat:", error);
        res.status(500).json({ 
            error: "Failed to get AI response", 
            details: error.message 
        });
    }
};

async function generateAIResponse(message, conversationId, resume = null, history = []) {
    try {
        const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // Build context from resume
        let contextPrompt = "";
        if (resume) {
            contextPrompt = `
Current Resume Context:
${JSON.stringify(resume, null,2)}

Use this resume information to provide more specific and relevant advice.`;
        }

        // Build conversation history context
        let historyContext = "";
        if (history.length > 0) {
            const recentHistory = history.slice(0, 5); // Last 5 interactions
            historyContext = `
Recent Conversation History:
${recentHistory.map(h => `User: ${h.prompt}\nAssistant: ${h.response}`).join('\n\n')}

Use this conversation history to provide continuity and avoid repeating previous advice.`;
        }

        const systemPrompt = `You are a helpful AI assistant specializing in resume writing and career advice. 

Your role:
• Help users improve their resumes and career materials
• Ask clarifying questions when you need more information
• Provide specific, actionable advice
• Be friendly, professional, and encouraging
• Remember previous conversation context and build upon it

Guidelines:
• If the user's request is unclear, ask specific questions to understand better
• Provide concrete suggestions and examples
• Keep responses concise but helpful
• Focus on practical improvements
• If resume data is provided, use it to give more targeted advice
• Reference previous conversation context when relevant
• Don't repeat advice you've already given unless specifically asked

Current conversation ID: ${conversationId || 'new'}

${contextPrompt}

${historyContext}

Respond naturally and helpfully. If you need more information, ask specific questions.`;

        const fullPrompt = `${systemPrompt}

User: ${message}

Assistant:`;

        const result = await model.generateContent(fullPrompt);
        const content = await result.response.text();

        if (!content) throw new Error("AI returned empty response");

        return content.trim();
    } catch (error) {
        console.error("AI generation error:", error);
        throw new Error("AI service temporarily unavailable");
    }
}

function generateConversationId() {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Enhanced resume with caching
export const enhanceResume = async (req, res) => {
    try {
        const { resume } = req.body;
        if (!resume) return res.status(400).json({ error: "Missing resume JSON" });

        // Generate resume hash for caching
        const resumeHash = cacheService.generateResumeHash(resume);
        
        // Check cache first
        const cachedEnhanced = await cacheService.getCachedEnhancedResume(resumeHash);
        if (cachedEnhanced) {
            console.log("📦 Using cached enhanced resume");
            return res.json({
                enhanced: cachedEnhanced,
                cached: true,
                source: "redis"
            });
        }

        // Generate enhanced summary - ask for direct, final answer
        const summaryPrompt = `Create a compelling professional summary for this resume. Provide ONLY the final summary text, no explanations, options, or questions. Keep it concise (2-3 sentences) and professional.`;
        const summaryResult = await generateAIResponse(summaryPrompt, null, resume);
        const summary = filterAIResponse(summaryResult);

        // Generate enhanced skills - ask for direct list
        const skillsPrompt = `Based on this resume, suggest 8-12 relevant technical and soft skills. Return ONLY a comma-separated list of skills, no explanations or questions. Focus on: JavaScript, React, Node.js, MongoDB, AWS, Docker, and other relevant technologies.`;
        const skillsResult = await generateAIResponse(skillsPrompt, null, resume);
        const skills = filterAIResponse(skillsResult).split(",").map(skill => skill.trim()).filter(skill => skill.length > 0);

        // Generate enhanced experience if available
        let enhancedExperience = null;
        if (resume.data?.experience?.length > 0) {
            const experiencePrompt = `Transform this experience into 3-4 powerful resume bullet points. Return ONLY the bullet points, one per line, starting with action verbs. No explanations or questions. Focus on quantifiable achievements and impact.`;
            const experienceResult = await generateAIResponse(
                experiencePrompt,
                null,
                { data: { experience: resume.data.experience } }
            );
            enhancedExperience = filterAIResponse(experienceResult);
        }

        // Build the enhanced resume structure
        const enhanced = {
            ...resume,
            data: {
                ...resume.data,
                summary: summary,
                skills: skills,
                ...(enhancedExperience && { enhancedExperience }),
            },
        };

        // Cache the enhanced resume
        await cacheService.cacheEnhancedResume(resumeHash, enhanced);

        return res.json({ 
            enhanced,
            cached: false,
            source: "ai_generated"
        });
    } catch (error) {
        console.error("Error enhancing resume:", error);
        res.status(500).json({ error: "Failed to enhance resume", details: error.message });
    }
};

// Helper function to filter AI responses and extract clean content
function filterAIResponse(response) {
    if (!response) return "";
    
    // Remove common conversational elements
    let filtered = response
        .replace(/^(Okay|Sure|I can help|Based on your resume|Here are|Let me|To help you|Could you tell me|Let me know|Consider these questions|To give you better recommendations|Knowing this will help|To make these even stronger).*?[.!?]\s*/gi, "")
        .replace(/\*\*.*?\*\*/g, "") // Remove markdown bold
        .replace(/\*.*?\*/g, "") // Remove markdown italic
        .replace(/\[.*?\]/g, "") // Remove markdown links
        .replace(/\(.*?\)/g, "") // Remove parentheses content
        .replace(/Option \d+[:-]/gi, "") // Remove option labels
        .replace(/Key improvements.*$/gis, "") // Remove explanations
        .replace(/To help me fine-tune.*$/gis, "") // Remove follow-up questions
        .replace(/What types of roles.*$/gis, "") // Remove questions
        .replace(/What was the impact.*$/gis, "") // Remove questions
        .replace(/What specific technologies.*$/gis, "") // Remove questions
        .replace(/Can you provide.*$/gis, "") // Remove questions
        .replace(/To make these even stronger.*$/gis, "") // Remove questions
        .replace(/\n\s*\n/g, "\n") // Remove extra line breaks
        .trim();
    
    // If the response is still too long, take only the first meaningful paragraph
    const lines = filtered.split('\n').filter(line => line.trim().length > 0);
    if (lines.length > 1) {
        // Take the first substantial line that's not a question or explanation
        for (let line of lines) {
            line = line.trim();
            if (line.length > 20 && 
                !line.toLowerCase().includes('what') && 
                !line.toLowerCase().includes('how') && 
                !line.toLowerCase().includes('could you') &&
                !line.toLowerCase().includes('to help') &&
                !line.toLowerCase().includes('consider')) {
                return line;
            }
        }
    }
    
    return filtered;
}

// Helper function to extract JSON data from AI responses
function extractResumeDataFromResponse(response) {
    if (!response) return null;
    
    try {
        // Look for JSON code blocks in the response
        const jsonMatch = response.match(/```json\s*(\{[\s\S]*?\})\s*```/);
        if (jsonMatch) {
            const jsonString = jsonMatch[1];
            const parsedData = JSON.parse(jsonString);
            
            // Validate that it looks like resume data
            if (parsedData && (parsedData.data || parsedData.personalInfo || parsedData.experience)) {
                console.log("📄 Extracted resume data from AI response");
                return parsedData;
            }
        }
        
        // Also try to find JSON without code blocks
        const jsonWithoutBlocks = response.match(/\{[\s\S]*\}/);
        if (jsonWithoutBlocks) {
            const parsedData = JSON.parse(jsonWithoutBlocks[0]);
            if (parsedData && (parsedData.data || parsedData.personalInfo || parsedData.experience)) {
                console.log("📄 Extracted resume data from AI response (no code blocks)");
                return parsedData;
            }
        }
        
        return null;
    } catch (error) {
        console.log("❌ Failed to extract JSON from AI response:", error.message);
        return null;
    }
}

// Get conversation history (optional feature)
export const getConversationHistory = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = getUserId(req);

        if (!conversationId) {
            return res.status(400).json({ error: "Conversation ID is required" });
        }

        const logs = await getCachedConversationHistory(userId, conversationId, 50);

        res.json({ 
            conversation: logs,
            conversationId,
            cacheInfo: {
                redisConnected: cacheService.isConnected,
                cacheStats: await cacheService.getCacheStats()
            }
        });
    } catch (error) {
        console.error("Error fetching conversation history:", error);
        res.status(500).json({ 
            error: "Failed to fetch conversation history", 
            details: error.message 
        });
    }
};

// Clear cache endpoint (for admin/debugging)
export const clearCache = async (req, res) => {
    try {
        const { pattern } = req.query;
        
        let result;
        if (pattern) {
            result = await cacheService.clearCachePattern(pattern);
        } else {
            result = await cacheService.clearAllCache();
        }
        
        res.json({ 
            message: "Cache cleared successfully",
            pattern: pattern || "all",
            success: result
        });
    } catch (error) {
        console.error("Error clearing cache:", error);
        res.status(500).json({ 
            error: "Failed to clear cache", 
            details: error.message 
        });
    }
};

// Get cache statistics
export const getCacheStats = async (req, res) => {
    try {
        const stats = await cacheService.getCacheStats();
        
        res.json({ 
            redisConnected: cacheService.isConnected,
            stats
        });
    } catch (error) {
        console.error("Error getting cache stats:", error);
        res.status(500).json({ 
            error: "Failed to get cache stats", 
            details: error.message 
        });
    }
};

// Test prompt normalization and fuzzy matching
export const testNormalization = async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const testResult = cacheService.testNormalization(prompt);
    
    res.json({
      test: testResult,
      examples: {
        "What are the best skills for my resume?": cacheService.testNormalization("What are the best skills for my resume?"),
        "Suggest technical skills for my resume": cacheService.testNormalization("Suggest technical skills for my resume"),
        "Help me write a summary": cacheService.testNormalization("Help me write a summary"),
        "Can you create a professional summary?": cacheService.testNormalization("Can you create a professional summary?")
      }
    });
  } catch (error) {
    console.error("Error testing normalization:", error);
    res.status(500).json({ 
      error: "Failed to test normalization", 
      details: error.message 
    });
  }
};
