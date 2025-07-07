// important I didnt used this file in the main program
//important i used this and ths will serve as test file for clerkk backend auth

import express from "express";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import clerkHeaderAuth from "../middlewares/clerkHeaderAuth.middleware.js";
import { authMiddleware } from "../middlewares/clerkAuth.middleware.js";
import { users } from "@clerk/clerk-sdk-node";
dotenv.config();

const protectedRoute = express.Router();
const prisma = new PrismaClient();

// Use clerkHeaderAuth middleware for all routes in this router
protectedRoute.use(authMiddleware);
protectedRoute.use(clerkHeaderAuth);

// Get current user info
protectedRoute.get("/me", (req, res) => {
    const userId = req.auth.userId;
    res.json({ message: `Hello 👋 Clerk user: ${userId}`, userInfo: req.auth });
});

// Return current user's credit balance
protectedRoute.get("/me/credits", async (req, res) => {
    try {
        const clerkUserId = req.auth.userId;
        if (!clerkUserId) {
            console.log("clerkUserId is null");
            return res.status(401).json({ error: "Unauthorized: No user ID" });
        }

        // Query by clerkUserId, create if not found
        let user = await prisma.user.findUnique({
            where: { clerkUserId: clerkUserId },
        });

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

        console.log("user-credits: ", user.creditBalance);
        res.json({ credits: user.creditBalance });
    } catch (error) {
        console.error("Error fetching credits:", error);
        res.status(500).json({ error: "Failed to fetch credits" });
    }
});

export default protectedRoute;
