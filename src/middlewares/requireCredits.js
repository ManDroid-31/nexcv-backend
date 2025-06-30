import { PrismaClient } from '@prisma/client';

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
        return res.status(401).json({ error: 'Unauthorized: No Clerk user ID lol from backend' });
      }

      // Find user by clerkUserId
      let user = await prisma.user.findUnique({ where: { clerkUserId } });

      if (!user) {
        // Auto-create user if not found
        user = await prisma.user.create({
          data: {
            clerkUserId,
            email: "user@example.com", // Optionally get from Clerk
            name: "User"
          }
        });
      }

      if (user.creditBalance < cost) {
        return res.status(403).json({ error: 'Not enough credits' });
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
      console.error('Error in requireCredits middleware:', err);
      return res.status(500).json({ error: 'Failed to process credits' });
    }
  };
};

export default requireCredits;
