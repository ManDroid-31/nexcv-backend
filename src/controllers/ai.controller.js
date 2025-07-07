import { PrismaClient } from "@prisma/client";
import { logAIInteraction } from "../utils/logAiInteraction.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import cacheService from "../services/cacheService.js";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const DEFAULT_USER_ID = "507f1f77bcf86cd799439011";

const getUserId = (req) => {
    return req.auth()?.userId || DEFAULT_USER_ID;
};

// Get conversation history
async function getCachedConversationHistory(userId, conversationId, limit = 10) {
    const cached = await cacheService.getCachedConversationHistory(userId, conversationId);
    if (cached) {
        console.log("📦 Cached history retrieved");
        return cached.slice(0, limit);
    }

    console.log("🗄️ Fetching history from database");
    const logs = await prisma.aIInteraction.findMany({
        where: { userId, section: "chat" },
        orderBy: { createdAt: "desc" },
        take: limit,
    });

    await cacheService.cacheConversationHistory(userId, conversationId, logs);
    return logs;
}

// Generate AI response with enhanced error handling
async function generateAIResponse(prompt, modelType = "gemini-2.5-flash") {
    try {
        const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
        const model = genAI.getGenerativeModel({ model: modelType });

        const result = await model.generateContent(prompt);
        let content = await result.response.text();
        if (!content || !content.trim()) {
            content = "Sorry, I couldn't process your request right now. Please try again later.";
        }
        return content.trim();
    } catch (error) {
        console.error("AI generation error:", error);
        // Always return a fallback
        return "Sorry, I couldn't process your request right now. Please try again later.";
    }
}

// Filter AI response to remove conversational elements
function filterAIResponse(response) {
    if (!response) return "";

    let filtered = response
        .replace(/^(Okay|Sure|Here's|Based on|I've created).*?[.!?]\s*/gi, "")
        .replace(/(\*\*|__|\*|_|\[.*?\]|`.*?`)/g, "")
        .replace(/```.*?```/gs, "")
        .replace(/\([^)]*\)/g, "")
        .replace(/^\d+\.\s*|^[-*]\s*/gm, "")
        .replace(/Key improvements.*$/gis, "")
        .replace(/\n\s*\n/g, "\n")
        .replace(/\s+/g, " ")
        .trim();

    if (filtered.includes(".")) {
        const sentences = filtered.split(/[.!?]+/).filter((s) => s.trim().length > 10);
        if (sentences.length > 0) {
            filtered = sentences.slice(0, 3).join(". ") + ".";
        }
    }

    if (filtered.includes(",")) {
        filtered = filtered
            .split(",")
            .map((skill) => skill.trim())
            .filter((skill) => skill.length > 0)
            .join(", ");
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
            if (
                parsedData &&
                (parsedData.data || parsedData.personalInfo || parsedData.experience)
            ) {
                console.log("📄 Extracted resume data from AI response");
                return parsedData;
            }
        }

        // Also try to find JSON without code blocks
        const jsonWithoutBlocks = response.match(/\{[\s\S]*\}/);
        if (jsonWithoutBlocks) {
            const parsedData = JSON.parse(jsonWithoutBlocks[0]);
            if (
                parsedData &&
                (parsedData.data || parsedData.personalInfo || parsedData.experience)
            ) {
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

// Analyze job description for keyword matching
async function analyzeJobDescription(jobDescription) {
    if (!jobDescription) return [];

    const keywordPrompt = `Extract key skills and keywords from this job description for resume tailoring.
Return a comma-separated list of 8-12 skills and keywords.

JOB DESCRIPTION:
${jobDescription}

KEY SKILLS:`;

    const keywordsResult = await generateAIResponse(keywordPrompt);
    return filterAIResponse(keywordsResult)
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k.length > 0);
}

// Tailor resume for specific job
async function tailorResumeForJob(resume, jobDescription) {
    const keywords = await analyzeJobDescription(jobDescription);
    const tailorPrompt = `Tailor this resume to align with the job description keywords: ${keywords.join(", ")}.
Enhance the summary and experience to emphasize relevant skills and achievements.
Return only the enhanced summary and experience sections.

RESUME DATA:
${JSON.stringify(resume, null, 2)}

ENHANCED SUMMARY AND EXPERIENCE:`;

    const tailoredResult = await generateAIResponse(tailorPrompt);
    const tailoredData = filterAIResponse(tailoredResult).split("\n\n");
    return {
        summary: tailoredData[0] || resume.summary,
        experience: tailoredData.slice(1).map((exp, i) => ({
            ...resume.experience[i],
            description: exp.split("\n").filter((b) => b.trim().length > 10),
        })),
    };
}

// Optimize resume for ATS
async function optimizeATS(resume) {
    const atsPrompt = `Optimize this resume for ATS systems.
Ensure keywords are prominent, use standard section headings, and simplify formatting.
Return the optimized resume structure.

RESUME DATA:
${JSON.stringify(resume, null, 2)}

OPTIMIZED RESUME:`;

    const atsResult = await generateAIResponse(atsPrompt);
    return extractResumeDataFromResponse(atsResult) || resume;
}

// Enhanced resume endpoint with job tailoring and ATS optimization
export const enhanceResume = async (req, res) => {
    try {
        console.log("request for enhance resume");
        const { resume, jobDescription } = req.body;
        if (!resume) return res.status(400).json({ error: "Missing resume JSON" });

        const resumeHash = cacheService.generateResumeHash(resume);
        const cachedEnhanced = await cacheService.getCachedEnhancedResume(resumeHash);
        if (cachedEnhanced) {
            console.log("📦 Cached enhanced resume retrieved");
            return res.json({ enhanced: cachedEnhanced, cached: true, source: "redis" });
        }

        // ATS optimization
        let optimizedResume = await optimizeATS(resume);

        // Tailor for job description if provided
        if (jobDescription) {
            const tailoredData = await tailorResumeForJob(optimizedResume, jobDescription);
            optimizedResume = {
                ...optimizedResume,
                summary: tailoredData.summary,
                experience: tailoredData.experience,
            };
        }

        // Enhanced summary
        const summaryPrompt = `Create a professional summary (2-3 sentences) for this resume.
Focus on key achievements, skills, and career goals using industry-standard language.
Ensure ATS compatibility and correct errors.

RESUME DATA:
${JSON.stringify(optimizedResume, null, 2)}

PROFESSIONAL SUMMARY:`;

        const summaryResult = await generateAIResponse(summaryPrompt);
        const filteredSummary = filterAIResponse(summaryResult);

        // Enhanced skills
        const skillsPrompt = `Identify 8-12 relevant technical and soft skills from this resume.
Return a comma-separated list, prioritizing technical skills followed by soft skills.
Use standard industry terminology and correct misspellings.

RESUME DATA:
${JSON.stringify(optimizedResume, null, 2)}

SKILLS LIST:`;

        const skillsResult = await generateAIResponse(skillsPrompt);
        const skills = filterAIResponse(skillsResult)
            .split(",")
            .map((skill) => skill.trim())
            .filter((skill) => skill.length > 0);

        // Enhanced experience
        let enhancedExperience = [];
        if (optimizedResume.experience?.length > 0) {
            for (const exp of optimizedResume.experience) {
                const experiencePrompt = `Transform this work experience into 3-4 achievement-focused bullet points.
Use strong action verbs, quantifiable metrics, and industry-standard terminology.
Ensure ATS compatibility and correct errors.

EXPERIENCE DATA:
${JSON.stringify(exp, null, 2)}

ENHANCED BULLET POINTS:
- `;

                const expResult = await generateAIResponse(experiencePrompt);
                const expBullets = filterAIResponse(expResult)
                    .split("\n")
                    .filter((b) => b.trim().length > 10)
                    .slice(0, 4);
                enhancedExperience.push({ ...exp, description: expBullets });
            }
        }

        // Enhanced custom sections
        let enhancedCustomSections = [];
        if (optimizedResume.customSections?.length > 0) {
            for (const section of optimizedResume.customSections) {
                if (section.type === "string" && section.value) {
                    const customPrompt = `Enhance this custom section content to be professional and ATS-friendly.
Use industry-standard language and correct errors.

SECTION DATA:
${JSON.stringify(section, null, 2)}

ENHANCED CONTENT:`;

                    const customResult = await generateAIResponse(customPrompt);
                    enhancedCustomSections.push({
                        ...section,
                        value: filterAIResponse(customResult),
                    });
                } else if (section.type === "array-object" && section.value?.length > 0) {
                    const enhancedItems = [];
                    for (const item of section.value) {
                        const itemPrompt = `Enhance this custom section item to be professional and ATS-friendly.
Use strong action verbs and quantifiable achievements.

ITEM DATA:
${JSON.stringify(item, null, 2)}

ENHANCED ITEM:`;

                        const itemResult = await generateAIResponse(itemPrompt);
                        enhancedItems.push({ ...item, description: filterAIResponse(itemResult) });
                    }
                    enhancedCustomSections.push({ ...section, value: enhancedItems });
                } else {
                    enhancedCustomSections.push(section);
                }
            }
        }

        // Build enhanced resume
        const enhanced = {
            ...optimizedResume,
            summary: filteredSummary,
            skills,
            experience: enhancedExperience,
            customSections: enhancedCustomSections,
            data: {
                ...optimizedResume.data,
                summary: filteredSummary,
                skills,
                experience: enhancedExperience,
            },
        };

        await cacheService.cacheEnhancedResume(resumeHash, enhanced);
        console.log(JSON.stringify(enhanced));

        return res.json({
            enhanced,
            cached: false,
            source: "ai_generated",
            jobTailoring: !!jobDescription,
            atsOptimized: true,
        });
    } catch (error) {
        console.error("Error enhancing resume:", error);
        res.status(500).json({ error: "Failed to enhance resume", details: error.message });
    }
};

// Chat with AI
export const chatWithAI = async (req, res) => {
    try {
        const { message, conversationId, resume, jobDescription } = req.body;
        const userId = getUserId(req);

        if (!message) return res.status(400).json({ error: "Message required" });

        const history = await getCachedConversationHistory(userId, conversationId);
        const contextPrompt = `Resume Context:\n${compressResume(resume)}`;
        const jobContext = `Job Description:\n${compressJobDescription(jobDescription)}`;
        const historyContext = `Recent Conversation History:\n${compressHistory(history)}`;

        const fallbackInstruction = `
If you are unable to answer, always return a helpful, polite response. Never return an empty response. If you cannot answer, say: "Sorry, I couldn't process your request right now. Please try again later."
`;

        const aiPrompt = `
${contextPrompt}

${jobContext}

${historyContext}

${fallbackInstruction}

User: ${message.slice(0, 500)}

Assistant:
`;

        const aiResponse = await generateAIResponse(aiPrompt);
        const filteredResponse = filterAIResponse(aiResponse);
        const extractedData = extractResumeDataFromResponse(aiResponse);

        const logData = {
            userId,
            resumeId: resume?.id || "general",
            section: "chat",
            prompt: message,
            response: aiResponse,
        };

        await logAIInteraction(logData);

        const responseData = {
            response: filteredResponse,
            conversationId: conversationId || generateConversationId(),
            contextUsed: {
                hasResume: !!resume,
                hasJobDescription: !!jobDescription,
                historyLength: history.length,
                cached: false,
                source: "ai_generated",
            },
            ...(extractedData && { updatedResume: extractedData }),
        };

        res.json(responseData);
    } catch (error) {
        console.error("Error in AI chat:", error);
        res.status(500).json({ error: "Failed to get AI response", details: error.message });
    }
};

function generateConversationId() {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Get conversation history
export const getConversationHistory = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = getUserId(req);

        if (!conversationId) return res.status(400).json({ error: "Conversation ID required" });

        const logs = await getCachedConversationHistory(userId, conversationId, 50);

        res.json({
            conversation: logs,
            conversationId,
            cacheInfo: {
                redisConnected: cacheService.isConnected,
                cacheStats: await cacheService.getCacheStats(),
            },
        });
    } catch (error) {
        console.error("Error fetching history:", error);
        res.status(500).json({ error: "Failed to fetch history", details: error.message });
    }
};

// Clear cache
export const clearCache = async (req, res) => {
    try {
        const { pattern } = req.query;
        const result = pattern
            ? await cacheService.clearCachePattern(pattern)
            : await cacheService.clearAllCache();

        res.json({
            message: "Cache cleared",
            pattern: pattern || "all",
            success: result,
        });
    } catch (error) {
        console.error("Error clearing cache:", error);
        res.status(500).json({ error: "Failed to clear cache", details: error.message });
    }
};

// Get cache stats
export const getCacheStats = async (req, res) => {
    try {
        const stats = await cacheService.getCacheStats();
        res.json({ redisConnected: cacheService.isConnected, stats });
    } catch (error) {
        console.error("Error getting stats:", error);
        res.status(500).json({ error: "Failed to get stats", details: error.message });
    }
};

// Test normalization
export const testNormalization = async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt) return res.status(400).json({ error: "Prompt required" });

        const testResult = cacheService.testNormalization(prompt);
        res.json({
            test: testResult,
            examples: {
                "What are the best skills for my resume?": cacheService.testNormalization(
                    "What are the best skills for my resume?"
                ),
                "Suggest technical skills for my resume": cacheService.testNormalization(
                    "Suggest technical skills for my resume"
                ),
                "Help me write a summary":
                    cacheService.testNormalization("Help me write a summary"),
                "Can you create a professional summary?": cacheService.testNormalization(
                    "Can you create a professional summary?"
                ),
            },
        });
    } catch (error) {
        console.error("Error testing normalization:", error);
        res.status(500).json({ error: "Failed to test normalization", details: error.message });
    }
};

function compressResume(resume) {
    if (!resume) return "No resume provided.";
    // Only include key fields
    const { personalInfo, summary, skills, experience } = resume;
    return JSON.stringify({ personalInfo, summary, skills, experience }, null, 2);
}

function compressJobDescription(jobDescription) {
    if (!jobDescription) return "No job description provided.";
    // Truncate if too long
    return jobDescription.length > 500 ? jobDescription.slice(0, 500) + "..." : jobDescription;
}

function compressHistory(history, maxPairs = 3) {
    if (!history || !history.length) return "No history.";
    // Only last N pairs, truncate long messages
    return history
        .slice(0, maxPairs)
        .map(h => 
            `User: ${h.prompt.slice(0, 200)}\nAssistant: ${h.response.slice(0, 200)}`
        )
        .join("\n\n");
}
