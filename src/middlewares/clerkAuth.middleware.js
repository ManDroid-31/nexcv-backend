//in use for middleware auth check

import { clerkMiddleware } from "@clerk/express";
import dotenv from "dotenv";

dotenv.config();

let authMiddleware;
if (process.env.CI === "true") {
    // Bypass Clerk in CI
    authMiddleware = (req, res, next) => next();
} else {
    authMiddleware = clerkMiddleware({
        publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
        secretKey: process.env.CLERK_SECRET_KEY,
    });
}

export { authMiddleware };
