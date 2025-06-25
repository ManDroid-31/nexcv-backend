import { z } from 'zod';

// Resume data structure validation
export const resumeDataSchema = z.object({
  personalInfo: z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email format"),
    phone: z.string().optional(),
    location: z.string().optional(),
    website: z.string().url().optional().or(z.literal("")),
    linkedin: z.string().url().optional().or(z.literal("")),
    github: z.string().url().optional().or(z.literal(""))
  }),
  summary: z.string().optional(),
  experience: z.array(z.object({
    id: z.string(),
    company: z.string(),
    position: z.string(),
    location: z.string().optional(),
    startDate: z.string(),
    endDate: z.string().optional(),
    current: z.boolean().default(false),
    description: z.string().optional(),
    achievements: z.array(z.string()).optional()
  })).optional(),
  education: z.array(z.object({
    id: z.string(),
    institution: z.string(),
    degree: z.string(),
    field: z.string().optional(),
    startDate: z.string(),
    endDate: z.string().optional(),
    current: z.boolean().default(false),
    gpa: z.string().optional(),
    description: z.string().optional()
  })).optional(),
  skills: z.array(z.string()).optional(),
  projects: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    url: z.string().url().optional().or(z.literal("")),
    technologies: z.array(z.string()).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional()
  })).optional(),
  customSections: z.array(z.object({
    id: z.string(),
    title: z.string(),
    content: z.any()
  })).optional(),
  sectionOrder: z.array(z.string()).optional(),
  layout: z.object({
    margins: z.object({
      top: z.number().default(20),
      bottom: z.number().default(20),
      left: z.number().default(20),
      right: z.number().default(20)
    }).optional(),
    spacing: z.number().default(1.2).optional(),
    scale: z.number().default(1).optional()
  }).optional(),
  tags: z.array(z.string()).optional()
});

// Resume creation/update validation
export const resumeSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title too long"),
  template: z.string().min(1, "Template is required"),
  visibility: z.enum(["public", "private"]).default("private"),
  data: resumeDataSchema
});

// AI generation request validation
export const aiGenerateSchema = z.object({
  // enum means to validate the section with predefined definations
  section: z.enum([
    "summary", 
    "experience", 
    "education", 
    "skills", 
    "projects",
    "personalInfo"
  ], {
    errorMap: () => ({ message: "Invalid section. Must be one of: summary, experience, education, skills, projects, personalInfo" })
  }),
  input: z.string().min(1, "Input text is required").max(2000, "Input too long"),
  resumeId: z.string().min(1, "Resume ID is required")
});

// Public resume slug validation
export const publicResumeSchema = z.object({
  slug: z.string().min(1, "Slug is required")
});

export const validateResumeData = (data) => {
  return resumeDataSchema.safeParse(data);
};

export const validateResume = (data) => {
  return resumeSchema.safeParse(data);
};

export const validateAIGenerate = (data) => {
  return aiGenerateSchema.safeParse(data);
};

export const validatePublicResume = (params) => {
  return publicResumeSchema.safeParse(params);
}; 