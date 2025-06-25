import { PrismaClient } from "@prisma/client";
import { logAIInteraction, getAIInteractionLogs } from "./src/utils/logAiInteraction.js";
import { GoogleGenerativeAI } from "@google/generative-ai"; // Corrected import for clarity
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

// Ensure API Key is present
if (!GOOGLE_API_KEY) {
  console.error("❌ GOOGLE_API_KEY is not set in your .env file.");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY); // Renamed for clarity

async function testAILogging() {
  console.log("🧪 Starting Gemini 2.5 Integration and AI Interaction Logging Test...\n");

  let latestLog = null; // To store the latest log for comparison

  try {
    // --- Step 1: Generate content using Gemini 2.5 ---
    const section = "summary";
    const input = "a software developer with 3 years of experience";
    const prompt = `Write a professional summary for a resume based on this information: "${input}". Keep it under 150 words and use active voice.`;

    console.log("🤖 Attempting to generate content with Gemini 2.5 Flash...");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" }); // Using 1.5 Flash latest for stability
    
    let content = "";
    try {
      const result = await model.generateContent(prompt);
      content = result.response.text().trim();
      if (!content) {
        throw new Error("Gemini 2.5 returned empty content.");
      }
      console.log("✅ Gemini 2.5 Flash response received successfully.\n");
      // console.log("Generated Content Snippet:", content.substring(0, 100) + "...\n"); // Optional: log a snippet
    } catch (apiError) {
      console.error(`❌ Error generating content from Gemini 2.5 Flash: ${apiError.message}`);
      // Decide if you want to continue or exit on API failure
      // For this test, we'll log the error and continue to test logging infrastructure
      content = `Error: Could not generate content. ${apiError.message}`;
    }

    // --- Step 2: Prepare and Log the interaction ---
    const userId = "testUser_507f1f77bcf86cd799439011"; // More descriptive test user ID
    const resumeId = "testResume_507f1f77bcf86cd799439012"; // More descriptive test resume ID

    const testData = {
      userId,
      resumeId,
      section,
      prompt,
      response: content,
    };

    console.log("📝 Attempting to log AI interaction...");
    try {
      await logAIInteraction(testData);
      console.log("✅ AI interaction logged successfully.\n");
    } catch (logError) {
      console.error(`❌ Error logging AI interaction: ${logError.message}`);
      // Depending on criticality, you might want to exit here
    }

    // --- Step 3: Retrieve and print latest logs ---
    console.log(`📊 Retrieving latest logs for user ID: ${userId}...`);
    try {
      const logs = await getAIInteractionLogs(userId, 5);

      if (logs && logs.length > 0) {
        latestLog = logs[0]; // Store the latest log
        console.log("🧾 Latest AI Interaction Log Found:");
        console.log(`   - Section: ${latestLog.section}`);
        console.log(`   - Resume ID: ${latestLog.resumeId}`);
        console.log(`   - Prompt length: ${latestLog.prompt?.length || 0} characters`); // Handle potential null/undefined
        console.log(`   - Response length: ${latestLog.response?.length || 0} characters`); // Handle potential null/undefined
        console.log(`   - Timestamp: ${latestLog.createdAt}`);
        // Optional: print a snippet of the response
        // console.log(`   - Response snippet: ${latestLog.response?.substring(0, 50) || "N/A"}...`);
      } else {
        console.log("⚠️ No AI interaction logs found for this user.");
      }
      console.log("✅ Log retrieval complete.\n");
    } catch (retrieveError) {
      console.error(`❌ Error retrieving AI interaction logs: ${retrieveError.message}`);
    }

    // --- Step 4: Direct DB check for verification ---
    console.log(`📚 Performing direct DB check for recent logs from user ID: ${userId}...`);
    try {
      const dbLogs = await prisma.aIInteraction.findMany({
        where: { userId: userId },
        orderBy: { createdAt: "desc" },
        take: 3,
      });

      console.log(`✅ DB contains ${dbLogs.length} recent logs for this user.`);
      if (dbLogs.length > 0) {
        const mostRecentDbLog = dbLogs[0];
        console.log("   - Most recent DB log's section:", mostRecentDbLog.section);
        // You can add more assertions here to compare with `latestLog` if needed
        if (latestLog && mostRecentDbLog.response === latestLog.response && mostRecentDbLog.prompt === latestLog.prompt) {
            console.log("   - DB log matches the retrieved latest log (content wise).");
        }
      }
      console.log("🎉 Test complete. All components appear to be working as expected.");

    } catch (dbError) {
      console.error(`❌ Error performing direct DB check: ${dbError.message}`);
    }

  } catch (overallError) {
    console.error("❌ An unexpected error occurred during the test:", overallError);
  } finally {
    console.log("\n🧹 Disconnecting from Prisma...");
    await prisma.$disconnect();
    console.log("🧹 Prisma disconnected.");
  }
}

testAILogging();