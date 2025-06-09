// important I didnt used this file in the main program

import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

// Middleware to populate req.auth is not needed as requireAuth handles it

// ✅ Protect route using requireAuth
router.get('/me', (req, res) => {
    console.log(req.auth);
    console.log("inside get /me");
    const userId = req.auth?.userId;
    res.json({ message: `Hello 👋 Clerk user: ${userId}` });
});

export default router; 