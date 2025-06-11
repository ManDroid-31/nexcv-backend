import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const checkCredits = async (req, res, next) => {
    try {
        const userId = req.auth.userId;
        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        if (user.creditBalance <= 0) {
            return res.status(403).json({ error: "Insufficient credits" });
        }

        next();
    } catch (error) {
        console.error("Error checking credits:", error);
        return res.status(500).json({ error: "Failed to check credits" });
    }
};
