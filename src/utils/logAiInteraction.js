import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

/**
 * Logs an AI interaction for a given user
 * @param {Object} params - The interaction parameters
 * @param {string} params.userId - The user ID
 * @param {string} params.resumeId - The resume ID
 * @param {string} params.section - The resume section being edited
 * @param {string} params.prompt - The prompt sent to OpenAI
 * @param {string} params.response - The AI's response
 */
export async function logAIInteraction({ userId, resumeId, section, prompt, response }) {
  try {
    await prisma.aIInteraction.create({
      data: {
        userId,
        resumeId,
        section,
        prompt,
        response,
      },
    });
    console.log(`✅ AI interaction logged for user ${userId}, section: ${section}`);
  } catch (error) {
    console.error("❌ Failed to log AI interaction:", error.message);
    // Don't throw error to avoid breaking the main flow
  }
}

/**
 * Retrieves AI interaction logs for a specific user
 * @param {string} userId - The user ID
 * @param {number} limit - Maximum number of logs to return (default: 50)
 * @returns {Array} Array of AI interaction logs
 */
export async function getAIInteractionLogs(userId, limit = 50) {
  try {
    const logs = await prisma.aIInteraction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return logs;
  } catch (error) {
    console.error("❌ Failed to fetch AI interaction logs:", error.message);
    throw error;
  }
}

/**
 * Retrieves AI interaction logs for a specific resume
 * @param {string} resumeId - The resume ID
 * @param {number} limit - Maximum number of logs to return (default: 50)
 * @returns {Array} Array of AI interaction logs
 */
export async function getResumeAIInteractionLogs(resumeId, limit = 50) {
  try {
    const logs = await prisma.aIInteraction.findMany({
      where: { resumeId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return logs;
  } catch (error) {
    console.error("❌ Failed to fetch resume AI interaction logs:", error.message);
    throw error;
  }
} 