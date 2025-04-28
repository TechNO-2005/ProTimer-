# Building ProTimer Web Application

This document provides instructions on how to build a production version of the ProTimer application.

## Prerequisites

Make sure you have Node.js and npm installed on your system.

## Building the Application

### Option 1: Full Build (Frontend and Backend)

To build both the frontend and backend for production:

```bash
npm run build
```

This command will:
1. Build the frontend using Vite
2. Build the backend using esbuild
3. Output the production files to the `dist` directory

### Option 2: Frontend Only Build

If you only need the frontend assets:

```bash
npx vite build
```

This will create a `dist` directory with the compiled frontend assets.

### Option 3: Build with Environment Variables

To build with specific environment variables:

```bash
# For development
NODE_ENV=development npm run build

# For production
NODE_ENV=production npm run build
```

## Production Output

After a successful build, the following files and directories will be created:

- `dist/` (or the specified output directory)
  - Frontend assets (HTML, CSS, JavaScript)
  - Backend server code (if using the full build)

## Running the Production Build

To run the production build:

```bash
npm run start
```

This will start the Node.js server using the compiled files from the `dist` directory.

## Deployment Options

1. **Deploy on Replit**
   - Click the "Deploy" button in the Replit UI
   - Replit will handle the build and deployment process

2. **Manual Deployment**
   - Copy the `dist` directory to your hosting provider
   - Set up the necessary environment variables
   - Start the server using `node dist/index.js`

## Build Configuration

The build configuration is defined in:
- `vite.config.ts` for frontend build settings
- `package.json` for build scripts and dependencies

## Troubleshooting Build Issues

If you encounter build issues:

1. Make sure all dependencies are installed: `npm install`
2. Clear the cache: `npx vite clear-cache`
3. Remove existing build files: `rm -rf dist`
4. Try building again with verbose logging: `npx vite build --debug`