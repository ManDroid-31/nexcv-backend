const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Middleware factory to require credits for an action.
 * Deducts credits and logs transaction if user has enough.
 * @param {number} cost - Number of credits required
 * @param {'linkedin-fetch'|'ai-enhance'} type - Type of credit usage
 */
function requireCredits(cost, type) {
  return async (req, res, next) => {
    try {
      const userId = req.auth && req.auth.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized: No user ID' });
      }
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      if (user.creditBalance < cost) {
        return res.status(403).json({ error: 'Not enough credits' });
      }
      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: { creditBalance: { decrement: cost } },
        }),
        prisma.creditTransaction.create({
          data: {
            userId,
            type,
            amount: -cost,
            reason: type,
            createdAt: new Date(),
          },
        }),
      ]);
      next();
    } catch (error) {
      console.error('Error in requireCredits middleware:', error);
      res.status(500).json({ error: 'Failed to process credits' });
    }
  };
}

module.exports = requireCredits;
module.exports.requireCredits = requireCredits; 