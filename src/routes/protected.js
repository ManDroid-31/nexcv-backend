// important I didnt used this file in the main program
//important i used this and ths will serve as test file for clerkk backend auth

import express from "express";
import dotenv from "dotenv";
import { PrismaClient } from '@prisma/client';
import clerkHeaderAuth from "../middlewares/clerkHeaderAuth.middleware.js";
import { authMiddleware } from "../middlewares/clerkAuth.middleware.js";
dotenv.config();

const protectedRoute = express.Router();
const prisma = new PrismaClient();

// Use clerkHeaderAuth middleware for all routes in this router
protectedRoute.use(authMiddleware)
protectedRoute.use(clerkHeaderAuth);

// Get current user info
protectedRoute.get(
    "/me",
    (req, res) => {
        const userId = req.auth.userId;
        res.json({ message: `Hello 👋 Clerk user: ${userId}`, userInfo: req.auth });
    }
);

// Return current user's credit balance
protectedRoute.get(
    "/me/credits",
    async (req, res) => {
        try {
            const clerkUserId = req.auth.userId;
            if (!clerkUserId) {
                console.log("clerkUserId is null")
                return res.status(401).json({ error: "Unauthorized: No user ID" });
            }
            
            // Query by clerkUserId, create if not found
            let user = await prisma.user.findUnique({ 
                where: { clerkUserId: clerkUserId } 
            });
            
            if (!user) {
                // Create a new user record for this Clerk user
                user = await prisma.user.create({
                    data: {
                        clerkUserId,
                        email: "user@example.com", // You might want to get this from Clerk
                        name: "User" // You might want to get this from Clerk
                    }
                });
            }
            
            console.log("user-credits: " ,user.creditBalance)
            res.json({ credits: user.creditBalance });
        } catch (error) {
            console.error("Error fetching credits:", error);
            res.status(500).json({ error: "Failed to fetch credits" });
        }
    }
);

export default protectedRoute;
