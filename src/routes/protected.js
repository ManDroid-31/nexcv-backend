// important I didnt used this file in the main program
//important i used this and ths will serve as test file for clerkk backend auth

import express from "express";
import dotenv from "dotenv";
import { requireAuth } from "@clerk/express";
import { PrismaClient } from '@prisma/client';
dotenv.config();

const protectedRoute = express.Router();
const prisma = new PrismaClient();

// Middleware to populate req.auth is not needed as requireAuth handles it

// ✅ Protect route using requireAuth
protectedRoute.get(
    "/me",
    (req, res, next) => {
        requireAuth();
        next();
    },
    (req, res) => {
        // console.log(req.auth);
        // console.log("inside get /me");
        const userId = req.auth?.userId;
        res.json({ message: `Hello 👋 Clerk user: ${userId}`, userInfo: req.auth() });
    }
);

// Return current user's credit balance
protectedRoute.get(
    "/me/credits",
    async (req, res) => {
        try {
            const userId = req.auth?.userId;
            if (!userId) {
                return res.status(401).json({ error: "Unauthorized: No user ID" });
            }
            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (!user) {
                return res.status(404).json({ error: "User not found" });
            }
            res.json({ credits: user.creditBalance });
        } catch (error) {
            console.error("Error fetching credits:", error);
            res.status(500).json({ error: "Failed to fetch credits" });
        }
    }
);

export default protectedRoute;
