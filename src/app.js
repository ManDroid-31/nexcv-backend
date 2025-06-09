import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";
import { Clerk } from "@clerk/clerk-sdk-node";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Clerk
const clerk = Clerk({ secretKey: process.env.CLERK_SECRET_KEY });

app.use(cors());
app.use(express.json());

app.get(
  "/api/protected/me",
  ClerkExpressRequireAuth(),
  async (req, res) => {
    try {
      // Get the user ID from the authenticated request
      const userId = req.auth.userId;
      
      // Fetch the user details from Clerk
      const user = await clerk.users.getUser(userId);
      
      console.log('User details:', user);
      
      // Send the user data back
      res.json({
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          emailAddresses: user.emailAddresses,
          imageUrl: user.imageUrl,
          // Add any other user properties you need
        }
      });
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ error: 'Failed to fetch user details' });
    }
  }
);

// Root route to confirm the backend server is running and accessible
app.get("/", (req, res) => {
  console.log("inside get /");
  res.send("NexCV Backend is live!");
});

app.get("/health", (req, res) => {
  res.send("NexCV Backend is healthy!");
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
