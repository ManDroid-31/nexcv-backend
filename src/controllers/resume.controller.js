// routes wokring fine

import { PrismaClient } from "@prisma/client";
import { validatePublicResume } from "../utils/validation.js";
import dotenv from "dotenv";
import cacheService from "../services/cacheService.js";
// import resumeViewMiddleware from "../middlewares/resumeView.middleware.js";
import { users } from "@clerk/clerk-sdk-node";
dotenv.config();

//the schema is validated using node_modules/.prisma/client which we used prisma generate for
const prisma = new PrismaClient();

// Helper function to get user ID (with fallback to default)
const getUserId = (req, allowUnauthenticated = false) => {
    // Use Clerk user ID from header-based auth
    if (req.headers["x-clerk-user-id"]) {
        return req.headers["x-clerk-user-id"];
    }
    if (req.auth && req.auth.userId) {
        return req.auth.userId;
    }
    if (allowUnauthenticated) return null;
    throw new Error("No authenticated user found");
};

// Ensure Redis connection
// cacheService.connect();

export const createResume = async (req, res) => {
    try {
        const clerkUserId = getUserId(req);

        // Find or create the user by Clerk user ID
        let user = await prisma.user.findUnique({
            where: { clerkUserId },
        });

        if (!user) {
            // Fetch from Clerk
            let email = "user@example.com";
            let name = "User";
            try {
                const clerkUser = await users.getUser(clerkUserId);
                email = clerkUser.emailAddresses?.[0]?.emailAddress || email;
                name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || name;
            } catch (err) {
                console.warn("Could not fetch Clerk user info, using defaults.", err.message);
            }
            user = await prisma.user.create({
                data: {
                    clerkUserId,
                    email,
                    name,
                    creditBalance: 10,
                },
            });
        }

        // Mock resume data
        const mockTitle = "Sample Resume";
        const mockSlug = mockTitle
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");
        const mockData = {
            personalInfo: {
                name: user.name,
                email: user.email,
                phone: "+1 (555) 123-4567",
                location: "San Francisco, CA",
                website: "https://example.com",
                linkedin: "https://linkedin.com/in/example",
                github: "https://github.com/example",
            },
            summary: "Motivated professional with a passion for technology and innovation.",
            experience: [
                {
                    id: "exp-1",
                    company: "Tech Corp",
                    position: "Software Engineer",
                    location: "San Francisco, CA",
                    startDate: "2022-01",
                    endDate: "2024-01",
                    current: false,
                    description:
                        "Developed scalable web applications and collaborated with cross-functional teams.",
                    achievements: [
                        "Improved application performance by 30%",
                        "Mentored junior developers",
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
            skills: ["JavaScript", "React", "Node.js", "MongoDB", "AWS", "Docker"],
            projects: [
                {
                    id: "proj-1",
                    name: "E-commerce Platform",
                    description: "Full-stack e-commerce application with payment integration",
                    url: "https://github.com/example/ecommerce",
                    technologies: ["React", "Node.js", "Stripe", "MongoDB"],
                    startDate: "2023-01",
                    endDate: "2023-06",
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
                "customSections",
            ],
            layout: {
                margins: { top: 20, bottom: 20, left: 20, right: 20 },
                spacing: 1.2,
                scale: 1,
            },
            tags: ["sample", "mock"],
        };
        const mockTemplate = "onyx";
        const mockVisibility = "private";

        // Ensure unique slug
        let slug = mockSlug;
        let slugSuffix = 1;
        while (await prisma.resume.findUnique({ where: { slug } })) {
            slug = `${mockSlug}-${slugSuffix++}`;
        }

        const resume = await prisma.resume.create({
            data: {
                title: mockTitle,
                slug,
                data: mockData,
                template: mockTemplate,
                visibility: mockVisibility,
                userId: user.id,
            },
        });

        if (cacheService.isConnected) {
            await cacheService.cacheAIResponse(`resume:${resume.id}`, resume, 600);
            await cacheService.clearCachePattern(`resumes:user:${clerkUserId}`);
            if (resume.visibility === "public") {
                await cacheService.cacheAIResponse(`resume:public:${resume.slug}`, resume, 600);
            }
        }

        console.log(
            `[RESUME] Mock resume saved successfully for user ${clerkUserId} (resumeId: ${resume.id})`
        );
        res.status(201).json(resume);
    } catch (error) {
        console.error("Error creating mock resume:", error);
        res.status(500).json({ error: "Failed to create mock resume" });
    }
};

export const getAllResumes = async (req, res) => {
    try {
        const clerkUserId = getUserId(req);
        let user = await prisma.user.findUnique({ where: { clerkUserId } });
        if (!user) {
            // Fetch from Clerk
            let email = "user@example.com";
            let name = "User";
            try {
                const clerkUser = await users.getUser(clerkUserId);
                email = clerkUser.emailAddresses?.[0]?.emailAddress || email;
                name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || name;
            } catch (err) {
                console.warn("Could not fetch Clerk user info, using defaults.", err.message);
            }
            user = await prisma.user.create({
                data: {
                    clerkUserId,
                    email,
                    name,
                    creditBalance: 10,
                },
            });
        }
        let resumes = null;
        if (cacheService.isConnected) {
            resumes = await cacheService.getCachedResponse(`resumes:user:${clerkUserId}`);
        }
        if (!resumes) {
            resumes = await prisma.resume.findMany({
                where: { userId: user.id },
                orderBy: { updatedAt: "desc" },
            });
            if (cacheService.isConnected) {
                await cacheService.cacheAIResponse(`resumes:user:${clerkUserId}`, resumes, 600);
            }
        }
        console.log(`[RESUME] Loaded ${resumes.length} resumes for user ${clerkUserId}`);
        res.json(resumes);
    } catch (error) {
        console.error("Error fetching resumes:", error);
        res.status(500).json({ error: "Failed to fetch resumes" });
    }
};

export const getResumeById = async (req, res) => {
    try {
        const { id } = req.params;
        // Accept view from header or query param
        const resumeView = req.headers["x-resume-view"] || req.query.view || null;
        let resume = null;
        if (cacheService.isConnected) {
            resume = await cacheService.getCachedResponse(`resume:${id}`);
        }
        if (!resume) {
            resume = await prisma.resume.findFirst({ where: { id } });
            if (resume && cacheService.isConnected) {
                await cacheService.cacheAIResponse(`resume:${id}`, resume, 600);
            }
        }
        if (!resume) {
            return res.status(404).json({ error: "Resume not found" });
        }

        console.log("resumeView:", resumeView, "resume.visibility:", resume?.visibility);

        if (resumeView === "publicview" || resumeView === "public" || resumeView === "guest") {
            console.log("Public view branch hit");
            if (resume.visibility !== "public") {
                console.log("Resume is not public");
                return res.status(403).json({ error: "Access denied: Not a public resume" });
            }
            console.log("Returning public resume");
            return res.json(resume);
        }
        console.log("Falling through to owner/auth branch");

        // Owner view (or default): require auth and ownership
        // Use robust getUserId helper (like getAllResumes)
        let clerkUserId;
        try {
            clerkUserId = getUserId(req);
        } catch {
            return res.status(401).json({ error: "Unauthorized: No Clerk user ID provided" });
        }
        // Find or create user by Clerk user ID (same as getAllResumes)
        let user = await prisma.user.findUnique({ where: { clerkUserId } });
        if (!user) {
            // Fetch from Clerk
            let email = "user@example.com";
            let name = "User";
            try {
                const clerkUser = await users.getUser(clerkUserId);
                email = clerkUser.emailAddresses?.[0]?.emailAddress || email;
                name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || name;
            } catch (err) {
                console.warn("Could not fetch Clerk user info, using defaults.", err.message);
            }
            user = await prisma.user.create({
                data: {
                    clerkUserId,
                    email,
                    name,
                    creditBalance: 10,
                },
            });
        }
        // Only allow if user is the owner
        if (resume.userId !== user.id) {
            return res.status(403).json({ error: "Access denied: Not your resume" });
        }
        return res.json(resume);
    } catch (error) {
        console.error("Error fetching resume:", error);
        res.status(500).json({ error: "Failed to fetch resume" });
    }
};

export const getPublicResume = async (req, res) => {
    try {
        const { slug } = req.params;
        const validation = validatePublicResume({ slug });
        if (!validation.success) {
            return res.status(400).json({
                error: "Invalid slug",
                details: validation.error.errors,
            });
        }
        let resume = null;
        if (cacheService.isConnected) {
            resume = await cacheService.getCachedResponse(`resume:public:${slug}`);
        }
        if (!resume) {
            resume = await prisma.resume.findFirst({
                where: {
                    slug: slug,
                    visibility: "public",
                },
            });
            if (resume && cacheService.isConnected) {
                await cacheService.cacheAIResponse(`resume:public:${slug}`, resume, 600);
            }
        }
        if (!resume) {
            return res.status(404).json({ error: "Public resume not found" });
        }
        res.json(resume);
    } catch (error) {
        console.error("Error fetching public resume:", error);
        res.status(500).json({ error: "Failed to fetch public resume" });
    }
};

export const updateResume = async (req, res) => {
    try {
        console.log("trying ti update the resume");
        const { id } = req.params;
        const clerkUserId = getUserId(req);
        let user = await prisma.user.findUnique({ where: { clerkUserId } });
        if (!user) {
            // Fetch from Clerk
            let email = "user@example.com";
            let name = "User";
            try {
                const clerkUser = await users.getUser(clerkUserId);
                email = clerkUser.emailAddresses?.[0]?.emailAddress || email;
                name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || name;
            } catch (err) {
                console.warn("Could not fetch Clerk user info, using defaults.", err.message);
            }
            user = await prisma.user.create({
                data: {
                    clerkUserId,
                    email,
                    name,
                    creditBalance: 10,
                },
            });
        }
        const { title, data, template, visibility } = req.body;
        const existingResume = await prisma.resume.findFirst({ where: { id } });
        if (!existingResume) {
            return res.status(404).json({ error: "Resume not found" });
        }
        if (existingResume.userId !== user.id) {
            return res.status(403).json({
                error: "Access denied",
                message: "You don't have permission to update this resume",
            });
        }
        let slug = existingResume.slug;
        if (title && title !== existingResume.title) {
            slug = title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)/g, "");
            const existingWithSlug = await prisma.resume.findFirst({
                where: {
                    slug,
                    id: { not: id },
                },
            });
            if (existingWithSlug) {
                return res.status(400).json({
                    error: "A resume with this title/slug already exists. Please use a different title.",
                });
            }
        }
        const updatedResume = await prisma.resume.update({
            where: { id },
            data: {
                title,
                slug,
                data,
                template,
                visibility,
            },
        });
        if (cacheService.isConnected) {
            await cacheService.cacheAIResponse(`resume:${id}`, updatedResume, 600);
            await cacheService.clearCachePattern(`resumes:user:${clerkUserId}`);
            if (updatedResume.visibility === "public") {
                await cacheService.cacheAIResponse(
                    `resume:public:${updatedResume.slug}`,
                    updatedResume,
                    600
                );
            } else {
                await cacheService.clearCachePattern(`resume:public:${updatedResume.slug}`);
            }
        }
        console.log(
            `[RESUME] Resume updated successfully for user ${clerkUserId} (resumeId: ${id})`
        );
        res.json(updatedResume);
    } catch (error) {
        if (error.code === "P2002" && error.meta?.target?.includes("slug")) {
            return res.status(400).json({
                error: "A resume with this title/slug already exists. Please use a different title.",
            });
        }
        console.error("Error updating resume:", error);
        res.status(500).json({ error: "Failed to update resume" });
    }
};

export const deleteResume = async (req, res) => {
    try {
        const { id } = req.params;
        const clerkUserId = getUserId(req);
        let user = await prisma.user.findUnique({ where: { clerkUserId } });
        if (!user) return res.status(401).json({ message: "user is  not authenticated" });
        const existingResume = await prisma.resume.findFirst({ where: { id } });
        if (!existingResume) {
            return res.status(404).json({ error: "Resume not found" });
        }
        if (existingResume.userId !== user.id) {
            return res.status(403).json({
                error: "Access denied",
                message: "You don't have permission to delete this resume",
            });
        }
        await prisma.resume.delete({ where: { id } });
        if (cacheService.isConnected) {
            await cacheService.clearCachePattern(`resume:${id}`);
            await cacheService.clearCachePattern(`resumes:user:${clerkUserId}`);
            if (existingResume.visibility === "public") {
                await cacheService.clearCachePattern(`resume:public:${existingResume.slug}`);
            }
        }
        console.log(
            `[RESUME] Resume deleted successfully for user ${clerkUserId} (resumeId: ${id})`
        );
        res.json({ success: true });
    } catch (error) {
        console.error("Error deleting resume:", error);
        res.status(500).json({ error: "Failed to delete resume" });
    }
};

// // Helper function to extract JSON data from AI responses
// shit function i dont use it now
// function extractResumeDataFromResponse(response) {
//     if (!response) return null;
//     try {
//         // Try direct parse
//         if (typeof response === 'object') return response;
//         if (typeof response === 'string') {
//             // Remove code block markers if present
//             let cleaned = response.replace(/```json|```/g, '').trim();

//             // Try direct JSON parse
//             try {
//                 return JSON.parse(cleaned);
//             } catch {}

//             // Try to extract the largest JSON object
//             const match = cleaned.match(/\{[\s\S]*\}/);
//             if (match) {
//                 let jsonStr = match[0];
//                 // Remove trailing commas before } or ]
//                 jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');
//                 try {
//                     return JSON.parse(jsonStr);
//                 } catch {}
//             }
//         }
//         return null;
//     } catch {
//         return null;
//     }
// }

// Robust Proxycurl to NexCV Resume Converter

function proxycurlToPlatformResume(data, userId, resumeId = "auto", title = "Imported Resume") {
    const formatDate = (d) =>
        d?.year
            ? `${d.year}-${(d.month ?? 1).toString().padStart(2, "0")}-${(d.day ?? 1).toString().padStart(2, "0")}`
            : "";
    const safe = (v) => v || "";
    const sections = [];

    const fixed = [
        {
            key: "certifications",
            title: "Certifications",
            items: data.certifications?.map((c) => ({
                name: c.name || c.authority || "",
                date: formatDate(c.starts_at),
            })),
        },
        {
            key: "accomplishment_honors_awards",
            title: "Honors & Awards",
            items: data.accomplishment_honors_awards?.map((a) => ({
                name: a.title || "",
                date: formatDate(a.issued_on),
                description: a.description || "",
            })),
        },
        {
            key: "accomplishment_courses",
            title: "Courses",
            items: data.accomplishment_courses?.map((c) => ({ name: c.name || "" })),
        },
    ];

    for (const s of fixed) {
        if (s.items?.length) {
            sections.push({ id: `custom-${s.key}`, title: s.title, content: { items: s.items } });
        }
    }

    const known = new Set([
        "full_name",
        "first_name",
        "last_name",
        "personal_emails",
        "personal_numbers",
        "city",
        "state",
        "country_full_name",
        "public_identifier",
        "extra",
        "summary",
        "headline",
        "experiences",
        "education",
        "skills",
        "accomplishment_projects",
        "certifications",
        "accomplishment_courses",
        "accomplishment_honors_awards",
        "languages",
        "inferred_salary",
        "gender",
        "birth_date",
        "industry",
        "profile_pic_url",
        "background_cover_image_url",
        "occupation",
        "follower_count",
        "interests",
        "connections",
        "articles",
        "groups",
        "activities",
        "recommendations",
        "similarly_named_profiles",
    ]);

    for (const [k, v] of Object.entries(data)) {
        if (!known.has(k) && Array.isArray(v) && v.length) {
            const title = k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
            const items = v.map((i) => (typeof i === "string" ? { name: i } : i));
            sections.push({ id: `custom-${k}`, title, content: { items } });
        }
    }

    return {
        id: resumeId,
        userId,
        title,
        slug: title.toLowerCase().replace(/\s+/g, "-") + resumeId,
        data: {
            personalInfo: {
                name: safe(data.full_name || `${data.first_name} ${data.last_name}`),
                email: safe(data.personal_emails?.[0]),
                phone: safe(data.personal_numbers?.[0]),
                location: [data.city, data.state, data.country_full_name]
                    .filter(Boolean)
                    .join(", "),
                website: "",
                linkedin: data.public_identifier
                    ? `https://www.linkedin.com/in/${data.public_identifier}`
                    : "",
                github: data.extra?.github_profile_id
                    ? `https://github.com/${data.extra.github_profile_id}`
                    : "",
            },
            summary: safe(data.summary || data.headline),
            experience:
                data.experiences?.map((e, i) => ({
                    id: `exp-${i + 1}`,
                    company: safe(e.company),
                    position: safe(e.title),
                    location: safe(e.location),
                    startDate: formatDate(e.starts_at),
                    endDate: formatDate(e.ends_at),
                    current: !e.ends_at,
                    description: safe(e.description),
                    achievements: [],
                })) || [],
            education:
                data.education?.map((e, i) => ({
                    id: `edu-${i + 1}`,
                    institution: safe(e.school),
                    degree: safe(e.degree_name),
                    field: safe(e.field_of_study),
                    startDate: formatDate(e.starts_at),
                    endDate: formatDate(e.ends_at),
                    current: !e.ends_at,
                    gpa: safe(e.grade),
                    description: [e.activities_and_societies, e.description]
                        .filter(Boolean)
                        .join("\n"),
                })) || [],
            skills: data.skills?.filter(Boolean) || [],
            projects:
                data.accomplishment_projects?.map((p, i) => ({
                    id: `proj-${i + 1}`,
                    name: safe(p.title),
                    description: safe(p.description),
                    url: safe(p.url),
                    technologies: [],
                    startDate: formatDate(p.starts_at),
                    endDate: formatDate(p.ends_at),
                })) || [],
            customSections: sections,
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
            tags: [],
        },
        template: "modern",
        visibility: "private",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
}

// In-memory index for Enrichlayer API key rotation
let enrichlayerKeyIndex = 1;

async function getWorkingEnrichlayerKey() {
    let attempts = 0;
    while (attempts < 7) {
        const apiKey = process.env[`PROXYCURL_API_KEY${enrichlayerKeyIndex}`];
        // Check credit balance
        const balanceRes = await fetch("https://enrichlayer.com/api/v2/credit-balance", {
            headers: { Authorization: `Bearer ${apiKey}` }
        });
        if (balanceRes.ok) {
            const data = await balanceRes.json();
            if (data.credit_balance && data.credit_balance >= 2) {
                return apiKey;
            }
        }
        // Move to next key
        enrichlayerKeyIndex = enrichlayerKeyIndex % 7 + 1;
        attempts++;
    }
    throw new Error("All Enrichlayer API keys are out of credits.");
}

export const fetchLinkedInResume = async (req, res) => {
    try {
        const { linkedinUrl } = req.body;
        if (!linkedinUrl) {
            return res.status(400).json({ error: "linkedinUrl is required" });
        }
        // Find a working Enrichlayer API key
        let apiKey;
        try {
            apiKey = await getWorkingEnrichlayerKey();
        } catch {
            return res.status(503).json({ error: "All Enrichlayer API keys are out of credits." });
        }
        // Use enrichlayer.com API for profile fetch
        const apiUrl = `https://enrichlayer.com/api/v2/profile?url=${encodeURIComponent(linkedinUrl)}`;
        const response = await fetch(apiUrl, {
            headers: { Authorization: `Bearer ${apiKey}` }
        });
        if (!response.ok) {
            const errText = await response.text();
            return res.status(502).json({ error: "Failed to fetch from Enrichlayer", details: errText });
        }
        const linkedInData = await response.json();
        if (!linkedInData || Object.keys(linkedInData).length === 0) {
            return res.status(204).json({ error: "Empty data from Enrichlayer" });
        }
        // Get userId from request (authenticated user)
        let clerkUserId;
        try {
            clerkUserId = getUserId(req);
        } catch {
            return res.status(401).json({ error: "Unauthorized: No Clerk user ID provided" });
        }
        // Find or create user by Clerk user ID
        let user = await prisma.user.findUnique({ where: { clerkUserId } });
        if (!user) {
            // Fetch from Clerk
            let email = "user@example.com";
            let name = "User";
            try {
                const clerkUser = await users.getUser(clerkUserId);
                email = clerkUser.emailAddresses?.[0]?.emailAddress || email;
                name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || name;
            } catch (err) {
                console.warn("Could not fetch Clerk user info, using defaults.", err.message);
            }
            user = await prisma.user.create({
                data: {
                    clerkUserId,
                    email,
                    name,
                    creditBalance: 10,
                },
            });
        }
        // Use robust converter
        const resumeObj = proxycurlToPlatformResume(linkedInData, user.id);
        // Save the resume to the database
        // Ensure unique slug
        let slug = resumeObj.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");
        let slugSuffix = 1;
        while (await prisma.resume.findUnique({ where: { slug } })) {
            slug = `${slug}-${slugSuffix++}`;
        }
        const savedResume = await prisma.resume.create({
            data: {
                title: resumeObj.title,
                slug,
                data: resumeObj.data,
                template: resumeObj.template || "modern",
                visibility: resumeObj.visibility || "private",
                userId: user.id,
            },
        });
        if (cacheService.isConnected) {
            await cacheService.cacheAIResponse(`resume:${savedResume.id}`, savedResume, 600);
            await cacheService.clearCachePattern(`resumes:user:${clerkUserId}`);
            if (savedResume.visibility === "public") {
                await cacheService.cacheAIResponse(
                    `resume:public:${savedResume.slug}`,
                    savedResume,
                    600
                );
            }
        }
        // Remove CI mock return. Always return the saved resume.
        return res.json({ resume: savedResume });
    } catch (error) {
        console.error("Error in fetchLinkedInResume:", error);
        return res
            .status(500)
            .json({ error: "Failed to fetch and format LinkedIn data", details: error.message });
    }
};
