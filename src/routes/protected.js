// important I didnt used this file in the main program
//important i used this and ths will serve as test file for clerkk backend auth

import express from "express";
import dotenv from "dotenv";
import { requireAuth } from "@clerk/express";
dotenv.config();

const protectedRoute = express.Router();

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

export default protectedRoute;
