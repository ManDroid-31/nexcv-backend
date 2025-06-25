// routes wokring fine

import { PrismaClient } from "@prisma/client";
import { validatePublicResume } from "../utils/validation.js";
import dotenv from  "dotenv";
import cacheService from '../services/cacheService.js';
dotenv.config();

//the schema is validated using node_modules/.prisma/client which we used prisma generate for 
const prisma = new PrismaClient();

// Default user ID for development when Clerk is not set up
const DEFAULT_USER_ID = "507f1f77bcf86cd799439011";

// Helper function to get user ID (with fallback to default)
const getUserId = (req) => {
    // TODO: When integrating Clerk, remove fallback and always use req.auth.userId
    if (req.auth && req.auth.userId) {
        return req.auth.userId;
    }
    // TODO: Remove this fallback when Clerk is integrated
    console.log("⚠️  No Clerk auth found, using default user ID for development");
    return DEFAULT_USER_ID;
};

// Ensure Redis connection
cacheService.connect();

export const createResume = async (req, res) => {
    try {
        const { title, data, template, visibility = "private" } = req.body;
        const userId = getUserId(req);

        // Generate slug from title
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

        // Check if slug already exists
        const existing = await prisma.resume.findUnique({ where: { slug } });
        if (existing) {
            return res.status(400).json({ error: 'A resume with this title/slug already exists. Please use a different title.' });
        }

        const resume = await prisma.resume.create({
            data: {
                title,
                slug,
                data,
                template,
                visibility,
                userId,
            },
        });

        // Cache the new resume and invalidate user's resume list
        if (cacheService.isConnected) {
            await cacheService.cacheAIResponse(`resume:${resume.id}`, resume, 600);
            await cacheService.clearCachePattern(`resumes:user:${userId}`);
            if (resume.visibility === 'public') {
                await cacheService.cacheAIResponse(`resume:public:${resume.slug}`, resume, 600);
            }
        }

        res.status(201).json(resume);
    } catch (error) {
        if (error.code === 'P2002' && error.meta?.target?.includes('slug')) {
            return res.status(400).json({ error: 'A resume with this title/slug already exists. Please use a different title.' });
        }
        console.error("Error creating resume:", error);
        res.status(500).json({ error: "Failed to create resume" });
    }
};

export const getAllResumes = async (req, res) => {
    try {
        const userId = getUserId(req);
        let resumes = null;
        if (cacheService.isConnected) {
            resumes = await cacheService.getCachedResponse(`resumes:user:${userId}`);
        }
        if (!resumes) {
            resumes = await prisma.resume.findMany({
                where: { userId },
                orderBy: { updatedAt: "desc" },
            });
            if (cacheService.isConnected) {
                await cacheService.cacheAIResponse(`resumes:user:${userId}`, resumes, 600);
            }
        }
        res.json(resumes);
    } catch (error) {
        console.error("Error fetching resumes:", error);
        res.status(500).json({ error: "Failed to fetch resumes" });
    }
};

export const getResumeById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = getUserId(req);
        let resume = null;
        if (cacheService.isConnected) {
            resume = await cacheService.getCachedResponse(`resume:${id}`);
        }
        if (!resume) {
            // First, find the resume by ID (without user restriction)
            resume = await prisma.resume.findFirst({
                where: { id }
            });
            if (resume && cacheService.isConnected) {
                await cacheService.cacheAIResponse(`resume:${id}`, resume, 600);
            }
        }
        if (!resume) {
            return res.status(404).json({ error: "Resume not found" });
        }
        // Check access control
        if (resume.visibility === "private" && resume.userId !== userId) {
            return res.status(403).json({ 
                error: "Access denied", 
                message: "This resume is private and you don't have permission to view it" 
            });
        }
        res.json(resume);
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
                details: validation.error.errors 
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
                    visibility: "public"
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
        const { id } = req.params;
        const userId = getUserId(req);
        const { title, data, template, visibility } = req.body;
        // First, find the resume by ID (without user restriction)
        const existingResume = await prisma.resume.findFirst({
            where: { id }
        });
        if (!existingResume) {
            return res.status(404).json({ error: "Resume not found" });
        }
        // Check if user owns this resume
        if (existingResume.userId !== userId) {
            return res.status(403).json({ 
                error: "Access denied", 
                message: "You don't have permission to update this resume" 
            });
        }
        // Generate new slug only if title changed
        let slug = existingResume.slug;
        if (title && title !== existingResume.title) {
            slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
            // Check if new slug already exists (excluding current resume)
            const existingWithSlug = await prisma.resume.findFirst({
                where: {
                    slug,
                    id: { not: id } // Exclude current resume
                }
            });
            if (existingWithSlug) {
                return res.status(400).json({ 
                    error: 'A resume with this title/slug already exists. Please use a different title.' 
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
        // Update cache for this resume, user's resume list, and public slug if needed
        if (cacheService.isConnected) {
            await cacheService.cacheAIResponse(`resume:${id}`, updatedResume, 600);
            await cacheService.clearCachePattern(`resumes:user:${userId}`);
            if (updatedResume.visibility === 'public') {
                await cacheService.cacheAIResponse(`resume:public:${updatedResume.slug}`, updatedResume, 600);
            } else {
                await cacheService.clearCachePattern(`resume:public:${updatedResume.slug}`);
            }
        }
        res.json(updatedResume);
    } catch (error) {
        if (error.code === 'P2002' && error.meta?.target?.includes('slug')) {
            return res.status(400).json({ 
                error: 'A resume with this title/slug already exists. Please use a different title.' 
            });
        }
        console.error("Error updating resume:", error);
        res.status(500).json({ error: "Failed to update resume" });
    }
};

export const deleteResume = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = getUserId(req);
        // First, find the resume by ID (without user restriction)
        const existingResume = await prisma.resume.findFirst({
            where: { id }
        });
        if (!existingResume) {
            return res.status(404).json({ error: "Resume not found" });
        }
        // Check if user owns this resume
        if (existingResume.userId !== userId) {
            return res.status(403).json({ 
                error: "Access denied", 
                message: "You don't have permission to delete this resume" 
            });
        }
        await prisma.resume.delete({
            where: { id }
        });
        // Invalidate cache for this resume, user's resume list, and public slug if needed
        if (cacheService.isConnected) {
            await cacheService.clearCachePattern(`resume:${id}`);
            await cacheService.clearCachePattern(`resumes:user:${userId}`);
            if (existingResume.visibility === 'public') {
                await cacheService.clearCachePattern(`resume:public:${existingResume.slug}`);
            }
        }
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
  const formatDate = (d) => d?.year ? `${d.year}-${(d.month ?? 1).toString().padStart(2, "0")}-${(d.day ?? 1).toString().padStart(2, "0")}` : "";
  const safe = v => v || "";
  const sections = [];

  const fixed = [
    {
      key: "certifications",
      title: "Certifications",
      items: data.certifications?.map(c => ({ name: c.name || c.authority || "", date: formatDate(c.starts_at) }))
    },
    {
      key: "accomplishment_honors_awards",
      title: "Honors & Awards",
      items: data.accomplishment_honors_awards?.map(a => ({ name: a.title || "", date: formatDate(a.issued_on), description: a.description || "" }))
    },
    {
      key: "accomplishment_courses",
      title: "Courses",
      items: data.accomplishment_courses?.map(c => ({ name: c.name || "" }))
    }
  ];

  for (const s of fixed) {
    if (s.items?.length) {
      sections.push({ id: `custom-${s.key}`, title: s.title, content: { items: s.items } });
    }
  }

  const known = new Set([
    "full_name", "first_name", "last_name", "personal_emails", "personal_numbers", "city", "state",
    "country_full_name", "public_identifier", "extra", "summary", "headline", "experiences",
    "education", "skills", "accomplishment_projects", "certifications", "accomplishment_courses",
    "accomplishment_honors_awards", "languages", "inferred_salary", "gender", "birth_date",
    "industry", "profile_pic_url", "background_cover_image_url", "occupation", "follower_count",
    "interests", "connections", "articles", "groups", "activities", "recommendations", "similarly_named_profiles"
  ]);

  for (const [k, v] of Object.entries(data)) {
    if (!known.has(k) && Array.isArray(v) && v.length) {
      const title = k.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      const items = v.map(i => typeof i === "string" ? { name: i } : i);
      sections.push({ id: `custom-${k}`, title, content: { items } });
    }
  }

  return {
    id: resumeId,
    userId,
    title,
    slug: title.toLowerCase().replace(/\s+/g, "-")+resumeId,
    data: {
      personalInfo: {
        name: safe(data.full_name || `${data.first_name} ${data.last_name}`),
        email: safe(data.personal_emails?.[0]),
        phone: safe(data.personal_numbers?.[0]),
        location: [data.city, data.state, data.country_full_name].filter(Boolean).join(", "),
        website: "",
        linkedin: data.public_identifier ? `https://www.linkedin.com/in/${data.public_identifier}` : "",
        github: data.extra?.github_profile_id ? `https://github.com/${data.extra.github_profile_id}` : ""
      },
      summary: safe(data.summary || data.headline),
      experience: data.experiences?.map((e, i) => ({
        id: `exp-${i + 1}`,
        company: safe(e.company),
        position: safe(e.title),
        location: safe(e.location),
        startDate: formatDate(e.starts_at),
        endDate: formatDate(e.ends_at),
        current: !e.ends_at,
        description: safe(e.description),
        achievements: []
      })) || [],
      education: data.education?.map((e, i) => ({
        id: `edu-${i + 1}`,
        institution: safe(e.school),
        degree: safe(e.degree_name),
        field: safe(e.field_of_study),
        startDate: formatDate(e.starts_at),
        endDate: formatDate(e.ends_at),
        current: !e.ends_at,
        gpa: safe(e.grade),
        description: [e.activities_and_societies, e.description].filter(Boolean).join("\n")
      })) || [],
      skills: data.skills?.filter(Boolean) || [],
      projects: data.accomplishment_projects?.map((p, i) => ({
        id: `proj-${i + 1}`,
        name: safe(p.title),
        description: safe(p.description),
        url: safe(p.url),
        technologies: [],
        startDate: formatDate(p.starts_at),
        endDate: formatDate(p.ends_at)
      })) || [],
      customSections: sections,
      sectionOrder: ["personalInfo", "summary", "experience", "education", "skills", "projects", "customSections"],
      layout: { margins: { top: 20, bottom: 20, left: 20, right: 20 }, spacing: 1.2, scale: 1 },
      tags: []
    },
    template: "modern",
    visibility: "private",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}


// Controller to fetch LinkedIn data and format as resume (no AI, robust mapping)
export const fetchLinkedInResume = async (req, res) => {
  try {
    const { linkedinUrl, userId } = req.body;
    if (!linkedinUrl) {
      return res.status(400).json({ error: "linkedinUrl is required" });
    }
    const proxycurlApiKey = process.env.PROXYCURL_API_KEY;
    if (!proxycurlApiKey) {
      return res.status(500).json({ error: "Missing Proxycurl API key" });
    }
    // Production: fetch real LinkedIn data from Proxycurl
    const apiUrl = `https://nubela.co/proxycurl/api/v2/linkedin?url=${encodeURIComponent(linkedinUrl)}&fallback_to_cache=on-error&use_cache=if-present&skills=include&inferred_salary=include&personal_email=include&personal_contact_number=include&twitter_profile_id=include&facebook_profile_id=include&github_profile_id=include&extra=include`;
    const response = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${proxycurlApiKey}` }
    });
    if (!response.ok) {
      const errText = await response.text();
      return res.status(502).json({ error: "Failed to fetch from Proxycurl", details: errText });
    }
    const linkedInData = await response.json();
    //
    // For local testing, you can uncomment the below block and comment out the above fetch logic:
    /*
    const linkedInData = {
        // ...mock data here...
    }
    */
    if (!linkedInData || Object.keys(linkedInData).length === 0) {
      return res.status(204).json({ error: "Empty data from Proxycurl" });
    }
    // Use robust converter
    const resume = proxycurlToPlatformResume(linkedInData, userId || "imported-user");
    return res.json({ resume });
  } catch (error) {
    console.error("Error in fetchLinkedInResume:", error);
    return res.status(500).json({ error: "Failed to fetch and format LinkedIn data", details: error.message });
  }
};
