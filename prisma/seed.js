import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Default user ID that matches the one used in controllers
// Using a proper 12-byte hex string for MongoDB ObjectId
const DEFAULT_USER_ID = "507f1f77bcf86cd799439011";

async function main() {
    console.log("🌱 Starting database seed...");

    // Create default user (if not exists)
    try {
        const defaultUser = await prisma.user.upsert({
            where: { clerkUserId: DEFAULT_USER_ID },
            update: {},
            create: {
                clerkUserId: DEFAULT_USER_ID,
                email: "default@nexcv.com",
                name: "Default User",
            },
        });
        console.log("✅ Default user created/updated:", defaultUser.email);
    } catch (error) {
        console.log("⚠️  User creation error (might already exist):", error.message);
    }

    // Sample resume data
    const sampleResumes = [
        {
            title: "Senior Software Engineer Resume",
            template: "modern",
            visibility: "public",
            data: {
                personalInfo: {
                    name: "Jane Doe",
                    email: "jane.doe@example.com",
                    phone: "+1 (555) 123-4567",
                    location: "San Francisco, CA",
                    website: "https://janedoe.dev",
                    linkedin: "https://linkedin.com/in/janedoe",
                    github: "https://github.com/janedoe",
                },
                summary:
                    "Results-driven Full-Stack Developer with 5+ years of experience building scalable web applications. Expertise in React, Node.js, and cloud technologies. Passionate about clean code and user experience.",
                experience: [
                    {
                        id: "exp-1",
                        company: "Tech Corp",
                        position: "Senior Software Engineer",
                        location: "San Francisco, CA",
                        startDate: "2022-01",
                        endDate: "2024-01",
                        current: false,
                        description: "Led development of key features for the main product",
                        achievements: [
                            "Improved application performance by 40%",
                            "Mentored 3 junior developers",
                            "Implemented CI/CD pipeline",
                        ],
                    },
                    {
                        id: "exp-2",
                        company: "StartupX",
                        position: "Full Stack Developer",
                        location: "Remote",
                        startDate: "2020-06",
                        endDate: "2022-01",
                        current: false,
                        description: "Built and maintained web applications",
                        achievements: [
                            "Developed 5+ new features",
                            "Reduced bug reports by 60%",
                            "Optimized database queries",
                        ],
                    },
                ],
                education: [
                    {
                        id: "edu-1",
                        institution: "University of Technology",
                        degree: "Bachelor of Science",
                        field: "Computer Science",
                        startDate: "2018-09",
                        endDate: "2022-05",
                        current: false,
                        gpa: "3.8",
                        description:
                            "Relevant coursework: Data Structures, Algorithms, Software Engineering",
                    },
                ],
                skills: [
                    "JavaScript",
                    "React",
                    "Node.js",
                    "MongoDB",
                    "AWS",
                    "Docker",
                    "Git",
                    "TypeScript",
                ],
                projects: [
                    {
                        id: "proj-1",
                        name: "E-commerce Platform",
                        description: "Full-stack e-commerce application with payment integration",
                        url: "https://github.com/janedoe/ecommerce",
                        technologies: ["React", "Node.js", "Stripe", "MongoDB"],
                        startDate: "2023-01",
                        endDate: "2023-06",
                    },
                    {
                        id: "proj-2",
                        name: "Task Management App",
                        description: "Real-time collaborative task management application",
                        url: "https://github.com/janedoe/taskapp",
                        technologies: ["React", "Socket.io", "Express", "PostgreSQL"],
                        startDate: "2022-08",
                        endDate: "2022-12",
                    },
                ],
                customSections: [
                    {
                        id: "custom-1",
                        title: "Certifications",
                        content: {
                            items: [
                                { name: "AWS Certified Developer", date: "2023" },
                                { name: "Google Cloud Professional", date: "2022" },
                            ],
                        },
                    },
                ],
                sectionOrder: [
                    "personalInfo",
                    "summary",
                    "experience",
                    "education",
                    "skills",
                    "projects",
                    "customSections",
                ],
                layout: {
                    margins: { top: 20, bottom: 20, left: 20, right: 20 },
                    spacing: 1.2,
                    scale: 1,
                },
                tags: ["full-stack", "react", "node.js", "aws"],
            },
        },
        {
            title: "Frontend Developer Portfolio",
            template: "minimal",
            visibility: "private",
            data: {
                personalInfo: {
                    name: "John Smith",
                    email: "john.smith@example.com",
                    phone: "+1 (555) 987-6543",
                    location: "New York, NY",
                    website: "https://johnsmith.dev",
                    linkedin: "https://linkedin.com/in/johnsmith",
                    github: "https://github.com/johnsmith",
                },
                summary:
                    "Creative Frontend Developer with 3+ years of experience crafting beautiful and responsive user interfaces. Specialized in React, Vue.js, and modern CSS frameworks.",
                experience: [
                    {
                        id: "exp-1",
                        company: "Design Studio",
                        position: "Frontend Developer",
                        location: "New York, NY",
                        startDate: "2021-03",
                        endDate: "2024-01",
                        current: true,
                        description:
                            "Create responsive web applications and maintain design systems",
                        achievements: [
                            "Built 10+ client websites",
                            "Improved page load speed by 50%",
                            "Implemented design system",
                        ],
                    },
                ],
                education: [
                    {
                        id: "edu-1",
                        institution: "Design Institute",
                        degree: "Bachelor of Arts",
                        field: "Web Design",
                        startDate: "2017-09",
                        endDate: "2021-05",
                        current: false,
                        gpa: "3.9",
                        description: "Focused on UI/UX design and frontend development",
                    },
                ],
                skills: [
                    "HTML",
                    "CSS",
                    "JavaScript",
                    "React",
                    "Vue.js",
                    "Sass",
                    "Figma",
                    "Adobe Creative Suite",
                ],
                projects: [
                    {
                        id: "proj-1",
                        name: "Portfolio Website",
                        description:
                            "Personal portfolio website with animations and responsive design",
                        url: "https://github.com/johnsmith/portfolio",
                        technologies: ["React", "Framer Motion", "Styled Components"],
                        startDate: "2023-03",
                        endDate: "2023-05",
                    },
                ],
                customSections: [],
                sectionOrder: [
                    "personalInfo",
                    "summary",
                    "experience",
                    "education",
                    "skills",
                    "projects",
                ],
                layout: {
                    margins: { top: 15, bottom: 15, left: 15, right: 15 },
                    spacing: 1.1,
                    scale: 1,
                },
                tags: ["frontend", "react", "design", "ui-ux"],
            },
        },
    ];

    // Create sample resumes
    for (const resumeData of sampleResumes) {
        try {
            const slug = resumeData.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");

            const resume = await prisma.resume.upsert({
                where: { slug: slug },
                update: {
                    data: resumeData.data,
                    template: resumeData.template,
                    visibility: resumeData.visibility,
                    updatedAt: new Date(),
                },
                create: {
                    title: resumeData.title,
                    slug: slug,
                    data: resumeData.data,
                    template: resumeData.template,
                    visibility: resumeData.visibility,
                    userId: DEFAULT_USER_ID,
                },
            });
            console.log(`✅ Resume created/updated: ${resume.title}`);
        } catch (error) {
            console.log(`⚠️  Resume creation error: ${error.message}`);
        }
    }

    // Create some credit transactions for the default user
    try {
        // Create transactions one by one to avoid skipDuplicates issue
        await prisma.creditTransaction.create({
            data: {
                userId: DEFAULT_USER_ID,
                type: "earn",
                amount: 100,
                reason: "welcome_bonus",
            },
        });

        await prisma.creditTransaction.create({
            data: {
                userId: DEFAULT_USER_ID,
                type: "earn",
                amount: 50,
                reason: "daily_bonus",
            },
        });

        console.log("✅ Credit transactions created");
    } catch (error) {
        console.log("⚠️  Credit transaction creation error:", error.message);
    }

    console.log("🎉 Database seeding completed!");
    console.log("\n📋 Sample data created:");
    console.log("- Default user: default@nexcv.com");
    console.log("- 2 sample resumes (1 public, 1 private)");
    console.log("- Credit balance: 150 credits");
    console.log("\n🔗 Test endpoints:");
    console.log("- GET /api/resumes (list all resumes)");
    console.log("- GET /api/public/senior-software-engineer-resume (public resume)");
    console.log("- POST /api/ai/generate (AI generation)");
}

main()
    .catch((e) => {
        console.error("❌ Seeding error:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
