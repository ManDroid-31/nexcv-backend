import { requireAuth } from '@clerk/express';

export const clerkMiddleware = requireAuth({
  jwtKey: process.env.CLERK_JWT_PUBLIC_KEY || 'dvb_2yAreFOft1XfjMeclqLYdMi3FyH', // Optional if using API keys
  authorizedParties: ['http://localhost:3000'],   // Optional
}); 