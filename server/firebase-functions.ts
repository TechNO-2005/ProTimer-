import * as functions from 'firebase-functions';
import express from 'express';
import { setupVite, serveStatic, log } from './vite';
import { registerRoutes } from './routes';
import { setupAuth } from './auth';

// Create Express app
const app = express();

// Set up session management and authentication
setupAuth(app);

// Register API routes
registerRoutes(app);

// Set up static file serving for production builds
if (process.env.NODE_ENV === 'production') {
  serveStatic(app);
}

// Export the Express app as a Firebase Function
export const api = functions.https.onRequest(app);