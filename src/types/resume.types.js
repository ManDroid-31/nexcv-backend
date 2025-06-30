/**
 * TypeScript-style type definitions for Resume data structure
 * These can be converted to actual TypeScript (.ts) files when needed
 */

/**
 * Personal Information Section
 */
export const PersonalInfoType = {
    name: "string", // Required
    email: "string", // Required, must be valid email
    phone: "string?", // Optional
    location: "string?", // Optional
    website: "string?", // Optional, must be valid URL if provided
    linkedin: "string?", // Optional, must be valid URL if provided
    github: "string?", // Optional, must be valid URL if provided
};

/**
 * Experience Item
 */
export const ExperienceType = {
    id: "string", // Required, unique identifier
    company: "string", // Required
    position: "string", // Required
    location: "string?", // Optional
    startDate: "string", // Required, format: "YYYY-MM" or "YYYY"
    endDate: "string?", // Optional, format: "YYYY-MM" or "YYYY"
    current: "boolean", // Default: false
    description: "string?", // Optional
    achievements: "string[]?", // Optional array of achievement bullet points
};

/**
 * Education Item
 */
export const EducationType = {
    id: "string", // Required, unique identifier
    institution: "string", // Required
    degree: "string", // Required
    field: "string?", // Optional
    startDate: "string", // Required, format: "YYYY-MM" or "YYYY"
    endDate: "string?", // Optional, format: "YYYY-MM" or "YYYY"
    current: "boolean", // Default: false
    gpa: "string?", // Optional
    description: "string?", // Optional
};

/**
 * Project Item
 */
export const ProjectType = {
    id: "string", // Required, unique identifier
    name: "string", // Required
    description: "string", // Required
    url: "string?", // Optional, must be valid URL if provided
    technologies: "string[]?", // Optional array of technologies used
    startDate: "string?", // Optional, format: "YYYY-MM" or "YYYY"
    endDate: "string?", // Optional, format: "YYYY-MM" or "YYYY"
};

/**
 * Custom Section
 */
export const CustomSectionType = {
    id: "string", // Required, unique identifier
    title: "string", // Required
    content: "any", // Flexible content structure
};

/**
 * Layout Configuration
 */
export const LayoutType = {
    margins: {
        top: "number", // Default: 20
        bottom: "number", // Default: 20
        left: "number", // Default: 20
        right: "number", // Default: 20
    },
    spacing: "number", // Default: 1.2
    scale: "number", // Default: 1
};

/**
 * Complete Resume Data Structure
 */
export const ResumeDataType = {
    personalInfo: PersonalInfoType,
    summary: "string?", // Optional professional summary
    experience: "ExperienceType[]?", // Optional array of work experiences
    education: "EducationType[]?", // Optional array of education items
    skills: "string[]?", // Optional array of skills
    projects: "ProjectType[]?", // Optional array of projects
    customSections: "CustomSectionType[]?", // Optional array of custom sections
    sectionOrder: "string[]?", // Optional array defining section display order
    layout: LayoutType,
    tags: "string[]?", // Optional array of tags
};

/**
 * Complete Resume Model (Database)
 */
export const ResumeModelType = {
    id: "string", // MongoDB ObjectId
    userId: "string", // MongoDB ObjectId, references User
    title: "string", // Required, max 100 characters
    slug: "string", // Required, unique URL slug
    data: ResumeDataType, // JSON object containing all resume data
    template: "string", // Required, template identifier
    visibility: "string", // "public" | "private", default: "private"
    createdAt: "Date", // Auto-generated timestamp
    updatedAt: "Date", // Auto-updated timestamp
};

/**
 * AI Generation Request
 */
export const AIGenerateRequestType = {
    section: "string", // "summary" | "experience" | "education" | "skills" | "projects" | "personalInfo"
    input: "string", // Required, max 2000 characters
    resumeId: "string", // Required, MongoDB ObjectId
};

/**
 * AI Generation Response
 */
export const AIGenerateResponseType = {
    result: "string", // Generated content
};

/**
 * API Response Wrapper
 */
export const APIResponseType = {
    success: "boolean",
    data: "any?", // Response data
    error: "string?", // Error message
    details: "any?", // Additional error details
};

/**
 * Example Resume Data Structure
 */
export const ExampleResumeData = {
    personalInfo: {
        name: "John Doe",
        email: "john.doe@example.com",
        phone: "+1 (555) 123-4567",
        location: "San Francisco, CA",
        website: "https://johndoe.dev",
        linkedin: "https://linkedin.com/in/johndoe",
        github: "https://github.com/johndoe",
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
            description: "Relevant coursework: Data Structures, Algorithms, Software Engineering",
        },
    ],
    skills: ["JavaScript", "React", "Node.js", "MongoDB", "AWS", "Docker"],
    projects: [
        {
            id: "proj-1",
            name: "E-commerce Platform",
            description: "Full-stack e-commerce application with payment integration",
            url: "https://github.com/johndoe/ecommerce",
            technologies: ["React", "Node.js", "Stripe", "MongoDB"],
            startDate: "2023-01",
            endDate: "2023-06",
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
};
