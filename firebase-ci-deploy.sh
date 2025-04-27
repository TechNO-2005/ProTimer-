#!/bin/bash

# Check if FIREBASE_TOKEN is provided
if [ -z "$FIREBASE_TOKEN" ]; then
  echo "Error: FIREBASE_TOKEN is not set. Please run the following on your local machine:"
  echo "firebase login:ci"
  echo "Then set the token as a secret in Replit."
  exit 1
fi

# Build the application for both client and server
echo "Building the application..."
npm run build

# Make sure firebase-functions.ts gets included in the build
echo "Copying Firebase Functions wrapper..."
npx esbuild server/firebase-functions.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/firebase-functions.js

# Deploy to Firebase
echo "Deploying to Firebase hosting and functions..."
npx firebase deploy --token "$FIREBASE_TOKEN" --project protimer-aceed

echo "Deployment completed!"