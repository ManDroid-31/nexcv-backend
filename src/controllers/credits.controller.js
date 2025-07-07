import Stripe from "stripe";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { users } from "@clerk/clerk-sdk-node";

dotenv.config();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "no api keys 🥺");
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
        console.log(
            `[CREDITS] [SUCCESS] getCreditBalance | userId: ${userId} | response:`,
            response
        );
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
            console.log(
                `[CREDITS] [SUCCESS] getCreditHistory | userId: ${userId} | response:`,
                response
            );
            return res.json(response);
        }
        const transactions = await prisma.creditTransaction.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: "desc" },
            take: 50,
        });
        response = { transactions };
        console.log(
            `[CREDITS] [SUCCESS] getCreditHistory | userId: ${userId} | response:`,
            response
        );
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
        if (process.env.CI === "true") {
            res.setHeader("x-ci-mock", "true");
            return res.json({
                url: "https://example.com/stripe-mock",
                id: "ci-session-id",
                sessionId: "ci-session-id",
                message: "CI mode: Stripe not called"
            });
        }
        const frontendUrl = "https://nexcv.vercel.app";
        const successUrl = frontendUrl.startsWith("http") ? frontendUrl : `https://${frontendUrl}`;
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
        const response = {
            url: session.url,
            message:
                "Thank you for your payment! This is a test account, so no credits will be added.",
        };
        console.log(
            `[CREDITS] [SUCCESS] createStripeSession | userId: ${userId}, credits: ${credits} | response:`,
            response
        );
        res.json(response);
    } catch (error) {
        console.error(
            `[CREDITS] [FAIL] createStripeSession | userId: ${userId}, credits: ${credits} | error:`,
            error
        );
        res.status(500).json({
            error: "Failed to create Stripe session. Stripe is currently unavailable. Please try again later.",
            message: "Stripe is currently unavailable. Please try again later.",
        });
    }
};

export const stripeWebhook = async (req, res) => {
    const sig = req.headers["stripe-signature"];
    console.log(`[CREDITS] [START] stripeWebhook | headers:`, req.headers);
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error(`[CREDITS] [FAIL] stripeWebhook | error:`, err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log(`[CREDITS] [EVENT] stripeWebhook | event.type: ${event.type}`);
    let message = "";
    if (event.type === "checkout.session.completed") {
        message =
            "Stripe payment successful, but this is a test account. No credits have been added.";
        console.log(
            "[CREDITS] [TEST MODE] stripeWebhook | Payment received, but no credits added."
        );
    }
    const response = { received: true, message };
    console.log(`[CREDITS] [END] stripeWebhook | response:`, response);
    res.json(response);
};

// Admin: Add credits to a user
export const addCredits = async (req, res) => {
    const { clerkUserId, credits, reason = "admin_add" } = req.body;
    console.log(
        `[CREDITS] [START] addCredits | clerkUserId: ${clerkUserId}, credits: ${credits}, reason: ${reason}`
    );
    try {
        if (!clerkUserId || !credits) {
            console.error(
                `[CREDITS] [FAIL] addCredits | Missing params | clerkUserId: ${clerkUserId}, credits: ${credits}`
            );
            return res.status(400).json({ error: "Missing params" });
        }
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
        const response = {
            success: true,
            message: `Added ${credits} credits to user ${clerkUserId}`,
        };
        console.log(
            `[CREDITS] [SUCCESS] addCredits | clerkUserId: ${clerkUserId}, credits: ${credits} | response:`,
            response
        );
        res.json(response);
    } catch (error) {
        console.error(
            `[CREDITS] [FAIL] addCredits | clerkUserId: ${clerkUserId}, credits: ${credits} | error:`,
            error
        );
        res.status(500).json({ error: "Failed to add credits", message: error });
    }
};

// Admin: Revoke credits from a user
export const revokeCredits = async (req, res) => {
    const { clerkUserId, credits, reason = "admin_revoke" } = req.body;
    console.log(
        `[CREDITS] [START] revokeCredits | clerkUserId: ${clerkUserId}, credits: ${credits}, reason: ${reason}`
    );
    try {
        if (!clerkUserId || !credits) {
            console.error(
                `[CREDITS] [FAIL] revokeCredits | Missing params | clerkUserId: ${clerkUserId}, credits: ${credits}`
            );
            return res.status(400).json({ error: "Missing params" });
        }
        let user = await prisma.user.findUnique({ where: { clerkUserId } });
        if (!user) {
            console.error(
                `[CREDITS] [FAIL] revokeCredits | User not found | clerkUserId: ${clerkUserId}`
            );
            return res.status(404).json({ error: "User not found" });
        }
        if (user.creditBalance < credits) {
            console.warn(
                `[CREDITS] [FAIL] revokeCredits | Not enough credits | user: ${clerkUserId}, requested: ${credits}, available: ${user.creditBalance}`
            );
            return res
                .status(400)
                .json({ error: "Not enough credits to revoke", userCredits: user.creditBalance });
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
        const response = {
            success: true,
            message: `Revoked ${credits} credits from user ${clerkUserId}`,
        };
        console.log(
            `[CREDITS] [SUCCESS] revokeCredits | clerkUserId: ${clerkUserId}, credits: ${credits} | response:`,
            response
        );
        res.json(response);
    } catch (error) {
        console.error(
            `[CREDITS] [FAIL] revokeCredits | clerkUserId: ${clerkUserId}, credits: ${credits} | error:`,
            error
        );
        res.status(500).json({ error: "Failed to revoke credits", message: error });
    }
};
