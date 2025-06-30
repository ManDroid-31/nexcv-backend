// Test script for AI generation endpoint
// Run with: node test-ai.js

const testAIGeneration = async () => {
    const baseUrl = "http://localhost:5000";

    console.log("🧪 Testing AI Generation Endpoint\n");

    // Test cases for different sections
    const testCases = [
        {
            section: "summary",
            input: "I am a software engineer with 3 years of experience at Google working on backend services and APIs. I specialize in Node.js, MongoDB, and cloud technologies.",
            description: "Professional Summary Generation",
        },
        {
            section: "experience",
            input: "Worked as a Senior Developer at TechCorp for 2 years. Led a team of 5 developers, improved application performance by 40%, and implemented CI/CD pipeline.",
            description: "Work Experience Enhancement",
        },
        {
            section: "skills",
            input: "I know JavaScript, React, Node.js, and have experience with cloud platforms. I also have good communication skills and can work in teams.",
            description: "Skills Suggestion",
        },
        {
            section: "projects",
            input: "Built an e-commerce platform using React and Node.js. Integrated payment processing, implemented user authentication, and deployed to AWS.",
            description: "Project Description Enhancement",
        },
    ];

    for (const testCase of testCases) {
        console.log(`📝 Testing: ${testCase.description}`);
        console.log(`Section: ${testCase.section}`);
        console.log(`Input: ${testCase.input.substring(0, 100)}...`);

        try {
            const response = await fetch(`${baseUrl}/api/ai/generate`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    section: testCase.section,
                    input: testCase.input,
                    resumeId: "507f1f77bcf86cd799439011", // Mock resume ID
                }),
            });

            const result = await response.json();

            if (response.ok) {
                console.log("✅ Success!");
                console.log(`Generated content: ${result.result.substring(0, 150)}...`);
            } else {
                console.log("❌ Error:", result.error);
                if (result.details) {
                    console.log("Details:", result.details);
                }
            }
        } catch (error) {
            console.log("❌ Network Error:", error.message);
        }

        console.log("---\n");

        // Wait a bit between requests to respect rate limits
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log("🎉 AI Generation Test Complete!");
};

// Test public resume endpoint
const testPublicResume = async () => {
    console.log("🔗 Testing Public Resume Endpoint\n");

    try {
        const response = await fetch("http://localhost:5000/api/public/test-resume");
        const result = await response.json();

        if (response.ok) {
            console.log("✅ Public resume found!");
            console.log(`Title: ${result.title}`);
            console.log(`Template: ${result.template}`);
            console.log(`Visibility: ${result.visibility}`);
        } else {
            console.log("❌ Public resume not found (expected for test)");
            console.log("Error:", result.error);
        }
    } catch (error) {
        console.log("❌ Network Error:", error.message);
    }

    console.log("---\n");
};

// Run tests
const runTests = async () => {
    console.log("🚀 Starting NexCV Backend Tests\n");

    // Test AI generation
    await testAIGeneration();

    // Test public resume
    await testPublicResume();

    console.log("✨ All tests completed!");
};

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runTests().catch(console.error);
}

export { testAIGeneration, testPublicResume };
