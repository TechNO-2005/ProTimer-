# ProTimer Web Application Build & Deployment Guide

This comprehensive guide provides step-by-step instructions for building and deploying the ProTimer productivity application.

## Prerequisites

- Node.js 18.x or later
- npm 8.x or later
- PostgreSQL database (for production deployments)

## Project Structure

```
protimer/
├── client/         # Frontend React application
├── server/         # Express.js backend
├── shared/         # Shared types and schemas
├── package.json    # Project dependencies and scripts
└── vite.config.ts  # Vite configuration
```

## Environment Setup

Before building, ensure these environment variables are set:

```
# Required Database Variables
DATABASE_URL=postgresql://username:password@host:port/database
PGUSER=username
PGPASSWORD=password
PGDATABASE=database
PGHOST=host
PGPORT=port

# Required Firebase Variables
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_APP_ID=your_app_id
```

## Building the Application

### Option 1: Complete Production Build

For a full production-ready build of both frontend and backend:

```bash
# Install dependencies first
npm install

# Build both frontend and backend
npm run build
```

This creates a `dist/` directory containing:
- Optimized frontend assets (HTML, CSS, JS bundles)
- Compiled backend server
- All static assets with proper hashing

### Option 2: Development Build

For testing with source maps and faster rebuilds:

```bash
# Development mode
NODE_ENV=development npm run build
```

### Option 3: Frontend-Only Build

If you only need to build the frontend (for static hosting):

```bash
npx vite build --outDir=dist-frontend
```

## Running the Production Build

To run the application in production mode:

```bash
NODE_ENV=production npm run start
```

The server will start on port 5000 by default (configurable via PORT environment variable).

## Deployment Options

### 1. Deploying to Replit

The easiest deployment option:

1. In the Replit interface, click the "Deploy" button
2. Replit will automatically build and deploy your application
3. After deployment, your app will be available at `https://your-repl-name.your-username.repl.co`

### 2. Deploying to a VPS/Cloud Provider

For dedicated hosting:

1. Copy the entire `dist/` directory to your server
2. Install production dependencies: `npm install --production`
3. Set up environment variables (database credentials, etc.)
4. Start the server: `node dist/index.js`
5. Configure a reverse proxy (Nginx/Apache) if needed

### 3. Deploying to a Platform-as-a-Service (PaaS)

For platforms like Heroku, Render, or Railway:

1. Connect your repository to the platform
2. Configure build command: `npm run build`
3. Configure start command: `npm run start`
4. Set environment variables in the platform's dashboard
5. Deploy using the platform's deployment flow

## Database Configuration

The application requires PostgreSQL. Options for database setup:

1. **Local PostgreSQL**: Install PostgreSQL locally and create a database
2. **Cloud PostgreSQL**: Use a managed service like Neon, Supabase, or Amazon RDS
3. **Replit Database**: Use the built-in Replit Database feature

After setting up your database, update the `DATABASE_URL` environment variable.

## Common Issues and Solutions

### Port Conflicts

If you see `Port XXX is in use`:
```bash
# Set a different port
PORT=5001 npm run start
```

### Database Connection Issues

If you encounter database connection problems:
```bash
# Test database connection
node -e "const { Pool } = require('pg'); const pool = new Pool(); pool.query('SELECT NOW()', (err, res) => { console.log(err, res); pool.end(); });"
```

### Build Performance

For large builds that time out:
```bash
# Increase Node memory limit
NODE_OPTIONS=--max_old_space_size=4096 npm run build
```

## Monitoring and Logs

In production, you can monitor the application using:

```bash
# View logs
tail -f logs/app.log

# Monitor CPU/memory
top -p $(pgrep -f "node dist/index.js")
```

For any additional assistance, refer to the project documentation or contact support.