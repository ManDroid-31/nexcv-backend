const testJSON = `{
    "resume": {
        "id": "685653db11ffe5d90c2e719c",
        "userId": "507f1f77bcf86cd799439011",
        "title": "Senior Software Engineer Resume Manas",
        "slug": "senior-software-engineer-resume-manas",
        "data": {
            "personalInfo": {
                "name": "Jane Doe",
                "email": "jane.doe@example.com",
                "phone": "+1 (555) 123-4567",
                "location": "San Francisco, CA",
                "website": "https://janedoe.dev",
                "linkedin": "https://linkedin.com/in/janedoe",
                "github": "https://github.com/janedoe"
            },
            "summary": "Results-driven engineer with 5+ years of experience in scalable web applications.",
            "experience": [
                {
                    "id": "exp-1",
                    "company": "Tech Corp",
                    "position": "Senior Software Engineer",
                    "location": "San Francisco, CA",
                    "startDate": "2022-01",
                    "endDate": "2024-01",
                    "current": false,
                    "description": "Led development of key features for the main product.",
                    "achievements": [
                        "Improved application performance by 40%",
                        "Mentored 3 junior developers",
                        "Implemented CI/CD pipeline"
                    ]
                }
            ],
            "education": [
                {
                    "id": "edu-1",
                    "institution": "University of Technology",
                    "degree": "Bachelor of Science",
                    "field": "Computer Science",
                    "startDate": "2018-09",
                    "endDate": "2022-05",
                    "current": false,
                    "gpa": "3.8",
                    "description": "Relevant coursework: Data Structures, Algorithms, Software Engineering"
                }
            ],
            "skills": [
                "JavaScript",
                "React",
                "Node.js",
                "MongoDB",
                "AWS",
                "Docker"
            ],
            "projects": [
                {
                    "id": "proj-1",
                    "name": "E-commerce Platform",
                    "description": "Full-stack e-commerce application with payment integration",
                    "url": "https://github.com/janedoe/ecommerce",
                    "technologies": [
                        "React",
                        "Node.js",
                        "Stripe",
                        "MongoDB"
                    ],
                    "startDate": "2023-01",
                    "endDate": "2023-06"
                }
            ],
            "customSections": [
                {
                    "id": "custom-1",
                    "title": "Certifications",
                    "content": {
                        "items": [
                            {
                                "name": "AWS Certified Developer",
                                "date": "2023"
                            },
                            {
                                "name": "Google Cloud Professional",
                                "date": "2022"
                            }
                        ]
                    }
                }
            ],
            "sectionOrder": [
                "personalInfo",
                "summary",
                "experience",
                "education",
                "skills",
                "projects",
                "customSections"
            ],
            "layout": {
                "margins": {
                    "top": 20,
                    "bottom": 20,
                    "left": 20,
                    "right": 20
                },
                "spacing": 1.2,
                "scale": 1
            },
            "tags": [
                "full-stack",
                "react",
                "node.js",
                "aws"
            ]
        },
        "template": "modern",
        "visibility": "private",
        "createdAt": "2025-06-21T06:40:27.624Z",
        "updatedAt": "2025-06-21T07:08:15.712Z"
    }
}`;

try {
    const parsed = JSON.parse(testJSON);
    console.log("✅ JSON is valid!");
    console.log("Parsed object keys:", Object.keys(parsed));
    console.log("Resume ID:", parsed.resume.id);
    console.log("Resume title:", parsed.resume.title);
} catch (error) {
    console.error("❌ JSON parsing error:", error.message);
    console.error("Error at position:", error.message.match(/position (\d+)/)?.[1]);

    // Show the character at the error position
    const position = parseInt(error.message.match(/position (\d+)/)?.[1]) || 0;
    console.error("Character at position", position, ":", JSON.stringify(testJSON[position]));
    console.error(
        "Context around position:",
        testJSON.substring(Math.max(0, position - 10), position + 10)
    );
}
