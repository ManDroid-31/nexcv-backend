//in use for middleware auth check

import { clerkMiddleware } from "@clerk/express";
import dotenv from "dotenv";

dotenv.config();

export const authMiddleware = clerkMiddleware({
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  secretKey: process.env.CLERK_SECRET_KEY,
});
