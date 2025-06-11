import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const createResume = async (req, res) => {
    try {
        const { title, data, template, visibility = "private" } = req.body;
        const userId = req.auth.userId;

        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");

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

        res.status(201).json(resume);
    } catch (error) {
        console.error("Error creating resume:", error);
        res.status(500).json({ error: "Failed to create resume" });
    }
};

export const getAllResumes = async (req, res) => {
    try {
        const userId = req.auth.userId;
        const resumes = await prisma.resume.findMany({
            where: { userId },
            orderBy: { updatedAt: "desc" },
        });
        res.json(resumes);
    } catch (error) {
        console.error("Error fetching resumes:", error);
        res.status(500).json({ error: "Failed to fetch resumes" });
    }
};

export const getResumeById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.auth.userId;

        const resume = await prisma.resume.findFirst({
            where: {
                id,
                userId,
            },
        });

        if (!resume) {
            return res.status(404).json({ error: "Resume not found" });
        }

        res.json(resume);
    } catch (error) {
        console.error("Error fetching resume:", error);
        res.status(500).json({ error: "Failed to fetch resume" });
    }
};

export const updateResume = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.auth.userId;
        const { title, data, template, visibility } = req.body;

        const existingResume = await prisma.resume.findFirst({
            where: {
                id,
                userId,
            },
        });

        if (!existingResume) {
            return res.status(404).json({ error: "Resume not found" });
        }

        const slug =
            title !== existingResume.title
                ? title.toLowerCase().replace(/[^a-z0-9]+/g, "-")
                : existingResume.slug;

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

        res.json(updatedResume);
    } catch (error) {
        console.error("Error updating resume:", error);
        res.status(500).json({ error: "Failed to update resume" });
    }
};

export const deleteResume = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.auth.userId;

        const existingResume = await prisma.resume.findFirst({
            where: {
                id,
                userId,
            },
        });

        if (!existingResume) {
            return res.status(404).json({ error: "Resume not found" });
        }

        await prisma.resume.delete({
            where: { id },
        });

        res.status(204).send();
    } catch (error) {
        console.error("Error deleting resume:", error);
        res.status(500).json({ error: "Failed to delete resume" });
    }
};
