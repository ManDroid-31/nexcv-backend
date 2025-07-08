//in use for middleware auth check

import { clerkMiddleware } from "@clerk/express";
import dotenv from "dotenv";

dotenv.config();

let authMiddleware;
authMiddleware = clerkMiddleware({
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
    secretKey: process.env.CLERK_SECRET_KEY,
});

export { authMiddleware };
