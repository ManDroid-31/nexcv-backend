//below are not used currently but will be used in future
// import { PrismaClient } from "@prisma/client";

// const prisma = new PrismaClient();

export const enhanceResume = async (req, res) => {
    try {
        const { resume } = req.body;

        if (!resume) {
            return res.status(400).json({ error: 'Missing resume JSON' });
        }

        // Simulated AI result
        const enhanced = {
            ...resume,
            sections: {
                ...resume.sections,
                summary: {
                    ...resume.sections.summary,
                    content: "Results-driven Full-Stack Developer with a passion for building scalable web applications. Experienced in modern JavaScript frameworks and backend technologies. Strong problem-solving skills and a commitment to writing clean, maintainable code."
                },
                skills: {
                    ...resume.sections.skills,
                    items: [
                        ...resume.sections.skills.items,
                        {
                            id: "enhanced-skill-1",
                            visible: true,
                            name: "System Design",
                            description: "Architecting scalable applications",
                            level: 4,
                            keywords: ["Architecture", "Scalability"]
                        },
                        {
                            id: "enhanced-skill-2",
                            visible: true,
                            name: "TypeScript",
                            description: "Type-safe JavaScript development",
                            level: 4,
                            keywords: ["Type Safety", "JavaScript"]
                        }
                    ]
                }
            }
        };

        return res.json({ enhanced });
    } catch (error) {
        console.error("Error enhancing resume:", error);
        res.status(500).json({ 
            error: "Failed to enhance resume",
            details: error.message 
        });
    }
};

export const scrapeProfile = async (req, res) => {
    try {
        console.log('Scrape request body:', req.body);
        
        if (!req.body || !req.body.url) {
            return res.status(400).json({ 
                error: 'Missing URL',
                details: 'Please provide a URL in the request body'
            });
        }

        const { url } = req.body;

        // Validate URL format
        try {
            new URL(url);
        } catch (e) {
            return res.status(400).json({ 
                error: 'Invalid URL format',
                details: e.message
            });
        }

        // Simulated scraping result
        const scraped = {
            basics: {
                name: "Manas Kumar",
                email: "manas@example.com",
                location: "Pune, India",
                url: {
                    label: "LinkedIn",
                    href: url
                }
            },
            sections: {
                experience: {
                    items: [
                        {
                            id: "exp-1",
                            visible: true,
                            company: "StartupX",
                            position: "Backend Intern",
                            location: "Pune",
                            date: "2023 - 2024",
                            summary: "Worked on building scalable backend services"
                        }
                    ]
                },
                skills: {
                    items: [
                        {
                            id: "skill-1",
                            visible: true,
                            name: "Node.js",
                            level: 4,
                            keywords: ["Backend", "JavaScript"]
                        },
                        {
                            id: "skill-2",
                            visible: true,
                            name: "MongoDB",
                            level: 4,
                            keywords: ["Database", "NoSQL"]
                        },
                        {
                            id: "skill-3",
                            visible: true,
                            name: "Redis",
                            level: 3,
                            keywords: ["Caching", "In-Memory"]
                        }
                    ]
                }
            }
        };

        return res.json({ scraped });
    } catch (error) {
        console.error("Error scraping profile:", error);
        res.status(500).json({ 
            error: "Failed to scrape profile",
            details: error.message 
        });
    }
};

export const autoFill = async (req, res) => {
    try {
        const { incompleteResume } = req.body;

        if (!incompleteResume) {
            return res.status(400).json({ error: 'Missing incomplete resume' });
        }

        const filled = {
            ...incompleteResume,
            skills: ["Communication", "Leadership", "Python"],
        };

        return res.json({ filled });
    } catch (error) {
        console.error("Error auto-filling resume:", error);
        res.status(500).json({ error: "Failed to auto-fill resume" });
    }
}; 