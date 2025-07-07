import express from "express";
import clerkHeaderAuth from "../middlewares/clerkHeaderAuth.middleware.js";
import * as creditsController from "../controllers/credits.controller.js";

const router = express.Router();

// User credit endpoints
router.get("/balance", clerkHeaderAuth, creditsController.getCreditBalance);
router.get("/history", clerkHeaderAuth, creditsController.getCreditHistory);
router.get("/pricing", creditsController.getCreditPricing);
router.post("/purchase", clerkHeaderAuth, creditsController.createStripeSession);

// Stripe webhook (no auth)
router.post("/webhook", creditsController.stripeWebhook);

// Admin endpoints (add admin middleware as needed)
router.post("/add", creditsController.addCredits);
router.post("/revoke", creditsController.revokeCredits);

export default router;
