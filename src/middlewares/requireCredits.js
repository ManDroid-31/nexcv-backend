import { PrismaClient } from "@prisma/client";
import { users } from "@clerk/clerk-sdk-node";

const prisma = new PrismaClient();

/**
 * Middleware factory to require credits for an action.
 * Deducts credits and logs transaction if user has enough.
 * @param cost Number of credits required
 * @param type Type of credit usage
 */
const requireCredits = (cost, type) => {
    return async (req, res, next) => {
        try {
            const clerkUserId = req.body?.userId;

            if (!clerkUserId) {
                return res
                    .status(401)
                    .json({ error: "Unauthorized: No Clerk user ID lol from backend" });
            }

            // Find user by clerkUserId
            let user = await prisma.user.findUnique({ where: { clerkUserId } });

            if (!user) {
                // Fetch from Clerk
                let email = "user@example.com";
                let name = "User";
                try {
                    const clerkUser = await users.getUser(clerkUserId);
                    email = clerkUser.emailAddresses?.[0]?.emailAddress || email;
                    name =
                        [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || name;
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

            if (user.creditBalance < cost) {
                return res
                    .status(403)
                    .json({
                        error: "Not enough credits",
                        message:
                            "You do not have enough credits. Please purchase more to continue.",
                    });
            }

            await prisma.$transaction([
                prisma.user.update({
                    where: { clerkUserId },
                    data: {
                        creditBalance: {
                            decrement: cost,
                        },
                    },
                }),
                prisma.creditTransaction.create({
                    data: {
                        userId: user.id,
                        type,
                        amount: -cost,
                        reason: type,
                        createdAt: new Date(),
                    },
                }),
            ]);

            next();
        } catch (err) {
            console.error("Error in requireCredits middleware:", err);
            return res
                .status(500)
                .json({
                    error: "Failed to process credits. Stripe may be unavailable. Please try again later.",
                    message: "Stripe is currently unavailable. Please try again later.",
                });
        }
    };
};

export default requireCredits;
