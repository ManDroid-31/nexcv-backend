import Stripe from "stripe";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

dotenv.config();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const prisma = new PrismaClient();

// Configurable price per credit (in paise - 100 paise = 1 rupee)
const PRICE_PER_CREDIT = 500; // 1 rupee per credit (100 paise)
const CREDIT_PACKAGES = [10, 25, 50, 100]; // Example packages

export const getCreditBalance = async (req, res) => {
    const userId = req.auth.userId;
    console.log(`[CREDITS] [START] getCreditBalance | userId: ${userId}`);
    try {
        const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
        const response = { creditBalance: user?.creditBalance || 0 };
        console.log(`[CREDITS] [SUCCESS] getCreditBalance | userId: ${userId} | response:`, response);
        res.json(response);
    } catch (error) {
        console.error(`[CREDITS] [FAIL] getCreditBalance | userId: ${userId} | error:`, error);
        res.status(500).json({ error: "Failed to fetch credit balance" });
    }
};

export const getCreditHistory = async (req, res) => {
    const userId = req.auth.userId;
    console.log(`[CREDITS] [START] getCreditHistory | userId: ${userId}`);
    try {
        const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
        let response;
        if (!user) {
            response = { transactions: [] };
            console.log(`[CREDITS] [SUCCESS] getCreditHistory | userId: ${userId} | response:`, response);
            return res.json(response);
        }
        const transactions = await prisma.creditTransaction.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: "desc" },
            take: 50,
        });
        response = { transactions };
        console.log(`[CREDITS] [SUCCESS] getCreditHistory | userId: ${userId} | response:`, response);
        res.json(response);
    } catch (error) {
        console.error(`[CREDITS] [FAIL] getCreditHistory | userId: ${userId} | error:`, error);
        res.status(500).json({ error: "Failed to fetch credit history" });
    }
};

export const getCreditPricing = async (req, res) => {
    console.log(`[CREDITS] [START] getCreditPricing`);
    const response = {
        pricePerCredit: PRICE_PER_CREDIT,
        currency: "inr",
        packages: CREDIT_PACKAGES.map((qty) => ({
            credits: qty,
            price: qty * PRICE_PER_CREDIT,
        })),
    };
    console.log(`[CREDITS] [SUCCESS] getCreditPricing | response:`, response);
    res.json(response);
};

export const createStripeSession = async (req, res) => {
    const { credits = 10 } = req.body;
    const userId = req.auth.userId;
    console.log(`[CREDITS] [START] createStripeSession | userId: ${userId}, credits: ${credits}`);
    try {
        // Ensure FRONTEND_URL has proper protocol
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const successUrl = frontendUrl.startsWith('http') ? frontendUrl : `https://${frontendUrl}`;
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency: "inr",
                        product_data: {
                            name: `${credits} NexCV Credits`,
                        },
                        unit_amount: PRICE_PER_CREDIT,
                    },
                    quantity: credits,
                },
            ],
            mode: "payment",
            success_url: `${successUrl}/credits/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${successUrl}/credits/cancel`,
            metadata: {
                userId,
                credits,
            },
        });
        const response = { url: session.url };
        console.log(`[CREDITS] [SUCCESS] createStripeSession | userId: ${userId}, credits: ${credits} | response:`, response);
        res.json(response);
    } catch (error) {
        console.error(`[CREDITS] [FAIL] createStripeSession | userId: ${userId}, credits: ${credits} | error:`, error);
        res.status(500).json({ error: "Failed to create Stripe session" });
    }
};

export const stripeWebhook = async (req, res) => {
    const sig = req.headers["stripe-signature"];
    console.log(`[CREDITS] [START] stripeWebhook | headers:`, req.headers);
    let event;
    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error(`[CREDITS] [FAIL] stripeWebhook | error:`, err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log(`[CREDITS] [EVENT] stripeWebhook | event.type: ${event.type}`);
    if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const userId = session.metadata.userId;
        const credits = parseInt(session.metadata.credits, 10);
        console.log(`[CREDITS] [PROCESS] stripeWebhook | Stripe payment complete for user: ${userId}, credits: ${credits}`);
        if (userId && credits > 0) {
            let user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
            if (!user) {
                user = await prisma.user.create({
                    data: {
                        clerkUserId: userId,
                        email: "user@example.com",
                        name: "User",
                    },
                });
            }
            await prisma.$transaction([
                prisma.user.update({
                    where: { clerkUserId: userId },
                    data: { creditBalance: { increment: credits } },
                }),
                prisma.creditTransaction.create({
                    data: {
                        userId: user.id,
                        type: "purchase",
                        amount: credits,
                        reason: "Stripe purchase",
                        createdAt: new Date(),
                    },
                }),
            ]);
            console.log(`[CREDITS] [SUCCESS] stripeWebhook | Transaction successful: Credited ${credits} credits to user ${userId}`);
        }
    }
    const response = { received: true };
    console.log(`[CREDITS] [END] stripeWebhook | response:`, response);
    res.json(response);
};

// Admin: Add credits to a user
export const addCredits = async (req, res) => {
    const { clerkUserId, credits, reason = "admin_add" } = req.body;
    console.log(`[CREDITS] [START] addCredits | clerkUserId: ${clerkUserId}, credits: ${credits}, reason: ${reason}`);
    try {
        if (!clerkUserId || !credits) {
            console.error(`[CREDITS] [FAIL] addCredits | Missing params | clerkUserId: ${clerkUserId}, credits: ${credits}`);
            return res.status(400).json({ error: "Missing params" });
        }
        let user = await prisma.user.findUnique({ where: { clerkUserId } });
        if (!user) {
            user = await prisma.user.create({
                data: {
                    clerkUserId,
                    email: "user@example.com",
                    name: "User",
                },
            });
        }
        await prisma.$transaction([
            prisma.user.update({
                where: { clerkUserId },
                data: { creditBalance: { increment: credits } },
            }),
            prisma.creditTransaction.create({
                data: {
                    userId: user.id,
                    type: "admin_add",
                    amount: credits,
                    reason,
                    createdAt: new Date(),
                },
            }),
        ]);
        const response = { success: true, message: `Added ${credits} credits to user ${clerkUserId}` };
        console.log(`[CREDITS] [SUCCESS] addCredits | clerkUserId: ${clerkUserId}, credits: ${credits} | response:`, response);
        res.json(response);
    } catch (error) {
        console.error(`[CREDITS] [FAIL] addCredits | clerkUserId: ${clerkUserId}, credits: ${credits} | error:`, error);
        res.status(500).json({ error: "Failed to add credits", message: error });
    }
};

// Admin: Revoke credits from a user
export const revokeCredits = async (req, res) => {
    const { clerkUserId, credits, reason = "admin_revoke" } = req.body;
    console.log(`[CREDITS] [START] revokeCredits | clerkUserId: ${clerkUserId}, credits: ${credits}, reason: ${reason}`);
    try {
        if (!clerkUserId || !credits) {
            console.error(`[CREDITS] [FAIL] revokeCredits | Missing params | clerkUserId: ${clerkUserId}, credits: ${credits}`);
            return res.status(400).json({ error: "Missing params" });
        }
        let user = await prisma.user.findUnique({ where: { clerkUserId } });
        if (!user) {
            console.error(`[CREDITS] [FAIL] revokeCredits | User not found | clerkUserId: ${clerkUserId}`);
            return res.status(404).json({ error: "User not found" });
        }
        if (user.creditBalance < credits) {
            console.warn(`[CREDITS] [FAIL] revokeCredits | Not enough credits | user: ${clerkUserId}, requested: ${credits}, available: ${user.creditBalance}`);
            return res.status(400).json({ error: "Not enough credits to revoke", userCredits: user.creditBalance });
        }
        await prisma.$transaction([
            prisma.user.update({
                where: { clerkUserId },
                data: { creditBalance: { decrement: credits } },
            }),
            prisma.creditTransaction.create({
                data: {
                    userId: user.id,
                    type: "admin_revoke",
                    amount: -credits,
                    reason,
                    createdAt: new Date(),
                },
            }),
        ]);
        const response = { success: true, message: `Revoked ${credits} credits from user ${clerkUserId}` };
        console.log(`[CREDITS] [SUCCESS] revokeCredits | clerkUserId: ${clerkUserId}, credits: ${credits} | response:`, response);
        res.json(response);
    } catch (error) {
        console.error(`[CREDITS] [FAIL] revokeCredits | clerkUserId: ${clerkUserId}, credits: ${credits} | error:`, error);
        res.status(500).json({ error: "Failed to revoke credits", message: error });
    }
}; 